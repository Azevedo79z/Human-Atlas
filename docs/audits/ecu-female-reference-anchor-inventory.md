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

## Binary geometry preflight result

Workflow: [ECU female anchor geometry preflight #43123646196](https://github.com/Azevedo79z/Human-Atlas/actions/runs/43123646196)  
Commit: `6d92a682d2933fd4a570a65bcd5d8c62b10cd294`  
Result: **success** (lint, type-check, binary decode, and artifact upload all completed).

The preflight decoded and checked all four donor ECU records:

| Donor record | Side | Vertices | Triangles | Decoded bounds |
|---|---:|---:|---:|---|
| `BP3D_FJ1472` | Right | 2,167 | 1,136 | Match |
| `BP3D_FJ1472M` | Left | 2,185 | 1,152 | Match |
| `BP3D_FJ1517` | Right | 662 | 504 | Match |
| `BP3D_FJ1517M` | Left | 666 | 508 | Match |

It also decoded and checked the six female borrowed-bone anchors listed above. All source and host chunks matched their declared byte lengths; every decoded position set matched its manifest bounds within the configured 0.0002 tolerance; and every triangle index was within its part's vertex range.

The donor ECU records required two source chunks; the six female anchors were all in host chunk 12.

**Important limit:** this is binary integrity validation, not visual or anatomical correspondence. Donor ECU coordinates and female borrowed-bone coordinates have not been compared. The next gate is to reconstruct the arm-region scale/translation and posture correction used by the borrowing pipeline, then validate those transforms independently before any surface-distance analysis.

The workflow artifact is named `ecu-female-anchor-geometry-preflight` and is retained for 14 days.

## Arm transform reconstruction result

Workflow: [ECU arm transform reconstruction audit #43123916075](https://github.com/Azevedo79z/Human-Atlas/actions/runs/43123916075)  
Commit: `64a260a13ed19b55f21ea2279cc41f50bb4e8270`  
Result: **success** — lint, type-check, transform reconstruction, metadata comparison, and artifact upload completed.

The audit independently reproduced the arm-region transform from the seven shared anchors (thoracic vertebrae 1–5, manubrium, sternum):

- Uniform scale: **0.92727**, exactly matching the stored borrowing metadata.
- Translation: reconstructed from the same least-squares fit (full vector is in the workflow artifact).
- Maximum anchor residual: **22.024 mm**, versus the stored rounded value of **22.0 mm**.
- Anchor RMS residual: **6.614 mm**.

The bilateral posture reconstruction also matched the stored metadata:

| Side | Surface samples (donor / host) | Rotation | Reach scale |
|---|---:|---:|---:|
| Left | 3,034 / 3,952 | 21.4° | 0.984 |
| Right | 2,991 / 2,887 | 23.4° | 0.954 |

All three comparisons passed: arm transform, left posture, and right posture.

**Interpretation limit:** this establishes that the transform and posture values in the current female manifest are reproducible from the current donor/host anchor and skin geometry using the borrowing algorithm. It does not establish that the ECU donor muscle is anatomically attached correctly after transformation, nor does it validate tendon footprints or tissue fit.

Next gate: apply the independently reconstructed arm transform and the side-specific posture operation to ECU vertices in memory only, then compare the transformed ECU surface against the corresponding female borrowed ulna, humerus, and fifth metacarpal surfaces. Preserve separate left/right analysis and keep the result diagnostic; no mesh write-back.

The workflow artifact is named `ecu-arm-transform-reconstruction` and is retained for 14 days.
