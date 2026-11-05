# Contributing

Start with a small, explainable change. For a larger feature, open an issue describing who needs it, a concrete example and what success looks like. Bug reports should include browser/version, reproduction steps and a sanitized input. Never attach private chats, credentials or billing logs.

## Local checks

Run `npm test` and `npm run check` from the repository root. Node 20+ and Python 3.9+ are sufficient. Tests must not contact external sites. Use fetch stubs for link behavior and temporary repositories for Git behavior.

For UI changes, load `extension` as an unpacked Chromium extension and record these manual results in your PR:

- Open/close with mouse and keyboard; check focus, Escape and narrow windows.
- Capture selected text and the last rendered reply; confirm paste still works.
- Confirm permission denial makes no network requests; grant a public test origin and revoke it.
- Try a 404, a redirect and a restricted endpoint without interpreting them as factual verdicts.
- Load fictional cost examples, malformed JSON and an unknown model.
- Download a checkpoint and inspect the output.

If you cannot run a check, say so. Screenshots are helpful for UI changes; remove private content first.

## Boundaries

Keep code small and readable. Use textContent for untrusted strings. Do not add remote scripts, telemetry, automatic page scraping, current-price claims, hidden model calls or claims of truth verification. New network behavior needs clear user controls and privacy documentation. Preserve unknown/unpriced outcomes rather than invent defaults.

Include meaningful tests for changed behavior, update the docs, and explain the tradeoff in the PR. AI-assisted contributions are welcome; contributors remain responsible for accuracy and licensing. Do not copy proprietary code or assets. By submitting, you confirm you can contribute the work under the repository’s MIT license.

Good starting points: balanced parentheses in URL extraction, accessible focus behavior, a documented provider-log adapter with sanitized fixtures, and reproducible Chromium integration tests.
