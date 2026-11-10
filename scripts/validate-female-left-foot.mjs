#!/usr/bin/env node
/**
 * Validate the 17 Visible Human Female left-foot STL files without importing
 * or changing atlas geometry.
 *
 * Usage:
 *   node scripts/validate-female-left-foot.mjs PATH_TO_FOOT_LEFT_FOLDER
 *   node scripts/validate-female-left-foot.mjs PATH_TO_FOOT_LEFT_FOLDER --out report.json
 *
 * The report records raw coordinates. It deliberately does NOT assume units,
 * axis orientation, origin, or a transform into the Human Reference Atlas.
 */
import fs from 'node:fs';
import path from 'node:path';

const EXPECTED = {
  CALCANEUS_LEFT: 2437884,
  CUBOID_LEFT: 676284,
  INTERMEDIATE_CUNEIFORM_LEFT: 335684,
  LATERAL_CUNEIFORM_LEFT: 376484,
  MEDIAL_CUNEIFORM_LEFT: 563884,
  METATARSAL_1_LEFT: 1011484,
  METATARSAL_2_LEFT: 683084,
  METATARSAL_3_LEFT: 623484,
  METATARSAL_4_LEFT: 592084,
  METATARSAL_5_LEFT: 628884,
  NAVICULAR_LEFT: 649484,
  PHALANGE_FOOT_1_LEFT: 777284,
  PHALANGE_FOOT_2_LEFT: 372284,
  PHALANGE_FOOT_3_LEFT: 297284,
  PHALANGE_FOOT_4_LEFT: 261284,
  PHALANGE_FOOT_5_LEFT: 266884,
  TALUS_LEFT: 1568684,
};

const args = process.argv.slice(2);
const folder = args.find((arg) => !arg.startsWith('--'));
if (!folder) {
  console.error('Usage: node scripts/validate-female-left-foot.mjs PATH_TO_FOOT_LEFT_FOLDER [--out report.json]');
  process.exit(2);
}
const outIndex = args.indexOf('--out');
const output = outIndex >= 0 ? args[outIndex + 1] : null;

function parseStl(buffer, filename) {
  const declared = buffer.length >= 84 ? buffer.readUInt32LE(80) : 0;
  const isBinary = declared > 0 && 84 + declared * 50 === buffer.length;
  const bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  let vertices = 0;
  let triangles = 0;
  const add = (x, y, z) => {
    const point = [x, y, z];
    if (!point.every(Number.isFinite)) {
      throw new Error(`${filename}: non-finite vertex at vertex ${vertices}`);
    }
    for (let axis = 0; axis < 3; axis++) {
      bounds.min[axis] = Math.min(bounds.min[axis], point[axis]);
      bounds.max[axis] = Math.max(bounds.max[axis], point[axis]);
    }
    vertices++;
  };

  if (isBinary) {
    triangles = declared;
    for (let triangle = 0; triangle < declared; triangle++) {
      const start = 84 + triangle * 50 + 12;
      for (let vertex = 0; vertex < 3; vertex++) {
        const at = start + vertex * 12;
        add(buffer.readFloatLE(at), buffer.readFloatLE(at + 4), buffer.readFloatLE(at + 8));
      }
    }
  } else {
    const source = buffer.toString('latin1');
    if (!/^\s*solid\b/i.test(source)) throw new Error(`${filename}: not a recognized binary or ASCII STL`);
    const pattern = /\bvertex\s+(-?[\d.eE+-]+)\s+(-?[\d.eE+-]+)\s+(-?[\d.eE+-]+)/gi;
    let match;
    while ((match = pattern.exec(source))) add(Number(match[1]), Number(match[2]), Number(match[3]));
    if (!vertices || vertices % 3) throw new Error(`${filename}: ASCII STL has an incomplete triangle`);
    triangles = vertices / 3;
  }

  if (!triangles || !vertices) throw new Error(`${filename}: empty mesh`);
  return {
    format: isBinary ? 'binary' : 'ascii',
    triangles,
    vertices,
    bounds,
    extent: bounds.min.map((value, axis) => bounds.max[axis] - value),
  };
}

const results = [];
const errors = [];
for (const [id, expectedBytes] of Object.entries(EXPECTED)) {
  const filename = `${id}.stl`;
  const fullPath = path.join(folder, filename);
  try {
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) throw new Error('not a file');
    const buffer = fs.readFileSync(fullPath);
    const mesh = parseStl(buffer, filename);
    results.push({
      id,
      file: filename,
      bytes: stat.size,
      expectedBytes,
      byteCountMatchesManifest: stat.size === expectedBytes,
      ...mesh,
    });
  } catch (error) {
    errors.push({ id, file: filename, error: error instanceof Error ? error.message : String(error) });
  }
}

const report = {
  dataset: 'BoneHub Visible-Human-3D-Models',
  datasetRevision: '53bd62452ae3fc34ba0fa6188517cd8ca9bf4a10',
  subject: '02_Female',
  region: 'FOOT_LEFT',
  sourceLicense: 'CC BY 4.0',
  validationOnly: true,
  coordinateWarning: 'Bounds are reported in raw source coordinates. Units, axis orientation, origin, and alignment with the Human Reference Atlas are not inferred.',
  expectedFiles: Object.keys(EXPECTED).length,
  validatedFiles: results.length,
  totalBytes: results.reduce((sum, item) => sum + item.bytes, 0),
  totalTriangles: results.reduce((sum, item) => sum + item.triangles, 0),
  byteCountMismatches: results.filter((item) => !item.byteCountMatchesManifest).map((item) => item.id),
  errors,
  meshes: results,
};
const json = JSON.stringify(report, null, 2);
if (output) fs.writeFileSync(output, json + '\n');
console.log(json);
if (errors.length || results.length !== Object.keys(EXPECTED).length) process.exitCode = 1;
