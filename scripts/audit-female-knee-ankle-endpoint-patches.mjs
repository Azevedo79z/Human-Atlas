/**
 * Read-only joint-end mesh patch proximity audit for female knee and ankle.
 * Crops each bone to the geometric end nearest its named neighbor, then
 * compares sampled points against sampled triangles in that end region.
 * This is a geometric candidate screen, not an articular surface classifier.
 */
const HOST_REVISION="c67dabc7189f90a17b7d3fe997d517913eb3474c";
const DONOR_REVISION="b0a20fa3a009ca5f6bfa07b7479312e04c862af2";
const HOST_BASE=`https://raw.githubusercontent.com/Azevedo79z/Human-Atlas/${HOST_REVISION}/public/`;
const DONOR_BASE=`https://raw.githubusercontent.com/HiMahendraBeniwal/female-atlas/${DONOR_REVISION}/public/`;
const PATCH_FRACTION=.28,POINT_LIMIT=500,TRIANGLE_LIMIT=800;
const SIDES=["Left","Right"];
const PAIRS=[
 ["knee-femur-tibia","femur","tibia"],
 ["ankle-tibia-talus","tibia","talus"],
 ["ankle-fibula-talus","fibula","talus"],
];
const HOST_ALIASES={
 femur:side=>`Femur (${side.toLowerCase()})`,
 tibia:side=>`Tibia (${side.toLowerCase()})`,
 fibula:side=>`Fibula (${side.toLowerCase()})`,
};
async function readManifest(base,label,file){
 const response=await fetch(new URL(file,base));
 if(!response.ok)throw new Error(label+" manifest HTTP "+response.status);
 const data=await response.json();
 if(!Array.isArray(data.parts)||!Array.isArray(data.chunks))throw new Error(label+" manifest schema invalid");
 return data;
}
const norm=s=>s.trim().toLowerCase().replace(/\s+/g," ");
const center=b=>b[0].map((v,i)=>(v+b[1][i])/2);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const cache=new Map();
async function readBuffer(atlas,base,part,label){
 const key=label+":"+part.chunk;
 if(!cache.has(key)){
  const metadata=atlas.chunks[part.chunk];
  if(!metadata)throw new Error(label+" missing chunk "+part.chunk);
  const response=await fetch(new URL(metadata.url.replace(/^\/+/, ""),base));
  if(!response.ok)throw new Error(label+" chunk HTTP "+response.status);
  const buffer=await response.arrayBuffer();
  if(metadata.bytes!==undefined&&buffer.byteLength!==metadata.bytes)throw new Error(label+" chunk byte length mismatch");
  cache.set(key,buffer);
 }
 return cache.get(key);
}
function closestPoint(p,a,b,c){
 const ab=sub(b,a),ac=sub(c,a),ap=sub(p,a),d1=dot(ab,ap),d2=dot(ac,ap);
 if(d1<=0&&d2<=0)return a;
 const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);
 if(d3>=0&&d4<=d3)return b;
 const vc=d1*d4-d3*d2;
 if(vc<=0&&d1>=0&&d3<=0){const v=d1/(d1-d3);return a.map((x,i)=>x+v*ab[i]);}
 const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);
 if(d6>=0&&d5<=d6)return c;
 const vb=d5*d2-d1*d6;
 if(vb<=0&&d2>=0&&d6<=0){const w=d2/(d2-d6);return a.map((x,i)=>x+w*ac[i]);}
 const va=d3*d6-d5*d4;
 if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0){const w=(d4-d3)/((d4-d3)+(d5-d6));return b.map((x,i)=>x+w*(c[i]-b[i]));}
 const inv=1/(va+vb+vc),v=vb*inv,w=vc*inv;
 return a.map((x,i)=>x+ab[i]*v+ac[i]*w);
}
async function loadPatch(atlas,base,part,neighbor,label){
 const bounds=part.bounds,spans=bounds[1].map((v,i)=>v-bounds[0][i]);
 const axis=spans.indexOf(Math.max(...spans));
 const neighborCenter=center(neighbor.bounds);
 const end= Math.abs(neighborCenter[axis]-bounds[0][axis])<=Math.abs(neighborCenter[axis]-bounds[1][axis])?"min":"max";
 const threshold=end==="min"?bounds[0][axis]+spans[axis]*PATCH_FRACTION:bounds[1][axis]-spans[axis]*PATCH_FRACTION;
 const buffer=await readBuffer(atlas,base,part,label),view=new DataView(buffer);
 const vertex=(index)=>{
  const offset=part.positions+index*12;
  return [0,1,2].map(i=>view.getFloat32(offset+i*4,true));
 };
 const points=[],triangles=[],total=part.indexCount/3;
 const pointStride=Math.max(1,Math.floor(part.vertexCount/POINT_LIMIT));
 for(let i=0;i<part.vertexCount;i+=pointStride){
  const p=vertex(i);
  if(end==="min"?p[axis]<=threshold:p[axis]>=threshold)points.push(p);
 }
 const triStride=Math.max(1,Math.floor(total/(TRIANGLE_LIMIT*4)));
 for(let t=0;t<total;t+=triStride){
  const tri=[];
  for(let c=0;c<3;c++){
   const offset=part.indices+(t*3+c)*4;
   const idx=view.getUint32(offset,true);
   if(idx>=part.vertexCount)throw new Error(label+" invalid index in "+part.name);
   tri.push(vertex(idx));
  }
  const centroid=tri[0].map((v,i)=>(v+tri[1][i]+tri[2][i])/3);
  if(end==="min"?centroid[axis]<=threshold:centroid[axis]>=threshold)triangles.push(tri);
 }
 const sampledPoints=points.filter((_,i)=>i%Math.max(1,Math.ceil(points.length/POINT_LIMIT))===0).slice(0,POINT_LIMIT);
 const sampledTriangles=triangles.filter((_,i)=>i%Math.max(1,Math.ceil(triangles.length/TRIANGLE_LIMIT))===0).slice(0,TRIANGLE_LIMIT);
 if(!sampledPoints.length||!sampledTriangles.length)throw new Error(label+" empty endpoint patch for "+part.name);
 return {points:sampledPoints,triangles:sampledTriangles,visualPatch:{points:sampledPoints,triangles:sampledTriangles},surfaceDescriptor:describePatch(sampledPoints,sampledTriangles),axis:["x","y","z"][axis],end,spanMm:spans[axis]*1000,thresholdMm:threshold*1000,sourceCounts:{vertices:part.vertexCount,triangles:total},patchCounts:{vertices:points.length,triangles:triangles.length},sampleCounts:{vertices:sampledPoints.length,triangles:sampledTriangles.length}};
}
function describePatch(points,triangles){
 const centroid=[0,1,2].map(axis=>points.reduce((sum,p)=>sum+p[axis],0)/points.length);
 const min=[0,1,2].map(axis=>Math.min(...points.map(p=>p[axis])));
 const max=[0,1,2].map(axis=>Math.max(...points.map(p=>p[axis])));
 let area=0,valid=0;
 const normalSum=[0,0,0],normalAbsSum=[0,0,0];
 for(const tri of triangles){
  const u=sub(tri[1],tri[0]),v=sub(tri[2],tri[0]);
  const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  const magnitude=Math.sqrt(dot(n,n));
  if(!Number.isFinite(magnitude)||magnitude<1e-12)continue;
  area+=magnitude/2;
  for(let axis=0;axis<3;axis++){normalSum[axis]+=n[axis]/magnitude;normalAbsSum[axis]+=Math.abs(n[axis]/magnitude);}
  valid++;
 }
 return {
  sampledSurfaceAreaMm2:area*1e6,
  sampledTriangleCount:triangles.length,
  validNormalCount:valid,
  centroidMm:centroid.map(v=>v*1000),
  boundsMm:min.map((v,i)=>[v*1000,max[i]*1000]),
  extentMm:min.map((v,i)=>(max[i]-v)*1000),
  meanSignedNormal:normalSum.map(v=>valid?v/valid:0),
  meanAbsoluteNormal:normalAbsSum.map(v=>valid?v/valid:0),
  normalOrientationNote:"Normals are derived from triangle winding; signed components are winding-sensitive. Absolute components describe orientation relative to global axes, not anatomy."
 };
}
function directed(points,triangles){
 const values=points.map(p=>{
  let best=Infinity;
  for(const tri of triangles){const q=closestPoint(p,...tri);best=Math.min(best,dot(sub(p,q),sub(p,q)));}
  return Math.sqrt(best)*1000;
 }).sort((a,b)=>a-b);
 const q=f=>values[Math.min(values.length-1,Math.floor((values.length-1)*f))];
 return {minMm:values[0],medianMm:q(.5),p90Mm:q(.9),maxMm:values.at(-1),samples:values.length};
}
function symmetric(a,b){return {aToB:directed(a.points,b.triangles),bToA:directed(b.points,a.triangles)};}
function resolveHost(host,donorPart,side,structure,sourceMap){
 const sourceId=donorPart.id.replace(/^BP3D_/,""),borrowed=sourceMap.get(sourceId);
 if(borrowed?.bounds)return {part:borrowed,method:"exact-source-id"};
 const alias=HOST_ALIASES[structure]?.(side);
 const native=alias&&host.parts.find(p=>p.system==="skeletal"&&norm(p.name||"")===norm(alias)&&p.bounds);
 return native?{part:native,method:"native-exact-name"}:{part:null,method:alias?"native-alias-not-found":"source-id-not-found"};
}
const [host,donor]=await Promise.all([
 readManifest(HOST_BASE,"Host","models/atlas-female.json"),
 readManifest(DONOR_BASE,"Donor","models/atlas.json"),
]);
const donorIndex=new Map(donor.parts.filter(p=>p.system==="skeletal"&&p.bounds).map(p=>[norm(p.name),p]));
const sourceMap=new Map(host.parts.filter(p=>p.system==="borrowed"&&p.conceptId?.startsWith("BORROWED:FJ")).map(p=>[p.conceptId.slice("BORROWED:".length),p]));
const results=[],skipped=[];
for(const side of SIDES)for(const [group,aName,bName] of PAIRS){
 const a=donorIndex.get(norm(side+" "+aName)),b=donorIndex.get(norm(side+" "+bName));
 if(!a||!b){skipped.push({side,group,reason:"donor named pair missing"});continue;}
 const ha=resolveHost(host,a,side,aName,sourceMap),hb=resolveHost(host,b,side,bName,sourceMap);
 if(!ha.part||!hb.part){skipped.push({side,group,reason:"host pair unresolved",targetResolution:ha.method,neighborResolution:hb.method});continue;}
 const [da,db,hap,hbp]=await Promise.all([
  loadPatch(donor,DONOR_BASE,a,b,"donor"),loadPatch(donor,DONOR_BASE,b,a,"donor"),
  loadPatch(host,HOST_BASE,ha.part,hb.part,"host"),loadPatch(host,HOST_BASE,hb.part,ha.part,"host"),
 ]);
 results.push({
  side,group,
  donor:{parts:[a.name,b.name],targetResolution:"donor-native",patchA:da,patchB:db,distances:symmetric(da,db)},
  host:{parts:[ha.part.name,hb.part.name],targetResolution:[ha.method,hb.method],patchA:hap,patchB:hbp,distances:symmetric(hap,hbp)},
  interpretation:"End-region surface proximity only. Endpoint regions are defined by the longest AABB axis and the neighboring mesh AABB center; they are not anatomically segmented articular surfaces."
 });
}
console.log(JSON.stringify({
 purpose:"Compare endpoint-region mesh proximity at female knee and ankle between donor and host",
 pinnedRevisions:{host:HOST_REVISION,donor:DONOR_REVISION},
 patchDefinition:{longestAabbAxis:true,selectedEnd:"end nearest neighboring mesh AABB center",fractionOfAxisLength:PATCH_FRACTION,pointSampleLimit:POINT_LIMIT,triangleSampleLimit:TRIANGLE_LIMIT},
 measured:results.length,skipped,results,
 limits:[
  "AABB-derived endpoint regions are geometric crops, not anatomical articular patches.",
  "No cartilage, menisci, ligaments, joint capsule, or contact mechanics are represented.",
  "Sampled surface distances are not clinical joint-space measurements or proof of congruence.",
  "Host native aliases do not establish donor source-ID equivalence.",
  "No transforms, geometry, manifests, viewer, production assets, or deployment are modified."
 ]
},null,2));
