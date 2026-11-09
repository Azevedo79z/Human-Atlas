/**
 * Read-only anatomical mapping and regional transform planner for the 143
 * Visible Human Female bone STL meshes.
 *
 * Usage: node scripts/plan-visible-human-female-import.mjs PATH_TO_02_Female
 * It maps every source mesh to a female Atlas/placeholder landmark, computes
 * rigid-axis + uniform-scale + translation fits per anatomical region, and
 * writes JSON to stdout. It never changes the manifest or model chunks.
 *
 * The millimetre assumption and placeholder-derived targets remain provisional.
 */
import fs from 'node:fs';
import path from 'node:path';

const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/plan-visible-human-female-import.mjs PATH_TO_02_Female');
const root = path.resolve(input);
if (path.basename(root) !== '02_Female' || !fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  throw new Error('Safety stop: input must be an existing directory named exactly 02_Female.');
}
const manifestPath = new URL('../public/models/atlas-female.json', import.meta.url);
const atlas = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const partByName = name => atlas.parts.filter(part => part.name.toLowerCase() === name.toLowerCase());
const merge = parts => {
  if (!parts.length) return null;
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const part of parts) for (let axis = 0; axis < 3; axis++) {
    lo[axis] = Math.min(lo[axis], part.bounds[0][axis]);
    hi[axis] = Math.max(hi[axis], part.bounds[1][axis]);
  }
  return [lo, hi];
};
const centre = box => box[0].map((value, axis) => (value + box[1][axis]) / 2);
function sourceBounds(file) {
  const buffer = fs.readFileSync(file);
  const triangles = buffer.length >= 84 ? buffer.readUInt32LE(80) : -1;
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  const add = vertex => {
    for (let axis = 0; axis < 3; axis++) {
      const value = vertex[axis];
      if (!Number.isFinite(value)) throw new Error(`${file}: non-finite vertex.`);
      lo[axis] = Math.min(lo[axis], value);
      hi[axis] = Math.max(hi[axis], value);
    }
  };
  if (triangles >= 0 && 84 + triangles * 50 === buffer.length) {
    for (let triangle = 0; triangle < triangles; triangle++) {
      const start = 84 + triangle * 50 + 12;
      for (let vertex = 0; vertex < 3; vertex++) {
        const at = start + vertex * 12;
        add([buffer.readFloatLE(at), buffer.readFloatLE(at + 4), buffer.readFloatLE(at + 8)]);
      }
    }
  } else {
    const text = buffer.toString('utf8');
    const expression = /\bvertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g;
    let match, count = 0;
    while ((match = expression.exec(text))) { add(match.slice(1, 4).map(Number)); count++; }
    if (!count) throw new Error(`${file}: unrecognized STL.`);
  }
  return [lo, hi];
}
const ORDINAL = ['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth'];
const sideName = side => side === 'LEFT' ? 'left' : 'right';
const sideTitle = side => side === 'LEFT' ? 'Left' : 'Right';
// Use the exact same canonical path inventory as the downloader, then
// compare it against the extracted folder to catch missing or unexpected STL files.
import { FEMALE_BONE_FILES, FEMALE_BONE_FILE_COUNT } from './lib/visible-human-female-inventory.mjs';
const expectedSourceFiles = FEMALE_BONE_FILES.map(({region,filename}) => ({
  region,
  file: filename,
  relative: path.join(region, filename),
}));
const actualSourceFiles = [];
for (const region of fs.readdirSync(root, {withFileTypes:true})) {
  if (!region.isDirectory()) continue;
  for (const entry of fs.readdirSync(path.join(root, region.name), {withFileTypes:true})) {
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.stl')) {
      actualSourceFiles.push({region:region.name,file:entry.name,relative:path.join(region.name,entry.name)});
    }
  }
}
const expectedKeys = new Set(expectedSourceFiles.map(file => `${file.region}/${file.file}`));
const actualKeys = new Set(actualSourceFiles.map(file => `${file.region}/${file.file}`));
const missingSourceFiles = [...expectedKeys].filter(key => !actualKeys.has(key)).sort();
const unexpectedSourceFiles = [...actualKeys].filter(key => !expectedKeys.has(key)).sort();
if (expectedSourceFiles.length !== FEMALE_BONE_FILE_COUNT || FEMALE_BONE_FILE_COUNT !== 143 ||
    missingSourceFiles.length || unexpectedSourceFiles.length || actualSourceFiles.length !== FEMALE_BONE_FILE_COUNT) {
  throw new Error(`Source inventory mismatch. Missing: ${missingSourceFiles.join(', ') || 'none'}. Unexpected: ${unexpectedSourceFiles.join(', ') || 'none'}.`);
}
const sourceFiles = expectedSourceFiles;

