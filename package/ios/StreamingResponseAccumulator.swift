import Foundation

/// Consumes a response stream exactly once while retaining its latest snapshot.
/// Foundation Models snapshots contain the complete partially generated response,
/// so the final snapshot is also the completed response.
func consumeStreamingResponse<Stream: AsyncSequence>(
    _ stream: Stream,
    content: (Stream.Element) -> String,
    onContent: (String) -> Void
) async throws -> String {
    var finalContent = ""

    for try await snapshot in stream {
        finalContent = content(snapshot)
        onContent(finalContent)
    }

    return finalContent
}
