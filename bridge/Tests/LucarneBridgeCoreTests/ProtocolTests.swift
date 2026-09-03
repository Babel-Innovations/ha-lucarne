import XCTest
@testable import LucarneBridgeCore

final class ProtocolTests: XCTestCase {
    func testMappingDecodesSnakeCase() throws {
        let mapping = try WireCoding.decoder().decode(MappingResponse.self, from: mappingJSON)
        XCTAssertEqual(mapping.version, 1)
        XCTAssertEqual(mapping.syncInterval, 300)
        XCTAssertEqual(mapping.lists, [
            MappedList(name: "Family", target: "household", entityId: "todo.lucarne_household"),
            MappedList(name: "Anna", target: "anna", entityId: "todo.anna"),
        ])
    }

    func testSyncRequestEncodesSnakeCaseWithProtocolVersion() throws {
        let request = SyncRequest(
            host: "mini", bridgeVersion: "1.6.0", availableLists: ["Family"],
            lists: [ListPayload(name: "Family", items: [
                ItemPayload(id: "A", title: "Milk", due: "2026-09-04", notes: nil, completed: false),
            ])]
        )
        let data = try WireCoding.encoder().encode(request)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        XCTAssertEqual(object["version"] as? Int, 1)
        XCTAssertEqual(object["bridge_version"] as? String, "1.6.0")
        XCTAssertEqual(object["available_lists"] as? [String], ["Family"])
        let list = try XCTUnwrap((object["lists"] as? [[String: Any]])?.first)
        let item = try XCTUnwrap((list["items"] as? [[String: Any]])?.first)
        XCTAssertEqual(item["due"] as? String, "2026-09-04")
        XCTAssertEqual(item["completed"] as? Bool, false)
    }

    func testSyncResponseDecodes() throws {
        let response = try WireCoding.decoder().decode(SyncResponse.self, from: okSyncJSON(complete: ["X"]))
        XCTAssertEqual(response.complete, ["X"])
        XCTAssertEqual(response.completedInHa, 0)
        XCTAssertEqual(response.unmappedLists, ["Groceries"])
    }

    func testListKeyTrimsAndFolds() {
        XCTAssertEqual(listKey("  Family "), "family")
        XCTAssertEqual(listKey("ANNA"), listKey("anna"))
    }

    func testDueFormatterDateOnly() {
        var components = DateComponents()
        components.year = 2026; components.month = 9; components.day = 4
        XCTAssertEqual(DueFormatter.string(from: components), "2026-09-04")
    }

    func testDueFormatterDateTimeKeepsZone() {
        var components = DateComponents()
        components.year = 2026; components.month = 9; components.day = 4
        components.hour = 17; components.minute = 30
        components.timeZone = TimeZone(identifier: "Europe/Madrid")
        XCTAssertEqual(DueFormatter.string(from: components), "2026-09-04T17:30:00+02:00")
    }

    func testDueFormatterNil() {
        XCTAssertNil(DueFormatter.string(from: nil))
        XCTAssertNil(DueFormatter.string(from: DateComponents(hour: 9)))
    }
}
