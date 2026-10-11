import SwiftUI
import Charts

struct StatsView: View {
    let store: DashStore
    @State private var range = "7d"
    @State private var stats: Stats?
    @State private var error: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Picker("Période", selection: $range) { Text("7 jours").tag("7d"); Text("30 jours").tag("30d") }.pickerStyle(.segmented)
                if let error { Card { Text(error).font(.footnote).foregroundStyle(Brand.bad) } }
                if let s = stats {
                    if !s.any { Card { Text("Aucun direct terminé sur la période.").font(.subheadline).foregroundStyle(Brand.muted) } }
                    let cols = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]
                    LazyVGrid(columns: cols, spacing: 12) {
                        tile("Temps de direct", formatDuration(s.kpis.seconds))
                        tile("Directs", "\(s.kpis.count)")
                        tile("Durée moyenne", formatDuration(s.kpis.avgSeconds))
                        tile("Débit moyen", formatKbps(s.kpis.avgKbps))
                        tile("Débit max", formatKbps(s.kpis.peakKbps))
                        tile("Reconnexions", "\(s.reconnects)")
                    }
                    Card {
                        VStack(alignment: .leading, spacing: 12) {
                            SectionLabel(text: "Minutes de direct par jour")
                            Chart(s.daily) { d in BarMark(x: .value("Jour", d.day), y: .value("Minutes", d.minutes)).foregroundStyle(Brand.accent).cornerRadius(2) }
                                .chartXAxis(.hidden)
                                .chartYAxis { AxisMarks(position: .leading) { AxisGridLine().foregroundStyle(Brand.line); AxisValueLabel().foregroundStyle(Brand.muted) } }
                                .frame(height: 160)
                        }
                    }
                    if let l = s.longest { NavigationLink { LiveDetail(live: l) } label: { VStack(alignment: .leading, spacing: 8) { SectionLabel(text: "Plus long direct"); LiveRow(live: l) } }.buttonStyle(.plain) }
                    if s.short > 0 { Text("\(s.short) direct\(s.short > 1 ? "s" : "") de moins d'une minute sur la période.").font(.footnote).foregroundStyle(Brand.muted) }
                } else { ProgressView().frame(maxWidth: .infinity).padding(30) }
            }
            .padding(.horizontal, 18).padding(.bottom, 30)
        }
        .background(Brand.background.ignoresSafeArea())
        .navigationTitle("Statistiques").navigationBarTitleDisplayMode(.large)
        .task(id: range) { await load() }
        .refreshable { await load() }
    }

    private func tile(_ label: String, _ value: String) -> some View {
        Card { VStack(alignment: .leading, spacing: 6) { SectionLabel(text: label); Text(value).font(.system(size: 22, weight: .semibold, design: .rounded)).foregroundStyle(Brand.foreground).minimumScaleFactor(0.7).lineLimit(1) } }
    }

    private func load() async {
        do { stats = try await store.api.get("api/app/stats", query: ["range": range]); error = nil } catch { self.error = (error as? APIError)?.errorDescription }
    }
}
