// Faux libobs / obs-frontend-api en mémoire, pour essayer obsctl.cpp (le vrai code du plugin) sans lancer OBS.
// Il ne contient que ce qu'obsctl.cpp appelle. Le comportement réel d'OBS (rendu, volmètres, sorties) n'est PAS vérifié par ce faux.
#include <obs-frontend-api.h>
#include <obs-module.h>
#include <obs-audio-controls.h>
#include <util/platform.h>

#include <QJsonDocument>
#include <QJsonObject>
#include <algorithm>
#include <chrono>
#include <cstdarg>
#include <cstring>
#include <map>
#include <string>
#include <vector>

#include "obs-stub.h"

// ───── Modèle ─────
struct signal_handler {
	std::map<std::string, std::vector<std::pair<signal_callback_t, void *>>> cbs;
};
struct obs_data {
	QJsonObject j;
	QByteArray json;
};
struct obs_source {
	std::string name, id;
	obs_source_type type = OBS_SOURCE_TYPE_INPUT;
	uint32_t flags = 0;
	bool muted = false;
	float vol = 1.0f;
	obs_monitoring_type mon = OBS_MONITORING_TYPE_NONE;
	int refs = 1;
	signal_handler sh;
	std::vector<struct obs_scene_item *> items;
	QJsonObject settings;
};
struct obs_scene_item {
	int64_t id;
	obs_source *src;
	bool vis = true;
};
struct obs_volmeter {
	obs_source *src = nullptr;
	obs_volmeter_updated_t cb = nullptr;
	void *param = nullptr;
};
struct obs_output {
	bool active = false;
	uint64_t bytes = 0;
	bool whip = false;
	signal_handler sh;
	obs_source *dummy = nullptr;
};
struct obs_encoder {
	std::string id;
	bool owned = false;
	uint32_t w = 0, h = 0, divisor = 1;
	QJsonObject settings;
};
struct obs_service {
	std::string id;
	QJsonObject settings;
};

namespace {
std::vector<obs_source *> all;
signal_handler globalSh;
std::vector<std::pair<obs_frontend_event_cb, void *>> feCbs;
obs_source *curScene = nullptr, *prevScene = nullptr;
bool studio = false, streaming = false, recording = false, paused = false;
std::string profile = "Sans titre", collection = "Collection A";
std::vector<std::string> profiles{"Sans titre", "Mobile 4G"}, collections{"Collection A", "Collection B"};
std::vector<obs_source *> transitions;
obs_source *curTrans = nullptr;
std::vector<obs_volmeter *> meters;
obs_output streamOut, recOut;
obs_encoder enc;
int64_t nextItemId = 1;
bool whipAvailable = true, whipFails = false;
QJsonObject whipLog;
obs_output *whipOut = nullptr;
}

static void fire(signal_handler *h, const char *sig, calldata_t *cd)
{
	auto it = h->cbs.find(sig);
	if (it == h->cbs.end()) return;
	auto copy = it->second;
	for (auto &c : copy) c.first(c.second, cd);
}

