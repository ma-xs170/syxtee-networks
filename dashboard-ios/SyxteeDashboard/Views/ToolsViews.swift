import SwiftUI

// MARK: Appareils OBS (plugin SYXTEE)

struct DevicesView: View {
    let store: DashStore
    @State private var devices: [ObsDevice]?
    @State private var code: PairCode?
    @State private var error: String?
    @State private var renaming: ObsDevice?
    @State private var newName = ""
    @State private var removing: ObsDevice?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                if let error { Card { Text(error).font(.footnote).foregroundStyle(Brand.bad) } }
                Card {
                    VStack(alignment: .leading, spacing: 10) {
                        SectionLabel(text: "Jumeler un nouvel OBS")
                        if let code {
                            Text(code.code).font(.system(size: 34, weight: .bold, design: .monospaced)).foregroundStyle(Brand.foreground).textSelection(.enabled)
                            Text("Saisis ce code dans le plugin SYXTEE d'OBS (valable \(code.expires_in / 60) minutes).").font(.footnote).foregroundStyle(Brand.muted)
                        } else { Text("Génère un code, puis saisis-le dans le plugin SYXTEE sur ton PC.").font(.footnote).foregroundStyle(Brand.muted) }
                        Button(code == nil ? "Générer un code" : "Nouveau code") { Task { await pair() } }.font(.brandMono(12, .semibold))
                    }
                }
                SectionLabel(text: "Mes postes OBS")
                if let devices {
                    if devices.isEmpty { Card { Text("Aucun poste jumelé.").font(.subheadline).foregroundStyle(Brand.muted) } }
                    ForEach(devices) { d in
                        Card {
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    Text(d.name).font(.subheadline.weight(.semibold)).foregroundStyle(Brand.foreground)
                                    Spacer()
                                    Tag(text: d.online ? "En ligne" : "Hors ligne", color: d.online ? Brand.ok : Brand.muted)
                                }
                                Text("\(d.platform) · \(d.host) · plugin \(d.plugin_version)").font(.brandMono(10)).foregroundStyle(Brand.muted)
                                HStack(spacing: 18) {
                                    Button("Renommer") { newName = d.name; renaming = d }
                                    Button("Retirer", role: .destructive) { removing = d }
                                }.font(.brandMono(12, .semibold))
                            }
                        }
                    }
                } else { ProgressView().frame(maxWidth: .infinity).padding(30) }
            }
            .padding(.horizontal, 18).padding(.bottom, 30)
        }
        .background(Brand.background.ignoresSafeArea())
        .navigationTitle("Postes OBS").navigationBarTitleDisplayMode(.large)
        .task { await load() }
        .refreshable { await load() }
        .alert("Renommer le poste", isPresented: Binding(get: { renaming != nil }, set: { if !$0 { renaming = nil } })) {
            TextField("Nom", text: $newName)
            Button("Annuler", role: .cancel) {}
            Button("Enregistrer") { if let d = renaming { Task { await act { try await store.core.perform("PATCH", "v1/me/link/devices/\(d.id)", body: ["name": newName]) } } } }
        }
        .confirmationDialog("Retirer ce poste ?", isPresented: Binding(get: { removing != nil }, set: { if !$0 { removing = nil } }), titleVisibility: .visible) {
            Button("Retirer", role: .destructive) { if let d = removing { Task { await act { try await store.core.perform("DELETE", "v1/me/link/devices/\(d.id)") } } } }
        } message: { Text("Le plugin devra être jumelé de nouveau.") }
    }

    private func load() async {
        do { devices = (try await store.core.get("v1/me/link/devices") as DevicesResponse).devices; error = nil }
        catch { self.error = (error as? APIError)?.errorDescription }
    }
    private func pair() async {
        do { code = try await store.core.send("POST", "v1/me/link/pair", body: [:]); error = nil }
        catch { self.error = (error as? APIError).map { $0.errorDescription } ?? "Jumelage impossible." }
    }
    private func act(_ job: () async throws -> Void) async {
        do { try await job(); await load() } catch { self.error = (error as? APIError)?.errorDescription }
    }
}

