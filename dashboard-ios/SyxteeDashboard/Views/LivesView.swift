import SwiftUI
import Charts

struct LivesView: View {
    let store: DashStore
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 10) {
                    if store.lives.isEmpty { Card { Text(store.error ?? "Aucun direct enregistré.").font(.subheadline).foregroundStyle(Brand.muted) } }
                    ForEach(store.lives) { l in NavigationLink { LiveDetail(live: l) } label: { LiveRow(live: l) }.buttonStyle(.plain) }
                }
                .padding(.horizontal, 18).padding(.bottom, 30)
            }
            .background(Brand.background.ignoresSafeArea())
            .refreshable { await store.loadLives() }
            .navigationTitle("Directs").navigationBarTitleDisplayMode(.large)
        }
    }
}

struct LiveDetail: View {
    let live: LiveSession
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(live.name).font(.brandSerif(26)).foregroundStyle(Brand.foreground)
                        Text(live.date.map { $0.formatted(date: .complete, time: .shortened) } ?? "").font(.brandMono(11)).foregroundStyle(Brand.muted)
                    }
                    Spacer()
                    if live.isLive { Tag(text: "En direct", color: Brand.live) }
                }
                let cols = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]
                LazyVGrid(columns: cols, spacing: 12) {
                    stat("Durée", formatDuration(live.durationS))
                    stat("Débit moyen", formatKbps(live.avgKbps))
                    stat("Débit max", formatKbps(live.peakKbps))
                    stat("Reconnexions", "\(live.reconnects)")
                }
                if live.bitrateSeries.count > 1 {
                    Card {
                        VStack(alignment: .leading, spacing: 12) {
                            SectionLabel(text: "Débit pendant le direct")
                            Chart(Array(live.bitrateSeries.enumerated()), id: \.offset) { i, v in
                                AreaMark(x: .value("t", i), y: .value("kb/s", v)).foregroundStyle(Brand.accent.opacity(0.15))
                                LineMark(x: .value("t", i), y: .value("kb/s", v)).foregroundStyle(Brand.accent).interpolationMethod(.monotone)
                            }
                            .chartXAxis(.hidden)
                            .chartYAxis { AxisMarks(position: .leading) { AxisGridLine().foregroundStyle(Brand.line); AxisValueLabel().foregroundStyle(Brand.muted) } }
                            .frame(height: 180)
                        }
                    }
                }
            }
            .padding(.horizontal, 18).padding(.bottom, 30)
        }
        .background(Brand.background.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
    }

    private func stat(_ label: String, _ value: String) -> some View {
        Card { VStack(alignment: .leading, spacing: 6) { SectionLabel(text: label); Text(value).font(.system(size: 22, weight: .semibold, design: .rounded)).foregroundStyle(Brand.foreground) } }
    }
}