// ───── Contrôle (utilisé par le programme de test) ─────
obs_source_t *stub_make(const char *name, const char *id, obs_source_type type, uint32_t flags)
{
	auto *s = new obs_source;
	s->name = name;
	s->id = id;
	s->type = type;
	s->flags = flags;
	all.push_back(s);
	return s;
}
obs_source_t *stub_scene(const char *name)
{
	obs_source_t *s = stub_make(name, "scene", OBS_SOURCE_TYPE_SCENE, OBS_SOURCE_VIDEO);
	calldata_t cd;
	calldata_init(&cd);
	calldata_set_ptr(&cd, "source", s);
	fire(&globalSh, "source_create", &cd);
	calldata_free(&cd);
	if (!curScene) curScene = s;
	return s;
}
obs_source_t *stub_input(const char *name, const char *id, uint32_t flags)
{
	obs_source_t *s = stub_make(name, id, OBS_SOURCE_TYPE_INPUT, flags);
	calldata_t cd;
	calldata_init(&cd);
	calldata_set_ptr(&cd, "source", s);
	fire(&globalSh, "source_create", &cd);
	calldata_free(&cd);
	return s;
}
int64_t stub_add_item(obs_source_t *scene, obs_source_t *src)
{
	auto *it = new obs_scene_item{nextItemId++, src};
	scene->items.push_back(it);
	return it->id;
}
void stub_boot()
{
	transitions.push_back(stub_make("Fondu", "fade_transition", OBS_SOURCE_TYPE_TRANSITION, 0));
	transitions.push_back(stub_make("Coupure", "cut_transition", OBS_SOURCE_TYPE_TRANSITION, 0));
	curTrans = transitions[0];
}
void stub_fe(obs_frontend_event e)
{
	auto copy = feCbs;
	for (auto &c : copy) c.first(e, c.second);
}
void stub_set_scene(const char *name)
{
	for (auto *s : all)
		if (s->type == OBS_SOURCE_TYPE_SCENE && s->name == name) curScene = s;
	stub_fe(OBS_FRONTEND_EVENT_SCENE_CHANGED);
}
void stub_mute(const char *name, bool m)
{
	for (auto *s : all)
		if (s->name == name) {
			s->muted = m;
			calldata_t cd;
			calldata_init(&cd);
			calldata_set_ptr(&cd, "source", s);
			calldata_set_bool(&cd, "muted", m);
			fire(&s->sh, "mute", &cd);
			calldata_free(&cd);
		}
}
void stub_vol(const char *name, double v)
{
	for (auto *s : all)
		if (s->name == name) {
			s->vol = float(v);
			calldata_t cd;
			calldata_init(&cd);
			calldata_set_ptr(&cd, "source", s);
			calldata_set_float(&cd, "volume", v);
			fire(&s->sh, "volume", &cd);
			calldata_free(&cd);
		}
}
void stub_rename(const char *from_, const char *to_)
{
	const std::string from = from_, to = to_; // copies : `from_` peut pointer sur le nom qu'on va remplacer
	for (auto *s : all)
		if (s->name == from) {
			s->name = to;
			calldata_t cd;
			calldata_init(&cd);
			calldata_set_ptr(&cd, "source", s);
			calldata_set_string(&cd, "new_name", to.c_str());
			calldata_set_string(&cd, "prev_name", from.c_str());
			fire(&s->sh, "rename", &cd);
			calldata_free(&cd);
		}
}
void stub_stream(bool on)
{
	if (on) {
		stub_fe(OBS_FRONTEND_EVENT_STREAMING_STARTING);
		streaming = true;
		streamOut.active = true;
		streamOut.bytes = 0;
		stub_fe(OBS_FRONTEND_EVENT_STREAMING_STARTED);
	} else {
		stub_fe(OBS_FRONTEND_EVENT_STREAMING_STOPPING);
		streaming = false;
		streamOut.active = false;
		stub_fe(OBS_FRONTEND_EVENT_STREAMING_STOPPED);
	}
}
void stub_add_bytes(uint64_t b) { streamOut.bytes += b; }
void stub_meter(const char *name, float mag)
{
	for (auto *m : meters)
		if (m->src && m->src->name == name && m->cb) {
			float a[MAX_AUDIO_CHANNELS] = {mag, mag, 0, 0, 0, 0, 0, 0};
			m->cb(m->param, a, a, a);
		}
}
bool stub_streaming() { return streaming; }
bool stub_recording() { return recording; }
bool stub_paused() { return paused; }
std::string stub_scene_collection() { return collection; }
std::string stub_profile() { return profile; }
bool stub_item_visible(const char *scene, int64_t id)
{
	for (auto *s : all)
		if (s->name == scene)
			for (auto *i : s->items)
				if (i->id == id) return i->vis;
	return false;
}
int stub_item_count(const char *scene)
{
	for (auto *s : all)
		if (s->name == scene) return int(s->items.size());
	return -1;
}
std::string stub_setting(const char *input, const char *key)
{
	for (auto *s : all)
		if (s->name == input) return s->settings.value(key).toVariant().toString().toStdString();
	return "<absent>";
}

