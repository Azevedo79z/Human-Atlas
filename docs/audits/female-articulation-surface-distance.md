# Female articulation mesh surface distance audit

**Status:** read-only diagnostic; no transforms or geometry changed  
**Host revision:** `c67dabc7189f90a17b7d3fe997d517913eb3474c`  
**Donor revision:** `b0a20fa3a009ca5f6bfa07b7479312e04c862af2`

## Purpose

The preceding articulation proxy audit compared distances between bounding-box centers. This screen moves one level closer to the actual meshes: it samples vertices on each bone and measures their distance to sampled triangles on the paired bone surface, in both directions. Donor and host are evaluated independently in their own coordinate frames.

## Pair groups

- Shoulder: clavicle-scapula and scapula-humerus.
- Elbow: humerus-radius and humerus-ulna.
- Wrist: radius-scaphoid and radius-lunate.
- Knee: femur-patella and femur-tibia.
- Ankle: tibia-talus and talus-calcaneus.

Left and right are resolved separately. Host meshes are selected only through exact donor source-ID mapping.

## Method

1. Load two immutable manifests and their referenced binary geometry chunks.
2. Resolve named donor skeletal meshes and exact source-ID-matched host borrowed meshes.
3. Sample up to 180 vertices and 180 triangles per mesh deterministically.
4. Calculate point-to-triangle distances in both directions for each adjacent-bone pair.
5. Report donor and host distributions separately, plus the difference between their directional-median summaries.
6. Keep all results diagnostic-only; no transform is applied.

## Interpretation limits

- These are whole-bone mesh distances, not distances restricted to anatomically segmented articular patches.
- Sampling can miss small contact regions, thin features, or localized intersections.
- A small nearest distance can come from unrelated nearby surfaces; a large value can be dominated by non-articular portions of the bones.
- The result is not a cartilage gap, joint clearance, signed penetration, collision detection, range-of-motion analysis, biomechanics, or clinical validation.
- Donor and host coordinate frames are not registered to each other. Only within-model pair distances are compared.
- A difference between donor and host is a screening signal, not proof that either model is anatomically correct.

## Safety boundary

Read-only. The workflow downloads pinned manifests and geometry chunks, writes a JSON report, and uploads it as an artifact. It does not change source meshes, manifests, viewer code, Wix integration, production assets, or deployment.


A clean CI run on the current branch head is required before any interpretation or integration decision.
