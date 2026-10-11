import Foundation
import Observation

/// Données du dashboard (vue d'ensemble, serveurs, directs, compte), rechargées à la demande.
@Observable @MainActor final class DashStore {
    var overview: Overview?
    var relays: RelaysResponse?
    var lives: [LiveSession] = []
    var me: Me?
    var range = "7d"
    var error: String?
    var loading = false

    private let api: API
    init(session: Session) { api = API(session: session) }

    func refreshAll() async {
        loading = true; defer { loading = false }
        async let o: Void = loadOverview()
        async let r: Void = loadRelays()
        async let l: Void = loadLives()
        async let m: Void = loadMe()
        _ = await (o, r, l, m)
    }

    func loadOverview() async { await run { self.overview = try await self.api.get("api/dashboard/overview", query: ["range": self.range]) } }
    func loadRelays() async { await run { self.relays = try await self.api.get("api/app/relays") } }
    func loadLives() async { await run { self.lives = (try await self.api.get("api/app/lives", query: ["limit": "50"]) as LivesResponse).lives } }
    func loadMe() async { await run { self.me = try await self.api.get("api/app/me") } }

    private func run(_ work: @escaping () async throws -> Void) async {
        do { try await work(); error = nil }
        catch { self.error = (error as? APIError)?.errorDescription ?? "Erreur." }
    }
}
