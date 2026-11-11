/**
 * Read-only regional proximity screen for supplemental upper-body muscles.
 *
 * This is a coarse AABB (axis-aligned bounding-box) proximity audit.
 * It does NOT compute triangle-surface distances, muscle insertions, or
 * anatomical suitability. No meshes, manifests, or production assets are changed.
 *
 * Run:
 *   deno run --allow-net=raw.githubusercontent.com scripts/audit-female-muscle-region-proximity.mjs
 */
const CANDIDATE =
  "https://raw.githubusercontent.com/HiMahendraBeniwal/female-atlas/b0a20fa3a009ca5f6bfa07b7479312e04c862af2/public/models/atlas.json";
const HOST =
  "https://raw.githubusercontent.com/Azevedo79z/Human-Atlas/main/public/models/atlas-female.json";

const UPPER_BODY = /pectoralis|deltoid|biceps brachii|triceps brachii|brachialis|coracobrachialis|trapezius|latissimus|rhomboid|serratus|subclavius|supraspinatus|infraspinatus|teres|subscapularis|sternocleidomastoid|scalene|levator scapulae|pronator|supinator|flexor carpi|extensor carpi|palmaris|anconeus|interosseous|lumbrical|thenar|hypothenar|abductor pollicis|adductor pollicis|opponens/i;\nconst LOWER_LIMB = /foot|pedis|plantar|hallux|toe|calcaneal|fibular|peroneal|tibial|gastrocnemius|soleus/i;

const ANCHORS = [
  "Left clavicle", "Right clavicle",
  "Left scapula", "Right scapula",
  "Left humerus", "Right humerus",
  "Left radius", "Right radius",
  "Left ulna", "Right ulna",
  "Manubrium",
];

