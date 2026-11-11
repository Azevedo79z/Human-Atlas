/**
 * Focused audit of repeated extensor carpi ulnaris donor mesh names.
 * Reports metadata and geometry fingerprints only; it does not decide anatomy.
 */
const REVISION = "b0a20fa3a009ca5f6bfa07b7479312e04c862af2";
const RAW_BASE = `https://raw.githubusercontent.com/HiMahendraBeniwal/female-atlas/${REVISION}/public/`;
const response = await fetch(RAW_BASE + "models/atlas.json");
if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
const atlas = await response.json();
const parts = atlas.parts.filter(part =>
  part.system === "muscular" && /extensor carpi ulnaris/i.test(part.name)
);
if (parts.length !== 4) {
  throw new Error(`Expected four ECU parts from prior inventory; found ${parts.length}`);
}
const chunkIds = [...new Set(parts.map(part => part.chunk))].sort((a, b) => a - b);
const buffers = new Map();
for (const chunkId of chunkIds) {
  const chunk = atlas.chunks[chunkId];
  if (!chunk) throw new Error(`Missing chunk metadata: ${chunkId}`);
  const chunkUrl = new URL(chunk.url.replace(/^\/+/, ""), RAW_BASE);
  const chunkResponse = await fetch(chunkUrl);
  if (!chunkResponse.ok) throw new Error(`Chunk ${chunkId} HTTP ${chunkResponse.status}`);
  const buffer = await chunkResponse.arrayBuffer();
  if (buffer.byteLength !== chunk.bytes) {
    throw new Error(`Chunk ${chunkId} size mismatch: ${buffer.byteLength} != ${chunk.bytes}`);
  }
  buffers.set(chunkId, buffer);
}
async function hashGeometry(buffer, part) {
  const bytes = new Uint8Array(part.vertexCount * 12 + part.indexCount * 4);
  bytes.set(new Uint8Array(buffer, part.positions, part.vertexCount * 12));
  bytes.set(new Uint8Array(buffer, part.indices, part.indexCount * 4), part.vertexCount * 12);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, "0")).join("");
}
const rows = [];
for (const part of parts) {
  const buffer = buffers.get(part.chunk);
  const positions = new Float32Array(buffer, part.positions, part.vertexCount * 3);
  const indices = new Uint32Array(buffer, part.indices, part.indexCount);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const sum = [0, 0, 0];
  let invalidIndices = 0;
  for (let i = 0; i < positions.length; i += 3) {
    for (let axis = 0; axis < 3; axis++) {
      const value = positions[i + axis];
      if (!Number.isFinite(value)) throw new Error(`Non-finite vertex in ${part.id}`);
      min[axis] = Math.min(min[axis], value);
      max[axis] = Math.max(max[axis], value);
      sum[axis] += value;
    }
  }
  for (const index of indices) if (index >= part.vertexCount) invalidIndices++;
  rows.push({
    id: part.id,
    name: part.name,
    conceptId: part.conceptId,
    chunk: part.chunk,
    vertexCount: part.vertexCount,
    indexCount: part.indexCount,
    triangleCount: part.indexCount / 3,
    min,
    max,
    extents: min.map((value, axis) => max[axis] - value),
    centroid: sum.map(value => value / part.vertexCount),
    manifestBounds: part.bounds,
    geometrySha256: await hashGeometry(buffer, part),
    invalidIndices
  });
}
const pairs = [];
for (let i = 0; i < rows.length; i++) {
  for (let j = i + 1; j < rows.length; j++) {
    const a = rows[i];
    const b = rows[j];
    const centroidDistance = Math.hypot(...a.centroid.map((value, axis) => value - b.centroid[axis]));
    const overlap = a.min.every((value, axis) =>
      Math.max(0, Math.min(a.max[axis], b.max[axis]) - Math.max(value, b.min[axis])) > 0
    );
    pairs.push({
      ids: [a.id, b.id],
      sameGeometryHash: a.geometrySha256 === b.geometrySha256,
      centroidDistance,
      boundingBoxesOverlapOnAllAxes: overlap
    });
  }
}
const report = {
  donorRevision: REVISION,
  target: "Extensor carpi ulnaris",
  repeatedNamePartCount: rows.length,
  expectedPreviouslyObservedIds: ["BP3D_FJ1472", "BP3D_FJ1472M", "BP3D_FJ1517", "BP3D_FJ1517M"],
  chunksDownloaded: chunkIds,
  parts: rows,
  pairwiseComparisons: pairs,
  interpretation: [
    "The audit compares raw donor coordinates and packed mesh buffers only.",
    "Different hashes and separated bounds show distinct mesh data, not proof of four separate anatomical muscles.",
    "Centroid separation and bounding-box overlap are descriptive geometry checks, not left/right classification.",
    "No laterality, origin/insertion, anatomical identity, host registration, import, viewer, Wix, or production change is validated or performed."
  ],
  productionChanged: false
};
console.log(JSON.stringify(report, null, 2));
