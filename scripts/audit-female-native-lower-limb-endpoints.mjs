/**
 * Read-only endpoint association audit using explicitly reviewed host name aliases
 * for lower-limb bones that are native skeletal parts rather than borrowed source IDs.
 */
const HOST_REVISION="c67dabc7189f90a17b7d3fe997d517913eb3474c";
const DONOR_REVISION="b0a20fa3a009ca5f6bfa07b7479312e04c862af2";
const HOST_URL=`https://raw.githubusercontent.com/Azevedo79z/Human-Atlas/${HOST_REVISION}/public/models/atlas-female.json`;
const DONOR_URL=`https://raw.githubusercontent.com/HiMahendraBeniwal/female-atlas/${DONOR_REVISION}/public/models/atlas.json`;
const SIDES=["Left","Right"];
const PAIRS=[
 ["femur-knee","femur","tibia","knee"],
 ["tibia-knee","tibia","femur","knee"],
 ["tibia-ankle","tibia","talus","ankle"],
 ["fibula-ankle","fibula","talus","ankle"],
 ["femur-patella","femur","patella","knee"],
 ["patella-femur","patella","femur","knee"],
];
const HOST_ALIASES={
 femur:side=>`Femur (${side.toLowerCase()})`,
 tibia:side=>`Tibia (${side.toLowerCase()})`,
 fibula:side=>`Fibula (${side.toLowerCase()})`,
 patella:side=>`Patella (${side.toLowerCase()})`,
};
async function load(url,label){
 const response=await fetch(url);
 if(!response.ok)throw new Error(label+" manifest HTTP "+response.status);
 const data=await response.json();
 if(!Array.isArray(data.parts))throw new Error(label+" parts[] missing");
 return data;
}
const norm=s=>s.trim().toLowerCase().replace(/\s+/g," ");
const center=b=>b[0].map((v,i)=>(v+b[1][i])/2);
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
function endpointData(bounds){
 const spans=bounds[1].map((v,i)=>v-bounds[0][i]);
 const axis=spans.indexOf(Math.max(...spans));
 const slab=spans[axis]*.1;
 const point=coord=>bounds[0].map((_,i)=>i===axis?coord:(bounds[0][i]+bounds[1][i])/2);
 return {axis:["x","y","z"][axis],spanMm:spans[axis]*1000,endA:point(bounds[0][axis]+slab/2),endB:point(bounds[1][axis]-slab/2)};
}
function resolveHostPart(host,donorPart,side,structure,sourceMap){
 const sourceId=donorPart.id.replace(/^BP3D_/,"");
 const borrowed=sourceMap.get(sourceId);
 if(borrowed?.bounds)return {part:borrowed,method:"exact-source-id"};
 const alias=HOST_ALIASES[structure]?.(side);
 if(!alias)return {part:null,method:"no-explicit-alias"};
 const candidate=host.parts.find(p=>p.system==="skeletal"&&norm(p.name||"")===norm(alias)&&p.bounds);
 return candidate?{part:candidate,method:"explicit-host-name-alias"}:{part:null,method:"alias-not-found"};
}
function compare(donorA,donorB,hostA,hostB,side,relation){
 const donorEnds=endpointData(donorA.bounds),hostEnds=endpointData(hostA.part.bounds);
 const donorNeighbor=center(donorB.bounds),hostNeighbor=center(hostB.part.bounds);
 const da=distance(donorEnds.endA,donorNeighbor),db=distance(donorEnds.endB,donorNeighbor);
 const ha=distance(hostEnds.endA,hostNeighbor),hb=distance(hostEnds.endB,hostNeighbor);
 return {
  side,relationship:relation[0],jointRegion:relation[3],
  donor:{target:donorA.name,neighbor:donorB.name,longAxis:donorEnds.axis,spanMm:donorEnds.spanMm,endADistanceMm:da*1000,endBDistanceMm:db*1000,nearerEnd:da<=db?"end-A":"end-B"},
  host:{target:hostA.part.name,neighbor:hostB.part.name,targetResolution:hostA.method,neighborResolution:hostB.method,longAxis:hostEnds.axis,spanMm:hostEnds.spanMm,endADistanceMm:ha*1000,endBDistanceMm:hb*1000,nearerEnd:ha<=hb?"end-A":"end-B"},
  sameGeometricEndSelected:(da<=db)===(ha<=hb),
  limits:"Endpoint slab centers versus neighboring AABB centers; not anatomical landmarks or proximal/distal assignments."
 };
}
const [host,donor]=await Promise.all([load(HOST_URL,"host"),load(DONOR_URL,"donor")]);
const donorIndex=new Map(donor.parts.filter(p=>p.system==="skeletal"&&p.bounds).map(p=>[norm(p.name),p]));
const hostSourceMap=new Map(host.parts.filter(p=>p.system==="borrowed"&&p.conceptId?.startsWith("BORROWED:")).map(p=>[p.conceptId.slice("BORROWED:".length),p]));
const rows=[],skipped=[];
for(const side of SIDES)for(const relation of PAIRS){
 const donorA=donorIndex.get(norm(side+" "+relation[1]));
 const donorB=donorIndex.get(norm(side+" "+relation[2]));
 if(!donorA||!donorB){skipped.push({side,relationship:relation[0],reason:"donor pair missing"});continue;}
 const hostA=resolveHostPart(host,donorA,side,relation[1],hostSourceMap);
 const hostB=resolveHostPart(host,donorB,side,relation[2],hostSourceMap);
 if(!hostA.part||!hostB.part){skipped.push({side,relationship:relation[0],reason:"host target or neighbor not resolved",targetResolution:hostA.method,neighborResolution:hostB.method});continue;}
 rows.push(compare(donorA,donorB,hostA,hostB,side,relation));
}
const report={
 purpose:"Check whether native host lower-limb skeletal parts preserve the same geometric endpoint-to-neighbor association as the donor",
 pinnedRevisions:{host:HOST_REVISION,donor:DONOR_REVISION},
 explicitHostAliases:HOST_ALIASES,
 measuredRelationships:rows.length,skipped,
 sameEndCount:rows.filter(r=>r.sameGeometricEndSelected).length,
 differentEndCount:rows.filter(r=>!r.sameGeometricEndSelected).length,
 results:rows,
 limits:[
  "Host aliases are exact manifest names selected for this audit; they are not source-ID equivalence claims.",
  "The longest AABB dimension may not match the anatomical shaft axis.",
  "Endpoint and neighbor centers are coarse geometric proxies, not joint centers or articular surfaces.",
  "Matching end-A/end-B does not prove correct orientation, contact, congruence, or proximal/distal identity.",
  "No transforms, geometry, manifests, viewer, production assets, or deployment are modified."
 ]
};
console.log(JSON.stringify(report,null,2));
