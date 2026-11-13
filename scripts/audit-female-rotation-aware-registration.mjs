/**
 * Read-only rotation-aware landmark registration screen for the female atlas.
 *
 * Uses exact source-ID matched donor/host skeletal parts, separates left/right/
 * midline anchors, and estimates a proper 3D rotation plus uniform scale and
 * translation with Horn's quaternion method. Bounding-box centers are landmarks,
 * not anatomical joint centers. Candidate transforms are never applied.
 */
const HOST_REVISION = "c67dabc7189f90a17b7d3fe997d517913eb3474c";
const DONOR_REVISION = "b0a20fa3a009ca5f6bfa07b7479312e04c862af2";
const HOST_URL = "https://raw.githubusercontent.com/Azevedo79z/Human-Atlas/" + HOST_REVISION + "/public/models/atlas-female.json";
const DONOR_URL = "https://raw.githubusercontent.com/HiMahendraBeniwal/female-atlas/" + DONOR_REVISION + "/public/models/atlas.json";
const MIN_ANCHORS = 3;
const MIN_NONCOLLINEARITY = 1e-5;

async function readManifest(url, label) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(label + " manifest HTTP " + response.status);
  const data = await response.json();
  if (!Array.isArray(data.parts)) throw new Error(label + " manifest parts[] missing");
  return data;
}

function side(name) {
  const value = name.toLowerCase();
  const left = /\bleft\b/.test(value);
  const right = /\bright\b/.test(value);
  if (left && right) return "ambiguous";
  if (left) return "left";
  if (right) return "right";
  return "midline";
}

function family(name) {
  const value = name.toLowerCase();
  if (/rib|costal|sternum|manubrium|xiphoid/.test(value)) return "thorax";
  if (/clavicle|scapula|acromion|coracoid|humerus/.test(value)) return "shoulder-arm";
  if (/radius|ulna/.test(value)) return "forearm";
  if (/foot|talus|calcaneus|tarsal|metatarsal|cuneiform|navicular|cuboid|toe/.test(value)) return "foot";
  if (/hand|thumb|finger|carpal|metacarpal|phalanx|phalanges|trapezium|trapezoid|pisiform|scaphoid|lunate|triquetrum|capitate|hamate/.test(value)) return "hand";
  if (/sacrum|coccyx|ilium|ischium|pubis|hip bone/.test(value)) return "pelvis";
  if (/femur/.test(value)) return "thigh";
  if (/tibia|fibula|patella/.test(value)) return "lower-leg";
  if (/vertebra|spine/.test(value)) return "spine";
  if (/cranium|cranial|skull|mandible|maxilla|zygomatic|frontal|parietal|temporal|occipital|sphenoid|ethmoid|nasal|lacrimal|palatine|vomer/.test(value)) return "skull";
  if (/hyoid/.test(value)) return "hyoid";
  return null;
}

function center(bounds) {
  return bounds[0].map((value, axis) => (value + bounds[1][axis]) / 2);
}
function add(a, b) { return a.map((value, i) => value + b[i]); }
function sub(a, b) { return a.map((value, i) => value - b[i]); }
function scaleVector(a, factor) { return a.map(value => value * factor); }
function dot(a, b) { return a.reduce((sum, value, i) => sum + value * b[i], 0); }
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm(a) { return Math.sqrt(dot(a, a)); }
function mean(points) {
  return scaleVector(points.reduce((sum, point) => add(sum, point), [0, 0, 0]), 1 / points.length);
}

