/**
 * Read-only inspection of the pinned supplemental atlas and the current female
 * reference manifest. This is the first gate before any vertex-level fitting.
 *
 * Run:
 *   deno run --allow-net=raw.githubusercontent.com scripts/inspect-female-muscle-donor.mjs
 *
 * It fetches manifests only. It does not fetch geometry chunks, import meshes,
 * or modify repository files or the deployed viewer.
 */
const CANDIDATE =
  "https://raw.githubusercontent.com/HiMahendraBeniwal/female-atlas/b0a20fa3a009ca5f6bfa07b7479312e04c862af2/public/models/atlas.json";
const HOST =
  "https://raw.githubusercontent.com/Azevedo79z/Human-Atlas/main/public/models/atlas-female.json";

async function readManifest(url, label) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${label} manifest request failed: HTTP ${response.status}`);
  }
  const manifest = await response.json();
  if (!Array.isArray(manifest.parts) || !Array.isArray(manifest.chunks)) {
    throw new Error(`${label} manifest is missing parts or chunks arrays.`);
  }
  return manifest;
}

const [candidate, host] = await Promise.all([
  readManifest(CANDIDATE, "Candidate"),
  readManifest(HOST, "Host female"),
]);

const CANDIDATE_BASE =
  "https://raw.githubusercontent.com/HiMahendraBeniwal/female-atlas/b0a20fa3a009ca5f6bfa07b7479312e04c862af2/public/";
const HOST_BASE =
  "https://raw.githubusercontent.com/Azevedo79z/Human-Atlas/main/public/";

const systems = atlas => [...new Set(atlas.parts.map(part => part.system))].sort();
const sample = (atlas, system, count = 5) => atlas.parts
  .filter(part => part.system === system)
  .slice(0, count)
  .map(part => ({
    id: part.id,
    name: part.name,
    system: part.system,
    chunk: part.chunk,
    positions: part.positions,
    vertexCount: part.vertexCount,
    bounds: part.bounds,
  }));

const candidateMuscles = candidate.parts.filter(part => part.system === "muscular");
const hostMuscles = host.parts.filter(part =>
  part.system === "muscular" || part.system === "donor-muscle"
);
const requiredFields = ["chunk", "positions", "vertexCount", "bounds"];
const candidateSchemaOK = candidate.parts.every(part =>
  requiredFields.every(key => key in part)
);
const hostSchemaOK = host.parts.every(part =>
  requiredFields.every(key => key in part)
);

function findPart(atlas, name, allowedSystems) {
  return atlas.parts.find(part =>
    part.name.toLowerCase() === name.toLowerCase() &&
    allowedSystems.includes(part.system)
  );
}

async function validateVertices(atlas, base, label, selectedParts) {
  const chunks = new Map();
  const checks = [];
  for (const part of selectedParts) {
    if (!part) continue;
    const chunk = atlas.chunks[part.chunk];
    if (!chunk) throw new Error(`${label}: missing chunk ${part.chunk} for ${part.name}`);
    let buffer = chunks.get(part.chunk);
    if (!buffer) {
      const chunkPath = chunk.url.startsWith("/") ? chunk.url.slice(1) : chunk.url;
      const url = new URL(chunkPath, base);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${label}: chunk fetch failed (${response.status}): ${url}`);
      buffer = await response.arrayBuffer();
      if (chunk.bytes !== undefined && buffer.byteLength !== chunk.bytes) {
        throw new Error(`${label}: chunk byte count mismatch for ${chunk.url}`);
      }
      chunks.set(part.chunk, buffer);
    }
    const view = new DataView(buffer);
    const start = part.positions;
    const end = start + part.vertexCount * 12;
    if (!Number.isInteger(start) || start < 0 || end > buffer.byteLength) {
      throw new Error(`${label}: invalid vertex range for ${part.name}`);
    }
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < part.vertexCount; i++) {
      for (let axis = 0; axis < 3; axis++) {
        const value = view.getFloat32(start + i * 12 + axis * 4, true);
        if (!Number.isFinite(value)) throw new Error(`${label}: non-finite vertex in ${part.name}`);
        min[axis] = Math.min(min[axis], value);
        max[axis] = Math.max(max[axis], value);
      }
    }
    const tolerance = 0.0002;
    const boundError = Math.max(...min.map((value, axis) =>
      Math.max(Math.abs(value - part.bounds[0][axis]), Math.abs(max[axis] - part.bounds[1][axis]))
    ));
    if (boundError > tolerance) {
      throw new Error(`${label}: decoded vertices disagree with manifest bounds for ${part.name} (${boundError})`);
    }
    checks.push({
      name: part.name,
      system: part.system,
      chunk: part.chunk,
      vertices: part.vertexCount,
      boundsError: +boundError.toFixed(7),
    });
  }
  return {uniqueChunksDownloaded: chunks.size, structuresChecked: checks.length, checks};
}

