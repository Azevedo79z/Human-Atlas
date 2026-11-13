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
const mirrorTile = (tile, axes, gridSize) => {
  const mirrored = [...tile];
  const xIndex = axes.indexOf("x");
  if (xIndex !== -1) mirrored[xIndex] = gridSize - 1 - mirrored[xIndex];
  return mirrored;
};
const selfTests = [
  { tile: [0, 2], axes: ["x", "y"], expected: [3, 2] },
  { tile: [0, 2], axes: ["y", "x"], expected: [0, 1] },
  { tile: [0, 2], axes: ["y", "z"], expected: [0, 2] },
];
for (const test of selfTests) {
  const actual = mirrorTile(test.tile, test.axes, GRID);
  if (JSON.stringify(actual) !== JSON.stringify(test.expected)) {
    throw new Error("Axis mirror self-test failed: " + JSON.stringify({ test, actual }));
  }
}

function describeSampledWinding(patch) {
  const triangles = patch.visualPatch?.triangles ?? [];
  const edgeMap = new Map();
  let validTriangleCount = 0;
  let degenerateTriangleCount = 0;
  const normalFor = tri => {
    const a = tri[0], b = tri[1], c = tri[2];
    const u = b.map((value, i) => value - a[i]);
    const v = c.map((value, i) => value - a[i]);
    const n = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ];
    const length = Math.sqrt(dot(n, n));
    return length > 1e-12 ? n.map(value => value / length) : null;
  };
  const pointKey = point => point.map(value => Number(value).toPrecision(12)).join(",");
  for (let triangleIndex = 0; triangleIndex < triangles.length; triangleIndex++) {
    const tri = triangles[triangleIndex];
    const normal = normalFor(tri);
    if (!normal) {
      degenerateTriangleCount++;
      continue;
    }
    validTriangleCount++;
    for (let side = 0; side < 3; side++) {
      const from = pointKey(tri[side]);
      const to = pointKey(tri[(side + 1) % 3]);
      const undirected = from < to ? from + "|" + to : to + "|" + from;
      if (!edgeMap.has(undirected)) edgeMap.set(undirected, []);
      edgeMap.get(undirected).push({ triangleIndex, from, to, normal });
    }
  }
  let boundaryEdgeCount = 0;
  let pairedEdgeCount = 0;
  let consistentlyWoundPairedEdges = 0;
  let sameDirectionPairedEdges = 0;
  let nonManifoldSampledEdgeCount = 0;
  const adjacentNormalDots = [];
  for (const incidents of edgeMap.values()) {
    if (incidents.length === 1) boundaryEdgeCount++;
    else if (incidents.length === 2) {
      pairedEdgeCount++;
      const [a, b] = incidents;
      if (a.from === b.to && a.to === b.from) consistentlyWoundPairedEdges++;
      else if (a.from === b.from && a.to === b.to) sameDirectionPairedEdges++;
      adjacentNormalDots.push(clamp(dot(a.normal, b.normal)));
    } else {
      nonManifoldSampledEdgeCount++;
    }
  }
  return {
    sampledTriangleCount: triangles.length,
    validTriangleCount,
    degenerateTriangleCount,
    uniqueSampledEdgeCount: edgeMap.size,
    boundaryEdgeCount,
    pairedEdgeCount,
    consistentlyWoundPairedEdges,
    sameDirectionPairedEdges,
    nonManifoldSampledEdgeCount,
    pairedEdgeWindingConsistency: pairedEdgeCount
      ? consistentlyWoundPairedEdges / pairedEdgeCount
      : null,
    adjacentNormalDot: {
      minimum: adjacentNormalDots.length ? Math.min(...adjacentNormalDots) : null,
      median: quantile(adjacentNormalDots, 0.5),
      negativePairCount: adjacentNormalDots.filter(value => value < 0).length,
      samples: adjacentNormalDots.length,
    },
    interpretationLimit: "Only the sampled triangles are tested. Sparse sampling can omit shared edges; crop boundaries create open edges. This is a local winding-consistency screen, not proof of globally outward normals or watertightness.",
  };
}

