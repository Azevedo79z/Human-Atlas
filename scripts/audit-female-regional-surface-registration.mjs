/**
 * Read-only regional surface-registration screen for source-mapped female bones.
 *
 * Fits independent axis-aligned scale/translation candidates per anatomical
 * region from source-ID matched bounding-box centers, then checks the candidates
 * against sampled mesh vertices for each matched bone pair.
 *
 * This is not ICP, exact triangle-surface distance, collision detection, or
 * anatomical approval. No transform is applied to repository assets.
 */
const HOST_REVISION = "c67dabc7189f90a17b7d3fe997d517913eb3474c";
const DONOR_REVISION = "b0a20fa3a009ca5f6bfa07b7479312e04c862af2";
const HOST_BASE = \`https://raw.githubusercontent.com/Azevedo79z/Human-Atlas/\${HOST_REVISION}/public/\`;
const DONOR_BASE = \`https://raw.githubusercontent.com/HiMahendraBeniwal/female-atlas/\${DONOR_REVISION}/public/\`;
const SAMPLE_LIMIT = 48;

async function readManifest(url, label) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(\`\${label} manifest HTTP \${response.status}\`);
  const value = await response.json();
  if (!Array.isArray(value.parts) || !Array.isArray(value.chunks)) {
    throw new Error(\`\${label} manifest schema invalid\`);
  }
  return value;
}

function family(name) {
  const value = name.toLowerCase();
  if (/rib|costal/.test(value)) return "thorax-ribs";
  if (/clavicle|scapula|acromion|coracoid/.test(value)) return "shoulder-girdle";
  if (/humerus/.test(value)) return "upper-arm";
  if (/radius|ulna/.test(value)) return "forearm";
  if (/femur/.test(value)) return "thigh";
  if (/tibia|fibula|patella/.test(value)) return "leg";
  if (/sacrum|coccyx|ilium|ischium|pubis/.test(value)) return "pelvis";
  if (/talus|calcaneus|tarsal|metatarsal|phalange|toe/.test(value)) return "foot";
  if (/vertebra|spine/.test(value)) return "spine";
  if (/cranium|cranial|skull|mandible|maxilla|zygomatic|frontal|parietal|temporal|occipital|sphenoid|ethmoid|nasal|lacrimal|palatine|vomer/.test(value)) return "skull";
  if (/sternum|manubrium|xiphoid/.test(value)) return "sternum";
  return "other";
}

function center(bounds) {
  return bounds[0].map((value, axis) => (value + bounds[1][axis]) / 2);
}

function fitAxis(source, target, axis) {
  const meanSource = source.reduce((sum, point) => sum + point[axis], 0) / source.length;
  const meanTarget = target.reduce((sum, point) => sum + point[axis], 0) / target.length;
  let numerator = 0;
  let denominator = 0;
  for (let index = 0; index < source.length; index++) {
    numerator += (source[index][axis] - meanSource) * (target[index][axis] - meanTarget);
    denominator += (source[index][axis] - meanSource) ** 2;
  }
  const candidateScale = denominator < 1e-12 ? 0 : numerator / denominator;
  const fallback = denominator < 1e-12 || Math.abs(candidateScale) < 1e-8;
  const scale = fallback ? 1 : candidateScale;
  const translation = meanTarget - scale * meanSource;
  const errors = source.map((point, index) =>
    target[index][axis] - (scale * point[axis] + translation)
  );
  return {
    scale,
    translation,
    rmse: Math.sqrt(errors.reduce((sum, value) => sum + value * value, 0) / errors.length),
    maxAbsResidual: Math.max(...errors.map(Math.abs)),
    fitMode: fallback ? "translation-only-unstable-axis" : "linear-center-fit",
  };
}

function fitRegion(rows) {
  const source = rows.map(row => center(row.donor.bounds));
  const target = rows.map(row => center(row.host.bounds));
  const axes = [0, 1, 2].map(axis => fitAxis(source, target, axis));
  return { x: axes[0], y: axes[1], z: axes[2] };
}

function transformPoint(point, transform) {
  return [transform.x, transform.y, transform.z].map((axis, index) =>
    axis.scale * point[index] + axis.translation
  );
}

const chunkCache = new Map();
async function readChunk(atlas, base, index, label) {
  const key = \`\${label}:\${index}\`;
  if (chunkCache.has(key)) return chunkCache.get(key);
  const metadata = atlas.chunks[index];
  if (!metadata) throw new Error(\`\${label}: missing chunk metadata \${index}\`);
  const path = metadata.url.replace(/^\\/+/, "");
  const response = await fetch(new URL(path, base));
  if (!response.ok) throw new Error(\`\${label}: chunk \${index} HTTP \${response.status}\`);
  const buffer = await response.arrayBuffer();
  if (metadata.bytes !== undefined && buffer.byteLength !== metadata.bytes) {
    throw new Error(\`\${label}: chunk \${index} byte-length mismatch\`);
  }
  chunkCache.set(key, buffer);
  return buffer;
}

async function sampleVertices(atlas, base, part, label) {
  const buffer = await readChunk(atlas, base, part.chunk, label);
  const requiredBytes = part.positions + part.vertexCount * 12;
  if (requiredBytes > buffer.byteLength) {
    throw new Error(\`\${label}: vertex range exceeds chunk for \${part.name}\`);
  }
  const view = new DataView(buffer);
  const count = Math.min(SAMPLE_LIMIT, part.vertexCount);
  const points = [];
  for (let sample = 0; sample < count; sample++) {
    const vertex = count === 1 ? 0 : Math.floor(sample * (part.vertexCount - 1) / (count - 1));
    const offset = part.positions + vertex * 12;
    const point = [0, 1, 2].map(axis => view.getFloat32(offset + axis * 4, true));
    if (!point.every(Number.isFinite)) throw new Error(\`\${label}: non-finite vertex in \${part.name}\`);
    points.push(point);
  }
  return points;
}

function quantile(sorted, fraction) {
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))];
}

function directedNearest(source, target, transform) {
  const distances = source.map(point => {
    const mapped = transform ? transformPoint(point, transform) : point;
    let best = Infinity;
    for (const candidate of target) {
      best = Math.min(best, Math.hypot(
        mapped[0] - candidate[0],
        mapped[1] - candidate[1],
        mapped[2] - candidate[2],
      ));
    }
    return best;
  }).sort((a, b) => a - b);
  return {
    p50: quantile(distances, 0.5),
    p90: quantile(distances, 0.9),
    max: distances.at(-1),
  };
}

function mm(value) {
  return Number((value * 1000).toFixed(2));
}

const [host, donor] = await Promise.all([
  readManifest(HOST_BASE + "models/atlas-female.json", "Host"),
  readManifest(DONOR_BASE + "models/atlas.json", "Donor"),
]);
const donorById = new Map(donor.parts.map(part => [part.id, part]));
const mappedHostParts = host.parts.filter(part =>
  part.system === "borrowed" && part.conceptId?.startsWith("BORROWED:FJ")
);
const pairs = mappedHostParts.flatMap(hostPart => {
  const sourceId = hostPart.conceptId.slice("BORROWED:".length);
  const donorPart = donorById.get(\`BP3D_\${sourceId}\`);
  if (!donorPart || donorPart.system !== "skeletal") return [];
  if (!hostPart.bounds || !donorPart.bounds) return [];
  return [{ sourceId, region: family(donorPart.name), host: hostPart, donor: donorPart }];
});
if (pairs.length === 0) throw new Error("No source-ID matched skeletal pairs were found.");

const grouped = new Map();
for (const pair of pairs) {
  if (!grouped.has(pair.region)) grouped.set(pair.region, []);
  grouped.get(pair.region).push(pair);
}

const results = [];
for (const [region, rows] of grouped) {
  if (rows.length < 2) {
    results.push({
      region,
      matchedParts: rows.length,
      status: "insufficient-independent-anchors",
      note: "At least two source-ID matched parts are required for a regional center fit.",
    });
    continue;
  }
  const transform = fitRegion(rows);
  const inverseTransform = {
    x: { scale: 1 / transform.x.scale, translation: -transform.x.translation / transform.x.scale },
    y: { scale: 1 / transform.y.scale, translation: -transform.y.translation / transform.y.scale },
    z: { scale: 1 / transform.z.scale, translation: -transform.z.translation / transform.z.scale },
  };
  const partResults = [];
  for (const row of rows) {
    const [donorPoints, hostPoints] = await Promise.all([
      sampleVertices(donor, DONOR_BASE, row.donor, "donor"),
      sampleVertices(host, HOST_BASE, row.host, "host"),
    ]);
    const donorToHost = directedNearest(donorPoints, hostPoints, transform);
    const hostToDonor = directedNearest(hostPoints, donorPoints, inverseTransform);
    const symmetricP50 = (donorToHost.p50 + hostToDonor.p50) / 2;
    const symmetricP90 = Math.max(donorToHost.p90, hostToDonor.p90);
    partResults.push({
      sourceId: row.sourceId,
      donorPartId: row.donor.id,
      donorName: row.donor.name,
      hostPartId: row.host.id,
      hostName: row.host.name,
      sampledVertices: { donor: donorPoints.length, host: hostPoints.length },
      directedDistanceMm: {
        donorToHostP50: mm(donorToHost.p50),
        donorToHostP90: mm(donorToHost.p90),
        hostToDonorP50: mm(hostToDonor.p50),
        hostToDonorP90: mm(hostToDonor.p90),
      },
      symmetricScreenMm: { p50: mm(symmetricP50), p90: mm(symmetricP90) },
    });
  }
  const p50Values = partResults.map(item => item.symmetricScreenMm.p50).sort((a, b) => a - b);
  const p90Values = partResults.map(item => item.symmetricScreenMm.p90).sort((a, b) => a - b);
  results.push({
    region,
    matchedParts: rows.length,
    candidateTransform: {
      x: transform.x,
      y: transform.y,
      z: transform.z,
      containsNegativeScale: [transform.x.scale, transform.y.scale, transform.z.scale].some(value => value < 0),
    },
    surfaceScreenMmAcrossParts: {
      medianOfPartP50: quantile(p50Values, 0.5),
      medianOfPartP90: quantile(p90Values, 0.5),
      worstPartP90: Math.max(...p90Values),
    },
    worstMatchedParts: [...partResults]
      .sort((a, b) => b.symmetricScreenMm.p90 - a.symmetricScreenMm.p90)
      .slice(0, 12),
    status: "diagnostic-only",
  });
}

const report = {
  hostRevision: HOST_REVISION,
  donorRevision: DONOR_REVISION,
  hostVersion: host.version,
  donorVersion: donor.version,
  hostSourceMappedBorrowedParts: mappedHostParts.length,
  sourceIdMatchedSkeletalPairs: pairs.length,
  sampleLimitPerMesh: SAMPLE_LIMIT,
  distanceUnit: "millimetres, assuming source manifest coordinates are metres",
  method: [
    "Pair host borrowed bones to donor skeletal parts only by explicit BORROWED:FJ source IDs.",
    "Fit independent axis-aligned scale/translation candidates per named anatomical family using bounding-box centers.",
    "Compare sampled vertices in both directions for every matched bone pair after the candidate transform.",
    "Report residuals as a screening signal; no candidate transform is applied or approved.",
  ],
  limitations: [
    "This is sampled vertex-to-vertex distance, not exact triangle-surface distance or continuous Hausdorff distance.",
    "The axis-aligned family fit cannot recover arbitrary 3D rotation or local deformation.",
    "A family fit may combine bones with different articulation or source-specific posture.",
    "Negative scale, sparse family coverage, and large residuals require review; they are not corrected automatically.",
    "Surface proximity does not establish anatomical equivalence, attachment correctness, or suitability of donor muscles.",
    "No source mesh, manifest, viewer, Wix integration, or production deployment is modified.",
  ],
  regions: results,
  productionChanged: false,
};
console.log(JSON.stringify(report, null, 2));