// ───── calldata ─────
bool calldata_get_data(const calldata_t *data, const char *name, void *out, size_t size)
{
	const uint8_t *p = data->stack;
	size_t left = data->size;
	while (left >= sizeof(size_t)) {
		size_t nl;
		memcpy(&nl, p, sizeof(nl));
		const uint8_t *n = p + sizeof(nl);
		size_t dl;
		memcpy(&dl, n + nl, sizeof(dl));
		const uint8_t *d = n + nl + sizeof(dl);
		if (nl == strlen(name) + 1 && !memcmp(n, name, nl)) {
			if (dl != size) return false;
			memcpy(out, d, size);
			return true;
		}
		const size_t step = sizeof(nl) + nl + sizeof(dl) + dl;
		p += step;
		left -= step;
	}
	return false;
}
bool calldata_get_string(const calldata_t *data, const char *name, const char **str)
{
	const uint8_t *p = data->stack;
	size_t left = data->size;
	while (left >= sizeof(size_t)) {
		size_t nl;
		memcpy(&nl, p, sizeof(nl));
		const uint8_t *n = p + sizeof(nl);
		size_t dl;
		memcpy(&dl, n + nl, sizeof(dl));
		const uint8_t *d = n + nl + sizeof(dl);
		if (nl == strlen(name) + 1 && !memcmp(n, name, nl)) {
			*str = reinterpret_cast<const char *>(d);
			return true;
		}
		const size_t step = sizeof(nl) + nl + sizeof(dl) + dl;
		p += step;
		left -= step;
	}
	*str = nullptr;
	return false;
}
void calldata_set_data(calldata_t *data, const char *name, const void *in, size_t new_size)
{
	const size_t nl = strlen(name) + 1, add = sizeof(size_t) + nl + sizeof(size_t) + new_size;
	if (data->size + add > data->capacity) {
		data->capacity = std::max(data->capacity * 2, data->size + add + 64);
		data->stack = static_cast<uint8_t *>(realloc(data->stack, data->capacity));
	}
	uint8_t *p = data->stack + data->size;
	memcpy(p, &nl, sizeof(nl));
	memcpy(p + sizeof(nl), name, nl);
	memcpy(p + sizeof(nl) + nl, &new_size, sizeof(new_size));
	memcpy(p + sizeof(nl) + nl + sizeof(new_size), in, new_size);
	data->size += add;
}

// ───── Signaux ─────
void signal_handler_connect(signal_handler_t *h, const char *sig, signal_callback_t cb, void *param) { h->cbs[sig].push_back({cb, param}); }
void signal_handler_disconnect(signal_handler_t *h, const char *sig, signal_callback_t cb, void *param)
{
	auto &v = h->cbs[sig];
	v.erase(std::remove(v.begin(), v.end(), std::make_pair(cb, param)), v.end());
}
signal_handler_t *obs_get_signal_handler(void) { return &globalSh; }
signal_handler_t *obs_source_get_signal_handler(const obs_source_t *s) { return const_cast<signal_handler_t *>(&s->sh); }

// ───── Divers libobs ─────
void blog(int, const char *, ...) {}
void bfree(void *p) { free(p); }
void *bmalloc(size_t n) { return malloc(n); }
void *brealloc(void *p, size_t n) { return realloc(p, n); }
uint64_t os_gettime_ns(void) { return uint64_t(std::chrono::duration_cast<std::chrono::nanoseconds>(std::chrono::steady_clock::now().time_since_epoch()).count()); }
os_cpu_usage_info_t *os_cpu_usage_info_start(void) { return reinterpret_cast<os_cpu_usage_info_t *>(new int(0)); }
double os_cpu_usage_info_query(os_cpu_usage_info_t *) { return 12.5; }
void os_cpu_usage_info_destroy(os_cpu_usage_info_t *i) { delete reinterpret_cast<int *>(i); }
uint64_t os_get_proc_resident_size(void) { return 512ull * 1024 * 1024; }
const char *obs_get_version_string(void) { return "32.2.2-stub"; }
double obs_get_active_fps(void) { return 60.0; }
uint64_t obs_get_average_frame_time_ns(void) { return 3000000; }
uint32_t obs_get_lagged_frames(void) { return 2; }
uint32_t obs_get_total_frames(void) { return 1000; }
bool obs_get_video_info(struct obs_video_info *v)
{
	memset(v, 0, sizeof(*v));
	v->base_width = 1920;
	v->base_height = 1080;
	v->output_width = 1280;
	v->output_height = 720;
	v->fps_num = 60;
	v->fps_den = 1;
	return true;
}
void obs_enter_graphics(void) {}
void obs_leave_graphics(void) {}

