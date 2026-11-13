/**
 * Read-only global coordinate-frame audit for female-atlas skeletal geometry.
 * Uses manifest bounding-box centers only. No mesh transforms or assets change.
 */
const HOST_REVISION = "c67dabc7189f90a17b7d3fe997d517913eb3474c";
const DONOR_REVISION = "b0a20fa3a009ca5f6bfa07b7479312e04c862af2";
const HOST_URL = `https://raw.githubusercontent.com/Azevedo79z/Human-Atlas/${HOST_REVISION}/public/models/atlas-female.json`;
const DONOR_URL = `https://raw.githubusercontent.com/HiMahendraBeniwal/female-atlas/${DONOR_REVISION}/public/models/atlas.json`;
const AXES = ["x", "y", "z"];
const center = bounds => bounds[0].map((v, i) => (v + bounds[1][i]) / 2);
const normName = value => value.toLowerCase().replace(/\bleft\b/g, "{side}").replace(/\bright\b/g, "{side}").replace(/\s+/g, " ").trim();
async function read(url, label) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(label + " manifest HTTP " + response.status);
  const data = await response.json();
  if (!Array.isArray(data.parts)) throw new Error(label + " manifest parts[] missing");
  return data;
}
function bilateralPairs(parts) {
  const groups = new Map();
  for (const part of parts) {
    const name = part.name || "";
    const side = /\bleft\b/i.test(name) ? "left" : /\bright\b/i.test(name) ? "right" : null;
    if (!side || !part.bounds) continue;
    const key = normName(name);
    if (!groups.has(key)) groups.set(key, {});
    groups.get(key)[side] = part;
  }
  return [...groups.entries()].filter(([, pair]) => pair.left && pair.right)
    .map(([key, pair]) => ({ key, left: pair.left, right: pair.right }));
}
function inferLateralAxis(pairs) {
  const deltas = pairs.map(pair => {
    const l = center(pair.left.bounds), r = center(pair.right.bounds);
    return l.map((v, i) => v - r[i]);
  });
  const magnitude = AXES.map((_, axis) => deltas.map(d => Math.abs(d[axis])).sort((a,b)=>a-b));
  const median = magnitude.map(values => values[Math.floor(values.length / 2)]);
  const order = median.map((value, axis) => ({axis, value})).sort((a,b)=>b.value-a.value);
  const axis = order[0].axis;
  const signs = deltas.map(d => Math.sign(d[axis])).filter(Boolean);
  const positive = signs.filter(v => v > 0).length;
  const negative = signs.filter(v => v < 0).length;
  const agreement = Math.max(positive, negative) / Math.max(1, signs.length);
  return {
    axis: AXES[axis],
    medianAbsoluteSeparation: median[axis] * 1000,
    otherAxisMedians: AXES.map((name, i) => ({axis:name, medianAbsoluteSeparationMm:median[i]*1000})),
    signAgreement: agreement,
    leftGreaterThanRight: positive >= negative,
    pairCount: pairs.length,
    confidence: pairs.length >= 20 && agreement >= 0.9 && median[axis] > 2 * Math.max(...median.filter((_,i)=>i!==axis)) ? "strong" : "provisional",
    interpretation: "The axis is inferred from named bilateral bounding-box centers; sign describes the coordinate ordering of labels, not a universal anatomical coordinate convention.",
  };
}
function vertebralRank(name) {
  const value = name.toLowerCase();
  const ordinals = {first:1,second:2,third:3,fourth:4,fifth:5,sixth:6,seventh:7,eighth:8,ninth:9,tenth:10,eleventh:11,twelfth:12};
  const regions = [
    {name:"cervical", offset:0, max:7},
    {name:"thoracic", offset:7, max:12},
    {name:"lumbar", offset:19, max:6},
  ];
  for (const region of regions) {
    const patterns = [
      new RegExp("\\b" + region.name + " vertebra\\s+(\\d+)\\b"),
      new RegExp("\\b(" + Object.keys(ordinals).join("|") + ") " + region.name + " vertebra\\b"),
      new RegExp("\\b(" + Object.keys(ordinals).join("|") + ") " + region.name + " vertebra\\b"),
    ];
    let number = null;
    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (!match) continue;
      number = /^\\d+$/.test(match[1]) ? Number(match[1]) : ordinals[match[1]];
      break;
    }
    if (number !== null && number >= 1 && number <= region.max) return region.offset + number;
  }
  return null;
}
function inferSpineAxis(parts) {
  const rows = parts.map(part => ({part, rank: vertebralRank(part.name || "")}))
    .filter(row => row.rank !== null && row.part.bounds);
  const byRank = new Map(rows.map(row => [row.rank, row]));
  const unique = [...byRank.values()].sort((a,b)=>a.rank-b.rank);
  if (unique.length < 5) return {status:"insufficient-labeled-vertebrae", detected:unique.length};
  const points = unique.map(row => ({rank:row.rank, center:center(row.part.bounds)}));
  const rankMean = points.reduce((s,p)=>s+p.rank,0)/points.length;
  const means = AXES.map((_,axis)=>points.reduce((s,p)=>s+p.center[axis],0)/points.length);
  const slopes = AXES.map((_,axis)=>{
    let numerator=0, denominator=0;
    for(const p of points){numerator+=(p.rank-rankMean)*(p.center[axis]-means[axis]); denominator+=(p.rank-rankMean)**2;}
    return numerator/denominator;
  });
  const variances = AXES.map((_,axis)=>points.reduce((s,p)=>s+(p.center[axis]-means[axis])**2,0));
  const correlations = AXES.map((_,axis)=>{
    const cov=points.reduce((s,p)=>s+(p.rank-rankMean)*(p.center[axis]-means[axis]),0);
    const rankVar=points.reduce((s,p)=>s+(p.rank-rankMean)**2,0);
    return cov/Math.sqrt(rankVar*variances[axis] || 1);
  });
  const axis=correlations.map(Math.abs).indexOf(Math.max(...correlations.map(Math.abs)));
  return {
    status:"candidate",
    axis:AXES[axis],
    correlation:correlations[axis],
    slopeMmPerLevel:slopes[axis]*1000,
    vertebraCount:unique.length,
    rankRange:[unique[0].rank,unique[unique.length-1].rank],
    labels:unique.map(row=>row.part.name),
    confidence:Math.abs(correlations[axis])>=0.9 && unique.length>=7 ? "strong" : "provisional",
    interpretation:"Superior/inferior candidate from the ordered vertebral labels. A positive slope means coordinate increases from cervical toward lumbar levels; this still requires anatomical visual confirmation.",
  };
}
const [host, donor] = await Promise.all([read(HOST_URL,"host"),read(DONOR_URL,"donor")]);
const hostBorrowed=host.parts.filter(p=>p.system==="borrowed" && p.conceptId?.startsWith("BORROWED:FJ"));
const donorById=new Map(donor.parts.map(p=>[p.id,p]));
const mapped=hostBorrowed.map(h=>{
  const sourceId=h.conceptId.slice("BORROWED:".length);
  const d=donorById.get("BP3D_"+sourceId);
  return d && h.bounds && d.bounds ? {host:h,donor:d} : null;
}).filter(Boolean);
const donorPairs=bilateralPairs(mapped.map(row=>row.donor));
const hostPairs=bilateralPairs(mapped.map(row=>row.host));
const report={
  purpose:"Establish evidence for global coordinate directions before any anatomical end labeling",
  pinnedRevisions:{host:HOST_REVISION,donor:DONOR_REVISION},
  counts:{hostBorrowedSourceMatched: mapped.length,donorBilateralPairs:donorPairs.length,hostBilateralPairs:hostPairs.length},
  donor:{
    spineLabelInventory:donor.parts.filter(p=>p.system==="skeletal" && /vertebr|spine|sacrum|coccyx/i.test(p.name||"")).map(p=>p.name),
    lateralAxis:inferLateralAxis(donorPairs),
    vertebralSuperiorInferior:inferSpineAxis(donor.parts.filter(p=>p.system==="skeletal")),
  },
  host:{
    spineLabelInventory:host.parts.filter(p=>p.system==="skeletal" && /vertebr|spine|sacrum|coccyx/i.test(p.name||"")).map(p=>p.name),
    lateralAxis:inferLateralAxis(hostPairs),
    vertebralSuperiorInferior:inferSpineAxis(host.parts.filter(p=>p.system==="skeletal")),
  },
  crossModelNote:"The donor and host frames are assessed independently. A matching axis letter is not proof of registered coordinates or matching bone orientation.",
  limits:[
    "Bounding-box centers are coarse geometric landmarks, not anatomical joint centers.",
    "Bilateral center separation can identify a candidate left-right coordinate but cannot alone validate anatomical orientation.",
    "Vertebral label order can suggest a superior-inferior coordinate only when enough labels are recognized and correlation is strong.",
    "No proximal/distal assignment is made for limb bones in this audit.",
    "No transforms, mesh vertices, manifests, viewer code, production assets, or deployment are modified."
  ]
};
console.log(JSON.stringify(report,null,2));
