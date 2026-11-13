# Female global anatomical coordinate-frame audit

**Status:** read-only coordinate-direction screen  
**Host revision:** `c67dabc7189f90a17b7d3fe997d517913eb3474c`  
**Donor revision:** `b0a20fa3a009ca5f6bfa07b7479312e04c862af2`

## Purpose

Before labeling a bone's geometric ends as proximal or distal, establish whether the source meshes share a consistent global coordinate frame. This audit uses named bilateral bone pairs to identify a candidate left-right axis and ordered vertebral labels to identify a candidate superior-inferior axis.

## Method

- Match host borrowed bones to donor skeletal bones by exact source ID.
- Pair left/right structures by normalized names.
- Compare the absolute center separation along x, y, and z; report the dominant axis and sign consistency.
- Parse ordered cervical, thoracic, and lumbar vertebral labels and fit center position against vertebral rank.
- Analyze donor and host coordinate frames independently.

## Interpretation limits

Bounding-box centers are coarse landmarks. A dominant bilateral separation is evidence for a candidate lateral axis, not a complete anatomical coordinate system. Vertebral rank can suggest a superior-inferior direction only when enough names are recognized and the trend is strong. No proximal/distal limb-bone labels are assigned here; those require joint-neighbor and anatomical-end evidence plus visual review.

## Safety

Read-only. No transforms, geometry, manifests, viewer, production assets, or deployment are changed.
