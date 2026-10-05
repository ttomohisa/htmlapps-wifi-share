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

test('aggregate checks cover current-state behavior and the decoded self-extract artifact', () => {
  const check=read('scripts/check-repository.ps1');
  assert.ok(check.includes('"dist/index.self-extract.html"'));
  assert.ok(check.includes('"tests/current-state.test.mjs"'));
});
