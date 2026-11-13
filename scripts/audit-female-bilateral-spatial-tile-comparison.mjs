const input = await new Response(Deno.stdin.readable).text();
const source = JSON.parse(input);
const sides = new Map(source.results.map((entry) => [entry.side + "|" + entry.group, entry]));
const comparisons = [];
const gridSize = 4;
const totalTiles = gridSize * gridSize;
const getShareVector = (patch) => {
  const descriptor = patch.spatialTilesDescriptor;
  const vector = Array(totalTiles).fill(0);
  for (const tile of descriptor.tiles) {
    const [u, v] = tile.tile;
    vector[v * gridSize + u] = tile.areaShare;
  }
  return { vector, axes: descriptor.inPlaneAxes, triangleCount: descriptor.triangleCount };
};
const cosine = (a, b) => {
  const dot = a.reduce((sum, value, i) => sum + value * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
  const normB = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0));
  return normA && normB ? dot / (normA * normB) : null;
};
const jsDivergence = (a, b) => {
  const midpoint = a.map((value, i) => (value + b[i]) / 2);
  const kl = (p, q) => p.reduce((sum, value, i) => value > 0 ? sum + value * Math.log2(value / Math.max(q[i], 1e-15)) : sum, 0);
  return (kl(a, midpoint) + kl(b, midpoint)) / 2;
};
for (const left of source.results.filter((entry) => entry.side.toLowerCase() === "left")) {
  const right = sides.get("Right|" + left.group);
  if (!right) continue;
  for (const sourceName of ["donor", "host"]) {
    for (const patchName of ["patchA", "patchB"]) {
      const leftPatch = left[sourceName][patchName];
      const rightPatch = right[sourceName][patchName];
      const L = getShareVector(leftPatch);
      const R = getShareVector(rightPatch);
      const compatibleAxes = JSON.stringify(L.axes) === JSON.stringify(R.axes);
      const xIsFirstAxis = L.axes?.[0] === "x" && R.axes?.[0] === "x";
      const mirroredRight = Array(totalTiles).fill(0);
      for (let v = 0; v < gridSize; v++) {
        for (let u = 0; u < gridSize; u++) {
          const sourceU = xIsFirstAxis ? gridSize - 1 - u : u;
          mirroredRight[v * gridSize + u] = R.vector[v * gridSize + sourceU];
        }
      }
      const absDiff = L.vector.map((value, i) => Math.abs(value - mirroredRight[i]));
      const perTile = absDiff.map((difference, i) => ({
        tile: [i % gridSize, Math.floor(i / gridSize)],
        leftAreaShare: L.vector[i],
        rightMirroredAreaShare: mirroredRight[i],
        absoluteDifference: difference,
      }));
      comparisons.push({
        group: left.group,
        source: sourceName,
        patch: patchName,
        method: "normalized 4x4 area-share comparison; right-side u-axis reversed when first in-plane axis is X",
        leftTriangleCount: L.triangleCount,
        rightTriangleCount: R.triangleCount,
        inPlaneAxes: L.axes,
        axesCompatible: compatibleAxes,
        xMirrorApplied: xIsFirstAxis,
        cosineSimilarity: cosine(L.vector, mirroredRight),
        jensenShannonDivergenceBits: jsDivergence(L.vector, mirroredRight),
        meanAbsoluteTileShareDifference: absDiff.reduce((sum, value) => sum + value, 0) / totalTiles,
        maximumTileShareDifference: Math.max(...absDiff),
        largestDifferences: [...perTile].sort((a, b) => b.absoluteDifference - a.absoluteDifference).slice(0, 5),
        tiles: perTile,
        interpretationLimit: "Distribution similarity only. Each side is independently normalized to its own AABB crop; no rigid registration, anatomical landmark alignment, surface correspondence, or clinical equivalence is established.",
      });
    }
  }
}
const output = {
  purpose: "Read-only bilateral comparison of normalized spatial tile area distributions",
  inputRevision: source.pinnedRevisions ?? null,
  gridSize,
  comparisonCount: comparisons.length,
  comparisons,
  limits: [
    "The left and right crops are independently normalized to their own in-plane bounds.",
    "Reversing the normalized u index is a simple X-mirror convention, not a fitted registration.",
    "Tile area shares discard exact point locations and surface topology.",
    "Similarity scores are screening descriptors, not anatomical equivalence or clinical measurements.",
  ],
};
console.log(JSON.stringify(output, null, 2));
