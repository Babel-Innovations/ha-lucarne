import ArgumentParser
import Foundation
import LucarneBridgeCore

struct Install: AsyncParsableCommand {
    static let configuration = CommandConfiguration(
        abstract: "Store the webhook URL, install the launchd agent, run the first sync."
    )

    @Argument(help: "The webhook URL shown in the Lucarne Family options dialog.")
    var webhookURL: String

    @Option(name: .long, help: "Seconds between syncs.")
    var interval: Int = 300

    @Option(name: .long, help: "How long to wait for the first sync to report.")
    var wait: Int = 90

    func run() async throws {
        let url: URL
        switch BridgeConfig.validate(webhookURL) {
        case .success(let value): url = value
        case .failure(let error): Output.fail("\(error)")
        }
        guard interval >= 60 else { Output.fail("--interval must be at least 60 seconds") }

        let paths = BridgePaths.standard()
        try BridgeConfig(webhookURL: url, interval: interval).save(to: paths)
        try? FileManager.default.removeItem(at: paths.stateFile)
        Output.line("Saved configuration to \(paths.configFile.path)")

        let agent = LaunchAgent()
        try agent.write(binaryPath: executablePath(), interval: interval, logFile: paths.logFile)
        try agent.bootstrap()
        Output.line("Installed launchd agent \(LaunchAgent.label) (every \(interval) s)")
        // bootstrap() booted any previous agent out first, so RunAtLoad has
        // just started the first sync; kickstarting here would kill it, TCC
        // prompt included.
        Output.line("Running the first sync — if macOS asks whether lucarne-bridge may access Reminders, click Allow…")

        let deadline = Date().addingTimeInterval(TimeInterval(wait))
        var state: SyncState?
        while Date() < deadline {
            if let current = SyncState.load(from: paths) {
                state = current
                break
            }
            try await Task.sleep(nanoseconds: 500_000_000)
        }

        guard let state else {
            Output.line("No result after \(wait) s. If a Reminders permission prompt is still open, answer it,")
            Output.line("then run `lucarne-bridge status`. Log: \(paths.logFile.path)")
            throw ExitCode(3)
        }
        Output.line("First sync: \(state.summary)")
        switch state.result {
        case .ok:
            Output.line("Done. Map lists under Settings → Devices & services → Lucarne Family → Configure.")
        case .permissionDenied:
            Output.line("Enable lucarne-bridge under System Settings → Privacy & Security → Reminders, then run `lucarne-bridge sync`.")
        case .httpError, .networkError, .invalidResponse:
            Output.line("Check the URL (copy it again from the Lucarne Family options) and that this Mac can reach Home Assistant.")
        case .remindersError:
            Output.line("Reminders returned an error; see \(paths.logFile.path).")
        }
        if let minutes = Power.sleepMinutes(), minutes > 0 {
            Output.line("Note: this Mac sleeps after \(minutes) min of idle (pmset). Syncs pause while it sleeps; set sleep to Never under System Settings → Energy (or Lock Screen) to keep them running.")
        }
        if state.exitCode != 0 {
            throw ExitCode(state.exitCode)
        }
    }
}
