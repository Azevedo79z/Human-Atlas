# Female lower-limb source coverage audit

**Status:** read-only manifest metadata audit  
**Host revision:** `c67dabc7189f90a17b7d3fe997d517913eb3474c`  
**Donor revision:** `b0a20fa3a009ca5f6bfa07b7479312e04c862af2`

## Purpose
Investigate why selected lower-limb endpoint relationships were measurable in the donor but did not resolve to host borrowed meshes.

## Method
- Check exact donor source-ID mappings for named bilateral lower-limb bones.
- Check exact normalized-name matches in the host manifest.
- Report additional token-based name candidates without treating them as equivalents.
- Include upper-limb bones as a control group.

## Limits
Manifest name candidates do not prove anatomical equivalence or scene visibility. A missing source ID does not prove a bone is absent from the rendered scene. Geometry is not loaded or modified.

## Safety
Read-only metadata inspection. No production assets, transforms, manifests, viewer, or deployment are changed.
