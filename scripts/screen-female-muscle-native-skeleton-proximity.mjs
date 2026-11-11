/**
 * Same-donor muscle-to-skeleton proximity screen.
 * Uses female donor muscle and skeletal meshes in their original shared coordinates.
 * This is a vertex-sampling screen, not anatomical registration or attachment validation.
 */
const REVISION = "b0a20fa3a009ca5f6bfa07b7479312e04c862af2";
const RAW_BASE = `https://raw.githubusercontent.com/HiMahendraBeniwal/female-atlas/${REVISION}/public/`;
const TARGETS = [
  ["Pectoralis major", /pectoralis major/i],
  ["Pectoralis minor", /pectoralis minor/i],
  ["Subclavius", /subclavius/i],
  ["Serratus anterior", /serratus anterior/i],
  ["Deltoid", /deltoid/i],
  ["Trapezius", /trapezius/i],
  ["Biceps brachii", /biceps brachii/i],
  ["Triceps brachii", /triceps brachii/i],
  ["Brachialis", / brachialis$/i],
  ["Pronator teres", /pronator teres/i],
  ["Flexor carpi ulnaris", /flexor carpi ulnaris/i],
  ["Extensor carpi ulnaris", /extensor carpi ulnaris/i],
];
const BONE_NAME = /\\b(bone|cartilage|rib|costal|clavicle|sternum|scapula|humerus|radius|ulna|carpal|metacarpal|phalanx|phalanges|vertebr|sacrum|coccyx|ilium|ischium|pubis|femur|patella|tibia|fibula|talus|calcaneus|tarsal|metatarsal|mandible|maxilla|zygomatic|frontal|parietal|temporal|occipital|sphenoid|ethmoid|nasal|lacrimal|palatine|vomer|hyoid|mastoid|condyle|trochanter|epicondyle|olecranon|acromion|coracoid|glenoid|tubercle|process)\\b/i;\nconst NON_SURFACE_TISSUE = /\\b(compact|spongy|cancellous) bone tissue\\b/i;\nconst SAMPLE_LIMIT = 300;
const NEAREST_BONE_LIMIT = 8;

const manifestResponse = await fetch(RAW_BASE + "models/atlas.json");
if (!manifestResponse.ok) throw new Error(`Manifest HTTP ${manifestResponse.status}`);
const atlas = await manifestResponse.json();
const muscles = TARGETS.flatMap(([target, pattern]) =>
  atlas.parts.filter(part => part.system === "muscular" && pattern.test(part.name))
    .map(part => ({ target, part }))
);
const skeletalParts = atlas.parts.filter(part => part.system === "skeletal");\nconst bones = skeletalParts.filter(part => BONE_NAME.test(part.name) && !NON_SURFACE_TISSUE.test(part.name));
if (muscles.length === 0 || bones.length === 0) {
  throw new Error("Expected donor muscular and skeletal parts were not found.");
}

