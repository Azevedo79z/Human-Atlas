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
        for (const [index, candidate] of part.candidates.entries()) {
          if (site.bonePatterns.some((pattern) => matchesPattern(candidate.boneName, pattern))) {
            matched.push({
              musclePart: part.muscleName,
              candidateRank: index + 1,
              candidateBone: candidate.boneName,
              medianMuscleToBoneDistance: candidate.muscleToBone.median,
            });
          }
        }
      }
      attachments.push({
        role,
        expectedSite: site.site,
        bonePatterns: site.bonePatterns,
        status: matched.length ? "candidate_found_in_shortlist" : "not_found_in_top_12_inconclusive",
        matchedCandidates: matched,
      });
    }
  }
  return {
    target: muscle.target,
    donorPartsFound: parts.length,
    attachments,
  };
});
const all = results.flatMap((item) => item.attachments);
const summary = {
  reportDonorRevision: report.donorRevision,
  reportTargetParts: report.targetMuscleParts,
  referenceMuscles: reference.muscles.length,
  attachmentsChecked: all.length,
  attachmentsWithCandidateInShortlist: all.filter((x) => x.status === "candidate_found_in_shortlist").length,
  attachmentsNotFoundInTop8Inconclusive: all.filter((x) => x.status === "not_found_in_top_12_inconclusive").length,
  interpretation: "Shortlist presence is a geometric clue only; absence is inconclusive. Neither result validates anatomical attachment or permits automatic mesh snapping.",
};
console.log(JSON.stringify({ summary, results }, null, 2));
