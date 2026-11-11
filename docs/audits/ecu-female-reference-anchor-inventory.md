# ECU female-reference anchor inventory

**Status:** read-only inventory; no mesh placement, retargeting, deformation, or viewer changes.

## Purpose

Establish whether the female reference manifest contains the bony landmarks needed to review the extensor carpi ulnaris (ECU), and whether it already contains an ECU muscle mesh.

The ECU attachment expectation used by this repository lists:
- **Origin:** lateral epicondyle of the humerus and posterior ulna.
- **Insertion:** base of the fifth metacarpal.

These are anatomical review targets, not instructions to snap a mesh to the nearest bone.

## Manifest inspected

- Dataset: Human Reference Atlas female v1.10
- Manifest: `public/models/atlas-female.json`
- Declared scope: whole-body surface with selected organs; skeletal and muscular coverage is partial.
- Systems present: includes `borrowed` and `donor-muscle`.
- `borrowed` parts in manifest: 180.
- `donor-muscle` parts in manifest: 76.

## ECU presence

A case-insensitive search of female manifest part names returned **no ECU / “Extensor carpi ulnaris” mesh**.

This is a coverage finding for this manifest version only. It does not establish that no ECU exists in other datasets or external sources.

## Relevant bony anchor inventory

The required broad bone references are present as `borrowed` parts on both sides:

| Side | Structure | Part ID | System |
|---|---|---|---|
| Left | Humerus | `BM0078` | borrowed |
| Left | Ulna | `BM0087` | borrowed |
| Left | Fifth metacarpal | `BM0075` | borrowed |
| Right | Humerus | `BM0115` | borrowed |
| Right | Ulna | `BM0123` | borrowed |
| Right | Fifth metacarpal | `BM0111` | borrowed |

The corresponding radii are also present (`BM0081` left; `BM0106` right), but radius is not one of the ECU origin/insertion anchors in the current attachment reference.

## Interpretation and limitations

1. The female reference has the broad bone anchors needed for a first-pass regional review.
2. These arm and hand bones are explicitly classified as **borrowed** in the female edition. They are not native skeletal segmentation from the female reference source.
3. The female manifest does not contain an ECU muscle part. The four ECU records audited in the companion source-surface audit therefore cannot be treated as already integrated into this female model.
4. Bone-part presence does not prove the exact lateral epicondyle, posterior ulnar attachment footprint, tendon groove, or fifth-metacarpal insertion footprint has been identified.
5. Manifest bounds are only broad axis-aligned extents. They are not attachment measurements and are not evidence of anatomical alignment.

## Next read-only gate

Decode the six listed anchor meshes from their manifest chunks and inspect them alongside the four ECU source records in a separate diagnostic scene. Keep left and right comparisons separate; show source ECU meshes and destination borrowed bones as distinct layers; record coordinate transforms and units before measuring distances. Do not merge, retarget, deform, or publish any mesh as a result of this inspection.

## Safety boundary

This inventory changes documentation only. It does not modify source geometry, the female atlas manifest, the production viewer, Wix, or the deployed site.