const mappings = [];
const targetFor = source => {
  const {region,file} = source;
  const match = /^(.*)_(LEFT|RIGHT)\.stl$/i.exec(file);
  const side = match?.[2]?.toUpperCase();
  const title = side ? sideTitle(side) : '';
  const lower = side ? sideName(side) : '';
  let targets = [];
  let group = '';

  if (region === 'SKULL') {
    group = file.includes('MANDIBLE') ? 'mandible' : 'skull';
    const skullTargets = atlas.parts.filter(part => part.system === 'borrowed' &&
      /maxilla|nasal bone|palatine bone|parietal bone|temporal bone|zygomatic bone|frontal bone|occipital bone|sphenoid bone|vomer|ethmoid/i.test(part.name));
    targets = file.includes('MANDIBLE')
      ? partByName('Mandible')
      : skullTargets;
  } else if (region === 'THORAX' && /^RIB_(\d+)_(LEFT|RIGHT)\.stl$/i.test(file)) {
    const [,number,which] = /^RIB_(\d+)_(LEFT|RIGHT)\.stl$/i.exec(file);
    group = 'thorax';
    targets = partByName(`${sideTitle(which)} ${ORDINAL[Number(number)-1]} rib`);
  } else if (region === 'THORAX' && file === 'STERNUM.stl') {
    group = 'thorax'; targets = partByName('Sternum');
  } else if (region === 'SPINAL_COLUMN' && file === 'SACRUM.stl') {
    group = 'spine'; targets = partByName('Sacrum');
  } else if (region === 'SPINAL_COLUMN' && /^VERTEBRA_([CTL])(\d+)\.stl$/i.test(file)) {
    const [,letter,number] = /^VERTEBRA_([CTL])(\d+)\.stl$/i.exec(file);
    const name = letter.toUpperCase() === 'C' ? 'Cervical' : letter.toUpperCase() === 'T' ? 'Thoracic' : 'Lumbar';
    group = 'spine'; targets = partByName(`${name} vertebra ${number}`);
  } else if (region.startsWith('LOWER_EXTREMITY_') && side) {
    const bone = file.replace(/_(LEFT|RIGHT)\.stl$/i,'');
    group = bone === 'HIP' ? 'pelvis' : `leg-${lower}`;
    if (bone === 'HIP') targets = atlas.parts.filter(part => part.system === 'skeletal' &&
      /(ilium|ischium|pubis)/i.test(part.name) && part.name.toLowerCase().includes(`(${lower})`));
    else targets = partByName(`${bone.charAt(0)}${bone.slice(1).toLowerCase()} (${lower})`);
  } else if (region.startsWith('UPPER_EXTREMITY_') && side) {
    const bone = file.replace(/_(LEFT|RIGHT)\.stl$/i,'');
    group = `arm-${lower}`; targets = partByName(`${title} ${bone.toLowerCase()}`);
  } else if (region.startsWith('HAND_') && side) {
    const bone = file.replace(/_(LEFT|RIGHT)\.stl$/i,'');
    group = `hand-${lower}`;
    const carpal = ['CAPITATE','HAMATE','LUNATE','PISIFORM','SCAPHOID','TRAPEZIUM','TRAPEZOID','TRIQUETRUM'];
    if (carpal.includes(bone)) {
      const display = bone === 'TRIQUETRUM' ? 'triquetral' : bone.toLowerCase();
      targets = partByName(`${title} ${display}`);
    } else if (bone.startsWith('METACARPAL_')) {
      const n = Number(bone.split('_')[1]);
      targets = partByName(`${title} ${ORDINAL[n-1]} metacarpal bone`);
    } else if (bone.startsWith('PHALANGE_HAND_')) {
      const digit = Number(bone.split('_')[2]);
      const finger = ['thumb','index finger','middle finger','ring finger','little finger'][digit-1];
      targets = atlas.parts.filter(part => part.system === 'borrowed' &&
        part.name.toLowerCase().includes(`of ${lower} ${finger}`));
    }
  } else if (region.startsWith('FOOT_') && side) {
    const bone = file.replace(/_(LEFT|RIGHT)\.stl$/i,'');
    group = `foot-${lower}`;
    if (['CALCANEUS','CUBOID','INTERMEDIATE_CUNEIFORM','LATERAL_CUNEIFORM','MEDIAL_CUNEIFORM','TALUS'].includes(bone)) {
      const display = {
        CALCANEUS:'calcaneus',CUBOID:'cuboid bone',
        INTERMEDIATE_CUNEIFORM:'intermediate cuneiform bone',
        LATERAL_CUNEIFORM:'lateral cuneiform bone',
        MEDIAL_CUNEIFORM:'medial cuneiform bone',TALUS:'talus',
      }[bone];
      targets = partByName(`${title} ${display}`);
    } else if (bone === 'NAVICULAR') targets = partByName(`Navicular bone of ${lower} foot`);
    else if (bone.startsWith('METATARSAL_')) {
      const n = Number(bone.split('_')[1]);
      targets = partByName(`${title} ${ORDINAL[n-1]} metatarsal bone`);
    } else if (bone.startsWith('PHALANGE_FOOT_')) {
      const n = Number(bone.split('_')[2]);
      const toe = ['big toe','second toe','third toe','fourth toe','little toe'][n-1];
      targets = atlas.parts.filter(part => part.system === 'borrowed' &&
        part.name.toLowerCase().endsWith(`of ${lower} ${toe}`));
    }
  }
  return {group,targets};
};

