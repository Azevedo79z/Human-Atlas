/**
 * Read-only binary preflight for ECU donor meshes and female-reference bone anchors.
 *
 * Run:
 *   deno run --allow-net=raw.githubusercontent.com --allow-read scripts/inspect-ecu-female-anchor-geometry.mjs
 *
 * Validates decoded vertex bounds and index ranges for four ECU donor records
 * and six female borrowed-bone anchors. It deliberately does not compare
 * distances across coordinate spaces or place/modify any mesh.
 */
import fs from "node:fs";

const DONOR_REVISION = "b0a20fa3a009ca5f6bfa07b7479312e04c862af2";
const DONOR_BASE = `https://raw.githubusercontent.com/HiMahendraBeniwal/female-atlas/${DONOR_REVISION}/public/`;
const HOST_DIR = new URL("../public/models/", import.meta.url);
const ECU_IDS = ["BP3D_FJ1472", "BP3D_FJ1472M", "BP3D_FJ1517", "BP3D_FJ1517M"];
const HOST_ANCHORS = [
  ["BM0078", "Left humerus"], ["BM0087", "Left ulna"], ["BM0075", "Left fifth metacarpal bone"],
  ["BM0115", "Right humerus"], ["BM0123", "Right ulna"], ["BM0111", "Right fifth metacarpal bone"],
];

