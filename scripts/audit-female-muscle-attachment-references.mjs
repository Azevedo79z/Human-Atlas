/**
 * Read-only audit of host female atlas bone references for selected upper-body
 * muscle attachment regions. This inventories labels only; it does not infer
 * or validate exact anatomical origins/insertions.
 *
 * Run: deno run scripts/audit-female-muscle-attachment-references.mjs
 */
const manifestPath = new URL("../public/models/atlas-female.json", import.meta.url);
const atlas = JSON.parse(await Deno.readTextFile(manifestPath));
if (!Array.isArray(atlas.parts)) throw new Error("Host atlas manifest has no parts array.");

const BONE_SYSTEMS = new Set(["skeletal", "borrowed"]);
const rules = [
  {
    muscle: "Pectoralis major",
    expected: [/clavicle/i, /sternum/i, /rib|costal cartilage/i],
  },
  {
    muscle: "Pectoralis minor",
    expected: [/rib/i, /scapula/i],
  },
  {
    muscle: "Subclavius",
    expected: [/clavicle/i, /first rib|first costal cartilage/i],
  },
  {
    muscle: "Serratus anterior",
    expected: [/rib/i, /scapula/i],
  },
  {
    muscle: "Deltoid",
    expected: [/clavicle/i, /scapula/i, /humerus/i],
  },
  {
    muscle: "Trapezius",
    expected: [/clavicle/i, /scapula/i, /cervical vertebra|thoracic vertebra/i],
  },
  {
    muscle: "Biceps brachii",
    expected: [/scapula/i, /radius/i],
  },
  {
    muscle: "Triceps brachii",
    expected: [/scapula/i, /humerus/i, /ulna/i],
  },
  {
    muscle: "Brachialis",
    expected: [/humerus/i, /ulna/i],
  },
  {
    muscle: "Extensor carpi ulnaris",
    expected: [/ulna/i, /metacarpal/i],
  },
  {
    muscle: "Flexor carpi ulnaris",
    expected: [/ulna/i, /pisiform|metacarpal/i],
  },
  {
    muscle: "Pronator teres",
    expected: [/humerus/i, /ulna/i, /radius/i],
  },
];

const bones = atlas.parts.filter(p => BONE_SYSTEMS.has(p.system));
const rows = rules.map(rule => {
  const groups = rule.expected.map(pattern => {
    const matches = bones.filter(part => pattern.test(part.name));
    return {
      expectedLandmarkClass: pattern.source,
      present: matches.length > 0,
      matched: matches.map(part => ({ id: part.id, name: part.name, system: part.system })),
    };
  });
  return {
    muscle: rule.muscle,
    landmarkClassesPresent: groups.filter(g => g.present).length,
    landmarkClassesExpected: groups.length,
    completeByLabel: groups.every(g => g.present),
    groups,
  };
});
const missing = rows.filter(row => !row.completeByLabel);
const report = {
  atlasVersion: atlas.version,
  atlasSource: atlas.source,
  bonePartCount: bones.length,
  systemsIncluded: [...new Set(bones.map(p => p.system))],
  muscleReferenceGroups: rows.length,
  groupsWithAllExpectedLabelClasses: rows.length - missing.length,
  groupsWithMissingLabelClasses: missing.length,
  results: rows,
  interpretation: [
    "This is a label-coverage inventory, not proof that each mesh is correctly registered or anatomically appropriate.",
    "Expected attachment classes are a conservative screening checklist and do not encode exact origin/insertion footprints.",
    "A present label may still refer to borrowed anatomy from a different subject; source provenance must be retained.",
    "No geometry, manifest, viewer code, or deployed asset is changed."
  ],
  productionChanged: false,
};
console.log(JSON.stringify(report, null, 2));
