import Foundation
@testable import LucarneBridgeCore

final class FakeReminders: RemindersProviding {
    var access = true
    var available: [ReminderList] = []
    var byList: [String: [Reminder]] = [:]
    var completed: [String] = []
    var completeError: Error?
    var fetchError: Error?
    var fetchedLists: [String] = []

    func requestAccess() async -> Bool { access }
    func lists() throws -> [ReminderList] { available }
    func incompleteReminders(in list: ReminderList) async throws -> [Reminder] {
        if let fetchError { throw fetchError }
        fetchedLists.append(list.title)
        return byList[list.id] ?? []
    }
    func complete(ids: [String]) throws -> Int {
        if let completeError { throw completeError }
        completed.append(contentsOf: ids)
        return ids.count
    }
}

final class FakeTransport: HTTPTransport {
    var getReply: HTTPReply
    var postReply: HTTPReply
    var getError: Error?
    var postError: Error?
    var posted: [Data] = []
    var gets = 0

    init(getReply: HTTPReply, postReply: HTTPReply) {
        self.getReply = getReply
        self.postReply = postReply
    }

    func get(_ url: URL) async throws -> HTTPReply {
        gets += 1
        if let getError { throw getError }
        return getReply
    }

    func post(_ url: URL, json body: Data) async throws -> HTTPReply {
        posted.append(body)
        if let postError { throw postError }
        return postReply
    }
}

func json(_ object: Any) -> Data {
    try! JSONSerialization.data(withJSONObject: object)
}

let mappingJSON = json([
    "version": 1, "sync_interval": 300,
    "lists": [
        ["name": "Family", "target": "household", "entity_id": "todo.lucarne_household"],
        ["name": "Anna", "target": "anna", "entity_id": "todo.anna"],
    ],
])

func okSyncJSON(complete: [String] = []) -> Data {
    json([
        "ok": true, "complete": complete, "received": 3, "created": 1, "updated": 1,
        "completed_in_ha": 0, "skipped_lists": [], "unmapped_lists": ["Groceries"],
    ])
}

let testConfig = BridgeConfig(webhookURL: URL(string: "http://ha.local:8123/api/webhook/abc")!)
