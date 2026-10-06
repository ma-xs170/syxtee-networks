// Menu « SYXTEE » de la barre d'OBS (à côté d'Aide) et fenêtre « SYXTEE Studio ». Qt est celui d'OBS : on le trouve par
// obs_frontend_get_main_window() (QMainWindow). La fenêtre vit dans studio_ui.cpp et parle à l'agent local.
#include <obs-frontend-api.h>
#include <obs-module.h>

#include <QAction>
#include <QDesktopServices>
#include <QMainWindow>
#include <QMenu>
#include <QMenuBar>
#include <QPointer>
#include <QUrl>
#include <QVersionNumber>

#include <cstdlib>

#include "obsctl.h"
#include "studio_ui.h"

extern "C" const char *syxtee_ipc_token(void);

namespace {
QPointer<QMenu> menu;
QPointer<QWidget> window;
bool disabled = false;

void open_window()
{
	auto *main = static_cast<QMainWindow *>(obs_frontend_get_main_window());
	if (!window) window = syxtee_create_window(main, 47831, QByteArray(syxtee_ipc_token()));
	window->show();
	window->raise();
	window->activateWindow();
}

void install()
{
	if (menu) return;
	auto *main = static_cast<QMainWindow *>(obs_frontend_get_main_window());
	if (!main) return;
	menu = main->menuBar()->addMenu("SYXTEE");
	QObject::connect(menu->addAction("SYXTEE Studio"), &QAction::triggered, menu, [] { open_window(); });
	menu->addSeparator();
	QObject::connect(menu->addAction("Ouvrir le tableau de bord"), &QAction::triggered, menu, [] { QDesktopServices::openUrl(QUrl("https://syxtee-networks.vercel.app/dashboard")); });
	QObject::connect(menu->addAction("Page de réglages (navigateur)"), &QAction::triggered, menu, [] { QDesktopServices::openUrl(QUrl("http://127.0.0.1:47831/")); });
	blog(LOG_INFO, "[syxtee-link] menu SYXTEE ajouté");
}

void on_event(enum obs_frontend_event e, void *)
{
	if (e == OBS_FRONTEND_EVENT_FINISHED_LOADING) install();
}
} // namespace

// Le plugin est compilé contre les en-têtes d'une version de Qt, mais exécuté avec le Qt d'OBS. Qt garantit la compatibilité binaire
// dans une même version majeure à condition que le Qt d'exécution ne soit pas plus ancien que celui de la compilation.
// Sinon on ne touche à rien de Qt : l'interface se désactive proprement (message dans le log d'OBS), OBS ne plante pas.
bool qt_compatible()
{
	const QVersionNumber run = QVersionNumber::fromString(QString::fromLatin1(qVersion()));
	const QVersionNumber built = QVersionNumber::fromString(QString::fromLatin1(QT_VERSION_STR));
	const bool ok = run.majorVersion() == built.majorVersion() && run >= built;
	if (ok)
		blog(LOG_INFO, "[syxtee-link] Qt %s (compilé avec %s) : compatible", qVersion(), QT_VERSION_STR);
	else
		blog(LOG_WARNING, "[syxtee-link] Qt %s d'OBS incompatible avec Qt %s utilisé à la compilation : interface SYXTEE désactivée (l'agent continue, page de réglages dans le navigateur). Mets à jour le plugin.",
		     qVersion(), QT_VERSION_STR);
	return ok;
}

extern "C" bool syxtee_ui_load(void)
{
	if (!qt_compatible()) {
		disabled = true;
		return false;
	}
	// Pilotage d'OBS dans le plugin (socket local) : si le Qt est compatible, l'agent n'a besoin ni d'obs-websocket ni d'aucun réglage.
	if (const char *sock = getenv("SYXTEE_LINK_OBS_IPC")) {
		if (!syxtee_obsctl_start(sock)) blog(LOG_WARNING, "[syxtee-link] pilotage interne indisponible");
	}
	obs_frontend_add_event_callback(on_event, nullptr);
	return true;
}

extern "C" void syxtee_ui_unload(void)
{
	if (disabled) return;
	syxtee_obsctl_stop();
	obs_frontend_remove_event_callback(on_event, nullptr);
	delete window.data();
	if (menu) {
		if (auto *bar = menu->parentWidget()) bar->removeAction(menu->menuAction());
		delete menu.data();
	}
}