// MARK: Sauvegardes de scènes

struct BackupsView: View {
    let store: DashStore
    @State private var data: BackupsResponse?
    @State private var error: String?
    @State private var removing: BackupItem?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                if let error { Card { Text(error).font(.footnote).foregroundStyle(Brand.bad) } }
                if let d = data {
                    Card {
                        VStack(alignment: .leading, spacing: 8) {
                            SectionLabel(text: "Espace utilisé")
                            ProgressView(value: Double(d.used), total: Double(max(d.quota, 1))).tint(Brand.accent)
                            Text("\(formatBytes(d.used)) sur \(formatBytes(d.quota))").font(.brandMono(11)).foregroundStyle(Brand.muted)
                        }
                    }
                    if d.backups.isEmpty { Card { Text("Aucune sauvegarde. Elles se font depuis OBS, avec le plugin SYXTEE.").font(.subheadline).foregroundStyle(Brand.muted) } }
                    ForEach(d.backups) { b in
                        Card {
                            HStack {
                                VStack(alignment: .leading, spacing: 5) {
                                    Text(b.name).font(.subheadline.weight(.semibold)).foregroundStyle(Brand.foreground).lineLimit(1)
                                    Text("\(b.collection) · v\(b.version) · \(b.media_count) média\(b.media_count > 1 ? "s" : "") · \(formatBytes(b.size))").font(.brandMono(10)).foregroundStyle(Brand.muted)
                                    Text((parseDate(b.created_at).map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "") + " · OBS \(b.obs_version)").font(.brandMono(10)).foregroundStyle(Brand.faint)
                                }
                                Spacer()
                                Button { removing = b } label: { Image(systemName: "trash").foregroundStyle(Brand.bad) }.accessibilityLabel("Supprimer")
                            }
                        }
                    }
                } else { ProgressView().frame(maxWidth: .infinity).padding(30) }
            }
            .padding(.horizontal, 18).padding(.bottom, 30)
        }
        .background(Brand.background.ignoresSafeArea())
        .navigationTitle("Scènes sauvegardées").navigationBarTitleDisplayMode(.large)
        .task { await load() }
        .refreshable { await load() }
        .confirmationDialog("Supprimer cette sauvegarde ?", isPresented: Binding(get: { removing != nil }, set: { if !$0 { removing = nil } }), titleVisibility: .visible) {
            Button("Supprimer", role: .destructive) {
                if let b = removing { Task { do { try await store.core.perform("DELETE", "v1/me/link/backups/\(b.id)"); await load() } catch { self.error = (error as? APIError)?.errorDescription } } }
            }
        }
    }

    private func load() async {
        do { data = try await store.core.get("v1/me/link/backups"); error = nil } catch { self.error = (error as? APIError)?.errorDescription }
    }
}

// MARK: Invitations au contrôle à distance

