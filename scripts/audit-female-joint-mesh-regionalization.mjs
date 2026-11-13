/**
 * Read-only geometric regionalization inventory for female joint-adjacent bones.
 *
 * Each mesh is divided into five normalized bins along its longest AABB axis.
 * Bins are named end-A / mid / end-B only: they are NOT anatomical proximal,
 * distal, articular, or attachment regions. The axis is chosen independently
 * for each mesh and model; no cross-model registration is performed.
 */
const HOST_REVISION = "c67dabc7189f90a17b7d3fe997d517913eb3474c";
const DONOR_REVISION = "b0a20fa3a009ca5f6bfa07b7479312e04c862af2";
const HOST_BASE = `https://raw.githubusercontent.com/Azevedo79z/Human-Atlas/${HOST_REVISION}/public/`;
const DONOR_BASE = `https://raw.githubusercontent.com/HiMahendraBeniwal/female-atlas/${DONOR_REVISION}/public/`;
const BIN_COUNT = 5;
const SIDES = ["Left", "Right"];
const PAIRS = [
  ["shoulder-clavicle-scapula", "clavicle", "scapula"],
  ["shoulder-scapula-humerus", "scapula", "humerus"],
  ["elbow-humerus-radius", "humerus", "radius"],
  ["elbow-humerus-ulna", "humerus", "ulna"],
  ["wrist-radius-scaphoid", "radius", "scaphoid"],
  ["wrist-radius-lunate", "radius", "lunate"],
  ["knee-femur-patella", "femur", "patella"],
  ["knee-femur-tibia", "femur", "tibia"],
  ["ankle-tibia-talus", "tibia", "talus"],
  ["ankle-talus-calcaneus", "talus", "calcaneus"],
];

async function manifest(url, label) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(label + " manifest HTTP " + response.status);
  const value = await response.json();
  if (!Array.isArray(value.parts) || !Array.isArray(value.chunks)) {
    throw new Error(label + " manifest schema invalid");
  }
  return value;
}
const chunkCache = new Map();
async function chunk(atlas, base, index, label) {
  const key = label + ":" + index;
  if (!chunkCache.has(key)) {
    const meta = atlas.chunks[index];
    if (!meta) throw new Error(label + " missing chunk " + index);
    const response = await fetch(new URL(meta.url.replace(/^\/+/, ""), base));
    if (!response.ok) throw new Error(label + " chunk HTTP " + response.status);
    const bytes = await response.arrayBuffer();
    if (meta.bytes !== undefined && bytes.byteLength !== meta.bytes) {
      throw new Error(label + " chunk byte length mismatch");
    }
    chunkCache.set(key, bytes);
  }
  return chunkCache.get(key);
}
function normalized(value) { return value.trim().toLowerCase().replace(/\s+/g, " "); }

async function regionalize(atlas, base, part, label) {
  const bytes = await chunk(atlas, base, part.chunk, label);
  if (!Number.isInteger(part.vertexCount) || part.vertexCount < 2) {
    throw new Error(label + " invalid vertex count for " + part.name);
  }
  const view = new DataView(bytes);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const sums = [0, 0, 0];
  const vertices = [];
  for (let i = 0; i < part.vertexCount; i++) {
    const offset = part.positions + i * 12;
    const p = [0, 1, 2].map(axis => view.getFloat32(offset + axis * 4, true));
    if (!p.every(Number.isFinite)) throw new Error(label + " non-finite vertex in " + part.name);
    vertices.push(p);
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], p[axis]);
      max[axis] = Math.max(max[axis], p[axis]);
      sums[axis] += p[axis];
    }
  }
  const spans = max.map((value, axis) => value - min[axis]);
  const axis = spans.indexOf(Math.max(...spans));
  if (!(spans[axis] > 0)) throw new Error(label + " degenerate mesh extent for " + part.name);
  const bins = Array.from({ length: BIN_COUNT }, (_, index) => ({
    index, vertices: 0, sum: [0, 0, 0],
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  }));
  for (const p of vertices) {
    const normalizedPosition = (p[axis] - min[axis]) / spans[axis];
    const index = Math.min(BIN_COUNT - 1, Math.floor(normalizedPosition * BIN_COUNT));
    const bin = bins[index];
    bin.vertices++;
    for (let component = 0; component < 3; component++) {
      bin.sum[component] += p[component];
      bin.min[component] = Math.min(bin.min[component], p[component]);
      bin.max[component] = Math.max(bin.max[component], p[component]);
    }
  }
  const centroid = sums.map(value => value / vertices.length);
  return {
    partId: part.id,
    partName: part.name,
    vertexCount: vertices.length,
    boundsMm: {
      min: min.map(value => value * 1000),
      max: max.map(value => value * 1000),
      span: spans.map(value => value * 1000),
    },
    geometricPartition: {
      axis: ["x", "y", "z"][axis],
      axisSpanMm: spans[axis] * 1000,
      axisChoice: "longest axis-aligned bounding-box extent",
      bins: bins.map(bin => ({
        index: bin.index,
        label: bin.index === 0 ? "end-A" : bin.index === BIN_COUNT - 1 ? "end-B" : "intermediate-" + bin.index,
        normalizedRange: [bin.index / BIN_COUNT, (bin.index + 1) / BIN_COUNT],
        vertexCount: bin.vertices,
        centroidMm: bin.vertices ? bin.sum.map(value => value / bin.vertices * 1000) : null,
        boundsMm: bin.vertices ? {
          min: bin.min.map(value => value * 1000),
          max: bin.max.map(value => value * 1000),
        } : null,
      })),
    },
    centroidMm: centroid.map(value => value * 1000),
  };
}

