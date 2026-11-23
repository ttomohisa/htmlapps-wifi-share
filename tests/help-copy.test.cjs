const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const removed = [
  "ダイアログを開いている間は背景がスクロールしません。高さが足りないときは、Wi-Fi保存・印刷・削除確認の本文をスクロールして最後の操作ボタンまで進めます。閉じるボタンは上部に残ります。",
  "The background stays still while a dialog is open. In short windows, scroll the content of Save Wi-Fi, Print, or deletion confirmation to reach the final action buttons. Close stays at the top."
];
for (const file of ["src/index.template.html", "wifi-share.html"]) {
  test(`${file}: user help omits implementation commentary`, () => {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    for (const text of removed) assert.ok(!html.includes(text), `Remove implementation copy from ${file}`);
  });
}

for (const file of ["src/index.template.html", "wifi-share.html"]) {
  test(`${file}: the hero stays concise and all six sharing methods live in Help`, () => {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const help = html.split('<!-- APP:HELP:BEGIN -->')[1].split('<!-- APP:HELP:END -->')[0];
    const main = html.split('<main class="main">')[1].split('</main>')[0];
    assert.ok(!main.includes('class="sharing-guide"'), 'Remove the old sharing guide below the app');
    assert.equal((help.match(/<li><strong data-i18n="card[1-6]Title"/g) || []).length, 6);
    for (let i = 1; i <= 6; i++) {
      assert.ok(help.includes('data-i18n="card' + i + 'Body"'), 'Sharing method body ' + i + ' in Help');
    }
    assert.ok(html.includes('<h1 class="sr-only" id="heroTitle"'), 'Retain accessible document heading');
    assert.ok(!html.includes('<h2 id="heroTitle"'), 'Remove the visible hero headline');
    assert.ok(html.includes('.local-badge { display: none; }'), 'Hide the badge at the smartphone breakpoint');
    assert.ok(html.includes('savedEmpty: \'よく使うWi-Fiをこの端末に保存できます。\''), 'Keep concise saved-network guidance');
    assert.ok(!html.includes('自動では保存されません。'), 'Avoid the redundant saved-network sentence');
  });
}
