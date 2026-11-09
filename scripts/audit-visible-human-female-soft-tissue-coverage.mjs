/**
 * Read-only audit of female atlas muscle, tendon and ligament name coverage.
 * It inventories manifest labels; it does not claim meshes exist or validate anatomy.
 *
 * Usage: node scripts/audit-visible-human-female-soft-tissue-coverage.mjs
 */
import fs from 'node:fs';

const atlas = JSON.parse(fs.readFileSync(new URL('../public/models/atlas-female.json', import.meta.url), 'utf8'));
if (!Array.isArray(atlas.parts)) throw new Error('Atlas manifest has no parts array.');
const parts = atlas.parts;
const norm = value => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const regionRules = [
  ['head-neck', /extraocular|masseter|temporalis|sternocleidomastoid|trapezius|scalene|digastric|mylohyoid|geniohyoid|platysma|tongue|pharyngeal|laryngeal/],
  ['shoulder-chest-back', /deltoid|pectoralis|latissimus|rhomboid|serratus|supraspinatus|infraspinatus|subscapularis|teres |rotator cuff|erector spinae|multifidus|intercostal|diaphragm/],
  ['arm-forearm-hand', /biceps brachii|triceps brachii|brachialis|brachioradialis|pronator|supinator|flexor carpi|extensor carpi|flexor digitorum|extensor digitorum|thenar|hypothenar|lumbrical|interossei/],
  ['abdomen-pelvic-floor', /rectus abdominis|external oblique|internal oblique|transversus abdominis|quadratus lumborum|pelvic floor|levator ani|coccygeus|transversus perinei|bulbospongiosus|ischiocavernosus/],
  ['hip-thigh', /gluteus|iliacus|psoas|piriformis|gemellus|obturator|pectineus|adductor|gracilis|sartorius|quadriceps|rectus femoris|vastus|hamstring|biceps femoris|semitendinosus|semimembranosus|tensor fasciae latae/],
  ['leg-ankle-foot', /gastrocnemius|soleus|plantaris|popliteus|tibialis|peroneus|fibularis|extensor hallucis|extensor digitorum longus|flexor hallucis|flexor digitorum longus/],
];
const classifyRegion = name => {
  const value = norm(name);
  return regionRules.find(([, pattern]) => pattern.test(value))?.[0] ?? 'unclassified';
};
const muscleParts = parts.filter(part => ['muscular', 'donor-muscle'].includes(part.system));
const softTissue = parts.filter(part => part.system === 'connective');
const tendonPattern = /tendon|tendinous|aponeurosis/i;
const ligamentPattern = /ligament|retinaculum/i;
const sideOf = name => /\(left\)|^left\b/i.test(name) ? 'left' : /\(right\)|^right\b/i.test(name) ? 'right' : 'unspecified';
const muscleByRegion = Object.fromEntries(regionRules.map(([region]) => {
  const entries = muscleParts.filter(part => classifyRegion(part.name) === region);
  return [region, {
    total: entries.length,
    left: entries.filter(part => sideOf(part.name) === 'left').length,
    right: entries.filter(part => sideOf(part.name) === 'right').length,
    names: entries.map(part => ({ id: part.id, name: part.name, system: part.system })),
  }];
}));
const report = {
  source: 'public/models/atlas-female.json',
  manifestPartCount: parts.length,
  counts: {
    muscularSystem: parts.filter(part => part.system === 'muscular').length,
    donorMuscleSystem: parts.filter(part => part.system === 'donor-muscle').length,
    connectiveSystem: softTissue.length,
    explicitlyNamedTendons: softTissue.filter(part => tendonPattern.test(part.name)).length
      + parts.filter(part => part.system === 'muscular' && tendonPattern.test(part.name)).length,
    explicitlyNamedLigaments: softTissue.filter(part => ligamentPattern.test(part.name)).length,
  },
  muscleCoverageByRegion: muscleByRegion,
  tendonEntries: [
    ...parts.filter(part => tendonPattern.test(part.name)).map(part => ({ id: part.id, name: part.name, system: part.system })),
  ],
  ligamentEntries: softTissue.filter(part => ligamentPattern.test(part.name))
    .map(part => ({ id: part.id, name: part.name, system: part.system })),
  unclassifiedMuscleEntries: muscleParts.filter(part => classifyRegion(part.name) === 'unclassified')
    .map(part => ({ id: part.id, name: part.name, system: part.system })),
  limitations: [
    'Name-based manifest inventory only; not a geometry or visual inspection.',
    'A manifest part may be a placeholder or reference and does not prove a valid mesh is loaded.',
    'Absence by name does not prove the anatomy is absent; it may be represented within a larger structure or under another label.',
    'No new muscle, tendon or ligament anatomy is fabricated or imported by this audit.',
  ],
  safety: 'READ ONLY. No atlas geometry or production asset is modified.',
};
console.log(JSON.stringify(report, null, 2));
