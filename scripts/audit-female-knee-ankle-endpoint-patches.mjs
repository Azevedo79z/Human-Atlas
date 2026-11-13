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
 const points=[],triangles=[],topologyTriangles=[],total=part.indexCount/3;
 const pointStride=Math.max(1,Math.floor(part.vertexCount/POINT_LIMIT));
 for(let i=0;i<part.vertexCount;i+=pointStride){
  const p=vertex(i);
  if(end==="min"?p[axis]<=threshold:p[axis]>=threshold)points.push(p);
 }

 for(let t=0;t<total;t++){
  const indices=[];
  for(let c=0;c<3;c++){
   const offset=part.indices+(t*3+c)*4;
   const idx=view.getUint32(offset,true);
   if(idx>=part.vertexCount)throw new Error(label+" invalid index in "+part.name);
   indices.push(idx);
  }
  const tri=indices.map(vertex);
  const centroid=tri[0].map((v,i)=>(v+tri[1][i]+tri[2][i])/3);
  if(end==="min"?centroid[axis]<=threshold:centroid[axis]>=threshold){
   topologyTriangles.push(indices);
   triangles.push(tri);
  }
 }
 const sampledPoints=points.filter((_,i)=>i%Math.max(1,Math.ceil(points.length/POINT_LIMIT))===0).slice(0,POINT_LIMIT);
 const sampledTriangles=triangles.filter((_,i)=>i%Math.max(1,Math.ceil(triangles.length/TRIANGLE_LIMIT))===0).slice(0,TRIANGLE_LIMIT);
 if(!sampledPoints.length||!sampledTriangles.length)throw new Error(label+" empty endpoint patch for "+part.name);
 return {points:sampledPoints,triangles:sampledTriangles,visualPatch:{points:sampledPoints,triangles:sampledTriangles},surfaceDescriptor:describePatch(sampledPoints,sampledTriangles),spatialTilesDescriptor:describeSpatialTiles(triangles,axis,sampledTriangles),topologyDescriptor:describePatchTopology(topologyTriangles,vertex),axis:["x","y","z"][axis],end,spanMm:spans[axis]*1000,thresholdMm:threshold*1000,sourceCounts:{vertices:part.vertexCount,triangles:total},patchCounts:{vertices:points.length,triangles:topologyTriangles.length},sampleCounts:{vertices:sampledPoints.length,triangles:sampledTriangles.length}};
}
function compareBilateralComponents(left,right){
 const reflectX=component=>({
  ...component,
  mirroredCentroidMm:[-component.centroidMm[0],component.centroidMm[1],component.centroidMm[2]],
  mirroredBoundsMm:[[-component.boundsMm[0][1],-component.boundsMm[0][0]],component.boundsMm[1],component.boundsMm[2]]
 });
 const mirrored=left.map(reflectX);
 const candidates=[];
 for(let li=0;li<mirrored.length;li++)for(let ri=0;ri<right.length;ri++){
  const a=mirrored[li],b=right[ri];
  const delta=sub(a.mirroredCentroidMm,b.centroidMm);
  const centroidDistanceMm=Math.sqrt(dot(delta,delta));
  const extentRatio=a.extentMm.map((value,axis)=>{
   const other=b.extentMm[axis];
   return Math.min(value,other)/Math.max(value,other,1e-9);
  });
  candidates.push({
   leftComponentIndex:li+1,rightComponentIndex:ri+1,
   leftTriangleCount:a.triangleCount,rightTriangleCount:b.triangleCount,
   mirroredCentroidDistanceMm:centroidDistanceMm,
   perAxisExtentSimilarity:extentRatio,
   meanExtentSimilarity:extentRatio.reduce((sum,value)=>sum+value,0)/3,
   mirroredCentroidMm:a.mirroredCentroidMm,rightCentroidMm:b.centroidMm,
   mirroredBoundsMm:a.mirroredBoundsMm,rightBoundsMm:b.boundsMm
  });
 }
 candidates.sort((a,b)=>a.mirroredCentroidDistanceMm-b.mirroredCentroidDistanceMm);
 const leftTotal=left.reduce((sum,item)=>sum+item.triangleCount,0);
 const rightTotal=right.reduce((sum,item)=>sum+item.triangleCount,0);
 const substantial=candidates.filter(item=>
  item.leftTriangleCount>=Math.max(5,Math.ceil(leftTotal*.05))&&
  item.rightTriangleCount>=Math.max(5,Math.ceil(rightTotal*.05))
 );
 return {
  method:"all-pairs candidate ranking after reflecting left-side X coordinates; no rigid registration or one-to-one assignment",
  leftComponentCount:left.length,rightComponentCount:right.length,
  minimumSubstantialComponentShare:0.05,
  nearestCentroidCandidates:candidates.slice(0,Math.min(10,candidates.length)),
  substantialComponentCandidates:substantial.slice(0,Math.min(10,substantial.length)),
  interpretationLimit:"Raw source-frame mirror comparison is sensitive to donor/host pose, coordinate origins, asymmetry, and crop boundaries. Candidate proximity is not anatomical equivalence. Tiny fragments are excluded only from the substantial-component shortlist, not from the full candidate ranking."
 };
}
function buildBilateralComparisons(results){
 const comparisons=[];
 for(const group of PAIRS.map(item=>item[0]))for(const atlas of ["donor","host"])for(const patchKey of ["patchA","patchB"]){
  const left=results.find(item=>item.side==="Left"&&item.group===group)?.[atlas]?.[patchKey]?.topologyDescriptor?.componentSpatialDescriptors;
  const right=results.find(item=>item.side==="Right"&&item.group===group)?.[atlas]?.[patchKey]?.topologyDescriptor?.componentSpatialDescriptors;
  if(left?.length&&right?.length)comparisons.push({group,atlas,structure:patchKey,comparison:compareBilateralComponents(left,right)});
 }
 return comparisons;
}
function describePatchTopology(triangles,vertex){
 const parent=triangles.map((_,index)=>index),rank=triangles.map(()=>0);
 const find=value=>{
  let root=value;
  while(parent[root]!==root)root=parent[root];
  while(parent[value]!==value){const next=parent[value];parent[value]=root;value=next;}
  return root;
 };
 const join=(a,b)=>{
  let ra=find(a),rb=find(b);
  if(ra===rb)return;
  if(rank[ra]<rank[rb])[ra,rb]=[rb,ra];
  parent[rb]=ra;
  if(rank[ra]===rank[rb])rank[ra]++;
 };
 const edges=new Map();
 for(let i=0;i<triangles.length;i++){
  const tri=triangles[i];
  for(let side=0;side<3;side++){
   const a=tri[side],b=tri[(side+1)%3],key=a<b?a+":"+b:b+":"+a;
   if(!edges.has(key))edges.set(key,[]);
   edges.get(key).push(i);
  }
 }
 let boundaryEdges=0,manifoldEdges=0,nonManifoldEdges=0;
 for(const incident of edges.values()){
  if(incident.length===1)boundaryEdges++;
  else if(incident.length===2){manifoldEdges++;join(incident[0],incident[1]);}
  else{nonManifoldEdges++;for(let i=1;i<incident.length;i++)join(incident[0],incident[i]);}
 }
 const stats=new Map();
 for(let i=0;i<triangles.length;i++){
  const root=find(i);
  if(!stats.has(root))stats.set(root,{triangleCount:0,vertexIds:new Set(),min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity],sum:[0,0,0]});
  const item=stats.get(root);
  item.triangleCount++;
  for(const index of triangles[i])item.vertexIds.add(index);
 }
 for(const item of stats.values()){
  for(const index of item.vertexIds){
   const point=vertex(index);
   for(let axis=0;axis<3;axis++){
    item.min[axis]=Math.min(item.min[axis],point[axis]);
    item.max[axis]=Math.max(item.max[axis],point[axis]);
    item.sum[axis]+=point[axis];
   }
  }
 }
 const componentDetails=[...stats.values()].map(item=>({
  triangleCount:item.triangleCount,
  uniqueVertexCount:item.vertexIds.size,
  centroidMm:item.sum.map(value=>value/item.vertexIds.size*1000),
  boundsMm:item.min.map((value,axis)=>[value*1000,item.max[axis]*1000]),
  extentMm:item.min.map((value,axis)=>(item.max[axis]-value)*1000)
 })).sort((a,b)=>b.triangleCount-a.triangleCount);
 const components=componentDetails.map(item=>item.triangleCount);
 return {
  method:"edge-connected components over every triangle whose centroid falls inside the AABB endpoint crop",
  croppedTriangleCount:triangles.length,
  uniqueUndirectedEdgeCount:edges.size,
  connectedComponentCount:components.length,
  largestComponentTriangleCount:components[0]||0,
  largestComponentShare:triangles.length?(components[0]||0)/triangles.length:0,
  componentTriangleCounts:components.slice(0,20),
  componentSpatialDescriptors:componentDetails.slice(0,20),
  boundaryEdgeCount:boundaryEdges,
  twoFaceManifoldEdgeCount:manifoldEdges,
  moreThanTwoFaceEdgeCount:nonManifoldEdges,
  interpretationLimit:"Boundary edges can be created by the geometric crop itself; they are not proof of holes. Components describe mesh connectivity, not anatomical structures or cartilage boundaries."
 };
}
function describeSpatialTiles(triangles,cropAxis,sampledTriangles){
 const axes=[0,1,2].filter(axis=>axis!==cropAxis);
 const centroids=triangles.map(tri=>[0,1,2].map(axis=>(tri[0][axis]+tri[1][axis]+tri[2][axis])/3));
 const min=[Infinity,Infinity],max=[-Infinity,-Infinity];
 for(const point of centroids)for(let i=0;i<2;i++){
  min[i]=Math.min(min[i],point[axes[i]]);
  max[i]=Math.max(max[i],point[axes[i]]);
 }
 const bins=4,tiles=new Map();
 let totalArea=0;
 for(let i=0;i<triangles.length;i++){
  const tri=triangles[i],centroid=centroids[i];
  const u=sub(tri[1],tri[0]),v=sub(tri[2],tri[0]);
  const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  const magnitude=Math.sqrt(dot(cross,cross));
  if(!Number.isFinite(magnitude)||magnitude<1e-12)continue;
  const area=magnitude/2;
  totalArea+=area;
  const indices=axes.map((axis,i)=>Math.min(bins-1,Math.max(0,Math.floor((centroid[axis]-min[i])/Math.max(max[i]-min[i],1e-12)*bins))));
  const key=indices.join(":");
  if(!tiles.has(key))tiles.set(key,{u:indices[0],v:indices[1],triangleCount:0,area:0,centroidSum:[0,0,0],normalSum:[0,0,0]});
  const tile=tiles.get(key);
  tile.triangleCount++;
  tile.area+=area;
  for(let axis=0;axis<3;axis++){
   tile.centroidSum[axis]+=centroid[axis]*area;
   tile.normalSum[axis]+=cross[axis]/magnitude*area;
  }
 }
 const descriptors=[...tiles.values()].map(tile=>{
  const normalLength=Math.sqrt(dot(tile.normalSum,tile.normalSum));
  return {
   tile:[tile.u,tile.v],
   triangleCount:tile.triangleCount,
   areaMm2:tile.area*1e6,
   areaShare:totalArea?tile.area/totalArea:0,
   centroidMm:tile.centroidSum.map(value=>value/tile.area*1000),
   areaWeightedMeanNormal:normalLength?tile.normalSum.map(value=>value/normalLength):[0,0,0]
  };
 }).sort((a,b)=>a.tile[1]-b.tile[1]||a.tile[0]-b.tile[0]);
 const sampledTriangleTiles=sampledTriangles.map(tri=>{
  const centroid=[0,1,2].map(axis=>(tri[0][axis]+tri[1][axis]+tri[2][axis])/3);
  const indices=axes.map((axis,i)=>Math.min(bins-1,Math.max(0,Math.floor((centroid[axis]-min[i])/Math.max(max[i]-min[i],1e-12)*bins))));
  return indices[1]*bins+indices[0];
 });
 return {
  method:"4x4 normalized spatial tiling of triangle centroids on the two axes orthogonal to the endpoint-crop axis; triangle area-weighted descriptors",
  gridSize:[bins,bins],
  cropAxis:["x","y","z"][cropAxis],
  inPlaneAxes:axes.map(axis=>["x","y","z"][axis]),
  occupiedTileCount:descriptors.length,
  totalTileCount:bins*bins,
  triangleCount:triangles.length,
  totalAreaMm2:totalArea*1e6,
  tiles:descriptors,
  inPlaneBoundsMm:axes.map((axis,i)=>[min[i]*1000,max[i]*1000]),
  sampledTriangleTiles,
  interpretationLimit:"Spatial tiles are neutral geometric bins, not anatomical regions or articular segmentation. Their boundaries depend on the crop and normalized extents; mean normals are winding-sensitive."
 };
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
  normalOrientationNote:"Normals are derived from triangle winding; signed components are winding-sensitive. Absolute components describe orientation relative to global axes, not anatomy.",
  localNormalVariation:describeNormalVariation(triangles)
 };
}
function describeNormalVariation(triangles){
 const samples=[];
 for(const tri of triangles){
  const u=sub(tri[1],tri[0]),v=sub(tri[2],tri[0]);
  const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  const magnitude=Math.sqrt(dot(normal,normal));
  if(!Number.isFinite(magnitude)||magnitude<1e-12)continue;
  samples.push({
   normal:normal.map(value=>value/magnitude),
   centroid:[0,1,2].map(axis=>(tri[0][axis]+tri[1][axis]+tri[2][axis])/3)
  });
 }
 const variation=[];
 let neighborPairs=0;
 for(let i=0;i<samples.length;i++){
  const nearest=[];
  for(let j=0;j<samples.length;j++){
   if(i===j)continue;
   const delta=sub(samples[i].centroid,samples[j].centroid);
   const distanceMm=Math.sqrt(dot(delta,delta))*1000;
   if(distanceMm>1e-6)nearest.push({sample:samples[j],distanceMm});
  }
  nearest.sort((a,b)=>a.distanceMm-b.distanceMm);
  for(const neighbor of nearest.slice(0,8)){
   const cosine=Math.max(-1,Math.min(1,dot(samples[i].normal,neighbor.sample.normal)));
   variation.push({
    radiansPerMm:Math.acos(cosine)/neighbor.distanceMm,
    angleDegrees:Math.acos(cosine)*180/Math.PI
   });
   neighborPairs++;
  }
 }
 const summarize=key=>{
  const values=variation.map(item=>item[key]).sort((a,b)=>a-b);
  const q=f=>values.length?values[Math.min(values.length-1,Math.floor((values.length-1)*f))]:0;
  return {
   mean:values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0,
   median:q(.5),
   p90:q(.9),
   samples:values.length
  };
 };
 return {
  method:"mean angular change between each sampled triangle normal and up to eight nearest sampled triangle-centroid neighbors, divided by centroid distance",
  validTriangleSamples:samples.length,
  neighborPairs,
  normalAngleDegrees:summarize("angleDegrees"),
  normalVariationRadiansPerMm:summarize("radiansPerMm"),
  interpretationLimit:"Sampling-density-dependent local normal-variation proxy; not a fitted principal curvature, anatomical surface classification, or cartilage measurement. Triangle winding inconsistencies can inflate angles."
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
 measured:results.length,skipped,results,bilateralComponentComparisons:buildBilateralComparisons(results),
 limits:[
  "AABB-derived endpoint regions are geometric crops, not anatomical articular patches.",
  "No cartilage, menisci, ligaments, joint capsule, or contact mechanics are represented.",
  "Sampled surface distances are not clinical joint-space measurements or proof of congruence.",
  "Host native aliases do not establish donor source-ID equivalence.",
  "No transforms, geometry, manifests, viewer, production assets, or deployment are modified."
 ]
},null,2));
