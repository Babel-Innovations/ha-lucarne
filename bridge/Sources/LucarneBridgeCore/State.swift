import Foundation

/// Outcome of one sync, persisted so `install` and `status` can report it.
public struct SyncState: Codable, Equatable {
    public enum Result: String, Codable {
        case ok
        case permissionDenied = "permission_denied"
        case httpError = "http_error"
        case networkError = "network_error"
        case invalidResponse = "invalid_response"
        case remindersError = "reminders_error"
    }

    public var lastRun: Date
    public var result: Result
    public var message: String
    public var httpStatus: Int?
    public var listsSent: [String]
    public var received: Int
    public var created: Int
    public var updated: Int
    public var completedInHa: Int
    public var toComplete: Int
    public var markedCompleted: Int
    public var skippedLists: [String]
    public var unmappedLists: [String]

    public init(
        lastRun: Date, result: Result, message: String = "", httpStatus: Int? = nil,
        listsSent: [String] = [], received: Int = 0, created: Int = 0, updated: Int = 0,
        completedInHa: Int = 0, toComplete: Int = 0, markedCompleted: Int = 0,
        skippedLists: [String] = [], unmappedLists: [String] = []
    ) {
        self.lastRun = lastRun
        self.result = result
        self.message = message
        self.httpStatus = httpStatus
        self.listsSent = listsSent
        self.received = received
        self.created = created
        self.updated = updated
        self.completedInHa = completedInHa
        self.toComplete = toComplete
        self.markedCompleted = markedCompleted
        self.skippedLists = skippedLists
        self.unmappedLists = unmappedLists
    }

    public static func load(from paths: BridgePaths) -> SyncState? {
        guard let data = try? Data(contentsOf: paths.stateFile) else { return nil }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try? decoder.decode(SyncState.self, from: data)
    }

    public func save(to paths: BridgePaths) throws {
        try paths.ensureHome()
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        try encoder.encode(self).write(to: paths.stateFile, options: [.atomic])
    }

    /// One-line human summary, shared by `install`, `sync` and `status`.
    public var summary: String {
        switch result {
        case .ok:
            var parts = [
                "\(received) sent", "\(created) created", "\(updated) updated",
                "\(completedInHa) completed in HA", "\(markedCompleted) checked off in Reminders",
            ]
            if !skippedLists.isEmpty { parts.append("skipped: \(skippedLists.joined(separator: ", "))") }
            if !unmappedLists.isEmpty { parts.append("not mapped: \(unmappedLists.joined(separator: ", "))") }
            return "ok — " + parts.joined(separator: ", ")
        case .permissionDenied:
            return "Reminders access denied — " + message
        case .httpError:
            return "HTTP \(httpStatus ?? 0) — " + message
        case .networkError:
            return "network error — " + message
        case .invalidResponse:
            return "unexpected reply — " + message
        case .remindersError:
            return "Reminders error — " + message
        }
    }

    /// Process exit code for `sync`, so `launchctl list` shows what went wrong.
    public var exitCode: Int32 {
        switch result {
        case .ok: return 0
        case .permissionDenied: return 2
        case .httpError, .networkError, .invalidResponse: return 3
        case .remindersError: return 4
        }
    }
}
