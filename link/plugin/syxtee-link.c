// Plugin OBS « SYXTEE Link ».
//
// Ce module reste volontairement minimal : à l'ouverture d'OBS, il lance l'agent SYXTEE Link (livré dans le même paquet) et le
// referme avec OBS. L'agent pilote OBS par son serveur WebSocket intégré, sauvegarde les scènes dans l'espace du compte et
// obéit aux commandes de SYXTEE Studio. Le menu Outils d'OBS reçoit « SYXTEE Link » pour ouvrir ses réglages.
//
// Aucune dépendance à Qt : seule l'API d'OBS (libobs et obs-frontend-api) est utilisée.

#ifdef _WIN32
#define _CRT_RAND_S
#endif
#include <obs-module.h>
#include <obs-frontend-api.h>

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define PANEL_URL "http://127.0.0.1:47831/"

/* Interface Qt (qt/studio_menu.cpp) : menu « SYXTEE » dans la barre d'OBS et fenêtre « SYXTEE Studio ». */
bool syxtee_ui_load(void);
void syxtee_ui_unload(void);

/* Jeton local : donné à l'agent (variable d'environnement) et à la fenêtre Qt, pour que seule la fenêtre parle à l'agent. */
static char ipc_token[65];
const char *syxtee_ipc_token(void)
{
	return ipc_token;
}
static void make_ipc_token(void)
{
	static const char hex[] = "0123456789abcdef";
	unsigned char b[32];
#ifdef _WIN32
	for (int i = 0; i < 32; i++) {
		unsigned int r = 0;
		rand_s(&r);
		b[i] = (unsigned char)r;
	}
#else
	arc4random_buf(b, sizeof(b));
#endif
	for (int i = 0; i < 32; i++) {
		ipc_token[i * 2] = hex[b[i] >> 4];
		ipc_token[i * 2 + 1] = hex[b[i] & 15];
	}
	ipc_token[64] = '\0';
}

OBS_DECLARE_MODULE()
OBS_MODULE_AUTHOR("SYXTEE NETWORKS")

const char *obs_module_name(void)
{
	return "SYXTEE Link";
}

const char *obs_module_description(void)
{
	return "Pilote OBS depuis SYXTEE Studio et sauvegarde tes scènes sur ton espace SYXTEE.";
}

#ifdef _WIN32
#include <windows.h>
#include <shellapi.h>
#include <wchar.h>

static PROCESS_INFORMATION helper;
static bool helper_running = false;

/* Les chemins passent par les API Unicode : un dossier utilisateur accentué (« Frédéric ») doit rester le même que côté agent (UTF-8). */
static bool utf8_to_w(const char *in, wchar_t *out, int cap)
{
	return MultiByteToWideChar(CP_UTF8, 0, in, -1, out, cap) > 0;
}

/* %USERPROFILE%\.syxtee-link (le même dossier que homedir() côté agent), créé au besoin. */
static bool syxtee_state_dir(wchar_t *out, size_t cap)
{
	const wchar_t *home = _wgetenv(L"USERPROFILE");
	if (!home || !*home)
		return false;
	_snwprintf(out, cap, L"%ls\\.syxtee-link", home);
	out[cap - 1] = L'\0';
	CreateDirectoryW(out, NULL);
	return true;
}

static bool helper_path(char *out, size_t cap)
{
	const char *mod = obs_get_module_binary_path(obs_current_module());
	if (!mod)
		return false;
	snprintf(out, cap, "%s", mod);
	char *slash = strrchr(out, '\\');
	char *fwd = strrchr(out, '/');
	if (fwd && (!slash || fwd > slash))
		slash = fwd;
	if (!slash)
		return false;
	snprintf(slash + 1, cap - (size_t)(slash + 1 - out), "syxtee-link-helper.exe");
	return true;
}

