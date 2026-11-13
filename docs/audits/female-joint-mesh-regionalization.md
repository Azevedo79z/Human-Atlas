# Female joint mesh regionalization inventory

**Status:** read-only geometric inventory  
**Host revision:** `c67dabc7189f90a17b7d3fe997d517913eb3474c`  
**Donor revision:** `b0a20fa3a009ca5f6bfa07b7479312e04c862af2`

## Purpose

The preceding audits identify sparse whole-mesh proximity candidates but cannot tell whether those candidates cluster near a repeatable part of each bone. This inventory provides a first spatial partition to guide a later, more defensible regional surface analysis.

## Method

- Read every vertex from the pinned host and donor meshes for the mapped joint-adjacent bone pairs.
- For each mesh independently, select the longest axis-aligned bounding-box extent.
- Divide that extent into five equal normalized intervals.
- Record each interval's vertex count, centroid, and bounds in millimeters.
- Preserve donor source-ID to host borrowed-part matching.

## Interpretation limits

The labels `end-A`, `intermediate`, and `end-B` are geometric only. The axis is selected independently for every mesh; bin 0 on one bone is not necessarily anatomically equivalent to bin 0 on its neighbor or donor counterpart. This does not establish proximal/distal orientation, articular segmentation, attachment sites, or cartilage. No transforms or production geometry are changed.

## Safety

Read-only workflow. It downloads pinned source manifests and mesh chunks and publishes a JSON evidence artifact. It does not modify the viewer, manifests, geometry, transforms, production assets, or deployment.
