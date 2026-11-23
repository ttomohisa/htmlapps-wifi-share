# Wi-Fi Share — Offline and release verification

Run on Windows:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-powershell-syntax.ps1
pwsh -NoProfile -File .\scripts\check-repository.ps1
```

The CI also checks the readable, self-extract and root-download HTML
variants and runs targeted desktop/mobile Chromium tests in both
languages. Actual hardware results remain separate from CI.

## Browser and offline behavior

1. Open `dist/index.html` and `dist/index.self-extract.html` directly
   with `file://`, then repeat while offline.
2. Generate WPA, WEP, open and hidden Wi-Fi QR codes with test credentials,
   including Japanese text, punctuation and passwords near size limits.
3. Scan the QR from another device. OS-level Wi-Fi connection is outside
   the application's control.
4. Confirm initial QR/PNG export, editable safe filename and decoded
   connection details match; re-open each dialog and test Escape.
5. Test blank SSID, invalid WPA length, SSID over 32 UTF-8 bytes,
   no-password mode and an exact 64-character hex PSK.
6. Change credentials while PNG encoding is pending; stale QR download
   and QR-image share must not complete.
7. Check that no unexpected runtime resource request or console error
   occurs after the hosted page's initial HTML request.

## Saved credentials and print

1. Save a synthetic Wi-Fi profile, reload and load it. The password
   must be masked even if previously shown.
2. Confirm that an empty SSID cannot be reported as successfully copied.
3. Cancel Clear current Wi-Fi using Cancel, Close, Escape and backdrop;
   inputs, generated views and saved profiles must remain intact.
   Confirming clears current details without deleting saved profiles.
4. Test saved-profile individual and Delete all confirmations, including
   cancellation and persisted reload state.
5. Open Print layout and confirm password text is hidden by default.
   The QR itself still contains the Wi-Fi credentials.
6. Opt in to plaintext password printing, then edit the network and
   confirm previous print contents and consent cannot leak into a new job.

## Device-specific and UI checks

- Test 320px, 360px, 520px and desktop widths, Japanese and English,
  including overflow, focus, 44px taps, dialog scrolling and the final
  Help/Build information item.
- Test Web Share available/unavailable and native share destinations.
  Sending data through the OS share sheet is an explicit user action.
- Test the NFC workflow only on a supported Android browser over HTTPS
  with a disposable NDEF tag. Check permissions, cancellation and that
  the tag has the intended network data. NFC hardware is **not** verified
  by simulated desktop tests.
- Check the README screenshots reflect the released UI and recheck
  APP_SPEC.md, both READMEs, SECURITY.md and CHANGELOG.md.
- After owner merge, confirm `main` CI passed and verify a new version
  tag and GitHub Release with readable HTML, self-extract HTML and ZIP.

Static checks and Chromium tests do not prove every mobile browser,
printer, OS share destination, NFC tag model or file:// permission.
Record such checks separately and do not describe them as performed
unless they were actually run.
