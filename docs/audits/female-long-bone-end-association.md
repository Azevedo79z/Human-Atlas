# Female long-bone endpoint association audit

**Status:** read-only geometric screen  
**Host revision:** `c67dabc7189f90a17b7d3fe997d517913eb3474c`  
**Donor revision:** `b0a20fa3a009ca5f6bfa07b7479312e04c862af2`

## Purpose
Determine which geometric end of selected long bones lies nearer each named neighboring structure. This creates evidence for subsequent anatomical review without assuming global axis directions or assigning proximal/distal labels.

## Method
- Match female host borrowed parts to donor skeletal parts by exact source ID.
- For each target bone, select its longest axis-aligned bounding-box dimension.
- Construct end-A and end-B slab centers at the outer 10% regions.
- Measure distances from each endpoint slab center to the neighboring bone's bounding-box center.
- Run donor and host independently.

## Limits
These are geometric proxies, not anatomical joint centers or articular landmarks. The longest AABB dimension may not equal the true anatomical shaft axis. The nearer endpoint does not establish proximal/distal identity, contact, congruence, or biomechanical correctness. All results require visual anatomical review.

## Safety
Read-only. No geometry, transforms, manifests, viewer, production assets, or deployment are modified.
