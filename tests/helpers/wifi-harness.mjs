import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const artifact = fs.readFileSync(process.env.APP_HTML || new URL('../../src/index.template.html', import.meta.url), 'utf8');
const compressed = artifact.match(/<script id="self-extract-payload"[^>]*>([A-Za-z0-9+/=\s]+)<\/script>/);
export const source = compressed ? gunzipSync(Buffer.from(compressed[1], 'base64')).toString('utf8') : artifact;
const start = source.indexOf('      const translations = {');
const end = source.lastIndexOf('    })();');
assert.ok(start > 0 && end > start, 'Application runtime must exist');

// Execute the actual application and event handlers. Only browser boundaries are
// substituted; native dialogs, layout, PNG decoding and downloads get browser QA.
export function harness(language = 'en', initialProfiles = null) {
  const nodes = new Map(), downloads = [], shares = [], pendingBlobs = [], storage = new Map();
  if (initialProfiles) storage.set('wifi-share-profiles-v1', JSON.stringify(initialProfiles));
  const storageWrites = [], windowListeners = {}, printCalls = [];
  let document, deferBlobs = false;
  class Element {
    constructor(tag = 'div', attrs = {}) {
      this.tagName = tag; this.attrs = attrs; this.value = attrs.value || ''; this.type = attrs.type || '';
      this.dataset = Object.fromEntries(Object.entries(attrs).filter(([k]) => k.startsWith('data-')).map(([k,v]) => [k.slice(5).replace(/-([a-z])/g, (_,c) => c.toUpperCase()), v]));
      this.hidden = 'hidden' in attrs; this.disabled = 'disabled' in attrs; this.checked = false;
      this.width = Number(attrs.width) || 300; this.height = Number(attrs.height) || 150; this.draws = [];
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
    get width() { return this._width; }
    set width(value) { this._width = value; this.draws = []; }
    getContext() { const canvas = this; return {fillRect(...args){canvas.draws.push(args);},clearRect(){canvas.draws = [];}}; }
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
  const context = {document,console,TextEncoder,Blob,File,setTimeout:()=>0,clearTimeout(){},APP_CONFIG:{defaultLanguage:language,version:'test',name:'Wi-Fi Share',nameJa:'Wi-Fi共有'},BUILD_MANIFEST:{},localStorage:{getItem:k=>storage.get(k) ?? null,setItem:(k,v)=>{storageWrites.push([k,v]);storage.set(k,v);}},navigator:{share:async data=>shares.push(data),canShare:()=>true},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},window:{QRCode:class {addData(){} make(){} getModuleCount(){return 21;} isDark(){return false;}},QRErrorCorrectLevel:{M:0},scrollTo(){},addEventListener:(type,fn)=>(windowListeners[type] ||= []).push(fn),print(){printCalls.push(true);for(const fn of windowListeners.beforeprint || []) fn();}}};
  vm.createContext(context);
  const qrStart=source.indexOf("(function(global){'use strict';");
  vm.runInContext(source.slice(qrStart,source.indexOf('</script>',qrStart)),context);
  vm.runInContext(`(() => {${source.slice(start,end)}\nglobalThis.app={validate,validateNfcDetails,buildWifiPayload,generateQr,downloadQr,canvasFile,getDetails,loadProfile,get lastPayload(){return lastPayload;}};})();`,context);
  return {app:context.app,node,document,downloads,shares,storage,storageWrites,printCalls,emitWindow(type){for(const fn of windowListeners[type] || []) fn();},input(id,value){const el=node('#'+id);assert.ok(el,id+' exists');el.focus();el.value=value;el.emit('input');return el;},network(ssid='Sample Guest',password='dummy-test-password'){this.input('ssidInput',ssid);this.input('passwordInput',password);},defer(){deferBlobs=true;},flush(){pendingBlobs.splice(0).forEach(done=>done());}};
}

