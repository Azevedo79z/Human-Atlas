# Female left ankle local-neighbourhood screening — run 8

Workflow run: https://github.com/Azevedo79z/Human-Atlas/actions/runs/43018606490
Artifact: `female-left-ankle-native-overlay-review` (review-only GLB + JSON reports)

## Validation

All workflow steps completed successfully on commit `b66bd9309d07eb36666fae46f13a13efa8f2db5c`. This confirms the reproducible download, parsing, preflight registration, GLB assembly, and report generation pipeline. It does not approve anatomical fit.

## Local screening results

The script crops native tibia/fibula vertices to the candidate talus axis-aligned bounds expanded by 20 mm, then computes deterministic sampled vertex-to-vertex nearest-neighbour distances.

| Pair | Symmetric mean | Minimum | Median A→B | P95 A→B |
|---|---:|---:|---:|---:|
| Candidate talus – native tibia | 13.21 mm | 0.56 mm | 17.03 mm | 28.13 mm |
| Candidate talus – native fibula | 20.73 mm | 3.72 mm | 28.47 mm | 45.55 mm |
| Native tibia – native fibula | 24.90 mm | 5.90 mm | 28.96 mm | 49.76 mm |

Local crop contained 98 of 385 tibia vertices and 51 of 169 fibula vertices. The candidate talus contains 94,116 vertices; 8,000 were sampled for each directed comparison.

## Interpretation

These are screening distances only. They are not anatomical joint-space measurements, surface-to-surface distances, or proof of collision/clearance. The crop is an axis-aligned bounding region, not an articular-surface segmentation. The foot and native lower-leg models originate from different female cadaveric subjects. The registration remains a global centroid-based preflight estimate.

The results warrant visual inspection of the GLB and a more anatomically constrained local registration/measurement before any integration proposal. No pass/fail threshold is applied. No production atlas assets were modified.

## Next validation gate

1. Inspect the GLB from anterior, posterior, medial, lateral, and plantar views.
2. Confirm laterality and the tibial plafond/fibular malleolus relative to the talus.
3. Replace the broad AABB crop with explicitly identified distal articular regions where the mesh supports it.
4. Use triangle-surface distances and report signed/unsigned limitations.
5. Keep the workflow and all outputs review-only until a human visual review approves them.
