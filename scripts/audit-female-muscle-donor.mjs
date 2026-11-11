/**
 * Audit a candidate full-body muscle atlas against the current female reference.
 *
 * Usage:
 *   node scripts/audit-female-muscle-donor.mjs PATH_TO_CANDIDATE_ATLAS_JSON
 *
 * This is a metadata-only preflight. It compares named bone bounding-box centres
 * and estimates a uniform scale/translation under the 24 proper axis rotations.
 * It does NOT inspect vertices, deform meshes, or modify atlas-female.json.
 *
 * Candidate dataset:
 *   HiMahendraBeniwal/female-atlas
 *   pinned source revision: b0a20fa3a009ca5f6bfa07b7479312e04c862af2
 *
 * The candidate declares BodyParts3D and HuBMAP/HRA sources. Its muscles must
 * remain clearly labelled as reference/donor geometry unless a genuinely
 * female-specific source is independently verified.
 */
import fs from 'node:fs';

const candidatePath=process.argv[2];
if(!candidatePath){
 console.error('Usage: node scripts/audit-female-muscle-donor.mjs PATH_TO_CANDIDATE_ATLAS_JSON');
 process.exit(1);
}
const ownPath=new URL('../public/models/atlas-female.json',import.meta.url);
const own=JSON.parse(fs.readFileSync(ownPath,'utf8'));
const candidate=JSON.parse(fs.readFileSync(candidatePath,'utf8'));
if(!Array.isArray(own.parts)||!Array.isArray(candidate.parts))throw new Error('Both manifests must contain a parts array.');

const normalize=s=>s.toLowerCase().replace(/[()]/g,'').replace(/\\s+/g,' ').trim();
const centre=p=>p.bounds[0].map((v,i)=>(v+p.bounds[1][i])/2);
const find=(atlas,name,systems)=>atlas.parts.find(p=>
 normalize(p.name)===normalize(name)&&(!systems||systems.includes(p.system)));
const groups={
 'left arm':{
  systems:['borrowed'],
  anchors:[['Left clavicle','Left clavicle'],['Left scapula','Left scapula'],['Left humerus','Left humerus'],['Left radius','Left radius'],['Left ulna','Left ulna']]
 },
 'right arm':{
  systems:['borrowed'],
  anchors:[['Right clavicle','Right clavicle'],['Right scapula','Right scapula'],['Right humerus','Right humerus'],['Right radius','Right radius'],['Right ulna','Right ulna']]
 },
 'left leg':{
  systems:['skeletal'],
  anchors:[['Left femur','Femur (left)'],['Left patella','Patella (left)'],['Left tibia','Tibia (left)'],['Left fibula','Fibula (left)']]
 },
 'right leg':{
  systems:['skeletal'],
  anchors:[['Right femur','Femur (right)'],['Right patella','Patella (right)'],['Right tibia','Tibia (right)'],['Right fibula','Fibula (right)']]
 }
};

const rotations=[];
for(const [a,b,c] of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]){
 for(const sa of [1,-1])for(const sb of [1,-1])for(const sc of [1,-1]){
  const r=[[0,0,0],[0,0,0],[0,0,0]];
  r[0][a]=sa;r[1][b]=sb;r[2][c]=sc;
  const det=r[0][0]*(r[1][1]*r[2][2]-r[1][2]*r[2][1])
           -r[0][1]*(r[1][0]*r[2][2]-r[1][2]*r[2][0])
           +r[0][2]*(r[1][0]*r[2][1]-r[1][1]*r[2][0]);
  if(det>0)rotations.push(r);
 }
}
const spin=(r,p)=>r.map(row=>row.reduce((sum,v,i)=>sum+v*p[i],0));
const mean=points=>points.reduce((m,p)=>m.map((v,i)=>v+p[i]/points.length),[0,0,0]);
function fit(from,to,r){
 const turned=from.map(p=>spin(r,p)),a=mean(turned),b=mean(to);
 let numerator=0,denominator=0;
 for(let i=0;i<turned.length;i++)for(let k=0;k<3;k++){
  const x=turned[i][k]-a[k],y=to[i][k]-b[k];
  numerator+=x*y;denominator+=x*x;
 }
 const scale=denominator?numerator/denominator:1;
 const offset=b.map((v,k)=>v-scale*a[k]);
 const errors=turned.map((p,i)=>Math.hypot(...p.map((v,k)=>v*scale+offset[k]-to[i][k])));
 return {
  scale,offset,rotation:r,
  rms:Math.sqrt(errors.reduce((sum,x)=>sum+x*x,0)/errors.length),
  max:Math.max(...errors)
 };
}

const results=[];
for(const [label,group] of Object.entries(groups)){
 const pairs=group.anchors.map(([sourceName,ownName])=>{
  const source=find(candidate,sourceName,['skeletal']);
  const host=find(own,ownName,group.systems);
  if(!source||!host)throw new Error(`${label}: missing anchor "${sourceName}" -> "${ownName}".`);
  return {sourceName,from:centre(source),to:centre(host)};
 });
 const best=rotations.map(r=>fit(pairs.map(p=>p.from),pairs.map(p=>p.to),r)).sort((a,b)=>a.rms-b.rms)[0];
 results.push({
  region:label,anchors:pairs.length,
  scale:+best.scale.toFixed(4),
  rmsErrorMm:+(best.rms*1000).toFixed(1),
  maxErrorMm:+(best.max*1000).toFixed(1),
  rotation:best.rotation
 });
}

const donorMuscles=candidate.parts.filter(p=>p.system==='muscular');
const ownDonorMuscles=own.parts.filter(p=>p.system==='donor-muscle');
console.log(JSON.stringify({
 candidateVersion:candidate.version,
 candidateSource:candidate.source,
 candidateMuscleParts:donorMuscles.length,
 candidateUniqueMuscleLabels:new Set(donorMuscles.map(p=>p.name)).size,
 existingFemaleDonorMuscleParts:ownDonorMuscles.length,
 fitMethod:'bounding-box centres; uniform scale + translation; 24 proper axis rotations',
 meshGeometryValidated:false,
 regions:results,
 interpretation:results.map(r=>({
  region:r.region,
  result:r.maxErrorMm>30?'needs finer regional/posture fitting':'promising metadata fit',
  maxAnchorErrorMm:r.maxErrorMm
 }))
},null,2));
console.log('NOTE: This preflight is not permission to import. Vertex-level fit, anatomical attachments, duplicates, performance, and CC BY 4.0 attribution still require validation.');
