/**
 * Read-only landmark registration preflight for the 143 Visible Human Female
 * bone meshes against the current Human Reference Atlas female skeleton.
 *
 * Usage: node scripts/measure-visible-human-female-registration.mjs PATH_TO_02_Female
 * This reports candidate axis rotation, provisional mm-to-metre fit, and
 * region-specific uniform transforms. It never writes to Atlas assets.
 *
 * Important: STL has no unit metadata. The millimetre assumption is provisional
 * and must be confirmed by source documentation and visual landmark review.
 */
import fs from 'node:fs';
import path from 'node:path';

const source = process.argv[2];
if (!source) {
  console.error('Usage: node scripts/measure-visible-human-female-registration.mjs PATH_TO_02_Female');
  process.exit(1);
}
const root = path.resolve(source);
if (path.basename(root) !== '02_Female' || !fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  console.error('Safety stop: input must be an existing directory named exactly 02_Female.');
  process.exit(1);
}

const atlas = JSON.parse(fs.readFileSync(new URL('../public/models/atlas-female.json', import.meta.url), 'utf8'));
const hostBones = atlas.parts.filter(part => part.system === 'skeletal');
const sourceBounds = new Map();
const hostBounds = new Map();
const center = bounds => bounds[0].map((value, i) => (value + bounds[1][i]) / 2);
const mergeBounds = boundsList => {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const bounds of boundsList) for (let axis = 0; axis < 3; axis++) {
    min[axis] = Math.min(min[axis], bounds[0][axis]);
    max[axis] = Math.max(max[axis], bounds[1][axis]);
  }
  return [min, max];
};

function readStlBounds(file) {
  const buffer = fs.readFileSync(file);
  const count = buffer.length >= 84 ? buffer.readUInt32LE(80) : -1;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  const add = values => {
    for (let axis = 0; axis < 3; axis++) {
      if (!Number.isFinite(values[axis])) throw new Error('Non-finite STL vertex.');
      min[axis] = Math.min(min[axis], values[axis]);
      max[axis] = Math.max(max[axis], values[axis]);
    }
  };
  if (count >= 0 && 84 + count * 50 === buffer.length) {
    for (let triangle = 0; triangle < count; triangle++) {
      const offset = 84 + triangle * 50 + 12;
      for (let vertex = 0; vertex < 3; vertex++) {
        const at = offset + vertex * 12;
        add([buffer.readFloatLE(at), buffer.readFloatLE(at + 4), buffer.readFloatLE(at + 8)]);
      }
    }
  } else {
    const text = buffer.toString('utf8');
    const vertex = /\bvertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g;
    let match, found = 0;
    while ((match = vertex.exec(text))) {
      add(match.slice(1, 4).map(Number));
      found++;
    }
    if (!found) throw new Error('Not a recognized binary or ASCII STL.');
  }
  return [min, max];
}

const anchors = [];
const addAnchor = (id, relativePath, hostName, hostParts = null) => {
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) throw new Error(`Missing anchor STL: ${relativePath}`);
  const bounds = readStlBounds(file);
  sourceBounds.set(id, bounds);
  const matches = hostParts ?? hostBones.filter(part => part.name === hostName);
  if (!matches.length) throw new Error(`Missing Atlas anchor: ${hostName}`);
  const target = mergeBounds(matches.map(part => part.bounds));
  hostBounds.set(id, target);
  // Visible Human STL coordinates are provisionally treated as millimetres.
  const from = center(bounds).map(value => value / 1000);
  const to = center(target);
  anchors.push({ id, source: from, target: to });
};

for (const side of ['LEFT', 'RIGHT']) {
  const lower = `LOWER_EXTREMITY_${side}`;
  const sideName = side === 'LEFT' ? 'left' : 'right';
  for (const bone of ['FEMUR', 'PATELLA', 'TIBIA', 'FIBULA']) {
    const display = bone.charAt(0) + bone.slice(1).toLowerCase() + ` (${sideName})`;
    addAnchor(`${bone}_${side}`, `${lower}/${bone}_${side}.stl`, display);
  }
  const pelvisParts = hostBones.filter(part =>
    /(ilium|pubis|ischium)/i.test(part.name) && part.name.toLowerCase().includes(`(${sideName})`));
  addAnchor(`HIP_${side}`, `${lower}/HIP_${side}.stl`, `Hip (${sideName})`, pelvisParts);
}

