/**
 * Read-only source coverage audit for female lower-limb skeletal parts.
 * Checks exact donor source-ID mapping and host name candidates.
 */
const HOST_REVISION="c67dabc7189f90a17b7d3fe997d517913eb3474c";
const DONOR_REVISION="b0a20fa3a009ca5f6bfa07b7479312e04c862af2";
const HOST_URL=`https://raw.githubusercontent.com/Azevedo79z/Human-Atlas/${HOST_REVISION}/public/models/atlas-female.json`;
const DONOR_URL=`https://raw.githubusercontent.com/HiMahendraBeniwal/female-atlas/${DONOR_REVISION}/public/models/atlas.json`;
const SIDES=["Left","Right"];
const STRUCTURES=["femur","tibia","fibula","patella","talus","calcaneus","scaphoid","lunate","humerus","radius","ulna"];
async function load(url,label){
 const response=await fetch(url);
 if(!response.ok)throw new Error(label+" manifest HTTP "+response.status);
 const data=await response.json();
 if(!Array.isArray(data.parts))throw new Error(label+" parts[] missing");
 return data;
}
const norm=s=>s.trim().toLowerCase().replace(/\s+/g," ");
const [host,donor]=await Promise.all([load(HOST_URL,"host"),load(DONOR_URL,"donor")]);
const hostBySource=new Map(host.parts.filter(p=>p.system==="borrowed"&&p.conceptId?.startsWith("BORROWED:")).map(p=>[p.conceptId.slice("BORROWED:".length),p]));
const hostByName=new Map();
for(const p of host.parts){const key=norm(p.name||"");if(!hostByName.has(key))hostByName.set(key,[]);hostByName.get(key).push(p);}
const donorByName=new Map(donor.parts.filter(p=>p.system==="skeletal").map(p=>[norm(p.name||""),p]));
const rows=[];
for(const side of SIDES)for(const structure of STRUCTURES){
 const name=side+" "+structure;
 const donorPart=donorByName.get(norm(name));
 if(!donorPart){rows.push({name,status:"donor-part-not-found"});continue;}
 const sourceId=donorPart.id.replace(/^BP3D_/,"");
 const sourceMatch=hostBySource.get(sourceId);
 const nameMatches=hostByName.get(norm(name))||[];
 const candidates=host.parts.filter(p=>{
  const pn=norm(p.name||"");
  return pn.includes(norm(side))&&pn.includes(norm(structure));
 }).map(p=>({name:p.name,id:p.id,system:p.system,conceptId:p.conceptId||null,hasBounds:!!p.bounds}));
 rows.push({
  name,donorId:donorPart.id,donorSourceId:sourceId,
  exactSourceIdMatch:sourceMatch?{name:sourceMatch.name,id:sourceMatch.id,system:sourceMatch.system,conceptId:sourceMatch.conceptId||null,hasBounds:!!sourceMatch.bounds}:null,
  exactNameMatches:nameMatches.map(p=>({name:p.name,id:p.id,system:p.system,conceptId:p.conceptId||null,hasBounds:!!p.bounds})),
  tokenCandidates:candidates,
  status:sourceMatch?"exact-source-id-mapped":nameMatches.length?"name-match-without-source-id":"no-host-name-candidate",
 });
}
const counts={};
for(const row of rows)counts[row.status]=(counts[row.status]||0)+1;
const report={
 purpose:"Determine whether lower-limb relationship gaps reflect absent host parts, non-source-matched equivalents, or naming differences",
 pinnedRevisions:{host:HOST_REVISION,donor:DONOR_REVISION},
 hostParts:host.parts.length,donorParts:donor.parts.length,
 checkedParts:rows.length,counts,rows,
 limits:[
  "A name candidate is not proof of anatomical equivalence.",
  "A missing exact source ID does not by itself prove the structure is absent from the 3D scene.",
  "This report inspects manifest metadata only; it does not load or modify mesh geometry.",
  "No geometry, transforms, manifests, viewer, production assets, or deployment are changed."
 ]
};
console.log(JSON.stringify(report,null,2));
