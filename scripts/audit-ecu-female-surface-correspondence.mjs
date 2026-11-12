/**
 * Read-only ECU-to-female-bone correspondence audit.
 * Reconstructs the exact arm transform and soft-tissue posture operation from
 * borrow-anatomy.mjs, applies it to donor ECU vertices in memory, then reports
 * sampled point-to-triangle distances and triangle-pair intersection candidates to same-side female borrowed bones.
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
function readIndices(bytes,part){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(part.indices+part.indexCount*4>bytes.byteLength)throw new Error(part.id+": indices exceed chunk");
 const out=new Uint32Array(part.indexCount);
 for(let i=0;i<out.length;i++){out[i]=view.getUint32(part.indices+i*4,true);if(out[i]>=part.vertexCount)throw new Error(part.id+": triangle index outside vertex range");}
 if(out.length%3!==0)throw new Error(part.id+": index count is not divisible by three");
 return out;
}
async function mesh(atlas,part,remote){
 const bytes=await chunk(atlas,part,remote,part.id);
 return {points:readPositions(bytes,part),indices:readIndices(bytes,part)};
}

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
  const maleFrame=q.map((x,k)=>x*sourceFrameBridge.scale+sourceFrameBridge.offset[k]);
  const v=maleFrame.map((x,k)=>x*armTransform.scale+armTransform.offset[k]);
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

const pointAabbDistance2=(p,lo,hi)=>{
 let d=0;for(let k=0;k<3;k++){const x=p[k]<lo[k]?lo[k]-p[k]:p[k]>hi[k]?p[k]-hi[k]:0;d+=x*x;}return d;
};
function closestPointTriangle(p,a,b,c){
 const ab=sub(b,a),ac=sub(c,a),ap=sub(p,a),d1=dot(ab,ap),d2=dot(ac,ap);
 if(d1<=0&&d2<=0)return a;
 const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);
 if(d3>=0&&d4<=d3)return b;
 const vc=d1*d4-d3*d2;
 if(vc<=0&&d1>=0&&d3<=0){const v=d1/(d1-d3);return a.map((x,k)=>x+v*ab[k]);}
 const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);
 if(d6>=0&&d5<=d6)return c;
 const vb=d5*d2-d1*d6;
 if(vb<=0&&d2>=0&&d6<=0){const w=d2/(d2-d6);return a.map((x,k)=>x+w*ac[k]);}
 const va=d3*d6-d5*d4;
 if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0){const w=(d4-d3)/((d4-d3)+(d5-d6));return b.map((x,k)=>x+w*(c[k]-b[k]));}
 const denom=1/(va+vb+vc),v=vb*denom,w=vc*denom;
 return a.map((x,k)=>x+ab[k]*v+ac[k]*w);
}
function buildTriangleTree(points,indices){
 const tris=[];
 for(let i=0;i<indices.length;i+=3){
  const a=points[indices[i]],b=points[indices[i+1]],c=points[indices[i+2]];
  const lo=[0,1,2].map(k=>Math.min(a[k],b[k],c[k])),hi=[0,1,2].map(k=>Math.max(a[k],b[k],c[k]));
  tris.push({a,b,c,lo,hi,center:lo.map((v,k)=>(v+hi[k])/2)});
 }
 function build(items){
  const lo=[0,1,2].map(k=>Math.min(...items.map(t=>t.lo[k]))),hi=[0,1,2].map(k=>Math.max(...items.map(t=>t.hi[k])));
  if(items.length<=8)return {lo,hi,items};
  const axis=[0,1,2].sort((a,b)=>(hi[b]-lo[b])-(hi[a]-lo[a]))[0];
  items.sort((a,b)=>a.center[axis]-b.center[axis]);const mid=items.length>>1;
  return {lo,hi,left:build(items.slice(0,mid)),right:build(items.slice(mid))};
 }
 return {root:build(tris),triangleCount:tris.length};
}
function nearestPointToTree(p,tree){
 let best=Infinity;
 function visit(node){
  if(pointAabbDistance2(p,node.lo,node.hi)>=best)return;
  if(node.items){for(const t of node.items){if(pointAabbDistance2(p,t.lo,t.hi)>=best)continue;
   const q=closestPointTriangle(p,t.a,t.b,t.c),d=sub(p,q),d2=dot(d,d);if(d2<best)best=d2;
  }return;}
  const dl=pointAabbDistance2(p,node.left.lo,node.left.hi),dr=pointAabbDistance2(p,node.right.lo,node.right.hi);
  if(dl<dr){visit(node.left);visit(node.right);}else{visit(node.right);visit(node.left);}
 }
 visit(tree.root);return Math.sqrt(best);
}
function surfaceSamples(points,indices){
 const out=[...points],centroids=[];
 for(let i=0;i<indices.length;i+=3){
  const a=points[indices[i]],b=points[indices[i+1]],c=points[indices[i+2]];
  centroids.push(a.map((v,k)=>(v+b[k]+c[k])/3));
 }
 return {vertices:points.length,triangleCentroids:centroids.length,points:out.concat(centroids)};
}
function pointTriangleSummary(samples,targetTree){
 const ds=samples.points.map(p=>nearestPointToTree(p,targetTree)).sort((a,b)=>a-b);
 return {sampledVertices:samples.vertices,sampledTriangleCentroids:samples.triangleCentroids,totalSamples:ds.length,targetTriangles:targetTree.triangleCount,min:ds[0],median:quantile(ds,.5),p95:quantile(ds,.95),max:ds[ds.length-1],nearContactSamplesAt1eMinus5:ds.filter(d=>d<=1e-5).length};
}


function overlapsAabb(a,b,eps=1e-10){
 return a.lo.every((v,k)=>v<=b.hi[k]+eps&&b.lo[k]<=a.hi[k]+eps);
}
function triangleIntersection(a,b,eps=1e-9){
 const ea=[sub(a.b,a.a),sub(a.c,a.b),sub(a.a,a.c)];
 const eb=[sub(b.b,b.a),sub(b.c,b.b),sub(b.a,b.c)];
 const na=cross(ea[0],sub(a.c,a.a)),nb=cross(eb[0],sub(b.c,b.a));
 const la=Math.hypot(...na),lb=Math.hypot(...nb);
 if(la<eps||lb<eps)return "degenerate";
 const axes=[na,nb];
 for(const x of ea)for(const y of eb)axes.push(cross(x,y));
 for(const x of ea)axes.push(cross(na,x));
 for(const x of eb)axes.push(cross(nb,x));
 let coplanar=true;
 const unitA=na.map(v=>v/la);
 if(Math.hypot(...cross(na,nb))/(la*lb)>1e-7)coplanar=false;
 if(Math.abs(dot(unitA,sub(b.a,a.a)))>eps*10)coplanar=false;
 for(const axis of axes){
  const l=Math.hypot(...axis);if(l<eps)continue;
  const p=axis.map(v=>v/l);
  const pa=[dot(a.a,p),dot(a.b,p),dot(a.c,p)],pb=[dot(b.a,p),dot(b.b,p),dot(b.c,p)];
  if(Math.max(...pa)<Math.min(...pb)-eps||Math.max(...pb)<Math.min(...pa)-eps)return "separate";
 }
 return coplanar?"coplanar-unresolved":"intersect";
}
function trianglePairAudit(treeA,treeB){
 let broadPhasePairs=0,confirmedIntersections=0,coplanarUnresolvedPairs=0,degeneratePairs=0;
 function visit(a,b){
  if(!overlapsAabb(a,b))return;
  if(a.items&&b.items){
   for(const x of a.items)for(const y of b.items){
    if(!overlapsAabb(x,y))continue;
    broadPhasePairs++;
    const result=triangleIntersection(x,y);
    if(result==="intersect")confirmedIntersections++;
    else if(result==="coplanar-unresolved")coplanarUnresolvedPairs++;
    else if(result==="degenerate")degeneratePairs++;
   }
   return;
  }
  if(a.items){visit(a,b.left);visit(a,b.right);return;}
  if(b.items){visit(a.left,b);visit(a.right,b);return;}
  visit(a.left,b.left);visit(a.left,b.right);visit(a.right,b.left);visit(a.right,b.right);
 }
 visit(treeA.root,treeB.root);
 return {broadPhaseAabbCandidatePairs:broadPhasePairs,confirmedNonCoplanarTriangleIntersections:confirmedIntersections,coplanarUnresolvedPairs,degeneratePairs,algorithm:"BVH AABB pair pruning + 3D triangle SAT; coplanar pairs are deliberately unresolved",toleranceModelUnits:1e-9};
}

const sideMap={
 left:[["BM0078","humerus"],["BM0087","ulna"],["BM0075","fifthMetacarpal"]],
 right:[["BM0115","humerus"],["BM0123","ulna"],["BM0111","fifthMetacarpal"]]
};

const boneMeshes={};
for(const [id] of anchors){
 const p=find(host,id);boneMeshes[id]=await mesh(host,p,false);
}
const reports=[];
for(const id of donorIds){
 const p=find(donor,id),side=id.endsWith("M")?"left":"right";
 if(!/extensor carpi ulnaris/i.test(p.name))throw new Error("Unexpected donor ECU name "+id);
 const source=await mesh(donor,p,true),placedPoints=transformEcu(source.points,side),bb=bounds(placedPoints);
 const placedMesh={points:placedPoints,indices:source.indices};
 const ecuTree=buildTriangleTree(placedMesh.points,placedMesh.indices);
 const ecuSamples=surfaceSamples(placedMesh.points,placedMesh.indices);
 const comparisons=[];
 for(const [boneId,label] of sideMap[side]){
  const target=boneMeshes[boneId],targetTree=buildTriangleTree(target.points,target.indices);
  const targetSamples=surfaceSamples(target.points,target.indices);
  const triangleCollision=trianglePairAudit(ecuTree,targetTree);
  const ecuToBone=pointTriangleSummary(ecuSamples,targetTree);
  const boneToEcu=pointTriangleSummary(targetSamples,ecuTree);
  const threshold=1e-5;
  comparisons.push({
   target:label,targetPartId:boneId,
   ecuToBoneSurfaceDistances:ecuToBone,boneToEcuSurfaceDistances:boneToEcu,
   aabbGap:aabbGap(bb,bounds(target.points)),
   sampledNearContact:{thresholdModelUnits:threshold,ecuSamplesWithinThreshold:ecuToBone.nearContactSamplesAt1eMinus5,boneSamplesWithinThreshold:boneToEcu.nearContactSamplesAt1eMinus5},
   triangleCollision,
   intersectionStatus:triangleCollision.confirmedNonCoplanarTriangleIntersections>0?"non-coplanar triangle intersections detected":triangleCollision.coplanarUnresolvedPairs>0?"coplanar candidates unresolved":triangleCollision.degeneratePairs>0?"degenerate triangle pairs present":"no intersections detected by tested SAT cases"
  });
 }
 reports.push({donorPartId:id,side,sourceVertices:source.points.length,triangles:source.indices.length/3,transformedBounds:bb,comparisons});
}
const report={
 purpose:"In-memory, read-only ECU-to-bone proximity diagnostic after bridging the pinned ECU donor coordinate frame to the repository male atlas, then applying the repository male-to-female arm transform and soft-tissue posture operation.",
 donor:{revision:REVISION,version:donor.version??null},
 host:{version:host.version??null},
 transform:{sourceFrameBridge:{scale:sourceFrameBridge.scale,offset:sourceFrameBridge.offset,maxAnchorResidual:sourceFrameBridge.maxResidual,rmsAnchorResidual:sourceFrameBridge.rmsResidual},maleToFemaleArm:{scale:armTransform.scale,offset:armTransform.offset,maxAnchorResidual:armTransform.maxResidual,rmsAnchorResidual:armTransform.rmsResidual},posture:Object.fromEntries(Object.entries(posture).map(([k,v])=>[k,{turnDegrees:v.angle*180/Math.PI,reachScale:v.reachScale,blend:v.blend,donorSkinSamples:v.donorSkinSamples,hostSkinSamples:v.hostSkinSamples}]))},
 meshes:reports,
 metricDefinition:"For each mesh, query all vertices and all triangle centroids against a target triangle BVH using exact point-to-triangle closest-point distance. Run in both directions. This is a denser sampled surface diagnostic, not continuous Hausdorff distance or exact triangle-triangle collision detection. AABB gap is broad-phase only.",
 interpretationLimits:[
  "Small vertex distances indicate geometric proximity only, not anatomical attachment or a validated tendon footprint.",
  "The donor ECU is male-derived and the female arm bones are borrowed; this audit does not establish sex-specific anatomical fidelity.",
  "The coordinate bridge uses seven shared anchor bounding boxes; residuals must be reviewed before interpreting the resulting proximity metrics.",
  "Triangle pairs are broad-phase filtered by AABB and tested with a 3D separating-axis test. Non-coplanar intersections are reported; coplanar and degenerate pairs remain explicitly unresolved. This is not a continuous collision proof, signed-distance field, tissue simulation, or tendon insertion analysis.",
  "The two ECU records per side are reported separately; left and right are never mixed."
 ],
 filesChanged:false,geometryChanged:false,manifestChanged:false,viewerChanged:false,productionChanged:false
};
console.log(JSON.stringify(report,null,2));

const overlayDir=new URL("../ecu-overlay/",import.meta.url);
fs.mkdirSync(overlayDir,{recursive:true});
for(const side of ["left","right"]){
 const objects=[];
 for(const id of donorIds.filter(x=>(x.endsWith("M")?"left":"right")===side)){
  const p=find(donor,id),source=await mesh(donor,p,true);
  objects.push({name:id,material:side==="left"?"ecu_left":"ecu_right",points:transformEcu(source.points,side),indices:source.indices});
 }
 for(const [boneId,label] of sideMap[side]){
  const b=boneMeshes[boneId];
  objects.push({name:boneId+"_"+label,material:label,points:b.points,indices:b.indices});
 }
 const base=new URL(side+"-ecu-bone-overlay.obj",overlayDir);
 const objectsText=["# Read-only ECU and same-side bone overlay","mtllib ecu-overlay.mtl"];
 let offset=1;
 for(const obj of objects){
  objectsText.push(`o ${obj.name}`,`g ${obj.name}`,`usemtl ${obj.material}`);
  for(const p of obj.points)objectsText.push(`v ${p[0]} ${p[1]} ${p[2]}`);
  for(let i=0;i<obj.indices.length;i+=3)objectsText.push(`f ${obj.indices[i]+offset} ${obj.indices[i+1]+offset} ${obj.indices[i+2]+offset}`);
  offset+=obj.points.length;
 }
 fs.writeFileSync(base,objectsText.join("\n")+"\n");
}
fs.writeFileSync(new URL("ecu-overlay.mtl",overlayDir),[
 "newmtl ecu_right","Kd 0.95 0.32 0.12","Ka 0.08 0.08 0.08","",
 "newmtl ecu_left","Kd 0.95 0.62 0.12","Ka 0.08 0.08 0.08","",
 "newmtl humerus","Kd 0.82 0.78 0.68","Ka 0.08 0.08 0.08","",
 "newmtl ulna","Kd 0.35 0.72 0.92","Ka 0.08 0.08 0.08","",
 "newmtl fifth_metacarpal","Kd 0.38 0.82 0.55","Ka 0.08 0.08 0.08",""
].join("\n"));
console.log(JSON.stringify({overlayFiles:["ecu-overlay/left-ecu-bone-overlay.obj","ecu-overlay/right-ecu-bone-overlay.obj","ecu-overlay/ecu-overlay.mtl"],diagnosticOnly:true},null,2));

