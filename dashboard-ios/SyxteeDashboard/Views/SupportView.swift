import SwiftUI

struct SupportView: View {
    let store: DashStore
    @State private var state = "open"
    @State private var list: SupportList?
    @State private var error: String?
    @State private var showNew = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Picker("État", selection: $state) { Text("En cours").tag("open"); Text("Résolus").tag("resolved"); Text("Tous").tag("all") }.pickerStyle(.segmented)
                if let error { Card { Text(error).font(.footnote).foregroundStyle(Brand.bad) } }
                if let list {
                    if list.tickets.isEmpty { Card { Text("Aucune demande ici.").font(.subheadline).foregroundStyle(Brand.muted) } }
                    ForEach(list.tickets) { t in
                        NavigationLink { TicketView(store: store, ticketID: t.id, onChange: { Task { await load() } }) } label: { TicketRow(ticket: t) }.buttonStyle(.plain)
                    }
                    if let sid = list.support_id {
                        Card { VStack(alignment: .leading, spacing: 6) { SectionLabel(text: "Ton ID support"); Text(sid).font(.brandMono(14, .semibold)).foregroundStyle(Brand.foreground).textSelection(.enabled) } }
                    }
                } else { ProgressView().frame(maxWidth: .infinity).padding(30) }
            }
            .padding(.horizontal, 18).padding(.bottom, 30)
        }
        .background(Brand.background.ignoresSafeArea())
        .navigationTitle("Assistance").navigationBarTitleDisplayMode(.large)
        .toolbar { ToolbarItem(placement: .primaryAction) { Button { showNew = true } label: { Image(systemName: "square.and.pencil") }.accessibilityLabel("Nouvelle demande") } }
        .sheet(isPresented: $showNew) { NewTicketView(store: store) { Task { await load() } } }
        .task(id: state) { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        do { list = try await store.api.get("api/app/support", query: ["state": state]); error = nil }
        catch { self.error = (error as? APIError)?.errorDescription }
    }
}

struct TicketRow: View {
    let ticket: SupportTicket
    var body: some View {
        Card {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(ticket.subject).font(.subheadline.weight(.semibold)).foregroundStyle(Brand.foreground).lineLimit(2)
                    Text(ticket.category_label.uppercased()).font(.brandMono(10)).tracking(1).foregroundStyle(Brand.muted)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 6) {
                    Tag(text: ticket.status == "open" ? "En cours" : "Résolu", color: ticket.status == "open" ? Brand.warn : Brand.ok)
                    if ticket.status == "open", ticket.last_from == "staff" { Tag(text: "Réponse de l'équipe", color: Brand.ok) }
                }
            }
        }
    }
}