async function readManifest(url, label) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${label} manifest failed: HTTP ${response.status}`);
  const atlas = await response.json();
  if (!Array.isArray(atlas.parts)) throw new Error(`${label} manifest has no parts array`);
  return atlas;
}

function findAnchor(atlas, name) {
  return atlas.parts.find(part =>
    part.name.toLowerCase() === name.toLowerCase() &&
    ["skeletal", "borrowed"].includes(part.system)
  );
}

function center(bounds) {
  return bounds[0].map((value, axis) => (value + bounds[1][axis]) / 2);
}

function boxGap(a, b) {
  const gaps = a[0].map((_, axis) =>
    Math.max(0, b[0][axis] - a[1][axis], a[0][axis] - b[1][axis])
  );
  return Math.hypot(...gaps);
}

function centerDistance(a, b) {
  return Math.hypot(...center(a).map((value, axis) => value - center(b)[axis]));
}

const [candidate, host] = await Promise.all([
  readManifest(CANDIDATE, "Candidate"),
  readManifest(HOST, "Host female"),
]);

const candidateAnchors = ANCHORS.map(name => findAnchor(candidate, name));
const hostAnchors = ANCHORS.map(name => findAnchor(host, name));
if (candidateAnchors.some(part => !part) || hostAnchors.some(part => !part)) {
  throw new Error("Required upper-body bone anchors are missing from one of the manifests.");
}


function parity(permutation) {
  let inversions = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      if (permutation[i] > permutation[j]) inversions++;
    }
  }
  return inversions % 2 === 0 ? 1 : -1;
}

function fitAnchorGroup(rows) {
  if (rows.length < 2) return { anchors: rows.length, fit: "insufficient anchors" };
  const permutations = [
    [0, 1, 2], [0, 2, 1], [1, 0, 2],
    [1, 2, 0], [2, 0, 1], [2, 1, 0],
  ];
  const source = rows.map(row => center(row.candidateBounds));
  const target = rows.map(row => center(row.hostBounds));
  let best = null;

  for (const permutation of permutations) {
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const signs = [sx, sy, sz];
      if (parity(permutation) * sx * sy * sz !== 1) continue;
      const rotated = source.map(point =>
        signs.map((sign, axis) => sign * point[permutation[axis]])
      );
      const meanSource = [0, 1, 2].map(axis =>
        rotated.reduce((sum, point) => sum + point[axis], 0) / rotated.length
      );
      const meanTarget = [0, 1, 2].map(axis =>
        target.reduce((sum, point) => sum + point[axis], 0) / target.length
      );
      let numerator = 0;
      let denominator = 0;
      for (let i = 0; i < rotated.length; i++) {
        for (let axis = 0; axis < 3; axis++) {
          numerator += (rotated[i][axis] - meanSource[axis]) *
            (target[i][axis] - meanTarget[axis]);
          denominator += (rotated[i][axis] - meanSource[axis]) ** 2;
        }
      }
      const scale = numerator / denominator;
      if (!Number.isFinite(scale) || scale <= 0) continue;
      const translation = meanTarget.map((value, axis) =>
        value - scale * meanSource[axis]
      );
      const errors = rotated.map((point, index) =>
        Math.hypot(...point.map((value, axis) =>
          scale * value + translation[axis] - target[index][axis]
        ))
      );
      const rms = Math.sqrt(errors.reduce((sum, value) => sum + value ** 2, 0) / errors.length);
      if (!best || rms < best.rms) {
        best = { rms, max: Math.max(...errors), scale, permutation, signs, translation };
      }
    }
  }

  if (!best) return { anchors: rows.length, fit: "no positive-scale fit" };
  return {
    anchors: rows.length,
    scale: +best.scale.toFixed(5),
    axisPermutation: best.permutation,
    axisSigns: best.signs,
    translation: best.translation.map(value => +value.toFixed(5)),
    rmsMm: +(best.rms * 1000).toFixed(1),
    maxMm: +(best.max * 1000).toFixed(1),
  };
}
\nconst muscles = candidate.parts.filter(part =>
  part.system === "muscular" && UPPER_BODY.test(part.name) && !LOWER_LIMB.test(part.name) &&
  Array.isArray(part.bounds) && part.bounds.length === 2
);

if (muscles.length === 0) throw new Error("No upper-body muscle candidates matched the screening rules.");

const anchorRows = ANCHORS.map((name, index) => {
  const donor = candidateAnchors[index];
  const hostPart = hostAnchors[index];
  return {
    name,
    candidateSystem: donor.system,
    hostSystem: hostPart.system,
    candidateBounds: donor.bounds,
    hostBounds: hostPart.bounds,
    boundsDelta: Math.max(...donor.bounds.flatMap((point, side) =>
      point.map((value, axis) => Math.abs(value - hostPart.bounds[side][axis]))
    )),
  };
});

const results = muscles.map(muscle => {
  const ranked = candidateAnchors.map((anchor, index) => ({
    anchor: ANCHORS[index],
    aabbGap: +boxGap(muscle.bounds, anchor.bounds).toFixed(6),
    centerDistance: +centerDistance(muscle.bounds, anchor.bounds).toFixed(6),
  })).sort((a, b) => a.aabbGap - b.aabbGap || a.centerDistance - b.centerDistance);

  return {
    name: muscle.name,
    id: muscle.id,
    bounds: muscle.bounds,
    nearestBoneByAabb: ranked[0],
    nextNearestBones: ranked.slice(1, 4),
    overlapsAnyAnchorAabb: ranked[0].aabbGap === 0,
  };
}).sort((a, b) =>
  a.nearestBoneByAabb.aabbGap - b.nearestBoneByAabb.aabbGap ||
  a.name.localeCompare(b.name)
);

const report = {
  candidateRevision: "b0a20fa3a009ca5f6bfa07b7479312e04c862af2",
  candidateUpperBodyMuscleCount: muscles.length,
  anchorsChecked: anchorRows.length,
  anchorBoundsMaxDelta: Math.max(...anchorRows.map(row => row.boundsDelta)),
  anchors: anchorRows,
  proximityScreen: {
    method: "AABB separation and center-distance ranking",
    exactSurfaceDistance: false,
    anatomicalAttachmentValidated: false,
    results,
  },
  warnings: [
    "AABB overlap is not proof of physical contact.",
    "Nearest bone by bounding box is a screening hint, not an anatomical insertion.",
    "Candidate geometry provenance and sex-specific anatomical suitability require review.",
    "No model files or production deployment were changed.",
  ],
  productionChanged: false,
};

console.log(JSON.stringify(report, null, 2));
