# Female left-foot registration — preflight results

## Execution

- Workflow: `Female left-foot registration preflight`
- GitHub Actions run: `42836358934` (run number 5)
- Result: **success**
- Source branch: `feat/female-foot-registration-preflight`
- Commit: `bd23ac80c6fd6df06bc3527cb4f429e35eb3c79c`
- Artifact: `female-foot-registration-preflight` (2,925 bytes; retained until 2026-11-24)
- Source download: all 17 listed female `FOOT_LEFT` STL files downloaded; exact byte counts matched the inventory.

## Registration estimate

The workflow fitted one global uniform-scale, proper-rotation, and translation transform from 12 corresponding bone vertex centroids.

| Metric | Result |
|---|---:|
| Paired bones used for fitting | 12 |
| Estimated source-to-atlas scale | 0.0009829300 |
| Centroid residual RMS | 0.0042715 m (4.27 mm) |
| Maximum centroid residual | 0.0069908 m (6.99 mm) |
| Symmetric mean surface-distance range across paired bones | 1.76–3.76 mm |

The five grouped phalanx STL files were downloaded and size-checked, but they were not among the 12 centroid pairs used to estimate the transform. They must be included in the separate visual preview using the estimated transform, with their grouped-by-digit source structure preserved.

## Interpretation and gate

This is a **successful numerical preflight**, not anatomical acceptance. Nearest-vertex distances are diagnostics between differently tessellated meshes; they are not signed-distance measurements and do not establish joint-surface compatibility.

Before any replacement proposal:
1. Render the 17 source meshes in a separate debug-only layer using the estimated transform.
2. Check left/right orientation, toe direction, ankle and tarsal articulations, and alignment against the female body surface and lower-leg anatomy.
3. Review the five grouped phalanx meshes and preserve their grouping in labels.
4. Compare the overlay from multiple views and record any local offsets.
5. Keep all existing atlas geometry and production manifests unchanged until the preview passes review.

## Scope and provenance

The preflight did not transform, replace, or modify any source or atlas geometry. The report remains marked `preflight_only_not_approved_for_import`.

Source: BoneHub, *Visible-Human-3D-Models*, subject `02_Female`, region `FOOT_LEFT`, dataset revision `53bd62452ae3fc34ba0fa6188517cd8ca9bf4a10`, CC BY 4.0. This represents one 59-year-old female cadaveric reference.

## Separate repository check

The same commit also had a separate Deno lint workflow failure. Its log reports existing `no-node-globals` findings in Node-oriented scripts (including `scripts/import-lower-limb.mjs` and `scripts/convert-anatomy-glb.mjs`). The dedicated registration preflight job itself completed successfully. This lint issue is tracked separately and is not evidence that the registration estimate failed.
