import Foundation

public struct HTTPReply: Equatable {
    public let status: Int
    public let body: Data

    public init(status: Int, body: Data) {
        self.status = status
        self.body = body
    }
}

public protocol HTTPTransport {
    func get(_ url: URL) async throws -> HTTPReply
    func post(_ url: URL, json body: Data) async throws -> HTTPReply
}

public final class URLSessionTransport: HTTPTransport {
    private let session: URLSession

    public init(timeout: TimeInterval = 15) {
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = timeout
        config.timeoutIntervalForResource = timeout * 2
        session = URLSession(configuration: config)
    }

    public func get(_ url: URL) async throws -> HTTPReply {
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        return try await perform(request)
    }

    public func post(_ url: URL, json body: Data) async throws -> HTTPReply {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.httpBody = body
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        return try await perform(request)
    }

    private func perform(_ request: URLRequest) async throws -> HTTPReply {
        let (data, response) = try await session.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        return HTTPReply(status: status, body: data)
    }
}
