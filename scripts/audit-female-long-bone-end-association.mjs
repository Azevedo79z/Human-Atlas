/**
 * Read-only long-bone endpoint-to-neighbor association screen.
 * Uses AABB endpoint slab centers and neighboring bone AABB centers.
 * Labels are geometric end-A/end-B only, never proximal/distal.
 */
const HOST_REVISION="c67dabc7189f90a17b7d3fe997d517913eb3474c";
const DONOR_REVISION="b0a20fa3a009ca5f6bfa07b7479312e04c862af2";
const HOST_URL=`https://raw.githubusercontent.com/Azevedo79z/Human-Atlas/${HOST_REVISION}/public/models/atlas-female.json`;
const DONOR_URL=`https://raw.githubusercontent.com/HiMahendraBeniwal/female-atlas/${DONOR_REVISION}/public/models/atlas.json`;
const SIDES=["Left","Right"];
const RELATIONSHIPS=[
 ["humerus-shoulder","humerus","scapula","shoulder"],
 ["humerus-elbow-radius","humerus","radius","elbow"],
 ["humerus-elbow-ulna","humerus","ulna","elbow"],
 ["radius-elbow","radius","humerus","elbow"],
 ["radius-wrist-scaphoid","radius","scaphoid","wrist"],
 ["ulna-elbow","ulna","humerus","elbow"],
 ["ulna-wrist-lunate","ulna","lunate","wrist"],
 ["femur-knee","femur","tibia","knee"],
 ["tibia-knee","tibia","femur","knee"],
 ["tibia-ankle","tibia","talus","ankle"],
 ["fibula-ankle","fibula","talus","ankle"],
];
async function load(url,label){
 const response=await fetch(url);
 if(!response.ok)throw new Error(label+" manifest HTTP "+response.status);
 const data=await response.json();
 if(!Array.isArray(data.parts))throw new Error(label+" parts[] missing");
 return data;
}
const center=b=>b[0].map((v,i)=>(v+b[1][i])/2);
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
function endpoints(bounds){
 const spans=bounds[1].map((v,i)=>v-bounds[0][i]);
 const axis=spans.indexOf(Math.max(...spans));
 const make=(coordinate)=>bounds[0].map((v,i)=>i===axis?coordinate:(bounds[0][i]+bounds[1][i])/2);
 const slab=spans[axis]*0.1;
 return {
  axis:["x","y","z"][axis],
  spanMm:spans[axis]*1000,
  endA:make(bounds[0][axis]+slab/2),
  endB:make(bounds[1][axis]-slab/2),
 };
}
function normalized(s){return s.trim().toLowerCase().replace(/\s+/g," ");}
function buildIndex(parts){return new Map(parts.filter(p=>p.system==="skeletal"&&p.bounds).map(p=>[normalized(p.name),p]));}
function screen(atlas,index,side,definition,hostMap){
 const target=index.get(normalized(side+" "+definition[1]));
 const neighbor=index.get(normalized(side+" "+definition[2]));
 if(!target||!neighbor)return {side,relationship:definition[0],status:"skipped",reason:!target?"target missing":"neighbor missing"};
 const mappedTarget=hostMap?hostMap.get(target.id.replace(/^BP3D_/,"")):target;
 const mappedNeighbor=hostMap?hostMap.get(neighbor.id.replace(/^BP3D_/,"")):neighbor;
 if(!mappedTarget?.bounds||!mappedNeighbor?.bounds)return {side,relationship:definition[0],status:"skipped",reason:"host source-ID match or bounds missing"};
 const e=endpoints(mappedTarget.bounds);
 const neighborCenter=center(mappedNeighbor.bounds);
 const dA=distance(e.endA,neighborCenter),dB=distance(e.endB,neighborCenter);
 return {
  side,relationship:definition[0],jointRegion:definition[3],status:"measured",
  target:{name:mappedTarget.name,id:mappedTarget.id},
  neighbor:{name:mappedNeighbor.name,id:mappedNeighbor.id},
  targetLongAxis:e.axis,targetLongAxisSpanMm:e.spanMm,
  endpointDistancesToNeighborCenterMm:{endA:dA*1000,endB:dB*1000},
  nearerGeometricEnd:dA<=dB?"end-A":"end-B",
  separationDifferenceMm:Math.abs(dA-dB)*1000,
  method:"distance from 10%-length endpoint-slab center to neighboring mesh AABB center",
  limit:"Geometric association only; not a joint center or proximal/distal assignment."
 };
}
const [host,donor]=await Promise.all([load(HOST_URL,"host"),load(DONOR_URL,"donor")]);
const hostMap=new Map(host.parts.filter(p=>p.system==="borrowed"&&p.conceptId?.startsWith("BORROWED:FJ")).map(p=>[p.conceptId.slice("BORROWED:".length),p]));
const donorIndex=buildIndex(donor.parts);
const results=[];
for(const side of SIDES)for(const relation of RELATIONSHIPS){
 results.push({
  donor:screen(donor,donorIndex,side,relation,null),
  host:screen(host,donorIndex,side,relation,hostMap),
 });
}
const report={
 purpose:"Identify which geometric end of each long bone lies nearer a named neighboring bone, as a prerequisite to later anatomical orientation review",
 pinnedRevisions:{host:HOST_REVISION,donor:DONOR_REVISION},
 matchedHostBorrowedParts:hostMap.size,
 measuredDonorRelationships:results.filter(r=>r.donor.status==="measured").length,
 measuredHostRelationships:results.filter(r=>r.host.status==="measured").length,
 skipped:results.filter(r=>r.donor.status!=="measured"||r.host.status!=="measured"),
 results,
 limits:[
  "The longest AABB axis is only a geometric approximation of a bone's longitudinal axis.",
  "Endpoint slab centers and neighboring AABB centers are not anatomical landmarks or joint centers.",
  "A nearer endpoint is not proof of proximal/distal identity or articular contact.",
  "Host and donor are evaluated independently; this does not register their coordinate frames.",
  "No mesh vertices, transforms, manifests, viewer, production assets, or deployment are modified."
 ]
};
console.log(JSON.stringify(report,null,2));
