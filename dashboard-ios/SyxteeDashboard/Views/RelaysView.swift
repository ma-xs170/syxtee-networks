import SwiftUI

struct RelaysView: View {
    let store: DashStore
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 10) {
                    if let r = store.relays {
                        if r.status != "ok" { Card { Text("Les serveurs ne répondent pas pour l'instant (\(r.status)).").font(.subheadline).foregroundStyle(Brand.warn) } }
                        let active = r.relays.filter { !$0.archived }
                        HStack { SectionLabel(text: "Mes serveurs"); Spacer(); Text("\(active.count) / \(r.max)").font(.brandMono(11)).foregroundStyle(Brand.muted) }
                        if active.isEmpty { Card { Text("Aucun serveur. Crée-en un depuis le site.").font(.subheadline).foregroundStyle(Brand.muted) } }
                        ForEach(active) { rl in NavigationLink { RelayDetail(relay: rl) } label: { RelayRow(relay: rl) }.buttonStyle(.plain) }
                    } else if let e = store.error { Card { Text(e).font(.footnote).foregroundStyle(Brand.bad) } }
                    else { ProgressView().frame(maxWidth: .infinity).padding(40) }
                }
                .padding(.horizontal, 18).padding(.bottom, 30)
            }
            .background(Brand.background.ignoresSafeArea())
            .refreshable { await store.loadRelays() }
            .navigationTitle("Serveurs").navigationBarTitleDisplayMode(.large)
        }
    }
}

struct RelayRow: View {
    let relay: RelayItem
    var body: some View {
        Card {
            HStack {
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 8) {
                        if relay.live { Circle().fill(Brand.live).frame(width: 8, height: 8) }
                        Text(relay.name).font(.subheadline.weight(.semibold)).foregroundStyle(Brand.foreground)
                    }
                    Text(relay.server.uppercased()).font(.brandMono(10)).tracking(1).foregroundStyle(Brand.muted)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 6) {
                    if relay.live { Tag(text: "En direct", color: Brand.live) }
                    Tag(text: relay.protocol_)
                }
            }
        }
    }
}

struct RelayDetail: View {
    let relay: RelayItem
    @State private var copied: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Text(relay.name).font(.brandSerif(26)).foregroundStyle(Brand.foreground)
                    Spacer()
                    if relay.live { Tag(text: "En direct", color: Brand.live) }
                }
                HStack(spacing: 8) { Tag(text: relay.protocol_); Tag(text: relay.mode == "regie" ? "Régie" : "Direct"); if relay.record { Tag(text: "Enregistré", color: Brand.ok) } }
                SectionLabel(text: "Adresses d'envoi")
                url("Moblin / SRTLA", relay.urls.srtla_url)
                url("SRT direct", relay.urls.srt_url)
                url("Serveur RTMP", relay.urls.rtmp_server)
                url("Clé RTMP", relay.urls.rtmp_key)
                url("URL RTMP complète", relay.urls.rtmp_url)
                url("URL RIST", relay.urls.rist_url)
                SectionLabel(text: "Lecture dans OBS")
                url("OBS Studio (Source média)", relay.obsSrtUrl)
                Text("Les clés sont personnelles : ne les partage pas. Pour les changer, utilise le site.").font(.footnote).foregroundStyle(Brand.muted)
            }
            .padding(.horizontal, 18).padding(.bottom, 30)
        }
        .background(Brand.background.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
    }

    @ViewBuilder private func url(_ label: String, _ value: String?) -> some View {
        if let value, !value.isEmpty {
            Card {
                VStack(alignment: .leading, spacing: 8) {
                    Text(label).font(.footnote).foregroundStyle(Brand.muted)
                    Text(masked(value)).font(.brandMono(12)).foregroundStyle(Brand.foreground).lineLimit(2)
                    Button(copied == value ? "Copié" : "Copier") { UIPasteboard.general.string = value; copied = value }
                        .font(.brandMono(12, .semibold)).foregroundStyle(copied == value ? Brand.ok : Brand.accent)
                }
            }
        }
    }

    /// Clés masquées à l'écran (le bouton copie la valeur complète).
    private func masked(_ v: String) -> String {
        guard let r = v.range(of: "streamid=") else { return v.count > 28 ? String(v.prefix(24)) + "•••" : v }
        return String(v[..<r.upperBound]) + "••••••••"
    }
}