// obs_data
obs_data_t *obs_data_create_from_json(const char *j)
{
	auto *d = new obs_data;
	d->j = QJsonDocument::fromJson(QByteArray(j)).object();
	return d;
}
const char *obs_data_get_json(obs_data_t *d)
{
	d->json = QJsonDocument(d->j).toJson(QJsonDocument::Compact);
	return d->json.constData();
}
long long obs_data_get_int(obs_data_t *d, const char *k) { return static_cast<long long>(d->j.value(k).toDouble()); }
void obs_data_release(obs_data_t *d) { delete d; }

// ───── Sources ─────
obs_source_t *obs_get_source_by_name(const char *name)
{
	for (auto *s : all)
		if (s->name == name) {
			s->refs++;
			return s;
		}
	return nullptr;
}
void obs_source_release(obs_source_t *s) { s->refs--; }
const char *obs_source_get_name(const obs_source_t *s) { return s->name.c_str(); }
const char *obs_source_get_id(const obs_source_t *s) { return s->id.c_str(); }
enum obs_source_type obs_source_get_type(const obs_source_t *s) { return s->type; }
uint32_t obs_source_get_output_flags(const obs_source_t *s) { return s->flags; }
bool obs_source_muted(const obs_source_t *s) { return s->muted; }
void obs_source_set_muted(obs_source_t *s, bool m) { stub_mute(s->name.c_str(), m); }
float obs_source_get_volume(const obs_source_t *s) { return s->vol; }
void obs_source_set_volume(obs_source_t *s, float v) { stub_vol(s->name.c_str(), double(v)); }
enum obs_monitoring_type obs_source_get_monitoring_type(const obs_source_t *s) { return s->mon; }
void obs_source_set_monitoring_type(obs_source_t *s, enum obs_monitoring_type t) { s->mon = t; }
void obs_source_set_name(obs_source_t *s, const char *n) { stub_rename(s->name.c_str(), n); }
uint32_t obs_source_get_base_width(obs_source_t *) { return 1920; }
uint32_t obs_source_get_base_height(obs_source_t *) { return 1080; }
void obs_source_inc_showing(obs_source_t *) {}
void obs_source_dec_showing(obs_source_t *) {}
void obs_source_video_render(obs_source_t *) {}
enum obs_media_state obs_source_media_get_state(obs_source_t *) { return OBS_MEDIA_STATE_PLAYING; }
int64_t obs_source_media_get_duration(obs_source_t *) { return 60000; }
int64_t obs_source_media_get_time(obs_source_t *) { return 1500; }
void obs_source_update(obs_source_t *s, obs_data_t *d)
{
	for (auto it = d->j.begin(); it != d->j.end(); ++it) s->settings[it.key()] = it.value();
}
void obs_source_reset_settings(obs_source_t *s, obs_data_t *d) { s->settings = d->j; }
obs_source_t *obs_source_create(const char *id, const char *name, obs_data_t *settings, obs_data_t *)
{
	obs_source_t *s = stub_input(name, id, OBS_SOURCE_VIDEO);
	s->refs = 2;
	if (settings) s->settings = settings->j;
	return s;
}
void obs_enum_sources(bool (*cb)(void *, obs_source_t *), void *param)
{
	auto copy = all;
	for (auto *s : copy)
		if (s->type == OBS_SOURCE_TYPE_INPUT && !cb(param, s)) break;
}
void obs_enum_scenes(bool (*cb)(void *, obs_source_t *), void *param)
{
	auto copy = all;
	for (auto *s : copy)
		if (s->type == OBS_SOURCE_TYPE_SCENE && !cb(param, s)) break;
}

