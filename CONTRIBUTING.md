# Contributing

1. Keep the app dependency-free unless a dependency has a clear offline benefit.
2. Never commit API keys, credentials, copyrighted PDFs or private backup exports.
3. Add or update tests when changing scoring, telemetry or coaching-packet logic.
4. Run `npm run verify` before committing.
5. Validate every imported question's answer key and explanation.
6. Preserve privacy: browser-local storage is the default, and any future cloud sync must be optional and explicit.
