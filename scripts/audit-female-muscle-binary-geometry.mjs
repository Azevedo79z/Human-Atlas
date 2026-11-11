/**
 * Read-only geometry audit for the 12 donor female muscle targets.
 * Reads packed position/index buffers and reports per-part geometry facts.
 * Does not transform, combine, register, import, or publish any mesh.
 */
const REVISION = "b0a20fa3a009ca5f6bfa07b7479312e04c862af2";
const RAW_BASE = `https://raw.githubusercontent.com/HiMahendraBeniwal/female-atlas/${REVISION}/public/`;
const MANIFEST_URL = RAW_BASE + "models/atlas.json";
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

const manifestResponse = await fetch(MANIFEST_URL);
if (!manifestResponse.ok) throw new Error(`Manifest HTTP ${manifestResponse.status}`);
const atlas = await manifestResponse.json();
const targets = TARGETS.flatMap(([label, pattern]) =>
  atlas.parts.filter(part => part.system === "muscular" && pattern.test(part.name))
    .map(part => ({ target: label, part }))
);
const chunkIds = [...new Set(targets.map(item => item.part.chunk))].sort((a, b) => a - b);
const chunkBuffers = new Map();
for (const chunkId of chunkIds) {
  const chunk = atlas.chunks[chunkId];
  if (!chunk) throw new Error(`Missing chunk metadata: ${chunkId}`);
  const url = new URL(chunk.url.replace(/^\\/+/, ""), RAW_BASE);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Chunk ${chunkId} HTTP ${response.status}`);
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength !== chunk.bytes) {
    throw new Error(`Chunk ${chunkId} size mismatch: ${buffer.byteLength} != ${chunk.bytes}`);
  }
  chunkBuffers.set(chunkId, buffer);
}

async function digest(buffer, part) {
  const bytes = new Uint8Array(part.vertexCount * 12 + part.indexCount * 4);
  bytes.set(new Uint8Array(buffer, part.positions, part.vertexCount * 12), 0);
  bytes.set(new Uint8Array(buffer, part.indices, part.indexCount * 4), part.vertexCount * 12);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map(value => value.toString(16).padStart(2, "0")).join("");
}

const rows = [];
for (const { target, part } of targets) {
  const buffer = chunkBuffers.get(part.chunk);
  const positions = new Float32Array(buffer, part.positions, part.vertexCount * 3);
  const indices = new Uint32Array(buffer, part.indices, part.indexCount);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const sum = [0, 0, 0];
  for (let i = 0; i < positions.length; i += 3) {
    for (let axis = 0; axis < 3; axis++) {
      const value = positions[i + axis];
      if (!Number.isFinite(value)) throw new Error(`Non-finite vertex in ${part.id}`);
      min[axis] = Math.min(min[axis], value);
      max[axis] = Math.max(max[axis], value);
      sum[axis] += value;
    }
  }
  let invalidIndices = 0;
  for (const index of indices) if (index >= part.vertexCount) invalidIndices++;
  const centroid = sum.map(value => value / part.vertexCount);
  const extents = min.map((value, axis) => max[axis] - value);
  rows.push({
    target, id: part.id, name: part.name, chunk: part.chunk,
    vertexCount: part.vertexCount, indexCount: part.indexCount,
    triangleCount: part.indexCount / 3, min, max, extents, centroid,
    geometrySha256: await digest(buffer, part),
    invalidIndices,
    manifestBounds: part.bounds,
  });
}
const duplicateGroups = [];
const byName = new Map();
for (const row of rows) {
  const key = row.name.toLowerCase();
  byName.set(key, [...(byName.get(key) ?? []), row]);
}
for (const [name, group] of byName) {
  if (group.length > 1) duplicateGroups.push({
    repeatedName: name,
    ids: group.map(row => row.id),
    chunks: group.map(row => row.chunk),
    sameGeometryHash: new Set(group.map(row => row.geometrySha256)).size === 1,
    hashes: group.map(row => row.geometrySha256),
  });
}
const report = {
  donorRevision: REVISION,
  targetPartsAudited: rows.length,
  chunksDownloaded: chunkIds,
  chunkCount: chunkIds.length,
  invalidIndexParts: rows.filter(row => row.invalidIndices > 0).map(row => row.id),
  duplicateNameGroups: duplicateGroups,
  parts: rows,
  interpretation: [
    "Bounds and centroids are raw donor coordinates; they are not aligned to the host atlas.",
    "Identical hashes indicate byte-identical position/index buffers, not necessarily duplicate anatomy if metadata differs.",
    "Different hashes for repeated names do not establish distinct anatomical structures.",
    "No anatomical registration, laterality approval, import, viewer change, Wix change, or production deployment is performed."
  ],
  productionChanged: false
};
console.log(JSON.stringify(report, null, 2));
