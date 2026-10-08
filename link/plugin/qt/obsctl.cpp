// Pilotage d'OBS DANS le plugin : plus d'obs-websocket, rien à activer ni à configurer dans OBS.
//
// Le plugin répond directement aux demandes de l'agent (processus enfant) avec l'API d'OBS (libobs + obs-frontend-api), sur un socket
// local réservé à l'utilisateur (lignes JSON). Les demandes portent les noms et les formes de réponse d'obs-websocket v5 : l'agent,
// le Core et le site n'ont pas à changer. Tout s'exécute sur le fil principal d'OBS (celui du socket), où l'API frontend est sûre.
//
//   agent  --{"id":1,"type":"GetSceneList","data":{}}-->  plugin
//   agent  <--{"id":1,"ok":true,"data":{...}}----------   plugin
//   agent  <--{"event":"CurrentProgramSceneChanged","data":{...}}   (spontané)
#include <obs-frontend-api.h>
#include <obs-module.h>
#include <obs-audio-controls.h>
#include <util/platform.h>

#include <QBuffer>
#include <QByteArray>
#include <QCoreApplication>
#include <QDesktopServices>
#include <QUrl>
#include <QDateTime>
#include <QElapsedTimer>
#include <QFile>
#include <QImage>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QLocalServer>
#include <QLocalSocket>
#include <QMutex>
#include <QPointer>
#include <QSet>
#include <QTimer>
#include <cmath>
#include <functional>
#include <map>
#include <memory>
#include <string>
#include <vector>

#include "obsctl.h"

