// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "SyxteeDashboard",
    platforms: [.macOS(.v13)],
    targets: [
        .executableTarget(name: "SyxteeDashboard", path: "Sources/SyxteeDashboard")
    ]
)
