/**
 * Read-only inventory of donor muscle subparts for female-atlas integration.
 * Lists every manifest part matching each target instead of selecting the first match.
 * No geometry, manifest, viewer code, or deployed asset is changed.
 */
const REVISION = "b0a20fa3a009ca5f6bfa07b7479312e04c862af2";
const DONOR_MANIFEST =
  `https://raw.githubusercontent.com/HiMahendraBeniwal/female-atlas/${REVISION}/public/models/atlas.json`;
const TARGETS = [
  { label: "Pectoralis major", pattern: /pectoralis major/i },
  { label: "Pectoralis minor", pattern: /pectoralis minor/i },
  { label: "Subclavius", pattern: /subclavius/i },
  { label: "Serratus anterior", pattern: /serratus anterior/i },
  { label: "Deltoid", pattern: /deltoid/i },
  { label: "Trapezius", pattern: /trapezius/i },
  { label: "Biceps brachii", pattern: /biceps brachii/i },
  { label: "Triceps brachii", pattern: /triceps brachii/i },
  // Match the standalone muscle name; do not absorb coracobrachialis.
  { label: "Brachialis", pattern: /(?:^|\\s)brachialis$/i },
  { label: "Pronator teres", pattern: /pronator teres/i },
  { label: "Flexor carpi ulnaris", pattern: /flexor carpi ulnaris/i },
  { label: "Extensor carpi ulnaris", pattern: /extensor carpi ulnaris/i },
];

const response = await fetch(DONOR_MANIFEST);
if (!response.ok) throw new Error(`Donor manifest HTTP ${response.status}`);
const manifest = await response.json();
if (!Array.isArray(manifest.parts)) throw new Error("Donor manifest parts[] missing.");

const muscular = manifest.parts.filter(part => part.system === "muscular");
const results = TARGETS.map(target => {
  const matches = muscular.filter(part => target.pattern.test(part.name));
  return {
    target: target.label,
    matchCount: matches.length,
    distinctChunks: [...new Set(matches.map(part => part.chunk))].sort((a,b) => a-b),
    parts: matches.map(part => ({
      id: part.id,
      name: part.name,
      vertexCount: part.vertexCount,
      triangleCount: part.triangleCount ?? null,
      chunk: part.chunk,
      bounds: part.bounds ?? null,
    })),
    status: matches.length === 0 ? "missing"
      : matches.length === 1 ? "single-manifest-part"
      : "multiple-subparts-review-required",
  };
});

const report = {
  donorRevision: REVISION,
  muscularManifestParts: muscular.length,
  targetCount: TARGETS.length,
  foundTargets: results.filter(result => result.matchCount > 0).length,
  targetsWithMultipleParts: results.filter(result => result.matchCount > 1).length,
  missingTargets: results.filter(result => result.matchCount === 0).map(result => result.target),
  results,
  limitations: [
    "Manifest part count does not prove anatomical completeness or correct laterality.",
    "Multiple named parts may be subdivisions, bilateral structures, or separate regions; they require anatomical review.",
    "This inventory does not transform, register, combine, or import any mesh.",
    "No host geometry, manifest, viewer code, Wix integration, or production deployment is changed."
  ],
  productionChanged: false
};
console.log(JSON.stringify(report, null, 2));
