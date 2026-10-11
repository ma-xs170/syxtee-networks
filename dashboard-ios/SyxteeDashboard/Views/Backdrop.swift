import SwiftUI

/// Fond du site : gris très foncé, volutes grises floues, étoiles « + » et points qui scintillent.
struct Backdrop: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private struct Star: Identifiable {
        let id: Int
        let x: CGFloat, y: CGFloat, size: CGFloat, plus: Bool, phase: Double
    }

    private static let stars: [Star] = {
        var g = SeededGenerator(seed: 7)
        return (0..<70).map { i in
            Star(id: i, x: .random(in: 0...1, using: &g), y: .random(in: 0...1, using: &g),
                 size: .random(in: 1.5...3.5, using: &g), plus: i % 4 == 0, phase: .random(in: 0...6, using: &g))
        }
    }()

    var body: some View {
        GeometryReader { geo in
            ZStack {
                Color(red: 0.027, green: 0.027, blue: 0.031)
                // Volutes
                Ellipse().fill(.white.opacity(0.30)).frame(width: geo.size.width * 0.34, height: geo.size.height * 0.55)
                    .blur(radius: 70).position(x: geo.size.width * 0.27, y: geo.size.height * 0.05)
                Ellipse().fill(.white.opacity(0.26)).frame(width: geo.size.width * 0.22, height: geo.size.height * 1.1)
                    .blur(radius: 60).position(x: geo.size.width * 0.93, y: geo.size.height * 0.45)
                Ellipse().fill(.black.opacity(0.9)).frame(width: geo.size.width * 0.14, height: geo.size.height * 0.5)
                    .blur(radius: 40).position(x: geo.size.width * 0.9, y: geo.size.height * 0.45)
                Ellipse().fill(.white.opacity(0.14)).frame(width: geo.size.width * 0.6, height: geo.size.height * 0.3)
                    .blur(radius: 60).position(x: geo.size.width * 0.35, y: geo.size.height * 0.98)
                // Étoiles
                TimelineView(.animation(minimumInterval: 1 / 15, paused: reduceMotion)) { ctx in
                    let t = ctx.date.timeIntervalSinceReferenceDate
                    Canvas { c, size in
                        for s in Self.stars {
                            let a = reduceMotion ? 0.55 : 0.25 + 0.55 * (0.5 + 0.5 * sin(t * 0.9 + s.phase))
                            let p = CGPoint(x: s.x * size.width, y: s.y * size.height)
                            if s.plus {
                                var path = Path()
                                path.move(to: CGPoint(x: p.x - 5, y: p.y)); path.addLine(to: CGPoint(x: p.x + 5, y: p.y))
                                path.move(to: CGPoint(x: p.x, y: p.y - 5)); path.addLine(to: CGPoint(x: p.x, y: p.y + 5))
                                c.stroke(path, with: .color(.white.opacity(a * 0.6)), lineWidth: 0.8)
                            } else {
                                c.fill(Path(ellipseIn: CGRect(x: p.x, y: p.y, width: s.size, height: s.size)), with: .color(.white.opacity(a)))
                            }
                        }
                    }
                }
            }
            .ignoresSafeArea()
        }
        .accessibilityHidden(true)
    }
}

/// Générateur déterministe : le champ d'étoiles ne bouge pas d'un lancement à l'autre.
struct SeededGenerator: RandomNumberGenerator {
    private var state: UInt64
    init(seed: UInt64) { state = seed &* 0x9E3779B97F4A7C15 | 1 }
    mutating func next() -> UInt64 {
        state ^= state << 13; state ^= state >> 7; state ^= state << 17
        return state
    }
}
