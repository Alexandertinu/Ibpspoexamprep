# Windows use and packaging

## Use it as a desktop app now

The lowest-maintenance option is a Progressive Web App (PWA):

1. Serve the source version from `http://localhost` or a private HTTPS host.
2. Open it in Microsoft Edge or Google Chrome.
3. Use **Apps → Install this site as an app**.
4. Pin it to Start or the taskbar.

The app then opens in its own window and continues to use browser-local storage and offline caching.

For a completely portable option, download `standalone.html` and open it directly. It needs no installer, but browser install and service-worker caching require HTTP/HTTPS.

## Future signed `.exe`

Tauri is the recommended wrapper because it can reuse this HTML/CSS/JavaScript code with a small binary. A production Windows build should add:

- a Tauri shell and signed installer;
- an encrypted operating-system credential vault for optional API keys;
- a local AI/network bridge to avoid browser CORS restrictions;
- an application-data directory for backups and large question banks;
- automatic update signing and release verification.

Do not embed provider API keys in the application binary. The frontend should request secrets from the Windows credential vault only when making a model call.
