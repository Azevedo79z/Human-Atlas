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