struct InvitesView: View {
    let store: DashStore
    @Environment(\.openURL) private var openURL
    @State private var data: InvitesResponse?
    @State private var error: String?
    @State private var showNew = false
    @State private var removing: InviteItem?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                if let error { Card { Text(error).font(.footnote).foregroundStyle(Brand.bad) } }
                if let d = data {
                    HStack { SectionLabel(text: "Invités"); Spacer(); Text("\(d.invites.count)\(d.max.map { " / \($0)" } ?? "")").font(.brandMono(11)).foregroundStyle(Brand.muted) }
                    if d.invites.isEmpty { Card { Text("Aucun invité. Invite quelqu'un à piloter ton OBS (vue, scènes ou contrôle complet).").font(.subheadline).foregroundStyle(Brand.muted) } }
                    ForEach(d.invites) { i in
                        Card {
                            HStack {
                                VStack(alignment: .leading, spacing: 5) {
                                    Text(i.label).font(.subheadline.weight(.semibold)).foregroundStyle(Brand.foreground)
                                    Text("\(i.email ?? "") · \(levelName(i.level))").font(.brandMono(10)).foregroundStyle(Brand.muted)
                                }
                                Spacer()
                                if i.expired { Tag(text: "Expirée", color: Brand.warn) } else if i.connected > 0 { Tag(text: "Connecté", color: Brand.ok) }
                                Button { removing = i } label: { Image(systemName: "trash").foregroundStyle(Brand.bad) }.accessibilityLabel("Retirer")
                            }
                        }
                    }
                } else { ProgressView().frame(maxWidth: .infinity).padding(30) }
            }
            .padding(.horizontal, 18).padding(.bottom, 30)
        }
        .background(Brand.background.ignoresSafeArea())
        .navigationTitle("Invitations").navigationBarTitleDisplayMode(.large)
        .toolbar { ToolbarItem(placement: .primaryAction) { Button { showNew = true } label: { Image(systemName: "plus") } } }
        .sheet(isPresented: $showNew) { NewInviteView(store: store) { Task { await load() } } }
        .task { await load() }
        .refreshable { await load() }
        .confirmationDialog("Retirer cet invité ?", isPresented: Binding(get: { removing != nil }, set: { if !$0 { removing = nil } }), titleVisibility: .visible) {
            Button("Retirer", role: .destructive) {
                if let i = removing { Task { do { try await store.api.perform("DELETE", "api/app/invites/\(i.id)"); await load() } catch { self.error = (error as? APIError)?.errorDescription } } }
            }
        } message: { Text("Son lien cesse de marcher tout de suite.") }
    }

    private func levelName(_ l: String) -> String { ["view": "Vue seule", "scenes": "Scènes", "full": "Contrôle complet"][l] ?? l }
    private func load() async {
        do { data = try await store.api.get("api/app/invites"); error = nil } catch { self.error = (error as? APIError)?.errorDescription }
    }
}

struct NewInviteView: View {
    let store: DashStore
    var onDone: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var label = ""
    @State private var email = ""
    @State private var level = "scenes"
    @State private var hours = 0
    @State private var busy = false
    @State private var error: String?
    @State private var result: CreatedInvite?

    var body: some View {
        NavigationStack {
            Form {
                if let r = result {
                    Section {
                        Text(r.emailed == true ? "Invitation envoyée par e-mail." : (r.note ?? "Copie le lien et envoie-le toi-même.")).font(.subheadline)
                        if let u = r.url { Text(u).font(.brandMono(11)).textSelection(.enabled); Button("Copier le lien") { UIPasteboard.general.string = u } }
                    }.listRowBackground(Brand.surface)
                } else {
                    Section {
                        TextField("Nom (ex. Régie, Ami)", text: $label)
                        TextField("E-mail de l'invité", text: $email).keyboardType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled()
                        Picker("Droits", selection: $level) { Text("Vue seule").tag("view"); Text("Changer de scène").tag("scenes"); Text("Contrôle complet").tag("full") }
                        Picker("Durée", selection: $hours) { Text("Jusqu'à révocation").tag(0); Text("24 heures").tag(24); Text("7 jours").tag(168); Text("30 jours").tag(720) }
                    } footer: { Text("L'invité doit créer un compte, ou se connecter, avec cette adresse e-mail.").font(.footnote).foregroundStyle(Brand.muted) }
                    .listRowBackground(Brand.surface)
                }
                if let error { Section { Text(error).font(.footnote).foregroundStyle(Brand.bad) }.listRowBackground(Brand.surface) }
            }
            .scrollContentBackground(.hidden).background(Brand.background.ignoresSafeArea())
            .navigationTitle("Nouvelle invitation").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button(result == nil ? "Annuler" : "Fermer") { if result != nil { onDone() }; dismiss() } }
                if result == nil { ToolbarItem(placement: .confirmationAction) { Button("Inviter", action: create).disabled(busy || label.isEmpty || !email.contains("@")) } }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func create() {
        busy = true; error = nil
        Task {
            do { result = try await store.api.send("POST", "api/app/invites", body: ["label": label, "email": email, "level": level, "expiresHours": hours]) }
            catch { self.error = (error as? APIError)?.errorDescription }
            busy = false
        }
    }
}

// MARK: Profil

struct ProfileView: View {
    let store: DashStore
    @Environment(\.openURL) private var openURL
    @State private var p: ProfileData?
    @State private var error: String?
    @State private var saved = false
    @State private var busy = false

