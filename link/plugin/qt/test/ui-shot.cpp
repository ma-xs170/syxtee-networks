// Essai hors d'OBS : ouvre la fenêtre contre un agent local et enregistre une capture par onglet.
//   ui-shot <port> <jeton> <dossier-de-sortie>
#include <QApplication>
#include <QPushButton>
#include <QTimer>
#include <QEventLoop>
#include <QWidget>
#include <QPixmap>
#include "../studio_ui.h"

static void wait(int ms) { QEventLoop l; QTimer::singleShot(ms, &l, &QEventLoop::quit); l.exec(); }

int main(int argc, char **argv)
{
	QApplication app(argc, argv);
	if (argc < 4) return 2;
	QWidget *w = syxtee_create_window(nullptr, QString(argv[1]).toInt(), QByteArray(argv[2]));
	w->show();
	wait(1500);
	const QString out = argv[3];
	w->grab().save(out + "/00-initial.png");
	auto tabs = w->findChildren<QPushButton *>("tab");
	const char *names[] = {"direct", "collections", "reglages"};
	for (int i = 0; i < tabs.size() && i < 3; i++) {
		tabs[i]->click();
		wait(1500);
		w->grab().save(out + "/0" + QString::number(i + 1) + "-" + names[i] + ".png");
	}
	return 0;
}
