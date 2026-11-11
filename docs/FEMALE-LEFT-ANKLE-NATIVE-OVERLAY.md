# Female left ankle — native tibia/fibula overlay review

## Purpose

Extend the isolated left-foot review to include the existing **native female atlas tibia and fibula**. This tests the candidate foot against the lower-leg geometry already present in the female atlas; it does not import a second tibia or fibula.

## Exact native atlas references

From Human Reference Atlas female v1.10, branch `feat/atlas-visible-skin-layer`:

| Structure | Atlas part ID | System | Chunk |
|---|---|---|---:|
| Tibia (left) | `HRAF0954` | skeletal | 11 |
| Fibula (left) | `HRAF0955` | skeletal | 11 |

The candidate left foot remains the 17-mesh BoneHub `02_Female/FOOT_LEFT` pilot. Its global registration is estimated against the existing borrowed foot references in chunk 12. The native tibia and fibula are added unchanged from chunk 11.

## Workflow

GitHub Actions → **Female left ankle native overlay review** → Run workflow.

The workflow downloads only the 17 left-foot STLs, the female atlas manifest, and atlas chunks 11 and 12. It then:
1. Estimates the same isolated foot preflight transform.
2. Builds the existing foot-only review GLB.
3. Adds native female atlas tibia and fibula as a separate teal layer.
4. Reports sampled vertex proximity for talus–tibia, talus–fibula, and tibia–fibula neighbourhoods.
5. Uploads the GLB and JSON reports as a review artifact.

## Interpretation and safety gate

- This is an isolated visualization and screening package only.
- The foot source is a different cadaveric subject and coordinate frame from the native atlas lower leg.
- The global foot transform is a preflight estimate; local ankle registration has not been performed.
- Sampled vertex distances are not exact surface distances, joint spaces, or clinical measurements.
- The tibia/fibula are read from the existing atlas manifest and chunk; they are not replaced, rewritten, or re-imported.
- No application viewer, production manifest, source STL, or deployed asset is modified.
- Human visual review is required for left/right orientation, ankle landmarks, talar mortise articulation, and local surface compatibility before any replacement proposal.

## Source attribution

The candidate foot meshes are from BoneHub, *Visible-Human-3D-Models* [Dataset], CC BY 4.0, DOI: https://doi.org/10.57967/hf/10464. The native lower-leg meshes are from Human Reference Atlas female v1.10, referenced by the repository's existing atlas manifest.
