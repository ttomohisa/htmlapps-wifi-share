import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers/wifi-harness.mjs';

test('Wi-Fi validation rejects oversized UTF-8 SSIDs and short/long WPA passwords', () => {
  const h=harness('en');
  const details=(ssid,password,security='WPA')=>({ssid,password,security,hidden:false});
  assert.equal(h.app.validate(details('A'.repeat(32),'12345678')),'');
  assert.equal(h.app.validate(details('A'.repeat(33),'12345678')),'ssidTooLong');
  assert.equal(h.app.validate(details('あ'.repeat(11),'12345678')),'ssidTooLong');
  assert.equal(h.app.validate(details('Guest','1234567')),'invalidWpaPassword');
  assert.equal(h.app.validate(details('Guest','A'.repeat(63))),'');
  assert.equal(h.app.validate(details('Guest','A'.repeat(64))),''); // 64 hex characters are a valid raw PSK.
  assert.equal(h.app.validate(details('Guest','Z'.repeat(64))),'invalidWpaPassword');
  assert.equal(h.app.validate(details('Guest','0123456789abcdef'.repeat(4))),'');
  assert.equal(h.app.validate(details('Guest','0123456789abcdef'.repeat(3)+'nohex-at-the-end!')),'invalidWpaPassword');
  // Existing WEP/open compatibility is maintained.
  assert.equal(h.app.validate(details('Guest','12345','WEP')),'');
  assert.equal(h.app.validate(details('Guest','','nopass')),'');
  h.network('A'.repeat(33),'12345678');
  assert.equal(h.app.generateQr(),false);
  assert.equal(h.node('#ssidInput').getAttribute('aria-invalid'),'true');
  h.network('Guest','1234567');
  assert.equal(h.app.generateQr(),false);
  assert.equal(h.node('#passwordInput').getAttribute('aria-invalid'),'true');
});

test('QR-image share does not silently downgrade to plaintext credentials', async () => {
  const h=harness('en',null,{navigator:{canShare:()=>false}});
  h.network('Guest','valid-password');
  assert.equal(h.app.generateQr({openDialog:true}),true);
  await h.node('#shareQrButton').click();
  assert.equal(h.shares.length,0);
  assert.match(h.node('#appToastMessage').textContent,/Save the image first/);
  await h.node('#shareButton').click();
  assert.equal(h.shares.length,1);
  assert.match(h.shares[0].text,/valid-password/);
});

test('supported QR-image share sends only the file and refreshes stale QR data', async () => {
  const h=harness('en');
  h.network('First Guest','valid-password');
  assert.equal(h.app.generateQr(),true);
  h.node('#ssidInput').value='Second Guest'; // Simulate silent browser autofill.
  await h.node('#shareQrButton').click();
  assert.equal(h.shares.length,1);
  assert.equal(h.shares[0].files.length,1);
  assert.equal(h.shares[0].files[0].type,'image/png');
  assert.equal(h.shares[0].text,undefined);
  assert.match(h.app.lastPayload,/Second Guest/);
});

test('saved profiles remain accessible after reopening with more than 50 entries', async () => {
  const profiles=Array.from({length:51},(_,i)=>({
    id:'profile-'+i,name:'Network '+i,ssid:'SSID-'+i,
    password:'valid-password',security:'WPA',hidden:false
  }));
  const h=harness('en',profiles);
  assert.equal(h.app.savedProfiles.length,51);
  assert.equal(h.node('#savedCount').textContent,'51');
  h.network('SSID-51','valid-password');
  await h.node('#saveProfileButton').click();
  await h.node('#confirmSaveProfile').click();
  assert.equal(h.app.savedProfiles.length,52);
  const reopened=harness('en',JSON.parse(h.storage.get('wifi-share-profiles-v1')));
  assert.equal(reopened.app.savedProfiles.length,52);
  assert.equal(reopened.node('#savedCount').textContent,'52');
});

for (const dismiss of ['cancel','close','escape','pagehide']) {
  test('NFC pending write is aborted on '+dismiss, async () => {
    let writes=0, aborted=0, signal;
    class MockNDEFReader {
      write(message,options) {
        writes++;signal=options.signal;
        assert.equal(options.overwrite,true);
        assert.equal(message.records[0].recordType,'mime');
        return new Promise((resolve,reject)=>{
          options.signal.addEventListener('abort',()=>{
            aborted++;const e=new Error('cancelled');e.name='AbortError';reject(e);
          },{once:true});
        });
      }
    }
    const h=harness('en',null,{window:{NDEFReader:MockNDEFReader,isSecureContext:true}});
    h.network('Guest','valid-password');
    await h.node('#nfcButton').click();
    assert.equal(h.node('#nfcDialog').open,true);
    const pending=h.node('#confirmNfcWrite').click();
    assert.equal(writes,1);
    assert.equal(h.node('#confirmNfcWrite').disabled,true);
    if(dismiss==='cancel') h.node('#cancelNfc').click();
    else if(dismiss==='close') h.node('#closeNfcDialog').click();
    else if(dismiss==='escape') h.node('#nfcDialog').close();
    else h.emitWindow('pagehide');
    assert.equal(signal.aborted,true);
    await pending;
    assert.equal(aborted,1);
    assert.doesNotMatch(h.node('#nfcState').textContent,/Could not write/);
  });
}

test('QR PNG save is cancelled if the network changes before async encoding finishes', async () => {
  const h=harness('en'); h.network('Previous Guest','valid-password'); h.app.generateQr();
  h.defer();
  await h.node('#saveQrButton').click();
  h.input('ssidInput','Updated Guest');
  h.flush();
  assert.equal(h.downloads.length,0,'Stale QR must not be downloaded');
  assert.match(h.node('#appToastMessage').textContent,/Wi-Fi details changed/);
});

test('QR-image system share never leaks a previous network during async PNG encoding', async () => {
  const h=harness('ja'); h.network('Old Guest','valid-password'); h.app.generateQr();
  h.defer();
  const pending=h.node('#shareQrButton').click();
  h.input('passwordInput','another-valid-password');
  h.flush(); await pending;
  assert.equal(h.shares.length,0,'Stale QR must not leave via OS share');
  assert.match(h.node('#appToastMessage').textContent,/Wi-Fi情報が変わりました/);
});

test('an empty SSID cannot be copied with a false success notification', async () => {
  const copied=[]; const h=harness('ja',null,{navigator:{clipboard:{writeText:async text=>copied.push(text)}}});
  await h.node('#copySsidButton').click();
  assert.equal(copied.length,0);
  assert.equal(h.node('#validationMessage').textContent,'ネットワーク名（SSID）を入力してください。');
  assert.equal(h.document.activeElement,h.node('#ssidInput'));
  h.input('ssidInput','Guest Network');
  await h.node('#copySsidButton').click();
  assert.deepEqual(copied,['Guest Network']);
});
