import SwiftUI

struct BillingView: View {
    let store: DashStore
    @Environment(\.openURL) private var openURL
    @State private var billing: Billing?
    @State private var interval = "month"
    @State private var error: String?
    @State private var busy = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                if let error { Card { Text(error).font(.footnote).foregroundStyle(Brand.bad) } }
                if let b = billing {
                    Card {
                        VStack(alignment: .leading, spacing: 8) {
                            SectionLabel(text: "Formule actuelle")
                            Text(b.current.name).font(.brandSerif(28)).foregroundStyle(Brand.foreground)
                            Text("\(b.current.relays >= 99 ? "Serveurs illimités" : "\(b.current.relays) serveur\(b.current.relays > 1 ? "s" : "")") · \(b.current.streams) direct\(b.current.streams > 1 ? "s" : "") simultané\(b.current.streams > 1 ? "s" : "")").font(.brandMono(11)).foregroundStyle(Brand.muted)
                            if let end = parseDate(b.billing.period_end ?? b.current.until) {
                                Text((b.billing.cancel_at_period_end ? "Se termine le " : b.billing.renews ? "Renouvelée le " : "Jusqu'au ") + end.formatted(date: .long, time: .omitted)).font(.footnote).foregroundStyle(Brand.muted)
                            }
                            if b.billing.has_customer {
                                Button { Task { await open("api/app/billing/portal", nil) } } label: { Text("Gérer mon abonnement").font(.brandMono(12, .semibold)) }.padding(.top, 4).disabled(busy)
                            }
                        }
                    }
                    if b.can_subscribe {
                        Picker("Période", selection: $interval) { Text("Mensuel").tag("month"); Text("Annuel · 2 mois offerts").tag("year") }.pickerStyle(.segmented)
                        ForEach(b.tiers) { t in tier(t) }
                        Text("Le paiement s'ouvre dans Safari (Stripe). Prix nets, sans TVA.").font(.footnote).foregroundStyle(Brand.muted)
                    }
                } else { ProgressView().frame(maxWidth: .infinity).padding(30) }
            }
            .padding(.horizontal, 18).padding(.bottom, 30)
        }
        .background(Brand.background.ignoresSafeArea())
        .navigationTitle("Abonnement").navigationBarTitleDisplayMode(.large)
        .task { await load() }
        .refreshable { await load() }
    }

    private func tier(_ t: Billing.Tier) -> some View {
        Card {
            VStack(alignment: .leading, spacing: 10) {
                HStack { Text(t.name).font(.brandSerif(22)).foregroundStyle(Brand.foreground); Spacer(); if t.featured == true { Tag(text: "Populaire", color: Brand.ok) } }
                Text(t.pitch).font(.footnote).foregroundStyle(Brand.muted)
                Text((t.prices[interval]?.amount ?? "") + (interval == "year" ? " / an" : " / mois")).font(.system(size: 22, weight: .semibold, design: .rounded)).foregroundStyle(Brand.foreground)
                VStack(alignment: .leading, spacing: 4) { ForEach(t.points, id: \.self) { Label($0, systemImage: "checkmark").font(.footnote).foregroundStyle(Brand.muted).labelStyle(.titleAndIcon) } }
                Button { Task { await open("api/app/billing/checkout", ["tier": t.id, "interval": interval]) } } label: {
                    Text("Choisir \(t.name)").font(.subheadline.weight(.semibold)).frame(maxWidth: .infinity, minHeight: 46)
                        .background(Brand.accent, in: Capsule()).foregroundStyle(Brand.onAccent)
                }.disabled(busy)
            }
        }
    }

    private func open(_ path: String, _ body: [String: Any]?) async {
        busy = true; defer { busy = false }
        do {
            let r: UrlResponse = try await store.api.send("POST", path, body: body ?? [:])
            if let u = r.url.flatMap(URL.init(string:)) { openURL(u) }
        } catch { self.error = (error as? APIError)?.errorDescription }
    }

    private func load() async {
        do { billing = try await store.api.get("api/app/billing"); error = nil } catch { self.error = (error as? APIError)?.errorDescription }
    }
}
