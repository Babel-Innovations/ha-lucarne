import ArgumentParser
import Foundation
import LucarneBridgeCore

struct Sync: AsyncParsableCommand {
    static let configuration = CommandConfiguration(
        abstract: "Run one sync now (what the launchd agent does every few minutes)."
    )

    func run() async throws {
        let paths = BridgePaths.standard()
        let config: BridgeConfig
        do {
            config = try BridgeConfig.load(from: paths)
        } catch {
            Output.fail("\(error)")
        }
        let engine = SyncEngine(
            reminders: EventKitReminders(),
            transport: URLSessionTransport(),
            config: config,
            host: hostName(),
            bridgeVersion: bridgeVersion
        )
        let state = await engine.run()
        try state.save(to: paths)
        let stamp = ISO8601DateFormatter().string(from: state.lastRun)
        Output.line("\(stamp) \(state.summary)")
        if state.exitCode != 0 {
            throw ExitCode(state.exitCode)
        }
    }
}