for (const [file, display] of [
  ['VERTEBRA_C1', 'Cervical vertebra 1'],
  ['VERTEBRA_C7', 'Cervical vertebra 7'],
  ['VERTEBRA_T1', 'Thoracic vertebra 1'],
  ['VERTEBRA_T12', 'Thoracic vertebra 12'],
  ['VERTEBRA_L1', 'Lumbar vertebra 1'],
  ['VERTEBRA_L6', 'Lumbar vertebra 6'],
]) addAnchor(file, `SPINAL_COLUMN/${file}.stl`, display);
addAnchor('SACRUM', 'SPINAL_COLUMN/SACRUM.stl', 'Sacrum');

addAnchor('STERNUM', 'THORAX/STERNUM.stl', 'Sternum');

// Extend registration coverage to female-reference upper limbs, hands, feet,
// ribs and cranial/maxillary complex. These remain centre-of-bounds anchors,
// not surface registration or permission to import.
const borrowedParts = atlas.parts.filter(part => part.system === 'borrowed');
const ordinalNames = ["first","second","third","fourth","fifth","sixth","seventh","eighth","ninth","tenth","eleventh","twelfth"];
for (const side of ['LEFT', 'RIGHT']) {
  const sideName = side === 'LEFT' ? 'left' : 'right';
  const title = side === 'LEFT' ? 'Left' : 'Right';
  for (const bone of ['CLAVICLE','HUMERUS','RADIUS','SCAPULA','ULNA']) {
    const display = `${title} ${bone.toLowerCase()}`;
    const matches = borrowedParts.filter(part => part.name.toLowerCase() === display.toLowerCase());
    addAnchor(`${bone}_${side}`, `UPPER_EXTREMITY_${side}/${bone}_${side}.stl`, display, matches);
  }
  for (let n = 1; n <= 12; n++) {
    const display = `${title} ${ordinalNames[n - 1]} rib`;
    const matches = borrowedParts.filter(part => part.name.toLowerCase() === display.toLowerCase());
    addAnchor(`RIB_${n}_${side}`, `THORAX/RIB_${n}_${side}.stl`, display, matches);
  }
  for (let n = 1; n <= 5; n++) {
    const display = `${title} ${ordinalNames[n - 1]} metacarpal bone`;
    const matches = borrowedParts.filter(part => part.name.toLowerCase() === display.toLowerCase());
    addAnchor(`METACARPAL_${n}_${side}`, `HAND_${side}/METACARPAL_${n}_${side}.stl`, display, matches);
  }
  const fingers = ['index finger','middle finger','ring finger','little finger'];
  for (let n = 2; n <= 5; n++) {
    const finger = fingers[n - 2];
    const matches = borrowedParts.filter(part => part.name.toLowerCase().includes(`of ${sideName} ${finger}`));
    addAnchor(`PHALANGE_HAND_${n}_${side}`, `HAND_${side}/PHALANGE_HAND_${n}_${side}.stl`, `${title} ${finger}`, matches);
  }
  const footBones = [
    ['CALCANEUS', `${title} calcaneus`], ['CUBOID', `${title} cuboid bone`],
    ['INTERMEDIATE_CUNEIFORM', `${title} intermediate cuneiform bone`],
    ['LATERAL_CUNEIFORM', `${title} lateral cuneiform bone`],
    ['MEDIAL_CUNEIFORM', `${title} medial cuneiform bone`],
    ['NAVICULAR', `Navicular bone of ${sideName} foot`], ['TALUS', `${title} talus`],
  ];
  for (const [fileStem, display] of footBones) {
    const matches = borrowedParts.filter(part => part.name.toLowerCase() === display.toLowerCase());
    addAnchor(`${fileStem}_${side}`, `FOOT_${side}/${fileStem}_${side}.stl`, display, matches);
  }
  for (let n = 1; n <= 5; n++) {
    const display = `${title} ${ordinalNames[n - 1]} metatarsal bone`;
    const matches = borrowedParts.filter(part => part.name.toLowerCase() === display.toLowerCase());
    addAnchor(`METATARSAL_${n}_${side}`, `FOOT_${side}/METATARSAL_${n}_${side}.stl`, display, matches);
  }
  const toes = ['big toe','second toe','third toe','fourth toe','little toe'];
  for (let n = 1; n <= 5; n++) {
    const toe = toes[n - 1];
    const matches = borrowedParts.filter(part => part.name.toLowerCase().includes(`of ${sideName} ${toe}`));
    addAnchor(`PHALANGE_FOOT_${n}_${side}`, `FOOT_${side}/PHALANGE_FOOT_${n}_${side}.stl`, `${title} ${toe}`, matches);
  }
}
const skullTargets = borrowedParts.filter(part => /maxilla|nasal bone|palatine bone|parietal bone|temporal bone|zygomatic bone|frontal bone|occipital bone|sphenoid bone|vomer|ethmoid/i.test(part.name));
addAnchor('SKULL_CRANIAL_MAXILLA', 'SKULL/SKULL_CRANIAL_MAXILLA.stl', 'Cranium and maxilla', skullTargets);
addAnchor('SKULL_MANDIBLE', 'SKULL/SKULL_MANDIBLE.stl', 'Mandible', borrowedParts.filter(part => part.name.toLowerCase() === 'mandible'));


