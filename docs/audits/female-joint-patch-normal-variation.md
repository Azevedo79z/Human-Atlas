# Female joint patch local normal variation audit

**Status:** read-only geometric normal-variation proxy  
**Host revision:** `c67dabc7189f90a17b7d3fe997d517913eb3474c`  
**Donor revision:** `b0a20fa3a009ca5f6bfa07b7479312e04c862af2`

This audit extends the existing sampled knee/ankle endpoint-patch descriptors with a local surface-normal variation proxy. For each valid sampled triangle, it compares its unit normal with up to eight nearest sampled triangle-centroid neighbors, recording angular difference and angular difference divided by centroid separation (radians/mm). It reports mean, median, and 90th percentile values.

## Interpretation limits

- This is a sampling-density-dependent normal-variation proxy, not a fitted principal curvature or a differential-geometric curvature tensor.
- Triangle winding inconsistencies can inflate angular differences.
- The endpoint crops remain AABB-derived geometric regions, not anatomically segmented articular surfaces.
- No cartilage, menisci, ligaments, joint capsule, contact mechanics, anatomical landmark, or clinical congruence is inferred.
- Donor and host remain in their original coordinate frames; no registration or production geometry changes are applied.

The workflow is read-only and emits a JSON evidence artifact for review.