// ───── Scènes ─────
obs_scene_t *obs_scene_from_source(const obs_source_t *s) { return s && s->type == OBS_SOURCE_TYPE_SCENE ? reinterpret_cast<obs_scene_t *>(const_cast<obs_source_t *>(s)) : nullptr; }
obs_source_t *obs_scene_get_source(const obs_scene_t *sc) { return reinterpret_cast<obs_source_t *>(const_cast<obs_scene_t *>(sc)); }
void obs_scene_enum_items(obs_scene_t *sc, bool (*cb)(obs_scene_t *, obs_sceneitem_t *, void *), void *param)
{
	for (auto *it : reinterpret_cast<obs_source_t *>(sc)->items)
		if (!cb(sc, it, param)) break;
}
obs_sceneitem_t *obs_scene_find_sceneitem_by_id(obs_scene_t *sc, int64_t id)
{
	for (auto *it : reinterpret_cast<obs_source_t *>(sc)->items)
		if (it->id == id) return it;
	return nullptr;
}
obs_sceneitem_t *obs_scene_add(obs_scene_t *sc, obs_source_t *src)
{
	auto *scene = reinterpret_cast<obs_source_t *>(sc);
	stub_add_item(scene, src);
	calldata_t cd;
	calldata_init(&cd);
	calldata_set_ptr(&cd, "scene", sc);
	calldata_set_ptr(&cd, "item", scene->items.back());
	fire(&scene->sh, "item_add", &cd);
	calldata_free(&cd);
	return scene->items.back();
}
int64_t obs_sceneitem_get_id(const obs_sceneitem_t *i) { return i->id; }
obs_source_t *obs_sceneitem_get_source(const obs_sceneitem_t *i) { return i->src; }
bool obs_sceneitem_visible(const obs_sceneitem_t *i) { return i->vis; }
bool obs_sceneitem_is_group(obs_sceneitem_t *) { return false; }
bool obs_sceneitem_set_visible(obs_sceneitem_t *i, bool v)
{
	i->vis = v;
	for (auto *s : all)
		for (auto *x : s->items)
			if (x == i) {
				calldata_t cd;
				calldata_init(&cd);
				calldata_set_ptr(&cd, "scene", reinterpret_cast<obs_scene_t *>(s));
				calldata_set_ptr(&cd, "item", i);
				calldata_set_bool(&cd, "visible", v);
				fire(&s->sh, "item_visible", &cd);
				calldata_free(&cd);
			}
	return true;
}

// ───── Volmètres ─────
obs_volmeter_t *obs_volmeter_create(enum obs_fader_type)
{
	auto *m = new obs_volmeter;
	meters.push_back(m);
	return m;
}
bool obs_volmeter_attach_source(obs_volmeter_t *m, obs_source_t *s)
{
	m->src = s;
	return true;
}
void obs_volmeter_add_callback(obs_volmeter_t *m, obs_volmeter_updated_t cb, void *param)
{
	m->cb = cb;
	m->param = param;
}
void obs_volmeter_remove_callback(obs_volmeter_t *m, obs_volmeter_updated_t, void *) { m->cb = nullptr; }
void obs_volmeter_destroy(obs_volmeter_t *m)
{
	meters.erase(std::remove(meters.begin(), meters.end(), m), meters.end());
	delete m;
}
int obs_volmeter_get_nr_channels(obs_volmeter_t *) { return 2; }

// ───── Sorties ─────
obs_output_t *obs_frontend_get_streaming_output(void) { return streaming ? &streamOut : nullptr; }
obs_output_t *obs_frontend_get_recording_output(void) { return recording ? &recOut : nullptr; }
bool obs_output_reconnecting(const obs_output_t *) { return false; }
float obs_output_get_congestion(obs_output_t *) { return 0.1f; }
uint64_t obs_output_get_total_bytes(const obs_output_t *o) { return o->bytes; }
int obs_output_get_frames_dropped(const obs_output_t *) { return 3; }
int obs_output_get_total_frames(const obs_output_t *) { return 500; }
obs_encoder_t *obs_output_get_video_encoder(const obs_output_t *) { return &enc; }
void obs_output_release(obs_output_t *o)
{
	if (o && o->whip) {
		if (whipOut == o) whipOut = nullptr;
		delete o;
	}
}
const char *obs_encoder_get_id(const obs_encoder_t *) { return "stub_encoder"; }
const char *obs_encoder_get_display_name(const char *) { return "Encodeur matériel (stub)"; }
obs_data_t *obs_encoder_get_settings(const obs_encoder_t *)
{
	auto *d = new obs_data;
	d->j["bitrate"] = 6000;
	return d;
}

