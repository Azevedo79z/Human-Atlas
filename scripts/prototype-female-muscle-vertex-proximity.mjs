/**
 * Read-only vertex-point proximity prototype for selected supplemental muscles.
 *
 * This compares sampled donor muscle vertices, after preliminary region-specific
 * anchor-center transforms, with sampled host bone vertices. It is NOT an exact
 * triangle-surface distance, collision test, insertion validation, or anatomy
 * approval. No model assets or production code are modified.
 *
 * Run:
 *   deno run --allow-net=raw.githubusercontent.com scripts/prototype-female-muscle-vertex-proximity.mjs
 */
const REVISION = "b0a20fa3a009ca5f6bfa07b7479312e04c862af2";
const CANDIDATE_BASE = `https://raw.githubusercontent.com/HiMahendraBeniwal/female-atlas/${REVISION}/public/`;
const HOST_BASE = "https://raw.githubusercontent.com/Azevedo79z/Human-Atlas/main/public/";
const CANDIDATE_MANIFEST = CANDIDATE_BASE + "models/atlas.json";
const HOST_MANIFEST = HOST_BASE + "models/atlas-female.json";

const ANCHORS = [
  "Left clavicle", "Right clavicle", "Left scapula", "Right scapula",
  "Left humerus", "Right humerus", "Left radius", "Right radius",
  "Left ulna", "Right ulna", "Manubrium",
];
const REGIONS = {
  shoulder: {
    anchors: ["Left clavicle", "Right clavicle", "Left scapula", "Right scapula", "Manubrium"],
    muscles: /deltoid|trapezius|supraspinatus|infraspinatus|teres|subscapularis|pectoralis|rhomboid|latissimus|serratus|subclavius|levator scapulae/i,
    bones: /clavicle|scapula|manubrium/i,
  },
  upperArm: {
    anchors: ["Left humerus", "Right humerus"],
    muscles: /biceps brachii|triceps brachii|brachialis|coracobrachialis|anconeus/i,
    bones: /humerus/i,
  },
  forearm: {
    anchors: ["Left radius", "Right radius", "Left ulna", "Right ulna"],
    muscles: /pronator|supinator|flexor carpi|extensor carpi|palmaris|interosseous|lumbrical|thenar|hypothenar|abductor pollicis|adductor pollicis|opponens/i,
    bones: /radius|ulna/i,
  },
};
const LOWER_LIMB = /foot|pedis|plantar|hallux|toe|calcaneal|fibular|peroneal|tibial|gastrocnemius|soleus/i;

