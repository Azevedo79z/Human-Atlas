const input = await new Response(Deno.stdin.readable).text();
const source = JSON.parse(input);
const GRID = 4;
const sides = new Map(source.results.map((entry) => [entry.side + "|" + entry.group, entry]));
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const normalize = (v) => {
  const length = Math.sqrt(dot(v, v));
  return length > 1e-12 ? v.map(value => value / length) : null;
};
const clamp = value => Math.max(-1, Math.min(1, value));
const quantile = (values, fraction) => {
  const sorted = [...values].sort((a,b)=>a-b);
  return sorted.length ? sorted[Math.floor((sorted.length - 1) * fraction)] : null;
};
const comparisons = [];
for (const left of source.results.filter(item => item.side === "Left")) {
  const right = sides.get("Right|" + left.group);
  if (!right) continue;
  for (const model of ["donor", "host"]) for (const patchName of ["patchA", "patchB"]) {
    const L = left[model][patchName].spatialTilesDescriptor;
    const R = right[model][patchName].spatialTilesDescriptor;
    const compatibleAxes = JSON.stringify(L.inPlaneAxes) === JSON.stringify(R.inPlaneAxes);
    const mirrorU = compatibleAxes && L.inPlaneAxes[0] === "x";
    const rightTiles = new Map(R.tiles.map(tile => [tile.tile[1] * GRID + tile.tile[0], tile]));
    const tileResults = [];
    for (const tile of L.tiles) {
      const [u,v] = tile.tile;
      const mirroredU = mirrorU ? GRID - 1 - u : u;
      const match = rightTiles.get(v * GRID + mirroredU);
      if (!match) continue;
      const leftNormal = normalize(tile.areaWeightedMeanNormal);
      let rightNormal = normalize(match.areaWeightedMeanNormal);
      if (rightNormal && mirrorU) rightNormal = [-rightNormal[0], rightNormal[1], rightNormal[2]];
      if (!leftNormal || !rightNormal) continue;
      const rawDot = clamp(dot(leftNormal, rightNormal));
      const unorientedDot = Math.abs(rawDot);
      const angle = Math.acos(unorientedDot) * 180 / Math.PI;
      tileResults.push({
        leftTile: [u,v],
        rightTile: [mirroredU,v],
        leftAreaShare: tile.areaShare,
        rightAreaShare: match.areaShare,
        leftMeanNormal: leftNormal,
        mirroredRightMeanNormal: rightNormal,
        signedDotAfterMirror: rawDot,
        unorientedAngularDifferenceDegrees: angle,
        areaWeight: (tile.areaShare + match.areaShare) / 2,
      });
    }
    const angles = tileResults.map(item => item.unorientedAngularDifferenceDegrees);
    const weighted = tileResults.reduce((sum,item)=>sum+item.unorientedAngularDifferenceDegrees*item.areaWeight,0);
    const totalWeight = tileResults.reduce((sum,item)=>sum+item.areaWeight,0);
    comparisons.push({
      group: left.group,
      model,
      patch: patchName,
      method: "compare area-weighted tile mean normals after reversing right-side normalized u bins when the first in-plane axis is X; reflect right normal X component; use absolute dot to avoid triangle-winding sign dependence",
      inPlaneAxesLeft: L.inPlaneAxes,
      inPlaneAxesRight: R.inPlaneAxes,
      axesCompatible: compatibleAxes,
      xMirrorApplied: mirrorU,
      comparedTileCount: tileResults.length,
      meanAngularDifferenceDegrees: angles.length ? angles.reduce((a,b)=>a+b,0)/angles.length : null,
      areaWeightedMeanAngularDifferenceDegrees: totalWeight ? weighted/totalWeight : null,
      medianAngularDifferenceDegrees: quantile(angles,.5),
      p90AngularDifferenceDegrees: quantile(angles,.9),
      maximumAngularDifferenceDegrees: angles.length ? Math.max(...angles) : null,
      tileComparisons: tileResults.sort((a,b)=>b.unorientedAngularDifferenceDegrees-a.unorientedAngularDifferenceDegrees),
      interpretationLimit: "Orientation comparison of sampled, area-weighted mean normals in independently normalized AABB tiles. No registration or surface correspondence; tiles can represent different physical regions. Absolute-dot angle is insensitive to normal sign but also hides orientation reversal."
    });
  }
}
console.log(JSON.stringify({
  purpose: "Read-only bilateral comparison of spatial-tile mean surface-normal orientation",
  pinnedRevisions: source.pinnedRevisions ?? null,
  comparisonCount: comparisons.length,
  comparisons,
  limits: [
    "AABB endpoint crops are geometric and not anatomically segmented.",
    "Left/right tile correspondence is a simple normalized-bin mirror, not fitted registration.",
    "Normals are averaged within each tile and may conceal local variation or mixed surface orientations.",
    "Absolute-dot angular differences intentionally ignore normal sign and therefore cannot establish consistent outward orientation.",
    "Results are screening descriptors, not anatomical labels, cartilage assessment, or clinical measurements."
  ]
}, null, 2));
