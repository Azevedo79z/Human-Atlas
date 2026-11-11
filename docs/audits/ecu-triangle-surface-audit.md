# ECU bilateral surface audit — interpretation

## Scope

This note records the read-only geometric comparison for four donor records named **extensor carpi ulnaris (ECU)**. The source manifest is pinned to revision `b0a20fa3a009ca5f6bfa07b7479312e04c862af2`.

The audit reflects source samples across the X axis and measures the closest point on every target triangle. Distances are reported in the donor model's native coordinate units; the unit scale is not asserted here.

## Records

| Side | Record | Chunk | Vertices | Triangles |
|---|---|---:|---:|---:|
| Right | `BP3D_FJ1472` | 11 | 2,167 | 1,136 |
| Left | `BP3D_FJ1472M` | 11 | 2,185 | 1,152 |
| Right | `BP3D_FJ1517` | 12 | 662 | 504 |
| Left | `BP3D_FJ1517M` | 12 | 666 | 508 |

## Centroid baseline

P50 and P95 are shown in both directions because the sampled distance is directional.

| Right → Left | Same chunk? | P50 | P95 | Max |
|---|:---:|---:|---:|---:|
| FJ1472 → FJ1472M | Yes | 1.39e-17 | 5.65e-6 | 0.000310 |
| FJ1472 → FJ1517M | No | 0.000179 | 0.091807 | 0.096507 |
| FJ1517 → FJ1472M | No | 0.000335 | 0.003240 | 0.004943 |
| FJ1517 → FJ1517M | Yes | 2.78e-17 | 6.75e-5 | 0.000218 |

Reverse-direction results:

| Left → Right | P50 | P95 | Max |
|---|---:|---:|---:|
| FJ1472M → FJ1472 | 1.39e-17 | 1.62e-5 | 0.001213 |
| FJ1517M → FJ1472 | 0.000335 | 0.003178 | 0.004943 |
| FJ1472M → FJ1517 | 0.000154 | 0.091573 | 0.096507 |
| FJ1517M → FJ1517 | 2.78e-17 | 5.83e-5 | 0.000189 |

## Dense sample validation

A follow-up pass sampled every triangle centroid, all three triangle vertices, and all three edge midpoints, then reflected the samples across X and measured the closest point against every target triangle. Shared vertices and edges may be counted repeatedly across adjacent triangles. The directional sample counts therefore differ by mesh.

| Right → Left | Same chunk? | Samples | P50 | P95 | Max |
|---|:---:|---:|---:|---:|---:|
| FJ1472 → FJ1472M | Yes | 7,952 | 0 | 3.87e-7 | 0.000466 |
| FJ1472 → FJ1517M | No | 7,952 | 0.000183 | 0.092090 | 0.096564 |
| FJ1517 → FJ1472M | No | 3,528 | 0.000320 | 0.003280 | 0.005198 |
| FJ1517 → FJ1517M | Yes | 3,528 | 0 | 1.18e-5 | 0.000328 |

Reverse-direction dense results:

| Left → Right | Samples | P50 | P95 | Max |
|---|---:|---:|---:|---:|
| FJ1472M → FJ1472 | 8,064 | 0 | 5.94e-7 | 0.001214 |
| FJ1517M → FJ1472 | 3,556 | 0.000321 | 0.003261 | 0.005123 |
| FJ1472M → FJ1517 | 8,064 | 0.000162 | 0.091750 | 0.096564 |
| FJ1517M → FJ1517 | 3,556 | 0 | 2.63e-5 | 0.000283 |

The denser pass preserves the same ranking pattern: same-chunk pairings have near-zero median distances and substantially smaller P95/max values in both directions. Cross-chunk comparisons retain the larger tails, including P95 around 0.092 in one direction.

## Interpretation

1. The two **same-chunk pairings** are consistently the strongest geometric bilateral pairing hypotheses across both the centroid baseline and the denser sample pass.
2. The cross-chunk pairings show pronounced directional tails and greater maximum distances. This is consistent with different surface coverage or mesh extent and makes those pairings substantially less convincing as complete bilateral matches.
3. These values do **not** establish anatomical identity, correct laterality labels, clinical validity, or the donor's coordinate unit. Geometry alone cannot prove that a record is the intended ECU structure.

## Method limitations and next validation

- This is a sampled, directional surface-proximity diagnostic, not an exact continuous Hausdorff distance. The denser pass reduces gaps in sampling but does not prove a global bound on the unsampled surface.
- Vertices and edge midpoints may be repeated across adjacent triangles; the sample distribution is not area-weighted.
- No registration, scale fitting, or non-X transforms are applied.
- Independent inspection of source metadata and viewer placement remains necessary before any production decision.
- No donor geometry, manifest, viewer, Wix integration, or production deployment is modified by this audit.

**Disposition:** retain `FJ1472 ↔ FJ1472M` and `FJ1517 ↔ FJ1517M` as the strongest *geometric hypotheses* for the next validation stage. Do not automatically relabel, replace, or publish either record based on this audit alone.
