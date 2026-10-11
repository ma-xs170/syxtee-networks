import SwiftUI

@main struct DashboardApp: App {
    @State private var session = Session()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .preferredColorScheme(.dark)
                .tint(Brand.foreground)
        }
    }
}