// ───── Graphique (pas de GPU : une image dégradée) ─────
gs_texrender_t *gs_texrender_create(enum gs_color_format, enum gs_zstencil_format) { return reinterpret_cast<gs_texrender_t *>(new int(1)); }
void gs_texrender_destroy(gs_texrender_t *t) { delete reinterpret_cast<int *>(t); }
bool gs_texrender_begin(gs_texrender_t *, uint32_t, uint32_t) { return true; }
void gs_texrender_end(gs_texrender_t *) {}
void gs_texrender_reset(gs_texrender_t *) {}
gs_texture_t *gs_texrender_get_texture(const gs_texrender_t *) { return nullptr; }
void gs_clear(uint32_t, const struct vec4 *, float, uint8_t) {}
void gs_ortho(float, float, float, float, float, float) {}
void gs_blend_state_push(void) {}
void gs_blend_state_pop(void) {}
void gs_blend_function(enum gs_blend_type, enum gs_blend_type) {}
static std::vector<uint8_t> shotBuf;
static uint32_t shotW = 0;
gs_stagesurf_t *gs_stagesurface_create(uint32_t w, uint32_t h, enum gs_color_format)
{
	shotW = w;
	shotBuf.assign(size_t(w) * h * 4, 0);
	for (uint32_t y = 0; y < h; y++)
		for (uint32_t x = 0; x < w; x++) {
			uint8_t *p = &shotBuf[(size_t(y) * w + x) * 4];
			p[0] = uint8_t(x * 255 / w);
			p[1] = uint8_t(y * 255 / h);
			p[2] = 128;
			p[3] = 255;
		}
	return reinterpret_cast<gs_stagesurf_t *>(&shotBuf);
}
void gs_stagesurface_destroy(gs_stagesurf_t *) {}
void gs_stage_texture(gs_stagesurf_t *, gs_texture_t *) {}
bool gs_stagesurface_map(gs_stagesurf_t *, uint8_t **data, uint32_t *linesize)
{
	*data = shotBuf.data();
	*linesize = shotW * 4;
	return true;
}
void gs_stagesurface_unmap(gs_stagesurf_t *) {}