const permutations = [
  [0, 1, 2], [0, 2, 1], [1, 0, 2],
  [1, 2, 0], [2, 0, 1], [2, 1, 0],
];
const rotations = [];
for (const permutation of permutations) for (const sx of [1, -1]) {
  for (const sy of [1, -1]) for (const sz of [1, -1]) {
    const rows = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    rows[0][permutation[0]] = sx;
    rows[1][permutation[1]] = sy;
    rows[2][permutation[2]] = sz;
    const determinant =
      rows[0][0] * (rows[1][1] * rows[2][2] - rows[1][2] * rows[2][1]) -
      rows[0][1] * (rows[1][0] * rows[2][2] - rows[1][2] * rows[2][0]) +
      rows[0][2] * (rows[1][0] * rows[2][1] - rows[1][1] * rows[2][0]);
    if (determinant > 0) rotations.push(rows);
  }
}
const rotate = (matrix, point) => matrix.map(row =>
  row[0] * point[0] + row[1] * point[1] + row[2] * point[2]);
const mean = points => points.reduce((sum, point) =>
  sum.map((value, axis) => value + point[axis] / points.length), [0, 0, 0]);

function fit(points, matrix) {
  const from = points.map(point => rotate(matrix, point.source));
  const to = points.map(point => point.target);
  const fromMean = mean(from), toMean = mean(to);
  let numerator = 0, denominator = 0;
  for (let i = 0; i < from.length; i++) for (let axis = 0; axis < 3; axis++) {
    const a = from[i][axis] - fromMean[axis], b = to[i][axis] - toMean[axis];
    numerator += a * b;
    denominator += a * a;
  }
  const scale = denominator ? numerator / denominator : 0;
  const offset = toMean.map((value, axis) => value - scale * fromMean[axis]);
  const errors = from.map((point, i) => Math.hypot(
    scale * point[0] + offset[0] - to[i][0],
    scale * point[1] + offset[1] - to[i][1],
    scale * point[2] + offset[2] - to[i][2],
  ));
  return {
    scale,
    offset,
    rmsMillimetres: Math.sqrt(errors.reduce((sum, value) => sum + value * value, 0) / errors.length) * 1000,
    maxMillimetres: Math.max(...errors) * 1000,
    errorsMillimetres: errors.map(value => + (value * 1000).toFixed(2)),
  };
}

