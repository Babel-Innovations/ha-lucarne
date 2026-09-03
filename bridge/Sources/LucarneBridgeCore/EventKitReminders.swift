import EventKit
import Foundation

/// Reminders through Apple's public EventKit API. This is the only place the
/// bridge touches Reminders; it never reads Reminders' private database.
public final class EventKitReminders: RemindersProviding {
    private let store = EKEventStore()

    public init() {}

    public static var isAuthorized: Bool {
        let status = EKEventStore.authorizationStatus(for: .reminder)
        if #available(macOS 14, *) {
            return status == .fullAccess
        }
        return status == .authorized
    }

    public func requestAccess() async -> Bool {
        if Self.isAuthorized { return true }
        do {
            if #available(macOS 14, *) {
                return try await store.requestFullAccessToReminders()
            }
            return try await store.requestAccess(to: .reminder)
        } catch {
            return false
        }
    }

    public func lists() throws -> [ReminderList] {
        store.calendars(for: .reminder).map {
            ReminderList(id: $0.calendarIdentifier, title: $0.title)
        }
    }

    public func incompleteReminders(in list: ReminderList) async throws -> [Reminder] {
        guard let calendar = store.calendar(withIdentifier: list.id) else {
            throw RemindersError.notFound(list.title)
        }
        let predicate = store.predicateForIncompleteReminders(
            withDueDateStarting: nil, ending: nil, calendars: [calendar]
        )
        // nil means the fetch did not complete (cancelled, store revoked). It
        // must never become "no reminders": the receiver would complete every
        // item in the list. Throwing makes SyncEngine send nothing this run.
        let fetched: [EKReminder]? = await withCheckedContinuation { continuation in
            store.fetchReminders(matching: predicate) { reminders in
                continuation.resume(returning: reminders)
            }
        }
        guard let fetched else { throw RemindersError.fetchFailed(list.title) }
        return fetched.map {
            Reminder(
                id: $0.calendarItemIdentifier,
                title: $0.title ?? "",
                notes: $0.notes,
                due: DueFormatter.string(from: $0.dueDateComponents),
                isCompleted: $0.isCompleted
            )
        }
    }

    public func complete(ids: [String]) throws -> Int {
        var changed = 0
        for id in ids {
            guard let reminder = store.calendarItem(withIdentifier: id) as? EKReminder,
                  !reminder.isCompleted else { continue }
            reminder.isCompleted = true
            try store.save(reminder, commit: false)
            changed += 1
        }
        if changed > 0 {
            try store.commit()
        }
        return changed
    }
}