async function readDonorManifest() {
  const response = await fetch(DONOR_BASE + "models/atlas.json");
  if (!response.ok) throw new Error(`Donor manifest HTTP ${response.status}`);
  return response.json();
}
function readHostManifest() {
  return JSON.parse(fs.readFileSync(new URL("atlas-female.json", HOST_DIR), "utf8"));
}
function validatePartRecord(atlas, part, label) {
  if (!part) throw new Error(`${label}: missing part record`);
  if (!Number.isInteger(part.chunk) || !atlas.chunks[part.chunk]) throw new Error(`${label}: invalid chunk reference`);
  if (!Number.isInteger(part.vertexCount) || part.vertexCount <= 0 ||
      !Number.isInteger(part.indexCount) || part.indexCount <= 0 || part.indexCount % 3) {
    throw new Error(`${label}: invalid vertex/index counts`);
  }
  for (const [field, alignment] of [["positions",4],["normals",2],["indices",4]]) {
    if (!Number.isInteger(part[field]) || part[field] < 0 || part[field] % alignment) {
      throw new Error(`${label}: invalid ${field} offset`);
    }
  }
  if (!Array.isArray(part.bounds) || part.bounds.length !== 2 ||
      part.bounds.some(axis => !Array.isArray(axis) || axis.length !== 3 || !axis.every(Number.isFinite))) {
    throw new Error(`${label}: invalid manifest bounds`);
  }
}
async function getChunk(atlas, part, label, cache, remoteBase) {
  if (cache.has(part.chunk)) return cache.get(part.chunk);
  const meta = atlas.chunks[part.chunk];
  let buffer;
  if (remoteBase) {
    const path = meta.url.startsWith("/") ? meta.url.slice(1) : meta.url;
    const url = new URL(path, remoteBase);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${label}: chunk HTTP ${response.status} at ${url}`);
    buffer = await response.arrayBuffer();
  } else {
    const filename = meta.url.split("/").pop();
    buffer = fs.readFileSync(new URL(filename, HOST_DIR)).buffer;
    // Buffer may expose a larger pooled ArrayBuffer; copy the exact view below.
    const view = fs.readFileSync(new URL(filename, HOST_DIR));
    buffer = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
  }
  if (meta.bytes !== undefined && buffer.byteLength !== meta.bytes) {
    throw new Error(`${label}: chunk byte mismatch; expected ${meta.bytes}, got ${buffer.byteLength}`);
  }
  cache.set(part.chunk, buffer);
  return buffer;
}
async function inspect(atlas, part, label, cache, remoteBase) {
  validatePartRecord(atlas, part, label);
  const buffer = await getChunk(atlas, part, label, cache, remoteBase);
  const ranges = [
    ["positions", part.positions, part.vertexCount * 12],
    ["normals", part.normals, part.vertexCount * 6],
    ["indices", part.indices, part.indexCount * 4],
  ];
  for (const [field, offset, length] of ranges) {
    if (offset + length > buffer.byteLength) throw new Error(`${label}: ${field} range exceeds chunk`);
  }
  const view = new DataView(buffer);
  const min = [Infinity,Infinity,Infinity], max = [-Infinity,-Infinity,-Infinity];
  for (let i=0;i<part.vertexCount;i++) for(let axis=0;axis<3;axis++) {
    const value=view.getFloat32(part.positions+i*12+axis*4,true);
    if(!Number.isFinite(value)) throw new Error(`${label}: non-finite position at vertex ${i}`);
    min[axis]=Math.min(min[axis],value); max[axis]=Math.max(max[axis],value);
  }
  let maxBoundError=0;
  for(let axis=0;axis<3;axis++) {
    maxBoundError=Math.max(maxBoundError,Math.abs(min[axis]-part.bounds[0][axis]),Math.abs(max[axis]-part.bounds[1][axis]));
  }
  const tolerance=0.0002;
  if(maxBoundError>tolerance) throw new Error(`${label}: decoded vertices disagree with manifest bounds (${maxBoundError})`);
  const indices=new DataView(buffer);
  for(let i=0;i<part.indexCount;i++) {
    const index=indices.getUint32(part.indices+i*4,true);
    if(index>=part.vertexCount) throw new Error(`${label}: index ${index} exceeds vertex count at index slot ${i}`);
  }
  return {
    id:part.id,name:part.name,system:part.system,chunk:part.chunk,
    vertices:part.vertexCount,triangles:part.indexCount/3,
    decodedBounds:{min,max},manifestBounds:part.bounds,
    maxBoundsError:+maxBoundError.toFixed(8),indicesValidated:part.indexCount,
  };
}

const [donor,host]=await Promise.all([readDonorManifest(),Promise.resolve(readHostManifest())]);
const ecu=ECU_IDS.map(id=>donor.parts.find(part=>part.id===id));
if(ecu.some(part=>!part)) throw new Error("One or more ECU donor records are missing.");
for(const part of ecu) {
  if(part.system!=="muscular" || !/extensor carpi ulnaris/i.test(part.name)) {
    throw new Error(`Unexpected ECU record metadata: ${part.id}`);
  }
}
const anchors=HOST_ANCHORS.map(([id,name])=>{
  const part=host.parts.find(candidate=>candidate.id===id);
  if(!part || part.name!==name || part.system!=="borrowed") throw new Error(`Unexpected female anchor record: ${id}`);
  return part;
});
const donorCache=new Map(),hostCache=new Map();
const donorResults=[];
for(const part of ecu) donorResults.push(await inspect(donor,part,"Donor ECU",donorCache,DONOR_BASE));
const hostResults=[];
for(const part of anchors) hostResults.push(await inspect(host,part,"Female anchor",hostCache,null));

const report={
  purpose:"Binary integrity preflight only; no cross-coordinate-space distance or attachment claim.",
  donor:{revision:DONOR_REVISION,manifestVersion:donor.version??null,structures:donorResults,uniqueChunks:donorCache.size},
  femaleHost:{manifestVersion:host.version??null,structures:hostResults,uniqueChunks:hostCache.size},
  checks:{
    decodedPositionsMatchManifestBounds:true,
    triangleIndicesWithinVertexRanges:true,
    chunkByteLengthsMatchManifest:true,
    coordinateSpacesCompared:"No. Donor ECU and female borrowed-bone transforms are not yet reconciled.",
  },
  nextGate:"Reconstruct the arm-region transform and posture correction from the borrowing pipeline before any cross-model geometric comparison.",
  filesChanged:false,geometryChanged:false,viewerChanged:false,productionChanged:false,
};
console.log(JSON.stringify(report,null,2));
