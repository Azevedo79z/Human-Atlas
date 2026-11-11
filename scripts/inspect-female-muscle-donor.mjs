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
  nextGate: "Confirm compatible binary chunk layout and validate decoded vertex ranges before any ICP/mesh-fit experiment.",
  geometryDownloaded: false,
  filesChanged: false,
  productionChanged: false,
};

console.log(JSON.stringify(report, null, 2));
if (!candidateSchemaOK || !hostSchemaOK) {
  throw new Error("The candidate and host part schemas are not compatible enough for vertex inspection.");
}
