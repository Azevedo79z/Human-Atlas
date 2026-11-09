/**
 * Canonical inventory of the 143 public Visible Human Female bone STL files.
 * Shared by the downloader and the read-only import planner.
 * Keep this as the single source of truth for source paths.
 */
const files = [];
const add = (region, filename) => files.push(Object.freeze({
  region,
  filename,
  key: `${region}/${filename}`,
}));
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
for (const [prefix, last] of [['C', 7], ['T', 12], ['L', 6]]) {
  for (let n = 1; n <= last; n++) add('SPINAL_COLUMN', `VERTEBRA_${prefix}${n}.stl`);
}
add('THORAX', 'STERNUM.stl');
for (let n = 1; n <= 12; n++) {
  for (const side of sides) add('THORAX', `RIB_${n}_${side}.stl`);
}

if (files.length !== 143 || new Set(files.map(file => file.key)).size !== 143) {
  throw new Error(`Internal inventory error: expected 143 unique STL paths, generated ${files.length}.`);
}

export const FEMALE_BONE_FILES = Object.freeze(files);
export const FEMALE_BONE_FILE_COUNT = FEMALE_BONE_FILES.length;