static void start_helper(void)
{
	char path[MAX_PATH * 4];
	if (!helper_path(path, sizeof(path))) {
		blog(LOG_WARNING, "[syxtee-link] chemin de l'agent introuvable");
		return;
	}
	char cmd[MAX_PATH * 4 + 64];
	snprintf(cmd, sizeof(cmd), "\"%s\" run --parent-pid %lu", path, (unsigned long)GetCurrentProcessId());
	wchar_t wcmd[MAX_PATH * 4 + 64];
	if (!utf8_to_w(cmd, wcmd, (int)(sizeof(wcmd) / sizeof(wcmd[0])))) {
		blog(LOG_WARNING, "[syxtee-link] chemin de l'agent illisible");
		return;
	}
	STARTUPINFOW si;
	ZeroMemory(&si, sizeof(si));
	si.cb = sizeof(si);
	ZeroMemory(&helper, sizeof(helper));

	/* Journal de l'agent : %USERPROFILE%\.syxtee-link\helper.log (poignée héritée par l'agent, comme sur Mac). */
	HANDLE logh = INVALID_HANDLE_VALUE;
	wchar_t dir[MAX_PATH * 2];
	if (syxtee_state_dir(dir, sizeof(dir) / sizeof(dir[0]))) {
		wchar_t log[MAX_PATH * 2 + 16];
		_snwprintf(log, sizeof(log) / sizeof(log[0]), L"%ls\\helper.log", dir);
		log[sizeof(log) / sizeof(log[0]) - 1] = L'\0';
		SECURITY_ATTRIBUTES sa;
		sa.nLength = sizeof(sa);
		sa.lpSecurityDescriptor = NULL;
		sa.bInheritHandle = TRUE;
		logh = CreateFileW(log, FILE_APPEND_DATA, FILE_SHARE_READ | FILE_SHARE_WRITE, &sa, OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
		if (logh != INVALID_HANDLE_VALUE) {
			si.dwFlags = STARTF_USESTDHANDLES;
			si.hStdOutput = logh;
			si.hStdError = logh;
		}
	}
	BOOL started = CreateProcessW(NULL, wcmd, NULL, NULL, logh != INVALID_HANDLE_VALUE, CREATE_NO_WINDOW, NULL, NULL, &si, &helper);
	if (logh != INVALID_HANDLE_VALUE)
		CloseHandle(logh);
	if (started) {
		helper_running = true;
		blog(LOG_INFO, "[syxtee-link] agent lancé");
	} else {
		blog(LOG_WARNING, "[syxtee-link] impossible de lancer l'agent (%lu)", (unsigned long)GetLastError());
	}
}

static void stop_helper(void)
{
	if (!helper_running)
		return;
	TerminateProcess(helper.hProcess, 0);
	CloseHandle(helper.hProcess);
	CloseHandle(helper.hThread);
	helper_running = false;
}

static void open_panel(void *data)
{
	(void)data;
	ShellExecuteA(NULL, "open", PANEL_URL, NULL, NULL, SW_SHOWNORMAL);
}

#else
#include <errno.h>
#include <fcntl.h>
#include <signal.h>
#include <spawn.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <unistd.h>

extern char **environ;

static pid_t helper_pid = 0;

/* <plugin>.plugin/Contents/MacOS/syxtee-link  →  <plugin>.plugin/Contents/Resources/syxtee-link-helper */
static bool helper_path(char *out, size_t cap)
{
	const char *mod = obs_get_module_binary_path(obs_current_module());
	if (!mod)
		return false;
	char tmp[4096];
	snprintf(tmp, sizeof(tmp), "%s", mod);
	for (int i = 0; i < 2; i++) { /* retire le nom puis MacOS (ou bin/64bit) */
		char *slash = strrchr(tmp, '/');
		if (!slash)
			return false;
		*slash = '\0';
	}
	snprintf(out, cap, "%s/Resources/syxtee-link-helper", tmp);
	return true;
}

static void start_helper(void)
{
	char path[4096];
	if (!helper_path(path, sizeof(path)) || access(path, X_OK) != 0) {
		blog(LOG_WARNING, "[syxtee-link] agent introuvable ou non exécutable");
		return;
	}
	char pid[32];
	snprintf(pid, sizeof(pid), "%d", (int)getpid());
	char *argv[] = {path, (char *)"run", (char *)"--parent-pid", pid, NULL};

	/* Journal de l'agent : ~/.syxtee-link/helper.log */
	posix_spawn_file_actions_t fa;
	posix_spawn_file_actions_init(&fa);
	const char *home = getenv("HOME");
	if (home) {
		char dir[4096], log[4096];
		snprintf(dir, sizeof(dir), "%s/.syxtee-link", home);
		mkdir(dir, 0700);
		snprintf(log, sizeof(log), "%s/helper.log", dir);
		posix_spawn_file_actions_addopen(&fa, 1, log, O_WRONLY | O_CREAT | O_APPEND, 0600);
		posix_spawn_file_actions_adddup2(&fa, 1, 2);
	}
	int rc = posix_spawn(&helper_pid, path, &fa, NULL, argv, environ);
	posix_spawn_file_actions_destroy(&fa);
	if (rc != 0) {
		helper_pid = 0;
		blog(LOG_WARNING, "[syxtee-link] impossible de lancer l'agent (%d)", rc);
		return;
	}
	blog(LOG_INFO, "[syxtee-link] agent lancé (pid %d)", (int)helper_pid);
}

static void stop_helper(void)
{
	if (helper_pid <= 0)
		return;
	kill(helper_pid, SIGTERM);
	int status;
	waitpid(helper_pid, &status, 0);
	helper_pid = 0;
}


static void open_panel(void *data)
{
	(void)data;
	pid_t p;
	char *argv[] = {(char *)"/usr/bin/open", (char *)PANEL_URL, NULL};
	posix_spawn(&p, "/usr/bin/open", NULL, NULL, argv, environ);
}
#endif

/* Note de session pour le Gardien : ~/.syxtee-link/session.json {pid, exited}. « exited » passe à true à la fermeture normale d'OBS ;
 * un plantage le laisse à false, et le Gardien relance alors OBS. */
static void write_session(bool exited)
{
#ifndef _WIN32
	const char *home = getenv("HOME");
	if (!home)
		return;
	char dir[4096], path[4200], tmp[4210];
	snprintf(dir, sizeof(dir), "%s/.syxtee-link", home);
	mkdir(dir, 0700);
	snprintf(path, sizeof(path), "%s/session.json", dir);
	snprintf(tmp, sizeof(tmp), "%s.tmp", path);
	FILE *f = fopen(tmp, "w");
	if (!f)
		return;
	fprintf(f, "{\"pid\":%d,\"exited\":%s}\n", (int)getpid(), exited ? "true" : "false");
	fclose(f);
	rename(tmp, path);
#else
	/* Windows : même fichier, plus le chemin d'obs64.exe (le Gardien rouvre OBS là où il est installé). */
	wchar_t dir[MAX_PATH * 2], path[MAX_PATH * 2 + 32], tmp[MAX_PATH * 2 + 40];
	if (!syxtee_state_dir(dir, sizeof(dir) / sizeof(dir[0])))
		return;
	_snwprintf(path, sizeof(path) / sizeof(path[0]), L"%ls\\session.json", dir);
	path[sizeof(path) / sizeof(path[0]) - 1] = L'\0';
	_snwprintf(tmp, sizeof(tmp) / sizeof(tmp[0]), L"%ls.tmp", path);
	tmp[sizeof(tmp) / sizeof(tmp[0]) - 1] = L'\0';
	wchar_t wexe[MAX_PATH];
	char exe[MAX_PATH * 4], esc[MAX_PATH * 8];
	DWORD n = GetModuleFileNameW(NULL, wexe, MAX_PATH);
	exe[0] = '\0';
	if (n > 0 && n < MAX_PATH)
		WideCharToMultiByte(CP_UTF8, 0, wexe, -1, exe, (int)sizeof(exe), NULL, NULL);
	size_t j = 0;
	for (size_t i = 0; exe[i] && j + 2 < sizeof(esc); i++) {
		if (exe[i] == '\\' || exe[i] == '"')
			esc[j++] = '\\';
		esc[j++] = exe[i];
	}
	esc[j] = '\0';
	FILE *f = _wfopen(tmp, L"wb");
	if (!f)
		return;
	fprintf(f, "{\"pid\":%lu,\"exited\":%s,\"exe\":\"%s\"}\n", (unsigned long)GetCurrentProcessId(), exited ? "true" : "false", esc);
	fclose(f);
	MoveFileExW(tmp, path, MOVEFILE_REPLACE_EXISTING);
#endif
}

/* Socket local par lequel l'agent pilote OBS (plugin = serveur, agent = client). Réservé à l'utilisateur : ~/.syxtee-link, droits 0700. */
static void set_obs_ipc_path(void)
{
#ifdef _WIN32
	char name[96];
	snprintf(name, sizeof(name), "syxtee-link-obs-%lu", (unsigned long)GetCurrentProcessId());
	_putenv_s("SYXTEE_LINK_OBS_IPC", name); /* _putenv_s, pas SetEnvironmentVariable : le getenv du module Qt doit le voir aussi */
#else
	const char *home = getenv("HOME");
	if (!home)
		return;
	char dir[4096], path[4200];
	snprintf(dir, sizeof(dir), "%s/.syxtee-link", home);
	mkdir(dir, 0700);
	snprintf(path, sizeof(path), "%s/obs-%d.sock", dir, (int)getpid());
	setenv("SYXTEE_LINK_OBS_IPC", path, 1);
#endif
}

bool obs_module_load(void)
{
	blog(LOG_INFO, "[syxtee-link] chargé");
	make_ipc_token();
	set_obs_ipc_path();
	write_session(false);
#ifdef _WIN32
	_putenv_s("SYXTEE_LINK_IPC", ipc_token);
#else
	setenv("SYXTEE_LINK_IPC", ipc_token, 1);
#endif
	/* L'interface Qt (et le pilotage interne d'OBS qui va avec) démarre AVANT l'agent : c'est elle qui décide si le socket existe.
	 * Qt d'OBS incompatible avec celui du plugin : ni interface ni pilotage interne, jamais de plantage ; l'agent retombe sur obs-websocket
	 * et la page de réglages reste accessible depuis le menu Outils. */
	bool ui = syxtee_ui_load();
	if (!ui) {
#ifdef _WIN32
		_putenv_s("SYXTEE_LINK_OBS_IPC", ""); /* retire la variable */
#else
		unsetenv("SYXTEE_LINK_OBS_IPC");
#endif
	}
	start_helper();
	if (!ui)
		obs_frontend_add_tools_menu_item("SYXTEE Link (page web)", open_panel, NULL);
	return true;
}

void obs_module_unload(void)
{
	syxtee_ui_unload();
	stop_helper();
	write_session(true);
	blog(LOG_INFO, "[syxtee-link] déchargé");
}
