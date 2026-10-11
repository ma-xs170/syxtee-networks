import SwiftUI

/// Tokens de la marque SYXTEE (mêmes valeurs que globals.css du site, mode sombre).
enum Brand {
    static let background = Color(red: 7 / 255, green: 7 / 255, blue: 8 / 255)
    static let surface = Color(red: 13 / 255, green: 13 / 255, blue: 16 / 255)
    static let surface2 = Color(red: 20 / 255, green: 20 / 255, blue: 24 / 255)
    static let foreground = Color(red: 250 / 255, green: 250 / 255, blue: 250 / 255)
    static let muted = Color(red: 143 / 255, green: 148 / 255, blue: 157 / 255)
    static let faint = Color(red: 91 / 255, green: 95 / 255, blue: 102 / 255)
    static let line = Color.white.opacity(0.085)
    static let lineStrong = Color.white.opacity(0.17)
    static let accent = foreground
    static let onAccent = Color(red: 10 / 255, green: 10 / 255, blue: 10 / 255)
    static let live = Color(red: 1, green: 59 / 255, blue: 48 / 255)       // réservé aux états « en direct »
    static let bad = Color(red: 242 / 255, green: 85 / 255, blue: 90 / 255)
    static let warn = Color(red: 245 / 255, green: 165 / 255, blue: 36 / 255)
    static let ok = Color(red: 61 / 255, green: 214 / 255, blue: 140 / 255)
}

extension Font {
    static func brandMono(_ size: CGFloat = 12, _ weight: Weight = .medium) -> Font { .system(size: size, weight: weight, design: .monospaced) }
    static func brandSerif(_ size: CGFloat) -> Font { .system(size: size, weight: .semibold, design: .serif) }
}

struct SectionLabel: View {
    let text: String
    var body: some View { Text(text.uppercased()).font(.brandMono(11, .semibold)).tracking(1.4).foregroundStyle(Brand.muted) }
}

/// Carte de contenu : surface sombre, filet fin.
struct Card<Content: View>: View {
    @ViewBuilder let content: Content
    var body: some View {
        content.padding(16).frame(maxWidth: .infinity, alignment: .leading)
            .background(Brand.surface, in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(Brand.line))
    }
}

/// Pastille mono (état, protocole).
struct Tag: View {
    let text: String
    var color: Color = Brand.muted
    var body: some View {
        Text(text.uppercased()).font(.brandMono(10, .semibold)).tracking(1).foregroundStyle(color)
            .padding(.horizontal, 8).padding(.vertical, 4)
            .background(color.opacity(0.12), in: Capsule())
            .overlay(Capsule().stroke(color.opacity(0.35)))
    }
}

func formatDuration(_ s: Double) -> String {
    let t = Int(s.rounded())
    if t >= 3600 { return String(format: "%dh%02d", t / 3600, t / 60 % 60) }
    if t >= 60 { return String(format: "%d min", t / 60) }
    return "\(t) s"
}

func formatKbps(_ k: Double) -> String { k >= 1000 ? String(format: "%.1f Mb/s", k / 1000) : "\(Int(k)) kb/s" }

func parseDate(_ s: String?) -> Date? {
    guard let s else { return nil }
    let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let d = f.date(from: s) { return d }
    f.formatOptions = [.withInternetDateTime]
    return f.date(from: s)
}
