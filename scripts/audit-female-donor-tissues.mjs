/**
 * Read-only preflight for female Visible Human cartilage and ligament STLs.
 *
 * Usage:
 *   node scripts/audit-female-donor-tissues.mjs PATH_TO_FINAL_STL_FOLDER
 *
 * The source archive is the University of Denver "Final 3D STL Models"
 * package for Visible Human Female (CC BY 4.0). This script does not modify
 * the atlas, write geometry, or alter the manifest. It inventories the
 * cartilage/ligament files and flags names that may overlap existing female
 * connective-tissue structures before any import is attempted.
 *
 * Source: https://digitalcommons.du.edu/visiblehuman/1/
 * Dataset DOI: https://doi.org/10.56902/COB.vh.2022.1
 * Publication DOI: https://doi.org/10.1038/s41597-022-01905-2
 */
import fs from 'node:fs';
import path from 'node:path';

const source=process.argv[2];
if(!source){
 console.error('Usage: node scripts/audit-female-donor-tissues.mjs PATH_TO_FINAL_STL_FOLDER');
 process.exit(1);
}
if(!fs.existsSync(source)||!fs.statSync(source).isDirectory()){
 console.error(`Not a directory: ${source}`);
 process.exit(1);
}
const manifestUrl=new URL('../public/models/atlas-female.json',import.meta.url);
const atlas=JSON.parse(fs.readFileSync(manifestUrl,'utf8'));

const files=[];
(function walk(folder){
 for(const entry of fs.readdirSync(folder,{withFileTypes:true})){
  const full=path.join(folder,entry.name);
  if(entry.isDirectory())walk(full);
  else if(entry.name.toLowerCase().endsWith('.stl'))files.push(full);
 }
})(source);

const parse=file=>{
 const match=/^VHF_(Left|Right)_(Bone|Muscle|Cartilage|Ligament)_(.+?)(?:_(?:smooth|final))?\.stl$/i.exec(path.basename(file));
 return match&&{
  side:match[1].toLowerCase(),
  kind:match[2].toLowerCase(),
  structure:match[3],
  file:path.basename(file),
  bytes:fs.statSync(file).size,
 };
};
const parsed=files.map(parse).filter(Boolean);
const tissues=parsed.filter(item=>item.kind==='cartilage'||item.kind==='ligament');
const connective=atlas.parts.filter(part=>part.system==='connective');
const normalise=value=>value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const aliases={
 anteriorcruciate:'anterior cruciate ligament',
 posteriorcruciate:'posterior cruciate ligament',
 medialcollateral:'medial collateral ligament',
 lateralcollateral:'lateral collateral ligament',
 femoroacetabular:'femoroacetabular cartilage',
 tibiofemoral:'tibiofemoral cartilage',
 patellofemoral:'patellofemoral cartilage',
 tibiotalar:'tibiotalar cartilage',
};
const canonical=item=>normalise(aliases[item.structure.toLowerCase()]??item.structure);
const overlapFor=item=>{
 const key=canonical(item);
 return connective.filter(part=>{
  const existing=normalise(part.name);
  return existing===key||existing.includes(key)||key.includes(existing);
 }).map(part=>({id:part.id,name:part.name}));
};
const byKind=Object.fromEntries(['cartilage','ligament'].map(kind=>{
 const entries=tissues.filter(item=>item.kind===kind);
 const structures=[...new Set(entries.map(item=>item.structure))].sort();
 const sides=Object.fromEntries(structures.map(structure=>[structure,
  ['left','right'].filter(side=>entries.some(item=>item.structure===structure&&item.side===side))
 ]));
 return [kind,{
  files:entries.length,
  structures,
  sides,
  possibleExistingMatches:entries.map(item=>({
   file:item.file,
   side:item.side,
   structure:item.structure,
   bytes:item.bytes,
   matches:overlapFor(item),
  })),
 }];
}));
const result={
 source:'Visible Human Female — University of Denver, Final 3D STL Models',
 license:'CC BY 4.0',
 expectedPerSpecimen:{cartilage:16,ligament:8},
 parsedStlFiles:parsed.length,
 unrecognisedStlFiles:files.length-parsed.length,
 connectivePartsAlreadyInAtlas:connective.length,
 byKind,
 safety:'READ ONLY — no manifest or geometry files were changed.',
};
console.log(JSON.stringify(result,null,2));
const counts=Object.fromEntries(['cartilage','ligament'].map(kind=>[kind,tissues.filter(item=>item.kind===kind).length]));
if(counts.cartilage!==16||counts.ligament!==8){
 console.error(`Expected 16 cartilage and 8 ligament STLs; found ${counts.cartilage} and ${counts.ligament}. Check that this is the female FINAL STL archive, not the smoothed or original package.`);
 process.exitCode=2;
}
