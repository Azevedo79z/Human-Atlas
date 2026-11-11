# Female skeleton — region crosswalk and import gates

Planning crosswalk only; no geometry is replaced. It compares the current female atlas manifest and the BoneHub Visible Human Female CT source.

## Source regions and current state

The BoneHub female STL tree has separate folders for skull, spinal column, thorax, left/right upper and lower extremities, hands and feet. The complete female mesh folder is listed as 304 MB.

| BoneHub region | Existing female atlas coverage | Initial action | Main validation concern |
|---|---|---|---|
| SKULL | 22 borrowed skull/face pieces | Candidate for female-native replacement | Cranium and maxilla are combined in one label; mandible is separate. Map current facial pieces carefully. |
| SPINAL_COLUMN | Native cervical, thoracic and lumbar vertebrae; sacrum/coccyx | Do not bulk import | CT source has L6; verify identity and avoid duplicate vertebrae. |
| THORAX | Native sternum; 38 borrowed ribs/costal cartilage | Candidate for female-native rib replacement only | CT dataset has no costal cartilage. Preserve it or source it separately. |
| UPPER_EXTREMITY_LEFT/RIGHT | 64 borrowed shoulder/arm/hand bones | Candidate for female-native replacement | Elbow CT truncation makes distal humerus and proximal radius/ulna incomplete. |
| HAND_LEFT/RIGHT | Hand bones included in borrowed set | Candidate for female-native replacement | Phalanges are grouped per digit; do not imply individual phalanx meshes. |
| LOWER_EXTREMITY_LEFT/RIGHT | Native female femur, patella, tibia and fibula; female donor muscles | Compare first; likely retain native bones | Any replacement must align with female surface and donor muscles. |
| FOOT_LEFT/RIGHT | 56 borrowed foot/ankle pieces (per project README) | Candidate for female-native replacement | Toe phalanges grouped; verify fit to skin and lower-leg muscles. |

## Critical source limitations

1. The 143 labels are not 143 independently segmented bones: phalanges are grouped by digit; cranium and maxilla share a label; sternum is grouped; sacrum includes coccyx.
2. The dataset documents incomplete elbow coverage: distal humerus and proximal radius/ulna are truncated.
3. The female CT mesh folders total 304 MB. Do not add them wholesale without a performance budget.
4. BoneHub is a different cadaver and CT coordinate frame from the existing HRA female body. Name matching or bounding-box matching alone is insufficient. Every imported region needs registration and visual review against surface, organs, joints and donor muscles.
5. Do not remove borrowed structures until a female-native replacement passes validation. Keep a reversible fallback.
6. This dataset supplies bone meshes only, not muscle, cartilage, tendon, ligament or nerve geometry.
7. Preserve original source labels and CC BY 4.0 attribution on redistributed/adapted assets.

## Recommended pilot

Start with one small region. Suggested first pilot: one foot, because it is independently packaged and can be checked against existing skin and lower-leg geometry. This is a side-by-side debug-layer test, not an immediate replacement.

Acceptance checklist:
- Download only one side's STL folder; record exact file count and bytes.
- Inspect STL bounds and triangle counts; establish units and axis orientation.
- Compare source landmarks with the existing female foot surface; do not fit by bounding boxes alone.
- Render source geometry in an isolated debug layer, keeping borrowed bones available and togglable.
- Check laterality and ankle articulation.
- Measure build size and mobile performance.
- Obtain visual approval in preview before replacing any current geometry.

## References

- BoneHub, *Visible Human Full-Skeleton 3D Bone Models*, CC BY 4.0, DOI: 10.57967/hf/10464 — https://huggingface.co/datasets/BoneHub/visible-human-3d-models
- Alavi, S. H. & Asseln, M. (2026). *Visible-Human-3d-Models* [Dataset]. https://doi.org/10.57967/hf/10464
- Andreassen, T. E. et al. (2023). *Three Dimensional Lower Extremity Musculoskeletal Geometry of the Visible Human Female and Male*. Scientific Data, 10, 34. https://doi.org/10.1038/s41597-022-01905-2
- Female STL folder tree — https://huggingface.co/datasets/BoneHub/visible-human-3d-models/tree/main/visible_human_3d_models/CT/Mesh/02_Female
