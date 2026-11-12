# Female Muscle Integration Readiness Review

**Status:** read-only evidence consolidation; not an integration approval  
**Donor revision:** `b0a20fa3a009ca5f6bfa07b7479312e04c862af2`  
**Scope:** 12 upper-limb/shoulder muscle groups, female donor atlas

## Evidence reviewed

| Audit | Result |
|---|---|
| Subpart inventory | 12/12 target groups found; 48 donor muscle parts; all 12 groups contain multiple named parts |
| Binary geometry | 48 parts audited; zero invalid-index parts |
| Bilateral symmetry | 26 left/right pairs compared; 23 repeated-name groups recorded |
| Native bone proximity | 48 muscle parts screened against 343 skeletal parts |
| Triangle-surface / attachment review | 32 expected attachment sites checked; 31 had a matching named bone among geometric candidates and 1 was found only by a targeted reference probe |
| ECU triangle-surface review | Two distinct bilateral ECU mesh pairs compared |

## Inventory by muscle group

| Muscle group | Donor parts | Named subparts |
|---|---:|---|
| Pectoralis major | 6 | Abdominal, clavicular, sternocostal |
| Pectoralis minor | 2 | Whole muscle |
| Subclavius | 2 | Whole muscle |
| Serratus anterior | 2 | Whole muscle |
| Deltoid | 6 | Acromial, clavicular, spinal |
| Trapezius | 6 | Ascending, descending, transverse |
| Biceps brachii | 4 | Long head, short head |
| Triceps brachii | 6 | Lateral, long, medial heads |
| Brachialis | 2 | Whole muscle |
| Pronator teres | 4 | Humeral head, ulnar head |
| Flexor carpi ulnaris | 4 | Humeral head, ulnar head |
| Extensor carpi ulnaris | 4 | Two records per side; see duplicate-record investigation |

## Important ECU record distinction

The donor manifest contains two right-side and two left-side records named extensor carpi ulnaris:

- `BP3D_FJ1472` / `BP3D_FJ1472M`
- `BP3D_FJ1517` / `BP3D_FJ1517M`

The binary audit found different geometry hashes for the same-side records. The source metadata in the triangle-surface audit maps `FJ1472` and `FJ1472M` as direct canonical elements; `FJ1517` and `FJ1517M` map to those canonical IDs but are not direct canonical elements. Each pair is highly mirror-symmetric on its own, while cross-pair comparisons are materially less similar.

**Review decision:** treat `FJ1472` / `FJ1472M` as the primary ECU candidate pair for subsequent visual review. Keep `FJ1517` / `FJ1517M` as alternate source records for investigation; do not render both pairs simultaneously and do not delete or rewrite either source record in this audit.

## Interpretation and blockers

1. The inventory proves that named donor parts exist in the manifest; it does not prove complete anatomical coverage, correct placement, or visual quality.
2. Binary index validity is a data-integrity check, not an anatomical correctness check.
3. Bilateral reflection and surface proximity are diagnostic evidence only. They do not establish anatomical registration, attachment, laterality in host coordinates, or a valid transform.
4. The 31 geometric shortlist matches and 1 targeted probe are not attachment validations. Origin and insertion must be reviewed separately, with tendon paths and non-bony attachments treated explicitly.
5. No automatic mesh snapping, deformation, retargeting, deduplication, viewer changes, Wix integration, or production deployment is authorized by these audit results.

## Next gate

Proceed with a **read-only host-to-donor registration review** before any mesh is displayed in the host viewer:

- identify the host skeleton coordinate frame and units;
- establish donor-to-host orientation, scale, and translation using stable anatomical landmarks;
- verify left/right orientation and per-part bounds;
- visually inspect representative superficial and deep muscles;
- validate tendon continuity and origin/insertion independently;
- preserve a reversible mapping from source part IDs to viewer labels and selection IDs.

Only after that gate passes should a separate implementation proposal be prepared for the female muscular layer.
