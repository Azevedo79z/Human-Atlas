# Female joint proximity candidate mapping

**Status:** read-only diagnostic extension  
**Host revision:** `c67dabc7189f90a17b7d3fe997d517913eb3474c`  
**Donor revision:** `b0a20fa3a009ca5f6bfa07b7479312e04c862af2`

## Purpose

The prior whole-bone distance report gave a global distribution that is dominated by non-articular regions. This follow-up retains the 12 smallest sampled point-to-triangle distances in each direction for each measured bone pair, including both 3D coordinates in millimetres.

This provides sparse candidate locations for later visual inspection and anatomical region segmentation. It does not automatically identify a joint surface.

## Output

For each donor and host pair, in each direction:
- the sampled point coordinate;
- the closest point on one of the sampled opposing triangles;
- the approximate separation in millimetres.

Coordinates remain in their own source model coordinate frame. Donor coordinates must not be compared directly with host coordinates without a validated registration.

## Interpretation limits

- The report uses at most 180 evenly spaced vertex samples and 180 sampled triangles per mesh.
- Candidate coordinates are sparse hints; they are not validated anatomical landmarks, articular patches, cartilage boundaries, or contact points.
- Sampling can miss the actual closest surface pair and small/localized geometry.
- A close pair can occur between non-articular portions of adjacent bones.
- Distances are unsigned; they do not establish penetration, collision, clearance, or joint congruence.
- This is not a biomechanical or clinical validation.

## Safety boundary

Read-only. The workflow reads pinned source manifests and geometry chunks and writes a report artifact. It does not alter meshes, manifests, transforms, viewer code, production assets, or deployment.
