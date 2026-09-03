import Foundation

public struct ReminderList: Equatable {
    public let id: String
    public let title: String

    public init(id: String, title: String) {
        self.id = id
        self.title = title
    }
}

public struct Reminder: Equatable {
    public let id: String
    public let title: String
    public let notes: String?
    /// Already formatted for the wire: `yyyy-MM-dd` or RFC 3339 with offset.
    public let due: String?
    public let isCompleted: Bool

    public init(id: String, title: String, notes: String?, due: String?, isCompleted: Bool) {
        self.id = id
        self.title = title
        self.notes = notes
        self.due = due
        self.isCompleted = isCompleted
    }
}

public enum RemindersError: Error, Equatable, CustomStringConvertible {
    case accessDenied
    case notFound(String)
    case fetchFailed(String)
    case ambiguousList(String, Int)

    public var description: String {
        switch self {
        case .accessDenied: return "Reminders access denied"
        case .notFound(let name): return "list \"\(name)\" was not found"
        case .fetchFailed(let name): return "Reminders did not return the \"\(name)\" list"
        case .ambiguousList(let name, let count):
            return "\(count) lists are named \"\(name)\" (different accounts?); rename one so only one matches"
        }
    }
}

/// What the sync engine needs from Reminders. EventKitReminders is the real
/// thing; tests substitute a fake.
public protocol RemindersProviding {
    /// Ask for (or confirm) Reminders access. `false` means denied.
    func requestAccess() async -> Bool
    func lists() throws -> [ReminderList]
    func incompleteReminders(in list: ReminderList) async throws -> [Reminder]
    /// Mark the given reminder ids completed. Returns how many were changed;
    /// ids that no longer exist or are already complete are skipped.
    func complete(ids: [String]) throws -> Int
}

public enum DueFormatter {
    /// EventKit stores a reminder's due date as components; no hour means an
    /// all-day reminder, which the integration wants as a bare date.
    public static func string(from components: DateComponents?) -> String? {
        guard let components, let year = components.year, let month = components.month,
              let day = components.day else { return nil }
        if components.hour == nil {
            return String(format: "%04d-%02d-%02d", year, month, day)
        }
        var calendar = Calendar(identifier: .gregorian)
        let zone = components.timeZone ?? TimeZone.current
        calendar.timeZone = zone
        guard let date = calendar.date(from: components) else { return nil }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        formatter.timeZone = zone
        return formatter.string(from: date)
    }
}
