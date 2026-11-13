# Female bilateral spatial tile distribution comparison

This read-only audit compares left/right normalized 4×4 tile area-share distributions for each available joint relation, source model (donor/host), and endpoint patch (A/B). Because the first in-plane axis is X in the current inventory, the right-side u-bin order is reversed as a simple mirror convention before comparison.

Reported descriptors include cosine similarity, Jensen–Shannon divergence, mean and maximum absolute tile-share difference, and the five largest tile differences.

## Interpretation limits

Each side is independently normalized to its own AABB crop. This is not rigid registration, landmark alignment, mesh correspondence, or anatomical equivalence. Area-share distributions omit exact surface locations and topology. Scores are screening descriptors only and must not be used as anatomical labels or clinical measurements.