namespace {

using Json = QJsonObject;

struct Fail {
	QString message;
};

QPointer<QLocalServer> server;
std::vector<QLocalSocket *> clients;
bool ready = false;      // l'interface d'OBS est chargée (FINISHED_LOADING)
bool collectionBusy = false;
uint64_t streamStartNs = 0, recordStartNs = 0;
uint64_t lastStreamBytes = 0, lastStatsNs = 0;
os_cpu_usage_info_t *cpuInfo = nullptr;
QTimer *statsTimer = nullptr, *meterTimer = nullptr;

// ───── Utilitaires ─────
QString q(const char *s) { return s ? QString::fromUtf8(s) : QString(); }
const char *u(const QString &s) { static thread_local QByteArray b; b = s.toUtf8(); return b.constData(); }

/** Source du nom donné (référence prise : à relâcher), ou échec. */
struct Src {
	obs_source_t *s = nullptr;
	explicit Src(const QString &name) : s(obs_get_source_by_name(name.toUtf8().constData())) {}
	Src(const Src &) = delete;
	~Src() { if (s) obs_source_release(s); }
	obs_source_t *need(const char *what = "Source") const
	{
		if (!s) throw Fail{QString("%1 introuvable.").arg(what)};
		return s;
	}
};

/** Données OBS (obs_data) depuis / vers du JSON. */
obs_data_t *dataFrom(const Json &j)
{
	const QByteArray b = QJsonDocument(j).toJson(QJsonDocument::Compact);
	return obs_data_create_from_json(b.constData());
}
Json jsonFrom(obs_data_t *d)
{
	const char *j = obs_data_get_json(d);
	return QJsonDocument::fromJson(QByteArray(j ? j : "{}")).object();
}

QString timecode(uint64_t ms)
{
	const uint64_t s = ms / 1000;
	return QString("%1:%2:%3.%4").arg(s / 3600, 2, 10, QChar('0')).arg((s / 60) % 60, 2, 10, QChar('0')).arg(s % 60, 2, 10, QChar('0')).arg(ms % 1000, 3, 10, QChar('0'));
}

QStringList freeList(char **list)
{
	QStringList out;
	if (!list) return out;
	for (char **p = list; *p; p++) out << q(*p);
	// OBS renvoie UN seul bloc (le tableau et les chaînes à la suite) : un seul bfree. Libérer chaque chaîne fait planter OBS.
	bfree(list);
	return out;
}

double toDb(double mul) { return mul <= 0 ? -100.0 : 20.0 * std::log10(mul); }

// ───── Envoi ─────
void sendLine(QLocalSocket *c, const Json &j)
{
	QByteArray b = QJsonDocument(j).toJson(QJsonDocument::Compact);
	b.append('\n');
	c->write(b);
}
void emitEvent(const QString &name, const Json &data = {})
{
	Json j;
	j["event"] = name;
	j["data"] = data;
	for (auto *c : clients) sendLine(c, j);
}

// ───── Scènes, sources ─────
QString relayIdOf(obs_source_t *s);

struct SceneList {
	obs_frontend_source_list l{};
	SceneList() { obs_frontend_get_scenes(&l); }
	~SceneList() { obs_frontend_source_list_free(&l); }
};

QString currentSceneName(obs_source_t *(*get)(void))
{
	obs_source_t *s = get();
	const QString n = s ? q(obs_source_get_name(s)) : QString();
	if (s) obs_source_release(s);
	return n;
}

Json sceneListJson()
{
	SceneList sl;
	QJsonArray arr;
	// Comme obs-websocket : la liste est renvoyée dans l'ordre inverse de l'interface d'OBS.
	for (int i = int(sl.l.sources.num) - 1; i >= 0; i--) {
		Json s;
		s["sceneName"] = q(obs_source_get_name(sl.l.sources.array[i]));
		s["sceneIndex"] = i;
		arr.append(s);
	}
	Json r;
	r["scenes"] = arr;
	r["currentProgramSceneName"] = currentSceneName(obs_frontend_get_current_scene);
	r["currentPreviewSceneName"] = obs_frontend_preview_program_mode_active() ? currentSceneName(obs_frontend_get_current_preview_scene) : QString();
	return r;
}

struct ItemCtx {
	QJsonArray arr;
	int index = 0;
};
bool enumItem(obs_scene_t *, obs_sceneitem_t *item, void *param)
{
	auto *c = static_cast<ItemCtx *>(param);
	obs_source_t *src = obs_sceneitem_get_source(item);
	Json it;
	it["sceneItemId"] = double(obs_sceneitem_get_id(item));
	it["sceneItemIndex"] = c->index++;
	it["sourceName"] = q(obs_source_get_name(src));
	it["sceneItemEnabled"] = obs_sceneitem_visible(item);
	const bool scene = obs_source_get_type(src) == OBS_SOURCE_TYPE_SCENE;
	it["sourceType"] = scene ? "OBS_SOURCE_TYPE_SCENE" : "OBS_SOURCE_TYPE_INPUT";
	it["inputKind"] = scene ? QString() : q(obs_source_get_id(src));
	it["isGroup"] = obs_sceneitem_is_group(item);
	if (!scene) it["syxteeRelayId"] = relayIdOf(src); // source liée à un flux du compte
	c->arr.append(it);
	return true;
}

obs_scene_t *sceneNamed(const Src &s)
{
	obs_scene_t *sc = obs_scene_from_source(s.need("Scène"));
	if (!sc) throw Fail{"Ce n'est pas une scène."};
	return sc;
}

bool hasAudio(obs_source_t *s) { return (obs_source_get_output_flags(s) & OBS_SOURCE_AUDIO) != 0; }

const char *monitorName(obs_monitoring_type t)
{
	return t == OBS_MONITORING_TYPE_MONITOR_ONLY ? "OBS_MONITORING_TYPE_MONITOR_ONLY"
	       : t == OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT ? "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT"
							       : "OBS_MONITORING_TYPE_NONE";
}

/** Noms des sources audio globales d'OBS (périphériques « Audio du bureau » / « Micro » : canaux de sortie 1 à 6). */
QSet<QString> globalAudio;

bool enumInput(void *param, obs_source_t *s)
{
	auto *arr = static_cast<QJsonArray *>(param);
	if (obs_source_get_type(s) != OBS_SOURCE_TYPE_INPUT) return true;
	Json i;
	i["inputName"] = q(obs_source_get_name(s));
	i["inputKind"] = q(obs_source_get_id(s));
	const bool audio = hasAudio(s);
	i["hasAudio"] = audio;
	if (audio) {
		i["inputMuted"] = obs_source_muted(s);
		i["inputVolumeMul"] = double(obs_source_get_volume(s));
		i["monitorType"] = monitorName(obs_source_get_monitoring_type(s));
		i["global"] = globalAudio.contains(q(obs_source_get_name(s)));
	}
	arr->append(i);
	return true;
}

// ───── Capture du programme (aperçu de secours en JPEG) ─────
struct Shot {
	gs_texrender_t *tr = nullptr;
	gs_stagesurf_t *ss = nullptr;
	int w = 0, h = 0;
} shot;

QByteArray renderJpeg(obs_source_t *src, int w, int quality)
{
	uint32_t sw = obs_source_get_base_width(src), sh = obs_source_get_base_height(src);
	if (!sw || !sh) {
		obs_video_info ovi;
		if (!obs_get_video_info(&ovi)) throw Fail{"Pas de vidéo."};
		sw = ovi.base_width;
		sh = ovi.base_height;
	}
	const int h = std::max(2, int(double(w) * sh / sw));
	QImage img;
	obs_enter_graphics();
	if (shot.w != w || shot.h != h) {
		if (shot.tr) gs_texrender_destroy(shot.tr);
		if (shot.ss) gs_stagesurface_destroy(shot.ss);
		shot.tr = gs_texrender_create(GS_RGBA, GS_ZS_NONE);
		shot.ss = gs_stagesurface_create(uint32_t(w), uint32_t(h), GS_RGBA);
		shot.w = w;
		shot.h = h;
	}
	gs_texrender_reset(shot.tr);
	if (gs_texrender_begin(shot.tr, uint32_t(w), uint32_t(h))) {
		vec4 clear;
		vec4_zero(&clear);
		gs_clear(GS_CLEAR_COLOR, &clear, 0.0f, 0);
		gs_ortho(0.0f, float(sw), 0.0f, float(sh), -100.0f, 100.0f);
		gs_blend_state_push();
		gs_blend_function(GS_BLEND_ONE, GS_BLEND_ZERO);
		obs_source_inc_showing(src);
		obs_source_video_render(src);
		obs_source_dec_showing(src);
		gs_blend_state_pop();
		gs_texrender_end(shot.tr);
		gs_stage_texture(shot.ss, gs_texrender_get_texture(shot.tr));
		uint8_t *data = nullptr;
		uint32_t linesize = 0;
		if (gs_stagesurface_map(shot.ss, &data, &linesize)) {
			img = QImage(w, h, QImage::Format_RGBA8888);
			for (int y = 0; y < h; y++) memcpy(img.scanLine(y), data + size_t(y) * linesize, size_t(w) * 4);
			gs_stagesurface_unmap(shot.ss);
		}
	}
	obs_leave_graphics();
	if (img.isNull()) throw Fail{"Capture impossible."};
	QByteArray out;
	QBuffer buf(&out);
	buf.open(QIODevice::WriteOnly);
	img.save(&buf, "JPEG", quality);
	return out;
}

// ───── Sorties (stream / enregistrement) : états et mesures ─────
Json streamJson()
{
	Json r;
	obs_output_t *o = obs_frontend_get_streaming_output();
	const bool active = obs_frontend_streaming_active();
	const uint64_t ms = active && streamStartNs ? (os_gettime_ns() - streamStartNs) / 1000000 : 0;
	r["outputActive"] = active;
	r["outputReconnecting"] = o ? obs_output_reconnecting(o) : false;
	r["outputTimecode"] = timecode(ms);
	r["outputDuration"] = double(ms);
	r["outputCongestion"] = o ? double(obs_output_get_congestion(o)) : 0.0;
	r["outputBytes"] = o ? double(obs_output_get_total_bytes(o)) : 0.0;
	r["outputSkippedFrames"] = o ? obs_output_get_frames_dropped(o) : 0;
	r["outputTotalFrames"] = o ? obs_output_get_total_frames(o) : 0;
	if (o) obs_output_release(o);
	return r;
}

Json recordJson()
{
	Json r;
	obs_output_t *o = obs_frontend_get_recording_output();
	const bool active = obs_frontend_recording_active();
	const uint64_t ms = active && recordStartNs ? (os_gettime_ns() - recordStartNs) / 1000000 : 0;
	r["outputActive"] = active;
	r["outputPaused"] = obs_frontend_recording_paused();
	r["outputTimecode"] = timecode(ms);
	r["outputDuration"] = double(ms);
	r["outputBytes"] = o ? double(obs_output_get_total_bytes(o)) : 0.0;
	if (o) obs_output_release(o);
	return r;
}

/** Mesures du poste et des sorties, une fois par seconde (panneau « Flux » du site). */
Json statsJson(bool withRates)
{
	Json r;
	r["cpuUsage"] = cpuInfo ? double(os_cpu_usage_info_query(cpuInfo)) : 0.0;
	r["memoryUsage"] = double(os_get_proc_resident_size()) / (1024.0 * 1024.0);
	r["activeFps"] = double(obs_get_active_fps());
	r["averageFrameRenderTime"] = double(obs_get_average_frame_time_ns()) / 1000000.0;
	r["renderSkippedFrames"] = double(obs_get_lagged_frames());
	r["renderTotalFrames"] = double(obs_get_total_frames());
	Json st = streamJson();
	obs_output_t *o = obs_frontend_get_streaming_output();
	if (o) {
		const uint64_t now = os_gettime_ns();
		const uint64_t bytes = obs_output_get_total_bytes(o);
		if (withRates && lastStatsNs && now > lastStatsNs && bytes >= lastStreamBytes)
			st["kbps"] = double(bytes - lastStreamBytes) * 8.0 / 1000.0 / (double(now - lastStatsNs) / 1e9);
		lastStreamBytes = bytes;
		lastStatsNs = now;
		obs_encoder_t *enc = obs_output_get_video_encoder(o);
		if (enc) {
			st["encoder"] = q(obs_encoder_get_display_name(obs_encoder_get_id(enc)));
			obs_data_t *es = obs_encoder_get_settings(enc);
			if (es) {
				st["encoderBitrate"] = double(obs_data_get_int(es, "bitrate"));
				obs_data_release(es);
			}
		}
		obs_output_release(o);
	} else {
		lastStatsNs = 0;
	}
	r["stream"] = st;
	r["record"] = recordJson();
	return r;
}

void onMain(std::function<void()> fn);

// ───── Aperçu vidéo du programme : sortie WHIP native d'OBS (obs-webrtc), vidéo réduite + audio Opus ─────
// Une sortie secondaire, avec ses propres encodeurs (matériel de préférence), vers le MediaMTX du serveur qui ne fait que retransmettre.
// Elle ne tourne que lorsque l'agent la demande (quelqu'un regarde la page) ; rien ne part sinon.
struct Whip {
	obs_output_t *out = nullptr;
	obs_encoder_t *video = nullptr, *audio = nullptr;
	obs_service_t *service = nullptr;
	QString encoder;
} whip;

/** Meilleur encodeur H.264 disponible : matériel d'abord (VideoToolbox, NVENC, AMF, Quick Sync), logiciel en dernier recours. */
QString pickVideoEncoder()
{
	const char *id = nullptr;
	int best = -1;
	QString bestId;
	for (size_t i = 0; obs_enum_encoder_types(i, &id); i++) {
		if (obs_get_encoder_type(id) != OBS_ENCODER_VIDEO) continue;
		if (obs_get_encoder_caps(id) & OBS_ENCODER_CAP_DEPRECATED) continue;
		const char *codec = obs_get_encoder_codec(id);
		if (!codec || strcmp(codec, "h264") != 0) continue;
		const QString n = q(id).toLower();
		if (n.contains("hevc") || n.contains("av1")) continue;
		int score = 5;
		if (n.contains("videotoolbox") || n.contains(".ave.")) score = 100;
		else if (n.contains("nvenc")) score = 90;
		else if (n.contains("amf")) score = 80;
		else if (n.contains("qsv")) score = 70;
		else if (n == "obs_x264") score = 10;
		else if (n.contains("fallback")) score = 1;
		if (score > best) {
			best = score;
			bestId = q(id);
		}
	}
	return bestId;
}

void stopWhip()
{
	if (whip.out) {
		obs_output_stop(whip.out);
		obs_output_release(whip.out);
	}
	if (whip.video) obs_encoder_release(whip.video);
	if (whip.audio) obs_encoder_release(whip.audio);
	if (whip.service) obs_service_release(whip.service);
	whip = Whip();
}

void whipSignalCb(void *param, calldata_t *cd)
{
	const bool started = param != nullptr;
	obs_output_t *o = static_cast<obs_output_t *>(calldata_ptr(cd, "output"));
	long long code = 0;
	calldata_get_int(cd, "code", &code);
	const QString err = (!started && code != 0 && o) ? q(obs_output_get_last_error(o)) : QString();
	onMain([=] {
		Json d;
		d["active"] = started;
		d["error"] = err;
		emitEvent("link.whip", d);
	});
}

Json startWhip(const Json &d)
{
	const QString server = d.value("server").toString();
	if (!server.startsWith("https://") || server.size() > 400) throw Fail{"Adresse WHIP invalide."};
	stopWhip();
	const int kbps = std::min(3000, std::max(300, d.value("kbps").toInt(1200)));
	const int height = std::min(720, std::max(270, d.value("height").toInt(540)));
	obs_video_info ovi;
	if (!obs_get_video_info(&ovi) || !ovi.base_width || !ovi.base_height) throw Fail{"Pas de vidéo."};
	const int width = int(std::lround(double(height) * ovi.base_width / ovi.base_height / 2.0)) * 2;
	const QString encId = pickVideoEncoder();
	if (encId.isEmpty()) throw Fail{"Aucun encodeur H.264 disponible dans OBS."};

	obs_data_t *sdata = obs_data_create();
	obs_data_set_string(sdata, "server", server.toUtf8().constData());
	whip.service = obs_service_create("whip_custom", "syxtee_preview_service", sdata, nullptr);
	obs_data_release(sdata);
	whip.out = obs_output_create("whip_output", "syxtee_preview", nullptr, nullptr);
	if (!whip.service || !whip.out) {
		stopWhip();
		throw Fail{"Cet OBS ne sait pas envoyer en WHIP (obs-webrtc absent ou trop ancien)."};
	}
	// Vidéo : H.264 sans image B (exigé par WebRTC), image clé toutes les secondes, débit constant, réglages faible latence.
	obs_data_t *vs = obs_data_create();
	obs_data_set_int(vs, "bitrate", kbps);
	obs_data_set_string(vs, "rate_control", "CBR");
	obs_data_set_int(vs, "keyint_sec", 1);
	obs_data_set_string(vs, "profile", "baseline");
	obs_data_set_int(vs, "bf", 0);
	obs_data_set_bool(vs, "bframes", false);
	// VideoToolbox : encodage temps réel, pas de réordonnancement d'images.
	obs_data_set_bool(vs, "realtime", true);
	obs_data_set_bool(vs, "allow_frame_reordering", false);
	obs_data_set_string(vs, "preset", "veryfast");
	obs_data_set_string(vs, "tune", "zerolatency");
	obs_data_set_string(vs, "x264opts", "bframes=0 scenecut=0");
	whip.video = obs_video_encoder_create(encId.toUtf8().constData(), "syxtee_preview_video", vs, nullptr);
	obs_data_release(vs);
	obs_data_t *as = obs_data_create();
	obs_data_set_int(as, "bitrate", 64);
	whip.audio = obs_audio_encoder_create("ffmpeg_opus", "syxtee_preview_audio", as, 0, nullptr);
	obs_data_release(as);
	if (!whip.video || !whip.audio) {
		stopWhip();
		throw Fail{!whip.audio ? "L'encodeur audio Opus est absent d'OBS." : "L'encodeur vidéo n'a pas démarré."};
	}
	whip.encoder = encId;
	obs_encoder_set_video(whip.video, obs_get_video());
	obs_encoder_set_audio(whip.audio, obs_get_audio());
	obs_encoder_set_scaled_size(whip.video, uint32_t(width), uint32_t(height));
	// 60 images/s dans OBS : l'aperçu en garde une sur deux (30), largement assez et deux fois moins lourd.
	if (ovi.fps_den && double(ovi.fps_num) / ovi.fps_den >= 50.0) obs_encoder_set_frame_rate_divisor(whip.video, 2);
	obs_output_set_video_encoder(whip.out, whip.video);
	obs_output_set_audio_encoder(whip.out, whip.audio, 0);
	obs_output_set_service(whip.out, whip.service);
	obs_output_set_reconnect_settings(whip.out, 0, 0);
	signal_handler_t *sh = obs_output_get_signal_handler(whip.out);
	signal_handler_connect(sh, "start", whipSignalCb, reinterpret_cast<void *>(1));
	signal_handler_connect(sh, "stop", whipSignalCb, nullptr);
	if (!obs_output_start(whip.out)) {
		const QString err = q(obs_output_get_last_error(whip.out));
		stopWhip();
		throw Fail{err.isEmpty() ? "L'envoi WHIP n'a pas démarré." : err};
	}
	Json r;
	r["encoder"] = encId;
	r["width"] = width;
	r["height"] = height;
	r["kbps"] = kbps;
	return r;
}

// ───── Flux SYXTEE : sources OBS liées aux flux (relais) du compte ─────
// Chaque flux du compte devient une entrée média « Flux › NOM » qui lit le relais en SRT, avec reconnexion automatique. L'identifiant du
// relais est gardé dans les réglages de la source (`syxtee_relay_id`) : renommer la caméra sur le site renomme la source dans OBS,
// et un relais supprimé marque la source « relais supprimé » et la désactive. La liste des flux vient de l'agent (`link.syncRelays`).
struct RelayInfo {
	QString id, name, url;
	bool live = false;
};
std::vector<RelayInfo> relayCache;

QString fluxName(const QString &relayName) { return QString::fromUtf8("Flux › ") + relayName; }
const QString kDeletedSuffix = QString::fromUtf8(" (relais supprimé)");

QString relayIdOf(obs_source_t *s)
{
	obs_data_t *d = obs_source_get_settings(s);
	const QString id = d ? q(obs_data_get_string(d, "syxtee_relay_id")) : QString();
	if (d) obs_data_release(d);
	return id;
}

/** Entrées liées à un flux : nom d'OBS → identifiant du relais. */
std::vector<std::pair<QString, QString>> fluxSources()
{
	std::vector<std::pair<QString, QString>> out;
	obs_enum_sources(
		[](void *param, obs_source_t *src) {
			if (obs_source_get_type(src) != OBS_SOURCE_TYPE_INPUT) return true;
			const QString id = relayIdOf(src);
			if (!id.isEmpty()) static_cast<std::vector<std::pair<QString, QString>> *>(param)->push_back({q(obs_source_get_name(src)), id});
			return true;
		},
		&out);
	return out;
}

const RelayInfo *relayById(const QString &id)
{
	for (const auto &r : relayCache)
		if (r.id == id) return &r;
	return nullptr;
}

/** Nom libre dans OBS : `base`, sinon `base (2)`, `base (3)`… (`except` : la source qui porte déjà ce nom ne compte pas). */
QString freeName(const QString &base, const QString &except = QString())
{
	for (int n = 1; n < 100; n++) {
		const QString cand = n == 1 ? base : QString("%1 (%2)").arg(base).arg(n);
		if (cand == except) return cand;
		Src probe(cand);
		if (!probe.s) return cand;
	}
	return base;
}

Json fluxSettings(const RelayInfo &r)
{
	return Json{{"input", r.url}, {"is_local_file", false}, {"close_when_inactive", false}, {"restart_on_activate", false},
		    {"hw_decode", true}, {"buffering_mb", 2}, {"reconnect_delay_sec", 3}, {"syxtee_relay_id", r.id}, {"syxtee_deleted", false}};
}

/** Crée (ou réutilise) la source de chaque flux et la place dans chaque scène demandée, une seule fois par scène. */
Json addRelaySources(const QStringList &relayIds, const QStringList &scenes)
{
	if (relayCache.empty()) throw Fail{"La liste de tes flux n'est pas encore chargée : réessaie dans un instant."};
	QJsonArray created, placed;
	const auto existing = fluxSources();
	for (const QString &rid : relayIds) {
		const RelayInfo *r = relayById(rid);
		if (!r) throw Fail{"Flux inconnu : il a peut-être été supprimé."};
		if (r->url.isEmpty()) throw Fail{"Ce flux n'a pas d'adresse de lecture."};
		QString name;
		for (const auto &e : existing)
			if (e.second == rid) name = e.first;
		if (name.isEmpty()) {
			name = freeName(fluxName(r->name));
			obs_data_t *st = dataFrom(fluxSettings(*r));
			obs_source_t *src = obs_source_create("ffmpeg_source", name.toUtf8().constData(), st, nullptr);
			obs_data_release(st);
			if (!src) throw Fail{"Création de la source impossible."};
			obs_source_release(src);
			created.append(name);
		} else {
			// Déjà dans OBS : on la réutilise (même image partout), adresse remise à jour.
			Src have(name);
			obs_data_t *st = dataFrom(fluxSettings(*r));
			obs_source_update(have.need(), st);
			obs_data_release(st);
		}
		Src source(name);
		for (const QString &sceneName : scenes) {
			Src scene(sceneName);
			obs_scene_t *sc = obs_scene_from_source(scene.s);
			if (!sc) continue;
			ItemCtx c;
			bool already = false;
			obs_scene_enum_items(sc, enumItem, &c);
			for (const auto &it : c.arr) already = already || it.toObject().value("sourceName").toString() == name;
			if (already) continue;
			obs_sceneitem_t *item = obs_scene_add(sc, source.need());
			if (item) obs_sceneitem_set_visible(item, true);
			placed.append(Json{{"scene", sceneName}, {"source", name}});
		}
	}
	Json r;
	r["created"] = created;
	r["placed"] = placed;
	return r;
}

/** Aligne les sources sur la liste des flux du compte : noms, adresses, relais supprimés. */
Json syncRelays(const QJsonArray &list)
{
	relayCache.clear();
	for (const auto &v : list) {
		const Json o = v.toObject();
		relayCache.push_back({o.value("id").toString(), o.value("name").toString(), o.value("url").toString(), o.value("live").toBool()});
	}
	int renamed = 0, updated = 0, removed = 0;
	for (const auto &[name, rid] : fluxSources()) {
		Src src(name);
		if (!src.s) continue;
		const RelayInfo *r = relayById(rid);
		if (r) {
			const QString want = fluxName(r->name);
			// « Flux › NOM » : on ne renomme que les sources encore nommées ainsi (le nom donné à la main par l'utilisateur est respecté).
			const QString oldBase = name.endsWith(kDeletedSuffix) ? name.left(name.size() - kDeletedSuffix.size()) : name;
			const bool followsAccount = oldBase.startsWith(QString::fromUtf8("Flux › "));
			if (followsAccount && oldBase != want && !name.startsWith(want + " (")) {
				obs_source_set_name(src.s, freeName(want, name).toUtf8().constData());
				renamed++;
			} else if (name.endsWith(kDeletedSuffix) && followsAccount) {
				obs_source_set_name(src.s, freeName(oldBase, name).toUtf8().constData());
			}
			obs_data_t *cur = obs_source_get_settings(src.s);
			const bool urlChanged = !r->url.isEmpty() && q(obs_data_get_string(cur, "input")) != r->url;
			const bool wasDeleted = obs_data_get_bool(cur, "syxtee_deleted");
			obs_data_release(cur);
			if (urlChanged || wasDeleted) {
				obs_data_t *st = obs_data_create();
				if (urlChanged) obs_data_set_string(st, "input", r->url.toUtf8().constData());
				obs_data_set_bool(st, "syxtee_deleted", false);
				obs_source_update(src.s, st);
				obs_data_release(st);
				if (urlChanged) updated++;
			}
			if (wasDeleted) obs_source_set_enabled(src.s, true);
		} else {
			obs_data_t *cur = obs_source_get_settings(src.s);
			const bool already = obs_data_get_bool(cur, "syxtee_deleted");
			obs_data_release(cur);
			if (already) continue;
			obs_data_t *st = obs_data_create();
			obs_data_set_bool(st, "syxtee_deleted", true);
			obs_source_update(src.s, st);
			obs_data_release(st);
			obs_source_set_enabled(src.s, false); // désactivée : plus rien ne s'affiche ni ne s'entend
			if (!name.endsWith(kDeletedSuffix)) obs_source_set_name(src.s, freeName(name + kDeletedSuffix, name).toUtf8().constData());
			removed++;
		}
	}
	Json out;
	out["renamed"] = renamed;
	out["updated"] = updated;
	out["removed"] = removed;
	return out;
}

// Type de source « Flux SYXTEE » (Ajouter une source) : assistant à cases à cocher. Il crée une source par flux coché puis disparaît.
struct Wizard {
	obs_source_t *src;
};

const char *wizardName(void *) { return "Flux SYXTEE"; }

void *wizardCreate(obs_data_t *settings, obs_source_t *source)
{
	// Par défaut : la scène courante est cochée.
	const QString cur = currentSceneName(obs_frontend_get_current_scene);
	if (!cur.isEmpty()) obs_data_set_default_bool(settings, ("scene:" + cur).toUtf8().constData(), true);
	emitEvent("link.needRelays"); // l'agent rafraîchit la liste des flux tout de suite
	return new Wizard{source};
}
void wizardDestroy(void *data) { delete static_cast<Wizard *>(data); }
uint32_t wizardSize(void *) { return 0; }
void wizardRender(void *, gs_effect_t *) {}

bool wizardAdd(obs_properties_t *, obs_property_t *, void *data)
{
	auto *w = static_cast<Wizard *>(data);
	obs_data_t *st = obs_source_get_settings(w->src);
	QStringList ids, scenes;
	for (const auto &r : relayCache)
		if (obs_data_get_bool(st, ("relay:" + r.id).toUtf8().constData())) ids << r.id;
	SceneList sl;
	for (size_t i = 0; i < sl.l.sources.num; i++) {
		const QString n = q(obs_source_get_name(sl.l.sources.array[i]));
		if (obs_data_get_bool(st, ("scene:" + n).toUtf8().constData())) scenes << n;
	}
	obs_data_release(st);
	if (ids.isEmpty()) return false;
	if (scenes.isEmpty()) scenes << currentSceneName(obs_frontend_get_current_scene);
	const QString self = q(obs_source_get_name(w->src));
	try {
		const Json r = addRelaySources(ids, scenes);
		blog(LOG_INFO, "[syxtee-link] flux ajoutés : %d créé(s), %d placement(s)", int(r.value("created").toArray().size()), int(r.value("placed").toArray().size()));
	} catch (const Fail &f) {
		blog(LOG_WARNING, "[syxtee-link] flux non ajoutés : %s", f.message.toUtf8().constData());
		return false;
	}
	// L'assistant a fini son travail : on le retire (la fenêtre de propriétés se ferme avec lui).
	onMain([self] {
		Src me(self);
		if (me.s && q(obs_source_get_id(me.s)) == "syxtee_flux") obs_source_remove(me.s);
	});
	return true;
}

bool wizardCreateRelay(obs_properties_t *, obs_property_t *, void *)
{
	QDesktopServices::openUrl(QUrl("https://syxtee-networks.vercel.app/dashboard/relais"));
	return false;
}

obs_properties_t *wizardProps(void *)
{
	obs_properties_t *p = obs_properties_create();
	obs_properties_add_text(p, "info1", u("Coche les flux à ajouter. Chacun devient une source « Flux › NOM », du nom de ta caméra sur le compte, et reste synchronisée avec lui."), OBS_TEXT_INFO);
	if (relayCache.empty()) {
		obs_properties_add_text(p, "none", u("Aucun flux sur ton compte (ou liste en cours de chargement)."), OBS_TEXT_INFO);
	} else {
		const auto have = fluxSources();
		for (const auto &r : relayCache) {
			bool inObs = false;
			for (const auto &h : have) inObs = inObs || h.second == r.id;
			const QString label = r.name + (r.live ? QString::fromUtf8(" · en ligne") : QString::fromUtf8(" · hors ligne")) + (inObs ? QString::fromUtf8(" · déjà dans OBS") : QString());
			obs_properties_add_bool(p, ("relay:" + r.id).toUtf8().constData(), label.toUtf8().constData());
		}
	}
	obs_properties_add_button(p, "createRelay", u("Créer un relais (ouvre le site)"), wizardCreateRelay);
	obs_properties_add_text(p, "info2", u("Ajouter à ces scènes (la même source est réutilisée dans chacune) :"), OBS_TEXT_INFO);
	SceneList sl;
	for (size_t i = 0; i < sl.l.sources.num; i++) {
		const QString n = q(obs_source_get_name(sl.l.sources.array[i]));
		obs_properties_add_bool(p, ("scene:" + n).toUtf8().constData(), n.toUtf8().constData());
	}
	obs_properties_add_button(p, "add", u("Ajouter les flux cochés"), wizardAdd);
	return p;
}

void registerFluxSource()
{
	static obs_source_info info = {};
	info.id = "syxtee_flux";
	info.type = OBS_SOURCE_TYPE_INPUT;
	info.output_flags = OBS_SOURCE_VIDEO;
	info.get_name = wizardName;
	info.create = wizardCreate;
	info.destroy = wizardDestroy;
	info.get_width = wizardSize;
	info.get_height = wizardSize;
	info.get_properties = wizardProps;
	info.video_render = wizardRender;
	obs_register_source(&info);
}

// ───── Multistream : envoyer le même direct vers d'autres plateformes (comme Aitum Multistream) ─────
// Chaque sortie = un service RTMP personnalisé (adresse du serveur + clé de stream) et une sortie RTMP d'OBS. Si le direct principal tourne,
// la sortie réutilise ses encodeurs (aucune charge en plus) ; sinon elle crée les siens. La clé reste sur le PC (fichier réservé à
// l'utilisateur) : elle n'est jamais renvoyée au navigateur, seulement « hasKey ».
struct MsOut {
	QString id, name, service, server, key;
	obs_output_t *out = nullptr;
	obs_service_t *svc = nullptr;
	obs_encoder_t *video = nullptr, *audio = nullptr; // encodeurs à nous (null : ceux du direct principal)
	bool active = false, starting = false;
	// Attend que le direct principal d'OBS soit en route (ses encodeurs servent à la sortie).
	bool waiting = false;
	QString error;
};
std::vector<std::unique_ptr<MsOut>> msOuts;
bool msLoaded = false;
// Le direct principal a été lancé par une sortie multistream : il s'arrête avec la dernière.
bool mainByMs = false;

/** Le direct principal d'OBS est connecté (ses encodeurs tournent). */
bool mainReady()
{
	bool ok = false;
	if (obs_output_t *m = obs_frontend_get_streaming_output()) {
		ok = obs_output_active(m);
		obs_output_release(m);
	}
	return ok;
}

/** Plus aucune sortie en cours ni en attente : le direct lancé pour elles s'arrête aussi. */
void msMaybeStopMain()
{
	if (!mainByMs) return;
	for (auto &o : msOuts)
		if (o->active || o->starting || o->waiting) return;
	mainByMs = false;
	if (obs_frontend_streaming_active()) obs_frontend_streaming_stop();
}

QString msPath()
{
	char *dir = os_get_config_path_ptr("obs-studio/plugin_config/syxtee-link");
	if (!dir) return QString();
	os_mkdirs(dir);
	const QString p = q(dir) + "/multistream.json";
	bfree(dir);
	return p;
}

MsOut *msFind(const QString &id)
{
	for (auto &o : msOuts)
		if (o->id == id) return o.get();
	return nullptr;
}

void msSave()
{
	QJsonArray arr;
	for (auto &o : msOuts) arr.append(Json{{"id", o->id}, {"name", o->name}, {"service", o->service}, {"server", o->server}, {"key", o->key}});
	QFile f(msPath());
	if (!f.open(QIODevice::WriteOnly | QIODevice::Truncate)) return;
	f.setPermissions(QFile::ReadOwner | QFile::WriteOwner);
	f.write(QJsonDocument(arr).toJson(QJsonDocument::Compact));
}

void msLoad()
{
	if (msLoaded) return;
	msLoaded = true;
	QFile f(msPath());
	if (!f.open(QIODevice::ReadOnly)) return;
	for (const QJsonValue &v : QJsonDocument::fromJson(f.readAll()).array()) {
		const Json j = v.toObject();
		auto o = std::make_unique<MsOut>();
		o->id = j.value("id").toString();
		o->name = j.value("name").toString();
		o->service = j.value("service").toString();
		o->server = j.value("server").toString();
		o->key = j.value("key").toString();
		if (!o->id.isEmpty()) msOuts.push_back(std::move(o));
	}
}

Json msListJson()
{
	msLoad();
	QJsonArray arr;
	for (auto &o : msOuts)
		arr.append(Json{{"id", o->id}, {"name", o->name}, {"service", o->service}, {"server", o->server}, {"hasKey", !o->key.isEmpty()}, {"active", o->active}, {"starting", o->starting}, {"error", o->error}});
	return Json{{"outputs", arr}, {"mainActive", obs_frontend_streaming_active()}};
}

void msRelease(MsOut *o)
{
	if (o->out) {
		obs_output_stop(o->out);
		obs_output_release(o->out);
	}
	if (o->video) obs_encoder_release(o->video);
	if (o->audio) obs_encoder_release(o->audio);
	if (o->svc) obs_service_release(o->svc);
	o->out = nullptr;
	o->video = o->audio = nullptr;
	o->svc = nullptr;
	o->active = o->starting = false;
}

void msStartedCb(void *param, calldata_t *)
{
	const QString id = static_cast<MsOut *>(param)->id;
	onMain([id] {
		MsOut *m = msFind(id);
		if (!m) return;
		m->active = true;
		m->starting = false;
		m->error.clear();
		emitEvent("link.multistream", msListJson());
	});
}

void msStoppedCb(void *param, calldata_t *cd)
{
	const QString id = static_cast<MsOut *>(param)->id;
	long long code = 0;
	calldata_get_int(cd, "code", &code);
	obs_output_t *out = static_cast<obs_output_t *>(calldata_ptr(cd, "output"));
	const QString err = (code != 0 && out) ? q(obs_output_get_last_error(out)) : QString();
	onMain([id, code, err] {
		MsOut *m = msFind(id);
		if (!m) return;
		m->active = false;
		m->starting = false;
		m->error = code != 0 ? (err.isEmpty() ? QString::fromUtf8("Connexion coupée par la plateforme.") : err) : QString();
		// Libère les ressources une fois la sortie vraiment arrêtée.
		QTimer::singleShot(0, [id] {
			MsOut *x = msFind(id);
			if (x && !x->active && !x->starting) msRelease(x);
			msMaybeStopMain();
			emitEvent("link.multistream", msListJson());
		});
	});
}

/** Démarre la sortie (le direct principal tourne). Lève Fail en cas d'échec. */
void msStartNow(MsOut *o)
{
	o->waiting = false;
	msRelease(o);
	o->error.clear();

	obs_data_t *sd = obs_data_create();
	obs_data_set_string(sd, "server", o->server.toUtf8().constData());
	obs_data_set_string(sd, "key", o->key.toUtf8().constData());
	o->svc = obs_service_create("rtmp_custom", (std::string("syxtee_ms_svc_") + o->id.toStdString()).c_str(), sd, nullptr);
	obs_data_release(sd);
	const bool rtmps = o->server.startsWith("rtmps://", Qt::CaseInsensitive);
	o->out = obs_output_create(rtmps ? "rtmp_output" : "rtmp_output", (std::string("syxtee_ms_out_") + o->id.toStdString()).c_str(), nullptr, nullptr);
	if (!o->svc || !o->out) {
		msRelease(o);
		throw Fail{"Impossible de créer la sortie RTMP dans OBS."};
	}

	obs_encoder_t *mainVideo = nullptr, *mainAudio = nullptr;
	if (obs_output_t *main = obs_frontend_get_streaming_output()) {
		if (obs_output_active(main)) {
			mainVideo = obs_output_get_video_encoder(main);
			mainAudio = obs_output_get_audio_encoder(main, 0);
		}
		obs_output_release(main);
	}
	if (mainVideo && mainAudio) {
		obs_output_set_video_encoder(o->out, mainVideo);
		obs_output_set_audio_encoder(o->out, mainAudio, 0);
	} else {
		const QString encId = pickVideoEncoder();
		if (encId.isEmpty()) {
			msRelease(o);
			throw Fail{"Aucun encodeur H.264 disponible dans OBS."};
		}
		obs_data_t *vs = obs_data_create();
		obs_data_set_int(vs, "bitrate", 6000);
		obs_data_set_string(vs, "rate_control", "CBR");
		obs_data_set_int(vs, "keyint_sec", 2);
		obs_data_set_string(vs, "profile", "high");
		o->video = obs_video_encoder_create(encId.toUtf8().constData(), (std::string("syxtee_ms_v_") + o->id.toStdString()).c_str(), vs, nullptr);
		obs_data_release(vs);
		obs_data_t *as = obs_data_create();
		obs_data_set_int(as, "bitrate", 160);
		o->audio = obs_audio_encoder_create("ffmpeg_aac", (std::string("syxtee_ms_a_") + o->id.toStdString()).c_str(), as, 0, nullptr);
		obs_data_release(as);
		if (!o->video || !o->audio) {
			msRelease(o);
			throw Fail{"L'encodeur n'a pas démarré."};
		}
		obs_encoder_set_video(o->video, obs_get_video());
		obs_encoder_set_audio(o->audio, obs_get_audio());
		obs_output_set_video_encoder(o->out, o->video);
		obs_output_set_audio_encoder(o->out, o->audio, 0);
	}
	obs_output_set_service(o->out, o->svc);
	obs_output_set_reconnect_settings(o->out, 20, 10);
	signal_handler_t *sh = obs_output_get_signal_handler(o->out);
	signal_handler_connect(sh, "start", msStartedCb, o);
	signal_handler_connect(sh, "stop", msStoppedCb, o);
	o->starting = true;
	if (!obs_output_start(o->out)) {
		const QString err = q(obs_output_get_last_error(o->out));
		msRelease(o);
		o->error = err.isEmpty() ? QString::fromUtf8("L'envoi n'a pas démarré.") : err;
		throw Fail{o->error};
	}
}

/** Lancer une sortie lance aussi le direct d'OBS (barre d'état, chrono, « Arrêter le streaming ») : les encodeurs sont partagés. */
Json msStart(const QString &id)
{
	msLoad();
	MsOut *o = msFind(id);
	if (!o) throw Fail{"Sortie introuvable."};
	if (o->active || o->starting) throw Fail{"Cette sortie est déjà en cours."};
	if (o->server.isEmpty() || o->key.isEmpty()) throw Fail{"Renseigne l'adresse du serveur et la clé de stream."};
	o->error.clear();
	if (mainReady()) {
		try {
			msStartNow(o);
		} catch (const Fail &) {
			msMaybeStopMain();
			throw;
		}
		return msListJson();
	}
	o->waiting = true;
	o->starting = true;
	if (!obs_frontend_streaming_active()) {
		mainByMs = true;
		obs_frontend_streaming_start();
	}
	return msListJson();
}

/** Le direct principal est parti : les sorties en attente démarrent. */
void msMainStarted()
{
	for (auto &o : msOuts) {
		if (!o->waiting) continue;
		try {
			msStartNow(o.get());
		} catch (const Fail &f) {
			o->error = f.message;
			o->starting = false;
		}
	}
	emitEvent("link.multistream", msListJson());
}

/** Le direct principal s'est arrêté (ou n'a pas démarré). */
void msMainStopped()
{
	bool changed = false;
	for (auto &o : msOuts) {
		if (!o->waiting) continue;
		o->waiting = false;
		o->starting = false;
		o->error = QString::fromUtf8("Le direct principal d'OBS n'a pas démarré (vérifie le service dans OBS).");
		changed = true;
	}
	mainByMs = false;
	if (changed) emitEvent("link.multistream", msListJson());
}

Json msStop(const QString &id)
{
	MsOut *o = msFind(id);
	if (!o) throw Fail{"Sortie introuvable."};
	if (o->waiting) {
		o->waiting = false;
		o->starting = false;
	} else if (o->out) {
		obs_output_stop(o->out);
	}
	msMaybeStopMain();
	return msListJson();
}

void msShutdown()
{
	for (auto &o : msOuts) msRelease(o.get());
	msOuts.clear();
	msLoaded = false;
}

Json msSaveOutput(const Json &d)
{
	msLoad();
	QString id = d.value("id").toString();
	const QString server = d.value("server").toString().trimmed();
	const QString key = d.value("key").toString().trimmed();
	const QString name = d.value("name").toString().trimmed().left(40);
	if (name.isEmpty()) throw Fail{"Donne un nom à cette sortie."};
	if (!(server.startsWith("rtmp://", Qt::CaseInsensitive) || server.startsWith("rtmps://", Qt::CaseInsensitive)) || server.size() > 300) throw Fail{"L'adresse du serveur doit commencer par rtmp:// ou rtmps://."};
	MsOut *o = id.isEmpty() ? nullptr : msFind(id);
	if (!o) {
		if (key.isEmpty()) throw Fail{"Renseigne la clé de stream."};
		if (msOuts.size() >= 12) throw Fail{"12 sorties au plus."};
		auto n = std::make_unique<MsOut>();
		n->id = id.isEmpty() ? QString::number(QDateTime::currentMSecsSinceEpoch(), 36) : id;
		o = n.get();
		msOuts.push_back(std::move(n));
	} else if (o->active || o->starting) {
		throw Fail{"Arrête cette sortie avant de la modifier."};
	}
	o->name = name;
	o->service = d.value("service").toString().left(24);
	o->server = server;
	if (!key.isEmpty()) o->key = key.left(512); // vide : on garde la clé déjà enregistrée
	msSave();
	return msListJson();
}

Json msRemove(const QString &id)
{
	msLoad();
	MsOut *o = msFind(id);
	if (!o) throw Fail{"Sortie introuvable."};
	msRelease(o);
	msOuts.erase(std::remove_if(msOuts.begin(), msOuts.end(), [&](const std::unique_ptr<MsOut> &x) { return x->id == id; }), msOuts.end());
	msSave();
	msMaybeStopMain();
	return msListJson();
}

// ───── Demandes ─────
using Handler = std::function<Json(const Json &)>;

QString req(const Json &d, const char *k) { return d.value(k).toString(); }

Json okEmpty() { return Json(); }

std::map<QString, Handler> &handlers()
{
	static std::map<QString, Handler> h = [] {
		std::map<QString, Handler> m;

		m["GetVersion"] = [](const Json &) {
			Json r;
			r["obsVersion"] = q(obs_get_version_string());
			r["rpcVersion"] = 1;
			r["platform"] =
#ifdef _WIN32
				"windows";
#elif defined(__APPLE__)
				"macos";
#else
				"linux";
#endif
			return r;
		};
		m["GetStats"] = [](const Json &) { return statsJson(false); };
		m["GetOutputStats"] = [](const Json &) { return statsJson(false); };
		m["GetVideoSettings"] = [](const Json &) {
			obs_video_info v;
			if (!obs_get_video_info(&v)) throw Fail{"Pas de vidéo."};
			Json r;
			r["baseWidth"] = int(v.base_width);
			r["baseHeight"] = int(v.base_height);
			r["outputWidth"] = int(v.output_width);
			r["outputHeight"] = int(v.output_height);
			r["fpsNumerator"] = int(v.fps_num);
			r["fpsDenominator"] = int(v.fps_den);
			return r;
		};

		// Scènes
		m["GetSceneList"] = [](const Json &) { return sceneListJson(); };
		m["GetCurrentProgramScene"] = [](const Json &) {
			Json r;
			r["currentProgramSceneName"] = currentSceneName(obs_frontend_get_current_scene);
			return r;
		};
		m["GetCurrentPreviewScene"] = [](const Json &) {
			if (!obs_frontend_preview_program_mode_active()) throw Fail{"Le mode Studio n'est pas activé."};
			Json r;
			r["currentPreviewSceneName"] = currentSceneName(obs_frontend_get_current_preview_scene);
			return r;
		};
		m["SetCurrentProgramScene"] = [](const Json &d) {
			Src s(req(d, "sceneName"));
			sceneNamed(s);
			obs_frontend_set_current_scene(s.s);
			return okEmpty();
		};
		m["SetCurrentPreviewScene"] = [](const Json &d) {
			if (!obs_frontend_preview_program_mode_active()) throw Fail{"Le mode Studio n'est pas activé."};
			Src s(req(d, "sceneName"));
			sceneNamed(s);
			obs_frontend_set_current_preview_scene(s.s);
			return okEmpty();
		};
		m["GetStudioModeEnabled"] = [](const Json &) {
			Json r;
			r["studioModeEnabled"] = obs_frontend_preview_program_mode_active();
			return r;
		};
		m["SetStudioModeEnabled"] = [](const Json &d) {
			obs_frontend_set_preview_program_mode(d.value("studioModeEnabled").toBool());
			return okEmpty();
		};
		m["TriggerStudioModeTransition"] = [](const Json &) {
			if (!obs_frontend_preview_program_mode_active()) throw Fail{"Le mode Studio n'est pas activé."};
			obs_frontend_preview_program_trigger_transition();
			return okEmpty();
		};
		m["GetSceneItemList"] = [](const Json &d) {
			Src s(req(d, "sceneName"));
			ItemCtx c;
			obs_scene_enum_items(sceneNamed(s), enumItem, &c);
			Json r;
			r["sceneItems"] = c.arr;
			return r;
		};
		m["SetSceneItemEnabled"] = [](const Json &d) {
			Src s(req(d, "sceneName"));
			obs_sceneitem_t *it = obs_scene_find_sceneitem_by_id(sceneNamed(s), int64_t(d.value("sceneItemId").toDouble()));
			if (!it) throw Fail{"Élément de scène introuvable."};
			obs_sceneitem_set_visible(it, d.value("sceneItemEnabled").toBool());
			return okEmpty();
		};

		// Entrées et audio
		m["GetInputList"] = [](const Json &) {
			QJsonArray arr;
			globalAudio.clear();
			for (uint32_t ch = 1; ch <= 6; ch++) {
				if (obs_source_t *g = obs_get_output_source(ch)) {
					globalAudio.insert(q(obs_source_get_name(g)));
					obs_source_release(g);
				}
			}
			obs_enum_sources(enumInput, &arr);
			Json r;
			r["inputs"] = arr;
			return r;
		};
		m["GetInputMute"] = [](const Json &d) {
			Src s(req(d, "inputName"));
			Json r;
			r["inputMuted"] = obs_source_muted(s.need("Entrée"));
			return r;
		};
		m["SetInputMute"] = [](const Json &d) {
			Src s(req(d, "inputName"));
			obs_source_set_muted(s.need("Entrée"), d.value("inputMuted").toBool());
			return okEmpty();
		};
		m["GetInputVolume"] = [](const Json &d) {
			Src s(req(d, "inputName"));
			const double mul = obs_source_get_volume(s.need("Entrée"));
			Json r;
			r["inputVolumeMul"] = mul;
			r["inputVolumeDb"] = toDb(mul);
			return r;
		};
		m["SetInputVolume"] = [](const Json &d) {
			Src s(req(d, "inputName"));
			double mul = d.contains("inputVolumeMul") ? d.value("inputVolumeMul").toDouble() : std::pow(10.0, d.value("inputVolumeDb").toDouble() / 20.0);
			mul = std::min(20.0, std::max(0.0, mul));
			obs_source_set_volume(s.need("Entrée"), float(mul));
			return okEmpty();
		};
		m["GetInputAudioMonitorType"] = [](const Json &d) {
			Src s(req(d, "inputName"));
			Json r;
			r["monitorType"] = monitorName(obs_source_get_monitoring_type(s.need("Entrée")));
			return r;
		};
		m["SetInputAudioMonitorType"] = [](const Json &d) {
			Src s(req(d, "inputName"));
			const QString t = req(d, "monitorType");
			obs_source_set_monitoring_type(s.need("Entrée"), t.endsWith("MONITOR_ONLY") ? OBS_MONITORING_TYPE_MONITOR_ONLY
									: t.endsWith("MONITOR_AND_OUTPUT") ? OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT
													    : OBS_MONITORING_TYPE_NONE);
			return okEmpty();
		};
		m["GetMediaInputStatus"] = [](const Json &d) {
			Src s(req(d, "inputName"));
			obs_source_t *src = s.need("Entrée");
			Json r;
			const obs_media_state st = obs_source_media_get_state(src);
			r["mediaState"] = st == OBS_MEDIA_STATE_PLAYING ? "OBS_MEDIA_INPUT_STATE_PLAYING"
					  : st == OBS_MEDIA_STATE_PAUSED ? "OBS_MEDIA_INPUT_STATE_PAUSED"
					  : st == OBS_MEDIA_STATE_BUFFERING ? "OBS_MEDIA_INPUT_STATE_BUFFERING"
					  : st == OBS_MEDIA_STATE_ENDED ? "OBS_MEDIA_INPUT_STATE_ENDED"
					  : st == OBS_MEDIA_STATE_ERROR ? "OBS_MEDIA_INPUT_STATE_ERROR"
					  : st == OBS_MEDIA_STATE_STOPPED ? "OBS_MEDIA_INPUT_STATE_STOPPED"
									  : "OBS_MEDIA_INPUT_STATE_NONE";
			r["mediaDuration"] = double(obs_source_media_get_duration(src));
			r["mediaCursor"] = double(obs_source_media_get_time(src));
			return r;
		};
		m["CreateInput"] = [](const Json &d) {
			Src scene(req(d, "sceneName"));
			obs_scene_t *sc = sceneNamed(scene);
			obs_data_t *settings = dataFrom(d.value("inputSettings").toObject());
			obs_source_t *src = obs_source_create(u(req(d, "inputKind")), req(d, "inputName").toUtf8().constData(), settings, nullptr);
			obs_data_release(settings);
			if (!src) throw Fail{"Création de la source impossible."};
			obs_sceneitem_t *it = obs_scene_add(sc, src);
			if (it) obs_sceneitem_set_visible(it, d.value("sceneItemEnabled").toBool(true));
			Json r;
			r["sceneItemId"] = it ? double(obs_sceneitem_get_id(it)) : 0.0;
			obs_source_release(src);
			return r;
		};
		m["CreateSceneItem"] = [](const Json &d) {
			Src scene(req(d, "sceneName")), source(req(d, "sourceName"));
			obs_sceneitem_t *it = obs_scene_add(sceneNamed(scene), source.need());
			if (!it) throw Fail{"Ajout à la scène impossible."};
			obs_sceneitem_set_visible(it, d.value("sceneItemEnabled").toBool(true));
			Json r;
			r["sceneItemId"] = double(obs_sceneitem_get_id(it));
			return r;
		};
		m["SetInputSettings"] = [](const Json &d) {
			Src s(req(d, "inputName"));
			obs_source_t *src = s.need("Entrée");
			obs_data_t *settings = dataFrom(d.value("inputSettings").toObject());
			if (!d.value("overlay").toBool(true)) obs_source_reset_settings(src, settings);
			else obs_source_update(src, settings);
			obs_data_release(settings);
			return okEmpty();
		};
		m["SetInputName"] = [](const Json &d) {
			Src s(req(d, "inputName"));
			obs_source_set_name(s.need("Entrée"), req(d, "newInputName").toUtf8().constData());
			return okEmpty();
		};
		m["link.syncRelays"] = [](const Json &d) { return syncRelays(d.value("relays").toArray()); };
		m["link.addRelaySources"] = [](const Json &d) {
			QStringList ids, scenes;
			for (const auto &v : d.value("relayIds").toArray()) ids << v.toString();
			for (const auto &v : d.value("scenes").toArray()) scenes << v.toString();
			return addRelaySources(ids, scenes);
		};
		m["link.multistreamList"] = [](const Json &) { return msListJson(); };
		m["link.multistreamSave"] = [](const Json &d) { return msSaveOutput(d); };
		m["link.multistreamRemove"] = [](const Json &d) { return msRemove(req(d, "id")); };
		m["link.multistreamStart"] = [](const Json &d) { return msStart(req(d, "id")); };
		m["link.multistreamStop"] = [](const Json &d) { return msStop(req(d, "id")); };
		m["link.whipStart"] = [](const Json &d) { return startWhip(d); };
		m["link.whipStop"] = [](const Json &) {
			stopWhip();
			return okEmpty();
		};
		m["link.whipStatus"] = [](const Json &) {
			Json r;
			r["active"] = whip.out && obs_output_active(whip.out);
			r["encoder"] = whip.encoder;
			return r;
		};
		m["GetSourceScreenshot"] = [](const Json &d) {
			Src s(req(d, "sourceName"));
			const QByteArray jpg = renderJpeg(s.need(), std::min(1920, std::max(16, d.value("imageWidth").toInt(800))), std::min(100, std::max(1, d.value("imageCompressionQuality").toInt(55))));
			Json r;
			r["imageData"] = QString::fromLatin1(jpg.toBase64());
			return r;
		};

		// Transitions
		m["GetSceneTransitionList"] = [](const Json &) {
			obs_frontend_source_list l{};
			obs_frontend_get_transitions(&l);
			QJsonArray arr;
			for (size_t i = 0; i < l.sources.num; i++) {
				Json t;
				t["transitionName"] = q(obs_source_get_name(l.sources.array[i]));
				arr.append(t);
			}
			obs_frontend_source_list_free(&l);
			Json r;
			r["transitions"] = arr;
			obs_source_t *cur = obs_frontend_get_current_transition();
			r["currentSceneTransitionName"] = cur ? q(obs_source_get_name(cur)) : QString();
			if (cur) obs_source_release(cur);
			return r;
		};
		m["GetCurrentSceneTransition"] = [](const Json &) {
			Json r;
			obs_source_t *cur = obs_frontend_get_current_transition();
			r["transitionName"] = cur ? q(obs_source_get_name(cur)) : QString();
			r["transitionDuration"] = obs_frontend_get_transition_duration();
			if (cur) obs_source_release(cur);
			return r;
		};
		m["SetCurrentSceneTransition"] = [](const Json &d) {
			obs_frontend_source_list l{};
			obs_frontend_get_transitions(&l);
			obs_source_t *found = nullptr;
			for (size_t i = 0; i < l.sources.num; i++)
				if (q(obs_source_get_name(l.sources.array[i])) == req(d, "transitionName")) found = l.sources.array[i];
			if (found) obs_frontend_set_current_transition(found);
			obs_frontend_source_list_free(&l);
			if (!found) throw Fail{"Transition introuvable."};
			return okEmpty();
		};

		// Sorties
		m["GetStreamStatus"] = [](const Json &) { return streamJson(); };
		m["GetRecordStatus"] = [](const Json &) { return recordJson(); };
		m["StartStream"] = [](const Json &) {
			if (obs_frontend_streaming_active()) throw Fail{"Le direct est déjà en cours."};
			obs_frontend_streaming_start();
			return okEmpty();
		};
		m["StopStream"] = [](const Json &) {
			if (!obs_frontend_streaming_active()) throw Fail{"Aucun direct en cours."};
			obs_frontend_streaming_stop();
			return okEmpty();
		};
		m["ToggleStream"] = [](const Json &) {
			Json r;
			const bool on = obs_frontend_streaming_active();
			if (on) obs_frontend_streaming_stop();
			else obs_frontend_streaming_start();
			r["outputActive"] = !on;
			return r;
		};
		m["StartRecord"] = [](const Json &) {
			if (obs_frontend_recording_active()) throw Fail{"L'enregistrement est déjà en cours."};
			obs_frontend_recording_start();
			return okEmpty();
		};
		m["StopRecord"] = [](const Json &) {
			if (!obs_frontend_recording_active()) throw Fail{"Aucun enregistrement en cours."};
			obs_frontend_recording_stop();
			return okEmpty();
		};
		m["ToggleRecord"] = [](const Json &) {
			Json r;
			const bool on = obs_frontend_recording_active();
			if (on) obs_frontend_recording_stop();
			else obs_frontend_recording_start();
			r["outputActive"] = !on;
			return r;
		};
		m["PauseRecord"] = [](const Json &) {
			obs_frontend_recording_pause(true);
			return okEmpty();
		};
		m["ResumeRecord"] = [](const Json &) {
			obs_frontend_recording_pause(false);
			return okEmpty();
		};

		// Profils et collections de scènes
		m["GetProfileList"] = [](const Json &) {
			Json r;
			QJsonArray arr;
			for (const auto &p : freeList(obs_frontend_get_profiles())) arr.append(p);
			char *cur = obs_frontend_get_current_profile();
			r["profiles"] = arr;
			r["currentProfileName"] = q(cur);
			bfree(cur);
			return r;
		};
		m["SetCurrentProfile"] = [](const Json &d) {
			if (obs_frontend_streaming_active() || obs_frontend_recording_active()) throw Fail{"Impossible de changer de profil pendant un direct ou un enregistrement."};
			obs_frontend_set_current_profile(u(req(d, "profileName")));
			return okEmpty();
		};
		m["GetSceneCollectionList"] = [](const Json &) {
			Json r;
			QJsonArray arr;
			for (const auto &p : freeList(obs_frontend_get_scene_collections())) arr.append(p);
			char *cur = obs_frontend_get_current_scene_collection();
			r["sceneCollections"] = arr;
			r["currentSceneCollectionName"] = q(cur);
			bfree(cur);
			return r;
		};
		m["SetCurrentSceneCollection"] = [](const Json &d) {
			if (obs_frontend_streaming_active() || obs_frontend_recording_active()) throw Fail{"Impossible de changer de collection pendant un direct ou un enregistrement."};
			obs_frontend_set_current_scene_collection(u(req(d, "sceneCollectionName")));
			return okEmpty();
		};
		return m;
	}();
	return h;
}

void respond(QLocalSocket *c, const Json &msg)
{
	Json out;
	out["id"] = msg.value("id");
	const QString type = msg.value("type").toString();
	try {
		if (!ready) throw Fail{"OBS démarre : réessaie dans un instant."};
		auto it = handlers().find(type);
		if (it == handlers().end()) throw Fail{"Demande inconnue : " + type};
		out["data"] = it->second(msg.value("data").toObject());
		out["ok"] = true;
	} catch (const Fail &f) {
		out["ok"] = false;
		out["error"] = f.message;
	}
	sendLine(c, out);
}

// ───── Événements : signaux d'OBS → agent ─────
// Les signaux arrivent sur des fils variés : on copie ce qu'il faut et on repasse sur le fil principal.
void onMain(std::function<void()> fn)
{
	QMetaObject::invokeMethod(QCoreApplication::instance(), std::move(fn), Qt::QueuedConnection);
}

struct Meter {
	std::string name;
	obs_volmeter_t *vm = nullptr;
	float mag[MAX_AUDIO_CHANNELS]{}, peak[MAX_AUDIO_CHANNELS]{}, inpeak[MAX_AUDIO_CHANNELS]{};
	int channels = 0;
};
QMutex meterLock, wiredLock;
std::map<obs_source_t *, std::unique_ptr<Meter>> meters;
QSet<obs_source_t *> wired;

void volmeterCb(void *param, const float magnitude[MAX_AUDIO_CHANNELS], const float peak[MAX_AUDIO_CHANNELS], const float inputPeak[MAX_AUDIO_CHANNELS])
{
	auto *m = static_cast<Meter *>(param);
	QMutexLocker l(&meterLock);
	memcpy(m->mag, magnitude, sizeof(m->mag));
	memcpy(m->peak, peak, sizeof(m->peak));
	memcpy(m->inpeak, inputPeak, sizeof(m->inpeak));
	m->channels = std::max(1, obs_volmeter_get_nr_channels(m->vm));
}

void muteCb(void *, calldata_t *cd)
{
	obs_source_t *s = static_cast<obs_source_t *>(calldata_ptr(cd, "source"));
	bool muted = false;
	calldata_get_bool(cd, "muted", &muted);
	const QString name = q(obs_source_get_name(s));
	onMain([=] { Json d; d["inputName"] = name; d["inputMuted"] = muted; emitEvent("InputMuteStateChanged", d); });
}
void volumeCb(void *, calldata_t *cd)
{
	obs_source_t *s = static_cast<obs_source_t *>(calldata_ptr(cd, "source"));
	double v = 0;
	calldata_get_float(cd, "volume", &v);
	const QString name = q(obs_source_get_name(s));
	onMain([=] { Json d; d["inputName"] = name; d["inputVolumeMul"] = v; d["inputVolumeDb"] = toDb(v); emitEvent("InputVolumeChanged", d); });
}
void itemVisibleCb(void *, calldata_t *cd)
{
	obs_scene_t *sc = static_cast<obs_scene_t *>(calldata_ptr(cd, "scene"));
	obs_sceneitem_t *it = static_cast<obs_sceneitem_t *>(calldata_ptr(cd, "item"));
	bool vis = false;
	calldata_get_bool(cd, "visible", &vis);
	const QString name = q(obs_source_get_name(obs_scene_get_source(sc)));
	const double id = double(obs_sceneitem_get_id(it));
	onMain([=] { Json d; d["sceneName"] = name; d["sceneItemId"] = id; d["sceneItemEnabled"] = vis; emitEvent("SceneItemEnableStateChanged", d); });
}
void listChangedCb(void *param, calldata_t *cd)
{
	// Éléments ajoutés, retirés ou réordonnés : le site recharge les sources de la scène.
	obs_scene_t *sc = static_cast<obs_scene_t *>(calldata_ptr(cd, "scene"));
	const QString name = sc ? q(obs_source_get_name(obs_scene_get_source(sc))) : QString();
	const QString ev = q(static_cast<const char *>(param));
	onMain([=] { Json d; d["sceneName"] = name; emitEvent(ev, d); });
}
void renameCb(void *, calldata_t *cd)
{
	const QString from = q(calldata_string(cd, "prev_name")), to = q(calldata_string(cd, "new_name"));
	onMain([=] {
		Json d;
		d["oldName"] = from;
		d["name"] = to;
		emitEvent("SourceRenamed", d);
		QMutexLocker l(&meterLock);
		for (auto &kv : meters) if (kv.second->name == from.toStdString()) kv.second->name = to.toStdString();
	});
}

/** Branche les signaux d'une source (entrée ou scène) et crée son indicateur de niveau si elle a de l'audio. */
void wire(obs_source_t *s)
{
	if (!s) return;
	const auto type = obs_source_get_type(s);
	if (type != OBS_SOURCE_TYPE_INPUT && type != OBS_SOURCE_TYPE_SCENE) return;
	{
		QMutexLocker w(&wiredLock);
		if (wired.contains(s)) return;
		wired.insert(s);
	}
	signal_handler_t *sh = obs_source_get_signal_handler(s);
	if (type == OBS_SOURCE_TYPE_SCENE) {
		signal_handler_connect(sh, "item_visible", itemVisibleCb, nullptr);
		signal_handler_connect(sh, "item_add", listChangedCb, const_cast<char *>("SceneItemCreated"));
		signal_handler_connect(sh, "item_remove", listChangedCb, const_cast<char *>("SceneItemRemoved"));
		signal_handler_connect(sh, "reorder", listChangedCb, const_cast<char *>("SceneItemListIndexingChanged"));
		return;
	}
	signal_handler_connect(sh, "mute", muteCb, nullptr);
	signal_handler_connect(sh, "volume", volumeCb, nullptr);
	signal_handler_connect(sh, "rename", renameCb, nullptr);
	if (hasAudio(s)) {
		auto m = std::make_unique<Meter>();
		m->name = obs_source_get_name(s);
		m->vm = obs_volmeter_create(OBS_FADER_LOG);
		obs_volmeter_add_callback(m->vm, volmeterCb, m.get());
		obs_volmeter_attach_source(m->vm, s);
		QMutexLocker l(&meterLock);
		meters[s] = std::move(m);
	}
}

/** Retire les indicateurs de niveau de la source. Le verrou est relâché avant de détruire l'indicateur : son rappel audio prend le même verrou. */
void unwire(obs_source_t *s)
{
	{
		QMutexLocker w(&wiredLock);
		wired.remove(s);
	}
	std::unique_ptr<Meter> m;
	{
		QMutexLocker l(&meterLock);
		auto it = meters.find(s);
		if (it == meters.end()) return;
		m = std::move(it->second);
		meters.erase(it);
	}
	obs_volmeter_remove_callback(m->vm, volmeterCb, m.get());
	obs_volmeter_destroy(m->vm);
}

bool wireEnum(void *, obs_source_t *s)
{
	wire(s);
	return true;
}
bool wireScene(void *, obs_source_t *s)
{
	wire(s);
	return true;
}

void wireAll()
{
	obs_enum_sources(wireEnum, nullptr);
	obs_enum_scenes(wireScene, nullptr);
}

void sourceCreateCb(void *, calldata_t *cd)
{
	obs_source_t *s = static_cast<obs_source_t *>(calldata_ptr(cd, "source"));
	const auto type = obs_source_get_type(s);
	if (type != OBS_SOURCE_TYPE_INPUT && type != OBS_SOURCE_TYPE_SCENE) return;
	const QString name = q(obs_source_get_name(s));
	const bool scene = type == OBS_SOURCE_TYPE_SCENE;
	const QString kind = q(obs_source_get_id(s));
	onMain([=] {
		if (ready && !collectionBusy) {
			Src src(name);
			if (src.s) wire(src.s);
		}
		Json d;
		d[scene ? "sceneName" : "inputName"] = name;
		d["inputKind"] = kind;
		emitEvent(scene ? "SceneCreated" : "InputCreated", d);
	});
}
void sourceDestroyCb(void *, calldata_t *cd)
{
	obs_source_t *s = static_cast<obs_source_t *>(calldata_ptr(cd, "source"));
	// Nettoyage immédiat (sur le fil appelant) : le pointeur ne doit plus servir après.
	unwire(s);
}

void frontendEvent(enum obs_frontend_event e, void *)
{
	switch (e) {
	case OBS_FRONTEND_EVENT_FINISHED_LOADING:
		ready = true;
		wireAll();
		emitEvent("link.ready", Json{{"obsVersion", q(obs_get_version_string())}});
		break;
	case OBS_FRONTEND_EVENT_SCENE_COLLECTION_CLEANUP:
		collectionBusy = true;
		break;
	case OBS_FRONTEND_EVENT_SCENE_COLLECTION_CHANGED:
		collectionBusy = false;
		if (ready) wireAll();
		emitEvent("CurrentSceneCollectionChanged", Json{{"sceneCollectionName", [] { char *c = obs_frontend_get_current_scene_collection(); const QString s = q(c); bfree(c); return s; }()}});
		break;
	case OBS_FRONTEND_EVENT_PROFILE_CHANGED:
		emitEvent("CurrentProfileChanged", Json{{"profileName", [] { char *c = obs_frontend_get_current_profile(); const QString s = q(c); bfree(c); return s; }()}});
		break;
	case OBS_FRONTEND_EVENT_SCENE_CHANGED:
		emitEvent("CurrentProgramSceneChanged", Json{{"sceneName", currentSceneName(obs_frontend_get_current_scene)}});
		break;
	case OBS_FRONTEND_EVENT_PREVIEW_SCENE_CHANGED:
		if (obs_frontend_preview_program_mode_active()) emitEvent("CurrentPreviewSceneChanged", Json{{"sceneName", currentSceneName(obs_frontend_get_current_preview_scene)}});
		break;
	case OBS_FRONTEND_EVENT_SCENE_LIST_CHANGED:
		emitEvent("SceneListChanged", sceneListJson());
		break;
	case OBS_FRONTEND_EVENT_STUDIO_MODE_ENABLED:
	case OBS_FRONTEND_EVENT_STUDIO_MODE_DISABLED:
		emitEvent("StudioModeStateChanged", Json{{"studioModeEnabled", e == OBS_FRONTEND_EVENT_STUDIO_MODE_ENABLED}});
		break;
	case OBS_FRONTEND_EVENT_STREAMING_STARTING:
	case OBS_FRONTEND_EVENT_STREAMING_STARTED:
	case OBS_FRONTEND_EVENT_STREAMING_STOPPING:
	case OBS_FRONTEND_EVENT_STREAMING_STOPPED: {
		if (e == OBS_FRONTEND_EVENT_STREAMING_STARTED) {
			streamStartNs = os_gettime_ns();
			onMain([] { msMainStarted(); });
		}
		if (e == OBS_FRONTEND_EVENT_STREAMING_STOPPED) onMain([] { msMainStopped(); });
		// Comme obs-websocket : actif dès « démarrage » ; inactif dès « arrêt en cours ».
		const bool active = e == OBS_FRONTEND_EVENT_STREAMING_STARTING || e == OBS_FRONTEND_EVENT_STREAMING_STARTED;
		emitEvent("StreamStateChanged", Json{{"outputActive", active}, {"outputState", e == OBS_FRONTEND_EVENT_STREAMING_STARTING ? "OBS_WEBSOCKET_OUTPUT_STARTING" : e == OBS_FRONTEND_EVENT_STREAMING_STARTED ? "OBS_WEBSOCKET_OUTPUT_STARTED" : e == OBS_FRONTEND_EVENT_STREAMING_STOPPING ? "OBS_WEBSOCKET_OUTPUT_STOPPING" : "OBS_WEBSOCKET_OUTPUT_STOPPED"}});
		break;
	}
	case OBS_FRONTEND_EVENT_RECORDING_STARTING:
	case OBS_FRONTEND_EVENT_RECORDING_STARTED:
	case OBS_FRONTEND_EVENT_RECORDING_STOPPING:
	case OBS_FRONTEND_EVENT_RECORDING_STOPPED:
	case OBS_FRONTEND_EVENT_RECORDING_PAUSED:
	case OBS_FRONTEND_EVENT_RECORDING_UNPAUSED: {
		if (e == OBS_FRONTEND_EVENT_RECORDING_STARTED) recordStartNs = os_gettime_ns();
		const bool active = e == OBS_FRONTEND_EVENT_RECORDING_STARTING || e == OBS_FRONTEND_EVENT_RECORDING_STARTED || e == OBS_FRONTEND_EVENT_RECORDING_PAUSED || e == OBS_FRONTEND_EVENT_RECORDING_UNPAUSED;
		const char *state = e == OBS_FRONTEND_EVENT_RECORDING_STARTING ? "OBS_WEBSOCKET_OUTPUT_STARTING" : e == OBS_FRONTEND_EVENT_RECORDING_STARTED ? "OBS_WEBSOCKET_OUTPUT_STARTED"
				    : e == OBS_FRONTEND_EVENT_RECORDING_STOPPING ? "OBS_WEBSOCKET_OUTPUT_STOPPING" : e == OBS_FRONTEND_EVENT_RECORDING_PAUSED ? "OBS_WEBSOCKET_OUTPUT_PAUSED"
				    : e == OBS_FRONTEND_EVENT_RECORDING_UNPAUSED ? "OBS_WEBSOCKET_OUTPUT_RESUMED" : "OBS_WEBSOCKET_OUTPUT_STOPPED";
		emitEvent("RecordStateChanged", Json{{"outputActive", active}, {"outputState", state}});
		break;
	}
	case OBS_FRONTEND_EVENT_TRANSITION_CHANGED:
		emitEvent("CurrentSceneTransitionChanged", Json{});
		break;
	case OBS_FRONTEND_EVENT_EXIT:
		emitEvent("ExitStarted");
		break;
	default:
		break;
	}
}

void tickMeters()
{
	if (clients.empty()) return;
	QJsonArray arr;
	{
		QMutexLocker l(&meterLock);
		for (auto &kv : meters) {
			Meter &m = *kv.second;
			QJsonArray chans;
			for (int c = 0; c < std::max(1, m.channels); c++) {
				// [magnitude, pic, pic d'entrée] en amplitude (0..1), comme obs-websocket.
				chans.append(QJsonArray{std::pow(10.0, double(m.mag[c]) / 20.0), std::pow(10.0, double(m.peak[c]) / 20.0), std::pow(10.0, double(m.inpeak[c]) / 20.0)});
			}
			Json i;
			i["inputName"] = QString::fromStdString(m.name);
			i["inputLevelsMul"] = chans;
			arr.append(i);
		}
	}
	emitEvent("InputVolumeMeters", Json{{"inputs", arr}});
}

void tickStats()
{
	if (clients.empty() || !ready) return;
	emitEvent("link.stats", statsJson(true));
}

void onNewConnection()
{
	while (QLocalSocket *c = server->nextPendingConnection()) {
		clients.push_back(c);
		auto *buf = new QByteArray;
		QObject::connect(c, &QLocalSocket::readyRead, c, [c, buf] {
			buf->append(c->readAll());
			if (buf->size() > 4 * 1024 * 1024) { c->abort(); return; }
			int nl;
			while ((nl = buf->indexOf('\n')) >= 0) {
				const QByteArray line = buf->left(nl);
				buf->remove(0, nl + 1);
				const QJsonDocument doc = QJsonDocument::fromJson(line);
				if (doc.isObject()) respond(c, doc.object());
			}
		});
		QObject::connect(c, &QLocalSocket::disconnected, c, [c, buf] {
			clients.erase(std::remove(clients.begin(), clients.end(), c), clients.end());
			delete buf;
			c->deleteLater();
		});
		sendLine(c, Json{{"event", "hello"}, {"data", Json{{"obsVersion", q(obs_get_version_string())}, {"ready", ready}}}});
	}
}

} // namespace

