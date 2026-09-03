import XCTest
@testable import LucarneBridgeCore

final class SyncEngineTests: XCTestCase {
    private func engine(
        reminders: FakeReminders, transport: FakeTransport
    ) -> SyncEngine {
        SyncEngine(
            reminders: reminders, transport: transport, config: testConfig,
            host: "mini", bridgeVersion: "1.6.0",
            now: { Date(timeIntervalSince1970: 1_700_000_000) }
        )
    }

    private func reminders() -> FakeReminders {
        let fake = FakeReminders()
        fake.available = [
            ReminderList(id: "L1", title: "family"),
            ReminderList(id: "L2", title: "Anna"),
            ReminderList(id: "L3", title: "Private"),
        ]
        fake.byList = [
            "L1": [Reminder(id: "A", title: "Milk", notes: "2 l", due: "2026-09-04", isCompleted: false)],
            "L2": [Reminder(id: "B", title: "Bag", notes: nil, due: nil, isCompleted: false)],
            "L3": [Reminder(id: "C", title: "Secret", notes: nil, due: nil, isCompleted: false)],
        ]
        return fake
    }

    private func posted(_ transport: FakeTransport) throws -> [String: Any] {
        try XCTUnwrap(JSONSerialization.jsonObject(with: XCTUnwrap(transport.posted.first)) as? [String: Any])
    }

    func testSendsOnlyMappedListsMatchedCaseInsensitively() async throws {
        let fake = reminders()
        let transport = FakeTransport(
            getReply: HTTPReply(status: 200, body: mappingJSON),
            postReply: HTTPReply(status: 200, body: okSyncJSON())
        )
        let state = await engine(reminders: fake, transport: transport).run()

        XCTAssertEqual(state.result, .ok, state.message)
        XCTAssertEqual(fake.fetchedLists, ["family", "Anna"])
        let body = try posted(transport)
        XCTAssertEqual(body["host"] as? String, "mini")
        XCTAssertEqual(body["available_lists"] as? [String], ["family", "Anna", "Private"])
        let lists = try XCTUnwrap(body["lists"] as? [[String: Any]])
        // Sent under HA's spelling, so the receiver's lookup is exact.
        XCTAssertEqual(lists.map { $0["name"] as? String }, ["Family", "Anna"])
        let items = try XCTUnwrap(lists[0]["items"] as? [[String: Any]])
        XCTAssertEqual(items.first?["id"] as? String, "A")
        XCTAssertEqual(items.first?["notes"] as? String, "2 l")
        XCTAssertEqual(state.listsSent, ["Family", "Anna"])
        XCTAssertEqual(state.received, 3)
        XCTAssertEqual(state.unmappedLists, ["Groceries"])
        XCTAssertEqual(state.markedCompleted, 0)
    }

    func testMappedListMissingOnTheMacIsSkippedNotFatal() async throws {
        let fake = reminders()
        fake.available.removeAll { $0.id == "L2" }
        let transport = FakeTransport(
            getReply: HTTPReply(status: 200, body: mappingJSON),
            postReply: HTTPReply(status: 200, body: okSyncJSON())
        )
        let state = await engine(reminders: fake, transport: transport).run()
        XCTAssertEqual(state.result, .ok)
        XCTAssertEqual(state.listsSent, ["Family"])
    }

    func testChecksOffWhatTheIntegrationReturns() async throws {
        let fake = reminders()
        let transport = FakeTransport(
            getReply: HTTPReply(status: 200, body: mappingJSON),
            postReply: HTTPReply(status: 200, body: okSyncJSON(complete: ["A", "B"]))
        )
        let state = await engine(reminders: fake, transport: transport).run()
        XCTAssertEqual(state.result, .ok)
        XCTAssertEqual(fake.completed, ["A", "B"])
        XCTAssertEqual(state.toComplete, 2)
        XCTAssertEqual(state.markedCompleted, 2)
    }

    func testCompleteFailureIsReportedAfterTheSync() async throws {
        let fake = reminders()
        fake.completeError = RemindersError.notFound("A")
        let transport = FakeTransport(
            getReply: HTTPReply(status: 200, body: mappingJSON),
            postReply: HTTPReply(status: 200, body: okSyncJSON(complete: ["A"]))
        )
        let state = await engine(reminders: fake, transport: transport).run()
        XCTAssertEqual(state.result, .remindersError)
        XCTAssertTrue(state.message.contains("checking off 1"))
        XCTAssertEqual(state.exitCode, 4)
    }