// ───── obs-frontend-api ─────
void obs_frontend_add_event_callback(obs_frontend_event_cb cb, void *p) { feCbs.push_back({cb, p}); }
void obs_frontend_remove_event_callback(obs_frontend_event_cb cb, void *p) { feCbs.erase(std::remove(feCbs.begin(), feCbs.end(), std::make_pair(cb, p)), feCbs.end()); }
static void listScenes(struct obs_frontend_source_list *l, obs_source_type type, const std::vector<obs_source *> &from)
{
	for (auto *s : from)
		if (s->type == type) {
			s->refs++;
			da_push_back(l->sources, &s);
		}
}
void obs_frontend_get_scenes(struct obs_frontend_source_list *l) { listScenes(l, OBS_SOURCE_TYPE_SCENE, all); }
void obs_frontend_get_transitions(struct obs_frontend_source_list *l) { listScenes(l, OBS_SOURCE_TYPE_TRANSITION, transitions); }
obs_source_t *obs_frontend_get_current_scene(void)
{
	if (curScene) curScene->refs++;
	return curScene;
}
obs_source_t *obs_frontend_get_current_preview_scene(void)
{
	obs_source_t *s = prevScene ? prevScene : curScene;
	if (s) s->refs++;
	return s;
}
void obs_frontend_set_current_scene(obs_source_t *s)
{
	curScene = s;
	stub_fe(OBS_FRONTEND_EVENT_SCENE_CHANGED);
}
void obs_frontend_set_current_preview_scene(obs_source_t *s)
{
	prevScene = s;
	stub_fe(OBS_FRONTEND_EVENT_PREVIEW_SCENE_CHANGED);
}
bool obs_frontend_preview_program_mode_active(void) { return studio; }
void obs_frontend_set_preview_program_mode(bool on)
{
	studio = on;
	stub_fe(on ? OBS_FRONTEND_EVENT_STUDIO_MODE_ENABLED : OBS_FRONTEND_EVENT_STUDIO_MODE_DISABLED);
}
void obs_frontend_preview_program_trigger_transition(void)
{
	if (prevScene) {
		curScene = prevScene;
		stub_fe(OBS_FRONTEND_EVENT_SCENE_CHANGED);
	}
}
obs_source_t *obs_frontend_get_current_transition(void)
{
	if (curTrans) curTrans->refs++;
	return curTrans;
}
void obs_frontend_set_current_transition(obs_source_t *t) { curTrans = t; }
int obs_frontend_get_transition_duration(void) { return 300; }
static char **strList(const std::vector<std::string> &v)
{
	char **out = static_cast<char **>(malloc(sizeof(char *) * (v.size() + 1)));
	for (size_t i = 0; i < v.size(); i++) out[i] = strdup(v[i].c_str());
	out[v.size()] = nullptr;
	return out;
}
char **obs_frontend_get_profiles(void) { return strList(profiles); }
char *obs_frontend_get_current_profile(void) { return strdup(profile.c_str()); }
void obs_frontend_set_current_profile(const char *p)
{
	profile = p;
	stub_fe(OBS_FRONTEND_EVENT_PROFILE_CHANGED);
}
char **obs_frontend_get_scene_collections(void) { return strList(collections); }
char *obs_frontend_get_current_scene_collection(void) { return strdup(collection.c_str()); }
void obs_frontend_set_current_scene_collection(const char *c)
{
	collection = c;
	stub_fe(OBS_FRONTEND_EVENT_SCENE_COLLECTION_CLEANUP);
	stub_fe(OBS_FRONTEND_EVENT_SCENE_COLLECTION_CHANGED);
}
void obs_frontend_streaming_start(void) { stub_stream(true); }
void obs_frontend_streaming_stop(void) { stub_stream(false); }
bool obs_frontend_streaming_active(void) { return streaming; }
void obs_frontend_recording_start(void)
{
	stub_fe(OBS_FRONTEND_EVENT_RECORDING_STARTING);
	recording = true;
	stub_fe(OBS_FRONTEND_EVENT_RECORDING_STARTED);
}
void obs_frontend_recording_stop(void)
{
	stub_fe(OBS_FRONTEND_EVENT_RECORDING_STOPPING);
	recording = false;
	stub_fe(OBS_FRONTEND_EVENT_RECORDING_STOPPED);
}
bool obs_frontend_recording_active(void) { return recording; }
void obs_frontend_recording_pause(bool p)
{
	paused = p;
	stub_fe(p ? OBS_FRONTEND_EVENT_RECORDING_PAUSED : OBS_FRONTEND_EVENT_RECORDING_UNPAUSED);
}
bool obs_frontend_recording_paused(void) { return paused; }

// ───── Aperçu WHIP : encodeurs, service, sortie ─────
void stub_whip_available(bool on) { whipAvailable = on; }
void stub_whip_fails(bool on) { whipFails = on; }
std::string stub_whip_info() { return QJsonDocument(whipLog).toJson(QJsonDocument::Compact).toStdString(); }
void stub_whip_drop(const char *error)
{
	// L'envoi s'interrompt côté OBS (réseau, serveur) : signal « stop » avec un code d'erreur.
	if (!whipOut) return;
	whipOut->active = false;
	calldata_t cd;
	calldata_init(&cd);
	calldata_set_ptr(&cd, "output", whipOut);
	calldata_set_int(&cd, "code", -3);
	whipLog["lastError"] = error;
	fire(&whipOut->sh, "stop", &cd);
	calldata_free(&cd);
}

