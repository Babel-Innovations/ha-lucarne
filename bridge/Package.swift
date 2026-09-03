// swift-tools-version:5.9
import PackageDescription

// Root package only: the -sectcreate flag below embeds Sources/lucarne-bridge/Info.plist
// into the executable so EventKit can read NSRemindersFullAccessUsageDescription and
// macOS attributes the Reminders permission to this binary. unsafeFlags are fine for a
// package that is built directly (swift build) and never consumed as a dependency.
let package = Package(
    name: "lucarne-bridge",
    platforms: [.macOS(.v13)],
    products: [
        .executable(name: "lucarne-bridge", targets: ["lucarne-bridge"]),
        .library(name: "LucarneBridgeCore", targets: ["LucarneBridgeCore"]),
    ],
    dependencies: [
        .package(url: "https://github.com/apple/swift-argument-parser.git", from: "1.5.0"),
    ],
    targets: [
        .target(
            name: "LucarneBridgeCore",
            dependencies: [],
            path: "Sources/LucarneBridgeCore"
        ),
        .executableTarget(
            name: "lucarne-bridge",
            dependencies: [
                "LucarneBridgeCore",
                .product(name: "ArgumentParser", package: "swift-argument-parser"),
            ],
            path: "Sources/lucarne-bridge",
            exclude: ["Info.plist"],
            linkerSettings: [
                .unsafeFlags([
                    "-Xlinker", "-sectcreate",
                    "-Xlinker", "__TEXT",
                    "-Xlinker", "__info_plist",
                    "-Xlinker", "Sources/lucarne-bridge/Info.plist",
                ]),
            ]
        ),
        .testTarget(
            name: "LucarneBridgeCoreTests",
            dependencies: ["LucarneBridgeCore"],
            path: "Tests/LucarneBridgeCoreTests"
        ),
    ]
)