function jacobiEigen(matrix) {
  const size = matrix.length;
  const a = matrix.map(row => [...row]);
  const vectors = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => row === col ? 1 : 0)
  );
  for (let iteration = 0; iteration < 100 * size * size; iteration++) {
    let p = 0, q = 1, largest = 0;
    for (let row = 0; row < size; row++) {
      for (let col = row + 1; col < size; col++) {
        if (Math.abs(a[row][col]) > largest) {
          largest = Math.abs(a[row][col]);
          p = row;
          q = col;
        }
      }
    }
    if (largest < 1e-14) break;
    const tau = (a[q][q] - a[p][p]) / (2 * a[p][q]);
    const t = (tau >= 0 ? 1 : -1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
    const c = 1 / Math.sqrt(1 + t * t);
    const s = t * c;
    const app = a[p][p], aqq = a[q][q], apq = a[p][q];
    a[p][p] = app - t * apq;
    a[q][q] = aqq + t * apq;
    a[p][q] = 0;
    a[q][p] = 0;
    for (let k = 0; k < size; k++) {
      if (k === p || k === q) continue;
      const akp = a[k][p], akq = a[k][q];
      a[k][p] = c * akp - s * akq;
      a[p][k] = a[k][p];
      a[k][q] = s * akp + c * akq;
      a[q][k] = a[k][q];
    }
    for (let k = 0; k < size; k++) {
      const vkp = vectors[k][p], vkq = vectors[k][q];
      vectors[k][p] = c * vkp - s * vkq;
      vectors[k][q] = s * vkp + c * vkq;
    }
  }
  const eigenvalues = a.map((row, index) => row[index]);
  const largestIndex = eigenvalues.indexOf(Math.max(...eigenvalues));
  return {
    values: eigenvalues,
    vector: vectors.map(row => row[largestIndex]),
  };
}

function quaternionToMatrix(quaternion) {
  let [w, x, y, z] = quaternion;
  const length = Math.hypot(w, x, y, z);
  w /= length; x /= length; y /= length; z /= length;
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
    [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
    [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
  ];
}

function rotate(point, matrix) {
  return matrix.map(row => dot(row, point));
}

function fitRigidSimilarity(source, target) {
  if (source.length !== target.length || source.length < MIN_ANCHORS) {
    return { status: "insufficient-anchors", anchorCount: source.length };
  }
  const sourceMean = mean(source);
  const targetMean = mean(target);
  const sourceCentered = source.map(point => sub(point, sourceMean));
  const targetCentered = target.map(point => sub(point, targetMean));
  let largestArea = 0;
  let largestSpan = 0;
  for (const point of sourceCentered) largestSpan = Math.max(largestSpan, norm(point));
  for (let i = 0; i < sourceCentered.length; i++) {
    for (let j = i + 1; j < sourceCentered.length; j++) {
      largestArea = Math.max(largestArea, norm(cross(sourceCentered[i], sourceCentered[j])));
    }
  }
  if (largestSpan < 1e-8 || largestArea / (largestSpan * largestSpan) < MIN_NONCOLLINEARITY) {
    return { status: "degenerate-anchor-layout", anchorCount: source.length, noncollinearityRatio: largestArea / Math.max(1e-16, largestSpan * largestSpan) };
  }

  const covariance = Array.from({ length: 3 }, () => [0, 0, 0]);
  for (let i = 0; i < source.length; i++) {
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        covariance[row][col] += sourceCentered[i][row] * targetCentered[i][col];
      }
    }
  }
  const [[sxx, sxy, sxz], [syx, syy, syz], [szx, szy, szz]] = covariance;
  const trace = sxx + syy + szz;
  const n = [
    [trace, syz - szy, szx - sxz, sxy - syx],
    [syz - szy, sxx - syy - szz, sxy + syx, szx + sxz],
    [szx - sxz, sxy + syx, -sxx + syy - szz, syz + szy],
    [sxy - syx, szx + sxz, syz + szy, -sxx - syy + szz],
  ];
  const eigen = jacobiEigen(n);
  const quaternion = eigen.vector;
  const rotation = quaternionToMatrix(quaternion);
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < source.length; i++) {
    numerator += dot(targetCentered[i], rotate(sourceCentered[i], rotation));
    denominator += dot(sourceCentered[i], sourceCentered[i]);
  }
  const uniformScale = numerator / denominator;
  if (!Number.isFinite(uniformScale) || uniformScale <= 0) {
    return { status: "invalid-scale", anchorCount: source.length, uniformScale };
  }
  const translation = sub(targetMean, scaleVector(rotate(sourceMean, rotation), uniformScale));
  const predictions = source.map(point => add(scaleVector(rotate(point, rotation), uniformScale), translation));
  const residuals = predictions.map((point, index) => norm(sub(point, target[index])));
  const rmse = Math.sqrt(residuals.reduce((sum, value) => sum + value * value, 0) / residuals.length);
  const sorted = [...residuals].sort((a, b) => a - b);
  const w = Math.min(1, Math.max(-1, Math.abs(quaternion[0]) / Math.hypot(...quaternion)));
  const rotationDegrees = 2 * Math.acos(w) * 180 / Math.PI;
  const determinant =
    rotation[0][0] * (rotation[1][1] * rotation[2][2] - rotation[1][2] * rotation[2][1]) -
    rotation[0][1] * (rotation[1][0] * rotation[2][2] - rotation[1][2] * rotation[2][0]) +
    rotation[0][2] * (rotation[1][0] * rotation[2][1] - rotation[1][1] * rotation[2][0]);
  const identityPredictions = source.map(point => add(point, sub(targetMean, sourceMean)));
  const identityResiduals = identityPredictions.map((point, index) => norm(sub(point, target[index])));
  const identityRmse = Math.sqrt(identityResiduals.reduce((sum, value) => sum + value * value, 0) / identityResiduals.length);
  return {
    status: "candidate-only",
    anchorCount: source.length,
    uniformScale,
    translation,
    quaternion: quaternion.map(value => Number(value.toFixed(8))),
    rotationMatrix: rotation.map(row => row.map(value => Number(value.toFixed(8)))),
    rotationDegrees,
    determinant,
    centerResidualMm: {
      translationOnlyRmse: identityRmse * 1000,
      rotationScaleRmse: rmse * 1000,
      median: sorted[Math.floor((sorted.length - 1) / 2)] * 1000,
      p90: sorted[Math.floor((sorted.length - 1) * 0.9)] * 1000,
      max: sorted[sorted.length - 1] * 1000,
      rmseImprovementPercent: identityRmse > 1e-12 ? (1 - rmse / identityRmse) * 100 : 0,
    },
    noncollinearityRatio: largestArea / (largestSpan * largestSpan),
  };
}

