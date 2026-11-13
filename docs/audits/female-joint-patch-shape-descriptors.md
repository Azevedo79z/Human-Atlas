# Female joint patch shape descriptors

**Status:** read-only geometric descriptor audit  
**Host revision:** `c67dabc7189f90a17b7d3fe997d517913eb3474c`  
**Donor revision:** `b0a20fa3a009ca5f6bfa07b7479312e04c862af2`

For each sampled endpoint-region patch, the audit now reports:
- sampled triangle surface area (mm²);
- sampled point centroid and axis-aligned bounds/extents (mm);
- valid triangle-normal count;
- mean signed and absolute normal components relative to the global X/Y/Z axes.

The donor and host coordinate frames are intentionally not registered. Signed normals depend on triangle winding; absolute normal components describe orientation relative to each model's own global axes. Surface area is based on sampled triangles and is not a full-mesh or articular cartilage area measurement.

These descriptors characterize AABB-derived endpoint crops only. They do not identify anatomical landmarks, articular cartilage, or clinical joint congruence. No production mesh, transforms, viewer, manifests, or deployment are changed.