    var body: some View {
        Form {
            if let error { Section { Text(error).font(.footnote).foregroundStyle(Brand.bad) }.listRowBackground(Brand.surface) }
            if p != nil {
                Section { TextField("Prénom", text: bind(\.first_name)); TextField("Nom", text: bind(\.last_name)) } header: { SectionLabel(text: "Identité") }.listRowBackground(Brand.surface)
                Section { TextField("Bio (160 caractères)", text: bind(\.bio), axis: .vertical).lineLimit(2...4) } header: { SectionLabel(text: "Bio") }.listRowBackground(Brand.surface)
                Section {
                    handle("Twitch", \.twitch); handle("Kick", \.kick); handle("YouTube", \.youtube); handle("TikTok", \.tiktok); handle("Instagram", \.instagram); handle("X", \.x)
                } header: { SectionLabel(text: "Chaînes") }.listRowBackground(Brand.surface)
                Section {
                    Toggle("Afficher ma chaîne sur le site", isOn: Binding(get: { p?.show_on_site ?? false }, set: { p?.show_on_site = $0 }))
                    Toggle("Afficher mon prénom", isOn: Binding(get: { p?.show_first_name ?? false }, set: { p?.show_first_name = $0 }))
                } header: { SectionLabel(text: "Visibilité") }.listRowBackground(Brand.surface)
                Section {
                    LabeledContent("E-mail", value: p?.email ?? "")
                    if let s = p?.support_id { LabeledContent("ID support", value: s) }
                    Button("Changer le mot de passe ou l'e-mail (sur le site)") { openURL(Config.siteURL.appending(path: "dashboard/profil")) }
                } header: { SectionLabel(text: "Compte") }.listRowBackground(Brand.surface)
            } else { ProgressView().frame(maxWidth: .infinity) }
        }
        .scrollContentBackground(.hidden).background(Brand.background.ignoresSafeArea())
        .navigationTitle("Profil").navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .confirmationAction) { Button(saved ? "Enregistré" : "Enregistrer", action: save).disabled(busy || p == nil) } }
        .task { await load() }
    }

    private func bind(_ k: WritableKeyPath<ProfileData, String?>) -> Binding<String> {
        Binding(get: { p?[keyPath: k] ?? "" }, set: { p?[keyPath: k] = $0; saved = false })
    }
    private func handle(_ label: String, _ k: WritableKeyPath<ProfileData, String?>) -> some View {
        HStack { Text(label).foregroundStyle(Brand.muted).frame(width: 84, alignment: .leading); TextField("pseudo", text: bind(k)).textInputAutocapitalization(.never).autocorrectionDisabled() }
    }

    private func load() async {
        do { p = try await store.api.get("api/app/profile"); error = nil } catch { self.error = (error as? APIError)?.errorDescription }
    }

    private func save() {
        guard let p else { return }
        busy = true; error = nil
        Task {
            do {
                let body: [String: Any] = ["first_name": p.first_name ?? "", "last_name": p.last_name ?? "", "bio": p.bio ?? "", "twitch": p.twitch ?? "", "kick": p.kick ?? "",
                    "youtube": p.youtube ?? "", "tiktok": p.tiktok ?? "", "instagram": p.instagram ?? "", "x": p.x ?? "", "show_on_site": p.show_on_site, "show_first_name": p.show_first_name]
                try await store.api.perform("PATCH", "api/app/profile", body: body)
                saved = true; await store.loadMe()
            } catch { self.error = (error as? APIError)?.errorDescription }
            busy = false
        }
    }
}
