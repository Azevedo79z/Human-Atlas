# Female regional surface registration screen

**Status:** read-only diagnostic proposal; no transform approved  
**Host revision:** \`c67dabc7189f90a17b7d3fe997d517913eb3474c\`  
**Donor revision:** \`b0a20fa3a009ca5f6bfa07b7479312e04c862af2\`

## Purpose

The preceding host/donor audit established source-ID correspondence and showed that a single global center fit is inadequate. Earlier regional screens used a small set of named bone anchors and sampled muscle-to-bone proximity. This screen adds a different check: it uses every source-ID-matched borrowed skeletal part with usable bounds, fits independent axis-aligned scale/translation candidates by anatomical family, and measures sampled surface agreement for each matched bone pair.

## Method

1. Pair each host \`BORROWED:FJ...\` part to donor \`BP3D_FJ...\` by exact source ID. No name-only pairing is accepted.
2. Group matched parts into anatomical families (ribs, shoulder girdle, upper arm, forearm, pelvis, thigh, leg, foot, spine, skull, sternum, and other).
3. Fit per-axis scale and translation from donor/host bounding-box centers within each family.
4. Sample up to 48 vertices from each donor and host bone mesh.
5. Measure nearest sampled-vertex distances in both directions after applying the candidate family fit; report per-part and per-family residual summaries.
6. Upload the JSON report as a CI artifact for review.

## Interpretation limits

- This is a sampled vertex-to-vertex screen, not exact triangle-surface distance, continuous Hausdorff distance, collision detection, or ICP.
- Axis-aligned scale/translation cannot recover arbitrary 3D rotation or local deformation.
- A family may combine articulated bones with different local poses; a good family-level center fit is not proof of a valid joint-level registration.
- Negative scales, unstable axes, sparse families, and large surface residuals are review flags, not automatic corrections.
- Distances are displayed in millimetres assuming the source manifest coordinates are metres.
- Surface proximity does not establish anatomical equivalence, muscle origin/insertion, laterality, or donor suitability.

## Safety

The script only downloads two pinned manifests and the binary chunks referenced by matched bone parts. It does not write or transform any source geometry, alter manifests, modify viewer code, change Wix integration, merge a pull request, or deploy production. All candidate transforms remain diagnostic data.