bool syxtee_obsctl_start(const char *path)
{
	if (server) return true;
	registerFluxSource(); // le type « Flux SYXTEE » apparaît dans Ajouter une source
	QLocalServer::removeServer(QString::fromUtf8(path));
	server = new QLocalServer;
	server->setSocketOptions(QLocalServer::UserAccessOption); // lisible et écrivable par l'utilisateur seul
	if (!server->listen(QString::fromUtf8(path))) {
		blog(LOG_WARNING, "[syxtee-link] socket de pilotage impossible : %s", server->errorString().toUtf8().constData());
		delete server.data();
		return false;
	}
	QObject::connect(server, &QLocalServer::newConnection, server, [] { onNewConnection(); });
	cpuInfo = os_cpu_usage_info_start();
	obs_frontend_add_event_callback(frontendEvent, nullptr);
	signal_handler_t *g = obs_get_signal_handler();
	signal_handler_connect(g, "source_create", sourceCreateCb, nullptr);
	signal_handler_connect(g, "source_destroy", sourceDestroyCb, nullptr);
	meterTimer = new QTimer(server);
	QObject::connect(meterTimer, &QTimer::timeout, meterTimer, [] { tickMeters(); });
	meterTimer->start(50);
	statsTimer = new QTimer(server);
	QObject::connect(statsTimer, &QTimer::timeout, statsTimer, [] { tickStats(); });
	statsTimer->start(1000);
	blog(LOG_INFO, "[syxtee-link] pilotage d'OBS en interne (socket %s)", path);
	return true;
}

void syxtee_obsctl_stop()
{
	if (!server) return;
	stopWhip();
	msShutdown();
	obs_frontend_remove_event_callback(frontendEvent, nullptr);
	signal_handler_t *g = obs_get_signal_handler();
	signal_handler_disconnect(g, "source_create", sourceCreateCb, nullptr);
	signal_handler_disconnect(g, "source_destroy", sourceDestroyCb, nullptr);
	std::map<obs_source_t *, std::unique_ptr<Meter>> old;
	{
		QMutexLocker l(&meterLock);
		old.swap(meters);
	}
	for (auto &kv : old) {
		obs_volmeter_remove_callback(kv.second->vm, volmeterCb, kv.second.get());
		obs_volmeter_destroy(kv.second->vm);
	}
	for (auto *c : clients) c->abort();
	clients.clear();
	if (cpuInfo) os_cpu_usage_info_destroy(cpuInfo);
	cpuInfo = nullptr;
	delete server.data();
	if (shot.tr || shot.ss) {
		obs_enter_graphics();
		if (shot.tr) gs_texrender_destroy(shot.tr);
		if (shot.ss) gs_stagesurface_destroy(shot.ss);
		obs_leave_graphics();
		shot = {};
	}
}
