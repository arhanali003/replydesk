# Architecture and trust boundaries

`content.js` owns a closed shadow root and an extension-origin iframe. It reads selected text or the last assistant message only after a capture request from that frame. The message handler checks source window and extension origin. The panel accepts captured text only from its parent at https://chatgpt.com. The page selector is an integration assumption and may break; manual paste remains available.

`app.js` owns ephemeral UI state, explicit file imports, downloads and permissions. No incoming page message triggers a fetch. `core.js` contains independently testable extraction, pricing, Markdown and HTTP logic. Strings from answers and files are rendered as text, never HTML.

The extension has optional HTTPS host permissions. A user click requests only selected origins before issuing sequential HEAD requests. Redirects are not followed; response bodies are not read. The host filter rejects literal IPs and common local suffixes but does not resolve DNS. It is not a complete private-network protection mechanism. Permission removal leaves the required ChatGPT integration origin intact.

References: [Chrome permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions), [extension network requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests).

Prices are strings with at most six fractional digits, in USD per million tokens. Integer arithmetic carries totals at 10^-12 USD precision. Input counts include cached tokens; cached tokens are subtracted before the ordinary input rate is applied. A missing cache rate uses the configured input rate. Unknown models remain unpriced. The caller owns the date and accuracy of the price table.

The Python CLI invokes Git with argument arrays, reads porcelain v1 NUL-delimited status, and handles staged renames. It collects metadata only and creates outputs exclusively. Invalid UTF-8 filenames are replacement-decoded; snapshots are therefore not an archival file index. Git status and HEAD are separate reads, so concurrent changes can produce a mixed snapshot.

There is no LLM manager, automatic summarizer, factual verification engine, remote backend or billing-provider connection in v0.1.0. Those would require separate design, credentials handling and evaluation.
