Wi-Fi Share — Repository quick start
================================

Open: https://ttomohisa.github.io/htmlapps-wifi-share/

Build on Windows:
  1. Run build-standalone.bat (including the PowerShell syntax preflight).
  2. Open dist/index.html or dist/index.self-extract.html.
  3. The default build also refreshes the root wifi-share.html download.

Run release checks:
  powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File scripts\check-powershell-syntax.ps1
  pwsh -NoProfile -File scripts\check-repository.ps1
  Follow VERIFY_OFFLINE.md for manual smartphone, NFC, and OS sharing QA.

References:
  src/index.template.html  Editable single-file application source
  APP_SPEC.md              Product specification and acceptance tests
  README.ja.md / README.md User documentation
  CHANGELOG.md             Release history
  SECURITY.md              Credential handling and data-exit paths
  THIRD_PARTY_NOTICES.md   QR code generator attribution
  .github/workflows/       CI, preview, Pages and GitHub Release

No account or runtime server is needed. SSIDs and passwords remain
in memory unless explicitly saved or handed off to another destination.
Do not manually change generated dist/ files; build from the source.
The repository owner, not ChatGPT, merges release pull requests.
