# Female soft-tissue source register

Research snapshot: 2026-11-09. Scope: candidate sources for filling gaps in the female anatomy atlas, especially trunk, shoulder, upper limb, forearm, hand and pelvic floor. This is a source review only; no geometry is imported or changed.

## Findings

### 1. Visible Human Female lower-extremity musculoskeletal geometries — approved source candidate for its documented scope

- Landing page: https://digitalcommons.du.edu/visiblehuman/1/
- Paper: Andreassen et al. (2023), https://doi.org/10.1038/s41597-022-01905-2
- DOI/data record: https://doi.org/10.56902/COB.vh.2022.1
- License: CC BY 4.0, stated by the University of Denver data record.
- Scope: pelvis to ankle; per subject, 76 individual muscle geometries, 28 bones, 16 cartilage geometries, 8 ligaments and 2 fat geometries. Includes both female and male Visible Human specimens.
- Formats include original, smoothed and final STL meshes, plus segmentation masks and metadata.
- The existing female manifest already declares 76 `donor-muscle` structures from this source. Do not duplicate them.
- This is not a source for shoulder, thorax, arm, forearm, hand, neck or head muscles.

The dataset authors explain that final geometries were visually inspected and overlap/overclosure was corrected. This is useful provenance, not a substitute for validating the files and registration in this Atlas.

### 2. NLM Visible Human Female cross-sectional image data — potential source for new segmentations, not ready-made muscle meshes

- Overview: https://www.nlm.nih.gov/research/visible/visible_human.html
- Data access: https://www.nlm.nih.gov/research/visible/getting_data.html
- The NLM describes publicly available female cryosection, CT and MRI data. The female anatomical image sequence has approximately 0.33 mm spacing and more than 5,000 images.
- These are source images, not a pre-segmented full-body library of individually named muscle meshes.
- Any new structures would require segmentation, anatomical review, mesh generation, coordinate registration and quality assurance.
- The NLM describes the Visible Human Project image data as public-domain; derivative segmentation/model records must still be checked individually for their own terms and attribution.

### 3. NIH 3D / Human Reference Atlas — promising female whole-body reference, contents and license must be verified per asset

- Candidate: NIH 3D entry 3DPX-020992, “Body, Female”: https://3d.nih.gov/entries/3DPX-020992
- Published asset: `hra-reference-organ-united-female-v1.5.glb`.
- The entry describes it as a Female-united reference-organ set derived from Visible Human data.
- NIH 3D explicitly says licensing varies by model and users must review the assigned license. The landing page inspected for this register does not provide a clear license statement for this specific asset.
- A unified GLB may contain named scene objects or combined objects. Its title alone does not establish that it contains individual muscles, tendons or ligaments.
- Status: inspect metadata, node/object names, source details and assigned license before any reuse. Do not import until these checks pass.

### 4. Z-Anatomy / BodyParts3D — useful for nomenclature and educational metadata, not a female-specific mesh source

- Z-Anatomy data is licensed CC BY-SA 4.0; BodyParts3D licensing/attribution must be preserved according to the exact version and source record.
- These resources can help curate anatomical names, Latin terminology, muscle actions, origins and insertions.
- The available general adult detailed atlas is not evidence of female-specific geometry. Do not relabel its male-derived meshes as female anatomy.
- If adapted data is used, preserve the applicable share-alike terms and attribution.

## Decision matrix

| Source | Female-specific geometry | Upper-body individual muscle meshes | Terms known | Current decision |
|---|---|---|---|---|
| Visible Human Female lower-extremity dataset | Yes | No | CC BY 4.0 | Retain existing lower-limb use; do not duplicate |
| NLM Visible Human Female images | Yes, source images | Not pre-segmented | NLM describes source images as public domain | Potential segmentation source; high effort |
| NIH 3D Female-united GLB | Female reference set | Not yet verified | Per-asset license unclear in inspected record | Inspect only; no import |
| Z-Anatomy / BodyParts3D | Not established for female mesh geometry | Anatomical content exists, sex-specific geometry not established | CC BY-SA / version-specific | Use for terminology and reviewed educational metadata only |

## Required gate before any import

1. Obtain the exact downloadable asset and immutable version/DOI.
2. Confirm the license for that exact file and preserve attribution/share-alike requirements.
3. Inspect GLB/STL scene objects, names, hierarchy, transforms, units, bounds, vertex/index counts and normals.
4. Determine whether objects are separate muscles or a single combined body/organ shell.
5. Compare anatomy against trusted female source imagery and documented landmarks.
6. Register to the female atlas using validated landmarks and surface checks; do not use a blanket non-uniform scale or simple mirroring.
7. Run mesh, overlap, laterality and visual QA; only then prepare a separate import plan.

## Current recommendation

Keep the existing Visible Human Female lower-limb meshes as the verified provenance path already declared by the manifest. For upper-body coverage, investigate the NLM female cryosection source as the most defensible female-specific route, while first inspecting the NIH 3D Female-united GLB as a potentially lower-effort candidate. Z-Anatomy should support names and educational metadata, not be used to disguise male-derived geometry as female.

No new anatomy, meshes, source attribution or clinical claims are fabricated in this register. No production assets are modified.
