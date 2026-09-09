# Wi-Fi Share

[![GitHub Pages](https://github.com/ttomohisa/htmlapps-wifi-share/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ttomohisa/htmlapps-wifi-share/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Single HTML](https://img.shields.io/badge/distribution-single%20HTML-0ea5e9)](https://ttomohisa.github.io/htmlapps-wifi-share/)

[English README](README.md)

Wi-Fi情報を、QRコード・端末の共有機能・SSID / パスワードの個別コピー・大きく表示の4方式で共有する単一HTMLのブラウザツールです。SSIDやパスワードはブラウザ内で処理し、アプリのサーバーへアップロードしません。

## 🚀 デモ

### [GitHub PagesでWi-Fi Shareを開く](https://ttomohisa.github.io/htmlapps-wifi-share/)

GitHub Pagesから最初のHTMLを読み込んだ後、Wi-Fi QR生成、PNG作成、コピー、保存済みWi-Fiの管理はブラウザ内で処理します。Wi-Fi情報をアプリのサーバーへ送信する処理はありません。

[![Wi-Fi Share スクリーンショット](assets/screenshot.png)](https://ttomohisa.github.io/htmlapps-wifi-share/)

## Features

- **QRコードで接続情報を共有** — WPA / WPA2 / WPA3 Personal、WEP、パスワードなし、非公開SSIDに対応したWi-Fi QRを生成します。
- **対応端末ではOS標準の共有機能を利用** — Web Share APIを使い、Wi-Fi情報や生成したQR画像を共有できます。
- **必要な情報だけコピー** — SSIDとパスワードを個別にコピーできます。
- **QRが使いにくい場面では大きく表示** — PCなどへ手入力しやすいよう、SSIDとパスワードをスマホ画面に大きく表示します。
- **よく使うWi-Fiだけ端末内に保存** — 明示的に保存した場合だけ、このブラウザ内へWi-Fi情報を保存します。保存一覧にはパスワードを表示しません。
- **スマホで見せやすいUI** — 全画面QR、狭い画面向けレイアウト、対応環境ではScreen Wake Lockを利用します。
- **単一HTML・完全ローカル処理** — 日本語 / 英語UI、登録不要、実行時CDN依存なし、生成HTMLでは `connect-src 'none'` を設定しています。

## Quick start

### Web版を使う

[デモを開く](https://ttomohisa.github.io/htmlapps-wifi-share/)だけで利用できます。インストールやアカウント登録は不要です。

### 単一HTMLを作る

1. このリポジトリをダウンロードまたはcloneします。
2. Windowsで `build-standalone.bat` をダブルクリックするか、PowerShellから実行します。
3. `dist/index.html` が読みやすい通常の単一HTML版です。
4. `dist/index.self-extract.html` には、より小さい自己展開版が生成されます。

QR生成、コピーのフォールバック、大きく表示、PNG保存などの基本機能はローカルHTMLでも利用できる設計です。Web ShareやScreen Wake Lockなど、一部のWeb APIはHTTPSなどのSecure Contextを必要とする場合があります。

## Usage

1. ネットワーク名（SSID）を入力します。
2. パスワードを入力し、`WPA / WPA2 / WPA3`、`WEP`、`パスワードなし`からセキュリティ方式を選びます。
3. SSIDを非公開にしている場合だけ、非公開ネットワークを有効にします。
4. **QRコードを表示**を押し、接続したい端末のカメラで読み取ります。
5. QRが使いにくい場合は、端末の共有機能、SSID / パスワードの個別コピー、大きく表示を利用します。
6. 繰り返し使うWi-Fiは **このWi-Fiを保存** を選び、必要なら表示名を付けます。

### 保存済みWi-Fi

保存機能は任意です。**このWi-Fiを保存** を押した場合だけ、このブラウザのlocalStorageへ保存します。一覧には表示名、SSID、セキュリティ方式を表示し、保存したパスワードは一覧に表示しません。保存済みWi-Fiは呼び出し・個別削除・全削除ができます。

ブラウザ内保存は、OSの保護された資格情報ストアへ保存する機能とは異なります。

## GitHub Pagesで公開する

このリポジトリには、単一HTMLをビルドして `dist` をGitHub Pagesへ公開するWorkflowが含まれています。

1. `htmlapps-wifi-share` としてGitHubへpushします。
2. **Settings → Pages → Build and deployment → Source** で **GitHub Actions** を選択します。
3. `main` へpushするか、Actionsから **Deploy standalone app to GitHub Pages** を実行します。
4. 成功すると `https://ttomohisa.github.io/htmlapps-wifi-share/` で利用できます。

Workflowではリポジトリ検証、通常単一HTML版・自己展開版の生成、`dist` のアップロードを行います。

## 開発・ビルド構成

```text
.
├─ APP_SPEC.md                   # アプリ仕様・受け入れ条件
├─ app.config.json               # アプリ情報・バージョン
├─ src/index.template.html       # アプリ本体テンプレート
├─ assets/favicon.svg            # アプリ / faviconアイコン
├─ dependencies.json             # 実行時依存の定義
├─ dependencies.lock.json        # 依存ロック
├─ build-standalone.bat          # Windows向けビルド入口
├─ build-standalone.ps1          # 単一HTMLビルダー
├─ scripts/                      # リポジトリ / ビルド検証
├─ dist/index.html               # 通常の単一HTML生成物
└─ dist/index.self-extract.html  # 自己展開単一HTML生成物
```

### Build

Windows PowerShell 7で:

```powershell
.\build-standalone.bat
```

ビルドでは以下を行います。

- `app.config.json` と依存定義の検証
- faviconとビルド情報の埋め込み
- `dist/index.html` の生成
- CSP、未解決プレースホルダー、埋め込みアセット、実行時通信制約の検証
- `dist/index.self-extract.html` の生成と検証
- `dist` 配下へのビルド / 依存マニフェスト出力

## Privacy / 実行時通信

生成HTMLのContent Security Policyには `connect-src 'none'` を設定しています。analytics、telemetry、外部フォント、CDN script、アプリ用バックエンドは使用しません。

SSID、パスワード、生成したQR情報は、ユーザーが明示的に次の操作をした場合を除いてブラウザ内に留まります。

- **端末の共有 / QR画像を共有** — 選択した内容をOSの共有シートへ渡します。その後の送信先はユーザーが選択します。
- **コピー** — 選択したSSIDまたはパスワードをクリップボードへ入れます。
- **このWi-Fiを保存** — この端末のブラウザのlocalStorageへWi-Fi情報を保存します。
- **PNG保存** — 生成したQR画像をファイルとして保存します。

保存操作をしなければ、入力したWi-Fi情報を自動的に永続保存しません。

## Browser support

基本のQR生成は現在のChrome / Edge / Safari / FirefoxのPC・スマートフォンを対象としています。Web ShareとScreen Wake Lockは補助機能で、ブラウザ / OSの対応状況やSecure Context条件に依存します。共有機能が利用できない環境では、その操作を表示せず基本フローを妨げない設計です。

OSに保存されている現在のWi-Fiパスワードを読み取ることや、Webページから端末のWi-Fi設定を直接変更することはできません。QRを読み取った後の接続処理は、読み取り側の端末・OS・カメラ機能が行います。

## Limitations

- Enterprise / EAP Wi-Fiの設定には対応していません。
- Bluetooth / NFCによるスマホ間のWi-Fi情報直接転送は実装していません。
- 現在接続中のSSIDやWi-FiパスワードをOSから自動取得できません。
- Web Share / Screen Wake Lockはすべてのブラウザや実行環境で利用できるわけではありません。
- 保存済みWi-FiはブラウザのlocalStorageに保存します。サイトデータを削除すると消える場合があります。
- QRコード自体にWi-Fi接続情報が含まれるため、QRを読み取れる相手はそのネットワークへ接続できる可能性があります。
- Wi-Fi QRの読み取り後の互換性は、最終的に読み取り側端末とOSの実装に依存します。

## Dependencies

`dependencies.json` で宣言する実行時パッケージ依存はありません。QRエンコーダーはアプリソースへ直接同梱しており、Kazuhiko Arase氏のQR Code Generator for JavaScriptをベースとしたMIT Licenseのコードを使用しています。詳細は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) を参照してください。

## Contributing

不具合報告や機能提案はGitHub Issuesで受け付けています。開発手順は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## License

Copyright © 2026 ttomohisa

[MIT License](LICENSE) で公開しています。
