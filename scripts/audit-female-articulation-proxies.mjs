/**
 * Read-only articulation-proxy audit for matched female donor/host skeletal parts.
 * Compares distances between paired bounding-box centers. These are NOT joint
 * centers, articular surfaces, cartilage gaps, or clinical measurements.
 */
const HOST_REVISION = "c67dabc7189f90a17b7d3fe997d517913eb3474c";
const DONOR_REVISION = "b0a20fa3a009ca5f6bfa07b7479312e04c862af2";
const HOST_URL = "https://raw.githubusercontent.com/Azevedo79z/Human-Atlas/" + HOST_REVISION + "/public/models/atlas-female.json";
const DONOR_URL = "https://raw.githubusercontent.com/HiMahendraBeniwal/female-atlas/" + DONOR_REVISION + "/public/models/atlas.json";

async function manifest(url, label) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(label + " manifest HTTP " + response.status);
  const value = await response.json();
  if (!Array.isArray(value.parts)) throw new Error(label + " manifest has no parts[]");
  return value;
}
function center(bounds) {
  return bounds[0].map((value, axis) => (value + bounds[1][axis]) / 2);
}
function distance(a, b) {
  return Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]);
}
function side(name) {
  if (/\bleft\b/i.test(name)) return "left";
  if (/\bright\b/i.test(name)) return "right";
  return "midline";
}
function numberWord(value) {
  const map = { first:"1", second:"2", third:"3", fourth:"4", fifth:"5", sixth:"6", seventh:"7", eighth:"8", ninth:"9", tenth:"10", eleventh:"11", twelfth:"12" };
  return map[value] ?? value;
}

const [host, donor] = await Promise.all([
  manifest(HOST_URL, "Host female"),
  manifest(DONOR_URL, "Donor female"),
]);
const hostBySource = new Map(host.parts
  .filter(part => part.system === "borrowed" && part.conceptId?.startsWith("BORROWED:FJ"))
  .map(part => [part.conceptId.slice("BORROWED:".length), part]));
const donorBones = donor.parts.filter(part => part.system === "skeletal" && part.bounds);
const byName = new Map(donorBones.map(part => [part.name, part]));
const pairs = [];
const seen = new Set();

function addPair(group, sideName, nameA, nameB, rationale) {
  const a = byName.get(nameA);
  const b = byName.get(nameB);
  if (!a || !b) return;
  const key = [a.id, b.id].sort().join("|");
  if (seen.has(key)) return;
  const hostA = hostBySource.get(a.id.replace(/^BP3D_/, ""));
  const hostB = hostBySource.get(b.id.replace(/^BP3D_/, ""));
  if (!hostA?.bounds || !hostB?.bounds) return;
  seen.add(key);
  const donorDistance = distance(center(a.bounds), center(b.bounds));
  const hostDistance = distance(center(hostA.bounds), center(hostB.bounds));
  pairs.push({
    group, side: sideName, rationale,
    donor: { a: a.name, b: b.name, sourceIds: [a.id, b.id] },
    host: { a: hostA.name, b: hostB.name },
    donorCenterDistanceMm: donorDistance * 1000,
    hostCenterDistanceMm: hostDistance * 1000,
    absoluteDifferenceMm: Math.abs(hostDistance - donorDistance) * 1000,
    relativeDifferencePercent: donorDistance > 1e-9 ? ((hostDistance / donorDistance) - 1) * 100 : null,
  });
}

