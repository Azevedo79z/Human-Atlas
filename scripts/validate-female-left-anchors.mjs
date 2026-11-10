import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const directory=process.argv[2];
const output=process.argv.includes('--out')?process.argv[process.argv.indexOf('--out')+1]:null;
if(!directory)throw new Error('Usage: node scripts/validate-female-left-anchors.mjs DIRECTORY [--out report.json]');

const expected=['FEMUR_LEFT','FIBULA_LEFT','HIP_LEFT','PATELLA_LEFT','TIBIA_LEFT'];
const parseStl=file=>{
 const b=fs.readFileSync(file),count=b.length>=84?b.readUInt32LE(80):0,points=[];
 let format='binary';
 if(count>0&&84+count*50===b.length){
  for(let t=0;t<count;t++){const at=84+t*50+12;for(let v=0;v<9;v++)points.push(b.readFloatLE(at+v*4));}
 }else{
  format='ascii';const s=b.toString('latin1');
  if(!/^\\s*solid/i.test(s))throw new Error(path.basename(file)+': invalid STL header or binary length');
  const re=/vertex\\s+(-?[\\d.eE+-]+)\\s+(-?[\\d.eE+-]+)\\s+(-?[\\d.eE+-]+)/g;let m;
  while((m=re.exec(s)))points.push(+m[1],+m[2],+m[3]);
 }
 if(!points.length||points.length%9)throw new Error(path.basename(file)+': no valid triangles');
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<points.length;i+=3)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],points[i+k]);hi[k]=Math.max(hi[k],points[i+k]);}
 if([...lo,...hi].some(v=>!Number.isFinite(v)))throw new Error(path.basename(file)+': non-finite coordinate');
 return {format,triangles:points.length/9,bounds:[lo,hi]};
};
const files=expected.map(name=>{
 const file=path.join(directory,name+'.stl');
 if(!fs.existsSync(file))throw new Error('Missing anchor mesh: '+name+'.stl');
 const b=fs.readFileSync(file),mesh=parseStl(file);
 return {name:name+'.stl',bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex'),...mesh};
});
const report={dataset:'BoneHub Visible-Human-3d-Models',subject:'02_Female',region:'LOWER_EXTREMITY_LEFT',purpose:'registration anchors only; no production geometry modified',files,totals:{files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),triangles:files.reduce((n,f)=>n+f.triangles,0)},limitations:['Raw STL coordinates only; units, axes and registration are not inferred.','Bounds and triangle counts do not establish anatomical alignment.']};
const json=JSON.stringify(report,null,2);
if(output)fs.writeFileSync(output,json+'\n');
console.log(json);
