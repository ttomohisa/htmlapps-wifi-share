import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers/wifi-harness.mjs';

// Execute the production language and Help handlers; native rendering and
// browser-managed Escape/focus behavior require separate browser verification.
for (const initial of ['ja', 'en']) {
  test(`${initial}: header labels and accessible targets follow repeated language switches`, async () => {
    const h = harness(initial);
    let language = initial;
    for (let step = 0; step < 5; step++) {
      const ja = language === 'ja';
      assert.equal(h.document.documentElement.lang, language);
      const button = h.node('#languageButton');
      assert.equal(button.textContent, ja ? 'EN' : 'JA');
      assert.equal(button.getAttribute('aria-label'), ja ? '英語に切り替え' : 'Switch to Japanese');
      assert.equal(button.title, ja ? '英語に切り替え' : 'Switch to Japanese');
      for (const id of ['helpButton', 'closeHelpButton']) {
        const label = id === 'closeHelpButton' ? (ja ? '閉じる' : 'Close') : (ja ? '使い方と注意事項' : 'How to use & notes');
        assert.equal(h.node('#' + id).getAttribute('aria-label'), label);
        assert.equal(h.node('#' + id).title, label);
      }
      const badge = h.document.querySelectorAll('[data-i18n]').find(el => el.dataset.i18n === 'localBadge');
      assert.equal(badge.textContent, ja ? '完全ローカル処理' : 'Fully local processing');
      await button.click(); language = ja ? 'en' : 'ja';
      assert.equal(h.storage.get('wifi-share-language'), language);
    }
  });
  test(`${initial}: Help can repeatedly open and close without changing Wi-Fi inputs`, async () => {
    const h = harness(initial); h.network('Synthetic guest', 'synthetic-password');
    const before = h.app.getDetails();
    for (let step = 0; step < 3; step++) {
      await h.node('#helpButton').click(); assert.equal(h.node('#helpDialog').open, true);
      await h.node('#closeHelpButton').click(); assert.equal(h.node('#helpDialog').open, false);
    }
    assert.deepEqual(h.app.getDetails(), before);
  });
}
