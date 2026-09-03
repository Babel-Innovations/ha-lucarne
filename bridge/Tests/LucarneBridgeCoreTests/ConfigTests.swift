import XCTest
@testable import LucarneBridgeCore

final class ConfigTests: XCTestCase {
    private var home: URL!
    private var paths: BridgePaths!

    override func setUpWithError() throws {
        home = FileManager.default.temporaryDirectory
            .appendingPathComponent("lucarne-bridge-tests-\(UUID().uuidString)")
        paths = BridgePaths.standard(environment: ["LUCARNE_BRIDGE_HOME": home.path])
    }

    override func tearDownWithError() throws {
        try? FileManager.default.removeItem(at: home)
    }

    func testEnvironmentOverridesHome() {
        XCTAssertEqual(paths.home.path, home.path)
        XCTAssertEqual(paths.configFile.lastPathComponent, "config.json")
        XCTAssertEqual(paths.stateFile.lastPathComponent, "state.json")
    }

    func testDefaultHomeIsApplicationSupport() {
        let standard = BridgePaths.standard(environment: [:])
        XCTAssertTrue(standard.home.path.hasSuffix("Library/Application Support/lucarne-bridge"))
    }

    func testSaveIsPrivateAndRoundTrips() throws {
        try testConfig.save(to: paths)
        let attrs = try FileManager.default.attributesOfItem(atPath: paths.configFile.path)
        XCTAssertEqual((attrs[.posixPermissions] as? Int), 0o600)
        XCTAssertEqual(try BridgeConfig.load(from: paths), testConfig)
    }

    func testMissingConfigIsExplained() {
        XCTAssertThrowsError(try BridgeConfig.load(from: paths)) { error in
            XCTAssertEqual(error as? ConfigError, .missing(paths.configFile.path))
            XCTAssertTrue("\(error)".contains("lucarne-bridge install"))
        }
    }

    func testValidateAcceptsOnlyWebhookURLs() {
        XCTAssertEqual(
            try? BridgeConfig.validate(" http://ha.local:8123/api/webhook/abc\n").get().absoluteString,
            "http://ha.local:8123/api/webhook/abc"
        )
        XCTAssertEqual(BridgeConfig.validate("ha.local/api/webhook/abc"), .failure(.notAURL("ha.local/api/webhook/abc")))
        XCTAssertEqual(BridgeConfig.validate("http://ha.local:8123/"), .failure(.notAWebhook("http://ha.local:8123/")))
        XCTAssertEqual(BridgeConfig.validate("ftp://ha.local/api/webhook/x"), .failure(.notAURL("ftp://ha.local/api/webhook/x")))
    }

    func testStateRoundTripsAndSummarises() throws {
        let state = SyncState(
            lastRun: Date(timeIntervalSince1970: 1_000_000), result: .ok, listsSent: ["Family"],
            received: 3, created: 1, updated: 1, completedInHa: 2, toComplete: 1, markedCompleted: 1,
            skippedLists: ["Anna"], unmappedLists: []
        )
        try state.save(to: paths)
        XCTAssertEqual(SyncState.load(from: paths), state)
        XCTAssertEqual(
            state.summary,
            "ok — 3 sent, 1 created, 1 updated, 2 completed in HA, 1 checked off in Reminders, skipped: Anna"
        )
        XCTAssertEqual(state.exitCode, 0)
        XCTAssertEqual(SyncState(lastRun: Date(), result: .permissionDenied).exitCode, 2)
        XCTAssertEqual(SyncState(lastRun: Date(), result: .httpError, httpStatus: 500).exitCode, 3)
    }

    func testMissingStateIsNil() {
        XCTAssertNil(SyncState.load(from: paths))
    }

    func testLaunchAgentPlistRoundTripsAndEscapes() throws {
        let data = try LaunchAgent.plist(
            binaryPath: "/Users/a&b/bin/lucarne-bridge", interval: 300,
            logFile: URL(fileURLWithPath: "/Users/a&b/Library/Logs/lucarne-bridge.log")
        )
        let parsed = try XCTUnwrap(
            PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any]
        )
        XCTAssertEqual(parsed["Label"] as? String, "com.babel-innovations.lucarne-bridge")
        XCTAssertEqual(parsed["ProgramArguments"] as? [String], ["/Users/a&b/bin/lucarne-bridge", "sync"])
        XCTAssertEqual(parsed["StartInterval"] as? Int, 300)
        XCTAssertEqual(parsed["RunAtLoad"] as? Bool, true)
        XCTAssertEqual(parsed["StandardErrorPath"] as? String, "/Users/a&b/Library/Logs/lucarne-bridge.log")
    }

    func testLaunchAgentBootstrapReplacesAndReportsFailure() throws {
        var calls: [[String]] = []
        let agent = LaunchAgent(plistFile: home.appendingPathComponent("a.plist")) { args in
            calls.append(args)
            return args.first == "bootstrap" ? (1, "Input/output error") : (0, "")
        }
        XCTAssertThrowsError(try agent.bootstrap())
        XCTAssertEqual(calls.map(\.[0]), ["bootout", "bootstrap"])
        XCTAssertTrue(calls[1][1].hasPrefix("gui/"))
    }

    func testLaunchAgentBootstrapRetriesWhileTeardownIsInProgress() throws {
        var bootstraps = 0
        let agent = LaunchAgent(plistFile: home.appendingPathComponent("a.plist")) { args in
            guard args.first == "bootstrap" else { return (0, "") }
            bootstraps += 1
            return bootstraps < 3 ? (37, "Bootstrap failed: 37: Operation already in progress") : (0, "")
        }
        XCTAssertNoThrow(try agent.bootstrap())
        XCTAssertEqual(bootstraps, 3)
    }

    func testProgramPathReadsTheWrittenPlist() throws {
        let agent = LaunchAgent(plistFile: home.appendingPathComponent("a.plist")) { _ in (0, "") }
        XCTAssertNil(agent.programPath())
        try agent.write(binaryPath: "/opt/homebrew/bin/lucarne-bridge", interval: 300, logFile: home)
        XCTAssertEqual(agent.programPath(), "/opt/homebrew/bin/lucarne-bridge")
    }

    func testLaunchAgentBootoutToleratesNotLoaded() throws {
        let agent = LaunchAgent(plistFile: home.appendingPathComponent("a.plist")) { _ in
            (3, "Boot-out failed: 3: No such process")
        }
        XCTAssertNoThrow(try agent.bootout())
    }

    func testPowerParsesPmset() {
        let output = """
        System-wide power settings:
        Currently in use:
         standby              1
         sleep                10
         displaysleep         5
        """
        XCTAssertEqual(Power.sleepMinutes(pmsetOutput: output), 10)
        XCTAssertEqual(Power.sleepMinutes(pmsetOutput: " sleep 0"), 0)
        XCTAssertNil(Power.sleepMinutes(pmsetOutput: "nothing"))
    }
}
