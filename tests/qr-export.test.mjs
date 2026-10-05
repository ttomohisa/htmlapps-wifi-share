import test from 'node:test';
import assert from 'node:assert/strict';
import {source,harness} from './helpers/wifi-harness.mjs';

test('PNG filename is a real labeled editable field next to QR actions', () => {
  assert.match(source, /<label\b[^>]*for="outputFilename"[^>]*data-i18n="outputFilenameLabel"/);
  assert.match(source, /<input\b[^>]*id="outputFilename"[^>]*aria-describedby="outputFilenameHint"/);
  assert.match(source, /id="outputFilenameHint"[^>]*data-i18n="outputFilenameHint"/);
  assert.ok(source.indexOf('id="outputFilename"') > source.indexOf('id="qrDialog"'));
  assert.ok(source.indexOf('id="outputFilename"') < source.indexOf('id="saveQrButton"'));
});

test('automatic name follows SSID; deliberate edits survive regeneration and dialog reopen', () => {
  const h=harness();h.network();h.app.generateQr({openDialog:true});
  assert.equal(h.node('#outputFilename')?.value,'wifi-Sample Guest.png');
  h.node('#closeQrDialog').click();h.input('ssidInput','別のネットワーク');h.app.generateQr({openDialog:true});
  assert.equal(h.node('#outputFilename').value,'wifi-別のネットワーク.png');
  h.input('outputFilename','イベント案内.png');h.node('#closeQrDialog').click();h.input('ssidInput','Renamed Sample');h.app.generateQr({openDialog:true});
  assert.equal(h.node('#outputFilename').value,'イベント案内.png');
  h.node('#saveQrButton').click();assert.equal(h.downloads.at(-1),'イベント案内.png');
  assert.equal(h.storage.size,0,'Filename and Wi-Fi data must not be stored');
});

for (const [input,expected] of [
  ['Guest handout','Guest handout.png'],['日本語の案内.PNG.png','日本語の案内.png'],
  ['', 'wifi-Sample Guest.png'],['   ', 'wifi-Sample Guest.png'],['...png.png','wifi-Sample Guest.png'],
  ['会場/案内\\受付:*?"<>|\u0000\u001f\u007f.png','会場-案内-受付----------.png'],
  ['name.png..png','name.png'],['x'.repeat(76)+'.png-extra.png','x'.repeat(76)+'.png'],['name.png.','name.png'],['name.PNG...','name.png'],['.hidden. ','hidden.png'],['CON','wifi-CON.png'],['x'.repeat(300)+'.png','x'.repeat(80)+'.png']
]) test(`download and share use the same sanitized filename: ${JSON.stringify(input)}`, async () => {
  const h=harness();h.network();h.app.generateQr();h.input('outputFilename',input);
  h.node('#saveQrButton').click();await h.node('#shareQrButton').click();
  assert.equal(h.downloads.at(-1),expected);assert.equal(h.shares.at(-1).files[0].name,expected);
  assert.equal(h.shares.at(-1).files[0].type,'image/png');
});

test('filename is captured at export initiation before asynchronous canvas conversion', async () => {
  const h=harness();h.network();h.app.generateQr();h.input('outputFilename','First');h.defer();
  h.node('#saveQrButton').click();const sharing=h.node('#shareQrButton').click();h.input('outputFilename','Second');h.flush();await sharing;
  assert.equal(h.downloads.at(-1),'First.png');assert.equal(h.shares.at(-1).files[0].name,'First.png');
});

for (const language of ['ja','en']) test(`${language}: active SSID/password validation switches language and keeps field/focus semantics`, () => {
  const h=harness(language);assert.equal(h.app.generateQr(),false);
  const original=h.node('#validationMessage').textContent;assert.equal(h.node('#ssidInput').getAttribute('aria-invalid'),'true');
  h.node('#languageButton').click();assert.notEqual(h.node('#validationMessage').textContent,original);
  assert.match(h.node('#validationMessage').textContent,language==='ja'?/Enter/:/入力/);
  assert.equal(h.node('#ssidInput').getAttribute('aria-invalid'),'true');assert.equal(h.document.activeElement,h.node('#ssidInput'));
  h.input('ssidInput','Sample');assert.equal(h.node('#validationMessage').textContent,'');assert.equal(h.app.generateQr(),false);
  assert.equal(h.node('#passwordInput').getAttribute('aria-invalid'),'true');h.node('#languageButton').click();
  assert.match(h.node('#validationMessage').textContent,language==='ja'?/パスワード/:/password/);
  h.input('passwordInput','dummy-test-password');assert.equal(h.app.generateQr(),true);h.node('#languageButton').click();assert.equal(h.node('#validationMessage').textContent,'');
});

test('editing filename preserves focus and QR, while Wi-Fi inputs still invalidate the preview', () => {
  const h=harness();h.network();h.app.generateQr();const payload=h.app.lastPayload;
  const field=h.input('outputFilename','Typed');assert.equal(h.document.activeElement,field);assert.equal(h.app.lastPayload,payload);assert.equal(h.node('#qrPreviewWrap').hidden,false);
  for (const [id,event] of [['ssidInput','input'],['passwordInput','input'],['securitySelect','change'],['hiddenCheckbox','change']]) {
    h.app.generateQr();h.node('#'+id).emit(event);assert.equal(h.app.lastPayload,'');assert.equal(h.node('#qrPreviewWrap').hidden,true);
  }
});

test('existing validation and WIFI payload semantics are preserved', () => {
  const h=harness();
  for(const security of ['WPA','WEP','nopass']) { const d={ssid:'合成;\\,:"SSID',password:'dummy;\\,:"password',security,hidden:true};assert.equal(h.app.validate(d),'');const p=h.app.buildWifiPayload(d);assert.match(p,/H:true;;$/);assert.equal(p.includes('P:'),security!=='nopass');assert.match(p,/S:合成\\;\\\\\\,\\:\\"SSID;/); }
  assert.equal(h.app.validate({ssid:' ',password:' ',security:'WPA'}),'','Whitespace has always been allowed');
  assert.equal(h.app.validate({ssid:'Sample',password:'',security:'nopass'}),'');
});

for(const language of ['ja','en']) test(`${language}: NFC base validation stays localized`, () => {
  const h=harness(language);
  const missingSsid=h.app.validateNfcDetails({ssid:'',password:'',security:'WPA'});
  const missingPassword=h.app.validateNfcDetails({ssid:'Sample',password:'',security:'WPA'});
  assert.match(missingSsid,language==='ja'?/入力/:/Enter/);
  assert.match(missingPassword,language==='ja'?/パスワード/:/password/);
});

test('default and blank fallback use one PNG extension even for PNG-like SSIDs', () => {
  const h=harness();h.network('Guest.png.png');h.app.generateQr();
  assert.equal(h.node('#outputFilename').value,'wifi-Guest.png');
  h.node('#saveQrButton').click();assert.equal(h.downloads.at(-1),'wifi-Guest.png');
  h.input('outputFilename','');h.node('#saveQrButton').click();assert.equal(h.downloads.at(-1),'wifi-Guest.png');
});
