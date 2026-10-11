import Foundation
import Observation

enum AuthError: LocalizedError {
    case invalid, unverified, network, rateLimited, other
    var errorDescription: String? {
        switch self {
        case .invalid: "E-mail ou mot de passe incorrect."
        case .unverified: "Confirme d'abord ton e-mail (lien reçu par courrier)."
        case .network: "Connexion impossible. Vérifie ton réseau."
        case .rateLimited: "Trop de tentatives. Réessaie dans quelques minutes."
        case .other: "Connexion refusée. Réessaie."
        }
    }
}

/// Session SYXTEE (Supabase, e-mail + mot de passe). Les jetons restent dans le Keychain.
@Observable @MainActor final class Session {
    enum State { case loading, signedOut, signedIn }

    private(set) var state: State = .loading
    private(set) var email: String?
    private(set) var accessToken: String?

    private struct Tokens: Decodable {
        let access_token: String
        let refresh_token: String
        let user: User?
        struct User: Decodable { let email: String? }
    }

    func restore() async {
        guard let refresh = Keychain.get("refresh") else { state = .signedOut; return }
        do { try await grant("refresh_token", ["refresh_token": refresh]) }
        catch AuthError.network {
            if let a = Keychain.get("access") { accessToken = a; email = Keychain.get("email"); state = .signedIn } else { state = .signedOut }
        } catch { clear() }
    }

    func signIn(email: String, password: String) async throws { try await grant("password", ["email": email, "password": password]) }

    func signOut() {
        if let token = accessToken {
            var r = URLRequest(url: Config.supabaseURL.appending(path: "auth/v1/logout"))
            r.httpMethod = "POST"
            r.setValue(Config.supabaseKey, forHTTPHeaderField: "apikey")
            r.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            URLSession.shared.dataTask(with: r).resume()
        }
        clear()
    }

    /// Rafraîchit le jeton (appelé par l'API sur un 401). Faux si la session n'est plus valide.
    func refresh() async -> Bool {
        guard let refresh = Keychain.get("refresh") else { clear(); return false }
        do { try await grant("refresh_token", ["refresh_token": refresh]); return true }
        catch AuthError.network { return false }
        catch { clear(); return false }
    }

    private func clear() {
        Keychain.remove("refresh"); Keychain.remove("access"); Keychain.remove("email")
        accessToken = nil; email = nil; state = .signedOut
    }

    private func grant(_ type: String, _ body: [String: String]) async throws {
        var comps = URLComponents(url: Config.supabaseURL.appending(path: "auth/v1/token"), resolvingAgainstBaseURL: false)!
        comps.queryItems = [URLQueryItem(name: "grant_type", value: type)]
        var r = URLRequest(url: comps.url!)
        r.httpMethod = "POST"
        r.timeoutInterval = 15
        r.setValue(Config.supabaseKey, forHTTPHeaderField: "apikey")
        r.setValue("application/json", forHTTPHeaderField: "Content-Type")
        r.httpBody = try JSONEncoder().encode(body)
        let data: Data, resp: URLResponse
        do { (data, resp) = try await URLSession.shared.data(for: r) } catch { throw AuthError.network }
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        guard code == 200 else {
            if code == 429 { throw AuthError.rateLimited }
            if String(data: data, encoding: .utf8)?.contains("email_not_confirmed") == true { throw AuthError.unverified }
            if code == 400 || code == 401 || code == 422 { throw AuthError.invalid }
            throw AuthError.other
        }
        guard let t = try? JSONDecoder().decode(Tokens.self, from: data) else { throw AuthError.other }
        Keychain.set(t.access_token, for: "access"); Keychain.set(t.refresh_token, for: "refresh")
        if let e = t.user?.email ?? body["email"] { Keychain.set(e, for: "email"); email = e }
        accessToken = t.access_token
        state = .signedIn
    }
}
