/**
 * Read-only paired bone mesh-surface distance screen.
 *
 * For selected adjacent skeletal structures, samples vertices on each mesh and
 * measures point-to-triangle distance against sampled triangles on the other
 * mesh, in both directions. It runs independently in donor and host coordinates.
 *
 * These whole-mesh distances are NOT articular cartilage gaps, joint clearance,
 * collision detection, or proof of anatomical articulation.
 */
const HOST_REVISION = "c67dabc7189f90a17b7d3fe997d517913eb3474c";
const DONOR_REVISION = "b0a20fa3a009ca5f6bfa07b7479312e04c862af2";
const HOST_BASE = `https://raw.githubusercontent.com/Azevedo79z/Human-Atlas/${HOST_REVISION}/public/`;
const DONOR_BASE = `https://raw.githubusercontent.com/HiMahendraBeniwal/female-atlas/${DONOR_REVISION}/public/`;
const SAMPLE_LIMIT = 180;
const SIDES = ["Left", "Right"];
const PAIR_TYPES = [
  ["shoulder-clavicle-scapula", "clavicle", "scapula"],
  ["shoulder-scapula-humerus", "scapula", "humerus"],
  ["elbow-humerus-radius", "humerus", "radius"],
  ["elbow-humerus-ulna", "humerus", "ulna"],
  ["wrist-radius-scaphoid", "radius", "scaphoid"],
  ["wrist-radius-lunate", "radius", "lunate"],
  ["knee-femur-patella", "femur", "patella"],
  ["knee-femur-tibia", "femur", "tibia"],
  ["ankle-tibia-talus", "tibia", "talus"],
  ["ankle-talus-calcaneus", "talus", "calcaneus"],
];

async function readManifest(base, label) {
  const response = await fetch(new URL("models/atlas.json", base));
  if (!response.ok) throw new Error(label + " manifest HTTP " + response.status);
  const data = await response.json();
  if (!Array.isArray(data.parts) || !Array.isArray(data.chunks)) {
    throw new Error(label + " manifest schema invalid");
  }
  return data;
}
async function readHostManifest() {
  const response = await fetch(new URL("models/atlas-female.json", HOST_BASE));
  if (!response.ok) throw new Error("Host manifest HTTP " + response.status);
  const data = await response.json();
  if (!Array.isArray(data.parts) || !Array.isArray(data.chunks)) {
    throw new Error("Host manifest schema invalid");
  }
  return data;
}
function normalized(value) { return value.trim().toLowerCase().replace(/\s+/g, " "); }

