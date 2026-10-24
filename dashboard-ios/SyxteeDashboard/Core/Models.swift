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
    }
    let id: String
    let name: String
    let protocol_: String
    let server: String
    let archived: Bool
    let live: Bool
    let mode: String
    let record: Bool
    let recordFormat: String?
    let recordAvailable: Bool?
    let regieAvailable: Bool?
    let switchTrigger: String?
    let urls: Urls
    let obsSrtUrl: String
    let lastLiveAt: String?

    enum CodingKeys: String, CodingKey {
        case id, name, server, archived, live, mode, record, urls
        case protocol_ = "protocol", obsSrtUrl = "obs_srt_url", lastLiveAt = "last_live_at"
        case recordFormat = "record_format", recordAvailable = "record_available", regieAvailable = "regie_available", switchTrigger = "switch_trigger"
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


struct RelayServer: Decodable, Identifiable, Equatable {
    let id: String, city: String, country: String, cc: String
    let available: Bool
    let maintenance: Bool?
    var flag: String { String(String.UnicodeScalarView(cc.uppercased().unicodeScalars.compactMap { UnicodeScalar(0x1F1A5 + $0.value) })) }
    var title: String { "\(flag) \(city), \(country)" }
}
struct ServersResponse: Decodable { let servers: [RelayServer] }

// Support
struct SupportTicket: Decodable, Identifiable, Equatable {
    let id: String, subject: String, status: String
    let updated_at: String
    let last_from: String
    let category_label: String
}
struct SupportList: Decodable { let tickets: [SupportTicket]; let counts: Counts; let support_id: String?
    struct Counts: Decodable, Equatable { let open: Int; let resolved: Int } }
struct SupportMessage: Decodable, Identifiable, Equatable {
    let id: String, body: String, created_at: String, from_staff: Bool
    let kind: String?
    let signature: String?
}
struct SupportThread: Decodable { let ticket: SupportTicket; let messages: [SupportMessage] }
struct SupportField: Decodable, Identifiable, Equatable { let name: String, label: String, type: String; let options: [String]?; let placeholder: String?; let required: Bool?; var id: String { name } }
struct SupportCategory: Decodable, Identifiable, Equatable {
    struct Form: Decodable, Equatable { let title: String, intro: String, subjectPlaceholder: String, messageLabel: String, messagePlaceholder: String; let fields: [SupportField] }
    let id: String, label: String, hint: String
    let form: Form
}
struct SupportCategories: Decodable { let categories: [SupportCategory] }
struct CreatedTicket: Decodable { let id: String? }

// Abonnement
struct Billing: Decodable {
    struct Current: Decodable { let name: String, id: String; let until: String?; let relays: Int, streams: Int }
    struct State: Decodable { let status: String?; let interval: String?; let renews: Bool; let cancel_at_period_end: Bool; let period_end: String?; let has_customer: Bool }
    struct Price: Decodable { let amount: String, cents: Int }
    struct Tier: Decodable, Identifiable { let id: String, name: String, pitch: String; let points: [String]; let prices: [String: Price]; let featured: Bool? }
    let current: Current
    let billing: State
    let can_subscribe: Bool
    let tiers: [Tier]
}
struct UrlResponse: Decodable { let url: String? }

// Statistiques
struct Stats: Decodable {
    struct Day: Decodable, Identifiable { let day: String; let minutes: Double; var id: String { day } }
    let days: Int
    let any: Bool
    let kpis: Kpis
    let previous: Kpis
    let longest: LiveSession?
    let reconnects: Int
    let short: Int
    let daily: [Day]
}


struct ObsDevice: Decodable, Identifiable, Equatable {
    let id: String, name: String, platform: String, host: String
    let plugin_version: String
    let online: Bool
    let last_seen: String?
}
struct DevicesResponse: Decodable { let devices: [ObsDevice] }
struct PairCode: Decodable { let code: String; let expires_in: Int }

struct BackupItem: Decodable, Identifiable, Equatable {
    let id: String, name: String, collection: String
    let version: Int, size: Int
    let media_count: Int
    let obs_version: String, host: String, created_at: String
}
struct BackupsResponse: Decodable { let backups: [BackupItem]; let used: Int; let quota: Int }

struct InviteItem: Decodable, Identifiable, Equatable {
    let id: String, label: String, level: String
    let email: String?
    let expires_at: String?
    let last_used_at: String?
    let connected: Int
    let expired: Bool
}
struct InvitesResponse: Decodable { let invites: [InviteItem]; let max: Int?; let plan: String }
struct CreatedInvite: Decodable { let url: String?; let emailed: Bool?; let note: String? }

struct ProfileData: Decodable, Equatable {
    var email: String?
    var first_name: String?, last_name: String?, username: String?
    var bio: String?, country: String?
    var twitch: String?, kick: String?, youtube: String?, tiktok: String?, instagram: String?, x: String?
    var show_on_site: Bool
    var show_first_name: Bool
    var support_id: String?
}

func formatBytes(_ b: Int) -> String { ByteCountFormatter.string(fromByteCount: Int64(b), countStyle: .file) }
