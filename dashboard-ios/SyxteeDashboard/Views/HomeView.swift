import SwiftUI
import Charts

struct HomeView: View {
    let store: DashStore
    @Environment(\.openURL) private var openURL

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    header
                    if let e = store.error, store.overview == nil { Card { Text(e).font(.footnote).foregroundStyle(Brand.bad) } }
                    if let o = store.overview {
                        alerts(o)
                        kpis(o)
                        chart(o)
                        recent(o)
                    } else if store.loading { ProgressView().frame(maxWidth: .infinity).padding(40) }
                }
                .padding(.horizontal, 18).padding(.bottom, 30)
            }
            .background(Brand.background.ignoresSafeArea())
            .refreshable { await store.refreshAll() }
            .navigationBarHidden(true)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image("Logo").resizable().scaledToFit().frame(height: 26)
                Spacer()
                if let o = store.overview { statusTag(o.coreStatus) }
            }
            Text("Salut, \(store.me?.name.split(separator: " ").first.map(String.init) ?? "toi")").font(.brandSerif(30)).foregroundStyle(Brand.foreground)
            Picker("Période", selection: Binding(get: { store.range }, set: { store.range = $0; Task { await store.loadOverview() } })) {
                Text("7 jours").tag("7d"); Text("30 jours").tag("30d")
            }.pickerStyle(.segmented)
        }
        .padding(.top, 14)
    }

    @ViewBuilder private func statusTag(_ s: String) -> some View {
        switch s {
        case "ok": Tag(text: "Serveurs en ligne", color: Brand.ok)
        case "down": Tag(text: "Serveurs injoignables", color: Brand.bad)
        default: Tag(text: "Serveurs hors service", color: Brand.warn)
        }
    }

    private func alerts(_ o: Overview) -> some View {
        VStack(spacing: 10) {
            ForEach(o.alerts) { a in
                Card {
                    VStack(alignment: .leading, spacing: 10) {
                        Text(a.text).font(.subheadline).foregroundStyle(Brand.foreground)
                        Button(a.cta) { if let u = URL(string: a.href, relativeTo: Config.siteURL) { openURL(u) } }
                            .font(.brandMono(12, .semibold)).foregroundStyle(Brand.accent)
                    }
                }
            }
        }
    }

    private func kpis(_ o: Overview) -> some View {
        let cols = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]
        return LazyVGrid(columns: cols, spacing: 12) {
            kpi("Temps de direct", formatDuration(o.kpis.seconds), delta(o.kpis.seconds, o.previous.seconds))
            kpi("Directs", "\(o.kpis.count)", delta(Double(o.kpis.count), Double(o.previous.count)))
            kpi("Débit moyen", formatKbps(o.kpis.avgKbps), delta(o.kpis.avgKbps, o.previous.avgKbps))
            kpi("Débit max", formatKbps(o.kpis.peakKbps), delta(o.kpis.peakKbps, o.previous.peakKbps))
        }
    }

    private func delta(_ now: Double, _ before: Double) -> Double? { before > 0 ? (now - before) / before : nil }

    private func kpi(_ label: String, _ value: String, _ d: Double?) -> some View {
        Card {
            VStack(alignment: .leading, spacing: 6) {
                SectionLabel(text: label)
                Text(value).font(.system(size: 24, weight: .semibold, design: .rounded)).foregroundStyle(Brand.foreground).minimumScaleFactor(0.7).lineLimit(1)
                if let d { Text(String(format: "%+.0f %% vs période précédente", d * 100)).font(.brandMono(10)).foregroundStyle(d >= 0 ? Brand.ok : Brand.muted) }
                else { Text(" ").font(.brandMono(10)) }
            }
        }
    }

    private func chart(_ o: Overview) -> some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                SectionLabel(text: "Minutes de direct par jour")
                Chart(o.daily) { d in
                    BarMark(x: .value("Jour", d.day), y: .value("Minutes", d.minutes)).foregroundStyle(Brand.accent).cornerRadius(2)
                }
                .chartXAxis(.hidden)
                .chartYAxis { AxisMarks(position: .leading) { AxisGridLine().foregroundStyle(Brand.line); AxisValueLabel().foregroundStyle(Brand.muted) } }
                .frame(height: 140)
                if o.daily.allSatisfy({ $0.minutes == 0 }) { Text("Aucun direct sur la période.").font(.footnote).foregroundStyle(Brand.muted) }
            }
        }
    }

    private func recent(_ o: Overview) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionLabel(text: "Derniers directs")
            if o.recent.isEmpty { Card { Text("Aucun direct pour l'instant.").font(.subheadline).foregroundStyle(Brand.muted) } }
            ForEach(o.recent) { l in NavigationLink { LiveDetail(live: l) } label: { LiveRow(live: l) }.buttonStyle(.plain) }
        }
    }
}

struct LiveRow: View {
    let live: LiveSession
    var body: some View {
        Card {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(live.name).font(.subheadline.weight(.semibold)).foregroundStyle(Brand.foreground)
                    Text(live.date.map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "").font(.brandMono(11)).foregroundStyle(Brand.muted)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    if live.isLive { Tag(text: "En direct", color: Brand.live) } else { Text(formatDuration(live.durationS)).font(.brandMono(13, .semibold)).foregroundStyle(Brand.foreground) }
                    Text(formatKbps(live.avgKbps)).font(.brandMono(11)).foregroundStyle(Brand.muted)
                }
            }
        }
    }
}
