import AppKit
import WebKit

let baseURL = URL(string: ProcessInfo.processInfo.environment["SYXTEE_DASHBOARD_URL"] ?? "https://www.syxtee-networks.fr/dashboard")!
let allowedHosts = ["syxtee-networks.fr", "www.syxtee-networks.fr", "localhost"]

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate {
    var window: NSWindow!
    var web: WKWebView!
    var linkState: String?
    var origin: String { "\(baseURL.scheme!)://\(baseURL.host!)" + (baseURL.port.map { ":\($0)" } ?? "") }

    // Connexion par le navigateur : l'app ouvre /liaison-app, l'utilisateur clique « Autoriser », le site rappelle l'app via syxteedashboard://
    @objc func startLink() {
        var b = [UInt8](repeating: 0, count: 24)
        _ = SecRandomCopyBytes(kSecRandomDefault, b.count, &b)
        let st = Data(b).base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
        linkState = st
        NSWorkspace.shared.open(URL(string: "\(origin)/liaison-app?state=\(st)")!)
        let html = """
        <body style="background:#171717;color:#eee;font:15px -apple-system;display:grid;place-items:center;height:100vh;margin:0;text-align:center">
        <div><h2>Autorise l'application dans ton navigateur</h2><p style="color:#999">Clique sur « Autoriser » dans la page qui vient de s'ouvrir.</p>
        <button onclick="location.href='syxteedashboard://retry'" style="background:#e5322d;color:#fff;border:0;padding:10px 18px;border-radius:8px;font-size:14px;cursor:pointer">Rouvrir le navigateur</button></div></body>
        """
        web.loadHTMLString(html, baseURL: nil)
    }

    func application(_ app: NSApplication, open urls: [URL]) {
        for url in urls where url.scheme == "syxteedashboard" {
            if url.host == "retry" { startLink(); continue }
            guard url.host == "auth",
                  let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems,
                  let st = items.first(where: { $0.name == "state" })?.value, st == linkState,
                  let hash = items.first(where: { $0.name == "token_hash" })?.value else { continue }
            linkState = nil
            var c = URLComponents(string: "\(origin)/auth/confirm")!
            c.queryItems = [.init(name: "token_hash", value: hash), .init(name: "type", value: "magiclink"), .init(name: "next", value: "/dashboard")]
            web.load(URLRequest(url: c.url!))
            NSApp.activate(ignoringOtherApps: true)
        }
    }

    func applicationDidFinishLaunching(_ n: Notification) {
        let cfg = WKWebViewConfiguration()
        cfg.websiteDataStore = .default() // session Supabase persistante
        cfg.mediaTypesRequiringUserActionForPlayback = []
        web = WKWebView(frame: .zero, configuration: cfg)
        web.navigationDelegate = self
        web.uiDelegate = self
        web.allowsBackForwardNavigationGestures = true
        web.customUserAgent = (web.value(forKey: "userAgent") as? String ?? "") + " SyxteeDashboardApp/1.0"
        web.underPageBackgroundColor = NSColor(calibratedWhite: 0.09, alpha: 1)

        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1360, height: 860),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable],
                          backing: .buffered, defer: false)
        window.title = "SYXTEE Dashboard"
        window.minSize = NSSize(width: 900, height: 600)
        window.contentView = web
        window.setFrameAutosaveName("SyxteeDashboardMain")
        if !window.setFrameUsingName("SyxteeDashboardMain") { window.center() }
        window.makeKeyAndOrderFront(nil)

        buildMenu()
        web.load(URLRequest(url: baseURL))
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ s: NSApplication) -> Bool { true }

    // Liens externes → navigateur par défaut
    func webView(_ w: WKWebView, decidePolicyFor a: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let url = a.request.url, url.scheme == "syxteedashboard" {
            application(NSApp, open: [url]); decisionHandler(.cancel); return
        }
        // Page de connexion du site → connexion par le navigateur
        if let url = a.request.url, a.targetFrame?.isMainFrame ?? true, url.host == baseURL.host,
           url.path == "/connexion", linkState == nil || url.query?.contains("erreur") == true {
            startLink(); decisionHandler(.cancel); return
        }
        if let url = a.request.url, let host = url.host, a.targetFrame?.isMainFrame ?? true,
           !allowedHosts.contains(where: { host == $0 || host.hasSuffix("." + $0) }),
           ["http", "https"].contains(url.scheme ?? "") {
            // OAuth Supabase / Stripe restent dans l'app via ouverture externe
            NSWorkspace.shared.open(url)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    func webView(_ w: WKWebView, createWebViewWith c: WKWebViewConfiguration, for a: WKNavigationAction, windowFeatures f: WKWindowFeatures) -> WKWebView? {
        if let url = a.request.url { NSWorkspace.shared.open(url) }
        return nil
    }

    func webView(_ w: WKWebView, didFailProvisionalNavigation nav: WKNavigation!, withError e: Error) {
        let html = """
        <body style="background:#171717;color:#eee;font:15px -apple-system;display:grid;place-items:center;height:100vh;margin:0;text-align:center">
        <div><h2>Connexion impossible</h2><p>Vérifie ta connexion internet.</p>
        <button onclick="location.href='\(baseURL.absoluteString)'" style="background:#e5322d;color:#fff;border:0;padding:10px 18px;border-radius:8px;font-size:14px;cursor:pointer">Réessayer</button></div></body>
        """
        w.loadHTMLString(html, baseURL: nil)
    }

    @objc func reload() { web.reload() }
    @objc func goHome() { web.load(URLRequest(url: baseURL)) }
    @objc func back() { web.goBack() }
    @objc func forward() { web.goForward() }
    @objc func openSite() { NSWorkspace.shared.open(URL(string: "https://www.syxtee-networks.fr")!) }

    func buildMenu() {
        let main = NSMenu()
        func add(_ menu: NSMenu, _ title: String, _ sel: Selector?, _ key: String = "", mods: NSEvent.ModifierFlags = .command) {
            let i = NSMenuItem(title: title, action: sel, keyEquivalent: key)
            i.keyEquivalentModifierMask = mods
            menu.addItem(i)
        }
        func sub(_ title: String, _ build: (NSMenu) -> Void) {
            let item = NSMenuItem(); let m = NSMenu(title: title); build(m); item.submenu = m; main.addItem(item)
        }
        sub("SYXTEE Dashboard") { m in
            add(m, "À propos de SYXTEE Dashboard", #selector(NSApplication.orderFrontStandardAboutPanel(_:)))
            m.addItem(.separator())
            add(m, "Masquer", #selector(NSApplication.hide(_:)), "h")
            m.addItem(.separator())
            add(m, "Quitter", #selector(NSApplication.terminate(_:)), "q")
        }
        sub("Édition") { m in
            add(m, "Annuler", Selector(("undo:")), "z")
            add(m, "Rétablir", Selector(("redo:")), "Z")
            m.addItem(.separator())
            add(m, "Couper", #selector(NSText.cut(_:)), "x")
            add(m, "Copier", #selector(NSText.copy(_:)), "c")
            add(m, "Coller", #selector(NSText.paste(_:)), "v")
            add(m, "Tout sélectionner", #selector(NSText.selectAll(_:)), "a")
        }
        sub("Navigation") { m in
            add(m, "Accueil", #selector(goHome), "d")
            add(m, "Précédent", #selector(back), "[")
            add(m, "Suivant", #selector(forward), "]")
            add(m, "Recharger", #selector(reload), "r")
            m.addItem(.separator())
            add(m, "Se connecter via le navigateur", #selector(startLink))
            add(m, "Ouvrir le site", #selector(openSite))
        }
        sub("Fenêtre") { m in
            add(m, "Réduire", #selector(NSWindow.miniaturize(_:)), "m")
            add(m, "Plein écran", #selector(NSWindow.toggleFullScreen(_:)), "f", mods: [.command, .control])
        }
        NSApp.mainMenu = main
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