function runSyntheticSelfTests() {
  const source = [[0,0,0],[1,0,0],[0,2,0],[0,0,3],[1,2,3]];
  const angle = Math.PI / 2;
  const matrix = [[Math.cos(angle),-Math.sin(angle),0],[Math.sin(angle),Math.cos(angle),0],[0,0,1]];
  const target = source.map(point => add(scaleVector(rotate(point, matrix), 1.7), [0.3,-0.8,2.1]));
  const fit = fitRigidSimilarity(source, target);
  if (fit.status !== "candidate-only" || fit.centerResidualMm.rmse > 1e-5 ||
      Math.abs(fit.uniformScale - 1.7) > 1e-8 || Math.abs(fit.rotationDegrees - 90) > 1e-5 ||
      Math.abs(fit.determinant - 1) > 1e-8) {
    throw new Error("Synthetic Horn quaternion registration self-test failed: " + JSON.stringify(fit));
  }
  const line = [[0,0,0],[1,0,0],[2,0,0],[3,0,0]];
  const degenerate = fitRigidSimilarity(line, line.map(point => add(point, [1,2,3])));
  if (degenerate.status !== "degenerate-anchor-layout") {
    throw new Error("Collinear-anchor rejection self-test failed.");
  }
  return { known90DegreeRotation: "passed", uniformScaleAndTranslation: "passed", properRotationDeterminant: "passed", collinearAnchorRejection: "passed" };
}

