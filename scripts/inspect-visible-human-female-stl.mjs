/**
 * Read-only geometry QA for BoneHub Visible Human Female STL meshes.
 * Usage: node scripts/inspect-visible-human-female-stl.mjs PATH_TO_02_Female
 * Reports STL format, triangle count, bounds and degenerate facets.
 * Coordinates are reported in source units; STL has no unit metadata.
 * This script never modifies files or Atlas manifests.
 */
import fs from 'node:fs';
import path from 'node:path';

const source=process.argv[2];
if(!source){console.error('Usage: node scripts/inspect-visible-human-female-stl.mjs PATH_TO_02_Female');process.exit(1);}
if(!fs.existsSync(source)||!fs.statSync(source).isDirectory()){console.error(`Not a directory: ${source}`);process.exit(1);}
const root=path.resolve(source);
if(!/(^|[\\/])02_Female$/i.test(root)){console.error('Safety stop: input directory must be named 02_Female.');process.exit(1);}
const files=[];
(function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.name.toLowerCase().endsWith('.stl'))files.push(p);}})(root);
const results=[];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
for(const file of files){
 const buf=fs.readFileSync(file), rel=path.relative(root,file).split(path.sep).join('/');
 let format='unknown',triangles=0,degenerate=0,lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 const add=v=>{for(let k=0;k<3;k++){if(!Number.isFinite(v[k]))throw new Error('non-finite vertex');lo[k]=Math.min(lo[k],v[k]);hi[k]=Math.max(hi[k],v[k]);}};
 try{
  const count=buf.length>=84?buf.readUInt32LE(80):-1;
  if(count>=0&&84+count*50===buf.length){
   format='binary';triangles=count;
   for(let i=0;i<count;i++){
    const off=84+i*50,verts=[];
    for(let j=0;j<3;j++){const v=[buf.readFloatLE(off+12+j*12),buf.readFloatLE(off+16+j*12),buf.readFloatLE(off+20+j*12)];verts.push(v);add(v);}
    if(Math.hypot(...cross(sub(verts[1],verts[0]),sub(verts[2],verts[0])))<1e-10)degenerate++;
   }
  }else{
   const txt=buf.toString('utf8');
   const re=/\\bvertex\\s+([-+\\d.eE]+)\\s+([-+\\d.eE]+)\\s+([-+\\d.eE]+)/g;let m,verts=[];
   while((m=re.exec(txt))){const v=m.slice(1,4).map(Number);add(v);verts.push(v);if(verts.length===3){triangles++;if(Math.hypot(...cross(sub(verts[1],verts[0]),sub(verts[2],verts[0])))<1e-10)degenerate++;verts=[];}}
   if(!triangles)throw new Error('not recognized as binary or ASCII STL');
   format='ascii';
  }
  const size=lo.map((v,i)=>hi[i]-v),diagonal=Math.hypot(...size);
  results.push({file:rel,format,bytes:buf.length,triangles,degenerateFacets:degenerate,bounds:{min:lo,max:hi},dimensions:size,diagonal});
 }catch(err){results.push({file:rel,format:'invalid',bytes:buf.length,error:err.message});}
}
const valid=results.filter(x=>x.format!=='invalid');
const report={safety:'READ ONLY — no source files or Atlas assets changed.',sourceFolder:'02_Female',fileCount:files.length,validStlFiles:valid.length,invalidFiles:results.filter(x=>x.format==='invalid'),totalTriangles:valid.reduce((n,x)=>n+x.triangles,0),totalDegenerateFacets:valid.reduce((n,x)=>n+x.degenerateFacets,0),formatCounts:valid.reduce((o,x)=>(o[x.format]=(o[x.format]||0)+1,o),{}),unitWarning:'STL files do not encode physical units. Bounds are raw coordinates and must not be interpreted as mm or cm until verified against source documentation and anatomical landmarks.',meshes:results};
console.log(JSON.stringify(report,null,2));
if(!valid.length||results.some(x=>x.format==='invalid')||valid.some(x=>x.degenerateFacets>0))process.exitCode=2;