const [host, donor] = await Promise.all([
  manifest(new URL("models/atlas-female.json", HOST_BASE), "host"),
  manifest(new URL("models/atlas.json", DONOR_BASE), "donor"),
]);
const hostBySource = new Map(host.parts
  .filter(part => part.system === "borrowed" && part.conceptId?.startsWith("BORROWED:FJ"))
  .map(part => [part.conceptId.slice("BORROWED:".length), part]));
const donorByName = new Map(donor.parts
  .filter(part => part.system === "skeletal")
  .map(part => [normalized(part.name), part]));
const pairs = [];
const skipped = [];
for (const side of SIDES) {
  for (const [group, a, b] of PAIRS) {
    const names = [side + " " + a, side + " " + b];
    const donorParts = names.map(name => donorByName.get(normalized(name)));
    if (donorParts.some(part => !part)) {
      skipped.push({ side, group, reason: "donor named part missing" });
      continue;
    }
    const hostParts = donorParts.map(part => hostBySource.get(part.id.replace(/^BP3D_/, "")));
    if (hostParts.some(part => !part)) {
      skipped.push({ side, group, reason: "host source-ID match missing" });
      continue;
    }
    pairs.push({ side, group, donorParts, hostParts });
  }
}
const results = [];
for (const pair of pairs) {
  const [donorA, donorB, hostA, hostB] = await Promise.all([
    regionalize(donor, DONOR_BASE, pair.donorParts[0], "donor"),
    regionalize(donor, DONOR_BASE, pair.donorParts[1], "donor"),
    regionalize(host, HOST_BASE, pair.hostParts[0], "host"),
    regionalize(host, HOST_BASE, pair.hostParts[1], "host"),
  ]);
  results.push({
    side: pair.side,
    jointGroup: pair.group,
    donor: [donorA, donorB],
    host: [hostA, hostB],
    comparisonLimit: "Bins are independently oriented per mesh; index 0 is not guaranteed to correspond to the same anatomical end across bones or models.",
  });
}
const report = {
  purpose: "Geometric inventory to guide later region-aware surface sampling",
  hostRevision: HOST_REVISION,
  donorRevision: DONOR_REVISION,
  hostManifestVersion: host.version,
  donorManifestVersion: donor.version,
  matchedHostBorrowedParts: hostBySource.size,
  requestedJointPairs: SIDES.length * PAIRS.length,
  measuredJointPairs: results.length,
  skippedPairs: skipped,
  binCount: BIN_COUNT,
  method: "All mesh vertices are read. Each mesh is partitioned into five equal normalized intervals along its longest axis-aligned bounding-box extent. Per-bin counts, centroids, and bounds are reported.",
  interpretationLimits: [
    "end-A/end-B are geometric labels only, not proximal/distal or articular labels.",
    "The longest AABB axis can differ between paired bones and between donor and host.",
    "Bins are not anatomical segmentations and do not identify joint surfaces, attachment sites, or cartilage.",
    "No surface proximity, normal compatibility, registration, contact, penetration, collision, biomechanics, or clinical validity is evaluated.",
    "This is a read-only inventory; no production geometry or transforms are changed.",
  ],
  results,
};
console.log(JSON.stringify(report, null, 2));
