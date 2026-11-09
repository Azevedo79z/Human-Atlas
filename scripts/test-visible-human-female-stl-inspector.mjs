import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FEMALE_BONE_FILES } from './lib/visible-human-female-inventory.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const inspector = path.join(here, 'inspect-visible-human-female-stl.mjs');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'female-stl-qa-'));

function binaryTriangle() {
  const buffer = Buffer.alloc(134);
  buffer.writeUInt32LE(1, 80);
  const vertices = [[0,0,0],[1,0,0],[0,1,1]];
  vertices.forEach((vertex, index) => vertex.forEach((value, axis) =>
    buffer.writeFloatLE(value, 96 + index * 12 + axis * 4)));
  return buffer;
}
function runCase(name, entries, expectedCode, expectedText) {
  const root = path.join(temp, name, '02_Female');
  fs.mkdirSync(root, { recursive: true });
  for (const [relative, bytes] of entries) {
    const destination = path.join(root, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes);
  }
  const result = spawnSync(process.execPath, [inspector, root], { encoding: 'utf8' });
  assert.equal(result.status, expectedCode, `${name}: unexpected exit code\n${result.stdout}\n${result.stderr}`);
  assert.ok((result.stdout + result.stderr).includes(expectedText), `${name}: expected output containing "${expectedText}"`);
}
const allValid = FEMALE_BONE_FILES.map(file => [file.key, binaryTriangle()]);
try {
  runCase('valid-canonical-inventory', allValid, 0, '"exactInventoryMatches": true');
  runCase('missing-canonical-file', allValid.slice(1), 2, '"exactInventoryMatches": false');
  runCase('unexpected-extra-file', [...allValid, ['EXTRA/UNLISTED.stl', binaryTriangle()]], 2, 'EXTRA/UNLISTED.stl');
  runCase('empty-binary', allValid.map(([name, bytes], i) => [name, i === 0 ? Buffer.alloc(84) : bytes]), 2, 'binary STL contains zero triangles');
  runCase('incomplete-ascii', allValid.map(([name, bytes], i) => [name, i === 0
    ? Buffer.from('solid test\\n facet normal 0 0 1\\n vertex 0 0 0\\n vertex 1 0 0\\nendsolid test\\n')
    : bytes]), 2, 'expected complete triangle groups of three');
  console.log('STL inspector regression tests passed: canonical inventory accepted; missing/extra files, empty binary and incomplete ASCII rejected.');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
