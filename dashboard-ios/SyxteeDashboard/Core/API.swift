import Foundation

enum APIError: LocalizedError {
    case unauthorized, forbidden(String), network, server(Int), decoding
    var errorDescription: String? {
        switch self {
        case .unauthorized: "Session expirée. Reconnecte-toi."
        case .forbidden(let c): c == "suspended" ? "Compte suspendu." : "Accès refusé."
        case .network: "Serveur injoignable. Vérifie ton réseau."
        case .server(let c): "Erreur serveur (\(c))."
        case .decoding: "Réponse inattendue du serveur."
        }
    }
}

/// Appels à l'API du site (/api/...), authentifiés par le jeton Supabase de la session.
@MainActor struct API {
    let session: Session

    func get<T: Decodable>(_ path: String, query: [String: String] = [:]) async throws -> T {
        try await request(path, query: query, retry: true)
    }

    private func request<T: Decodable>(_ path: String, query: [String: String], retry: Bool) async throws -> T {
        guard let token = session.accessToken else { throw APIError.unauthorized }
        var comps = URLComponents(url: Config.siteURL.appending(path: path), resolvingAgainstBaseURL: false)!
        if !query.isEmpty { comps.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) } }
        var r = URLRequest(url: comps.url!)
        r.timeoutInterval = 20
        r.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let data: Data, resp: URLResponse
        do { (data, resp) = try await URLSession.shared.data(for: r) } catch { throw APIError.network }
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        switch code {
        case 200: break
        case 401:
            // Jeton expiré : on le rafraîchit une fois puis on réessaie.
            if retry, await session.refresh() { return try await request(path, query: query, retry: false) }
            throw APIError.unauthorized
        case 403: throw APIError.forbidden((try? JSONDecoder().decode([String: String].self, from: data))?["error"] ?? "")
        default: throw APIError.server(code)
        }
        do { return try JSONDecoder().decode(T.self, from: data) } catch { throw APIError.decoding }
    }
}
