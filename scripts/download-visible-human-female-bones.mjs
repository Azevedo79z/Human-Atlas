/**
 * Download the 143 public Visible Human Female bone STL meshes from the
 * user's Hugging Face Storage Bucket for a read-only preflight.
 *
 * Usage: node scripts/download-visible-human-female-bones.mjs PATH_TO_02_Female
 * No Hugging Face CLI, Python, API token, or local admin rights are required.
 * This script downloads source files only; it never edits Atlas manifests.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const destination = process.argv[2];
if (!destination) {
  console.error('Usage: node scripts/download-visible-human-female-bones.mjs PATH_TO_02_Female');
  process.exit(1);
}
const root = path.resolve(destination);
if (path.basename(root) !== '02_Female') {
  console.error('Safety stop: destination directory must be named exactly 02_Female.');
  process.exit(1);
}

const bucket = 'https://huggingface.co/buckets/Azevedo79z/visible-human-3d-models-bucket/resolve/';
const prefix = 'visible_human_3d_models/CT/Mesh/02_Female/';
const files = [];
const add = (region, filename) => files.push({ region, filename, key: `${region}/${filename}` });
const sides = ['LEFT', 'RIGHT'];

for (const side of sides) {
  for (const bone of [
    'CALCANEUS', 'CUBOID', 'INTERMEDIATE_CUNEIFORM', 'LATERAL_CUNEIFORM',
    'MEDIAL_CUNEIFORM', 'NAVICULAR', 'TALUS',
  ]) add(`FOOT_${side}`, `${bone}_${side}.stl`);
  for (let n = 1; n <= 5; n++) {
    add(`FOOT_${side}`, `METATARSAL_${n}_${side}.stl`);
    add(`FOOT_${side}`, `PHALANGE_FOOT_${n}_${side}.stl`);
  }

  for (const bone of [
    'CAPITATE', 'HAMATE', 'LUNATE', 'PISIFORM', 'SCAPHOID',
    'TRAPEZIUM', 'TRAPEZOID', 'TRIQUETRUM',
  ]) add(`HAND_${side}`, `${bone}_${side}.stl`);
  for (let n = 1; n <= 5; n++) {
    add(`HAND_${side}`, `METACARPAL_${n}_${side}.stl`);
    add(`HAND_${side}`, `PHALANGE_HAND_${n}_${side}.stl`);
  }

  for (const bone of ['FEMUR', 'FIBULA', 'HIP', 'PATELLA', 'TIBIA']) {
    add(`LOWER_EXTREMITY_${side}`, `${bone}_${side}.stl`);
  }
  for (const bone of ['CLAVICLE', 'HUMERUS', 'RADIUS', 'SCAPULA', 'ULNA']) {
    add(`UPPER_EXTREMITY_${side}`, `${bone}_${side}.stl`);
  }
}

add('SKULL', 'SKULL_CRANIAL_MAXILLA.stl');
add('SKULL', 'SKULL_MANDIBLE.stl');
add('SPINAL_COLUMN', 'SACRUM.stl');
for (const [prefixName, last] of [['C', 7], ['T', 12], ['L', 6]]) {
  for (let n = 1; n <= last; n++) add('SPINAL_COLUMN', `VERTEBRA_${prefixName}${n}.stl`);
}
add('THORAX', 'STERNUM.stl');
for (let n = 1; n <= 12; n++) {
  for (const side of sides) add('THORAX', `RIB_${n}_${side}.stl`);
}

if (files.length !== 143 || new Set(files.map(file => file.key)).size !== 143) {
  throw new Error(`Internal inventory error: expected 143 unique STL paths, generated ${files.length}.`);
}

await fs.mkdir(root, { recursive: true });
let cursor = 0, completed = 0, totalBytes = 0;
const failures = [];
const workers = Array.from({ length: 6 }, async () => {
  while (true) {
    const index = cursor++;
    if (index >= files.length) return;
    const file = files[index];
    const relative = `${file.region}/${file.filename}`;
    const url = bucket + (prefix + relative).split('/').map(encodeURIComponent).join('/') + '?download=true';
    const output = path.join(root, file.region, file.filename);
    await fs.mkdir(path.dirname(output), { recursive: true });
    let error;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(180_000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length < 84) throw new Error(`Unexpectedly small response (${bytes.length} bytes)`);
        if (bytes.subarray(0, 5).toString('ascii').toLowerCase() === '<html') {
          throw new Error('The bucket returned an HTML page instead of an STL file.');
        }
        await fs.writeFile(output, bytes);
        totalBytes += bytes.length;
        completed++;
        if (completed % 10 === 0 || completed === files.length) {
          console.log(`Downloaded ${completed}/${files.length} STL files`);
        }
        error = null;
        break;
      } catch (cause) {
        error = cause instanceof Error ? cause.message : String(cause);
        if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 1500));
      }
    }
    if (error) failures.push({ file: relative, error });
  }
});
await Promise.all(workers);

const report = {
  source: bucket,
  sourceFolder: prefix,
  expectedFiles: 143,
  downloadedFiles: completed,
  totalBytes,
  failures,
  destination: root,
  safety: 'Downloaded source copies only. No Atlas files or manifests were modified.',
};
console.log(JSON.stringify(report, null, 2));
if (failures.length || completed !== 143) process.exitCode = 1;
