import Foundation

/// Wire types for the integration's webhook. Field names are snake_case on the
/// wire (see docs/reminders-bridge.md, "Protocol"); the coders below convert.
public let bridgeProtocolVersion = 1

public struct MappedList: Codable, Equatable {
    public let name: String
    public let target: String
    public let entityId: String

    public init(name: String, target: String, entityId: String) {
        self.name = name
        self.target = target
        self.entityId = entityId
    }
}

public struct MappingResponse: Codable, Equatable {
    public let version: Int
    public let syncInterval: Int?
    public let lists: [MappedList]

    public init(version: Int, syncInterval: Int?, lists: [MappedList]) {
        self.version = version
        self.syncInterval = syncInterval
        self.lists = lists
    }
}

public struct ItemPayload: Codable, Equatable {
    public let id: String
    public let title: String
    public let due: String?
    public let notes: String?
    public let completed: Bool

    public init(id: String, title: String, due: String?, notes: String?, completed: Bool) {
        self.id = id
        self.title = title
        self.due = due
        self.notes = notes
        self.completed = completed
    }
}

public struct ListPayload: Codable, Equatable {
    public let name: String
    public let items: [ItemPayload]

    public init(name: String, items: [ItemPayload]) {
        self.name = name
        self.items = items
    }
}

public struct SyncRequest: Codable, Equatable {
    public let version: Int
    public let host: String
    public let bridgeVersion: String
    public let availableLists: [String]
    public let lists: [ListPayload]

    public init(host: String, bridgeVersion: String, availableLists: [String], lists: [ListPayload]) {
        self.version = bridgeProtocolVersion
        self.host = host
        self.bridgeVersion = bridgeVersion
        self.availableLists = availableLists
        self.lists = lists
    }
}

public struct SyncResponse: Codable, Equatable {
    public let ok: Bool
    public let complete: [String]
    public let received: Int
    public let created: Int
    public let updated: Int
    public let completedInHa: Int
    public let skippedLists: [String]
    public let unmappedLists: [String]

    public init(
        ok: Bool, complete: [String], received: Int, created: Int, updated: Int,
        completedInHa: Int, skippedLists: [String], unmappedLists: [String]
    ) {
        self.ok = ok
        self.complete = complete
        self.received = received
        self.created = created
        self.updated = updated
        self.completedInHa = completedInHa
        self.skippedLists = skippedLists
        self.unmappedLists = unmappedLists
    }
}

public struct ErrorResponse: Codable, Equatable {
    public let ok: Bool?
    public let error: String
    public let detail: String?
}

public enum WireCoding {
    public static func decoder() -> JSONDecoder {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return decoder
    }

    public static func encoder() -> JSONEncoder {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        encoder.outputFormatting = [.sortedKeys]
        return encoder
    }
}

/// Reminders list names are matched the way the integration matches them:
/// trimmed and case-folded.
public func listKey(_ name: String) -> String {
    name.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
}
