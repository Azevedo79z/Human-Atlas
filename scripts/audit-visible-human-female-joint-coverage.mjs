/**
 * Read-only audit of anatomical component coverage for six major synovial joints.
 * Reports structures explicitly named in atlas-female.json; it does not infer
 * surfaces, contact, articulation, or geometry from a whole-bone mesh.
 *
 * Usage: node scripts/audit-visible-human-female-joint-coverage.mjs
 */
import fs from 'node:fs';

const atlas = JSON.parse(fs.readFileSync(new URL('../public/models/atlas-female.json', import.meta.url), 'utf8'));
if (!Array.isArray(atlas.parts)) throw new Error('Atlas manifest has no parts array.');
const parts = atlas.parts;
const joints = [
  {
    id: 'hip',
    label: 'Hip / coxofemoral',
    components: [
      ['Coxal bone regions (ilium, pubis, ischium)', /(ilium|pubis|ischium)/i, 'bone-region'],
      ['Femur', /^Femur \((left|right)\)$/i, 'bone'],
      ['Acetabulum explicitly identified', /acetabul/i, 'articular-landmark'],
      ['Femoral head explicitly identified', /femoral head|head of femur/i, 'articular-landmark'],
      ['Acetabular labrum', /acetabular labrum/i, 'fibrocartilage'],
      ['Hip joint ligaments', /iliofemoral|pubofemoral|ischiofemoral|ligament of (head|head of) femur/i, 'ligament'],
    ],
  },
  {
    id: 'knee',
    label: 'Knee',
    components: [
      ['Femur', /^Femur \((left|right)\)$/i, 'bone'],
      ['Tibia', /^Tibia \((left|right)\)$/i, 'bone'],
      ['Fibula', /^Fibula \((left|right)\)$/i, 'bone'],
      ['Patella', /^Patella \((left|right)\)$/i, 'bone'],
      ['Menisci', /meniscus/i, 'fibrocartilage'],
      ['Anterior and posterior cruciate ligaments', /anterior cruciate ligament|posterior cruciate ligament/i, 'ligament'],
      ['Collateral ligaments', /tibial collateral ligament|fibular collateral ligament/i, 'ligament'],
      ['Articular cartilage', /articular cartilage of knee/i, 'cartilage'],
    ],
  },
  {
    id: 'ankle',
    label: 'Ankle / talocrural',
    components: [
      ['Distal tibia and fibula', /^Tibia \((left|right)\)$|^Fibula \((left|right)\)$/i, 'bone'],
      ['Talus', /^Left talus$|^Right talus$/i, 'bone'],
      ['Calcaneus', /^Left calcaneus$|^Right calcaneus$/i, 'bone'],
      ['Malleoli explicitly identified', /malleolus|malleolar/i, 'articular-landmark'],
      ['Deltoid and lateral ankle ligaments', /deltoid ligament|anterior talofibular|calcaneofibular ligament|posterior talofibular/i, 'ligament'],
      ['Ankle articular cartilage', /articular cartilage.*ankle|ankle.*articular cartilage/i, 'cartilage'],
    ],
  },
  {
    id: 'shoulder',
    label: 'Shoulder / glenohumeral',
    components: [
      ['Clavicle', /^Left clavicle$|^Right clavicle$/i, 'bone'],
      ['Scapula', /^Left scapula$|^Right scapula$/i, 'bone'],
      ['Humerus', /^Left humerus$|^Right humerus$/i, 'bone'],
      ['Glenoid cavity explicitly identified', /glenoid/i, 'articular-landmark'],
      ['Glenoid labrum', /glenoid labrum/i, 'fibrocartilage'],
      ['Rotator cuff tendons', /supraspinatus tendon|infraspinatus tendon|subscapularis tendon|teres minor tendon/i, 'tendon'],
      ['Shoulder joint ligaments/capsule', /coracohumeral ligament|glenohumeral ligament|joint capsule.*shoulder/i, 'ligament'],
    ],
  },
  {
    id: 'elbow',
    label: 'Elbow',
    components: [
      ['Humerus', /^Left humerus$|^Right humerus$/i, 'bone'],
      ['Radius', /^Left radius$|^Right radius$/i, 'bone'],
      ['Ulna', /^Left ulna$|^Right ulna$/i, 'bone'],
      ['Olecranon / trochlear notch landmarks', /olecranon|trochlear notch/i, 'articular-landmark'],
      ['Annular and collateral ligaments', /annular ligament|radial collateral ligament|ulnar collateral ligament/i, 'ligament'],
      ['Elbow articular cartilage', /articular cartilage.*elbow|elbow.*articular cartilage/i, 'cartilage'],
    ],
  },
  {
    id: 'wrist',
    label: 'Wrist / radiocarpal',
    components: [
      ['Radius and ulna', /^Left radius$|^Right radius$|^Left ulna$|^Right ulna$/i, 'bone'],
      ['Carpal bones', /^(Left|Right) (capitate|hamate|lunate|pisiform|scaphoid|trapezium|trapezoid|triquetral)$/i, 'bone'],
      ['Triangular fibrocartilage complex', /triangular fibrocartilage|articular disc of wrist/i, 'fibrocartilage'],
      ['Radiocarpal ligaments', /radiocarpal ligament|ulnocarpal ligament|intercarpal ligament/i, 'ligament'],
      ['Wrist articular cartilage', /articular cartilage.*wrist|wrist.*articular cartilage/i, 'cartilage'],
    ],
  },
];
const report = {
  source: 'public/models/atlas-female.json',
  manifestPartCount: parts.length,
  method: 'Name-based manifest inventory only. A whole-bone mesh does not count as an individually identified articular landmark, ligament, tendon, cartilage, or joint surface.',
  joints: joints.map(joint => ({
    id: joint.id,
    label: joint.label,
    components: joint.components.map(([label, pattern, type]) => {
      const matches = parts.filter(part => pattern.test(part.name));
      return {
        label,
        type,
        status: matches.length ? 'named-in-manifest' : 'not-found-by-name',
        matchCount: matches.length,
        matches: matches.map(part => ({ id: part.id, name: part.name, system: part.system })),
      };
    }),
  })),
  safety: 'READ ONLY. This audit does not alter geometry, infer articulation, or authorize import.',
};
console.log(JSON.stringify(report, null, 2));
