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
