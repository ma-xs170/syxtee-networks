import Foundation

enum APIError: LocalizedError {
    case unauthorized, forbidden(String), network, server(Int), decoding, message(String)
    var errorDescription: String? {
        switch self {
        case .unauthorized: "Session expirée. Reconnecte-toi."
        case .forbidden(let c): c == "suspended" ? "Compte suspendu." : "Accès refusé."
        case .network: "Serveur injoignable. Vérifie ton réseau."
        case .server(let c): "Erreur serveur (\(c))."
        case .decoding: "Réponse inattendue du serveur."
        case .message(let m): m
        }
    }
}

/// Appels à l'API du site (/api/...), authentifiés par le jeton Supabase de la session.
@MainActor struct API {
    let session: Session
    var base: URL = Config.siteURL

    func get<T: Decodable>(_ path: String, query: [String: String] = [:]) async throws -> T {
        try await request(path, query: query, retry: true)
    }

    /// Écriture (POST, PATCH, DELETE) avec un corps JSON ; renvoie le message d'erreur du site s'il y en a un.
    func send<T: Decodable>(_ method: String, _ path: String, body: [String: Any]? = nil) async throws -> T {
        try await request(path, query: [:], retry: true, method: method, body: body)
    }

    /// Même chose quand seule la réussite compte.
    func perform(_ method: String, _ path: String, body: [String: Any]? = nil) async throws {
        let _: Ack = try await send(method, path, body: body)
    }

    struct Ack: Decodable { var ok: Bool? }

    private func request<T: Decodable>(_ path: String, query: [String: String], retry: Bool, method: String = "GET", body: [String: Any]? = nil) async throws -> T {
        guard let token = session.accessToken else { throw APIError.unauthorized }
        var comps = URLComponents(url: base.appending(path: path), resolvingAgainstBaseURL: false)!
        if !query.isEmpty { comps.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) } }
        var r = URLRequest(url: comps.url!)
        r.timeoutInterval = 25
        r.httpMethod = method
        r.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        if let body { r.httpBody = try? JSONSerialization.data(withJSONObject: body); r.setValue("application/json", forHTTPHeaderField: "Content-Type") }
        let data: Data, resp: URLResponse
        do { (data, resp) = try await URLSession.shared.data(for: r) } catch { throw APIError.network }
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        switch code {
        case 200: break
        case 401:
            // Jeton expiré : on le rafraîchit une fois puis on réessaie.
            if retry, await session.refresh() { return try await request(path, query: query, retry: false, method: method, body: body) }
            throw APIError.unauthorized
        case 403: throw APIError.forbidden((try? JSONDecoder().decode([String: String].self, from: data))?["error"] ?? "")
        case 400, 404:
            if let m = (try? JSONDecoder().decode([String: String].self, from: data))?["error"] { throw APIError.message(m) }
            throw APIError.server(code)
        default: throw APIError.server(code)
        }
        do { return try JSONDecoder().decode(T.self, from: data) } catch { throw APIError.decoding }
    }
}
