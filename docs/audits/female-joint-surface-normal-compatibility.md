# Female joint surface normal compatibility audit

**Status:** read-only diagnostic extension  
**Host revision:** `c67dabc7189f90a17b7d3fe997d517913eb3474c`  
**Donor revision:** `b0a20fa3a009ca5f6bfa07b7479312e04c862af2`

## Purpose

The previous proximity report supplied sparse candidate coordinates. This extension adds local orientation evidence for each nearest sampled pair: the stored normal at the source vertex and the winding-derived normal of the opposing sampled triangle.

For each candidate it records the normal dot product and an opposing-normal angle, where 0 degrees indicates the two normals point in opposite directions. This is a geometric screening signal, not a test of joint anatomy.

## Method

- Read packed mesh positions, signed 16-bit vertex normals, and triangle indices from pinned source assets.
- Retain the same deterministic vertex/triangle sampling and nearest point-to-triangle procedure.
- Record source vertex index, opposing triangle index, both coordinates, both normals, distance, normal dot product, and opposing-normal angle.
- Evaluate donor and host separately in their own coordinate frames.

## Interpretation limits

- The nearest sampled points can lie on non-articular parts of the bones.
- Sparse sampling may miss the true nearest pair and localized surface details.
- The angle compares a stored vertex normal with a triangle normal calculated from sampled triangle winding. Incorrect/inconsistent winding or source normals can mislead.
- A normal angle near zero does not prove the surfaces are anatomically opposed or congruent.
- No articular patch is segmented; no signed distance, penetration, collision, cartilage, range-of-motion, biomechanics, or clinical validation is performed.
- Donor and host coordinates are not registered to each other.

## Safety boundary

Read-only. This workflow reads pinned manifests and binary mesh chunks and uploads a JSON evidence artifact. No geometry, transforms, manifests, viewer, production assets, or deployment are changed.
