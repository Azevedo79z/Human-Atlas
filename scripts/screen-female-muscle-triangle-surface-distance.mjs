/**
 * Read-only approximate symmetric mesh-surface distance screen.
 * Samples source vertices against sampled target triangles in original donor coordinates.
 * This is a geometric screening aid, not anatomical attachment validation.
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
const BONE_NAME = /\b(bone|cartilage|rib|costal|clavicle|sternum|scapula|humerus|radius|ulna|carpal|metacarpal|phalanx|phalanges|vertebr|sacrum|coccyx|ilium|ischium|pubis|femur|patella|tibia|fibula|talus|calcaneus|tarsal|metatarsal|mandible|maxilla|zygomatic|frontal|parietal|temporal|occipital|sphenoid|ethmoid|nasal|lacrimal|palatine|vomer|hyoid|mastoid|condyle|trochanter|epicondyle|olecranon|acromion|coracoid|glenoid|tubercle|process)\b/i;
const NON_SURFACE_TISSUE = /\b(compact|spongy|cancellous) bone tissue\b/i;
const SAMPLE_LIMIT = 240;
const CANDIDATE_LIMIT = 8;
const manifestResponse = await fetch(RAW_BASE + "models/atlas.json");
if (!manifestResponse.ok) throw new Error(`Manifest HTTP ${manifestResponse.status}`);
const atlas = await manifestResponse.json();
const muscles = TARGETS.flatMap(([target, pattern]) =>
  atlas.parts.filter(part => part.system === "muscular" && pattern.test(part.name))
    .map(part => ({ target, part }))
);
const skeletal = atlas.parts.filter(part => part.system === "skeletal");
const bones = skeletal.filter(part => BONE_NAME.test(part.name) && !NON_SURFACE_TISSUE.test(part.name));
if (!muscles.length || !bones.length) throw new Error("Expected donor muscle and named bone meshes.");
function boundsGap(a, b) {
  let sum = 0;
  for (let k = 0; k < 3; k++) {
    const d = Math.max(0, a.bounds[0][k] - b.bounds[1][k], b.bounds[0][k] - a.bounds[1][k]);
    sum += d * d;
  }
  return Math.sqrt(sum);
}
function pointTriangleDistance2(p, a, b, c) {
  const sub = (x, y) => [x[0]-y[0], x[1]-y[1], x[2]-y[2]];
  const dot = (x,y) => x[0]*y[0]+x[1]*y[1]+x[2]*y[2];
  const ab=sub(b,a), ac=sub(c,a), ap=sub(p,a);
  const d1=dot(ab,ap), d2=dot(ac,ap);
  if (d1<=0 && d2<=0) return dot(ap,ap);
  const bp=sub(p,b), d3=dot(ab,bp), d4=dot(ac,bp);
  if (d3>=0 && d4<=d3) return dot(bp,bp);
  const vc=d1*d4-d3*d2;
  if (vc<=0 && d1>=0 && d3<=0) {
    const v=d1/(d1-d3), q=a.map((x,i)=>x+v*ab[i]), e=sub(p,q); return dot(e,e);
  }
  const cp=sub(p,c), d5=dot(ab,cp), d6=dot(ac,cp);
  if (d6>=0 && d5<=d6) return dot(cp,cp);
  const vb=d5*d2-d1*d6;
  if (vb<=0 && d2>=0 && d6<=0) {
    const w=d2/(d2-d6), q=a.map((x,i)=>x+w*ac[i]), e=sub(p,q); return dot(e,e);
  }
  const va=d3*d6-d5*d4;
  if (va<=0 && (d4-d3)>=0 && (d5-d6)>=0) {
    const w=(d4-d3)/((d4-d3)+(d5-d6)), q=b.map((x,i)=>x+w*(c[i]-b[i])), e=sub(p,q); return dot(e,e);
  }
  const denom=1/(va+vb+vc), v=vb*denom, w=vc*denom;
  const q=a.map((x,i)=>x+ab[i]*v+ac[i]*w), e=sub(p,q);
  return dot(e,e);
}
function geometry(buffer, part) {
  const positions = new Float32Array(buffer, part.positions, part.vertexCount*3);
  const indices = new Uint32Array(buffer, part.indices, part.indexCount);
  if (part.indexCount % 3) throw new Error(`Non-triangular index count: ${part.id}`);
  for (const index of indices) if (index >= part.vertexCount) throw new Error(`Invalid index in ${part.id}`);
  const points = [];
  const pointCount = Math.min(SAMPLE_LIMIT, part.vertexCount);
  for (let i=0;i<pointCount;i++) {
    const v=Math.floor(i*part.vertexCount/pointCount)*3;
    points.push([positions[v],positions[v+1],positions[v+2]]);
  }
  const triangles=[];
  const total=indices.length/3, triCount=Math.min(SAMPLE_LIMIT,total);
  for (let i=0;i<triCount;i++) {
    const t=Math.floor(i*total/triCount)*3;
    const tri=[];
    for(let j=0;j<3;j++){const v=indices[t+j]*3;tri.push([positions[v],positions[v+1],positions[v+2]]);}
    triangles.push(tri);
  }
  return {points,triangles};
}
function directed(points, triangles) {
  const distances=points.map(p=>{
    let best=Infinity;
    for(const [a,b,c] of triangles) best=Math.min(best,pointTriangleDistance2(p,a,b,c));
    return Math.sqrt(best);
  }).sort((a,b)=>a-b);
  const q=f=>distances[Math.min(distances.length-1,Math.floor((distances.length-1)*f))];
  return {min:distances[0],p10:q(.1),median:q(.5),p90:q(.9),sampledPoints:points.length,sampledTriangles:triangles.length};
}
const ranked=new Map();
for(const item of muscles) ranked.set(item.part.id,bones.map(bone=>({bone,gap:boundsGap(item.part,bone)})).sort((a,b)=>a.gap-b.gap).slice(0,CANDIDATE_LIMIT));
const needed=new Map();
for(const item of muscles){needed.set(item.part.id,item.part);for(const c of ranked.get(item.part.id))needed.set(c.bone.id,c.bone);}
const chunkIds=[...new Set([...needed.values()].map(p=>p.chunk))].sort((a,b)=>a-b);
const buffers=new Map();
for(const id of chunkIds){
  const chunk=atlas.chunks[id]; if(!chunk) throw new Error(`Missing chunk ${id}`);
  const url=new URL(chunk.url.replace(/^\\/+/, ""),RAW_BASE);
  const response=await fetch(url); if(!response.ok) throw new Error(`Chunk ${id} HTTP ${response.status}`);
  const buffer=await response.arrayBuffer(); if(buffer.byteLength!==chunk.bytes) throw new Error(`Chunk ${id} byte mismatch`);
  buffers.set(id,buffer);
}
const meshes=new Map();
for(const part of needed.values()) meshes.set(part.id,geometry(buffers.get(part.chunk),part));
const results=muscles.map(({target,part})=>{
  const source=meshes.get(part.id);
  const candidates=ranked.get(part.id).map(({bone,gap})=>{
    const dest=meshes.get(bone.id);
    return {boneId:bone.id,boneName:bone.name,boneConceptId:bone.conceptId,boundsGap:gap,
      muscleToBone:directed(source.points,dest.triangles),
      boneToMuscle:directed(dest.points,source.triangles)};
  }).sort((a,b)=>a.muscleToBone.median-b.muscleToBone.median);
  return {target,muscleId:part.id,muscleName:part.name,muscleConceptId:part.conceptId,
    vertexCount:part.vertexCount,triangleCount:part.indexCount/3,candidates};
});
console.log(JSON.stringify({
  donorRevision:REVISION,coordinateSpace:"Original donor coordinates; no transforms applied",
  method:"For each muscle, shortlist eight skeletal meshes by AABB gap; sample up to 240 vertices and 240 triangles per mesh; compute point-to-triangle distances in both directions.",
  targetMuscleParts:muscles.length,skeletalPartsAvailable:skeletal.length,boneCandidatesAvailable:bones.length,
  chunksDownloaded:chunkIds, sampleLimit:SAMPLE_LIMIT, results,
  limitations:[
    "Distances are approximate because vertices and triangles are deterministically subsampled.",
    "This is not full triangle-triangle distance, collision detection, or proof of anatomical origin/insertion.",
    "Candidate ranking is geometric and may include nearby but anatomically unrelated bones.",
    "Raw donor coordinates are not registered to the host atlas; laterality and visual fit require separate review.",
    "No source geometry, manifest, viewer, Wix integration, or production deployment is modified."
  ],productionChanged:false
},null,2));
