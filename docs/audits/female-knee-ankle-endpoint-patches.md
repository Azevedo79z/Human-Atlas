# Female knee and ankle endpoint patch audit

**Status:** read-only geometric endpoint-region comparison  
**Host revision:** `c67dabc7189f90a17b7d3fe997d517913eb3474c`  
**Donor revision:** `b0a20fa3a009ca5f6bfa07b7479312e04c862af2`

## Purpose
Move beyond whole-mesh distances by comparing sampled surfaces only within geometric end regions near the knee and ankle.

## Method
- Resolve donor pairs and host equivalents using exact borrowed source IDs where available, plus exact native aliases previously inventoried for femur, tibia, and fibula.
- For each bone, infer the endpoint nearest the neighboring mesh's bounding-box center along the bone's longest AABB axis.
- Crop mesh vertices and triangles to the outer 28% of that axis.
- Sample up to 500 vertices and 800 triangles per cropped region, then compute directed point-to-triangle distance distributions.
- Run donor and host independently; no coordinate transform or registration is applied.

## Interpretation limits
These crops are geometric endpoint regions, not anatomically segmented articular surfaces. They do not identify cartilage, menisci, ligaments, joint capsule, contact mechanics, or clinical joint space. Distances cannot establish congruence or anatomical correctness. Visual review is mandatory.

## Safety
Read-only. No transforms, geometry, manifests, viewer, production assets, or deployment are modified.
