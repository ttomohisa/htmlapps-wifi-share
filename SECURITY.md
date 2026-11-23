# Security Policy

## Reporting

Security fixes target the latest version on `main`. Please use the
repository owner's private security reporting channel when available.
Include the affected commit, reproduction steps and potential impact,
but never provide a real Wi-Fi password in a public report.

## Credential handling

Wi-Fi Share is a static, single-HTML browser app with no application
backend, analytics, telemetry or runtime CDN dependency. Its CSP contains
`connect-src 'none'`. The hosted version still downloads the initial HTML.

- Input SSIDs and passwords normally stay in page memory.
- **Save this Wi-Fi** writes credentials to the current browser's
  `localStorage` only when explicitly selected. This is not the OS
  credential manager; users of the same browser profile, same-origin
  scripts, or extensions may access the data. Avoid saving on shared devices.
- **QR and PNG** contain the actual Wi-Fi credentials. Anyone who
  receives a QR image may be able to connect to that network.
- **System share** may hand a plaintext SSID and password to an OS share
  destination. **Share QR image** passes a QR PNG file, not a fallback
  plaintext password. The chosen destination may send data externally.
- **Copy** puts the selected SSID/password on the clipboard.
- **Print** exposes the QR (which includes credentials) in the printed
  output. Printing a separate plaintext password is opt-in.
- **NFC tag writing** is Experimental and overwrites a compatible NDEF
  tag after an explicit user action. Someone reading the tag may use
  the credentials.

**Clear current Wi-Fi** resets current inputs, QR and print output after
confirmation. It does not securely erase memory, delete saved profiles
or recall content already copied, shared, exported, printed or written.

## Build and platform boundaries

The QR encoder is bundled; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
There are no declared runtime dependencies in `dependencies.json`.
Build checks verify embedded resources and prevent unexpected runtime
connections. Browser and OS capabilities control QR scanning, Wi-Fi
connection, Clipboard, Web Share, Wake Lock and Web NFC.

NFC and OS sharing need real supported-device checks. Desktop tests and
mocks alone cannot prove hardware compatibility. See
[VERIFY_OFFLINE.md](VERIFY_OFFLINE.md) for pre-release testing steps.
