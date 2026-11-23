import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');

test('default build refreshes the root download without changing custom-output behavior', () => {
  assert.match(read('build-standalone.ps1'), /if \(-not \$OutputPathWasSpecified\)\s*\{\s*Copy-Item -LiteralPath \$OutputPath -Destination \(Join-Path \$Root "wifi-share\.html"\) -Force/);
});

test('aggregate checks execute behavior tests on source, readable, and root downloads', () => {
  const check=read('scripts/check-repository.ps1');
  for(const path of ['src/index.template.html','dist/index.html','wifi-share.html']) assert.ok(check.includes('"'+path+'"'), path);
  assert.match(check,/node --test/);
  assert.match(check,/\$LASTEXITCODE -ne 0/);
  assert.match(check,/test-release|release-contract\.test\.mjs/);
});

test('root download is byte-identical to the fresh readable build', () => {
  assert.deepEqual(fs.readFileSync(new URL('wifi-share.html',root)),fs.readFileSync(new URL('dist/index.html',root)));
});

test('main merge publishes a versioned tag and GitHub Release after successful tests', () => {
  const workflow=read('.github/workflows/release.yml');
  const cfg=JSON.parse(read('app.config.json'));
  assert.equal(cfg.version,'1.1.4');
  assert.match(workflow,/push:\s*\n\s*branches:\s*\[main\]/);
  assert.match(workflow,/src\/index\.template\.html/);
  assert.match(workflow,/permissions:\s*\n\s*contents:\s*write/);
  assert.match(workflow,/\.\/scripts\/check-repository\.ps1/);
  assert.match(workflow,/gh release view \$tag/);
  assert.match(workflow,/gh release create \$tag/);
  assert.match(workflow,/--target \$env:GITHUB_SHA/);
  assert.match(workflow,/--generate-notes/);
  assert.match(workflow,/dist\/index\.html/);
  assert.match(workflow,/dist\/index\.self-extract\.html/);
  assert.match(workflow,/Compress-Archive/);
});

test('the unprivileged Chromium job covers decoded QR and credential flow regressions', () => {
  const job=read('.github/workflows/preview.yml');
  assert.ok(job.includes('playwright@1.58.2 jsqr@1.4.0'));
  assert.ok(job.includes('node scripts/wifi-flow.browser.test.cjs'));
  assert.ok(job.includes('if ($LASTEXITCODE -ne 0)'));
});

test('aggregate checks cover current-state behavior and the decoded self-extract artifact', () => {
  const check=read('scripts/check-repository.ps1');
  assert.ok(check.includes('"dist/index.self-extract.html"'));
  assert.ok(check.includes('"tests/current-state.test.mjs"'));
});
