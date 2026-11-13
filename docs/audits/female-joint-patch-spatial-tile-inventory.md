# Female joint patch spatial tile inventory

**Status:** read-only spatial evidence; no anatomical naming  
**Host revision:** `c67dabc7189f90a17b7d3fe997d517913eb3474c`  
**Donor revision:** `b0a20fa3a009ca5f6bfa07b7479312e04c862af2`

Each complete endpoint-crop triangle set is partitioned into a normalized 4×4 grid on the two axes orthogonal to the crop axis. For every occupied tile the report records triangle count, sampled surface area, area share, area-weighted centroid, and area-weighted mean triangle normal.

This produces a neutral spatial inventory to guide later visual review and candidate-region segmentation.

## Interpretation limits

- Tiles are geometric bins, not anatomical regions, condyles, plateaus, or cartilage.
- Grid orientation follows global source axes and is sensitive to pose and crop bounds.
- Area-weighted normals remain sensitive to triangle winding.
- Endpoint crops are AABB-derived and are not clinically validated articular surfaces.
- No registration, transforms, production geometry, anatomical labels, viewer, manifests, assets, or deployment are modified.
