import SwiftUI

/// Écran de chargement (« S » sur le fond du site), connexion obligatoire, puis le dashboard.
struct RootView: View {
    @Environment(Session.self) private var session
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var splashDone = false
    @State private var store: DashStore?

    var body: some View {
        ZStack {
            switch session.state {
            case .signedIn where splashDone: if let store { DashboardTabs(store: store).transition(.opacity) }
            case .signedOut where splashDone: LoginView().transition(.opacity)
            default: SplashView().transition(.opacity)
            }
        }
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.4), value: splashDone)
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.4), value: session.state)
        .task {
            async let minimum: Void = { try? await Task.sleep(for: .seconds(1.2)) }()
            await session.restore()
            await minimum
            splashDone = true
        }
        .onChange(of: session.state) { _, s in store = s == .signedIn ? DashStore(session: session) : nil }
        .onAppear { if session.state == .signedIn, store == nil { store = DashStore(session: session) } }
    }
}

struct SplashView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shown = false
    var body: some View {
        ZStack {
            Backdrop()
            Image("Logo").resizable().scaledToFit().frame(height: 110)
                .opacity(shown ? 1 : 0).scaleEffect(shown || reduceMotion ? 1 : 0.92).accessibilityLabel("SYXTEE")
        }
        .onAppear { withAnimation(reduceMotion ? nil : .easeOut(duration: 0.8)) { shown = true } }
    }
}

struct DashboardTabs: View {
    let store: DashStore
    var body: some View {
        TabView {
            HomeView(store: store).tabItem { Label("Accueil", systemImage: "house") }
            RelaysView(store: store).tabItem { Label("Serveurs", systemImage: "server.rack") }
            LivesView(store: store).tabItem { Label("Directs", systemImage: "dot.radiowaves.left.and.right") }
            MoreView(store: store).tabItem { Label("Compte", systemImage: "person.crop.circle") }
        }
        .task { await store.refreshAll() }
    }
}
