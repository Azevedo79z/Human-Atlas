# ECU bilateral surface audit — interpretation

## Scope

This note records the read-only geometric comparison for four donor records named **extensor carpi ulnaris (ECU)**. The source manifest is pinned to revision `b0a20fa3a009ca5f6bfa07b7479312e04c862af2`.

The audit reflects source triangle centroids across the X axis and measures the closest point on every target triangle. Distances are reported in the donor model's native coordinate units; the unit scale is not asserted here.

## Records

| Side | Record | Chunk | Vertices | Triangles |
|---|---|---:|---:|---:|
| Right | `BP3D_FJ1472` | 11 | 2,167 | 1,136 |
| Left | `BP3D_FJ1472M` | 11 | 2,185 | 1,152 |
| Right | `BP3D_FJ1517` | 12 | 662 | 504 |
| Left | `BP3D_FJ1517M` | 12 | 666 | 508 |

## Results

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

## Interpretation

1. The two **same-chunk pairings** have extremely small reflected centroid-to-surface distances in both directions. This strongly supports them as the leading geometric bilateral pairing hypotheses.
2. The cross-chunk pairings show a pronounced directional tail: one direction has P95 near 0.092 while the reverse direction remains much smaller. This is consistent with different surface coverage or mesh extent and makes those pairings substantially less convincing as complete bilateral matches.
3. These values do **not** establish anatomical identity, correct laterality labels, clinical validity, or the donor's coordinate unit. Geometry alone cannot prove that a record is the intended ECU structure.

## Method limitations and next validation

- The calculation samples triangle centroids, not every point on each continuous surface. It is a directional sampled approximation, not an exact Hausdorff distance.
- No registration, scale fitting, or non-X transforms are applied.
- The next validation should sample vertices and edge midpoints as well as centroids in both directions, and independently inspect the source metadata / viewer placement before any production decision.
- No donor geometry, manifest, viewer, Wix integration, or production deployment is modified by this audit.

**Disposition:** retain `FJ1472 ↔ FJ1472M` and `FJ1517 ↔ FJ1517M` as the strongest *geometric hypotheses* for the next validation stage. Do not automatically relabel, replace, or publish either record based on this audit alone.
