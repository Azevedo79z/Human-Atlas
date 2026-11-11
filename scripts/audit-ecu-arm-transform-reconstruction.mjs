/**
 * Reconstruct the arm-region borrowing transform and bilateral posture correction.
 * Read-only: decodes native donor/host geometry and compares computed values
 * with the borrowing metadata already recorded in atlas-female.json.
 *
 * Run: deno run --allow-read scripts/audit-ecu-arm-transform-reconstruction.mjs
 */
import fs from "node:fs";

const dir = new URL("../public/models/", import.meta.url);
const read = name => JSON.parse(fs.readFileSync(new URL(name, dir), "utf8"));
const male = read("atlas.json");
const female = read("atlas-female.json");
const buffers = atlas => atlas.chunks.map(chunk => {
  const filename = chunk.url.split("/").pop();
  const bytes = fs.readFileSync(new URL(filename, dir));
  if (chunk.bytes !== undefined && bytes.byteLength !== chunk.bytes) {
    throw new Error(`Chunk ${filename}: expected ${chunk.bytes} bytes, got ${bytes.byteLength}`);
  }
  return bytes;
});
const maleChunks = buffers(male), femaleChunks = buffers(female);

const ANCHOR_IN_FEMALE = {
  "First thoracic vertebra":"Thoracic vertebra 1",
  "Second thoracic vertebra":"Thoracic vertebra 2",
  "Third thoracic vertebra":"Thoracic vertebra 3",
  "Fourth thoracic vertebra":"Thoracic vertebra 4",
  "Fifth thoracic vertebra":"Thoracic vertebra 5",
  "Body of sternum":"Sternum",
};
const armAnchorNames = [
  "First thoracic vertebra","Second thoracic vertebra","Third thoracic vertebra",
  "Fourth thoracic vertebra","Fifth thoracic vertebra","Manubrium","Body of sternum",
];
const boxOf = (atlas, predicate) => {
  const parts = atlas.parts.filter(predicate);
  if (!parts.length) return null;
  const lo=[Infinity,Infinity,Infinity], hi=[-Infinity,-Infinity,-Infinity];
  for (const part of parts) for (let axis=0;axis<3;axis++) {
    lo[axis]=Math.min(lo[axis],part.bounds[0][axis]);
    hi[axis]=Math.max(hi[axis],part.bounds[1][axis]);
  }
  return {lo,hi};
};
const corners = box => Array.from({length:8},(_,c)=>[
  c&1?box.hi[0]:box.lo[0],c&2?box.hi[1]:box.lo[1],c&4?box.hi[2]:box.lo[2]
]);
const mean = points => points.reduce((m,p)=>[
  m[0]+p[0]/points.length,m[1]+p[1]/points.length,m[2]+p[2]/points.length
],[0,0,0]);
function fit(from, onto) {
  const a=mean(from),b=mean(onto); let numerator=0,denominator=0;
  for(let i=0;i<from.length;i++) for(let k=0;k<3;k++) {
    const da=from[i][k]-a[k],db=onto[i][k]-b[k];
    numerator+=da*db; denominator+=da*da;
  }
  const scale=denominator?numerator/denominator:1;
  return {scale,offset:b.map((v,k)=>v-scale*a[k])};
}
const from=[],onto=[],anchorAudit=[];
for(const name of armAnchorNames) {
  const donor=boxOf(male,p=>p.name===name);
  const hostName=ANCHOR_IN_FEMALE[name]??name;
  const host=boxOf(female,p=>p.name===hostName);
  if(!donor||!host) throw new Error(`Missing arm anchor: ${name} -> ${hostName}`);
  from.push(...corners(donor)); onto.push(...corners(host));
  anchorAudit.push({donor:name,host:hostName,donorParts:male.parts.filter(p=>p.name===name).length,hostParts:female.parts.filter(p=>p.name===hostName).length});
}
if(from.length<16) throw new Error("Insufficient arm anchors.");
const transform=fit(from,onto);
let maxAnchorResidual=0, squaredResidual=0, residualCount=0;
for(let i=0;i<from.length;i++) for(let k=0;k<3;k++) {
  const residual=transform.scale*from[i][k]+transform.offset[k]-onto[i][k];
  maxAnchorResidual=Math.max(maxAnchorResidual,Math.abs(residual));
  squaredResidual+=residual*residual; residualCount++;
}
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const length=Math.hypot(...a)||1;return a.map(v=>v/length);};
function vertices(atlas, chunks, predicate) {
  const out=[];
  for(const part of atlas.parts.filter(predicate)) {
    const bytes=chunks[part.chunk];
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    for(let i=0;i<part.vertexCount;i++) out.push([
      view.getFloat32(part.positions+i*12,true),
      view.getFloat32(part.positions+i*12+4,true),
      view.getFloat32(part.positions+i*12+8,true)
    ]);
  }
  return out;
}
const maleSkin=vertices(male,maleChunks,p=>p.system==="integumentary"&&p.name==="Skin");
const femaleSkin=vertices(female,femaleChunks,p=>p.name==="Skin");
if(!maleSkin.length||!femaleSkin.length) throw new Error("Missing native skin surface for posture calculation.");
const armCloud=(points,side)=>{
  const out=[];
  for(let y=.60;y<=1.20;y+=.01) {
    const slab=points.filter(q=>Math.abs(q[1]-y)<.006&&Math.sign(q[0])===side);
    if(slab.length<6) continue;
    const xs=slab.map(q=>Math.abs(q[0])).sort((a,b)=>a-b);
    let cut=null,previous=null;
    for(const x of xs) {if(previous!==null&&x-previous>.025)cut=(x+previous)/2;previous=x;}
    if(cut!==null) for(const q of slab) if(Math.abs(q[0])>cut) out.push(q);
  }
  return out;
};
function axisOf(points) {
  const centre=mean(points),cov=[[0,0,0],[0,0,0],[0,0,0]];
  for(const point of points) {
    const d=sub(point,centre);
    for(let a=0;a<3;a++) for(let b=0;b<3;b++) cov[a][b]+=d[a]*d[b]/points.length;
  }
  let vector=[1,1,1];
  for(let iteration=0;iteration<400;iteration++) {
    const next=[0,0,0];
    for(let a=0;a<3;a++) for(let b=0;b<3;b++) next[a]+=cov[a][b]*vector[b];
    vector=norm(next);
  }
  return {centre,axis:vector[1]>0?vector.map(v=>-v):vector};
}
const placedTop=(name,base)=>{
  const box=boxOf(male,p=>p.name===name);
  return box&&[
    (box.lo[0]+box.hi[0])/2*base.scale+base.offset[0],
    box.hi[1]*base.scale+base.offset[1],
    (box.lo[2]+box.hi[2])/2*base.scale+base.offset[2]
  ];
};
const posture={};
for(const {side,label,sign} of [{side:"left",label:"Left humerus",sign:1},{side:"right",label:"Right humerus",sign:-1}]) {
  const here=armCloud(maleSkin,sign),there=armCloud(femaleSkin,sign);
  if(here.length<50||there.length<50) throw new Error(`${side}: insufficient arm surface points (donor ${here.length}, host ${there.length})`);
  const fromAxis=axisOf(here),toAxis=axisOf(there);
  const cosine=Math.max(-1,Math.min(1,dot(fromAxis.axis,toAxis.axis)));
  const angle=Math.acos(cosine),spin=cross(fromAxis.axis,toAxis.axis),spinLength=Math.hypot(...spin);
  const pivot=placedTop(label,transform);
  if(!pivot) throw new Error(`Missing shoulder pivot for ${label}`);
  const placed=q=>q.map((v,k)=>v*transform.scale+transform.offset[k]);
  const reach=(points,move)=>points.reduce((maximum,q)=>Math.max(maximum,Math.hypot(...sub(move?placed(q):q,pivot))),0);
  const reachScale=reach(there,false)/reach(here,true);
  posture[side]={
    donorSurfacePoints:here.length,hostSurfacePoints:there.length,
    donorAxis:fromAxis.axis,hostAxis:toAxis.axis,
    turnDegrees:angle*180/Math.PI,
    spinAxis:spinLength<1e-6?null:spin.map(v=>v/spinLength),
    reachScale,pivot,blend:0.30
  };
}
const stored=female.borrowed??null;
const storedArm=stored?.regions?.find(region=>region.id==="arm")??null;
const storedPosture=stored?.posture??{};
const round=(v,n=5)=>Number(v.toFixed(n));
const comparison={
  armScale:{computed:round(transform.scale),stored:storedArm?.scale??null,delta:storedArm?round(transform.scale-storedArm.scale):null},
  armAnchorErrorMillimetres:{computed:round(maxAnchorResidual*1000,3),stored:storedArm?.anchorErrorMillimetres??null,delta:storedArm?round(maxAnchorResidual*1000-storedArm.anchorErrorMillimetres,3):null},
  leftTurnDegrees:{computed:round(posture.left.turnDegrees,1),stored:storedPosture["arm-left"]?.turnDegrees??null},
  leftReachScale:{computed:round(posture.left.reachScale,3),stored:storedPosture["arm-left"]?.reach??null},
  rightTurnDegrees:{computed:round(posture.right.turnDegrees,1),stored:storedPosture["arm-right"]?.turnDegrees??null},
  rightReachScale:{computed:round(posture.right.reachScale,3),stored:storedPosture["arm-right"]?.reach??null}
};
const report={
  purpose:"Read-only reconstruction of the arm transform and bilateral posture correction used by borrow-anatomy.mjs.",
  sourceVersions:{donor:male.version??null,host:female.version??null},
  armAnchors:anchorAudit,
  armRegionTransform:{scale:transform.scale,offset:transform.offset,maxAnchorResidual,anchorRmsResidual:Math.sqrt(squaredResidual/residualCount),anchorPoints:from.length},
  bilateralPosture:posture,
  comparisonWithStoredBorrowingMetadata:comparison,
  validation:{
    storedBorrowingMetadataPresent:!!storedArm,
    transformMatchesStoredMetadata:!!storedArm&&Math.abs(transform.scale-storedArm.scale)<0.00002&&Math.abs(maxAnchorResidual*1000-storedArm.anchorErrorMillimetres)<0.11,
    leftPostureMatchesStoredMetadata:!!storedPosture["arm-left"]&&Math.abs(posture.left.turnDegrees-storedPosture["arm-left"].turnDegrees)<0.11&&Math.abs(posture.left.reachScale-storedPosture["arm-left"].reach)<0.0006,
    rightPostureMatchesStoredMetadata:!!storedPosture["arm-right"]&&Math.abs(posture.right.turnDegrees-storedPosture["arm-right"].turnDegrees)<0.11&&Math.abs(posture.right.reachScale-storedPosture["arm-right"].reach)<0.0006
  },
  geometryChanged:false,manifestChanged:false,viewerChanged:false,productionChanged:false
};
console.log(JSON.stringify(report,null,2));
if(!Object.values(report.validation).slice(1).every(Boolean)) {
  throw new Error("Reconstructed arm transform does not match all stored borrowing metadata; do not proceed to ECU surface comparison.");
}
