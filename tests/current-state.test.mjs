import test from 'node:test';
import assert from 'node:assert/strict';
import {source,harness} from './helpers/wifi-harness.mjs';

const first={ssid:'Synthetic Cafe;\\,:"A',password:'dummy-A;\\,:"12345'};
const second={id:'synthetic-b',ssid:'合成ネットB',password:'dummy-B-password',security:'WPA',hidden:false};
const canvasIds=['qrPreviewCanvas','qrDialogCanvas','printPreviewQr','printSheetQr'];
const textIds=['qrPreviewSsid','qrDialogSsid','largeSsid','largePassword','printPreviewSsid','printSheetSsid','printPreviewPassword','printSheetPassword'];
function prepare(h) {
  h.network(first.ssid,first.password);
  h.app.generateQr({openDialog:true}); h.node('#closeQrDialog').click();
  h.node('#largeDisplayButton').click(); h.node('#closeLargeDisplay').click();
  h.node('#printLayoutButton').click();
  h.node('#printPasswordCheckbox').checked=true; h.node('#printPasswordCheckbox').emit('change');
  h.node('#cancelPrint').click();
  assert.equal(h.node('#printSheetPassword').textContent,first.password);
  assert.ok(h.node('#printSheetQr').draws.length>100);
}
function assertUnprepared(h) {
  assert.equal(h.node('#printSheet').dataset.ready,'false');
  assert.equal(h.node('#printPasswordCheckbox').checked,false);
  for(const id of ['printPreviewPasswordRow','printSheetPasswordRow']) assert.equal(h.node('#'+id).hidden,true,id);
  for(const id of ['printPreviewSsid','printSheetSsid','printPreviewPassword','printSheetPassword']) assert.equal(h.node('#'+id).textContent,'',id);
  for(const id of ['printPreviewQr','printSheetQr']) assert.equal(h.node('#'+id).draws.length,0,id);
}
for(const language of ['ja','en']) {
  for(const [id,event,value] of [['ssidInput','input','Next Guest'],['passwordInput','input','dummy-next'],['securitySelect','change','WEP'],['hiddenCheckbox','change',true]]) {
    test(`${language}: ${id} invalidates prepared credentials and password consent`,()=>{
      const h=harness(language);prepare(h); const el=h.node('#'+id);el.focus();
      if(id==='hiddenCheckbox') el.checked=value; else el.value=value; el.emit(event);
      assertUnprepared(h);assert.equal(h.app.lastPayload,'');assert.equal(h.node('#qrPreviewWrap').hidden,true);
      for(const id of textIds) assert.equal(h.node('#'+id).textContent,'',id);
      for(const id of canvasIds) assert.equal(h.node('#'+id).draws.length,0,id);
      assert.equal(h.document.activeElement,el);assert.equal(h.storageWrites.length,0);
    });
  }
  test(`${language}: profile load invalidates print and generates only current QR`,()=>{
    const h=harness(language,[second]);prepare(h);const stored=h.storage.get('wifi-share-profiles-v1');
    h.app.loadProfile(second.id);assertUnprepared(h);
    assert.equal(h.app.getDetails().ssid,second.ssid);assert.match(h.app.lastPayload,/S:合成ネットB;/);
    assert.equal(h.storage.get('wifi-share-profiles-v1'),stored);assert.equal(h.storageWrites.length,0);
  });
  test(`${language}: manually emptying inputs removes all printable credentials`,()=>{
    const h=harness(language);prepare(h);h.network('','');assert.equal(h.app.generateQr(),false);assertUnprepared(h);
    h.emitWindow('beforeprint');assertUnprepared(h);
  });
  test(`${language}: clear resets form, transients, validation, masking, and focus without storage writes`,()=>{
    const h=harness(language,[second]);h.app.loadProfile(second.id);prepare(h);
    const stored=[...h.storage];h.node('#passwordToggle').click();h.node('#securitySelect').value='WEP';h.node('#hiddenCheckbox').checked=true;
    h.input('outputFilename','会場 handout.png');h.app.generateQr({openDialog:true});
    h.node('#largeDisplayButton').click();h.node('#printLayoutButton').click();
    h.node('#clearCurrentButton')?.click();
    assert.equal(h.app.getDetails().ssid,'');assert.equal(h.app.getDetails().password,'');assert.equal(h.app.getDetails().security,'WPA');assert.equal(h.app.getDetails().hidden,false);
    assert.equal(h.node('#passwordInput').type,'password');assert.equal(h.node('#passwordInput').disabled,false);assert.equal(h.node('#passwordToggle').disabled,false);
    assert.equal(h.node('#passwordToggle').getAttribute('aria-label'),language==='ja'?'パスワードを表示':'Show password');
    assert.equal(h.node('#validationMessage').textContent,'');assert.equal(h.node('#ssidInput').getAttribute('aria-invalid'),null);assert.equal(h.node('#passwordInput').getAttribute('aria-invalid'),null);
    for(const id of ['qrDialog','largeDisplayDialog','printDialog']) assert.equal(h.node('#'+id).open,false,id);
    for(const id of textIds) assert.equal(h.node('#'+id).textContent,'',id);
    for(const id of canvasIds) assert.equal(h.node('#'+id).draws.length,0,id);
    assertUnprepared(h);assert.equal(h.document.activeElement,h.node('#ssidInput'));
    assert.equal(h.node('#outputFilename').value,'会場 handout.png');assert.deepEqual([...h.storage],stored);assert.equal(h.storageWrites.length,0);
    assert.equal(h.document.documentElement.lang,language);h.node('#clearCurrentButton').click();assertUnprepared(h);
    assert.equal(h.app.generateQr(),false);h.node('#clearCurrentButton').click();assert.equal(h.node('#validationMessage').textContent,'');assert.equal(h.node('#ssidInput').getAttribute('aria-invalid'),null);
    h.app.loadProfile(second.id);assert.equal(h.app.getDetails().ssid,second.ssid);
  });
  test(`${language}: native print stays unprepared until explicitly prepared`,()=>{
    const h=harness(language);h.network();h.app.generateQr();h.emitWindow('beforeprint');assertUnprepared(h);
    assert.equal(h.node('#printUnpreparedMessage')?.textContent,language==='ja'?'印刷する前に「印刷用レイアウト」を開いてください。':'Open Print layout before printing.');
    h.node('#printLayoutButton').click();const pixels=JSON.stringify(h.node('#printSheetQr').draws);h.node('#cancelPrint').click();h.emitWindow('beforeprint');
    assert.equal(h.node('#printSheet').dataset.ready,'true');assert.equal(JSON.stringify(h.node('#printSheetQr').draws),pixels);
    h.node('#ssidInput').value='Silent replacement';h.emitWindow('beforeprint');assertUnprepared(h);
  });
  test(`${language}: reprepare uses the new network with password printing off`,()=>{
    const h=harness(language);prepare(h);const old=JSON.stringify(h.node('#printSheetQr').draws);h.network(second.ssid,second.password);h.app.generateQr();assertUnprepared(h);
    h.node('#printLayoutButton').click();assert.equal(h.node('#printSheet').dataset.ready,'true');assert.equal(h.node('#printSheetSsid').textContent,second.ssid);
    assert.notEqual(JSON.stringify(h.node('#printSheetQr').draws),old);assert.equal(h.node('#printPasswordCheckbox').checked,false);assert.equal(h.node('#printSheetPasswordRow').hidden,true);
  });
}
test('clear remains separate from deleting profiles and resets automatic filenames',()=>{
  const h=harness();h.network();h.app.generateQr();
  assert.equal(h.node('#clearCurrentButton')?.type,'button');assert.equal(h.node('#clearCurrentButton')?.dataset.i18n,'clearCurrent');
  h.node('#clearCurrentButton').click();assert.equal(h.node('#outputFilename').value,'wifi-network.png');
  h.node('#securitySelect').value='nopass';h.node('#securitySelect').emit('change');h.node('#clearCurrentButton').click();assert.equal(h.node('#passwordInput').disabled,false);
});
test('print CSS hides unprepared credential cards and shows only preparation instructions',()=>{
  assert.match(source,/\.print-sheet(?![^{}]*\[data-ready)[^{]*\s+\.print-sheet-card\s*\{[^}]*display:\s*none\s*!important/s);
  assert.match(source,/\.print-sheet\[data-ready="true"\]\s+\.print-sheet-card\s*\{[^}]*display:\s*flex\s*!important/s);
  assert.match(source,/\.print-sheet\[data-ready="true"\]\s+\.print-unprepared\s*\{[^}]*display:\s*none\s*!important/s);
});

for(const action of ['confirmPrint','printPasswordCheckbox','languageButton']) test(`silent credential replacement cannot carry password-print consent through ${action}`,()=>{
  const h=harness();prepare(h);h.node('#printLayoutButton').click();h.node('#printPasswordCheckbox').checked=true;h.node('#printPasswordCheckbox').emit('change');
  h.node('#ssidInput').value=second.ssid;h.node('#passwordInput').value=second.password;
  if(action==='printPasswordCheckbox') h.node('#'+action).emit('change');else h.node('#'+action).click();
  assertUnprepared(h);assert.equal(h.printCalls.length,0);assert.equal(h.node('#printDialog').open,false);
  h.node('#printLayoutButton').click();assert.equal(h.node('#printSheetSsid').textContent,second.ssid);assert.equal(h.node('#printPasswordCheckbox').checked,false);
  h.node('#confirmPrint').click();assert.equal(h.printCalls.length,1);assert.equal(h.node('#printSheetPasswordRow').hidden,true);
});