struct TicketView: View {
    let store: DashStore
    let ticketID: String
    var onChange: () -> Void = {}
    @Environment(\.dismiss) private var dismiss
    @State private var thread: SupportThread?
    @State private var reply = ""
    @State private var busy = false
    @State private var error: String?
    @State private var confirmDelete = false

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    if let t = thread {
                        HStack { Text(t.ticket.subject).font(.brandSerif(22)).foregroundStyle(Brand.foreground); Spacer() }
                        HStack(spacing: 8) { Tag(text: t.ticket.category_label); Tag(text: t.ticket.status == "open" ? "En cours" : "Résolu", color: t.ticket.status == "open" ? Brand.warn : Brand.ok) }
                        ForEach(t.messages) { m in bubble(m) }
                    } else { ProgressView().frame(maxWidth: .infinity).padding(30) }
                    if let error { Text(error).font(.footnote).foregroundStyle(Brand.bad) }
                }
                .padding(.horizontal, 18).padding(.vertical, 12)
            }
            HStack(spacing: 10) {
                TextField("Ton message", text: $reply, axis: .vertical).lineLimit(1...4)
                    .padding(.horizontal, 14).padding(.vertical, 10).background(Brand.surface, in: RoundedRectangle(cornerRadius: 18)).overlay(RoundedRectangle(cornerRadius: 18).stroke(Brand.line))
                Button(action: send) { Image(systemName: "arrow.up.circle.fill").font(.system(size: 34)) }
                    .disabled(busy || reply.trimmingCharacters(in: .whitespaces).isEmpty).foregroundStyle(Brand.accent)
            }
            .padding(12).background(Brand.background)
        }
        .background(Brand.background.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    if thread?.ticket.status == "open" { Button("Marquer comme résolu") { act("POST", "close") } }
                    Button("Supprimer la demande", role: .destructive) { confirmDelete = true }
                } label: { Image(systemName: "ellipsis.circle") }
            }
        }
        .confirmationDialog("Supprimer cette demande ?", isPresented: $confirmDelete, titleVisibility: .visible) { Button("Supprimer", role: .destructive) { act("DELETE", nil, leave: true) } }
        .task { await load() }
    }

    private func bubble(_ m: SupportMessage) -> some View {
        let mine = !m.from_staff
        return VStack(alignment: mine ? .trailing : .leading, spacing: 4) {
            Text(m.body).font(.subheadline).foregroundStyle(mine ? Brand.onAccent : Brand.foreground)
                .padding(.horizontal, 14).padding(.vertical, 10)
                .background(mine ? AnyShapeStyle(Brand.accent) : AnyShapeStyle(Brand.surface), in: RoundedRectangle(cornerRadius: 16))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(mine ? Color.clear : Brand.line))
            Text((m.from_staff ? (m.signature ?? "Équipe SYXTEE") + " · " : "") + (parseDate(m.created_at).map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "")).font(.brandMono(9)).foregroundStyle(Brand.faint)
        }
        .frame(maxWidth: .infinity, alignment: mine ? .trailing : .leading)
    }

    private func load() async {
        do { thread = try await store.api.get("api/app/support/\(ticketID)"); error = nil } catch { self.error = (error as? APIError)?.errorDescription }
    }

    private func send() {
        let text = reply.trimmingCharacters(in: .whitespaces)
        busy = true
        Task {
            do { try await store.api.perform("POST", "api/app/support/\(ticketID)", body: ["body": text]); reply = ""; await load(); onChange() }
            catch { self.error = (error as? APIError)?.errorDescription }
            busy = false
        }
    }

    private func act(_ method: String, _ sub: String?, leave: Bool = false) {
        Task {
            do { try await store.api.perform(method, "api/app/support/\(ticketID)" + (sub.map { "/\($0)" } ?? "")); onChange(); if leave { dismiss() } else { await load() } }
            catch { self.error = (error as? APIError)?.errorDescription }
        }
    }
}

struct NewTicketView: View {
    let store: DashStore
    var onDone: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var categories: [SupportCategory] = []
    @State private var category: SupportCategory?
    @State private var subject = ""
    @State private var message = ""
    @State private var fields: [String: String] = [:]
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Catégorie", selection: Binding(get: { category?.id ?? "" }, set: { id in category = categories.first { $0.id == id }; fields = [:] })) {
                        Text("Choisir…").tag("")
                        ForEach(categories) { Text($0.label).tag($0.id) }
                    }
                } footer: { if let c = category { Text(c.form.intro).font(.footnote).foregroundStyle(Brand.muted) } }
                .listRowBackground(Brand.surface)
                if let c = category {
                    Section {
                        TextField(c.form.subjectPlaceholder, text: $subject)
                        ForEach(c.form.fields) { f in
                            if f.type == "select" {
                                Picker(f.label + (f.required == true ? " *" : ""), selection: Binding(get: { fields[f.name] ?? "" }, set: { fields[f.name] = $0 })) {
                                    Text("—").tag(""); ForEach(f.options ?? [], id: \.self) { Text($0).tag($0) }
                                }
                            } else { TextField(f.label + (f.required == true ? " *" : ""), text: Binding(get: { fields[f.name] ?? "" }, set: { fields[f.name] = $0 }), prompt: Text(f.placeholder ?? "")) }
                        }
                    }
                    .listRowBackground(Brand.surface)
                    Section {
                        TextField(c.form.messagePlaceholder, text: $message, axis: .vertical).lineLimit(4...10)
                    } header: { Text(c.form.messageLabel) }
                    .listRowBackground(Brand.surface)
                }
                if let error { Section { Text(error).font(.footnote).foregroundStyle(Brand.bad) }.listRowBackground(Brand.surface) }
            }
            .scrollContentBackground(.hidden).background(Brand.background.ignoresSafeArea())
            .navigationTitle("Nouvelle demande").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuler") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Envoyer", action: submit).disabled(busy || category == nil || subject.count < 3) }
            }
            .task { categories = ((try? await store.api.get("api/app/support/categories")) as SupportCategories?)?.categories ?? [] }
        }
        .preferredColorScheme(.dark)
    }

    private func submit() {
        guard let c = category else { return }
        busy = true; error = nil
        Task {
            do {
                try await store.api.perform("POST", "api/app/support", body: ["category": c.id, "subject": subject, "body": message, "fields": fields])
                onDone(); dismiss()
            } catch { self.error = (error as? APIError)?.errorDescription }
            busy = false
        }
    }
}
