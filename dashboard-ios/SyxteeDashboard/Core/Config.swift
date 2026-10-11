import Foundation

enum Config {
    // Clé « publishable » Supabase : publique par conception (la même que sur le site).
    static let supabaseURL = URL(string: "https://lhtxardbrdpbfojedpvc.supabase.co")!
    static let supabaseKey = "sb_publishable_D0x3TqhbGz0vMYZG6MrcAg_bGIuFl76"
    /// Site et API (même domaine que le dashboard web).
    static let siteURL = URL(string: "https://www.syxtee-networks.fr")!
    /// Serveur de relais (Core) : appareils OBS, sauvegardes de scènes.
    static let coreURL = URL(string: "https://15-235-25-77.sslip.io")!
    static let signUpURL = siteURL.appending(path: "inscription")
    static let resetURL = siteURL.appending(path: "mot-de-passe-oublie")
}
