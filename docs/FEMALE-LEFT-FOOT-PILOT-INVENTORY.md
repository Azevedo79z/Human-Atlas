# Female-native left-foot pilot inventory

## Decision

Use the **Visible Human Female left foot** as the first isolated import pilot. This is a geometry-validation exercise only: it does not replace any existing atlas meshes and does not change the application.

Source dataset: BoneHub, *Visible-Human-3D-Models*, CC BY 4.0.
Dataset revision recorded by the Educational Atlas manifest: `53bd62452ae3fc34ba0fa6188517cd8ca9bf4a10`.
Subject: `02_Female` (59-year-old cadaveric reference).
Region: `FOOT_LEFT`.

## Exact source inventory

The source manifest lists 17 separate STL meshes for the female left foot:

| Structure ID | STL bytes |
|---|---:|
| `CALCANEUS_LEFT` | 2,437,884 |
| `CUBOID_LEFT` | 676,284 |
| `INTERMEDIATE_CUNEIFORM_LEFT` | 335,684 |
| `LATERAL_CUNEIFORM_LEFT` | 376,484 |
| `MEDIAL_CUNEIFORM_LEFT` | 563,884 |
| `METATARSAL_1_LEFT` | 1,011,484 |
| `METATARSAL_2_LEFT` | 683,084 |
| `METATARSAL_3_LEFT` | 623,484 |
| `METATARSAL_4_LEFT` | 592,084 |
| `METATARSAL_5_LEFT` | 628,884 |
| `NAVICULAR_LEFT` | 649,484 |
| `PHALANGE_FOOT_1_LEFT` | 777,284 |
| `PHALANGE_FOOT_2_LEFT` | 372,284 |
| `PHALANGE_FOOT_3_LEFT` | 297,284 |
| `PHALANGE_FOOT_4_LEFT` | 261,284 |
| `PHALANGE_FOOT_5_LEFT` | 266,884 |
| `TALUS_LEFT` | 1,568,684 |
| **Total** | **12,122,428 bytes (~11.56 MiB)** |

Files follow the dataset's documented pattern:
`visible_human_3d_models/CT/Mesh/02_Female/FOOT_LEFT/<STRUCTURE_ID>.stl`.

The full left-foot pilot is modest enough to test as a focused asset set; do not fetch the full 304 MB female mesh tree.

## Integration constraints

- The current atlas viewer does **not** load STL directly. Its runtime consumes compact binary chunks referenced by the JSON manifest (`positions`, `normals`, `indices`, per-part bounds).
- Existing conversion tooling establishes the atlas coordinate convention as meters and Y-up for the Human Reference Atlas source.
- The existing lower-limb import script parses STL and converts its millimetre coordinates to metres, but its fitting routine is specific to female donor muscles. Do not reuse that placement logic blindly for foot bones.
- BoneHub foot meshes are individual bone STLs. They are not a soft-tissue model and do not add muscles, tendons, ligaments, cartilage, nerves, or skin.
- The dataset notes that phalanges are grouped by digit rather than supplied as each individual phalanx. Preserve that limitation in labels and UI.
- Source is one 59-year-old female cadaveric reference, not a population-representative female anatomy.

## Pilot validation sequence (before any app change)

1. Download only the 17 female `FOOT_LEFT` STL files and verify their byte counts against the manifest.
2. Parse each STL (binary or ASCII); reject empty, non-finite, or non-triangulated meshes.
3. Record per-mesh vertex/triangle counts and bounds; confirm the source unit convention from source metadata/documentation before scaling.
4. Establish the coordinate transform using corresponding, already-present anatomical anchors from the female atlas. Compare the existing borrowed left-foot/ankle geometry with the candidate source; do not assume the two datasets share origin, axes, or scale.
5. Preview the 17 bones as a separate debug-only layer beside the current model. Check laterality, ankle articulation, foot proportions, toe direction, and fit against the female surface.
6. Measure compressed payload size and mobile loading cost.
7. Only after visual and numerical review, prepare a separate replacement proposal. Keep the current geometry intact until the user approves the preview.

## Attribution

Alavi, S. H., & Asseln, M. (2026). *Visible-Human-3D-Models* [Dataset]. Hugging Face. https://doi.org/10.57967/hf/10464. License: CC BY 4.0.

Andreassen, T. E., Hume, D. R., Hamilton, L. D., Walker, K. E., Higinbotham, S. E., & Shelburne, K. B. (2023). Three Dimensional Lower Extremity Musculoskeletal Geometry of the Visible Human Female and Male. *Scientific Data*, 10, 34. https://doi.org/10.1038/s41597-022-01905-2.


## Automated validation workflow

The isolated GitHub Actions workflow is defined at
`.github/workflows/female-left-foot-pilot.yml`. It downloads only the 17
left-foot STL files, checks each exact byte count against this inventory,
runs the STL parser, and uploads a JSON validation report. It does not modify
the application, atlas manifests, or production geometry.

Manual execution: GitHub Actions → "Validate female left-foot STL pilot" →
Run workflow → branch `docs/female-left-foot-pilot`.
