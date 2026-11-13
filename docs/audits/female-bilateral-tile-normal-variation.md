# Female bilateral spatial-tile normal orientation audit

Read-only comparison of the area-weighted mean surface normal in corresponding 4×4 endpoint-crop tiles. The right-side u-bin order is reversed when the first in-plane axis is X; the right normal's X component is reflected before comparing.

The angular difference uses the absolute dot product, making the metric insensitive to triangle winding sign. This is useful for comparing unoriented plane directions but intentionally hides normal reversal.

## Limits

The left and right endpoint crops are independently normalized AABB regions. Tile pairing is a simple normalized-bin mirror, not rigid registration or mesh correspondence. Per-tile mean normals can hide within-tile variation. These are geometric screening descriptors, not anatomical segmentation, cartilage assessment, or clinical measurements.