function boxGap(a, b) {
  let squared = 0;
  for (let axis = 0; axis < 3; axis++) {
    const gap = Math.max(0, a.bounds[0][axis] - b.bounds[1][axis], b.bounds[0][axis] - a.bounds[1][axis]);
    squared += gap * gap;
  }
  return Math.sqrt(squared);
}
function samplePositions(buffer, part) {
  const values = new Float32Array(buffer, part.positions, part.vertexCount * 3);
  const count = Math.min(SAMPLE_LIMIT, part.vertexCount);
  const samples = new Array(count);
  for (let i = 0; i < count; i++) {
    const vertex = Math.floor(i * part.vertexCount / count);
    const offset = vertex * 3;
    samples[i] = [values[offset], values[offset + 1], values[offset + 2]];
  }
  return samples;
}
function percentile(sorted, fraction) {
  const index = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction));
  return sorted[index];
}
function proximity(muscleSamples, boneSamples) {
  const nearest = muscleSamples.map(point => {
    let best = Infinity;
    for (const candidate of boneSamples) {
      const dx = point[0] - candidate[0];
      const dy = point[1] - candidate[1];
      const dz = point[2] - candidate[2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (distance < best) best = distance;
    }
    return best;
  }).sort((a, b) => a - b);
  return {
    min: nearest[0],
    p10: percentile(nearest, 0.10),
    median: percentile(nearest, 0.50),
    p90: percentile(nearest, 0.90),
    sampledMuscleVertices: muscleSamples.length,
    sampledBoneVertices: boneSamples.length,
  };
}

const candidates = new Map();
for (const item of muscles) {
  const ranked = bones.map(bone => ({ bone, gap: boxGap(item.part, bone) }))
    .sort((a, b) => a.gap - b.gap)
    .slice(0, NEAREST_BONE_LIMIT);
  candidates.set(item.part.id, ranked);
}
const neededParts = new Map();
for (const item of muscles) {
  neededParts.set(item.part.id, item.part);
  for (const candidate of candidates.get(item.part.id)) {
    neededParts.set(candidate.bone.id, candidate.bone);
  }
}
const chunkIds = [...new Set([...neededParts.values()].map(part => part.chunk))].sort((a, b) => a - b);
const chunkBuffers = new Map();
for (const chunkId of chunkIds) {
  const chunk = atlas.chunks[chunkId];
  if (!chunk) throw new Error(`Missing chunk metadata: ${chunkId}`);
  const url = new URL(chunk.url.replace(/^\/+/, ""), RAW_BASE);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Chunk ${chunkId} HTTP ${response.status}`);
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength !== chunk.bytes) {
    throw new Error(`Chunk ${chunkId} size mismatch: ${buffer.byteLength} != ${chunk.bytes}`);
  }
  chunkBuffers.set(chunkId, buffer);
}
const samples = new Map();
for (const part of neededParts.values()) {
  samples.set(part.id, samplePositions(chunkBuffers.get(part.chunk), part));
}

const rows = muscles.map(({ target, part }) => {
  const muscleSamples = samples.get(part.id);
  const nearestBones = candidates.get(part.id).map(({ bone, gap }) => ({
    boneId: bone.id,
    boneName: bone.name,
    boneConceptId: bone.conceptId,
    boundingBoxGap: gap,
    ...proximity(muscleSamples, samples.get(bone.id)),
  })).sort((a, b) => a.median - b.median);
  return {
    target,
    muscleId: part.id,
    muscleName: part.name,
    muscleConceptId: part.conceptId,
    muscleVertexCount: part.vertexCount,
    candidateBones: nearestBones,
  };
});
const report = {
  donorRevision: REVISION,
  coordinateSpace: "Original female donor atlas coordinates; no transforms applied",
  targetMuscleParts: muscles.length,
  skeletalPartsAvailable: skeletalParts.length,\n  boneSurfaceCandidatesAvailable: bones.length,
  chunksDownloaded: chunkIds,
  chunksDownloadedCount: chunkIds.length,
  sampleLimitPerMesh: SAMPLE_LIMIT,
  nearestBoneCandidatesPerMuscle: NEAREST_BONE_LIMIT,
  method: "For each muscle part, rank skeletal parts by axis-aligned bounding-box gap; sample up to 300 vertices per mesh; calculate one-sided nearest sampled bone-vertex distances for the eight nearest bounding boxes.",
  limitations: [
    "Vertex-to-vertex distances are approximate and are not exact triangle-surface distances.",
    "Candidate ranking is geometric only; it does not identify anatomical origin or insertion.",
    "A small distance does not prove an attachment, and a larger distance does not disprove one.",
    "No coordinate registration to the host atlas, laterality approval, mesh modification, import, viewer change, Wix change, or production deployment is performed."
  ],
  productionChanged: false,
  parts: rows,
};
console.log(JSON.stringify(report, null, 2));
