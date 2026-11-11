/**
 * Read-only regional muscle-to-bone point-cloud screening.
 *
 * Expands the comparison set beyond the sparse regional anchor bones and
 * reports nearest sampled host bone vertices for representative donor muscles.
 * It is not exact triangle-surface distance, collision detection, or proof of
 * anatomical origin/insertion. No model assets or production code are changed.
 *
 * Run:
 *   deno run --allow-net=raw.githubusercontent.com scripts/screen-female-muscle-full-bone-surface.mjs
 */
const REVISION = "b0a20fa3a009ca5f6bfa07b7479312e04c862af2";
const DONOR_BASE = `https://raw.githubusercontent.com/HiMahendraBeniwal/female-atlas/${REVISION}/public/`;
const HOST_BASE = "https://raw.githubusercontent.com/Azevedo79z/Human-Atlas/main/public/";
const DONOR_MANIFEST = DONOR_BASE + "models/atlas.json";
const HOST_MANIFEST = HOST_BASE + "models/atlas-female.json";

const ANCHORS = [
  "Left clavicle", "Right clavicle", "Left scapula", "Right scapula",
  "Left humerus", "Right humerus", "Left radius", "Right radius",
  "Left ulna", "Right ulna", "Manubrium",
];
const REGIONS = {
  shoulder: {
    anchors: ["Left clavicle", "Right clavicle", "Left scapula", "Right scapula", "Manubrium"],
  },
  upperArm: { anchors: ["Left humerus", "Right humerus"] },
  forearm: { anchors: ["Left radius", "Right radius", "Left ulna", "Right ulna"] },
};
const TARGETS = [
  { label: "Pectoralis major", match: /pectoralis major/i, region: "shoulder", bones: /clavicle|sternum|manubrium|rib|costal cartilage/i },
  { label: "Pectoralis minor", match: /pectoralis minor/i, region: "shoulder", bones: /rib|costal cartilage|scapula/i },
  { label: "Subclavius", match: /subclavius/i, region: "shoulder", bones: /clavicle|first rib|costal cartilage/i },
  { label: "Serratus anterior", match: /serratus anterior/i, region: "shoulder", bones: /rib|costal cartilage|scapula/i },
  { label: "Deltoid", match: /deltoid/i, region: "shoulder", bones: /clavicle|scapula|humerus/i },
  { label: "Trapezius", match: /trapezius/i, region: "shoulder", bones: /clavicle|scapula|cervical vertebra|thoracic vertebra/i },
  { label: "Biceps brachii", match: /biceps brachii/i, region: "upperArm", bones: /scapula|humerus|radius/i },
  { label: "Triceps brachii", match: /triceps brachii/i, region: "upperArm", bones: /scapula|humerus|ulna/i },
  { label: "Brachialis", match: /brachialis/i, region: "upperArm", bones: /humerus|ulna/i },
  { label: "Pronator teres", match: /pronator teres/i, region: "forearm", bones: /humerus|ulna|radius/i },
  { label: "Flexor carpi ulnaris", match: /flexor carpi ulnaris/i, region: "forearm", bones: /ulna|pisiform|metacarpal/i },
  { label: "Extensor carpi ulnaris", match: /extensor carpi ulnaris/i, region: "forearm", bones: /ulna|metacarpal/i },
];
const BONE_SYSTEMS = new Set(["skeletal", "borrowed"]);