const candidates = rotations.map(rotation => ({ rotation, ...fit(anchors, rotation) }))
  .filter(candidate => candidate.scale > 0)
  .sort((a, b) => a.rmsMillimetres - b.rmsMillimetres);
if (!candidates.length) throw new Error('No positive-scale anatomical axis registration was found.');
const best = candidates[0];
const groups = {
  pelvis: ['HIP_LEFT', 'HIP_RIGHT', 'SACRUM'],
  spine: ['VERTEBRA_C1', 'VERTEBRA_C7', 'VERTEBRA_T1', 'VERTEBRA_T12', 'VERTEBRA_L1', 'VERTEBRA_L6', 'SACRUM'],
  thorax: ['VERTEBRA_T1', 'VERTEBRA_T12', 'STERNUM', ...anchors.filter(anchor => anchor.id.startsWith('RIB_')).map(anchor => anchor.id)],
  leftLeg: ['FEMUR_LEFT', 'PATELLA_LEFT', 'TIBIA_LEFT', 'FIBULA_LEFT'],
  rightLeg: ['FEMUR_RIGHT', 'PATELLA_RIGHT', 'TIBIA_RIGHT', 'FIBULA_RIGHT'],
  leftArm: ['CLAVICLE_LEFT','HUMERUS_LEFT','RADIUS_LEFT','SCAPULA_LEFT','ULNA_LEFT'],
  rightArm: ['CLAVICLE_RIGHT','HUMERUS_RIGHT','RADIUS_RIGHT','SCAPULA_RIGHT','ULNA_RIGHT'],
  leftHand: anchors.filter(anchor => anchor.id.endsWith('_LEFT') && (anchor.id.startsWith('METACARPAL_') || anchor.id.startsWith('PHALANGE_HAND_'))).map(anchor => anchor.id),
  rightHand: anchors.filter(anchor => anchor.id.endsWith('_RIGHT') && (anchor.id.startsWith('METACARPAL_') || anchor.id.startsWith('PHALANGE_HAND_'))).map(anchor => anchor.id),
  leftFoot: anchors.filter(anchor => anchor.id.endsWith('_LEFT') && (['CALCANEUS','CUBOID','INTERMEDIATE_CUNEIFORM','LATERAL_CUNEIFORM','MEDIAL_CUNEIFORM','NAVICULAR','TALUS'].some(prefix => anchor.id.startsWith(prefix+'_')) || anchor.id.startsWith('METATARSAL_') || anchor.id.startsWith('PHALANGE_FOOT_'))).map(anchor => anchor.id),
  rightFoot: anchors.filter(anchor => anchor.id.endsWith('_RIGHT') && (['CALCANEUS','CUBOID','INTERMEDIATE_CUNEIFORM','LATERAL_CUNEIFORM','MEDIAL_CUNEIFORM','NAVICULAR','TALUS'].some(prefix => anchor.id.startsWith(prefix+'_')) || anchor.id.startsWith('METATARSAL_') || anchor.id.startsWith('PHALANGE_FOOT_'))).map(anchor => anchor.id),
  skull: ['SKULL_CRANIAL_MAXILLA','SKULL_MANDIBLE'],
};
const span = points => [0, 1, 2].map(axis =>
  Math.max(...points.map(point => point[axis])) - Math.min(...points.map(point => point[axis])));
