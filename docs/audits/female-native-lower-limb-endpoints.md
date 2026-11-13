# Female native lower-limb endpoint audit

**Status:** read-only geometric comparison  
**Host revision:** `c67dabc7189f90a17b7d3fe997d517913eb3474c`  
**Donor revision:** `b0a20fa3a009ca5f6bfa07b7479312e04c862af2`

## Purpose
The source-coverage inventory found native host skeletal parts named Femur (left/right), Tibia (left/right), Fibula (left/right), and Patella (left/right), while these do not map to the donor's borrowed source IDs. This audit explicitly resolves those host name aliases and compares geometric endpoint-to-neighbor association against the donor.

## Method
- Use exact source-ID matches when available.
- For femur, tibia, fibula, and patella, use the exact host skeletal names recorded in the source-coverage report.
- Estimate end-A/end-B from the longest AABB axis and compare endpoint slab centers to adjacent bone AABB centers.
- Report whether donor and host select the same geometric end.

## Limits
This is not an anatomical registration. Name aliases are not source-ID equivalence. AABB endpoint proxies cannot establish proximal/distal identity, articular congruence, or biomechanical validity. Visual review is required.

## Safety
Read-only. No transforms, geometry, manifests, viewer, production assets, or deployment are changed.