for (const source of sourceFiles) {
  const {group,targets} = targetFor(source);
  if (!group) throw new Error(`No anatomical region mapping for ${source.relative}`);
  if (!targets.length) throw new Error(`No matching female Atlas landmark for ${source.relative}`);
  mappings.push({...source,group,targets:targets.map(part=>({id:part.id,name:part.name,system:part.system})),sourceBounds:sourceBounds(path.join(root,source.relative))});
}
const byGroup = new Map();
for (const mapping of mappings) (byGroup.get(mapping.group) ?? byGroup.set(mapping.group,[]).get(mapping.group)).push(mapping);

const rotation = [[1,0,0],[0,0,1],[0,-1,0]];
const rotate = point => rotation.map(row => row.reduce((sum,value,axis)=>sum+value*point[axis],0));
function fit(entries) {
  const pairs = entries.map(entry => ({
    source: rotate(centre(entry.sourceBounds).map(value=>value/1000)),
    target: centre(merge(entry.targets.map(target => atlas.parts.find(part=>part.id===target.id)).filter(Boolean))),
  }));
  const mean = points => points.reduce((sum,point)=>sum.map((value,axis)=>value+point[axis]/points.length),[0,0,0]);
  const fromMean=mean(pairs.map(pair=>pair.source)),toMean=mean(pairs.map(pair=>pair.target));
  let numerator=0,denominator=0;
  for(const pair of pairs)for(let axis=0;axis<3;axis++){
    const a=pair.source[axis]-fromMean[axis],b=pair.target[axis]-toMean[axis];
    numerator+=a*b;denominator+=a*a;
  }
  const scale=denominator?numerator/denominator:0;
  const offset=toMean.map((value,axis)=>value-scale*fromMean[axis]);
  const errors=pairs.map(pair=>Math.hypot(...pair.target.map((value,axis)=>scale*pair.source[axis]+offset[axis]-value)));
  return {anchors:entries.length,scale,offsetMetres:offset,rmsMillimetres:Math.sqrt(errors.reduce((sum,value)=>sum+value*value,0)/errors.length)*1000,maxMillimetres:Math.max(...errors)*1000,
    residuals:entries.map((entry,index)=>({file:entry.relative,errorMillimetres:+(errors[index]*1000).toFixed(2)}))};
}
const regions=Object.fromEntries([...byGroup].sort(([a],[b])=>a.localeCompare(b)).map(([group,entries])=>[group,fit(entries)]));
const targetIdsBySystem = system => new Set(
  mappings.flatMap(mapping => mapping.targets.filter(target => target.system === system).map(target => target.id)),
);
const countBySourceRegion = Object.fromEntries(
  [...new Set(mappings.map(mapping => mapping.region))].sort().map(region => {
    const entries = mappings.filter(mapping => mapping.region === region);
    return [region, {
      sourceMeshes: entries.length,
      withNativeSkeletalTarget: entries.filter(mapping => mapping.targets.some(target => target.system === 'skeletal')).length,
      borrowedOnly: entries.filter(mapping => mapping.targets.length && mapping.targets.every(target => target.system === 'borrowed')).length,
      withMultipleAtlasTargets: entries.filter(mapping => mapping.targets.length > 1).length,
    }];
  }),
);
const coverage = {
  method: 'Read-only mapping classification based on explicit Atlas manifest target systems. A borrowed target is not counted as native female source geometry.',
  sourceMeshes: mappings.length,
  sourceMeshesWithNativeSkeletalTarget: mappings.filter(mapping => mapping.targets.some(target => target.system === 'skeletal')).length,
  sourceMeshesMappedOnlyToBorrowedReferences: mappings.filter(mapping => mapping.targets.length && mapping.targets.every(target => target.system === 'borrowed')).length,
  sourceMeshesMappedToMixedSystems: mappings.filter(mapping => new Set(mapping.targets.map(target => target.system)).size > 1).length,
  sourceMeshesMappedToMultipleAtlasTargets: mappings.filter(mapping => mapping.targets.length > 1).length,
  uniqueNativeSkeletalTargetsUsed: targetIdsBySystem('skeletal').size,
  uniqueBorrowedTargetsUsed: targetIdsBySystem('borrowed').size,
  atlasManifestInventory: {
    nativeSkeletalParts: atlas.parts.filter(part => part.system === 'skeletal').length,
    borrowedParts: atlas.parts.filter(part => part.system === 'borrowed').length,
  },
  bySourceRegion: countBySourceRegion,
  interpretation: 'These are name/manifest mapping counts only. They do not prove that a target mesh is female-specific, geometrically compatible, correctly registered, or safe to replace. Multiple borrowed targets may represent one grouped source bone and require anatomical review.',
};
const report = {
  source:'BoneHub Visible Human Female CT/Mesh/02_Female',
  expectedMeshes:143,mappedMeshes:mappings.length,
  uniqueAtlasLandmarks:new Set(mappings.flatMap(mapping=>mapping.targets.map(target=>target.id))).size,
  axisRotation:rotation,
  unitAssumption:{value:'millimetres',confirmed:false,warning:'STL has no unit metadata; this plan is not permission to import.'},
  regions,
  mappings:mappings.map(({relative,group,targets})=>({file:relative,group,targets})),
  knownSourceGaps:['Hyoid bone','sesamoid bones','costal cartilages','separately segmented cranial bones','individual phalanges'],
  safety:'READ ONLY. No atlas manifest or geometry chunks were changed.',
};
console.log(JSON.stringify(report,null,2));