const regionalFits = Object.fromEntries(Object.entries(groups).map(([name, ids]) => {
  const selected = anchors.filter(anchor => ids.includes(anchor.id));
  const fitted = fit(selected, best.rotation);
  const sourceCentres = selected.map(anchor => rotate(best.rotation, anchor.source));
  const targetCentres = selected.map(anchor => anchor.target);
  const sourceSpanMetres = sourceCentres.length ? span(sourceCentres) : [0, 0, 0];
  const targetSpanMetres = targetCentres.length ? span(targetCentres) : [0, 0, 0];
  const uniqueTargets = new Set(targetCentres.map(point => point.map(value => value.toFixed(6)).join(','))).size;
  const enoughAnchors = selected.length >= 3 && uniqueTargets >= 3;
  return [name, {
    anchorIds: ids,
    anchorCount: selected.length,
    uniqueTargetCentres: uniqueTargets,
    fitEligibility: enoughAnchors ? 'candidate-only-review-required' : 'insufficient-independent-anchors',
    sourceSpanMillimetres: sourceSpanMetres.map(value => +(value * 1000).toFixed(2)),
    targetSpanMillimetres: targetSpanMetres.map(value => +(value * 1000).toFixed(2)),
    ...fitted,
  }];
}));
const bilateralPairs = [
  'HIP','FEMUR','PATELLA','TIBIA','FIBULA','CLAVICLE','HUMERUS','RADIUS','SCAPULA','ULNA',
  'METACARPAL_1','METACARPAL_2','METACARPAL_3','METACARPAL_4','METACARPAL_5',
  'CALCANEUS','TALUS','NAVICULAR','METATARSAL_1','METATARSAL_2','METATARSAL_3','METATARSAL_4','METATARSAL_5',
];
const anchorById = new Map(anchors.map(anchor => [anchor.id, anchor]));
const bilateralComparisons = bilateralPairs.flatMap(stem => {
  const left = anchorById.get(`${stem}_LEFT`), right = anchorById.get(`${stem}_RIGHT`);
  if (!left || !right) return [];
  const sourceLeft = rotate(best.rotation, left.source).map(value => best.scale * value);
  const sourceRight = rotate(best.rotation, right.source).map(value => best.scale * value);
  const targetDistance = Math.hypot(...left.target.map((value, axis) => value - right.target[axis]));
  const sourceDistance = Math.hypot(...sourceLeft.map((value, axis) => value - sourceRight[axis]));
  return [{
    structure: stem,
    sourceLeftRightCentreDistanceMillimetres: +(sourceDistance * 1000).toFixed(2),
    atlasLeftRightCentreDistanceMillimetres: +(targetDistance * 1000).toFixed(2),
    absoluteDifferenceMillimetres: +(Math.abs(sourceDistance - targetDistance) * 1000).toFixed(2),
  }];
});
const globalResiduals = anchors.map((anchor, index) => ({
  id: anchor.id,
  errorMillimetres: best.errorsMillimetres[index],
}));

const report = {
  source: 'Azevedo79z/visible-human-3d-models-bucket — BoneHub Visible Human Female CT Mesh',
  expectedAnchors: anchors.length,
  axisRotation: best.rotation,
  globalFit: {
    scale: best.scale,
    offsetMetres: best.offset,
    rmsMillimetres: best.rmsMillimetres,
    maxMillimetres: best.maxMillimetres,
  },
  regionalFits,
  globalAnchorResiduals: globalResiduals,
  unitAssessment: {
    assumption: 'STL coordinates provisionally treated as millimetres',
    evidence: 'Raw model height and dimensions are consistent with an adult human body; global scale is reported for review.',
    confirmed: false,
    warning: 'STL has no embedded unit metadata. Do not apply geometry until source units and anatomical alignment are independently reviewed.',
  },
  method: '24 proper axis permutations tested; positive uniform scale and translation fitted to anatomical landmark centres. Regional fits reuse the selected axis rotation. Region eligibility is a coarse anchor-count diagnostic, not a registration pass. Bilateral comparisons measure centre-to-centre distances only.',
  limitations: [
    'This is a centre-landmark registration preflight, not a surface-to-surface or joint-articulation validation.',
    'Skull, ribs, upper limbs, hands and feet do not all have one-to-one host bone anchors in the current female atlas.',
    'The current atlas has partial native female skeleton coverage and 180 male-derived placeholder meshes; those are reported by the separate inventory audit.',
  ],
  safety: 'READ ONLY — no Atlas manifest, chunk, or source STL was modified.',
};
console.log(JSON.stringify(report, null, 2));
