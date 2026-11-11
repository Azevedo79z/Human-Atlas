/**
 * Read-only bilateral muscle geometry audit.
 * Compares named left/right donor parts under each possible single-axis reflection.
 * This is a symmetry diagnostic, not anatomical validation or registration.
 */
const REVISION = "b0a20fa3a009ca5f6bfa07b7479312e04c862af2";
const RAW_BASE = `https://raw.githubusercontent.com/HiMahendraBeniwal/female-atlas/${REVISION}/public/`;
const TARGETS = [
  ["Pectoralis major", /pectoralis major/i], ["Pectoralis minor", /pectoralis minor/i],
  ["Subclavius", /subclavius/i], ["Serratus anterior", /serratus anterior/i],
  ["Deltoid", /deltoid/i], ["Trapezius", /trapezius/i],
  ["Biceps brachii", /biceps brachii/i], ["Triceps brachii", /triceps brachii/i],
  ["Brachialis", / brachialis$/i], ["Pronator teres", /pronator teres/i],
  ["Flexor carpi ulnaris", /flexor carpi ulnaris/i],
  ["Extensor carpi ulnaris", /extensor carpi ulnaris/i],
];
const SAMPLE_LIMIT = 240;
const manifestResponse = await fetch(RAW_BASE + "models/atlas.json");
if (!manifestResponse.ok) throw new Error(`Manifest HTTP ${manifestResponse.status}`);
const atlas = await manifestResponse.json();
const selected = TARGETS.flatMap(([target, pattern]) =>
  atlas.parts.filter(part => part.system === "muscular" && pattern.test(part.name))
    .map(part => ({ target, part }))
);
if (!selected.length) throw new Error("No target muscle parts found.");