const upperBodyAnchors = [
  "Left clavicle", "Left scapula", "Left humerus", "Left radius", "Left ulna",
  "Right clavicle", "Right scapula", "Right humerus", "Right radius", "Right ulna",
  "Sternum", "Manubrium",
];
const candidateAnchors = upperBodyAnchors.map(name =>
  findPart(candidate, name, ["skeletal"])
);
const hostAnchors = upperBodyAnchors.map(name =>
  findPart(host, name, ["borrowed"])
);
if (candidateAnchors.some(part => !part) || hostAnchors.some(part => !part)) {
  const missingCandidate = upperBodyAnchors.filter((name, i) => !candidateAnchors[i]);
  const missingHost = upperBodyAnchors.filter((name, i) => !hostAnchors[i]);
  throw new Error(`Missing upper-body anchor parts. Candidate: ${missingCandidate.join(", ")}; host: ${missingHost.join(", ")}`);
}
const candidateMuscleSamples = candidate.parts.filter(part =>
  part.system === "muscular" &&
  /biceps|triceps|deltoid|pectoralis|latissimus|rectus abdominis|trapezius/i.test(part.name)
).slice(0, 4);
if (!candidateMuscleSamples.length) {
  throw new Error("No representative upper-body muscle samples found in the candidate manifest.");
}
const candidateVertexCheck = await validateVertices(
  candidate, CANDIDATE_BASE, "Candidate", [...candidateAnchors, ...candidateMuscleSamples]
);
const hostVertexCheck = await validateVertices(
  host, HOST_BASE, "Host female", hostAnchors
);

const report = {
  candidate: {
    version: candidate.version ?? null,
    source: candidate.source ?? null,
    parts: candidate.parts.length,
    chunks: candidate.chunks.length,
    muscleParts: candidateMuscles.length,
    uniqueMuscleLabels: new Set(candidateMuscles.map(part => part.name)).size,
    systems: systems(candidate),
    chunkExample: candidate.chunks[0] ?? null,
    skeletalPartExample: sample(candidate, "skeletal", 2),
    musclePartExamples: sample(candidate, "muscular", 3),
    partSchemaComplete: candidateSchemaOK,
  },
  hostFemale: {
    version: host.version ?? null,
    parts: host.parts.length,
    chunks: host.chunks.length,
    existingMuscleParts: hostMuscles.length,
    systems: systems(host),
    chunkExample: host.chunks[0] ?? null,
    skeletalPartExamples: sample(host, "skeletal", 3),
    musclePartExamples: [
      ...sample(host, "muscular", 2),
      ...sample(host, "donor-muscle", 2),
    ],
    partSchemaComplete: hostSchemaOK,
  },
  vertexPreflight: {
    candidate: candidateVertexCheck,
    hostFemale: hostVertexCheck,
    decodedPositionFormat: "little-endian Float32 XYZ",
    boundsTolerance: 0.0002,
    purpose: "binary integrity only; not anatomical alignment",
  },
  nextGate: "Perform region-specific vertex-surface alignment and attachment checks in an isolated prototype.",
  geometryDownloaded: true,
  filesChanged: false,
  productionChanged: false,
};

console.log(JSON.stringify(report, null, 2));
if (!candidateSchemaOK || !hostSchemaOK) {
  throw new Error("The candidate and host part schemas are not compatible enough for vertex inspection.");
}