const chunkCache = new Map();
async function readChunk(atlas, base, index, label) {
  const key = label + ":" + index;
  if (chunkCache.has(key)) return chunkCache.get(key);
  const metadata = atlas.chunks[index];
  if (!metadata) throw new Error(label + ": missing chunk " + index);
  const path = metadata.url.replace(/^\/+/, "");
  const response = await fetch(new URL(path, base));
  if (!response.ok) throw new Error(label + ": chunk " + index + " HTTP " + response.status);
  const buffer = await response.arrayBuffer();
  if (metadata.bytes !== undefined && buffer.byteLength !== metadata.bytes) {
    throw new Error(label + ": chunk " + index + " byte length mismatch");
  }
  chunkCache.set(key, buffer);
  return buffer;
}
async function readGeometry(atlas, base, part, label) {
  const buffer = await readChunk(atlas, base, part.chunk, label);
  if (!part.vertexCount || !part.indexCount || part.indexCount % 3 !== 0) {
    throw new Error(label + ": invalid mesh counts for " + part.name);
  }
  const view = new DataView(buffer);
  const points = [];
  const pointNormals = [];
  const pointIndices = [];
  const pointCount = Math.min(SAMPLE_LIMIT, part.vertexCount);
  for (let i = 0; i < pointCount; i++) {
    const vertex = Math.floor(i * part.vertexCount / pointCount);
    const offset = part.positions + vertex * 12;
    const point = [0,1,2].map(axis => view.getFloat32(offset + axis * 4, true));
    if (!point.every(Number.isFinite)) throw new Error(label + ": non-finite vertex in " + part.name);
    points.push(point);
    pointIndices.push(vertex);
    const normalOffset = part.normals + vertex * 6;
    const normal = [0,1,2].map(axis => view.getInt16(normalOffset + axis * 2, true) / 32767);
    const normalLength = Math.hypot(...normal);
    pointNormals.push(normalLength > 0 ? normal.map(value => value / normalLength) : [0,0,0]);
  }
  const triangles = [];
  const triangleTotal = part.indexCount / 3;
  const triangleCount = Math.min(SAMPLE_LIMIT, triangleTotal);
  for (let i = 0; i < triangleCount; i++) {
    const triangle = Math.floor(i * triangleTotal / triangleCount);
    const tri = [];
    for (let corner = 0; corner < 3; corner++) {
      const indexOffset = part.indices + (triangle * 3 + corner) * 4;
      const vertexIndex = view.getUint32(indexOffset, true);
      if (vertexIndex >= part.vertexCount) throw new Error(label + ": invalid vertex index in " + part.name);
      const offset = part.positions + vertexIndex * 12;
      tri.push([0,1,2].map(axis => view.getFloat32(offset + axis * 4, true)));
    }
    const ab = sub(tri[1], tri[0]), ac = sub(tri[2], tri[0]);
    const faceNormal = [ab[1]*ac[2]-ab[2]*ac[1], ab[2]*ac[0]-ab[0]*ac[2], ab[0]*ac[1]-ab[1]*ac[0]];
    const faceLength = Math.hypot(...faceNormal);
    tri.faceNormal = faceLength > 0 ? faceNormal.map(value => value / faceLength) : [0,0,0];
    tri.triangleIndex = triangle;
    triangles.push(tri);
  }
  return { points, pointNormals, pointIndices, triangles, vertexCount: part.vertexCount, triangleCount: triangleTotal };
}
function sub(a,b) { return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]; }
function dot(a,b) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
function segmentDistance2(p,a,b) {
  const ab=sub(b,a), ap=sub(p,a), denom=dot(ab,ab);
  const t=denom>0?Math.max(0,Math.min(1,dot(ap,ab)/denom)):0;
  return dot(sub(p,[a[0]+t*ab[0],a[1]+t*ab[1],a[2]+t*ab[2]]),sub(p,[a[0]+t*ab[0],a[1]+t*ab[1],a[2]+t*ab[2]]));
}
function pointTriangleDistance2(p,a,b,c) {
  const ab=sub(b,a), ac=sub(c,a), ap=sub(p,a);
  const cross=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
  if (dot(cross,cross)<1e-24) return Math.min(segmentDistance2(p,a,b),segmentDistance2(p,b,c),segmentDistance2(p,c,a));
  const d1=dot(ab,ap), d2=dot(ac,ap);
  if(d1<=0&&d2<=0)return dot(ap,ap);
  const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);
  if(d3>=0&&d4<=d3)return dot(bp,bp);
  const vc=d1*d4-d3*d2;
  if(vc<=0&&d1>=0&&d3<=0){const v=d1/(d1-d3),q=[a[0]+v*ab[0],a[1]+v*ab[1],a[2]+v*ab[2]];return dot(sub(p,q),sub(p,q));}
  const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);
  if(d6>=0&&d5<=d6)return dot(cp,cp);
  const vb=d5*d2-d1*d6;
  if(vb<=0&&d2>=0&&d6<=0){const w=d2/(d2-d6),q=[a[0]+w*ac[0],a[1]+w*ac[1],a[2]+w*ac[2]];return dot(sub(p,q),sub(p,q));}
  const va=d3*d6-d5*d4;
  if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0){const w=(d4-d3)/((d4-d3)+(d5-d6)),q=[b[0]+w*(c[0]-b[0]),b[1]+w*(c[1]-b[1]),b[2]+w*(c[2]-b[2])];return dot(sub(p,q),sub(p,q));}
  const inv=1/(va+vb+vc),v=vb*inv,w=vc*inv;
  const q=[a[0]+ab[0]*v+ac[0]*w,a[1]+ab[1]*v+ac[1]*w,a[2]+ab[2]*v+ac[2]*w];
  return dot(sub(p,q),sub(p,q));
}