async function readManifest(url, label) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${label} manifest HTTP ${response.status}`);
  const value = await response.json();
  if (!Array.isArray(value.parts) || !Array.isArray(value.chunks)) {
    throw new Error(`${label} manifest schema invalid`);
  }
  return value;
}
function center(bounds) {
  return bounds[0].map((value, axis) => (value + bounds[1][axis]) / 2);
}
function parity(permutation) {
  let inversions = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) if (permutation[i] > permutation[j]) inversions++;
  }
  return inversions % 2 ? -1 : 1;
}
function fitTransform(rows) {
  if (rows.length < 2) return null;
  const permutations = [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
  const source = rows.map(row => center(row.donor.bounds));
  const target = rows.map(row => center(row.host.bounds));
  let best = null;
  for (const permutation of permutations) {
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const signs = [sx, sy, sz];
      if (parity(permutation) * sx * sy * sz !== 1) continue;
      const rotated = source.map(point => signs.map((sign, axis) => sign * point[permutation[axis]]));
      const meanSource = [0,1,2].map(axis => rotated.reduce((sum, point) => sum + point[axis], 0) / rotated.length);
      const meanTarget = [0,1,2].map(axis => target.reduce((sum, point) => sum + point[axis], 0) / target.length);
      let numerator = 0;
      let denominator = 0;
      for (let i = 0; i < rotated.length; i++) {
        for (let axis = 0; axis < 3; axis++) {
          numerator += (rotated[i][axis] - meanSource[axis]) * (target[i][axis] - meanTarget[axis]);
          denominator += (rotated[i][axis] - meanSource[axis]) ** 2;
        }
      }
      const scale = numerator / denominator;
      if (!Number.isFinite(scale) || scale <= 0) continue;
      const translation = meanTarget.map((value, axis) => value - scale * meanSource[axis]);
      const errors = rotated.map((point, index) =>
        Math.hypot(...point.map((value, axis) => scale * value + translation[axis] - target[index][axis]))
      );
      const rms = Math.sqrt(errors.reduce((sum, value) => sum + value * value, 0) / errors.length);
      if (!best || rms < best.rms) {
        best = { scale, translation, permutation, signs, rms, max: Math.max(...errors) };
      }
    }
  }
  return best;
}
function transformPoint(point, transform) {
  return transform.signs.map((sign, axis) =>
    transform.scale * sign * point[transform.permutation[axis]] + transform.translation[axis]
  );
}
const [donor, host] = await Promise.all([
  readManifest(DONOR_MANIFEST, "Donor"),
  readManifest(HOST_MANIFEST, "Host"),
]);
const anchorRows = ANCHORS.map(name => ({
  name,
  donor: donor.parts.find(part => part.name.toLowerCase() === name.toLowerCase() && part.system === "skeletal"),
  host: host.parts.find(part => part.name.toLowerCase() === name.toLowerCase() && BONE_SYSTEMS.has(part.system)),
}));
if (anchorRows.some(row => !row.donor || !row.host)) throw new Error("Required regional bone anchor missing.");
const transforms = {};
for (const [regionName, region] of Object.entries(REGIONS)) {
  const rows = region.anchors.map(name => anchorRows.find(row => row.name === name));
  transforms[regionName] = fitTransform(rows);
  if (!transforms[regionName]) throw new Error(`Unable to fit ${regionName} transform.`);
}

const chunkCache = new Map();
async function readChunk(atlas, base, index, label) {
  const key = `${label}:${index}`;
  if (chunkCache.has(key)) return chunkCache.get(key);
  const metadata = atlas.chunks[index];
  if (!metadata) throw new Error(`${label}: missing chunk ${index}`);
  const path = metadata.url.startsWith("/") ? metadata.url.slice(1) : metadata.url;
  const response = await fetch(new URL(path, base));
  if (!response.ok) throw new Error(`${label}: chunk HTTP ${response.status}`);
  const buffer = await response.arrayBuffer();
  if (metadata.bytes !== undefined && buffer.byteLength !== metadata.bytes) {
    throw new Error(`${label}: chunk byte length mismatch at ${index}`);
  }
  chunkCache.set(key, buffer);
  return buffer;
}
async function sampleVertices(atlas, base, part, label, maximum) {
  const buffer = await readChunk(atlas, base, part.chunk, label);
  const view = new DataView(buffer);
  const count = Math.min(part.vertexCount, maximum);
  const points = [];
  for (let index = 0; index < count; index++) {
    const sourceIndex = count === 1 ? 0 : Math.floor(index * (part.vertexCount - 1) / (count - 1));
    const offset = part.positions + sourceIndex * 12;
    const point = [0,1,2].map(axis => view.getFloat32(offset + axis * 4, true));
    if (!point.every(Number.isFinite)) throw new Error(`${label}: invalid vertex in ${part.name}`);
    points.push(point);
  }
  return points;
}
function quantile(sorted, fraction) {
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))];
}
function summarizeDistances(musclePoints, boneSets, transform) {
  const distances = [];
  const byBone = [];
  for (const entry of boneSets) {
    const localDistances = [];
    for (const point of musclePoints) {
      const transformed = transformPoint(point, transform);
      let nearest = Infinity;
      for (const bonePoint of entry.points) {
        nearest = Math.min(nearest, Math.hypot(
          transformed[0] - bonePoint[0],
          transformed[1] - bonePoint[1],
          transformed[2] - bonePoint[2],
        ));
      }
      localDistances.push(nearest);
      distances.push(nearest);
    }
    localDistances.sort((a, b) => a - b);
    byBone.push({
      bone: entry.part.name,
      system: entry.part.system,
      sampledVertices: entry.points.length,
      medianNearestVertexMm: +(quantile(localDistances, 0.5) * 1000).toFixed(1),
    });
  }
  distances.sort((a, b) => a - b);
  byBone.sort((a, b) => a.medianNearestVertexMm - b.medianNearestVertexMm);
  return {
    comparedBoneParts: boneSets.length,
    sampledMuscleVertices: musclePoints.length,
    pooledNearestVertexDistanceMm: {
      p10: +(quantile(distances, 0.1) * 1000).toFixed(1),
      median: +(quantile(distances, 0.5) * 1000).toFixed(1),
      p90: +(quantile(distances, 0.9) * 1000).toFixed(1),
    },
    closestBonePartsByMedian: byBone.slice(0, 8),
  };
}

const hostBones = host.parts.filter(part => BONE_SYSTEMS.has(part.system));
const results = [];
for (const target of TARGETS) {
  const muscle = donor.parts.find(part => part.system === "muscular" && target.match.test(part.name));
  if (!muscle) {
    results.push({ muscle: target.label, found: false });
    continue;
  }
  const matchingBones = hostBones.filter(part => target.bones.test(part.name));
  if (!matchingBones.length) {
    results.push({ muscle: target.label, found: true, error: "No host bone labels matched the screening region." });
    continue;
  }
  const musclePoints = await sampleVertices(donor, DONOR_BASE, muscle, "donor", 180);
  const boneSets = [];
  for (const part of matchingBones) {
    boneSets.push({
      part,
      points: await sampleVertices(host, HOST_BASE, part, "host", 120),
    });
  }
  const transform = transforms[target.region];
  results.push({
    muscle: target.label,
    found: true,
    donorPart: { id: muscle.id, name: muscle.name, system: muscle.system },
    region: target.region,
    transform: {
      anchorCount: REGIONS[target.region].anchors.length,
      scale: +transform.scale.toFixed(5),
      rmsMm: +(transform.rms * 1000).toFixed(1),
      maxMm: +(transform.max * 1000).toFixed(1),
      weakFit: target.region === "upperArm",
    },
    comparison: summarizeDistances(musclePoints, boneSets, transform),
  });
}
const found = results.filter(result => result.found);
const report = {
  candidateRevision: REVISION,
  hostBonePartsConsidered: hostBones.length,
  targetMuscles: TARGETS.length,
  foundMuscles: found.length,
  results,
  interpretation: [
    "The expanded bone set improves screening coverage but does not establish a true anatomical attachment.",
    "Distances are sparse nearest sampled vertex-to-vertex measurements, not exact triangle-surface distances.",
    "Regional transforms are fitted from bounding-box centers; the upper-arm fit uses only two anchors and is weak.",
    "A nearby bone may not be the correct origin or insertion; muscle side, fiber direction, footprint, and subject compatibility are not validated.",
    "Borrowed host bone geometry retains its source-system label and must not be represented as native female-specific anatomy.",
    "No geometry, manifest, viewer code, or deployed asset is changed."
  ],
  productionChanged: false,
};
console.log(JSON.stringify(report, null, 2));
