import ArgumentParser
import Foundation
import LucarneBridgeCore

/// Version comes from the Info.plist embedded at link time (see Package.swift);
/// the release workflow stamps the tag into it before building.
let bridgeVersion: String =
    (Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String) ?? "0.0.0-dev"

@main
struct LucarneBridge: AsyncParsableCommand {
    static let configuration = CommandConfiguration(
        commandName: "lucarne-bridge",
        abstract: "Mirror Apple Reminders into Lucarne Family (Home Assistant).",
        discussion: """
            Install once with the command shown under Settings → Devices & services →
            Lucarne Family → Configure → Apple Reminders bridge. A launchd agent then
            syncs every few minutes; nothing else runs on this Mac.
            """,
        version: bridgeVersion,
        subcommands: [Install.self, Sync.self, Status.self, Uninstall.self, Logs.self],
        defaultSubcommand: Status.self
    )
}

enum Output {
    static func line(_ text: String) {
        print(text)
        fflush(stdout)
    }

    static func fail(_ text: String) -> Never {
        FileHandle.standardError.write(Data(("error: " + text + "\n").utf8))
        exit(1)
    }
}

func hostName() -> String {
    Host.current().localizedName ?? ProcessInfo.processInfo.hostName
}

/// The path launchd will spawn. Deliberately *not* symlink-resolved: Homebrew
/// installs a stable shim in its bin dir pointing into a versioned Cellar keg
/// that `brew upgrade` deletes, so recording the resolved path would strand
/// the agent on the next upgrade. TCC keys the Reminders grant on the code
/// signature, not the path, so the shim is fine there too.
func executablePath() -> String {
    if let url = Bundle.main.executableURL {
        return url.standardizedFileURL.path
    }
    return URL(fileURLWithPath: CommandLine.arguments[0]).standardizedFileURL.path
}