function closestPointOnTriangle(p,a,b,c) {
  const ab=sub(b,a), ac=sub(c,a), ap=sub(p,a);
  const d1=dot(ab,ap), d2=dot(ac,ap);
  if(d1<=0&&d2<=0)return a;
  const bp=sub(p,b), d3=dot(ab,bp), d4=dot(ac,bp);
  if(d3>=0&&d4<=d3)return b;
  const vc=d1*d4-d3*d2;
  if(vc<=0&&d1>=0&&d3<=0){const v=d1/(d1-d3);return [a[0]+v*ab[0],a[1]+v*ab[1],a[2]+v*ab[2]];}
  const cp=sub(p,c), d5=dot(ab,cp), d6=dot(ac,cp);
  if(d6>=0&&d5<=d6)return c;
  const vb=d5*d2-d1*d6;
  if(vb<=0&&d2>=0&&d6<=0){const w=d2/(d2-d6);return [a[0]+w*ac[0],a[1]+w*ac[1],a[2]+w*ac[2]];}
  const va=d3*d6-d5*d4;
  if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0){const w=(d4-d3)/((d4-d3)+(d5-d6));return [b[0]+w*(c[0]-b[0]),b[1]+w*(c[1]-b[1]),b[2]+w*(c[2]-b[2])];}
  const denom=1/(va+vb+vc), v=vb*denom, w=vc*denom;
  return [a[0]+ab[0]*v+ac[0]*w,a[1]+ab[1]*v+ac[1]*w,a[2]+ab[2]*v+ac[2]*w];
}
function nearestCandidates(points,triangles,pointNormals,pointIndices,limit=12) {
  const candidates=[];
  for(let pointIndex=0;pointIndex<points.length;pointIndex++){
    const point=points[pointIndex];
    let best=Infinity, closest=null, opposingNormal=null, opposingTriangle=null;
    for(const tri of triangles){
      const q=closestPointOnTriangle(point,tri[0],tri[1],tri[2]);
      const delta=sub(point,q), d2=dot(delta,delta);
      if(d2<best){best=d2;closest=q;opposingNormal=tri.faceNormal;opposingTriangle=tri.triangleIndex;}
    }
    const sourceNormal=pointNormals[pointIndex];
    const normalDot=dot(sourceNormal,opposingNormal);
    const clampedDot=Math.max(-1,Math.min(1,normalDot));
    candidates.push({
      sourceVertexIndex:pointIndices[pointIndex],
      opposingTriangleIndex:opposingTriangle,
      distanceMm:Math.sqrt(best)*1000,
      pointMm:point.map(v=>v*1000),
      opposingSurfacePointMm:closest.map(v=>v*1000),
      sourceVertexNormal:sourceNormal,
      opposingTriangleNormal:opposingNormal,
      normalDotProduct:normalDot,
      opposingNormalAngleDeg:Math.acos(-clampedDot)*180/Math.PI
    });
  }
  candidates.sort((a,b)=>a.distanceMm-b.distanceMm);
  return candidates.slice(0,limit);
}

function directed(points,triangles) {
  const values=points.map(point=>{
    let best=Infinity;
    for(const tri of triangles)best=Math.min(best,pointTriangleDistance2(point,tri[0],tri[1],tri[2]));
    return Math.sqrt(best);
  }).sort((a,b)=>a-b);
  const q=f=>values[Math.min(values.length-1,Math.floor((values.length-1)*f))];
  return {minMm:values[0]*1000,medianMm:q(.5)*1000,p90Mm:q(.9)*1000,maxMm:values.at(-1)*1000,sampledVertices:points.length,sampledTriangles:triangles.length};
}
function symmetricDistance(a,b) {
  return {
    aToB:directed(a.points,b.triangles),
    bToA:directed(b.points,a.triangles),
    nearestCandidatePairsAtoB:nearestCandidates(a.points,b.triangles,a.pointNormals,a.pointIndices),
    nearestCandidatePairsBtoA:nearestCandidates(b.points,a.triangles,b.pointNormals,b.pointIndices),
    sourceMesh:{vertices:a.vertexCount,triangles:a.triangleCount},
    targetMesh:{vertices:b.vertexCount,triangles:b.triangleCount},
  };
}
function summarize(d) {
  return {
    medianOfDirectionsMm:(d.aToB.medianMm+d.bToA.medianMm)/2,
    p90OfDirectionsMm:Math.max(d.aToB.p90Mm,d.bToA.p90Mm),
    minOfDirectionsMm:Math.min(d.aToB.minMm,d.bToA.minMm),
  };
}