function compareTileNormals(left, right, model, patchName) {
  const L = left[model][patchName].spatialTilesDescriptor;
  const R = right[model][patchName].spatialTilesDescriptor;
  const axesCompatible = JSON.stringify(L.inPlaneAxes) === JSON.stringify(R.inPlaneAxes);
  const gridSize = L.gridSize?.[0] ?? GRID;
  const rightTiles = new Map(R.tiles.map(tile => [tile.tile[1] * gridSize + tile.tile[0], tile]));
  const tileComparisons = [];
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
      const signedAngle = Math.acos(signedDot) * 180 / Math.PI;
      const areaWeight = (tile.areaShare + match.areaShare) / 2;
      tileComparisons.push({
        leftTile: tile.tile,
        rightTile: mirrored,
        signedDotAfterMirror: signedDot,
        signedAngularDifferenceDegrees: signedAngle,
        areaWeight,
      });
    }
  }
  const dots = tileComparisons.map(item => item.signedDotAfterMirror);
  const angles = tileComparisons.map(item => item.signedAngularDifferenceDegrees);
  const negative = tileComparisons.filter(item => item.signedDotAfterMirror < 0);
  const totalWeight = tileComparisons.reduce((sum, item) => sum + item.areaWeight, 0);
  const negativeWeight = negative.reduce((sum, item) => sum + item.areaWeight, 0);
  return {
    group: left.group,
    model,
    patch: patchName,
    axesCompatible,
    comparedTileCount: tileComparisons.length,
    negativeSignedDotTileCount: negative.length,
    negativeSignedDotAreaWeightShare: totalWeight ? negativeWeight / totalWeight : null,
    signedDot: {
      minimum: dots.length ? Math.min(...dots) : null,
      median: quantile(dots, 0.5),
      mean: dots.length ? dots.reduce((sum, value) => sum + value, 0) / dots.length : null,
    },
    signedAngularDifferenceDegrees: {
      mean: angles.length ? angles.reduce((sum, value) => sum + value, 0) / angles.length : null,
      p90: quantile(angles, 0.9),
      maximum: angles.length ? Math.max(...angles) : null,
    },
    tileComparisons,
    interpretationLimit: "Signed comparison of per-tile mean normals after the bilateral X reflection. A negative dot indicates opposing mean directions; positive values do not establish outward orientation, and averaging can hide face-level flips.",
  };
}

const bySide = new Map(source.results.map(item => [item.side + "|" + item.group, item]));
const comparisons = [];
const componentSummaries = [];
for (const left of source.results.filter(item => item.side === "Left")) {
  const right = bySide.get("Right|" + left.group);
  if (!right) continue;
  for (const model of ["donor", "host"]) {
    for (const patchName of ["patchA", "patchB"]) {
      const leftPatch = left[model][patchName];
      const rightPatch = right[model][patchName];
      comparisons.push(compareTileNormals(left, right, model, patchName));
      for (const [side, patch] of [["Left", leftPatch], ["Right", rightPatch]]) {
        const topology = patch.topologyDescriptor ?? {};
        componentSummaries.push({
          group: left.group,
          model,
          patch: patchName,
          side,
          croppedTriangleCount: topology.croppedTriangleCount ?? patch.patchCounts?.triangles ?? null,
          connectedComponentCount: topology.connectedComponentCount ?? null,
          largestComponentTriangleCount: topology.largestComponentTriangleCount ?? null,
          largestComponentShare: topology.largestComponentShare ?? null,
          componentTriangleCounts: topology.componentTriangleCounts ?? [],
          boundaryEdgeCount: topology.boundaryEdgeCount ?? null,
          twoFaceManifoldEdgeCount: topology.twoFaceManifoldEdgeCount ?? null,
          moreThanTwoFaceEdgeCount: topology.moreThanTwoFaceEdgeCount ?? null,
          sampledWinding: describeSampledWinding(patch),
          interpretationLimit: topology.interpretationLimit ?? "Component metrics unavailable in input descriptor.",
        });
      }
    }
  }
}

console.log(JSON.stringify({
  purpose: "Read-only signed-normal and mesh-connectivity audit for female bilateral knee and ankle endpoint patches",
  pinnedRevisions: source.pinnedRevisions ?? null,
  comparisonCount: comparisons.length,
  componentSummaryCount: componentSummaries.length,
  mirrorSelfTests: selfTests.length,
  comparisons,
  componentSummaries,
  limits: [
    "AABB endpoint crops are geometric and not anatomically segmented.",
    "Signed tile-normal comparisons use area-weighted means and can hide local face-level inversions.",
    "Sampled winding checks cover only the sampled triangles and do not prove globally outward normals.",
    "Boundary edges can be caused by crop boundaries; they are not proof of holes.",
    "Connected components describe mesh connectivity, not separate anatomical structures.",
    "Results are geometric screening descriptors, not anatomical labels or clinical measurements.",
  ],
}, null, 2));
