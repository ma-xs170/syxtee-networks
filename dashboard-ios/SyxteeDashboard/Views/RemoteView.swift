import SwiftUI

/// Pilote ton OBS à distance : scènes, direct, enregistrement, mixeur audio.
struct RemoteView: View {
    @Environment(Session.self) private var session
    @State private var remote: RemoteClient?
    @State private var confirmStream = false

    var body: some View {
        NavigationStack {
            ScrollView {
                if let r = remote {
                    VStack(alignment: .leading, spacing: 16) {
                        status(r)
                        if let e = r.error { Card { Text(e).font(.footnote).foregroundStyle(Brand.bad) } }
                        if r.link == .on, r.agentOnline {
                            controls(r)
                            scenes(r)
                            mixer(r)
                        } else if r.link == .denied {
                            Card { Text("Ton compte n'a pas accès au contrôle à distance (formule Signature ou Prestige).").font(.subheadline).foregroundStyle(Brand.warn) }
                        } else if r.link == .on {
                            Card {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("OBS n'est pas connecté.").font(.subheadline.weight(.semibold)).foregroundStyle(Brand.foreground)
                                    Text("Ouvre OBS sur ton PC avec le plugin SYXTEE, connecté à ton compte. Il apparaîtra ici dès qu'il est en ligne.").font(.footnote).foregroundStyle(Brand.muted)
                                }
                            }
                        } else { ProgressView().frame(maxWidth: .infinity).padding(40) }
                    }
                    .padding(.horizontal, 18).padding(.bottom, 30)
                }
            }
            .background(Brand.background.ignoresSafeArea())
            .refreshable { await remote?.refresh() }
            .navigationTitle("Contrôle").navigationBarTitleDisplayMode(.large)
            .onAppear { if remote == nil { remote = RemoteClient(session: session) }; remote?.start() }
            .onDisappear { remote?.stop(); remote = nil }
        }
    }

    private func status(_ r: RemoteClient) -> some View {
        Card {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(r.agentOnline ? (r.agentName ?? "OBS") : "Hors ligne").font(.subheadline.weight(.semibold)).foregroundStyle(Brand.foreground)
                    Text(r.link == .on ? "Serveur connecté" : r.link == .connecting ? "Connexion…" : "Reconnexion…").font(.brandMono(10)).foregroundStyle(Brand.muted)
                }
                Spacer()
                if let l = r.latency { Tag(text: "\(l) ms", color: l < 150 ? Brand.ok : Brand.warn) }
                Tag(text: r.agentOnline ? "OBS en ligne" : "OBS hors ligne", color: r.agentOnline ? Brand.ok : Brand.muted)
            }
        }
    }

    private func controls(_ r: RemoteClient) -> some View {
        HStack(spacing: 12) {
            Button { confirmStream = true } label: {
                HStack(spacing: 8) { Circle().fill(r.streaming ? Brand.foreground : Brand.live).frame(width: 9, height: 9); Text(r.streaming ? "ARRÊTER LE LIVE" : "LANCER LE LIVE").font(.brandMono(12, .bold)).tracking(1) }
                    .frame(maxWidth: .infinity, minHeight: 52)
                    .background(r.streaming ? AnyShapeStyle(Brand.live) : AnyShapeStyle(Brand.accent), in: Capsule())
                    .foregroundStyle(r.streaming ? Brand.foreground : Brand.onAccent)
            }
            .confirmationDialog(r.streaming ? "Arrêter le direct ?" : "Lancer le direct ?", isPresented: $confirmStream, titleVisibility: .visible) {
                Button(r.streaming ? "Arrêter le live" : "Lancer le live", role: r.streaming ? .destructive : nil) { Task { await r.toggleStream() } }
            }
            Button { Task { await r.toggleRecord() } } label: {
                HStack(spacing: 8) { Circle().fill(r.recording ? Brand.live : Brand.muted).frame(width: 9, height: 9); Text(r.recording ? "STOP REC" : "REC").font(.brandMono(12, .bold)).tracking(1) }
                    .frame(width: 120, height: 52).background(Brand.surface, in: Capsule()).overlay(Capsule().stroke(Brand.lineStrong)).foregroundStyle(Brand.foreground)
            }
        }
    }

    private func scenes(_ r: RemoteClient) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionLabel(text: "Scènes")
            let cols = [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)]
            LazyVGrid(columns: cols, spacing: 10) {
                ForEach(r.scenes, id: \.self) { s in
                    let on = s == r.currentScene
                    Button { Task { await r.switchScene(s) } } label: {
                        Text(s).font(.subheadline.weight(.semibold)).lineLimit(2).multilineTextAlignment(.center)
                            .frame(maxWidth: .infinity, minHeight: 56).padding(.horizontal, 8)
                            .background(on ? AnyShapeStyle(Brand.accent) : AnyShapeStyle(Brand.surface), in: RoundedRectangle(cornerRadius: 14))
                            .overlay(RoundedRectangle(cornerRadius: 14).stroke(on ? Brand.accent : Brand.line))
                            .foregroundStyle(on ? Brand.onAccent : Brand.foreground)
                    }
                }
            }
        }
    }

    @ViewBuilder private func mixer(_ r: RemoteClient) -> some View {
        if !r.inputs.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                SectionLabel(text: "Audio")
                ForEach(r.inputs) { i in MixerRow(remote: r, input: i) }
            }
        }
    }
}

struct MixerRow: View {
    let remote: RemoteClient
    let input: RemoteClient.Input
    @State private var db: Double
    @State private var lastSent = Date.distantPast

    init(remote: RemoteClient, input: RemoteClient.Input) { self.remote = remote; self.input = input; _db = State(initialValue: max(input.db, -60)) }

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text(input.name).font(.subheadline.weight(.semibold)).foregroundStyle(Brand.foreground).lineLimit(1)
                    Spacer()
                    Text(String(format: "%.0f dB", db)).font(.brandMono(11)).foregroundStyle(Brand.muted)
                    Button { Task { await remote.setMute(input.name, !input.muted) } } label: {
                        Image(systemName: input.muted ? "speaker.slash.fill" : "speaker.wave.2.fill").frame(width: 40, height: 34)
                            .foregroundStyle(input.muted ? Brand.live : Brand.foreground)
                    }
                    .accessibilityLabel(input.muted ? "Réactiver \(input.name)" : "Couper \(input.name)")
                }
                // Au plus un ordre toutes les 200 ms pendant le glissement (le dernier est toujours envoyé).
                Slider(value: $db, in: -60...0, onEditingChanged: { editing in if !editing { Task { await remote.setVolume(input.name, db) } } })
                    .onChange(of: db) { _, v in
                        if Date().timeIntervalSince(lastSent) > 0.2 { lastSent = .now; Task { await remote.setVolume(input.name, v) } }
                    }
                    .tint(Brand.accent)
            }
        }
        .onChange(of: input.db) { _, v in db = max(v, -60) }
    }
}
