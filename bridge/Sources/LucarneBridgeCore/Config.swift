import Foundation

/// Where the bridge keeps its files. `LUCARNE_BRIDGE_HOME` overrides the
/// default (`~/Library/Application Support/lucarne-bridge`) — tests use it.
public struct BridgePaths {
    public let home: URL

    public init(home: URL) {
        self.home = home
    }

    public static func standard(environment: [String: String] = ProcessInfo.processInfo.environment) -> BridgePaths {
        if let override = environment["LUCARNE_BRIDGE_HOME"], !override.isEmpty {
            return BridgePaths(home: URL(fileURLWithPath: override, isDirectory: true))
        }
        let base = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Application Support/lucarne-bridge", isDirectory: true)
        return BridgePaths(home: base)
    }

    public var configFile: URL { home.appendingPathComponent("config.json") }
    public var stateFile: URL { home.appendingPathComponent("state.json") }
    public var logFile: URL {
        FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Logs/lucarne-bridge.log")
    }

    public func ensureHome() throws {
        try FileManager.default.createDirectory(
            at: home, withIntermediateDirectories: true,
            attributes: [.posixPermissions: 0o700]
        )
    }
}

public struct BridgeConfig: Codable, Equatable {
    /// The full webhook URL shown by the integration. It is the credential.
    public var webhookURL: URL
    /// Seconds between launchd runs.
    public var interval: Int

    public init(webhookURL: URL, interval: Int = 300) {
        self.webhookURL = webhookURL
        self.interval = interval
    }

    public static func validate(_ raw: String) -> Result<URL, ConfigError> {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: trimmed), let scheme = url.scheme?.lowercased(),
              scheme == "http" || scheme == "https", url.host != nil else {
            return .failure(.notAURL(trimmed))
        }
        guard url.path.contains("/api/webhook/") else {
            return .failure(.notAWebhook(trimmed))
        }
        return .success(url)
    }

    public static func load(from paths: BridgePaths) throws -> BridgeConfig {
        guard FileManager.default.fileExists(atPath: paths.configFile.path) else {
            throw ConfigError.missing(paths.configFile.path)
        }
        let data = try Data(contentsOf: paths.configFile)
        return try JSONDecoder().decode(BridgeConfig.self, from: data)
    }

    public func save(to paths: BridgePaths) throws {
        try paths.ensureHome()
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        let data = try encoder.encode(self)
        try data.write(to: paths.configFile, options: [.atomic])
        try FileManager.default.setAttributes(
            [.posixPermissions: 0o600], ofItemAtPath: paths.configFile.path
        )
    }
}

public enum ConfigError: Error, Equatable, CustomStringConvertible {
    case notAURL(String)
    case notAWebhook(String)
    case missing(String)

    public var description: String {
        switch self {
        case .notAURL(let raw):
            return "'\(raw)' is not an http(s) URL"
        case .notAWebhook(let raw):
            return "'\(raw)' is not a Home Assistant webhook URL (expected …/api/webhook/<id>)"
        case .missing(let path):
            return "no configuration at \(path) — run `lucarne-bridge install <webhook url>` first"
        }
    }
}
