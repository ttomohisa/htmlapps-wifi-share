# APP_SPEC.md

## 1. Product identity

- **Working name:** Wi-Fi Share / Wi-Fi共有
- **Purpose:** Share one Wi-Fi network quickly from a phone without making the other person type the password.
- **Primary users:** Smartphone users sharing home, office, guest, or event Wi-Fi.
- **Release artifacts:** `dist/index.html` and `dist/index.self-extract.html`

## 2. Problem and outcome

Wi-Fi passwords are often long and error-prone to dictate or type. In one session, the user enters an SSID and password, then shares the connection information by the method that fits the recipient device.

The app is intentionally Wi-Fi-specific. It is not a general-purpose QR generator. Local processing matters because SSIDs and passwords are credentials that should not be uploaded just to create a QR code.

## 3. Core user flow

1. Enter the network name (SSID).
2. Enter the password and choose WPA/WPA2/WPA3, WEP, or no password.
3. Optionally mark the SSID as hidden.
4. Share primarily by QR code, with system share, copy, large display, print layout, and supported NFC tags as alternatives.
5. Close the page when finished. Wi-Fi credentials are not persisted automatically.

## 4. Functional requirements

- Build ZXing-compatible `WIFI:` payloads.
- Escape `\`, `;`, `,`, `:` and `"` where required by the Wi-Fi QR text format.
- Support WPA/WPA2/WPA3 Personal through the interoperable `T:WPA` QR value, WEP, and open networks.
- Support hidden SSIDs with `H:true`.
- Render a high-contrast QR with a quiet zone.
- Provide a full-screen QR dialog suitable for showing to another phone.
- Keep the screen awake while QR or large-display dialogs are open when Screen Wake Lock is available.
- Copy SSID or password individually with Clipboard API plus a compatibility fallback.
- Use Web Share API when available. Share text, and include a generated PNG QR file when the browser supports file sharing.
- Provide a large-display mode showing SSID and password for manual entry on another device.
- Save the QR as PNG on explicit user action.
- Provide an A4 print layout containing the SSID and QR code, with password printing opt-in and off by default.
- On supported Web NFC environments, write an Android-compatible Wi-Fi WSC NDEF MIME record (`application/vnd.wfa.wsc`) to an NFC tag after explicit confirmation.
- Treat NFC tag writing as Experimental, require HTTPS/Web NFC support, and reject WEP or hidden SSID configurations that are not safely representable in the implemented WSC path.
- Switch Japanese and English without reload.
- Persist language preference automatically. Persist Wi-Fi profiles only after explicit user action.

## 5. Data and privacy

- SSID and password remain in page memory.
- Credentials are saved to localStorage only when the user explicitly chooses to save a Wi-Fi profile.
- The app performs no runtime network requests.
- There is no login, analytics, telemetry, or server-side storage.
- OS share and file save occur only after explicit user action.

## 6. Non-goals

- Reading the currently connected SSID or Wi-Fi password from the OS.
- Directly changing Wi-Fi settings from the web page.
- Bluetooth or NFC peer-to-peer phone-to-phone credential transfer.
- NFC tag writing on unsupported browsers, WEP, hidden SSIDs, Enterprise/EAP, or guaranteed WPA3-only connectivity.
- Enterprise/EAP Wi-Fi provisioning.
- Generic URL, contact, payment, or arbitrary QR generation.
- Cloud sync or account management.

## 7. UX and accessibility

- Mobile-first from 320px upward.
- QR is the primary CTA; alternative methods are visually secondary.
- Touch targets are at least 44px.
- Inputs disable autocorrect, spellcheck, and unwanted capitalization.
- Password is masked by default with an explicit visibility toggle.
- Dialogs fit narrow phones and safe areas.
- No horizontal scrolling at 320px.
- Visible focus, proper labels, `aria-live` feedback, Escape-closeable dialogs.
- SVG icons only; no emoji UI icons.

## 8. Browser target

Current stable Chrome/Edge desktop and Android, Safari on iPhone/macOS, and Firefox where the required APIs are available. Core QR generation must work without Web Share, Clipboard, or Wake Lock. Direct `file://` opening is required for QR generation, copy fallback, large display, and PNG save; secure-context-only APIs may be unavailable there.

## 9. Acceptance criteria

- `build-standalone.ps1` produces readable and self-extract variants.
- No unresolved build placeholder remains.
- No external script, stylesheet, frame, module import, font, or image URL is required at runtime.
- Runtime CSP contains `connect-src 'none'`.
- Wi-Fi credentials never leave the page except through explicit OS share/copy/save actions.
- WPA, WEP, open, hidden SSID, Japanese text, and reserved-character payload tests pass.
- QR images decode back to the exact generated `WIFI:` payload.
- Japanese and English UI fit at 360px without horizontal scroll.
- `assets/favicon.svg` and the upper-left app icon are the same design.

## 10. Version scope

- v0.1.0: QR payload + generation core
- v0.2.0: smartphone QR UX + Wake Lock
- v0.3.0: clipboard sharing
- v0.4.0: Web Share API
- v0.5.0: large-display mode
- v0.6.0: PNG QR save and QR-image sharing
- v0.7.0: explicitly saved Wi-Fi profiles
- v0.8.0: UI / UX polish, stale-QR prevention, compact mobile guidance, unsupported-share fallback
- v0.9.0: release-candidate regression, compatibility review, and documentation alignment
- v1.0.0: final release regression and release metadata
- v1.1.0: QR-focused copy refresh, A4 print layout, and Experimental Web NFC tag writing