    func testPermissionDeniedStopsBeforeAnyRequest() async {
        let fake = reminders()
        fake.access = false
        let transport = FakeTransport(
            getReply: HTTPReply(status: 200, body: mappingJSON),
            postReply: HTTPReply(status: 200, body: okSyncJSON())
        )
        let state = await engine(reminders: fake, transport: transport).run()
        XCTAssertEqual(state.result, .permissionDenied)
        XCTAssertEqual(transport.gets, 0)
        XCTAssertTrue(transport.posted.isEmpty)
    }

    func testHTTPErrorCarriesTheIntegrationsDetail() async {
        let transport = FakeTransport(
            getReply: HTTPReply(status: 200, body: mappingJSON),
            postReply: HTTPReply(status: 400, body: json(["ok": false, "error": "invalid_payload", "detail": "bad due"]))
        )
        let state = await engine(reminders: reminders(), transport: transport).run()
        XCTAssertEqual(state.result, .httpError)
        XCTAssertEqual(state.httpStatus, 400)
        XCTAssertEqual(state.message, "sending reminders: invalid_payload: bad due")
        XCTAssertEqual(state.exitCode, 3)
    }

    func testUnknownWebhookIsExplained() async {
        let transport = FakeTransport(
            getReply: HTTPReply(status: 404, body: Data()),
            postReply: HTTPReply(status: 200, body: okSyncJSON())
        )
        let state = await engine(reminders: reminders(), transport: transport).run()
        XCTAssertEqual(state.result, .httpError)
        XCTAssertTrue(state.message.contains("copy it again"))
        XCTAssertTrue(transport.posted.isEmpty)
    }

    func testNetworkErrorIsReported() async {
        let transport = FakeTransport(
            getReply: HTTPReply(status: 200, body: mappingJSON),
            postReply: HTTPReply(status: 200, body: okSyncJSON())
        )
        transport.getError = URLError(.cannotConnectToHost)
        let state = await engine(reminders: reminders(), transport: transport).run()
        XCTAssertEqual(state.result, .networkError)
        XCTAssertFalse(state.message.isEmpty)
    }

    func testNewerProtocolIsRefused() async {
        let newer = json(["version": 2, "lists": []])
        let transport = FakeTransport(
            getReply: HTTPReply(status: 200, body: newer),
            postReply: HTTPReply(status: 200, body: okSyncJSON())
        )
        let state = await engine(reminders: reminders(), transport: transport).run()
        XCTAssertEqual(state.result, .invalidResponse)
        XCTAssertTrue(state.message.contains("update lucarne-bridge"))
        XCTAssertTrue(transport.posted.isEmpty)
    }

    func testGarbledReplyIsInvalidResponse() async {
        let transport = FakeTransport(
            getReply: HTTPReply(status: 200, body: mappingJSON),
            postReply: HTTPReply(status: 200, body: Data("<html>".utf8))
        )
        let state = await engine(reminders: reminders(), transport: transport).run()
        XCTAssertEqual(state.result, .invalidResponse)
    }

    func testFetchFailureSendsNothing() async {
        let fake = reminders()
        fake.fetchError = RemindersError.fetchFailed("Anna")
        let transport = FakeTransport(
            getReply: HTTPReply(status: 200, body: mappingJSON),
            postReply: HTTPReply(status: 200, body: okSyncJSON())
        )
        let state = await engine(reminders: fake, transport: transport).run()
        XCTAssertEqual(state.result, .remindersError)
        XCTAssertTrue(transport.posted.isEmpty, "a list that could not be read must not be sent as empty")
        XCTAssertTrue(state.message.contains("Anna"))
    }

    func testTwoListsWithTheSameNameAreRefused() async {
        let fake = reminders()
        fake.available.append(ReminderList(id: "L9", title: "FAMILY"))
        let transport = FakeTransport(
            getReply: HTTPReply(status: 200, body: mappingJSON),
            postReply: HTTPReply(status: 200, body: okSyncJSON())
        )
        let state = await engine(reminders: fake, transport: transport).run()
        XCTAssertEqual(state.result, .remindersError)
        XCTAssertTrue(state.message.contains("2 lists are named \"Family\""))
        XCTAssertTrue(transport.posted.isEmpty)
    }
}
