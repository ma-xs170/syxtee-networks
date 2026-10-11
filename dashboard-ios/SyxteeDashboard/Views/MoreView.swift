import SwiftUI

struct MoreView: View {
    let store: DashStore
    @Environment(Session.self) private var session
    @Environment(\.openURL) private var openURL

    private let links: [(String, String, String)] = [
        ("Abonnement", "creditcard", "dashboard/abonnement"), ("Support", "lifepreserver", "dashboard/support"),
        ("Multichat", "bubble.left.and.bubble.right", "dashboard/multichat"), ("Contrôle à distance", "slider.horizontal.3", "dashboard/controle-a-distance"),
        ("Statistiques", "chart.xyaxis.line", "dashboard/stats"), ("Paramètres", "gearshape", "dashboard/parametres"),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Card {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(store.me?.name ?? session.email ?? "Compte").font(.brandSerif(24)).foregroundStyle(Brand.foreground)
                            Text(store.me?.email ?? session.email ?? "").font(.brandMono(11)).foregroundStyle(Brand.muted)
                            if let p = store.me?.plan {
                                HStack(spacing: 8) { Tag(text: "Formule \(p.name)"); Tag(text: "\(p.relays) serveur\(p.relays > 1 ? "s" : "")") }.padding(.top, 4)
                            }
                        }
                    }
                    SectionLabel(text: "Sur le site")
                    VStack(spacing: 0) {
                        ForEach(links, id: \.2) { l in
                            Button { openURL(Config.siteURL.appending(path: l.2)) } label: {
                                HStack(spacing: 14) {
                                    Image(systemName: l.1).frame(width: 24).foregroundStyle(Brand.muted)
                                    Text(l.0).foregroundStyle(Brand.foreground)
                                    Spacer()
                                    Image(systemName: "arrow.up.right").font(.caption).foregroundStyle(Brand.faint)
                                }
                                .padding(.vertical, 14).padding(.horizontal, 16)
                            }
                            if l.2 != links.last?.2 { Divider().overlay(Brand.line) }
                        }
                    }
                    .background(Brand.surface, in: RoundedRectangle(cornerRadius: 18)).overlay(RoundedRectangle(cornerRadius: 18).stroke(Brand.line))
                    Button("Se déconnecter", role: .destructive) { session.signOut() }
                        .frame(maxWidth: .infinity, minHeight: 48).foregroundStyle(Brand.bad)
                        .background(Brand.surface, in: Capsule()).overlay(Capsule().stroke(Brand.line))
                    Text("SYXTEE Dashboard · \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "")").font(.brandMono(10)).foregroundStyle(Brand.faint).frame(maxWidth: .infinity)
                }
                .padding(.horizontal, 18).padding(.vertical, 18)
            }
            .background(Brand.background.ignoresSafeArea())
            .refreshable { await store.loadMe() }
            .navigationTitle("Compte").navigationBarTitleDisplayMode(.large)
        }
    }
}