const selfTests = runSyntheticSelfTests();
const [host, donor] = await Promise.all([
  readManifest(HOST_URL, "Host female"),
  readManifest(DONOR_URL, "Donor female"),
]);
const donorById = new Map(donor.parts.map(part => [part.id, part]));
const mappedHostParts = host.parts.filter(part =>
  part.system === "borrowed" && part.conceptId?.startsWith("BORROWED:FJ")
);
const pairs = mappedHostParts.flatMap(hostPart => {
  const sourceId = hostPart.conceptId.slice("BORROWED:".length);
  const donorPart = donorById.get("BP3D_" + sourceId);
  if (!donorPart || donorPart.system !== "skeletal" || !hostPart.bounds || !donorPart.bounds) return [];
  const donorSide = side(donorPart.name);
  const hostSide = side(hostPart.name);
  if (donorSide === "ambiguous" || hostSide === "ambiguous") return [];
  return [{
    sourceId,
    family: family(donorPart.name),
    side: donorSide,
    hostSide,
    sideAgreement: donorSide === hostSide,
    host: hostPart,
    donor: donorPart,
  }];
}).filter(pair => pair.family !== null);

const groups = new Map();
for (const pair of pairs) {
  const key = pair.family + "|" + pair.side;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(pair);
}
const regions = [];
for (const [key, rows] of groups) {
  const [anatomicalFamily, anatomicalSide] = key.split("|");
  const source = rows.map(row => center(row.donor.bounds));
  const target = rows.map(row => center(row.host.bounds));
  const fit = fitRigidSimilarity(source, target);
  regions.push({
    family: anatomicalFamily,
    side: anatomicalSide,
    matchedAnchors: rows.length,
    sideAgreementCount: rows.filter(row => row.sideAgreement).length,
    sideMismatchParts: rows.filter(row => !row.sideAgreement).map(row => ({
      donorName: row.donor.name, hostName: row.host.name, sourceId: row.sourceId,
      donorSide: row.side, hostSide: row.hostSide,
    })),
    matchedParts: rows.map(row => ({
      sourceId: row.sourceId,
      donorName: row.donor.name,
      hostName: row.host.name,
    })),
    fit,
  });
}
regions.sort((a, b) => a.family.localeCompare(b.family) || a.side.localeCompare(b.side));

const report = {
  hostRevision: HOST_REVISION,
  donorRevision: DONOR_REVISION,
  hostVersion: host.version,
  donorVersion: donor.version,
  hostSourceMappedBorrowedParts: mappedHostParts.length,
  sourceIdMatchedSkeletalAnchors: pairs.length,
  sideAgreementCount: pairs.filter(pair => pair.sideAgreement).length,
  selfTests,
  method: [
    "Match host borrowed bones to donor skeletal parts only by exact source IDs.",
    "Derive left/right/midline independently from both donor and host part names; report any disagreement.",
    "Group landmark centers by broad anatomical family and laterality.",
    "Estimate a proper 3D rotation, uniform positive scale, and translation using Horn's quaternion least-squares method.",
    "Reject groups with fewer than three anchors or near-collinear anchor layouts.",
    "Compare the rotation-aware candidate against translation-only center alignment using landmark residuals.",
    "Keep every transform diagnostic-only; never apply it to geometry.",
  ],
  interpretationLimits: [
    "Bounding-box centers are proxy landmarks, not verified joint centers or muscle attachment landmarks.",
    "A low center residual does not establish surface registration, anatomical correctness, or correct articulation.",
    "A single transform per broad family may conceal local differences between bones.",
    "The fit uses uniform scale only and cannot model anisotropic deformation or local shape changes.",
    "The proper rotation fit does not permit reflections; large residuals may indicate different handed coordinate frames or source geometry.",
    "This is not ICP, triangle-surface distance, collision detection, or clinical validation.",
    "No source mesh, manifest, viewer, Wix integration, production asset, or deployment is modified.",
  ],
  regions,
  productionChanged: false,
};
console.log(JSON.stringify(report, null, 2));
