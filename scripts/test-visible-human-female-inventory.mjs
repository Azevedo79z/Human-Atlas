import assert from 'node:assert/strict';
import {
  FEMALE_BONE_FILES,
  FEMALE_BONE_FILE_COUNT,
} from './lib/visible-human-female-inventory.mjs';

const expectedCounts = {
  FOOT_LEFT: 17,
  FOOT_RIGHT: 17,
  HAND_LEFT: 18,
  HAND_RIGHT: 18,
  LOWER_EXTREMITY_LEFT: 5,
  LOWER_EXTREMITY_RIGHT: 5,
  UPPER_EXTREMITY_LEFT: 5,
  UPPER_EXTREMITY_RIGHT: 5,
  SKULL: 2,
  SPINAL_COLUMN: 26,
  THORAX: 25,
};

assert.equal(FEMALE_BONE_FILE_COUNT, 143, 'canonical inventory must contain exactly 143 files');
assert.equal(FEMALE_BONE_FILES.length, 143, 'exported inventory length must be 143');

const keys = FEMALE_BONE_FILES.map(file => file.key);
assert.equal(new Set(keys).size, 143, 'all inventory paths must be unique');

const counts = Object.fromEntries(
  Object.keys(expectedCounts).map(region => [
    region,
    FEMALE_BONE_FILES.filter(file => file.region === region).length,
  ]),
);
assert.deepEqual(counts, expectedCounts, 'per-region inventory counts must match the reviewed anatomy list');

for (const file of FEMALE_BONE_FILES) {
  assert.ok(file.filename.toLowerCase().endsWith('.stl'), `non-STL filename: ${file.key}`);
  assert.equal(file.key, `${file.region}/${file.filename}`, `invalid canonical key: ${file.key}`);
  assert.ok(file.region && file.filename, 'every inventory entry must include region and filename');
}

console.log(JSON.stringify({
  status: 'passed',
  expectedFiles: 143,
  uniquePaths: keys.length,
  regionCounts: counts,
  checks: ['file-count', 'unique-paths', 'region-counts', 'STL-extension', 'canonical-key'],
}, null, 2));
