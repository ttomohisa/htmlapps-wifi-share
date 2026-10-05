# Changelog

## [Unreleased]

### Added
- Added an editable Japanese/English PNG filename next to QR export actions, with a shared safe-name resolver for downloads and image sharing.
- Added executable export, validation, and release-parity regressions to repository/CI checks.

### Fixed
- Active SSID/password validation now follows language changes without resetting input or focus.
- Default builds now refresh the root offline download from the readable release.

## [1.1.0] - 2026-09-10

### Added
- Added an A4 print layout for Wi-Fi signs, centered on the QR code and SSID with optional password printing disabled by default.
- Added Experimental Web NFC tag writing using an Android-compatible `application/vnd.wfa.wsc` NDEF record on supported secure-context browsers.
- Added NFC compatibility guidance and explicit tag-overwrite / credential-exposure warnings.

### Changed
- Changed the header copy from “Four ways to share Wi-Fi” to “Share Wi-Fi by QR code and more” / `Wi-Fi情報をQRコード等で共有`.
- Expanded the sharing guide to include print and NFC without changing QR as the primary action.

## [1.0.0] - 2026-09-09

### Release
- Promoted Wi-Fi Share from release candidate to the first stable release.
- Completed final regression across QR generation, saved profiles, copy/share flows, mobile layouts, localization, CSP, and standalone/self-extract artifacts.
- Rewrote the English and Japanese READMEs to match the Browser Kitty repository style and current v1.0.0 behavior.
- Refreshed Japanese, English, and mobile screenshots from the v1.0.0 UI.
- Kept the v0.9.0 product behavior unchanged; no new product features were added for the stable release.

## [0.9.0] - 2026-09-09

### Release candidate
- Ran full QR, mobile layout, saved-profile, copy/share fallback, localization, CSP, and standalone regression checks.
- Fixed saved Wi-Fi profiles not being rendered after a page reload and re-render them when the UI language changes.
- Increased SSID/password copy buttons to the 44px minimum touch target.
- Rechecked Wi-Fi QR payloads for WPA, WEP, open, hidden, Japanese, and reserved-character cases.
- Aligned `APP_SPEC.md` with the current individual SSID/password copy UI.
- Clarified that Web Share is optional and secure-context/browser dependent.
- Kept the v0.8.0 interaction model unchanged; no new product features were added.

## [0.8.0] - 2026-09-09

- Refined mobile layout and reduced redundant scrolling.
- Hide system-share actions when Web Share is unavailable instead of leaving disabled buttons.
- Prevent stale QR previews and QR-image sharing after Wi-Fi details are edited.
- Added clearer inline validation state for SSID and password fields.
- Moved the current Wi-Fi save action ahead of the saved list.
- Collapsed the four-method explanation into an optional guide section.
- Improved small-screen QR and save dialogs.

## [0.7.0] - 2026-09-09

### Added
- Explicitly save Wi-Fi profiles in this browser on the current device.
- Load saved profiles without displaying stored passwords in the saved list.
- Delete individual saved profiles or clear all saved profiles with confirmation.
- Optional display names for saved Wi-Fi profiles.

### Changed
- Privacy copy now distinguishes browser-local saved profiles from unsaved form input.

## [0.6.2] - 2026-09-09

### Changed
- Restored the compact privacy badge label to `完全ローカル処理` / `Fully local processing`.
- Removed the SSID + password explainer card and combined Wi-Fi-info copy action.
- Promoted separate SSID and password copy buttons into the main alternate-sharing area.
- Unified the QR-image share button with the standard connected-nodes share icon.

## [0.6.1] - 2026-09-09

### Changed
- Reworded the header and privacy badge to describe Wi-Fi sharing directly.
- Updated the system share button to use a standard connected-nodes share icon.
- Grouped SSID and password as one set of Wi-Fi details for share, copy, and large-display actions while keeping individual copy shortcuts.

## [0.6.0] - 2026-09-09

### Added
- Wi-Fi QR generation for WPA/WPA2/WPA3, WEP, open, and hidden networks.
- Mobile full-screen QR view and Screen Wake Lock integration.
- SSID/password clipboard actions with fallback.
- Web Share API integration.
- Large-display mode for manual entry.
- PNG save and QR-image sharing support.
- Japanese and English UI.

### Privacy
- Wi-Fi credentials are not persisted automatically and runtime network access remains blocked.

