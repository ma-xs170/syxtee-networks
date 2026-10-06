// Programme d'essai : le vrai obsctl.cpp branché sur un faux OBS (obs-stub.cpp), piloté par des commandes sur l'entrée standard.
//   obsctl-host <chemin-du-socket>
// Commandes : loaded | scene NOM | mute NOM 0/1 | vol NOM MUL | rename DE VERS | stream on/off | bytes N | meter NOM MAG
//             state (affiche l'état du faux OBS en JSON) | quit
#include <QCoreApplication>
#include <QJsonDocument>
#include <QJsonObject>
#include <QSocketNotifier>
#include <QTextStream>
#include <cstdio>
#include <unistd.h>

#include "../obsctl.h"
#include "obs-stub.h"

int main(int argc, char **argv)
{
	QCoreApplication app(argc, argv);
	setvbuf(stdout, nullptr, _IOLBF, 0);
	if (argc < 2) return 2;

	stub_boot();
	obs_source_t *wait = stub_scene("⏳ › ON COMMENCE BIENTÔT");
	obs_source_t *live = stub_scene("🔴 › EN DIRECT");
	obs_source_t *drone = stub_scene("🎥 › DRONE");
	obs_source_t *lost = stub_scene("📶 › CONNEXION PERDUE");
	obs_source_t *mic = stub_input("Micro", "coreaudio_input_capture", OBS_SOURCE_AUDIO);
	obs_source_t *cam = stub_input("Flux › IPHONE 16", "ffmpeg_source", OBS_SOURCE_VIDEO | OBS_SOURCE_AUDIO);
	obs_source_t *txt = stub_input("Texte", "text_ft2_source", OBS_SOURCE_VIDEO);
	stub_add_item(live, cam);
	stub_add_item(live, mic);
	stub_add_item(live, txt);
	stub_add_item(drone, cam);
	stub_add_item(lost, txt);
	(void)wait;

	if (!syxtee_obsctl_start(argv[1])) return 3;
	printf("READY\n");
	fflush(stdout);

	QSocketNotifier in(STDIN_FILENO, QSocketNotifier::Read);
	QObject::connect(&in, &QSocketNotifier::activated, [&] {
		char buf[1024];
		const ssize_t n = read(STDIN_FILENO, buf, sizeof(buf) - 1);
		if (n <= 0) return QCoreApplication::quit();
		buf[n] = 0;
		for (const QString &line : QString::fromUtf8(buf).split('\n', Qt::SkipEmptyParts)) {
			const QStringList a = line.trimmed().split(' ', Qt::SkipEmptyParts);
			if (a.isEmpty()) continue;
			const QByteArray a1 = a.value(1).toUtf8(), a2 = a.value(2).toUtf8();
			// Les noms contenant des espaces : tout ce qui suit la commande.
			const QByteArray rest = line.section(' ', 1).trimmed().toUtf8();
			const QString c = a[0];
			fflush(stdout);
			if (c == "loaded") stub_fe(OBS_FRONTEND_EVENT_FINISHED_LOADING);
			else if (c == "scene") stub_set_scene(rest.constData());
			else if (c == "mute") stub_mute(line.section(' ', 1, -2).trimmed().toUtf8().constData(), a.last() == "1");
			else if (c == "vol") stub_vol(line.section(' ', 1, -2).trimmed().toUtf8().constData(), a.last().toDouble());
			else if (c == "rename") stub_rename(a1.constData(), a2.constData());
			else if (c == "stream") stub_stream(a.value(1) == "on");
			else if (c == "bytes") stub_add_bytes(a.value(1).toULongLong());
			else if (c == "meter") stub_meter(line.section(' ', 1, -2).trimmed().toUtf8().constData(), a.last().toFloat());
			else if (c == "wizard") printf("WIZARD %s\n", stub_wizard_open().c_str());
			else if (c == "wizardprops") printf("PROPS %s\n", stub_wizard_props().c_str());
			else if (c == "wizardset") stub_wizard_set(line.section(' ', 1, -2).trimmed().toUtf8().constData(), a.last() == "1");
			else if (c == "wizardclick") printf("CLICK %d\n", stub_wizard_click(rest.constData()) ? 1 : 0);
			else if (c == "dump") printf("DUMP %s ALIVE %d\n", stub_dump().c_str(), stub_wizard_alive() ? 1 : 0);
			else if (c == "nowhip") stub_whip_available(false);
			else if (c == "whipfail") stub_whip_fails(true);
			else if (c == "whipdrop") stub_whip_drop("réseau coupé");
			else if (c == "whipinfo") {
				printf("WHIP %s\n", stub_whip_info().c_str());
				fflush(stdout);
			} else if (c == "state") {
				QJsonObject o;
				o["streaming"] = stub_streaming();
				o["recording"] = stub_recording();
				o["paused"] = stub_paused();
				o["collection"] = QString::fromStdString(stub_scene_collection());
				o["profile"] = QString::fromStdString(stub_profile());
				o["flux"] = QString::fromStdString(stub_setting("Flux › SYXTEE", "input"));
				o["liveItems"] = stub_item_count("🔴 › EN DIRECT");
				o["liveItem1"] = stub_item_visible("🔴 › EN DIRECT", 1);
				o["liveItem3"] = stub_item_visible("🔴 › EN DIRECT", 3);
				printf("STATE %s\n", QJsonDocument(o).toJson(QJsonDocument::Compact).constData());
				fflush(stdout);
			} else if (c == "quit") {
				syxtee_obsctl_stop();
				QCoreApplication::quit();
			}
		}
	});
	return app.exec();
}
