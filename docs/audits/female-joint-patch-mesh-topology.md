# Female joint patch mesh topology audit

**Status:** read-only endpoint-crop topology inventory  
**Host revision:** `c67dabc7189f90a17b7d3fe997d517913eb3474c`  
**Donor revision:** `b0a20fa3a009ca5f6bfa07b7479312e04c862af2`

For each existing knee/ankle endpoint crop, the audit now examines every triangle whose centroid falls inside the crop. It builds undirected mesh edges from source vertex indices and computes edge-connected triangle components. The report includes component count and sizes, largest-component share, unique edge count, boundary edges, two-face manifold edges, and edges incident to more than two faces.

## Interpretation limits

- The crop is still defined by the longest AABB axis and the neighboring mesh AABB center; it is not an anatomical articular-surface segmentation.
- Boundary edges may be caused by the crop boundary itself and are not evidence of mesh holes.
- Connected components describe source mesh topology, not condyles, tibial plateaus, cartilage, or other anatomical structures.
- No anatomical labels, registration, transforms, production geometry, viewer, manifests, or deployment are changed.
