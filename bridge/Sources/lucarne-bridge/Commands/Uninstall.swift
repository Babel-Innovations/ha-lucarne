import ArgumentParser
import Foundation
import LucarneBridgeCore

struct Uninstall: AsyncParsableCommand {
    static let configuration = CommandConfiguration(
        abstract: "Unload the launchd agent and delete the configuration (the log is kept)."
    )

    func run() async throws {
        let agent = LaunchAgent()
        try agent.bootout()
        try agent.remove()
        let paths = BridgePaths.standard()
        if FileManager.default.fileExists(atPath: paths.home.path) {
            try FileManager.default.removeItem(at: paths.home)
        }
        Output.line("Removed the launchd agent and \(paths.home.path). Reminders in Home Assistant are left as they are.")
    }
}
