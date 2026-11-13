# Female signed-normal and mesh-connectivity audit

Read-only screening of bilateral female knee and ankle endpoint patches using pinned host and donor mesh revisions.

## Measurements

- Signed dot products between corresponding area-weighted tile mean normals after reflecting the right-side X component.
- Signed angular differences, retaining the distinction between aligned and opposing mean directions.
- Connected-component counts and size distribution from the endpoint crop topology descriptor.
- Sampled triangle winding consistency from shared geometric edges in the sampled patch triangles.
- Boundary and non-manifold edge counts, with crop and sampling caveats.

## Interpretation limits

A positive signed dot does not prove globally outward-facing normals. Per-tile averages can conceal local face-level flips. The sampled winding test only examines sampled triangles and may miss adjacency because of sparse sampling. Boundary edges can be introduced by the endpoint crop. Connected components are geometric connectivity groups, not anatomical structures. No model, manifest, viewer, or production asset is modified.
