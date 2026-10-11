import Foundation

// Formes JSON renvoyées par l'API du site (voir src/lib/dashboard-data.ts et src/lib/core.ts).

struct Kpis: Decodable, Equatable {
    var seconds = 0.0, count = 0, avgSeconds = 0.0, avgKbps = 0.0, peakKbps = 0.0
}

struct LiveSession: Decodable, Identifiable, Equatable {
    let id: String
    let startedAt: String
    let endedAt: String?
    let durationS: Double
    let avgKbps: Double
    let peakKbps: Double
    let reconnects: Int
    let relay: String
    let deviceName: String?
    let bitrateSeries: [Double]
    let relayInfo: RelayName?
    struct RelayName: Decodable, Equatable { let name: String }

    enum CodingKeys: String, CodingKey {
        case id, relay, reconnects
        case startedAt = "started_at", endedAt = "ended_at", durationS = "duration_s"
        case avgKbps = "avg_kbps", peakKbps = "peak_kbps", deviceName = "device_name"
        case bitrateSeries = "bitrate_series", relayInfo = "relay_info"
    }

    init(from d: Decoder) throws {
        let c = try d.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        startedAt = try c.decode(String.self, forKey: .startedAt)
        endedAt = try c.decodeIfPresent(String.self, forKey: .endedAt)
        durationS = (try? c.decode(Double.self, forKey: .durationS)) ?? 0
        avgKbps = (try? c.decode(Double.self, forKey: .avgKbps)) ?? 0
        peakKbps = (try? c.decode(Double.self, forKey: .peakKbps)) ?? 0
        reconnects = (try? c.decode(Int.self, forKey: .reconnects)) ?? 0
        relay = (try? c.decode(String.self, forKey: .relay)) ?? ""
        deviceName = try? c.decodeIfPresent(String.self, forKey: .deviceName)
        bitrateSeries = (try? c.decode([Double].self, forKey: .bitrateSeries)) ?? []
        relayInfo = try? c.decodeIfPresent(RelayName.self, forKey: .relayInfo)
    }

    var name: String { relayInfo?.name ?? (relay.isEmpty ? "Direct" : relay) }
    var date: Date? { parseDate(startedAt) }
    var isLive: Bool { endedAt == nil }
}

struct DashAlert: Decodable, Identifiable, Equatable {
    let id: String, text: String, href: String, cta: String
}

struct Overview: Decodable, Equatable {
    struct Day: Decodable, Equatable, Identifiable { let day: String; let minutes: Double; var id: String { day } }
    struct Counts: Decodable, Equatable { let active: Int; let max: Int }
    struct PlanInfo: Decodable, Equatable { let name: String; let streams: Int }
    let range: String
    let kpis: Kpis
    let previous: Kpis
    let daily: [Day]
    let last: LiveSession?
    let recent: [LiveSession]
    let hasEverStreamed: Bool
    let alerts: [DashAlert]
    let relays: Counts
    let coreStatus: String
    let plan: PlanInfo
}

struct RelayItem: Decodable, Identifiable, Equatable {
    struct Urls: Decodable, Equatable {
        var srtla_url: String?, srt_url: String?, rtmp_server: String?, rtmp_key: String?, rtmp_url: String?
        var rist_url: String?
    }
    let id: String
    let name: String
    let protocol_: String
    let server: String
    let archived: Bool
    let live: Bool
    let mode: String
    let record: Bool
    let urls: Urls
    let obsSrtUrl: String
    let lastLiveAt: String?

    enum CodingKeys: String, CodingKey {
        case id, name, server, archived, live, mode, record, urls
        case protocol_ = "protocol", obsSrtUrl = "obs_srt_url", lastLiveAt = "last_live_at"
    }
}

struct RelaysResponse: Decodable { let relays: [RelayItem]; let status: String; let max: Int }
struct LivesResponse: Decodable { let lives: [LiveSession] }

struct Me: Decodable, Equatable {
    struct PlanInfo: Decodable, Equatable { let name: String; let streams: Int; let relays: Int }
    let id: String
    let email: String?
    let name: String
    let username: String?
    let plan: PlanInfo
    let plan_until: String?
    let billing_status: String?
}
