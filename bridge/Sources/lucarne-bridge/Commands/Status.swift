import ArgumentParser
import Foundation
import LucarneBridgeCore

struct Status: AsyncParsableCommand {
    static let configuration = CommandConfiguration(
        abstract: "Show the configuration, the launchd agent and the last sync."
    )

    func run() async throws {
        let paths = BridgePaths.standard()
        Output.line("lucarne-bridge \(bridgeVersion)")
        switch Result(catching: { try BridgeConfig.load(from: paths) }) {
        case .success(let config):
            let redacted = config.webhookURL.absoluteString.replacingOccurrences(
                of: config.webhookURL.lastPathComponent,
                with: String(config.webhookURL.lastPathComponent.prefix(6)) + "…"
            )
            Output.line("Webhook:   \(redacted)")
            Output.line("Interval:  \(config.interval) s")
        case .failure(let error):
            Output.line("Config:    \(error)")
        }
        let agent = LaunchAgent()
        Output.line("Agent:     \(agent.isLoaded() ? "loaded" : "not loaded") (\(LaunchAgent.label))")
        if let program = agent.programPath(), !FileManager.default.isExecutableFile(atPath: program) {
            Output.line("           ⚠ the agent points at \(program), which is missing or not executable — re-run `lucarne-bridge install <url>`")
        }
        Output.line("Reminders: \(EventKitReminders.isAuthorized ? "access granted" : "not yet granted")")
        if let state = SyncState.load(from: paths) {
            let stamp = ISO8601DateFormatter().string(from: state.lastRun)
            Output.line("Last sync: \(stamp) \(state.summary)")
            if !state.listsSent.isEmpty {
                Output.line("Lists:     \(state.listsSent.joined(separator: ", "))")
            }
        } else {
            Output.line("Last sync: never")
        }
        if let minutes = Power.sleepMinutes(), minutes > 0 {
            Output.line("Sleep:     after \(minutes) min idle — syncs pause while the Mac sleeps")
        }
        Output.line("Log:       \(paths.logFile.path)")
    }
}
