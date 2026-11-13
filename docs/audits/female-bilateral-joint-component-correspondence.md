# Female bilateral joint component correspondence candidates

**Status:** read-only geometric candidate ranking  
**Host revision:** `c67dabc7189f90a17b7d3fe997d517913eb3474c`  
**Donor revision:** `b0a20fa3a009ca5f6bfa07b7479312e04c862af2`

For each left/right pair of endpoint-crop component inventories, this audit reflects the left component centroid and X bounds across the midline and ranks every left/right component pair by centroid distance. It also reports per-axis extent similarity and mirrored bounds.

## Interpretation limits

- No rigid registration, scaling, or one-to-one matching is performed.
- Candidate rankings use source coordinate frames and are sensitive to coordinate origins, pose, asymmetry, and crop boundaries.
- A small mirrored centroid distance is not proof of anatomical equivalence.
- Components remain mesh-connectivity islands within geometric AABB crops, not named anatomical structures.
- No production geometry, transforms, labels, manifests, viewer, or deployment are changed.