for (const sideName of ["left", "right"]) {
  const prefix = sideName === "left" ? "Left " : "Right ";
  const name = suffix => prefix + suffix;
  addPair("shoulder", sideName, name("clavicle"), name("scapula"), "clavicle-scapula proxy");
  addPair("shoulder", sideName, name("scapula"), name("humerus"), "scapula-humerus proxy");
  addPair("elbow", sideName, name("humerus"), name("radius"), "humerus-radius proxy");
  addPair("elbow", sideName, name("humerus"), name("ulna"), "humerus-ulna proxy");
  for (const carpal of ["scaphoid", "lunate", "triquetral", "pisiform"]) {
    addPair("wrist", sideName, name("radius"), name(carpal), "radius-" + carpal + " proxy");
    addPair("wrist", sideName, name("ulna"), name(carpal), "ulna-" + carpal + " proxy");
  }
  for (const carpal of ["capitate", "hamate", "trapezium", "trapezoid"]) {
    addPair("wrist", sideName, name("radius"), name(carpal), "radius-" + carpal + " proxy");
  }
  addPair("wrist-hand", sideName, name("first metacarpal bone"), "Proximal phalanx of " + sideName + " thumb", "first metacarpal-thumb proximal phalanx proxy");
  for (const [ordinal, digitName] of [["second","index finger"],["third","middle finger"],["fourth","ring finger"],["fifth","little finger"]]) {
    addPair("wrist-hand", sideName, name(ordinal + " metacarpal bone"), "Proximal phalanx of " + sideName + " " + digitName, "metacarpal-proximal phalanx proxy");
  }
  for (const digitName of ["index finger","middle finger","ring finger","little finger","thumb"]) {
    const proximal = "Proximal phalanx of " + sideName + " " + digitName;
    const middle = "Middle phalanx of " + sideName + " " + digitName;
    const distal = "Distal phalanx of " + sideName + " " + digitName;
    if (digitName !== "thumb") addPair("finger-joints", sideName, proximal, middle, "proximal-middle phalanx proxy");
    if (digitName !== "thumb") addPair("finger-joints", sideName, middle, distal, "middle-distal phalanx proxy");
    else addPair("finger-joints", sideName, proximal, distal, "thumb proximal-distal phalanx proxy");
  }
  addPair("ankle-foot", sideName, name("talus"), name("calcaneus"), "talus-calcaneus proxy");
  const navicular = "Navicular bone of " + sideName + " foot";
  addPair("ankle-foot", sideName, name("talus"), navicular, "talus-navicular proxy");
  addPair("ankle-foot", sideName, name("calcaneus"), name("cuboid bone"), "calcaneus-cuboid proxy");
  addPair("ankle-foot", sideName, navicular, name("medial cuneiform bone"), "navicular-medial cuneiform proxy");
  addPair("ankle-foot", sideName, name("navicular bone of " + sideName + " foot"), name("intermediate cuneiform bone"), "navicular-intermediate cuneiform proxy");
  addPair("ankle-foot", sideName, name("navicular bone of " + sideName + " foot"), name("lateral cuneiform bone"), "navicular-lateral cuneiform proxy");
  for (const [ordinal, toe] of [["first","big toe"],["second","second toe"],["third","third toe"],["fourth","fourth toe"],["fifth","little toe"]]) {
    addPair("midfoot", sideName, name(ordinal + " metatarsal bone"), name("proximal phalanx of " + sideName + " " + toe), "metatarsal-proximal toe phalanx proxy");
    const proximal = "Proximal phalanx of " + sideName + " " + toe;
    const middle = "Middle phalanx of " + sideName + " " + toe;
    const distal = "Distal phalanx of " + sideName + " " + toe;
    if (toe !== "big toe") addPair("toe-joints", sideName, proximal, middle, "proximal-middle toe phalanx proxy");
    if (toe !== "big toe") addPair("toe-joints", sideName, middle, distal, "middle-distal toe phalanx proxy");
    else addPair("toe-joints", sideName, proximal, distal, "big toe proximal-distal phalanx proxy");
  }
  for (let n = 1; n <= 12; n++) {
    const word = ["","first","second","third","fourth","fifth","sixth","seventh","eighth","ninth","tenth","eleventh","twelfth"][n];
    addPair("costal", sideName, name(word + " rib"), name(word + " costal cartilage"), "rib-costal cartilage proxy");
  }
}

const grouped = new Map();
for (const pair of pairs) {
  if (!grouped.has(pair.group)) grouped.set(pair.group, []);
  grouped.get(pair.group).push(pair.absoluteDifferenceMm);
}
const summary = [...grouped.entries()].map(([group, values]) => {
  const sorted = [...values].sort((a,b)=>a-b);
  return {
    group, pairCount: values.length,
    medianAbsoluteDifferenceMm: sorted[Math.floor((sorted.length-1)/2)],
    p90AbsoluteDifferenceMm: sorted[Math.floor((sorted.length-1)*0.9)],
    maxAbsoluteDifferenceMm: sorted.at(-1),
  };
}).sort((a,b)=>a.group.localeCompare(b.group));

const report = {
  hostRevision: HOST_REVISION,
  donorRevision: DONOR_REVISION,
  hostVersion: host.version,
  donorVersion: donor.version,
  matchedHostBorrowedSourceIds: hostBySource.size,
  donorSkeletalPartsWithBounds: donorBones.length,
  articulationPairsMeasured: pairs.length,
  method: "Euclidean distance between matched donor and host bounding-box centers for explicitly paired adjacent skeletal structures.",
  summary,
  pairs: pairs.sort((a,b)=>a.group.localeCompare(b.group)||a.side.localeCompare(b.side)||a.donor.a.localeCompare(b.donor.a)),
  interpretationLimits: [
    "Bounding-box centers are not anatomical joint centers, articular surface landmarks, or cartilage gap measurements.",
    "Center-to-center distance cannot establish congruence, contact, collision, range of motion, or biomechanical correctness.",
    "Pairs are only included when both structures are present and source-ID matched in both manifests.",
    "Some articulation groups are intentionally absent because the host manifest does not include the relevant adjacent bones.",
    "This audit does not apply PR #37 transforms and does not modify any geometry, manifest, viewer, production asset, or deployment.",
  ],
  productionChanged: false,
};
console.log(JSON.stringify(report, null, 2));