static const std::vector<std::pair<std::string, std::string>> ENCODERS = {
	{"obs_x264", "h264"}, {"com.apple.videotoolbox.videoencoder.ave.hevc", "hevc"}, {"com.apple.videotoolbox.videoencoder.ave.avc", "h264"}, {"ffmpeg_opus", "opus"}, {"ffmpeg_aac", "aac"},
};
bool obs_enum_encoder_types(size_t idx, const char **id)
{
	if (idx >= ENCODERS.size()) return false;
	*id = ENCODERS[idx].first.c_str();
	return true;
}
enum obs_encoder_type obs_get_encoder_type(const char *id) { return std::string(id) == "ffmpeg_opus" || std::string(id) == "ffmpeg_aac" ? OBS_ENCODER_AUDIO : OBS_ENCODER_VIDEO; }
const char *obs_get_encoder_codec(const char *id)
{
	for (auto &e : ENCODERS)
		if (e.first == id) return e.second.c_str();
	return nullptr;
}
uint32_t obs_get_encoder_caps(const char *) { return 0; }
obs_service_t *obs_service_create(const char *id, const char *, obs_data_t *settings, obs_data_t *)
{
	if (!whipAvailable) return nullptr;
	auto *sv = new obs_service{id, settings ? settings->j : QJsonObject()};
	whipLog["serviceKind"] = id;
	whipLog["server"] = sv->settings.value("server");
	return sv;
}
void obs_service_release(obs_service_t *sv) { delete sv; }
obs_output_t *obs_output_create(const char *id, const char *, obs_data_t *, obs_data_t *)
{
	if (!whipAvailable) return nullptr;
	auto *o = new obs_output;
	o->whip = std::string(id) == "whip_output";
	whipOut = o;
	whipLog["outputKind"] = id;
	return o;
}
obs_encoder_t *obs_video_encoder_create(const char *id, const char *, obs_data_t *settings, obs_data_t *)
{
	auto *e = new obs_encoder{id, true, 0, 0, 1, settings ? settings->j : QJsonObject()};
	whipLog["videoEncoder"] = id;
	whipLog["videoSettings"] = e->settings;
	return e;
}
obs_encoder_t *obs_audio_encoder_create(const char *id, const char *, obs_data_t *settings, size_t, obs_data_t *)
{
	auto *e = new obs_encoder{id, true, 0, 0, 1, settings ? settings->j : QJsonObject()};
	whipLog["audioEncoder"] = id;
	whipLog["audioSettings"] = e->settings;
	return e;
}
void obs_encoder_set_video(obs_encoder_t *, video_t *) {}
void obs_encoder_set_audio(obs_encoder_t *, audio_t *) {}
video_t *obs_get_video(void) { return nullptr; }
audio_t *obs_get_audio(void) { return nullptr; }
void obs_encoder_set_scaled_size(obs_encoder_t *e, uint32_t w, uint32_t h)
{
	e->w = w;
	e->h = h;
	whipLog["width"] = int(w);
	whipLog["height"] = int(h);
}
bool obs_encoder_set_frame_rate_divisor(obs_encoder_t *e, uint32_t d)
{
	e->divisor = d;
	whipLog["divisor"] = int(d);
	return true;
}
void obs_encoder_release(obs_encoder_t *e)
{
	if (e && e->owned) delete e;
}
void obs_output_set_video_encoder(obs_output_t *, obs_encoder_t *) {}
void obs_output_set_audio_encoder(obs_output_t *, obs_encoder_t *, size_t) {}
void obs_output_set_service(obs_output_t *, obs_service_t *) {}
void obs_output_set_reconnect_settings(obs_output_t *, int, int) {}
signal_handler_t *obs_output_get_signal_handler(const obs_output_t *o) { return const_cast<signal_handler_t *>(&o->sh); }
bool obs_output_start(obs_output_t *o)
{
	whipLog["started"] = !whipFails;
	if (whipFails) return false;
	o->active = true;
	calldata_t cd;
	calldata_init(&cd);
	calldata_set_ptr(&cd, "output", o);
	fire(&o->sh, "start", &cd);
	calldata_free(&cd);
	return true;
}
void obs_output_stop(obs_output_t *o)
{
	if (!o->whip) return;
	whipLog["stopped"] = true;
	o->active = false;
}
const char *obs_output_get_last_error(obs_output_t *)
{
	static QByteArray err;
	err = whipFails ? QByteArray("HTTP 401") : whipLog.value("lastError").toString().toUtf8();
	return err.constData();
}
bool obs_output_active(const obs_output_t *o) { return o->active; }
obs_data_t *obs_data_create() { return new obs_data; }
void obs_data_set_string(obs_data_t *d, const char *k, const char *v) { d->j[k] = v; }
void obs_data_set_int(obs_data_t *d, const char *k, long long v) { d->j[k] = double(v); }
void obs_data_set_bool(obs_data_t *d, const char *k, bool v) { d->j[k] = v; }
