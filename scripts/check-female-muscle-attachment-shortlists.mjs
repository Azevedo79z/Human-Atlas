/**
 * Read-only comparison of geometric candidate shortlists against a sourced
 * anatomical origin/insertion reference matrix. This never modifies geometry.
 */
const [reportPath = "female-muscle-triangle-surface-distance.json"] = Deno.args;
const referencePath = "data/anatomy/female-upper-limb-attachment-reference.v1.json";
const report = JSON.parse(await Deno.readTextFile(reportPath));
const reference = JSON.parse(await Deno.readTextFile(referencePath));

function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function matchesPattern(candidateName, pattern) {
  return normalize(candidateName).includes(normalize(pattern));
}
const results = reference.muscles.map((muscle) => {
  const parts = report.results.filter((item) => item.target === muscle.target);
  const attachments = [];
  for (const role of ["origin", "insertion"]) {
    for (const site of muscle[role]) {
      const matched = [];
      for (const part of parts) {
        for (const candidate of part.candidates) {
          if (site.bonePatterns.some((pattern) => matchesPattern(candidate.boneName, pattern))) {
            matched.push({
              musclePart: part.muscleName,
              geometricShortlistRank: candidate.geometricRank,
              candidateSource: candidate.candidateSource,
              candidateBone: candidate.boneName,
              medianMuscleToBoneDistance: candidate.muscleToBone.median,
              p10MuscleToBoneDistance: candidate.muscleToBone.p10,
            });
          }
        }
      }
      const inShortlist = matched.some((item) => item.candidateSource.includes("geometric_shortlist"));
      const probed = matched.some((item) => item.candidateSource.includes("anatomical_reference_probe"));
      attachments.push({
        role,
        expectedSite: site.site,
        bonePatterns: site.bonePatterns,
        status: inShortlist
          ? "candidate_in_geometric_shortlist"
          : probed
            ? "expected_bone_probed_outside_geometric_shortlist"
            : "no_matching_named_bone_mesh_in_manifest",
        matchedCandidates: matched,
      });
    }
  }
  return { target: muscle.target, donorPartsFound: parts.length, attachments };
});
const all = results.flatMap((item) => item.attachments);
const summary = {
  reportDonorRevision: report.donorRevision,
  reportTargetParts: report.targetMuscleParts,
  referenceMuscles: reference.muscles.length,
  attachmentsChecked: all.length,
  candidatesInGeometricShortlist: all.filter((x) => x.status === "candidate_in_geometric_shortlist").length,
  expectedBonesProbedOutsideShortlist: all.filter((x) => x.status === "expected_bone_probed_outside_geometric_shortlist").length,
  noMatchingNamedBoneMesh: all.filter((x) => x.status === "no_matching_named_bone_mesh_in_manifest").length,
  interpretation: "Geometric shortlist membership and targeted expected-bone probes are proximity observations only. They do not validate anatomical attachment; absent named meshes are inconclusive.",
};
console.log(JSON.stringify({ summary, results }, null, 2));