function sideOf(name) {
  if (/\bleft\b/i.test(name)) return "left";
  if (/\bright\b/i.test(name)) return "right";
  return "unspecified";
}
function baseName(name) {
  return name.replace(/\b(left|right)\b/ig, "").replace(/\s+/g, " ").trim().toLowerCase();
}
function sampleGeometry(buffer, part) {
  if (!part.vertexCount || !part.indexCount || part.indexCount % 3) {
    throw new Error(`Invalid geometry counts: ${part.id}`);
  }
  const positions = new Float32Array(buffer, part.positions, part.vertexCount * 3);
  const indices = new Uint32Array(buffer, part.indices, part.indexCount);
  for (const index of indices) if (index >= part.vertexCount) throw new Error(`Invalid index in ${part.id}`);
  const count = Math.min(SAMPLE_LIMIT, part.vertexCount);
  const points = [];
  for (let i = 0; i < count; i++) {
    const offset = Math.floor(i * part.vertexCount / count) * 3;
    const point = [positions[offset], positions[offset + 1], positions[offset + 2]];
    if (!point.every(Number.isFinite)) throw new Error(`Non-finite vertex in ${part.id}`);
    points.push(point);
  }
  const bounds = [[Infinity, Infinity, Infinity], [-Infinity, -Infinity, -Infinity]];
  const centroid = [0, 0, 0];
  for (let i = 0; i < part.vertexCount; i++) {
    const p = [positions[i*3], positions[i*3+1], positions[i*3+2]];
    for (let axis=0; axis<3; axis++) {
      bounds[0][axis] = Math.min(bounds[0][axis], p[axis]);
      bounds[1][axis] = Math.max(bounds[1][axis], p[axis]);
      centroid[axis] += p[axis] / part.vertexCount;
    }
  }
  return { points, bounds, centroid, vertexCount: part.vertexCount, triangleCount: part.indexCount / 3 };
}
function quantile(values, q) {
  const sorted = [...values].sort((a,b)=>a-b);
  return sorted[Math.floor((sorted.length - 1) * q)];
}
function reflectedPointDistance(source, target, axis) {
  const distances = source.map(p => {
    const reflected = [...p];
    reflected[axis] *= -1;
    let best = Infinity;
    for (const q of target) {
      const dx=reflected[0]-q[0], dy=reflected[1]-q[1], dz=reflected[2]-q[2];
      best=Math.min(best, Math.sqrt(dx*dx+dy*dy+dz*dz));
    }
    return best;
  });
  return { min: quantile(distances,0), p10: quantile(distances,.1), median: quantile(distances,.5), p90: quantile(distances,.9), sampledVertices: distances.length };
}
function mirroredBoundsError(a,b,axis) {
  const reflectedMin=[...a.bounds[0]], reflectedMax=[...a.bounds[1]];
  reflectedMin[axis] = -a.bounds[1][axis];
  reflectedMax[axis] = -a.bounds[0][axis];
  return Math.sqrt(reflectedMin.reduce((sum,v,i)=>sum+(v-b.bounds[0][i])**2,0)
    + reflectedMax.reduce((sum,v,i)=>sum+(v-b.bounds[1][i])**2,0));
}
const chunkIds=[...new Set(selected.map(x=>x.part.chunk))].sort((a,b)=>a-b);
const buffers=new Map();
for (const id of chunkIds) {
  const chunk=atlas.chunks[id];
  if (!chunk) throw new Error(`Missing donor chunk ${id}`);
  const url=new URL(chunk.url.replace(/^\/+/, ""),RAW_BASE);
  const response=await fetch(url);
  if (!response.ok) throw new Error(`Chunk ${id} HTTP ${response.status}`);
  const buffer=await response.arrayBuffer();
  if (buffer.byteLength !== chunk.bytes) throw new Error(`Chunk ${id} byte-length mismatch`);
  buffers.set(id,buffer);
}
const geometries=new Map();
for (const {part} of selected) geometries.set(part.id,sampleGeometry(buffers.get(part.chunk),part));
const groups=new Map();
for (const item of selected) {
  const side=sideOf(item.part.name);
  const key=`${item.target}::${baseName(item.part.name)}`;
  if (!groups.has(key)) groups.set(key,{target:item.target,baseName:baseName(item.part.name),left:[],right:[],unspecified:[]});
  groups.get(key)[side === "left" ? "left" : side === "right" ? "right" : "unspecified"].push(item.part);
}
const bilateral=[];
for (const group of groups.values()) {
  if (!group.left.length || !group.right.length) continue;
  for (const left of group.left) for (const right of group.right) {
    const a=geometries.get(left.id), b=geometries.get(right.id);
    const axes=[0,1,2].map(axis=>({
      axis:["x","y","z"][axis],
      reflectedBoundsError:mirroredBoundsError(a,b,axis),
      leftToRight:reflectedPointDistance(a.points,b.points,axis),
      rightToLeft:reflectedPointDistance(b.points,a.points,axis),
    })).sort((x,y)=>x.leftToRight.median+x.rightToLeft.median-y.leftToRight.median-y.rightToLeft.median);
    bilateral.push({
      target:group.target,left:{id:left.id,name:left.name,vertices:a.vertexCount,triangles:a.triangleCount,bounds:a.bounds,centroid:a.centroid},
      right:{id:right.id,name:right.name,vertices:b.vertexCount,triangles:b.triangleCount,bounds:b.bounds,centroid:b.centroid},
      axisComparisons:axes,
      bestSingleAxisReflection:axes[0].axis,
      note:"Best of three coordinate-axis reflections is descriptive only; it does not establish anatomical laterality, registration, or a valid muscle match."
    });
  }
}
const repeatedNames=[...groups.values()].filter(g=>g.left.length+g.right.length+g.unspecified.length>1)
  .map(g=>({target:g.target,baseName:g.baseName,leftIds:g.left.map(p=>p.id),rightIds:g.right.map(p=>p.id),unspecifiedIds:g.unspecified.map(p=>p.id)}));
console.log(JSON.stringify({
  donorRevision:REVISION,coordinateSpace:"Original donor coordinates; no transforms applied",
  method:"Deterministic sampling of up to 240 vertices per part; compare left/right pairs after reflection across each candidate coordinate axis; report directed nearest-sampled-vertex distances and mirrored bounding-box residuals.",
  targetMuscleParts:selected.length,uniqueChunksDownloaded:chunkIds.length,
  bilateralPairs:bilateral.length,repeatedNameGroups:repeatedNames.length,
  bilateral,repeatedNames,
  limitations:[
    "A coordinate-axis reflection is a diagnostic hypothesis, not a known anatomical registration transform.",
    "Subsampled vertex-to-vertex distances are approximate and are not surface distance or collision tests.",
    "Similar geometry does not prove anatomical identity; different geometry does not prove distinct anatomical muscles.",
    "Names are used only to pair explicitly named left/right records; unnamed or ambiguous laterality remains unresolved.",
    "No geometry, manifest, viewer, Wix integration, or production deployment is modified."
  ]
},null,2));
