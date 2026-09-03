import ArgumentParser
import Foundation
import LucarneBridgeCore

struct Logs: AsyncParsableCommand {
    static let configuration = CommandConfiguration(abstract: "Follow the sync log.")

    @Option(name: .shortAndLong, help: "Lines of history to show first.")
    var lines: Int = 50

    func run() async throws {
        let log = BridgePaths.standard().logFile
        guard FileManager.default.fileExists(atPath: log.path) else {
            Output.fail("no log yet at \(log.path)")
        }
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/tail")
        process.arguments = ["-n", String(lines), "-f", log.path]
        try process.run()
        process.waitUntilExit()
        throw ExitCode(process.terminationStatus)
    }
}