async function manifest(url, label) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${label} manifest HTTP ${response.status}`);
  const value = await response.json();
  if (!Array.isArray(value.parts) || !Array.isArray(value.chunks)) {
    throw new Error(`${label} manifest schema invalid`);
  }
  return value;
}
function findPart(atlas, name, systems) {
  return atlas.parts.find(p => p.name.toLowerCase() === name.toLowerCase() && systems.includes(p.system));
}
function center(bounds) {
  return bounds[0].map((v, i) => (v + bounds[1][i]) / 2);
}
function parity(p) {
  let n = 0;
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) if (p[i] > p[j]) n++;
  return n % 2 ? -1 : 1;
}
function fit(rows) {
  if (rows.length < 2) return null;
  const permutations = [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
  const source = rows.map(r => center(r.donor.bounds));
  const target = rows.map(r => center(r.host.bounds));
  let best = null;
  for (const permutation of permutations) for (const sx of [-1,1]) for (const sy of [-1,1]) for (const sz of [-1,1]) {
    const signs = [sx,sy,sz];
    if (parity(permutation) * sx * sy * sz !== 1) continue;
    const rotated = source.map(p => signs.map((s,i) => s * p[permutation[i]]));
    const meanS = [0,1,2].map(i => rotated.reduce((a,p) => a+p[i],0)/rotated.length);
    const meanT = [0,1,2].map(i => target.reduce((a,p) => a+p[i],0)/target.length);
    let numerator=0, denominator=0;
    for (let i=0;i<rotated.length;i++) for (let j=0;j<3;j++) {
      numerator += (rotated[i][j]-meanS[j])*(target[i][j]-meanT[j]);
      denominator += (rotated[i][j]-meanS[j])**2;
    }
    const scale=numerator/denominator;
    if (!Number.isFinite(scale) || scale<=0) continue;
    const translation=meanT.map((v,i)=>v-scale*meanS[i]);
    const errors=rotated.map((p,k)=>Math.hypot(...p.map((v,i)=>scale*v+translation[i]-target[k][i])));
    const rms=Math.sqrt(errors.reduce((a,v)=>a+v*v,0)/errors.length);
    if (!best || rms<best.rms) best={scale,translation,permutation,signs,rms,max:Math.max(...errors)};
  }
  return best;
}
function apply(p,t) {
  return t.signs.map((s,i)=>t.scale*s*p[t.permutation[i]]+t.translation[i]);
}
const [donor,host]=await Promise.all([
  manifest(CANDIDATE_MANIFEST,"Donor"), manifest(HOST_MANIFEST,"Host"),
]);
const anchorRows=ANCHORS.map(name=>({
  name,
  donor:findPart(donor,name,["skeletal"]),
  host:findPart(host,name,["skeletal","borrowed"]),
}));
if(anchorRows.some(r=>!r.donor || !r.host)) throw new Error("One or more required bone anchors are missing.");
const transforms={};
for (const [name,region] of Object.entries(REGIONS)) {
  const rows=region.anchors.map(a=>anchorRows.find(r=>r.name===a));
  transforms[name]=fit(rows);
  if (!transforms[name]) throw new Error(`Unable to fit region ${name}`);
}
const chunkCache=new Map();
async function chunk(atlas,base,index,label) {
  const key=label+":"+index;
  if(chunkCache.has(key)) return chunkCache.get(key);
  const meta=atlas.chunks[index];
  if(!meta) throw new Error(`${label}: missing chunk ${index}`);
  const path=meta.url.startsWith("/")?meta.url.slice(1):meta.url;
  const response=await fetch(new URL(path,base));
  if(!response.ok) throw new Error(`${label}: chunk HTTP ${response.status}`);
  const data=await response.arrayBuffer();
  if(meta.bytes!==undefined && data.byteLength!==meta.bytes) throw new Error(`${label}: chunk byte mismatch`);
  chunkCache.set(key,data);
  return data;
}
async function sampleVertices(atlas,base,part,label,maxSamples) {
  const data=await chunk(atlas,base,part.chunk,label);
  const view=new DataView(data);
  const result=[];
  const count=Math.min(part.vertexCount,maxSamples);
  for(let i=0;i<count;i++) {
    const sourceIndex=count===1?0:Math.floor(i*(part.vertexCount-1)/(count-1));
    const offset=part.positions+sourceIndex*12;
    const p=[0,1,2].map(axis=>view.getFloat32(offset+axis*4,true));
    if(!p.every(Number.isFinite)) throw new Error(`${label}: non-finite vertex in ${part.name}`);
    result.push(p);
  }
  return result;
}
function quantile(sorted,q) { return sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*q))]; }
function nearestStats(points,bonePoints,transform) {
  const distances=points.map(p=>{
    const q=apply(p,transform);
    let best=Infinity;
    for(const b of bonePoints) best=Math.min(best,Math.hypot(q[0]-b[0],q[1]-b[1],q[2]-b[2]));
    return best;
  }).sort((a,b)=>a-b);
  return {
    sampledMuscleVertices:points.length,
    sampledBoneVertices:bonePoints.length,
    nearestVertexDistanceMm:{p10:+(quantile(distances,.1)*1000).toFixed(1),median:+(quantile(distances,.5)*1000).toFixed(1),p90:+(quantile(distances,.9)*1000).toFixed(1)},
    muscleVerticesWithin10mm:distances.filter(v=>v<=.01).length,
    warning:"Distances are nearest sampled vertex-to-vertex, not triangle-surface distances.",
  };
}
const selected=donor.parts.filter(p=>p.system==="muscular" && !LOWER_LIMB.test(p.name) &&
  Object.values(REGIONS).some(r=>r.muscles.test(p.name))).slice(0,18);
if(!selected.length) throw new Error("No representative upper-body muscle meshes matched.");
const reports=[];
for(const muscle of selected) {
  const [regionName,region]=Object.entries(REGIONS).find(([,r])=>r.muscles.test(muscle.name));
  const boneParts=anchorRows.filter(r=>region.bones.test(r.name)).map(r=>r.host);
  const musclePoints=await sampleVertices(donor,CANDIDATE_BASE,muscle,"donor",500);
  const bonePointSets=await Promise.all(boneParts.map(p=>sampleVertices(host,HOST_BASE,p,"host",900)));
  const bonePoints=bonePointSets.flat();
  reports.push({
    muscle:muscle.name,
    donorPartId:muscle.id,
    region:regionName,
    transformFit:{anchorCount:region.anchors.length,scale:+transforms[regionName].scale.toFixed(5),rmsMm:+(transforms[regionName].rms*1000).toFixed(1),maxMm:+(transforms[regionName].max*1000).toFixed(1),preliminary:regionName==="upperArm"},
    comparedHostBones:boneParts.map(p=>p.name),
    pointCloudComparison:nearestStats(musclePoints,bonePoints,transforms[regionName]),
  });
}
const report={
  candidateRevision:REVISION,
  candidateUpperBodyMuscleParts:donor.parts.filter(p=>p.system==="muscular" && !LOWER_LIMB.test(p.name)).length,
  sampledMuscles:reports.length,
  regions:Object.fromEntries(Object.entries(REGIONS).map(([name,r])=>[name,{anchors:r.anchors.length,fitRmsMm:+(transforms[name].rms*1000).toFixed(1),fitMaxMm:+(transforms[name].max*1000).toFixed(1)}])),
  results:reports,
  limitations:[
    "This is a point-cloud screening prototype, not exact mesh-to-mesh or triangle-surface distance.",
    "Sparse sampling can miss narrow contacts, gaps, and collisions.",
    "Anchor-center transforms are preliminary; the two-anchor upper-arm fit is weak.",
    "Proximity does not establish anatomical origin, insertion, side, orientation, or sex-specific suitability.",
    "No geometry is written to the repository and no production model or deployment is changed."
  ],
  productionChanged:false,
};
console.log(JSON.stringify(report,null,2));
