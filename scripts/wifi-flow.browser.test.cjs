'use strict';
// Public, synthetic credentials only. The test uses pinned test-only tooling.
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const jsQR = require('jsqr');

async function inspect(browser, name, language, width) {
  const context = await browser.newContext({
    viewport: { width, height: width < 600 ? 760 : 900 },
    locale: language,
    acceptDownloads: true,
    reducedMotion: 'reduce'
  });
  const page = await context.newPage();
  const errors = [], remote = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', q => { if (/^https?:/i.test(q.url())) remote.push(q.url()); });
  const label = name + ' / ' + language + ' / ' + width;
  const ssid = '合成;Guest', password = 'demo:password;123';
  try {
    await page.goto(pathToFileURL(path.resolve(__dirname, '..', name)).href);
    await page.locator('#ssidInput').waitFor();
    if ((await page.locator('html').getAttribute('lang')) !== language) {
      await page.locator('#languageButton').click();
    }
    await page.locator('#copySsidButton').click();
    assert.equal(await page.locator('#validationMessage').innerText(),
      language === 'ja' ? 'ネットワーク名（SSID）を入力してください。' : 'Enter the network name (SSID).', label + ': empty SSID');
    await page.locator('#ssidInput').fill(ssid);
    await page.locator('#passwordInput').fill(password);
    await page.locator('#showQrButton').click();
    assert.equal(await page.locator('#qrDialog').evaluate(d => d.open), true, label + ': QR shown');
    const pixels = await page.locator('#qrDialogCanvas').evaluate(canvas => {
      const image = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
      return { width: canvas.width, height: canvas.height, data: Array.from(image.data) };
    });
    const decoded = jsQR(Uint8ClampedArray.from(pixels.data), pixels.width, pixels.height);
    assert.ok(decoded, label + ': QR decodes');
    assert.equal(decoded.data, 'WIFI:T:WPA;S:合成\\;Guest;P:demo\\:password\\;123;;', label + ': decoded payload');
    await page.locator('#outputFilename').fill('案内/Guest.png');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#saveQrButton').click()
    ]);
    assert.equal(download.suggestedFilename(), '案内-Guest.png', label + ': sanitized PNG filename');
    await download.path();
    await page.locator('#closeQrDialog').click();
    await page.locator('#saveProfileButton').click();
    assert.equal(await page.locator('#saveProfileDialog').evaluate(d => d.open), true, label + ': Save dialog');
    await page.locator('#profileNameInput').fill('Sample network');
    await page.locator('#confirmSaveProfile').click();
    assert.equal(await page.locator('.saved-card').count(), 1, label + ': one saved Wi-Fi');
    await page.locator('#passwordToggle').click();
    assert.equal(await page.locator('#passwordInput').getAttribute('type'), 'text', label + ': explicit reveal');
    await page.locator('.saved-load').click();
    assert.equal(await page.locator('#passwordInput').getAttribute('type'), 'password', label + ': saved password remasked');
    assert.equal(await page.locator('#passwordInput').inputValue(), password, label + ': loaded password');
    await page.locator('#printLayoutButton').click();
    assert.equal(await page.locator('#printDialog').evaluate(d => d.open), true, label + ': print dialog');
    assert.equal(await page.locator('#printPasswordCheckbox').isChecked(), false, label + ': no password-text consent');
    assert.equal(await page.locator('#printSheetPasswordRow').evaluate(el => el.hidden), true, label + ': no password text');
    await page.locator('#cancelPrint').click();
    await page.locator('#clearCurrentButton').click();
    assert.equal(await page.locator('#appConfirmDialog').evaluate(d => d.open), true, label + ': clear confirmation');
    await page.locator('#appConfirmCancel').click();
    assert.equal(await page.locator('#ssidInput').inputValue(), ssid, label + ': cancel retains current credentials');
    await page.locator('#clearCurrentButton').click();
    await page.locator('#appConfirmOk').click();
    assert.equal(await page.locator('#ssidInput').inputValue(), '', label + ': clear resets SSID');
    assert.equal(await page.locator('#passwordInput').inputValue(), '', label + ': clear resets password');
    assert.equal(await page.locator('#savedCount').innerText(), '1', label + ': saved profiles unaffected');
    await page.reload();
    assert.equal(await page.locator('#savedCount').innerText(), '1', label + ': profile persists');
    assert.equal(await page.locator('html').getAttribute('lang'), language, label + ': language persists');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), label + ': no horizontal scroll');
    assert.deepEqual(errors, [], label + ': no browser errors');
    assert.deepEqual(remote, [], label + ': no runtime requests');
    console.log('PASS ' + label);
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await chromium.launch();
  try {
    for (const name of ['dist/index.html', 'dist/index.self-extract.html', 'wifi-share.html']) {
      for (const language of ['ja', 'en']) {
        await inspect(browser, name, language, language === 'ja' ? 390 : 1360);
      }
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
