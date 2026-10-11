import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {source, harness} from './helpers/wifi-harness.mjs';

// Structural/CSS guards complement native browser geometry, wheel, and focus QA.
// APP_HTML uses the same readable/self-extract decoding seam as behavior tests.
const css = source.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/\/\*[\s\S]*?\*\//g, '');
const rules = [];
function parseRules(text, context = []) {
  let cursor = 0;
  while (cursor < text.length) {
    const start = text.indexOf('{', cursor);
    if (start < 0) break;
    let depth = 1, end = start + 1;
    while (depth && end < text.length) { if (text[end] === '{') depth++; if (text[end] === '}') depth--; end++; }
    const selector = text.slice(cursor, start).trim();
    const body = text.slice(start + 1, end - 1);
    if (selector.startsWith('@media')) parseRules(body, [...context, selector]);
    else if (!selector.startsWith('@')) {
      const declarations = Object.fromEntries(body.split(';').filter(part => part.includes(':')).map(part => {
        const colon = part.indexOf(':'); return [part.slice(0, colon).trim(), part.slice(colon + 1).trim()];
      }));
      for (const item of selector.split(',')) rules.push({selector:item.trim(), declarations, context});
    }
    cursor = end;
  }
}
parseRules(css);
function declarations(selector, context = []) {
  return Object.assign({}, ...rules.filter(rule => rule.selector === selector && JSON.stringify(rule.context) === JSON.stringify(context)).map(rule => rule.declarations));
}
function dialogTree(id) {
  const html = source.match(new RegExp(`<dialog\\b[^>]*id="${id}"[^>]*>[\\s\\S]*?<\\/dialog>`))?.[0];
  assert.ok(html, `${id} exists`);
  const stack = [], nodes = [];
  for (const match of html.matchAll(/<(\/?)([\w-]+)\b([^>]*)>/g)) {
    if (match[1]) { stack.pop(); continue; }
    const attrs = Object.fromEntries([...match[3].matchAll(/([\w-]+)="([^"]*)"/g)].map(attr => [attr[1], attr[2]]));
    const node = {tag:match[2], attrs, parent:stack.at(-1)}; nodes.push(node);
    if (!['input','img','br','hr','meta','link'].includes(node.tag) && !match[3].endsWith('/')) stack.push(node);
  }
  return {root:nodes[0], nodes};
}
const shells = [
  {id:'saveProfileDialog', header:'dialog-header', body:'dialog-body', actions:'save-dialog-actions', close:'closeSaveProfileDialog', buttons:['cancelSaveProfile','confirmSaveProfile']},
  {id:'printDialog', header:'dialog-header', body:'dialog-body', actions:'save-dialog-actions', close:'closePrintDialog', buttons:['cancelPrint','confirmPrint']},
  {id:'appConfirmDialog', header:'app-confirm-header', body:'app-confirm-body', actions:'app-confirm-actions', close:'appConfirmClose', buttons:['appConfirmCancel','appConfirmOk']}
];
const hasClass = (node, name) => (node.attrs.class || '').split(/\s+/).includes(name);

test('every native modal locks root and body on screen without affecting print layout', () => {
  for (const selector of ['html:has(dialog:modal)','body:has(dialog:modal)']) {
    assert.equal(declarations(selector, ['@media screen']).overflow, 'hidden', selector);
    assert.equal(declarations(selector, ['@media screen'])['overscroll-behavior'], 'none', selector);
    assert.deepEqual(declarations(selector), {}, 'the lock is screen-only');
  }
  assert.doesNotMatch(css, /:has\(dialog\[open\]\)/, 'nonmodal open dialogs must not lock the page');
});

for (const shell of shells) {
  test(`${shell.id}: only an open dialog receives bounded flex allocation`, () => {
    const style = declarations(`#${shell.id}[open]`);
    assert.equal(style.display, 'flex');
    assert.equal(style['flex-direction'], 'column');
    assert.equal(style['min-height'], '0');
    assert.equal(declarations('dialog').overflow, 'hidden');
    const className = dialogTree(shell.id).root.attrs.class.split(/\s+/)[0];
    const targets = new Set(['dialog', `#${shell.id}`, `.${className}`]);
    for (const rule of rules.filter(rule => targets.has(rule.selector))) {
      assert.ok(!rule.declarations.display || /^none(?:\s*!important)?$/.test(rule.declarations.display), 'closed dialogs retain native display:none');
    }
    const bound = declarations(`#${shell.id}`)['max-height'];
    assert.match(bound || '', /100dvh/);
    assert.match(bound, /safe-area-inset-top/);
    assert.match(bound, /safe-area-inset-bottom/);
  });
  test(`${shell.id}: fixed header stays outside its scrollable body and existing actions`, () => {
    const {root, nodes} = dialogTree(shell.id);
    const header = nodes.find(node => hasClass(node, shell.header));
    const body = nodes.find(node => hasClass(node, shell.body));
    const actions = nodes.find(node => hasClass(node, shell.actions));
    for (const node of [header,body]) assert.equal(node?.parent, root, 'header and body must be direct children');
    assert.equal(actions.parent, body, 'existing actions remain inside the scrolling body');
    assert.equal(nodes.find(node => node.attrs.id === shell.close)?.parent, header);
    for (const id of shell.buttons) assert.equal(nodes.find(node => node.attrs.id === id)?.parent, actions, id);
    assert.equal(declarations(`#${shell.id} > .${shell.header}`).flex, '0 0 auto');
    const bodyStyle = declarations(`#${shell.id} > .${shell.body}`);
    assert.equal(bodyStyle.flex, '1 1 auto');
    assert.equal(bodyStyle['min-height'], '0');
    assert.equal(bodyStyle['min-width'], '0');
    assert.equal(bodyStyle.overflow, 'auto');
    assert.equal(bodyStyle['overscroll-behavior'], 'contain');
    assert.match(bodyStyle['padding-bottom'] || '', /safe-area-inset-bottom/, 'body tail clears the safe area');
    assert.deepEqual(declarations(`#${shell.id} > .${shell.actions}`), {}, 'no separate footer or duplicate scroller');
  });
}

test('responsive repairs are scoped away from existing Help, QR, large-display, and NFC shells', () => {
  assert.equal(declarations('#helpDialog[open]').display, 'flex');
  assert.equal(declarations('.fullscreen-dialog[open]').display, 'flex');
  assert.equal(declarations('.dialog-body')['overscroll-behavior'], 'contain');
  assert.match(declarations('#helpDialog[open]')['max-height'], /100dvh/);
  assert.equal(declarations('.fullscreen-dialog', ['@media (max-width: 520px)']).height, '100dvh');
  const {root, nodes} = dialogTree('nfcDialog');
  const body = nodes.find(node => hasClass(node, 'dialog-body'));
  assert.equal(nodes.find(node => hasClass(node, 'save-dialog-actions')).parent, body, 'NFC structure stays unchanged');
  assert.equal(body.parent, root);
  assert.deepEqual(declarations('.save-dialog[open]'), {}, 'do not change capability-gated NFC by class');
  assert.deepEqual(declarations('dialog[open]'), {}, 'do not reshape all dialogs');
});

test('existing local-processing shields and canonical brand-icon seam are preserved', () => {
  for (const cls of ['local-badge','privacy-note']) {
    const svg = source.match(new RegExp(`<div class="${cls}">\\s*(<svg[\\s\\S]*?<\\/svg>)`))?.[1];
    assert.ok(svg, cls);
    assert.match(svg, /aria-hidden="true"/);
    assert.ok(svg.includes('M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6z'));
    assert.ok(svg.includes('m9 12 2 2 4-5'));
  }
  assert.match(source, /<img id="appBrandIcon" src="(?:__APP_ICON_DATA_URI__|data:image\/svg\+xml;base64,)[^"]*" alt="">/);
});

for (const language of ['ja','en']) {
  test(`${language}: save/print dismissal remains repeatable without storing credentials or printing`, async () => {
    const h = harness(language); h.network('Synthetic layout test', 'synthetic-test-password');
    for (const [opener, dialog, closeButtons] of [
      ['saveProfileButton','saveProfileDialog',['cancelSaveProfile','closeSaveProfileDialog']],
      ['printLayoutButton','printDialog',['cancelPrint','closePrintDialog']]
    ]) for (const close of closeButtons) for (let repeat=0; repeat<2; repeat++) {
      await h.node('#'+opener).click(); assert.equal(h.node('#'+dialog).open, true);
      await h.node('#'+close).click(); assert.equal(h.node('#'+dialog).open, false);
    }
    assert.equal(h.app.getDetails().ssid, 'Synthetic layout test');
    assert.equal(h.storageWrites.length, 0); assert.equal(h.printCalls.length, 0);
  });
  test(`${language}: confirmation Close/Cancel/Escape paths retain saved profiles`, async () => {
    const profile = {id:'synthetic-layout',name:'Synthetic layout',ssid:'Synthetic network',password:'',security:'nopass',hidden:false};
    const h = harness(language, [profile]); const stored = h.storage.get('wifi-share-profiles-v1');
    for (const dismiss of ['appConfirmClose','appConfirmCancel','cancel']) {
      const pending = h.node('#clearSavedButton').click(); assert.equal(h.node('#appConfirmDialog').open, true);
      if (dismiss === 'cancel') await h.node('#appConfirmDialog').emit('cancel');
      else h.node('#'+dismiss).onclick();
      await pending; assert.equal(h.node('#appConfirmDialog').open, false);
      assert.equal(h.storage.get('wifi-share-profiles-v1'), stored); assert.equal(h.storageWrites.length, 0);
    }
  });
  test(`${language}: localized Help describes bounded dialog scrolling`, () => {
    const h = harness(language);
    const note = h.document.querySelectorAll('[data-i18n]').find(node => node.dataset.i18n === 'helpDialogLayout');
    assert.ok(note);
    assert.match(note.textContent, language === 'ja' ? /本文.*スクロール/ : /scroll.*content/i);
    assert.match(note.textContent, language === 'ja' ? /背景/ : /background/i);
  });
}

test('canonical checker includes the responsive contract for all four decoded artifact paths', () => {
  const check = fs.readFileSync(new URL('../scripts/check-repository.ps1', import.meta.url), 'utf8');
  assert.ok(check.includes('"tests/dialog-layout.test.mjs"'));
  for (const path of ['src/index.template.html','dist/index.html','dist/index.self-extract.html','wifi-share.html']) assert.ok(check.includes('"'+path+'"'));
});