const [host,donor]=await Promise.all([
  readHostManifest(),
  readManifest(DONOR_BASE,"Donor"),
]);
const donorBones=donor.parts.filter(part=>part.system==="skeletal"&&part.bounds);
const hostBySource=new Map(host.parts
  .filter(part=>part.system==="borrowed"&&part.conceptId?.startsWith("BORROWED:FJ"))
  .map(part=>[part.conceptId.slice("BORROWED:".length),part]));
const donorByName=new Map(donorBones.map(part=>[normalized(part.name),part]));
const pairDefinitions=[];
for(const side of SIDES)for(const [group,a,b] of PAIR_TYPES)pairDefinitions.push({side,group,aName:side+" "+a,bName:side+" "+b});
const resolved=[];
const skipped=[];
for(const definition of pairDefinitions){
  const a=donorByName.get(normalized(definition.aName));
  const b=donorByName.get(normalized(definition.bName));
  if(!a||!b){skipped.push({...definition,reason:"donor named pair missing"});continue;}
  const hostA=hostBySource.get(a.id.replace(/^BP3D_/,""));
  const hostB=hostBySource.get(b.id.replace(/^BP3D_/,""));
  if(!hostA||!hostB){skipped.push({...definition,reason:"one or both host source-ID matches missing"});continue;}
  if(!a.bounds||!b.bounds||!hostA.bounds||!hostB.bounds){skipped.push({...definition,reason:"bounds missing"});continue;}
  resolved.push({definition,donorA:a,donorB:b,hostA,hostB});
}
const results=[];
for(const row of resolved){
  const [da,db,ha,hb]=await Promise.all([
    readGeometry(donor,DONOR_BASE,row.donorA,"donor"),
    readGeometry(donor,DONOR_BASE,row.donorB,"donor"),
    readGeometry(host,HOST_BASE,row.hostA,"host"),
    readGeometry(host,HOST_BASE,row.hostB,"host"),
  ]);
  const donorDistance=symmetricDistance(da,db);
  const hostDistance=symmetricDistance(ha,hb);
  results.push({
    ...row.definition,
    donorParts:[{id:row.donorA.id,name:row.donorA.name},{id:row.donorB.id,name:row.donorB.name}],
    hostParts:[{id:row.hostA.id,name:row.hostA.name},{id:row.hostB.id,name:row.hostB.name}],
    donorWholeMeshSurfaceDistance:donorDistance,
    hostWholeMeshSurfaceDistance:hostDistance,
    comparison:{
      donor:summarize(donorDistance),
      host:summarize(hostDistance),
      differenceInDirectionalMedianMm:summarize(hostDistance).medianOfDirectionsMm-summarize(donorDistance).medianOfDirectionsMm,
    },
  });
}
const report={
  hostRevision:HOST_REVISION,donorRevision:DONOR_REVISION,
  hostVersion:host.version,donorVersion:donor.version,
  matchedBorrowedHostParts:hostBySource.size,
  sampleLimitPerMesh:SAMPLE_LIMIT,
  pairDefinitions:pairDefinitions.length,
  measuredPairs:results.length,
  skippedPairs:skipped,
  method:"Within each model independently, sample up to 180 vertices and 180 triangles from each adjacent bone mesh; calculate point-to-triangle distance in both directions; retain the 12 nearest sampled point-to-triangle pairs with coordinates, source vertex normals, opposing triangle normals, and opposing-normal angle. Normal angle is diagnostic only and uses the stored vertex normal versus sampled triangle winding normal. Source-ID mapping is exact.",
  results,
  limitations:[
    "Distances cover whole bone meshes, not anatomically segmented articular patches.",
    "Nearest candidate coordinates are sparse sampling hints, not segmented articular patches or validated anatomical landmarks.",
    "Normal compatibility compares a sampled source vertex normal with the winding-derived normal of the sampled opposing triangle; inconsistent triangle winding or mesh normals can make the angle misleading.",
    "The nearest sampled surface distance is approximate and can miss small contact regions or thin geometry.",
    "A small distance may reflect unrelated nearby surfaces; a large distance may reflect non-articular portions of the whole bones.",
    "These are not cartilage gaps, joint clearance, signed penetration, collision detection, biomechanics, or clinical validation.",
    "Donor and host coordinate frames are not registered to one another; only within-model pair distances are compared.",
    "No transforms are applied and no production asset, manifest, viewer, or deployment is modified."
  ],
  productionChanged:false
};
console.log(JSON.stringify(report,null,2));
