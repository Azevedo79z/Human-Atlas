# Female rotation-aware landmark registration screen

**Status:** read-only diagnostic; no transform approved or applied  
**Host revision:** c67dabc7189f90a17b7d3fe997d517913eb3474c  
**Donor revision:** b0a20fa3a009ca5f6bfa07b7479312e04c862af2

## Purpose

The regional surface screen estimated axis-aligned scale and translation, which cannot recover a rotated coordinate frame. This follow-up evaluates a proper 3D rotation with uniform positive scale and translation, while keeping left, right, and midline landmarks separate.

## Method

1. Pair host borrowed skeletal parts to donor skeletal parts only by exact BORROWED:FJ... / BP3D_FJ... source IDs.
2. Derive laterality independently from the donor and host names. Report disagreements instead of silently reassigning sides.
3. Group matched bounding-box centers by broad anatomical family and laterality.
4. Estimate a proper rotation, uniform scale, and translation using Horn's quaternion least-squares method.
5. Reject groups with fewer than three anchors or nearly collinear anchor layouts.
6. Compare landmark residuals against translation-only alignment and report rotation, determinant, scale, and residual statistics.
7. Run synthetic tests with a known 90-degree rotation, known scale/translation, determinant check, and collinear-anchor rejection.

## Important interpretation limits

- Bounding-box centers are proxy landmarks, not verified joint centers, muscle attachment points, or anatomical fiducials.
- A low center residual does not establish mesh-surface registration, anatomical correctness, or correct articulation.
- Broad-family fits can hide local differences between individual bones.
- Uniform scale cannot represent anisotropic deformation or local shape changes.
- Reflections are deliberately disallowed; large residuals may indicate incompatible handed coordinate frames or different source geometry.
- This is not ICP, triangle-surface distance, collision detection, or clinical validation.
- Families with too few or degenerate anchors are explicitly marked rather than forced into a transform.

## Safety and deployment boundary

This screen downloads only two pinned manifests. It does not download or rewrite mesh geometry, apply transforms, change manifests, modify the viewer, change Wix integration, merge a pull request, or deploy production. Every transform is candidate-only evidence for review.
