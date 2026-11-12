# Female host-to-donor registration screen

**Status:** read-only diagnostic completed; no transform approved  
**Host revision:** `c67dabc7189f90a17b7d3fe997d517913eb3474c`  
**Donor revision:** `b0a20fa3a009ca5f6bfa07b7479312e04c862af2`

## Result

- 180 of 180 host borrowed-bone source IDs matched a skeletal part in the donor manifest.
- All 10 bilateral upper-limb landmarks were present: left/right clavicle, scapula, humerus, radius, and ulna.
- No host source-mapped borrowed-bone IDs were missing from the donor manifest.
- No donor upper-limb skeletal landmarks in the tested five families were unmatched in the host.
- The single global axis-aligned center fit is poor: X scale 1.694 (RMSE 0.0348), Y scale 1.003 (RMSE 0.0408), Z scale 1.191 (RMSE 0.0358), in source model coordinate units.

## Regional differences

The table gives median host-minus-donor bounding-box center offsets and median host/donor bounding-box extent ratios. These are measurements of bounds, not vertex-level registration.

| Region | Matched parts | Median center offset (X, Y, Z) | Median extent ratio (X, Y, Z) |
|---|---:|---|---|
| Ribs / costal cartilage | 38 | (-0.0028, +0.0080, -0.0379) | (1.09, 0.91, 0.99) |
| Clavicles | 2 | side-dependent X; Y about -0.0454; Z about -0.0161 | (0.86, 1.81, 1.02) |
| Scapulae | 2 | side-dependent X; Y about -0.018; Z about -0.025 | (0.97, 0.97, 1.06) |
| Humeri | 2 | side-dependent X (about 0.067-0.072); Y +0.008 to +0.014; Z -0.039 | (1.82, 0.84, 1.60) |
| Radii | 2 | side-dependent X (about 0.140-0.148); Y +0.055 to +0.071; Z -0.064 to -0.065 | (1.98, 0.82, 0.72) |
| Ulnae | 2 | side-dependent X (about 0.136-0.145); Y +0.047 to +0.063; Z -0.063 | (2.20, 0.83, 0.76) |

## Interpretation

1. Source-ID provenance is strong: the host borrowed bones can be traced to corresponding donor skeletal records.
2. The torso rib cage is comparatively close in position and size, although a consistent Z offset and moderate X/Y extent differences remain.
3. The upper-limb bones differ substantially in position and/or dimensions. The humeri are enlarged along X/Z relative to donor bounds; radii and ulnae show large lateral offsets and different extents.
4. A single global transform is therefore not a safe registration strategy for the upper-limb donor muscles.
5. The bounds screen cannot determine exact surface fit, joint articulation, tendon continuity, or muscle attachment correctness. Per-bone transformations may also include rotation and non-uniform scaling that AABB comparisons cannot recover.

## Next gate

Build a **region-specific, read-only anchor-registration proposal**. Start with the shoulder/upper arm and forearm separately; use corresponding donor/host bone surfaces and independently sourced muscle origin/insertion sites. Report candidate transforms and residuals without applying them. Only after visual review of representative muscles should a separate reversible viewer-integration change be proposed.

No source mesh, manifest, viewer, Wix integration, or production deployment was modified by this audit.
