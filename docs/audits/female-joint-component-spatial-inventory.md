# Female joint patch component spatial inventory

**Status:** read-only geometric component inventory  
**Host revision:** `c67dabc7189f90a17b7d3fe997d517913eb3474c`  
**Donor revision:** `b0a20fa3a009ca5f6bfa07b7479312e04c862af2`

Extends the endpoint-crop topology report with per-component spatial descriptors: triangle count, unique source vertex count, centroid, axis-aligned bounds, and extents in millimeters. Components are edge-connected groups of triangles using original mesh vertex indices.

## Why this helps

The inventory distinguishes large spatially coherent mesh islands from small disconnected fragments. This can guide later visual inspection and candidate region segmentation without prematurely naming structures.

## Interpretation limits

- Endpoint regions remain longest-AABB-axis crops, not anatomical articular segmentations.
- Disconnected components may reflect source mesh construction, disconnected shells, or crop behavior.
- Component geometry does not prove a condyle, tibial plateau, cartilage, or ligament.
- No registration, transforms, anatomical labels, production geometry, viewer, manifests, or deployment are changed.
