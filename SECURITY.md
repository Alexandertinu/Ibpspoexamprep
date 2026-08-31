# Security and privacy

- The app is static and can run fully offline without an account, server, database or API key.
- Questions, tests, unfinished attempts, grades, history and saved AI feedback are stored in the current browser's local storage.
- Optional AI requests are made directly from the browser to the provider URL configured by the user.
- API keys are stored only in an in-memory variable for the current tab. They are not written to local storage, backups, logs or source files.
- A browser tab is not a hardware security boundary: extensions, injected scripts or local malware may still inspect an in-memory key. Prefer a dedicated low-limit key, rotate it regularly and use provider spending limits.
- Never put provider keys, tokens or passwords in this repository, imported question JSON or exported backups.
- Only configure HTTPS endpoints, except for a trusted model running on localhost.
- A custom endpoint must explicitly support browser CORS. Do not disable browser security to work around a CORS error.
- Treat imported and AI-generated questions as untrusted data. The app escapes rendered text and validates question structure, but answer keys still require human verification.
- Direct AI paper conversion has a 12 MB file limit to control browser memory use. Backups and JSON question imports have a 20 MB limit.
- Use **Export backup** regularly. Clearing browser storage can remove all local history.
- Keep the repository and backups private when they contain licensed or subscription-derived material.
- Review the rights attached to every source. Personal access does not necessarily grant redistribution rights.
