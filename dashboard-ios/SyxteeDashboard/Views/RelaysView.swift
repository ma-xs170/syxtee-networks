import SwiftUI

struct RelaysView: View {
    let store: DashStore
    @State private var showCreate = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 10) {
                    if let r = store.relays {
                        if r.status != "ok" { Card { Text("Les serveurs ne répondent pas pour l'instant (\(r.status)).").font(.subheadline).foregroundStyle(Brand.warn) } }
                        let active = r.relays.filter { !$0.archived }
                        let archived = r.relays.filter(\.archived)
                        HStack { SectionLabel(text: "Mes serveurs"); Spacer(); Text("\(active.count) / \(r.max)").font(.brandMono(11)).foregroundStyle(Brand.muted) }
                        if active.isEmpty { Card { Text("Aucun serveur. Touche + pour en créer un.").font(.subheadline).foregroundStyle(Brand.muted) } }
                        ForEach(active) { rl in NavigationLink { RelayDetail(store: store, relayID: rl.id) } label: { RelayRow(relay: rl) }.buttonStyle(.plain) }
                        if !archived.isEmpty {
                            SectionLabel(text: "Archivés").padding(.top, 12)
                            ForEach(archived) { rl in NavigationLink { RelayDetail(store: store, relayID: rl.id) } label: { RelayRow(relay: rl) }.buttonStyle(.plain).opacity(0.6) }
                        }
                    } else if let e = store.error { Card { Text(e).font(.footnote).foregroundStyle(Brand.bad) } }
                    else { ProgressView().frame(maxWidth: .infinity).padding(40) }
                }
                .padding(.horizontal, 18).padding(.bottom, 30)
            }
            .background(Brand.background.ignoresSafeArea())
            .refreshable { await store.loadRelays() }
            .navigationTitle("Serveurs").navigationBarTitleDisplayMode(.large)
            .toolbar { ToolbarItem(placement: .primaryAction) { Button { showCreate = true } label: { Image(systemName: "plus") }.accessibilityLabel("Créer un serveur") } }
            .sheet(isPresented: $showCreate) { CreateRelayView(store: store) }
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
                    Tag(text: relay.archived ? "Archivé" : relay.protocol_)
                }
            }
        }
    }
}

struct CreateRelayView: View {
    let store: DashStore
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var proto = "srtla"
    @State private var server = ""
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Nom (ex. iPhone, Osmo Pocket)", text: $name)
                    Picker("Protocole", selection: $proto) {
                        Text("SRTLA (Moblin, SYXTEE CAM)").tag("srtla"); Text("RTMP (caméras, drones)").tag("rtmp")
                    }
                    Picker("Serveur", selection: $server) {
                        ForEach(store.servers) { Text($0.available ? $0.title : "\($0.title) · bientôt").tag($0.id).disabled(!$0.available) }
                    }
                } footer: {
                    Text("SRTLA agrège plusieurs connexions (5G + Wi-Fi). RTMP convient aux caméras DJI et aux drones.").font(.footnote).foregroundStyle(Brand.muted)
                }
                .listRowBackground(Brand.surface)
                if let error { Section { Text(error).font(.footnote).foregroundStyle(Brand.bad) }.listRowBackground(Brand.surface) }
            }
            .scrollContentBackground(.hidden).background(Brand.background.ignoresSafeArea())
            .navigationTitle("Nouveau serveur").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuler") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Créer", action: create).disabled(busy || name.trimmingCharacters(in: .whitespaces).isEmpty || server.isEmpty) }
            }
            .onAppear { if server.isEmpty { server = store.servers.first(where: \.available)?.id ?? "" } }
        }
        .preferredColorScheme(.dark)
    }

    private func create() {
        busy = true; error = nil
        Task {
            do {
                try await store.api.perform("POST", "api/app/relays", body: ["name": name.trimmingCharacters(in: .whitespaces), "protocol": proto, "server": server])
                await store.loadRelays(); await store.loadOverview()
                dismiss()
            } catch { self.error = (error as? APIError)?.errorDescription ?? "Création impossible." }
            busy = false
        }
    }
}

struct RelayDetail: View {
    let store: DashStore
    let relayID: String
    @Environment(\.dismiss) private var dismiss
    @State private var copied: String?
    @State private var renaming = false
    @State private var newName = ""
    @State private var confirm: Confirm?
    @State private var busy = false
    @State private var error: String?

    enum Confirm: Identifiable { case rotate, delete, archive(Bool); var id: String { switch self { case .rotate: "r"; case .delete: "d"; case .archive(let a): "a\(a)" } } }

    private var relay: RelayItem? { store.relays?.relays.first { $0.id == relayID } }

