/**
 * Read-only audit of anatomical depth and educational metadata for female soft tissue.
 * Names are evidence for inventory only. Depth, origin, insertion, action and innervation
 * are never inferred or fabricated by this script.
 */
import fs from 'node:fs';

const atlas = JSON.parse(fs.readFileSync(new URL('../public/models/atlas-female.json', import.meta.url), 'utf8'));
if (!Array.isArray(atlas.parts) || !Array.isArray(atlas.concepts)) {
  throw new Error('Female atlas manifest is missing parts or concepts arrays.');
}
const parts = atlas.parts;
const byId = new Map(parts.map(part => [part.id, part]));
const concepts = new Map(atlas.concepts.map(concept => [concept.id, concept]));
const muscleWord = /\bmuscle\b/i;
const tendonWord = /tendon|tendinous|aponeurosis/i;
const ligamentWord = /ligament|retinaculum/i;
const tissueEntries = parts.filter(part => muscleWord.test(part.name) || tendonWord.test(part.name) || ligamentWord.test(part.name)
  || ['muscular', 'donor-muscle'].includes(part.system));
const normalize = value => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const regionRules = [
  ['head-neck', /extraocular|ciliary|masseter|temporalis|sternocleidomastoid|trapezius|scalene|digastric|mylohyoid|geniohyoid|platysma|tongue|pharyngeal|laryngeal/],
  ['shoulder-chest-back', /deltoid|pectoralis|latissimus|rhomboid|serratus|supraspinatus|infraspinatus|subscapularis|teres |rotator cuff|erector spinae|multifidus|intercostal|diaphragm/],
  ['arm-forearm-hand', /biceps brachii|triceps brachii|brachialis|brachioradialis|pronator|supinator|flexor carpi|extensor carpi|flexor digitorum|extensor digitorum|thenar|hypothenar|lumbrical|interossei/],
  ['abdomen-pelvic-floor', /rectus abdominis|external oblique|internal oblique|transversus abdominis|quadratus lumborum|pelvic floor|levator ani|coccygeus|transversus perinei|bulbospongiosus|ischiocavernosus/],
  ['hip-thigh', /gluteus|iliacus|psoas|piriformis|gemellus|obturator|pectineus|adductor|gracilis|sartorius|quadriceps|rectus femoris|vastus|hamstring|biceps femoris|semitendinosus|semimembranosus|tensor fasciae latae/],
  ['leg-ankle-foot', /gastrocnemius|soleus|plantaris|popliteus|tibialis|peroneus|fibularis|extensor hallucis|extensor digitorum longus|flexor hallucis|flexor digitorum longus/],
];
const classifyRegion = name => {
  const n = normalize(name);
  return regionRules.find(([, pattern]) => pattern.test(n))?.[0] ?? 'unclassified';
};
const side = name => /\(left\)|^left\b/i.test(name) ? 'left' : /\(right\)|^right\b/i.test(name) ? 'right' : 'unspecified';
const evidence = part => {
  const concept = concepts.get(part.conceptId);
  return { id: part.id, name: part.name, system: part.system, conceptId: part.conceptId,
    conceptName: concept?.name ?? null, region: classifyRegion(part.name), side: side(part.name),
    vertexCount: part.vertexCount, indexCount: part.indexCount };
};
const byRegion = Object.fromEntries(regionRules.map(([region]) => {
  const rows = tissueEntries.filter(part => classifyRegion(part.name) === region);
  return [region, { total: rows.length, muscles: rows.filter(p => muscleWord.test(p.name) || ['muscular','donor-muscle'].includes(p.system)).length,
    tendons: rows.filter(p => tendonWord.test(p.name)).length, ligaments: rows.filter(p => ligamentWord.test(p.name)).length,
    left: rows.filter(p => side(p.name) === 'left').length, right: rows.filter(p => side(p.name) === 'right').length,
    entries: rows.map(evidence) }];
}));
const metadataFields = ['depth', 'layer', 'origin', 'insertion', 'action', 'innervation', 'vascularSupply'];
const source = {
  donorMuscle: atlas.donorMuscle ?? null,
  borrowed: atlas.borrowed ?? null,
};
const report = {
  audit: 'female-soft-tissue-depth-and-learning-metadata',
  readOnly: true,
  manifestPartCount: parts.length,
  totals: {
    muscleSystem: parts.filter(p => p.system === 'muscular').length,
    donorMuscleSystem: parts.filter(p => p.system === 'donor-muscle').length,
    explicitlyNamedMuscles: tissueEntries.filter(p => muscleWord.test(p.name)).length,
    explicitlyNamedTendons: tissueEntries.filter(p => tendonWord.test(p.name)).length,
    explicitlyNamedLigaments: tissueEntries.filter(p => ligamentWord.test(p.name)).length,
    softTissueEntries: tissueEntries.length,
  },
  sourceProvenance: source,
  regionalCoverage: byRegion,
  depthAndLearningMetadata: {
    fieldsChecked: metadataFields,
    partRecordsWithAnySuchField: parts.filter(p => metadataFields.some(field => Object.hasOwn(p, field))).length,
    conceptRecordsWithAnySuchField: atlas.concepts.filter(c => metadataFields.some(field => Object.hasOwn(c, field))).length,
    status: 'not represented as structured fields in the current manifest; no superficial/intermediate/deep layer is assigned',
  },
  validationNotes: [
    'A part record and its vertex/index counts do not prove the geometry is anatomically correct or visually selectable.',
    'The donorMuscle provenance identifies a Visible Human Female lower-extremity source; it does not establish coverage outside the documented lower-extremity groups.',
    'Borrowed structures must retain their separate source provenance and must not be presented as native female donor anatomy.',
    'Origin, insertion, action, innervation and depth require vetted anatomical references and explicit curation.',
    'No missing anatomy, layer, or educational metadata is invented by this audit.',
  ],
};
console.log(JSON.stringify(report, null, 2));
