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

#include "studio_ui.h"

extern "C" const char *syxtee_ipc_token(void);

namespace {
QPointer<QMenu> menu;
QPointer<QWidget> window;

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

extern "C" void syxtee_ui_load(void)
{
	obs_frontend_add_event_callback(on_event, nullptr);
}

extern "C" void syxtee_ui_unload(void)
{
	obs_frontend_remove_event_callback(on_event, nullptr);
	delete window.data();
	if (menu) {
		if (auto *bar = menu->parentWidget()) bar->removeAction(menu->menuAction());
		delete menu.data();
	}
}