    var body: some View {
        ScrollView {
            if let relay {
                VStack(alignment: .leading, spacing: 14) {
                    HStack {
                        Text(relay.name).font(.brandSerif(26)).foregroundStyle(Brand.foreground)
                        Spacer()
                        if relay.live { Tag(text: "En direct", color: Brand.live) }
                    }
                    HStack(spacing: 8) { Tag(text: relay.protocol_); Tag(text: relay.mode == "regie" ? "Régie" : "Direct"); if relay.record { Tag(text: "Enregistré", color: Brand.ok) } }
                    if let error { Card { Text(error).font(.footnote).foregroundStyle(Brand.bad) } }

                    SectionLabel(text: "Adresses d'envoi")
                    url("Moblin / SRTLA", relay.urls.srtla_url)
                    url("SRT direct", relay.urls.srt_url)
                    url("Serveur RTMP", relay.urls.rtmp_server)
                    url("Clé RTMP", relay.urls.rtmp_key)
                    url("URL RTMP complète", relay.urls.rtmp_url)
                    SectionLabel(text: "Lecture dans OBS")
                    url("OBS Studio (Source média)", relay.obsSrtUrl)

                    SectionLabel(text: "Réglages").padding(.top, 8)
                    Card {
                        VStack(alignment: .leading, spacing: 14) {
                            row("Nom") { Button("Renommer") { newName = relay.name; renaming = true } }
                            Divider().overlay(Brand.line)
                            row("Secours OBS") {
                                Picker("", selection: Binding(get: { relay.switchTrigger ?? "cut" }, set: { v in patch(["switch_trigger": v]) })) {
                                    Text("Coupure seulement").tag("cut"); Text("Coupure ou débit bas").tag("cut_lowbitrate"); Text("Sensible").tag("sensitive")
                                }.labelsHidden()
                            }
                            Divider().overlay(Brand.line)
                            row("Mode") {
                                Picker("", selection: Binding(get: { relay.mode }, set: { v in patch(["mode": v]) })) { Text("Direct").tag("direct"); Text("Régie").tag("regie") }.labelsHidden()
                            }
                            Divider().overlay(Brand.line)
                            Toggle("Enregistrer sur le serveur", isOn: Binding(get: { relay.record }, set: { v in patch(["record": v]) })).tint(Brand.ok)
                            if relay.record {
                                row("Format") { Picker("", selection: Binding(get: { relay.recordFormat ?? "mov" }, set: { v in patch(["record_format": v]) })) { Text("MOV").tag("mov"); Text("MP4").tag("mp4") }.labelsHidden() }
                            }
                            Divider().overlay(Brand.line)
                            row("Serveur") {
                                Picker("", selection: Binding(get: { relay.server }, set: { v in if v != relay.server { patch(["server": v]) } })) {
                                    ForEach(store.servers.filter { $0.available || $0.id == relay.server }) { Text($0.title).tag($0.id) }
                                }.labelsHidden()
                            }
                        }
                        .disabled(busy)
                    }
                    Text("Changer de serveur garde les mêmes clés mais coupe le direct en cours.").font(.footnote).foregroundStyle(Brand.muted)

                    SectionLabel(text: "Zone sensible").padding(.top, 8)
                    VStack(spacing: 10) {
                        danger("Régénérer les clés", "arrow.triangle.2.circlepath") { confirm = .rotate }
                        danger(relay.archived ? "Réactiver" : "Archiver", relay.archived ? "tray.and.arrow.up" : "archivebox") { confirm = .archive(!relay.archived) }
                        danger("Supprimer ce serveur", "trash") { confirm = .delete }
                    }
                }
                .padding(.horizontal, 18).padding(.bottom, 30)
            } else { Text("Serveur introuvable.").foregroundStyle(Brand.muted).padding(40) }
        }
        .background(Brand.background.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
        .alert("Renommer", isPresented: $renaming) {
            TextField("Nom", text: $newName)
            Button("Annuler", role: .cancel) {}
            Button("Enregistrer") { patch(["name": newName]) }
        }
        .confirmationDialog(confirmTitle, isPresented: Binding(get: { confirm != nil }, set: { if !$0 { confirm = nil } }), titleVisibility: .visible) {
            switch confirm {
            case .rotate: Button("Régénérer", role: .destructive) { rotate() }
            case .delete: Button("Supprimer", role: .destructive) { remove() }
            case .archive(let a): Button(a ? "Archiver" : "Réactiver") { patch(["archived": a]) }
            case nil: EmptyView()
            }
        } message: { Text(confirmMessage) }
    }

    private var confirmTitle: String {
        switch confirm { case .rotate: "Régénérer les clés ?"; case .delete: "Supprimer ce serveur ?"; case .archive(let a): a ? "Archiver ce serveur ?" : "Réactiver ce serveur ?"; case nil: "" }
    }
    private var confirmMessage: String {
        switch confirm {
        case .rotate: "Les anciennes adresses cessent de marcher tout de suite : colle les nouvelles dans ton encodeur et dans OBS."
        case .delete: "Cette action est définitive."
        case .archive(let a): a ? "Les adresses sont coupées. Tu pourras le réactiver." : "Il compte de nouveau dans la limite de ta formule."
        case nil: ""
        }
    }

    private func row<C: View>(_ label: String, @ViewBuilder _ c: () -> C) -> some View {
        HStack { Text(label).foregroundStyle(Brand.foreground); Spacer(); c().foregroundStyle(Brand.muted) }
    }

    private func danger(_ title: String, _ icon: String, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack { Image(systemName: icon).frame(width: 24); Text(title); Spacer() }
                .padding(14).foregroundStyle(Brand.bad)
                .background(Brand.surface, in: RoundedRectangle(cornerRadius: 14)).overlay(RoundedRectangle(cornerRadius: 14).stroke(Brand.line))
        }
        .disabled(busy)
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

    private func masked(_ v: String) -> String {
        guard let r = v.range(of: "streamid=") else { return v.count > 28 ? String(v.prefix(24)) + "•••" : v }
        return String(v[..<r.upperBound]) + "••••••••"
    }

    private func patch(_ body: [String: Any]) { run { try await store.api.perform("PATCH", "api/app/relays/\(relayID)", body: body) } }
    private func rotate() { run { try await store.api.perform("POST", "api/app/relays/\(relayID)/rotate") } }
    private func remove() { run({ try await store.api.perform("DELETE", "api/app/relays/\(relayID)") }, leave: true) }

    private func run(_ job: @escaping () async throws -> Void, leave: Bool = false) {
        busy = true; error = nil
        Task {
            do { try await job(); await store.loadRelays(); await store.loadOverview(); if leave { dismiss() } }
            catch { self.error = (error as? APIError)?.errorDescription ?? "Action impossible." }
            busy = false
        }
    }
}
