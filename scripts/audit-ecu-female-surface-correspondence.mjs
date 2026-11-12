/**
 * Read-only ECU-to-female-bone correspondence audit.
 * Reconstructs the exact arm transform and soft-tissue posture operation from
 * borrow-anatomy.mjs, applies it to donor ECU vertices in memory, then reports
 * sampled vertex-to-vertex distances to same-side female borrowed bones.
 * This is a proximity diagnostic, NOT a tendon-footprint or attachment test.
 *
 * Run: deno run --allow-read --allow-net=raw.githubusercontent.com scripts/audit-ecu-female-surface-correspondence.mjs
 */
import fs from "node:fs";

const REVISION="b0a20fa3a009ca5f6bfa07b7479312e04c862af2";
const BASE=`https://raw.githubusercontent.com/HiMahendraBeniwal/female-atlas/${REVISION}/public/`;
const DIR=new URL("../public/models/",import.meta.url);
const readHost=()=>JSON.parse(fs.readFileSync(new URL("atlas-female.json",DIR),"utf8"));
const host=readHost();
const male=JSON.parse(fs.readFileSync(new URL("atlas.json",DIR),"utf8"));
const donorResponse=await fetch(BASE+"models/atlas.json");
if(!donorResponse.ok) throw new Error(`Donor manifest HTTP ${donorResponse.status}`);
const donor=await donorResponse.json();
const cache=new Map();
async function chunk(atlas,part,remote,label){
 const key=(remote?"donor:":"host:")+part.chunk;
 if(cache.has(key))return cache.get(key);
 const meta=atlas.chunks[part.chunk]; if(!meta)throw new Error(label+": missing chunk metadata");
 let bytes;
 if(remote){
  const response=await fetch(new URL(meta.url.replace(/^\//,""),BASE));
  if(!response.ok)throw new Error(label+`: chunk HTTP ${response.status}`);
  bytes=new Uint8Array(await response.arrayBuffer());
 }else{
  const filename=meta.url.split("/").pop(),buf=fs.readFileSync(new URL(filename,DIR));
  bytes=new Uint8Array(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength));
 }
 if(meta.bytes!==undefined&&bytes.byteLength!==meta.bytes)throw new Error(label+": chunk byte length mismatch");
 cache.set(key,bytes);return bytes;
}
function readPositions(bytes,part){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(part.positions+part.vertexCount*12>bytes.byteLength)throw new Error(part.id+": positions exceed chunk");
 const out=new Array(part.vertexCount);
 for(let i=0;i<part.vertexCount;i++){
  const p=[view.getFloat32(part.positions+i*12,true),view.getFloat32(part.positions+i*12+4,true),view.getFloat32(part.positions+i*12+8,true)];
  if(!p.every(Number.isFinite))throw new Error(part.id+": non-finite vertex");
  out[i]=p;
 }
 return out;
}
async function positions(atlas,part,remote){return readPositions(await chunk(atlas,part,remote,part.id),part);}
const anchors=[
 ["BM0078","Left humerus"],["BM0087","Left ulna"],["BM0075","Left fifth metacarpal bone"],
 ["BM0115","Right humerus"],["BM0123","Right ulna"],["BM0111","Right fifth metacarpal bone"]
];
const donorIds=["BP3D_FJ1472","BP3D_FJ1472M","BP3D_FJ1517","BP3D_FJ1517M"];
const find=(atlas,id)=>{const p=atlas.parts.find(x=>x.id===id);if(!p)throw new Error("Missing part "+id);return p;};
const boxOf=(atlas,pred)=>{
 const ps=atlas.parts.filter(pred);if(!ps.length)return null;
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(const p of ps)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],p.bounds[0][k]);hi[k]=Math.max(hi[k],p.bounds[1][k]);}
 return {lo,hi};
};
const corners=b=>Array.from({length:8},(_,c)=>[c&1?b.hi[0]:b.lo[0],c&2?b.hi[1]:b.lo[1],c&4?b.hi[2]:b.lo[2]]);
const mean=ps=>ps.reduce((m,p)=>m.map((v,k)=>v+p[k]/ps.length),[0,0,0]);
function fit(a,b){
 const ma=mean(a),mb=mean(b);let n=0,d=0;
 for(let i=0;i<a.length;i++)for(let k=0;k<3;k++){n+=(a[i][k]-ma[k])*(b[i][k]-mb[k]);d+=(a[i][k]-ma[k])**2;}
 const scale=d?n/d:1;return {scale,offset:mb.map((v,k)=>v-scale*ma[k])};
}
const map={"First thoracic vertebra":"Thoracic vertebra 1","Second thoracic vertebra":"Thoracic vertebra 2","Third thoracic vertebra":"Thoracic vertebra 3","Fourth thoracic vertebra":"Thoracic vertebra 4","Fifth thoracic vertebra":"Thoracic vertebra 5","Body of sternum":"Sternum"};
const anchorNames=["First thoracic vertebra","Second thoracic vertebra","Third thoracic vertebra","Fourth thoracic vertebra","Fifth thoracic vertebra","Manubrium","Body of sternum"];
function anchorFit(sourceAtlas,targetAtlas,targetNames){
 const source=[],target=[];
 for(const name of anchorNames){
  const a=boxOf(sourceAtlas,p=>p.name===name),b=boxOf(targetAtlas,p=>p.name===(targetNames?.[name]??name));
  if(!a||!b)throw new Error("Missing coordinate bridge/arm anchor "+name);
  source.push(...corners(a));target.push(...corners(b));
 }
 const result=fit(source,target);let max=0,sum=0,count=0;
 for(let i=0;i<source.length;i++)for(let k=0;k<3;k++){
  const d=result.scale*source[i][k]+result.offset[k]-target[i][k];max=Math.max(max,Math.abs(d));sum+=d*d;count++;
 }
 return {...result,maxResidual:max,rmsResidual:Math.sqrt(sum/count),anchorPoints:source.length};
}
// ECU records are read from the pinned external source repository. Bridge that
// repository's male reference frame onto this project's local male atlas first.
const sourceFrameBridge=anchorFit(donor,male,{});
const armTransform=anchorFit(male,host,map);
const sub=(a,b)=>a.map((v,k)=>v-b[k]);
const dot=(a,b)=>a.reduce((s,v,k)=>s+v*b[k],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
const armCloud=(pts,side)=>{
 const out=[];
 for(let y=.60;y<=1.20;y+=.01){
  const slab=pts.filter(q=>Math.abs(q[1]-y)<.006&&Math.sign(q[0])===side);
  if(slab.length<6)continue;
  const xs=slab.map(q=>Math.abs(q[0])).sort((a,b)=>a-b);let cut=null,prev=null;
  for(const x of xs){if(prev!==null&&x-prev>.025)cut=(x+prev)/2;prev=x;}
  if(cut!==null)for(const q of slab)if(Math.abs(q[0])>cut)out.push(q);
 }
 return out;
};
function axisOf(points){
 const c=mean(points),cov=[[0,0,0],[0,0,0],[0,0,0]];
 for(const p of points){const d=sub(p,c);for(let a=0;a<3;a++)for(let b=0;b<3;b++)cov[a][b]+=d[a]*d[b]/points.length;}
 let v=[1,1,1];for(let i=0;i<400;i++){const w=[0,0,0];for(let a=0;a<3;a++)for(let b=0;b<3;b++)w[a]+=cov[a][b]*v[b];v=norm(w);}
 return {axis:v[1]>0?v.map(x=>-x):v};
}
const maleSkinPart=male.parts.find(p=>p.system==="integumentary"&&p.name==="Skin");
const femaleSkinPart=host.parts.find(p=>p.name==="Skin");
if(!maleSkinPart||!femaleSkinPart)throw new Error("Missing skin mesh for posture reconstruction");
const maleSkin=await positions(male,maleSkinPart,false),femaleSkin=await positions(host,femaleSkinPart,false);
const posture={};
const placedTop=(name)=>{
 const b=boxOf(male,p=>p.name===name);if(!b)throw new Error("Missing pivot "+name);
 return [(b.lo[0]+b.hi[0])/2*armTransform.scale+armTransform.offset[0],b.hi[1]*armTransform.scale+armTransform.offset[1],(b.lo[2]+b.hi[2])/2*armTransform.scale+armTransform.offset[2]];
};
const turn=(v,spin,angle)=>{
 const c=Math.cos(angle),s=Math.sin(angle),k=cross(spin,v),d=dot(spin,v)*(1-c);
 return v.map((x,i)=>x*c+k[i]*s+spin[i]*d);
};
for(const side of ["left","right"]){
 const sign=side==="left"?1:-1,don=armCloud(maleSkin,sign),hostPts=armCloud(femaleSkin,sign);
 if(don.length<50||hostPts.length<50)throw new Error(side+": insufficient skin samples");
 const a=axisOf(don).axis,b=axisOf(hostPts).axis,angle=Math.acos(Math.max(-1,Math.min(1,dot(a,b))));
 const rawSpin=cross(a,b),spinLength=Math.hypot(...rawSpin);if(spinLength<1e-6)throw new Error(side+": degenerate posture spin");
 const spin=norm(rawSpin),pivot=placedTop(side==="left"?"Left humerus":"Right humerus");
 const place=q=>{const m=q.map((v,k)=>v*armTransform.scale+armTransform.offset[k]);return m;};
 const reach=(ps,moved)=>ps.reduce((m,q)=>Math.max(m,Math.hypot(...sub(moved?place(q):q,pivot))),0);
 posture[side]={pivot,spin,angle,reachScale:reach(hostPts,false)/reach(don,true),blend:.30,donorSkinSamples:don.length,hostSkinSamples:hostPts.length};
}
function transformEcu(points,side){
 const b=posture[side];
 return points.map(q=>{
  const maleFrame=q.map((x,k)=>x*sourceFrameBridge.scale+sourceFrameBridge.offset[k]);\n  const v=maleFrame.map((x,k)=>x*armTransform.scale+armTransform.offset[k]);
  const arm=sub(v,b.pivot),r=Math.hypot(...arm),w=Math.min(1,r/b.blend),rot=turn(arm,b.spin,b.angle*w),grow=1+w*(b.reachScale-1);
  return b.pivot.map((x,k)=>x+rot[k]*grow);
 });
}
function bounds(points){
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(const p of points)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],p[k]);hi[k]=Math.max(hi[k],p[k]);}
 return {min:lo,max:hi};
}
function aabbGap(a,b){
 return Math.hypot(...a.min.map((_,k)=>Math.max(0,b.min[k]-a.max[k],a.min[k]-b.max[k])));
}
function quantile(sorted,q){return sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*q))];}
function nearestSummary(source,target){
 const distances=new Array(source.length);
 for(let i=0;i<source.length;i++){
  const p=source[i];let best=Infinity;
  for(const t of target){const dx=p[0]-t[0],dy=p[1]-t[1],dz=p[2]-t[2],d=dx*dx+dy*dy+dz*dz;if(d<best)best=d;}
  distances[i]=Math.sqrt(best);
 }
 distances.sort((a,b)=>a-b);
 return {sampledVertices:source.length,targetVertices:target.length,min:distances[0],median:quantile(distances,.5),p95:quantile(distances,.95),max:distances[distances.length-1]};
}
const sideMap={
 left:[["BM0078","humerus"],["BM0087","ulna"],["BM0075","fifthMetacarpal"]],
 right:[["BM0115","humerus"],["BM0123","ulna"],["BM0111","fifthMetacarpal"]]
};
const boneVertices={};
for(const [id] of anchors){
 const p=find(host,id);boneVertices[id]=await positions(host,p,false);
}
const reports=[];
for(const id of donorIds){
 const p=find(donor,id),side=id.endsWith("M")?"left":"right";
 if(!/extensor carpi ulnaris/i.test(p.name))throw new Error("Unexpected donor ECU name "+id);
 const source=await positions(donor,p,true),placed=transformEcu(source,side),bb=bounds(placed);
 const comparisons=sideMap[side].map(([boneId,label])=>{
  const target=boneVertices[boneId],targetBounds=bounds(target);
  return {target:label,targetPartId:boneId,ecuToBoneVertexDistances:nearestSummary(placed,target),boneToEcuVertexDistances:nearestSummary(target,placed),aabbGap:aabbGap(bb,targetBounds)};
 });
 reports.push({donorPartId:id,side,sourceVertices:source.length,triangles:p.indexCount/3,transformedBounds:bb,comparisons});
}
const report={
 purpose:"In-memory, read-only ECU-to-bone proximity diagnostic after bridging the pinned ECU donor coordinate frame to the repository male atlas, then applying the repository male-to-female arm transform and soft-tissue posture operation.",
 donor:{revision:REVISION,version:donor.version??null},
 host:{version:host.version??null},
 transform:{sourceFrameBridge:{scale:sourceFrameBridge.scale,offset:sourceFrameBridge.offset,maxAnchorResidual:sourceFrameBridge.maxResidual,rmsAnchorResidual:sourceFrameBridge.rmsResidual},maleToFemaleArm:{scale:armTransform.scale,offset:armTransform.offset,maxAnchorResidual:armTransform.maxResidual,rmsAnchorResidual:armTransform.rmsResidual},posture:Object.fromEntries(Object.entries(posture).map(([k,v])=>[k,{turnDegrees:v.angle*180/Math.PI,reachScale:v.reachScale,blend:v.blend,donorSkinSamples:v.donorSkinSamples,hostSkinSamples:v.hostSkinSamples}]))},
 meshes:reports,
 metricDefinition:"Nearest Euclidean distance between decoded mesh vertices in each direction; AABB gap is broad-phase only. Distances are sampled vertex-to-vertex, not exact point-to-triangle surface distance.",
 interpretationLimits:[
  "Small vertex distances indicate geometric proximity only, not anatomical attachment or a validated tendon footprint.",
  "The donor ECU is male-derived and the female arm bones are borrowed; this audit does not establish sex-specific anatomical fidelity.",\n  "The coordinate bridge uses seven shared anchor bounding boxes; residuals must be reviewed before interpreting the resulting proximity metrics.",
  "No triangle-surface intersection, continuous Hausdorff distance, tissue collision, or tendon insertion analysis is claimed.",
  "The two ECU records per side are reported separately; left and right are never mixed."
 ],
 filesChanged:false,geometryChanged:false,manifestChanged:false,viewerChanged:false,productionChanged:false
};
console.log(JSON.stringify(report,null,2));
