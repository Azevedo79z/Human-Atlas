/**
 * Read-only host/donor coordinate-frame registration screen.
 *
 * Compares donor skeletal landmarks with the female host's explicitly
 * source-mapped borrowed bones. It estimates axis-aligned affine relations
 * from bounding-box centers only; it does not transform or register meshes.
 */
const HOST_REVISION = "c67dabc7189f90a17b7d3fe997d517913eb3474c";
const DONOR_REVISION = "b0a20fa3a009ca5f6bfa07b7479312e04c862af2";
const HOST_URL = `https://raw.githubusercontent.com/Azevedo79z/Human-Atlas/${HOST_REVISION}/public/models/atlas-female.json`;
const DONOR_URL = `https://raw.githubusercontent.com/HiMahendraBeniwal/female-atlas/${DONOR_REVISION}/public/models/atlas.json`;

async function manifest(url, label) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${label} manifest HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data.parts)) throw new Error(`${label} manifest parts[] missing`);
  return data;
}
const [host, donor] = await Promise.all([
  manifest(HOST_URL, "Host female"),
  manifest(DONOR_URL, "Donor female"),
]);

const donorById = new Map(donor.parts.map(part => [part.id, part]));
const hostLandmarks = host.parts
  .filter(part => part.system === "borrowed" && part.conceptId?.startsWith("BORROWED:FJ"))
  .map(part => {
    const sourceId = part.conceptId.slice("BORROWED:".length);
    const donorPart = donorById.get(`BP3D_${sourceId}`);
    if (!donorPart || donorPart.system !== "skeletal") return null;
    return { host: part, donor: donorPart, sourceId };
  })
  .filter(Boolean);

function center(bounds) {
  return bounds[0].map((value, axis) => (value + bounds[1][axis]) / 2);
}
function extent(bounds) {
  return bounds[0].map((value, axis) => bounds[1][axis] - value);
}
function linearFit(points, axis) {
  const xs = points.map(point => point.donorCenter[axis]);
  const ys = points.map(point => point.hostCenter[axis]);
  const meanX = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / ys.length;
  let numerator = 0, denominator = 0;
  for (let i = 0; i < xs.length; i++) {
    numerator += (xs[i] - meanX) * (ys[i] - meanY);
    denominator += (xs[i] - meanX) ** 2;
  }
  const scale = denominator > 0 ? numerator / denominator : null;
  const translation = scale === null ? null : meanY - scale * meanX;
  const residuals = scale === null ? [] : xs.map((x, i) => ys[i] - (scale * x + translation));
  const absolute = residuals.map(Math.abs).sort((a, b) => a - b);
  return {
    scale,
    translation,
    rmse: residuals.length ? Math.sqrt(residuals.reduce((sum, value) => sum + value * value, 0) / residuals.length) : null,
    medianAbsoluteResidual: absolute.length ? absolute[Math.floor((absolute.length - 1) / 2)] : null,
    maxAbsoluteResidual: absolute.length ? absolute.at(-1) : null,
  };
}
function family(name) {
  const n = name.toLowerCase();
  if (/clavicle/.test(n)) return "clavicle";
  if (/scapula/.test(n)) return "scapula";
  if (/humerus/.test(n)) return "humerus";
  if (/radius/.test(n)) return "radius";
  if (/ulna/.test(n)) return "ulna";
  if (/rib|costal/.test(n)) return "rib";
  if (/sternum/.test(n)) return "sternum";
  if (/vertebra|spine/.test(n)) return "vertebra";
  if (/femur/.test(n)) return "femur";
  if (/tibia/.test(n)) return "tibia";
  if (/fibula/.test(n)) return "fibula";
  if (/patella/.test(n)) return "patella";
  if (/sacrum|coccyx/.test(n)) return "pelvis";
  return "other";
}
const matches = hostLandmarks.map(({host: h, donor: d, sourceId}) => {
  const hc = center(h.bounds), dc = center(d.bounds);
  const he = extent(h.bounds), de = extent(d.bounds);
  return {
    sourceId,
    family: family(d.name),
    hostId: h.id,
    hostName: h.name,
    donorId: d.id,
    donorName: d.name,
    hostCenter: hc,
    donorCenter: dc,
    centerDelta: hc.map((value, axis) => value - dc[axis]),
    hostExtent: he,
    donorExtent: de,
    extentRatio: he.map((value, axis) => de[axis] > 0 ? value / de[axis] : null),
  };
});
const fitPoints = matches.map(item => ({
  donorCenter: item.donorCenter,
  hostCenter: item.hostCenter,
}));
const fits = ["x", "y", "z"].map((axis, index) => ({
  axis,
  ...linearFit(fitPoints, index),
}));
const familyCounts = matches.reduce((counts, item) => {
  counts[item.family] = (counts[item.family] ?? 0) + 1;
  return counts;
}, {});
const targetFamilies = ["clavicle", "scapula", "humerus", "radius", "ulna"];
const upperLimb = matches.filter(item => targetFamilies.includes(item.family));
const upperLimbFamilies = upperLimb.reduce((counts, item) => {
  counts[item.family] = (counts[item.family] ?? 0) + 1;
  return counts;
}, {});
const missingHostSourceIds = host.parts
  .filter(part => part.system === "borrowed" && part.conceptId?.startsWith("BORROWED:FJ"))
  .filter(part => !donorById.has(`BP3D_${part.conceptId.slice("BORROWED:".length)}`))
  .map(part => ({hostId: part.id, hostName: part.name, conceptId: part.conceptId}));
const unmatchedDonorUpperLimb = donor.parts
  .filter(part => part.system === "skeletal" && targetFamilies.includes(family(part.name)))
  .filter(part => !host.parts.some(candidate => candidate.system === "borrowed" && candidate.conceptId === `BORROWED:${part.id.replace(/^BP3D_/, "")}`))
  .map(part => ({donorId: part.id, donorName: part.name}));

const report = {
  hostRevision: HOST_REVISION,
  donorRevision: DONOR_REVISION,
  hostVersion: host.version,
  donorVersion: donor.version,
  hostPartCount: host.parts.length,
  hostBorrowedBoneParts: host.parts.filter(part => part.system === "borrowed").length,
  donorSkeletalParts: donor.parts.filter(part => part.system === "skeletal").length,
  sourceIdMatchedLandmarks: matches.length,
  matchedLandmarksByFamily: familyCounts,
  upperLimbLandmarkCount: upperLimb.length,
  upperLimbLandmarksByFamily: upperLimbFamilies,
  axisAlignedCenterFit: fits,
  matches,
  missingHostSourceIds,
  unmatchedDonorUpperLimb,
  interpretation: [
    "A source-ID match establishes provenance correspondence, not geometric identity.",
    "Bounding-box center fits are diagnostic only; they do not prove vertex-level registration.",
    "Per-bone scaling, rotation, or repositioning can invalidate a single global transform even when center-fit residuals look small.",
    "A negative axis scale indicates a reflected coordinate direction and must be reviewed before any transform is proposed.",
    "Upper-limb bone coverage must be checked separately for clavicle, scapula, humerus, radius, and ulna.",
    "No mesh transform, snapping, deformation, retargeting, manifest edit, viewer change, Wix integration, or production deployment is performed."
  ],
  productionChanged: false
};
console.log(JSON.stringify(report, null, 2));
