/**
 * Read-only preflight for BoneHub's Visible Human Female full-skeleton STL set.
 * Usage: node scripts/audit-visible-human-female-bones.mjs PATH_TO_02_Female
 * The input must be the extracted CT/Mesh/02_Female directory.
 * This script never changes the atlas manifest or geometry.
 */
import fs from 'node:fs';
import path from 'node:path';
const source=process.argv[2];
if(!source){console.error('Usage: node scripts/audit-visible-human-female-bones.mjs PATH_TO_02_Female');process.exit(1);}
if(!fs.existsSync(source)||!fs.statSync(source).isDirectory()){console.error(`Not a directory: ${source}`);process.exit(1);}
const resolved=path.resolve(source);
if(!/(^|[\\/])02_Female$/i.test(resolved)){console.error('Safety stop: input directory must be named 02_Female.');process.exit(1);}
const files=[];
(function walk(folder){for(const entry of fs.readdirSync(folder,{withFileTypes:true})){const full=path.join(folder,entry.name);if(entry.isDirectory())walk(full);else if(entry.name.toLowerCase().endsWith('.stl'))files.push(full);}})(resolved);
const rel=file=>path.relative(resolved,file).split(path.sep).join('/');
const regions={};
for(const file of files){const name=rel(file),region=name.split('/')[0]||'ROOT';(regions[region]??=[]).push({file:name,bytes:fs.statSync(file).size});}
for(const entries of Object.values(regions))entries.sort((a,b)=>a.file.localeCompare(b.file));
const names=files.map(file=>path.basename(file).toLowerCase());
const duplicates=[...new Set(names.filter((name,index)=>names.indexOf(name)!==index))].sort();
const atlas=JSON.parse(fs.readFileSync(new URL('../public/models/atlas-female.json',import.meta.url),'utf8'));
const borrowed=atlas.parts.filter(part=>String(part.system).startsWith('borrowed'));
const report={source:'BoneHub / Visible Human Female — CT-derived bone meshes',subjectFolder:'02_Female',license:'CC BY 4.0',expectedFemaleBoneLabels:143,foundStlFiles:files.length,countMatchesExpected:files.length===143,regions:Object.fromEntries(Object.entries(regions).map(([key,value])=>[key,{files:value.length,totalBytes:value.reduce((sum,item)=>sum+item.bytes,0),inventory:value.map(item=>item.file)}])),duplicateBasenames:duplicates,currentAtlas:{femaleManifestParts:atlas.parts.length,nativeSkeletalMeshes:atlas.parts.filter(p=>p.system==='skeletal').length,borrowedMeshes:borrowed.length,borrowedNames:borrowed.map(p=>p.name).sort()},knownLimitations:['Elbow region incomplete; distal humerus and proximal radius/ulna are truncated.','Phalanges grouped per digit, not separated individually.','Cranium and maxilla combined; mandible separate.','Sacrum includes coccyx; sternum is not divided.','Hyoid, most sesamoids and costal cartilages absent.','Hands and feet stored separately from limb folders.'],safety:'READ ONLY — no manifest or geometry changed.'};
console.log(JSON.stringify(report,null,2));
if(files.length!==143||duplicates.length){console.error(`Expected 143 STL files and no duplicate basenames; found ${files.length} and ${duplicates.length}.`);process.exitCode=2;}
