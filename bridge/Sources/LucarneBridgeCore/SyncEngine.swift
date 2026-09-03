import Foundation

/// One sync: GET the mapping, read the mapped lists, POST them, check off what
/// the integration answers with. Every outcome is a `SyncState`; nothing throws
/// out of `run()`.
public final class SyncEngine {
    public let reminders: RemindersProviding
    public let transport: HTTPTransport
    public let config: BridgeConfig
    public let host: String
    public let bridgeVersion: String
    public let now: () -> Date

    public init(
        reminders: RemindersProviding, transport: HTTPTransport, config: BridgeConfig,
        host: String, bridgeVersion: String, now: @escaping () -> Date = Date.init
    ) {
        self.reminders = reminders
        self.transport = transport
        self.config = config
        self.host = host
        self.bridgeVersion = bridgeVersion
        self.now = now
    }

    public func run() async -> SyncState {
        let started = now()
        guard await reminders.requestAccess() else {
            return SyncState(
                lastRun: started, result: .permissionDenied,
                message: "allow lucarne-bridge under System Settings → Privacy & Security → Reminders"
            )
        }

        // 1. Which lists does HA want?
        let mapping: MappingResponse
        do {
            let reply = try await transport.get(config.webhookURL)
            guard reply.status == 200 else {
                return httpFailure(started, reply, verb: "fetching the list mapping")
            }
            mapping = try WireCoding.decoder().decode(MappingResponse.self, from: reply.body)
        } catch let error as DecodingError {
            return SyncState(lastRun: started, result: .invalidResponse, message: "mapping: \(error)")
        } catch {
            return SyncState(lastRun: started, result: .networkError, message: describe(error))
        }
        guard mapping.version <= bridgeProtocolVersion else {
            return SyncState(
                lastRun: started, result: .invalidResponse,
                message: "the integration speaks protocol \(mapping.version); update lucarne-bridge"
            )
        }

        // 2. Read the mapped lists. Only their reminders are sent; the names of
        //    every list do go along (available_lists) so HA can flag a mapping
        //    the Mac cannot satisfy.
        let available: [ReminderList]
        do {
            available = try reminders.lists()
        } catch {
            return SyncState(lastRun: started, result: .remindersError, message: describe(error))
        }
        var payloads: [ListPayload] = []
        var sentNames: [String] = []
        for mapped in mapping.lists {
            let matches = available.filter { listKey($0.title) == listKey(mapped.name) }
            guard let list = matches.first else { continue }
            if matches.count > 1 {
                // Two accounts with a same-named list: sending one of them would
                // report the other's reminders as gone. Refuse instead.
                return SyncState(
                    lastRun: started, result: .remindersError,
                    message: RemindersError.ambiguousList(mapped.name, matches.count).description
                )
            }
            do {
                let items = try await reminders.incompleteReminders(in: list).map {
                    ItemPayload(id: $0.id, title: $0.title, due: $0.due, notes: $0.notes, completed: $0.isCompleted)
                }
                payloads.append(ListPayload(name: mapped.name, items: items))
                sentNames.append(mapped.name)
            } catch {
                return SyncState(lastRun: started, result: .remindersError, message: describe(error))
            }
        }

        // 3. POST, and check off what HA reports as done here.
        let request = SyncRequest(
            host: host, bridgeVersion: bridgeVersion,
            availableLists: available.map(\.title), lists: payloads
        )
        let response: SyncResponse
        do {
            let body = try WireCoding.encoder().encode(request)
            let reply = try await transport.post(config.webhookURL, json: body)
            guard reply.status == 200 else {
                return httpFailure(started, reply, verb: "sending reminders")
            }
            response = try WireCoding.decoder().decode(SyncResponse.self, from: reply.body)
        } catch let error as DecodingError {
            return SyncState(lastRun: started, result: .invalidResponse, message: "sync reply: \(error)")
        } catch {
            return SyncState(lastRun: started, result: .networkError, message: describe(error))
        }

        var marked = 0
        var state = SyncState(
            lastRun: started, result: .ok, listsSent: sentNames,
            received: response.received, created: response.created, updated: response.updated,
            completedInHa: response.completedInHa, toComplete: response.complete.count,
            skippedLists: response.skippedLists, unmappedLists: response.unmappedLists
        )
        if !response.complete.isEmpty {
            do {
                marked = try reminders.complete(ids: response.complete)
            } catch {
                state.result = .remindersError
                state.message = "checking off \(response.complete.count) reminder(s): \(describe(error))"
                return state
            }
        }
        state.markedCompleted = marked
        return state
    }

    private func httpFailure(_ started: Date, _ reply: HTTPReply, verb: String) -> SyncState {
        var detail = String(data: reply.body, encoding: .utf8) ?? ""
        if let decoded = try? WireCoding.decoder().decode(ErrorResponse.self, from: reply.body) {
            detail = decoded.detail.map { "\(decoded.error): \($0)" } ?? decoded.error
        }
        if reply.status == 404 && detail.isEmpty {
            detail = "no webhook at that URL — copy it again from the Lucarne Family options"
        }
        return SyncState(
            lastRun: started, result: .httpError, message: "\(verb): \(detail)", httpStatus: reply.status
        )
    }

    private func describe(_ error: Error) -> String {
        if let urlError = error as? URLError {
            return urlError.localizedDescription
        }
        return String(describing: error)
    }
}
