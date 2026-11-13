const input = await new Response(Deno.stdin.readable).text();
const source = JSON.parse(input);
const GRID = 4;

const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const normalize = (v) => {
  const length = Math.sqrt(dot(v, v));
  return length > 1e-12 ? v.map(value => value / length) : null;
};
const clamp = value => Math.max(-1, Math.min(1, value));
const quantile = (values, fraction) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor((sorted.length - 1) * fraction)] : null;
};

function mirrorTile(tile, inPlaneAxes, gridSize) {
  const mirrored = [...tile];
  const xIndex = inPlaneAxes.indexOf("x");
  if (xIndex !== -1) mirrored[xIndex] = gridSize - 1 - mirrored[xIndex];
  return mirrored;
}

// Guard the coordinate-order cases that caused the original bug.
const mirrorCases = [
  { tile: [0, 2], axes: ["x", "y"], expected: [3, 2] },
  { tile: [0, 2], axes: ["y", "x"], expected: [0, 1] },
  { tile: [0, 2], axes: ["y", "z"], expected: [0, 2] },
];
for (const test of mirrorCases) {
  const actual = mirrorTile(test.tile, test.axes, GRID);
  if (JSON.stringify(actual) !== JSON.stringify(test.expected)) {
    throw new Error("Axis-aware tile mirror self-test failed: " + JSON.stringify({ test, actual }));
  }
}

function comparePair(left, right, model, patchName) {
  const L = left[model][patchName].spatialTilesDescriptor;
  const R = right[model][patchName].spatialTilesDescriptor;
  const axesCompatible = JSON.stringify(L.inPlaneAxes) === JSON.stringify(R.inPlaneAxes);
  const gridSize = L.gridSize?.[0] ?? GRID;
  const rightTiles = new Map(R.tiles.map(tile => [tile.tile[1] * gridSize + tile.tile[0], tile]));
  const tileResults = [];

  if (axesCompatible) {
    for (const tile of L.tiles) {
      const mirrored = mirrorTile(tile.tile, L.inPlaneAxes, gridSize);
      const match = rightTiles.get(mirrored[1] * gridSize + mirrored[0]);
      if (!match) continue;
      const leftNormal = normalize(tile.areaWeightedMeanNormal);
      let rightNormal = normalize(match.areaWeightedMeanNormal);
      if (!leftNormal || !rightNormal) continue;
      rightNormal = [-rightNormal[0], rightNormal[1], rightNormal[2]];
      const signedDot = clamp(dot(leftNormal, rightNormal));
      const angle = Math.acos(Math.abs(signedDot)) * 180 / Math.PI;
      const areaWeight = (tile.areaShare + match.areaShare) / 2;
      tileResults.push({
        leftTile: tile.tile,
        rightTile: mirrored,
        leftAreaShare: tile.areaShare,
        rightAreaShare: match.areaShare,
        leftMeanNormal: leftNormal,
        mirroredRightMeanNormal: rightNormal,
        signedDotAfterMirror: signedDot,
        unorientedAngularDifferenceDegrees: angle,
        areaWeight,
      });
    }
  }

  const angles = tileResults.map(item => item.unorientedAngularDifferenceDegrees);
  const totalWeight = tileResults.reduce((sum, item) => sum + item.areaWeight, 0);
  const weighted = tileResults.reduce((sum, item) => sum + item.unorientedAngularDifferenceDegrees * item.areaWeight, 0);
  return {
    group: left.group,
    model,
    patch: patchName,
    method: "mirror the normalized tile coordinate whose inPlaneAxes entry is x; reflect the right normal X component; compare unoriented mean-normal directions using absolute dot",
    inPlaneAxesLeft: L.inPlaneAxes,
    inPlaneAxesRight: R.inPlaneAxes,
    axesCompatible,
    mirroredTileAxisIndex: L.inPlaneAxes.indexOf("x"),
    comparedTileCount: tileResults.length,
    meanAngularDifferenceDegrees: angles.length ? angles.reduce((a, b) => a + b, 0) / angles.length : null,
    areaWeightedMeanAngularDifferenceDegrees: totalWeight ? weighted / totalWeight : null,
    medianAngularDifferenceDegrees: quantile(angles, 0.5),
    p90AngularDifferenceDegrees: quantile(angles, 0.9),
    maximumAngularDifferenceDegrees: angles.length ? Math.max(...angles) : null,
    tileComparisons: tileResults.sort((a, b) => b.unorientedAngularDifferenceDegrees - a.unorientedAngularDifferenceDegrees),
    interpretationLimit: "Normalized AABB tile correspondence only; no rigid registration or surface correspondence. Absolute-dot angles hide normal reversal.",
  };
}

const bySide = new Map(source.results.map(item => [item.side + "|" + item.group, item]));
const comparisons = [];
for (const left of source.results.filter(item => item.side === "Left")) {
  const right = bySide.get("Right|" + left.group);
  if (!right) continue;
  for (const model of ["donor", "host"]) {
    for (const patchName of ["patchA", "patchB"]) {
      comparisons.push(comparePair(left, right, model, patchName));
    }
  }
}

console.log(JSON.stringify({
  purpose: "Corrected read-only bilateral spatial-tile normal orientation audit",
  pinnedRevisions: source.pinnedRevisions ?? null,
  comparisonCount: comparisons.length,
  mirrorSelfTests: mirrorCases.length,
  correction: "Mirror the normalized tile coordinate corresponding to physical X, whether X is the first or second in-plane axis. If X is the crop axis, do not mirror either in-plane tile coordinate.",
  comparisons,
  limits: [
    "AABB endpoint crops are geometric and not anatomically segmented.",
    "Tile pairing is normalized-bin mirroring, not fitted registration or mesh correspondence.",
    "Per-tile mean normals can hide local variation.",
    "Absolute-dot angles ignore normal sign and cannot establish consistent outward orientation.",
    "Results are screening descriptors, not anatomical labels or clinical measurements.",
  ],
}, null, 2));
