/**
 * Read-only ECU triangle-surface correspondence audit.
 * Reflects sampled source triangle centroids across X and measures exact
 * point-to-triangle distance against every target triangle. Diagnostic only.
 */
const REVISION = "b0a20fa3a009ca5f6bfa07b7479312e04c862af2";
const RAW_BASE = `https://raw.githubusercontent.com/HiMahendraBeniwal/female-atlas/${REVISION}/public/`;
const TARGET_IDS = ["BP3D_FJ1472", "BP3D_FJ1472M", "BP3D_FJ1517", "BP3D_FJ1517M"];

const response = await fetch(RAW_BASE + "models/atlas.json");
if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
const atlas = await response.json();
const parts = TARGET_IDS.map(id => {
  const part = atlas.parts.find(item => item.id === id);
  if (!part) throw new Error(`Missing ECU part ${id}`);
  if (part.system !== "muscular" || !/extensor carpi ulnaris/i.test(part.name)) {
    throw new Error(`Unexpected target record ${id}`);
  }
  if (!part.vertexCount || !part.indexCount || part.indexCount % 3) {
    throw new Error(`Invalid geometry counts for ${id}`);
  }
  return part;
});
const conceptsById = new Map((atlas.concepts ?? []).map(concept => [concept.id, concept]));
const metadataChecks = parts.map(part => {
  const concept = conceptsById.get(part.conceptId);
  if (!part.conceptId || !concept) throw new Error(`Missing concept mapping for ${part.id}`);
  if (!Array.isArray(concept.elements) || concept.elements.length === 0) {
    throw new Error(`Concept ${part.conceptId} has no canonical element mapping`);
  }
  const canonicalRecords = concept.elements
    .map(elementId => atlas.parts.find(candidate => candidate.id === elementId))
    .filter(candidate => candidate?.conceptId === part.conceptId);
  if (canonicalRecords.length === 0) {
    throw new Error(`Concept ${part.conceptId} has no resolvable canonical part record`);
  }
  const sharedConceptRecords = atlas.parts
    .filter(candidate => candidate.conceptId === part.conceptId)
    .map(candidate => candidate.id);
  if (!Array.isArray(part.bounds) || part.bounds.length !== 2 ||
      part.bounds.some(axis => !Array.isArray(axis) || axis.length !== 3 || !axis.every(Number.isFinite))) {
    throw new Error(`Invalid bounds metadata for ${part.id}`);
  }
  for (const [field, alignment] of [["positions",4],["normals",2],["indices",4]]) {
    if (!Number.isInteger(part[field]) || part[field] < 0 || part[field] % alignment !== 0) {
      throw new Error(`Invalid ${field} offset for ${part.id}`);
    }
  }
  return {
    id: part.id,
    name: part.name,
    system: part.system,
    conceptId: part.conceptId,
    conceptName: concept.name ?? null,
    canonicalElementIds: concept.elements,
    directCanonicalElement: concept.elements.includes(part.id),
    canonicalRecords: canonicalRecords.map(candidate => candidate.id),
    recordsSharingConcept: sharedConceptRecords,
    chunk: part.chunk,
    offsets: { positions: part.positions, normals: part.normals, indices: part.indices },
    counts: { vertices: part.vertexCount, indices: part.indexCount, triangles: part.indexCount / 3 },
    bounds: part.bounds,
  };
});
const chunks = new Map();
for (const chunkId of [...new Set(parts.map(part => part.chunk))]) {
  const chunk = atlas.chunks[chunkId];
  if (!chunk) throw new Error(`Missing chunk metadata ${chunkId}`);
  const url = new URL(chunk.url.replace(/^\/+/, ""), RAW_BASE);
  const result = await fetch(url);
  if (!result.ok) throw new Error(`Chunk ${chunkId} HTTP ${result.status}`);
  const buffer = await result.arrayBuffer();
  if (buffer.byteLength !== chunk.bytes) throw new Error(`Chunk ${chunkId} byte length mismatch`);
  for (const part of parts.filter(item => item.chunk === chunkId)) {
    const ranges = [
      ["positions", part.positions, part.vertexCount * 12],
      ["normals", part.normals, part.vertexCount * 6],
      ["indices", part.indices, part.indexCount * 4],
    ];
    for (const [label, offset, length] of ranges) {
      if (offset + length > buffer.byteLength) {
        throw new Error(`${part.id}: ${label} range exceeds chunk ${chunkId}`);
      }
    }
  }
  chunks.set(chunkId, buffer);
}
function geometry(part) {
  const buffer = chunks.get(part.chunk);
  const positions = new Float32Array(buffer, part.positions, part.vertexCount * 3);
  const indices = new Uint32Array(buffer, part.indices, part.indexCount);
  const triangles = [];
  const centroids = [];
  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i], ib = indices[i + 1], ic = indices[i + 2];
    if (ia >= part.vertexCount || ib >= part.vertexCount || ic >= part.vertexCount) {
      throw new Error(`Invalid triangle index in ${part.id}`);
    }
    const a = [positions[ia*3], positions[ia*3+1], positions[ia*3+2]];
    const b = [positions[ib*3], positions[ib*3+1], positions[ib*3+2]];
    const c = [positions[ic*3], positions[ic*3+1], positions[ic*3+2]];
    if (![...a,...b,...c].every(Number.isFinite)) throw new Error(`Non-finite vertex in ${part.id}`);
    triangles.push([a,b,c]);
    centroids.push([(a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3,(a[2]+b[2]+c[2])/3]);
  }
  return { id: part.id, name: part.name, chunk: part.chunk, vertexCount: part.vertexCount,
    triangleCount: triangles.length, triangles, centroids };
}
// Closest-point squared distance from p to triangle abc (Ericson, Real-Time Collision Detection).
function pointTriangleDistanceSquared(p, a, b, c) {
  const sub = (u,v) => [u[0]-v[0],u[1]-v[1],u[2]-v[2]];
  const dot = (u,v) => u[0]*v[0]+u[1]*v[1]+u[2]*v[2];
  const ab=sub(b,a), ac=sub(c,a), ap=sub(p,a);
  const d1=dot(ab,ap), d2=dot(ac,ap);
  if (d1<=0 && d2<=0) return dot(ap,ap);
  const bp=sub(p,b), d3=dot(ab,bp), d4=dot(ac,bp);
  if (d3>=0 && d4<=d3) return dot(bp,bp);
  const vc=d1*d4-d3*d2;
  if (vc<=0 && d1>=0 && d3<=0) {
    const v=d1/(d1-d3), q=[a[0]+v*ab[0],a[1]+v*ab[1],a[2]+v*ab[2]];
    const diff=sub(p,q); return dot(diff,diff);
  }
  const cp=sub(p,c), d5=dot(ab,cp), d6=dot(ac,cp);
  if (d6>=0 && d5<=d6) return dot(cp,cp);
  const vb=d5*d2-d1*d6;
  if (vb<=0 && d2>=0 && d6<=0) {
    const w=d2/(d2-d6), q=[a[0]+w*ac[0],a[1]+w*ac[1],a[2]+w*ac[2]];
    const diff=sub(p,q); return dot(diff,diff);
  }
  const va=d3*d6-d5*d4;
  if (va<=0 && d4-d3>=0 && d5-d6>=0) {
    const w=(d4-d3)/((d4-d3)+(d5-d6)), q=[b[0]+w*(c[0]-b[0]),b[1]+w*(c[1]-b[1]),b[2]+w*(c[2]-b[2])];
    const diff=sub(p,q); return dot(diff,diff);
  }
  const denom=1/(va+vb+vc), v=vb*denom, w=vc*denom;
  const q=[a[0]+ab[0]*v+ac[0]*w,a[1]+ab[1]*v+ac[1]*w,a[2]+ab[2]*v+ac[2]*w];
  const diff=sub(p,q); return dot(diff,diff);
}
function directedDenseSurfaceSamples(source,target) {
  const samples = [...source.centroids];
  for (const [a,b,c] of source.triangles) {
    samples.push(a,b,c);
    samples.push(
      [(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2],
      [(b[0]+c[0])/2,(b[1]+c[1])/2,(b[2]+c[2])/2],
      [(c[0]+a[0])/2,(c[1]+a[1])/2,(c[2]+a[2])/2]
    );
  }
  const distances=samples.map(point => {
    const reflected=[-point[0],point[1],point[2]];
    let best=Infinity;
    for (const [a,b,c] of target.triangles) {
      best=Math.min(best,pointTriangleDistanceSquared(reflected,a,b,c));
    }
    return Math.sqrt(best);
  });
  return { samples:distances.length, min:quantile(distances,0), p50:quantile(distances,.5),
    p90:quantile(distances,.9), p95:quantile(distances,.95), max:quantile(distances,1),
    sampling:"Triangle centroids, all triangle vertices, and all three edge midpoints; vertices/edges may be repeated across adjacent triangles" };
}
function quantile(values,q) {
  const sorted=[...values].sort((a,b)=>a-b);
  return sorted[Math.floor((sorted.length-1)*q)];
}
function directedSurfaceSamples(source,target) {
  const distances=source.centroids.map(point => {
    const reflected=[-point[0],point[1],point[2]];
    let best=Infinity;
    for (const [a,b,c] of target.triangles) {
      best=Math.min(best,pointTriangleDistanceSquared(reflected,a,b,c));
    }
    return Math.sqrt(best);
  });
  return { samples:distances.length, min:quantile(distances,0), p50:quantile(distances,.5),
    p90:quantile(distances,.9), p95:quantile(distances,.95), max:quantile(distances,1) };
}
const meshes=new Map(parts.map(part=>[part.id,geometry(part)]));
const right=["BP3D_FJ1472","BP3D_FJ1517"];
const left=["BP3D_FJ1472M","BP3D_FJ1517M"];
const comparisons=[];
for (const rightId of right) for (const leftId of left) {
  const r=meshes.get(rightId), l=meshes.get(leftId);
  comparisons.push({
    right:{id:r.id,chunk:r.chunk,vertices:r.vertexCount,triangles:r.triangleCount},
    left:{id:l.id,chunk:l.chunk,vertices:l.vertexCount,triangles:l.triangleCount},
    sameChunk:r.chunk===l.chunk,
    reflectedRightToLeft:directedSurfaceSamples(r,l),
    reflectedLeftToRight:directedSurfaceSamples(l,r),
    denseRightToLeft:directedDenseSurfaceSamples(r,l),
    denseLeftToRight:directedDenseSurfaceSamples(l,r),
    method:"Centroid baseline plus dense samples (triangle vertices and edge midpoints) reflected across X; exact closest point against every target triangle"
  });
}
console.log(JSON.stringify({
  donorRevision:REVISION,
  target:"Extensor carpi ulnaris",
  coordinateSpace:"Original donor coordinates; X reflection only; no transforms applied",
  records:parts.map(p=>({id:p.id,name:p.name,chunk:p.chunk,vertexCount:p.vertexCount,triangleCount:p.indexCount/3})),
  sourceMetadata: {
    checks: metadataChecks,
    validation: [
      "Each target part resolves to a source concept and the concept maps back to the part ID.",
      "Position, normal, and index offsets are aligned and their byte ranges fit inside the declared chunk.",
      "Bounds are present as finite min/max XYZ triples."
    ]
  },
  comparisons,
  interpretation:[
    "Triangle-centroid to target-triangle distances are a denser surface-proximity diagnostic than vertex-to-vertex sampling, but remain a one-sided sampled approximation.",
    "Same-chunk pairings are hypotheses supported by geometry only; this does not prove anatomical identity or correct source labeling.",
    "No geometry, manifest, viewer, Wix integration, or production deployment is modified."
  ]
},null,2));
