import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
function runCase(name, files, expectedCode, expectedText) {
  const root = path.join(temp, name, '02_Female');
  fs.mkdirSync(root, { recursive: true });
  for (const [filename, bytes] of Object.entries(files)) fs.writeFileSync(path.join(root, filename), bytes);
  const result = spawnSync(process.execPath, [inspector, root], { encoding: 'utf8' });
  assert.equal(result.status, expectedCode, `${name}: unexpected exit code\n${result.stdout}\n${result.stderr}`);
  assert.ok((result.stdout + result.stderr).includes(expectedText), `${name}: expected output containing "${expectedText}"`);
}
try {
  runCase('valid-binary', { 'valid.stl': binaryTriangle() }, 0, '"validStlFiles": 1');
  runCase('empty-binary', { 'empty.stl': Buffer.alloc(84) }, 2, 'binary STL contains zero triangles');
  runCase('incomplete-ascii', {
    'partial.stl': Buffer.from('solid test\n facet normal 0 0 1\n vertex 0 0 0\n vertex 1 0 0\nendsolid test\n'),
  }, 2, 'expected complete triangle groups of three');
  console.log('STL parser regression tests passed: valid binary accepted; empty binary and incomplete ASCII rejected.');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
