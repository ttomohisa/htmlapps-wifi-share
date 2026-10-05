import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = fs.readFileSync(process.env.APP_HTML || new URL('../src/index.template.html', import.meta.url), 'utf8');
const start = source.indexOf('      const translations = {');
const end = source.lastIndexOf('    })();');
assert.ok(start > 0 && end > start, 'Application runtime must exist');

// Execute the actual application and event handlers. Only browser boundaries are
// substituted; native dialogs, layout, PNG decoding and downloads get browser QA.
function harness(language = 'en') {
  const nodes = new Map(), downloads = [], shares = [], pendingBlobs = [], storage = new Map();
  let document, deferBlobs = false;
  class Element {
    constructor(tag = 'div', attrs = {}) {
      this.tagName = tag; this.attrs = attrs; this.value = attrs.value || ''; this.type = attrs.type || '';
      this.dataset = Object.fromEntries(Object.entries(attrs).filter(([k]) => k.startsWith('data-')).map(([k,v]) => [k.slice(5).replace(/-([a-z])/g, (_,c) => c.toUpperCase()), v]));
      this.hidden = 'hidden' in attrs; this.disabled = 'disabled' in attrs; this.checked = false;
      this.listeners = {}; this.children = []; this.style = {}; this.textContent = ''; this.open = false;
      this.classList = {add(){},remove(){},toggle(){}};
    }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    removeEventListener() {}
    emit(type) { return Promise.all((this.listeners[type] || []).map(fn => fn({target:this,preventDefault(){}}))); }
    click() { if (this.tagName === 'a') downloads.push(this.download); else if (!this.disabled) return this.emit('click'); }
    setAttribute(k,v) { this.attrs[k] = String(v); }
    getAttribute(k) { return this.attrs[k] ?? null; }
    removeAttribute(k) { delete this.attrs[k]; }
    focus() { document.activeElement = this; }
    select() { this.focus(); }
    showModal() { this.previousFocus = document.activeElement; this.open = true; }
    close() { this.open = false; this.previousFocus?.focus(); this.emit('close'); }
    replaceChildren(...children) { this.children = children; }
    append(...children) { this.children.push(...children); }
    querySelector() { return this.child ||= new Element('span'); }
    getContext() { return {fillRect(){}}; }
    toBlob(fn) { const done = () => fn(new Blob(['synthetic PNG boundary'], {type:'image/png'})); if (deferBlobs) pendingBlobs.push(done); else done(); }
  }
  for (const match of source.slice(0, source.indexOf('<script>')).matchAll(/<([\w-]+)\b([^>]*)>/g)) {
    const attrs = {};
    for (const attr of match[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g)) attrs[attr[1]] = attr[2] || '';
    if (attrs.id) nodes.set('#'+attrs.id, new Element(match[1], attrs));
  }
  const node = selector => nodes.get(selector) || null;
  document = {documentElement:{},activeElement:null,querySelector:node,querySelectorAll:selector=>[...nodes.values()].filter(n=>selector.slice(1,-1) in n.attrs),createElement:tag=>new Element(tag),addEventListener(){}};
  node('#securitySelect').value = 'WPA';
  const context = {document,console,TextEncoder,Blob,File,setTimeout:()=>0,clearTimeout(){},APP_CONFIG:{defaultLanguage:language,version:'test',name:'Wi-Fi Share',nameJa:'Wi-Fi共有'},BUILD_MANIFEST:{},localStorage:{getItem:k=>storage.get(k) ?? null,setItem:(k,v)=>storage.set(k,v)},navigator:{share:async data=>shares.push(data),canShare:()=>true},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},window:{QRCode:class {addData(){} make(){} getModuleCount(){return 21;} isDark(){return false;}},QRErrorCorrectLevel:{M:0},scrollTo(){}}};
  vm.createContext(context);
  vm.runInContext(`(() => {${source.slice(start,end)}\nglobalThis.app={validate,validateNfcDetails,buildWifiPayload,generateQr,downloadQr,canvasFile,getDetails,get lastPayload(){return lastPayload;}};})();`,context);
  return {app:context.app,node,document,downloads,shares,storage,input(id,value){const el=node('#'+id);assert.ok(el,id+' exists');el.focus();el.value=value;el.emit('input');return el;},network(ssid='Sample Guest',password='dummy-test-password'){this.input('ssidInput',ssid);this.input('passwordInput',password);},defer(){deferBlobs=true;},flush(){pendingBlobs.splice(0).forEach(done=>done());}};
}

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
