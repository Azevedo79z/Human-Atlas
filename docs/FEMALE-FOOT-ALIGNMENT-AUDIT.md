# Female left-foot alignment audit

Status: source inventory and viewer crosswalk only. No application code, atlas manifest, binary chunk, or production geometry is changed.

## Verified pilot input

- Source: BoneHub, *Visible-Human-3D-Models*, subject `02_Female`, region `FOOT_LEFT`.
- Source revision: `53bd62452ae3fc34ba0fa6188517cd8ca9bf4a10`.
- 17 binary STL files; 12,122,428 bytes total; 242,420 triangles.
- The dedicated GitHub Actions validation run completed successfully: [run 42826958377](https://github.com/Azevedo79z/Human-Atlas/actions/runs/42826958377).
- Parser result: 17/17 files parsed, no byte-count mismatches, no parser errors.
- This proves file integrity and parseability only. It does not establish units, axis convention, orientation, registration, or anatomical fit.

## Existing female viewer crosswalk

Audited from `public/models/atlas-female.json` on `feat/atlas-visible-skin-layer` (1,220 parts, 15 chunks).

The current left-foot region contains 14 parts classified as `borrowed`:

- First through fifth metatarsals
- Calcaneus
- Cuboid
- Intermediate, lateral, and medial cuneiforms
- Two sesamoid bones
- Talus
- Navicular

The 17-file BoneHub pilot contains those 12 named bone groups plus five grouped toe-phalanx meshes (digits 1–5). The current left-foot crosswalk did not return corresponding toe-phalanx parts. The pilot therefore has a concrete coverage gap to evaluate: five grouped phalangeal meshes. Do not describe each grouped mesh as a single individual phalanx; the source groups phalanges by digit.

The corresponding right-foot borrowed inventory is present as well, but this pilot validates only the left side. Do not mirror the left geometry to create the right side.

## Coordinate and conversion constraints

- The existing HRA female conversion documents its output as metres and Y-up, with the model centered and rested on the stage.
- The existing runtime loads compact binary atlas chunks through `atlas-female.json`; it does not load STL directly.
- The separate lower-limb donor import script converts its own Visible Human Female donor meshes from millimetres to metres and fits muscles to shared pelvis/femur/patella/tibia/fibula anchors. That transform is specific to that donor source and must not be copied blindly to BoneHub.
- The BoneHub STL pilot report records raw bounds and explicitly does not infer units, axes, or origin.
- Matching bounding boxes alone is insufficient. Bone surfaces and anatomical landmarks must be compared.

## Next validation gate

1. Retrieve only the BoneHub female lower-limb anchor meshes needed for registration (pelvis, femur, patella, tibia, fibula), recording exact source paths and byte counts before downloading.
2. Compare those source bones with the existing native female HRA skeletal structures. Establish a consistent rigid axis transform and uniform scale from multiple corresponding anatomical landmarks; reject a fit that requires per-bone distortion.
3. Apply that validated transform to the 17 left-foot meshes, then inspect talus–tibia/fibula articulation, calcaneus–talus relationship, navicular/cuboid/cuneiform arrangement, metatarsal order, toe direction, and laterality.
4. Render all 17 as a separate debug-only layer in the viewer. Keep the existing borrowed foot visible as a comparison/fallback.
5. Only after visual review, consider a separate proposal for replacing overlapping borrowed pieces and adding the missing grouped phalanges.
6. Run typecheck/build, inspect preview on desktop and mobile, and measure compressed payload impact.

## Acceptance criteria

- No production atlas part or chunk is removed during the pilot.
- Every imported mesh retains source ID, original STL path, side, region, and CC BY 4.0 attribution.
- One consistent transform is justified by multiple shared anatomical anchors.
- No non-uniform scaling or individual bone stretching is used to force a visual fit.
- Grouped toe phalanges are labeled accurately.
- Left and right anatomy are validated independently.
- Preview remains reversible and the existing geometry remains available as fallback.

## Attribution

Alavi, S. H., & Asseln, M. (2026). *Visible-Human-3D-Models* [Dataset]. https://doi.org/10.57967/hf/10464. License: CC BY 4.0.

Andreassen, T. E., Hume, D. R., Hamilton, L. D., Walker, K. E., Higinbotham, S. E., & Shelburne, K. B. (2023). Three Dimensional Lower Extremity Musculoskeletal Geometry of the Visible Human Female and Male. *Scientific Data*, 10, 34. https://doi.org/10.1038/s41597-022-01905-2.

## Registration-anchor download and integrity audit

A second isolated GitHub Actions job downloaded the five female left lower-extremity anchor meshes from the same BoneHub subject and source revision. The job completed successfully: [run 42833188527](https://github.com/Azevedo79z/Human-Atlas/actions/runs/42833188527).

| Anchor | Bytes | Triangles |
| --- | ---: | ---: |
| FEMUR_LEFT.stl | 12,512,884 | 250,256 |
| FIBULA_LEFT.stl | 3,044,284 | 60,884 |
| HIP_LEFT.stl | 14,247,084 | 284,940 |
| PATELLA_LEFT.stl | 995,884 | 19,916 |
| TIBIA_LEFT.stl | 8,185,284 | 163,704 |
| **Total** | **38,985,420** | **779,700** |

All five files are binary STL and passed parsing. SHA-256 checksums:

- FEMUR_LEFT: `5881c6585151527f1d584ed705c0ebabe0117ff7edc79fbeecd80a036812cdbb`
- FIBULA_LEFT: `12c091d23e0c17b36730112d14087e56f270d38b0d1c73b792b3622e2e6fc67b`
- HIP_LEFT: `3cbe60c7f7e1c1ccfa4413a7961f77e18f0f387d1af677d75906fcb4d988155c`
- PATELLA_LEFT: `15289d078c8c9cd009cdcbcf8d38e99d8d5752d77710bfffeadbfe10ca0e7898`
- TIBIA_LEFT: `e9a1d2d03e38f243b02842dca44ae3262f05df8f263bbdb79f73210381adc8d6`

The report preserves raw source bounds in the workflow artifact `female-left-anchor-audit`. Their coordinate values are consistent with a millimetre-scale source, but this audit intentionally does not declare units or infer a transform. No atlas manifest, binary model chunk, or production geometry was changed.

The next technical task is vertex-level registration against the HRA female native hip/femur/patella/tibia/fibula meshes. The transform must be supported by multiple anatomical landmarks and one consistent rigid rotation plus uniform scale and translation; bounding-box agreement alone is not acceptance.
