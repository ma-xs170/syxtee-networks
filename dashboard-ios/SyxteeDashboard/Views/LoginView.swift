import SwiftUI

struct LoginView: View {
    @Environment(Session.self) private var session
    @Environment(\.openURL) private var openURL
    @State private var email = ""
    @State private var password = ""
    @State private var busy = false
    @State private var error: String?
    @FocusState private var focus: Field?
    private enum Field { case email, password }
    private var canSubmit: Bool { !busy && email.contains("@") && !password.isEmpty }

    var body: some View {
        ZStack {
            Backdrop()
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    Spacer(minLength: 60)
                    VStack(alignment: .leading, spacing: 14) {
                        Image("Logo").resizable().scaledToFit().frame(height: 56)
                        Text("DASHBOARD").font(.brandMono(11, .semibold)).tracking(2).foregroundStyle(Brand.muted)
                        Text("Ta caméra, nos serveurs, ton OBS.").font(.brandSerif(32)).foregroundStyle(Brand.foreground)
                        Text("Connecte-toi avec ton compte SYXTEE.").font(.subheadline).foregroundStyle(Brand.muted)
                    }
                    VStack(spacing: 12) {
                        field("E-mail", text: $email, secure: false, id: .email).textContentType(.username).keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never).autocorrectionDisabled().submitLabel(.next).onSubmit { focus = .password }
                        field("Mot de passe", text: $password, secure: true, id: .password).textContentType(.password).submitLabel(.go).onSubmit(submit)
                        if let error { Text(error).font(.footnote).foregroundStyle(Brand.bad).frame(maxWidth: .infinity, alignment: .leading) }
                        Button(action: submit) {
                            ZStack { if busy { ProgressView().tint(Brand.onAccent) } else { Text("Se connecter").fontWeight(.semibold) } }
                                .frame(maxWidth: .infinity, minHeight: 50)
                                .background(Brand.accent.opacity(canSubmit ? 1 : 0.35), in: Capsule()).foregroundStyle(Brand.onAccent)
                        }.disabled(!canSubmit)
                        HStack {
                            Button("Mot de passe oublié") { openURL(Config.resetURL) }
                            Spacer()
                            Button("Créer un compte") { openURL(Config.signUpURL) }
                        }.font(.footnote).foregroundStyle(Brand.muted)
                    }
                }
                .padding(.horizontal, 28).padding(.bottom, 40).frame(maxWidth: 520)
                .frame(maxWidth: .infinity)
            }
            .scrollBounceBehavior(.basedOnSize)
        }
    }

    @ViewBuilder private func field(_ title: String, text: Binding<String>, secure: Bool, id: Field) -> some View {
        Group { if secure { SecureField(title, text: text) } else { TextField(title, text: text) } }
            .focused($focus, equals: id)
            .padding(.horizontal, 16).frame(minHeight: 50)
            .background(Brand.surface, in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(focus == id ? Brand.lineStrong : Brand.line))
            .foregroundStyle(Brand.foreground)
    }

    private func submit() {
        guard canSubmit else { return }
        busy = true; error = nil; focus = nil
        Task {
            do { try await session.signIn(email: email.trimmingCharacters(in: .whitespaces).lowercased(), password: password) }
            catch { self.error = (error as? AuthError)?.errorDescription ?? AuthError.other.errorDescription }
            busy = false
        }
    }
}
