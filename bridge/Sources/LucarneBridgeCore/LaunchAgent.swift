import Foundation

/// The launchd agent that runs `lucarne-bridge sync` every `interval` seconds.
/// Running it through launchd (rather than a shell) also makes the binary the
/// responsible process for TCC, so the Reminders prompt names lucarne-bridge.
public struct LaunchAgent {
    public static let label = "com.babel-innovations.lucarne-bridge"

    public let plistFile: URL
    public let runner: (_ arguments: [String]) throws -> (status: Int32, output: String)

    public init(
        plistFile: URL? = nil,
        runner: @escaping (_ arguments: [String]) throws -> (status: Int32, output: String) = LaunchAgent.launchctl
    ) {
        self.plistFile = plistFile ?? FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/LaunchAgents/\(LaunchAgent.label).plist")
        self.runner = runner
    }

    public static func plistDictionary(binaryPath: String, interval: Int, logFile: URL) -> [String: Any] {
        [
            "Label": label,
            "ProgramArguments": [binaryPath, "sync"],
            "StartInterval": interval,
            "RunAtLoad": true,
            "ProcessType": "Background",
            "StandardOutPath": logFile.path,
            "StandardErrorPath": logFile.path,
        ]
    }

    /// Serialized (so paths with XML-special characters are escaped for us).
    public static func plist(binaryPath: String, interval: Int, logFile: URL) throws -> Data {
        try PropertyListSerialization.data(
            fromPropertyList: plistDictionary(binaryPath: binaryPath, interval: interval, logFile: logFile),
            format: .xml, options: 0
        )
    }

    public func write(binaryPath: String, interval: Int, logFile: URL) throws {
        try FileManager.default.createDirectory(
            at: plistFile.deletingLastPathComponent(), withIntermediateDirectories: true
        )
        try Self.plist(binaryPath: binaryPath, interval: interval, logFile: logFile)
            .write(to: plistFile, options: [.atomic])
    }

    public var domain: String { "gui/\(getuid())" }
    public var serviceTarget: String { "\(domain)/\(Self.label)" }

    /// Load (or reload) the agent. RunAtLoad fires the first sync immediately.
    public func bootstrap() throws {
        _ = try? runner(["bootout", serviceTarget])
        // bootout returns before the teardown finishes; a bootstrap right
        // behind it can get "Operation already in progress" (37) or EBUSY.
        var result = try runner(["bootstrap", domain, plistFile.path])
        var attempts = 1
        while result.status != 0 && attempts < 4
            && (result.status == 37 || result.output.contains("already in progress")
                || result.output.contains("Resource busy")) {
            Thread.sleep(forTimeInterval: 0.5)
            result = try runner(["bootstrap", domain, plistFile.path])
            attempts += 1
        }
        guard result.status == 0 else {
            throw LaunchAgentError.launchctl("bootstrap", result.output)
        }
    }

    /// What the installed agent spawns, or nil when no plist is written.
    public func programPath() -> String? {
        guard let data = try? Data(contentsOf: plistFile),
              let plist = try? PropertyListSerialization.propertyList(from: data, format: nil)
                as? [String: Any],
              let arguments = plist["ProgramArguments"] as? [String] else { return nil }
        return arguments.first
    }

    public func bootout() throws {
        let result = try runner(["bootout", serviceTarget])
        // 3 / "No such process": already unloaded.
        guard result.status == 0 || result.status == 3 || result.output.contains("No such process") else {
            throw LaunchAgentError.launchctl("bootout", result.output)
        }
    }

    public func kickstart() throws {
        let result = try runner(["kickstart", "-k", serviceTarget])
        guard result.status == 0 else {
            throw LaunchAgentError.launchctl("kickstart", result.output)
        }
    }

    public func isLoaded() -> Bool {
        (try? runner(["print", serviceTarget]).status) == 0
    }

    public func remove() throws {
        if FileManager.default.fileExists(atPath: plistFile.path) {
            try FileManager.default.removeItem(at: plistFile)
        }
    }

    public static func launchctl(_ arguments: [String]) throws -> (status: Int32, output: String) {
        try run("/bin/launchctl", arguments)
    }

    public static func run(_ executable: String, _ arguments: [String]) throws -> (status: Int32, output: String) {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: executable)
        process.arguments = arguments
        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = pipe
        try process.run()
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        process.waitUntilExit()
        return (process.terminationStatus, String(data: data, encoding: .utf8) ?? "")
    }
}

public enum LaunchAgentError: Error, CustomStringConvertible {
    case launchctl(String, String)

    public var description: String {
        switch self {
        case .launchctl(let verb, let output):
            return "launchctl \(verb) failed: \(output.trimmingCharacters(in: .whitespacesAndNewlines))"
        }
    }
}
