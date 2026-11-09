# Female full-skeleton source integration

## Status

Source registry added for the Visible Human Female full-skeleton meshes. This is a data/provenance foundation only: the meshes are **not yet rendered in Human Atlas**, and no existing atlas geometry has been replaced.

## Source and licence

- Dataset: [BoneHub/visible-human-3d-models](https://huggingface.co/datasets/BoneHub/visible-human-3d-models)
- Pinned dataset revision: `53bd62452ae3fc34ba0fa6188517cd8ca9bf4a10`
- Licence: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/)
- Dataset citation: Alavi, S. H., & Asseln, M. (2026). *Visible-Human-3d-Models*. [DOI 10.57967/hf/10464](https://doi.org/10.57967/hf/10464).
- Original imaging/geometry reference: Andreassen et al. (2023), *Scientific Data*, 10, 34. [DOI 10.1038/s41597-022-01905-2](https://doi.org/10.1038/s41597-022-01905-2).

## Coverage

The pinned manifest lists 143 female STL labels. They cover the skull, spinal column, thorax, upper and lower extremities, hands and feet. A label is not always a single anatomical bone: the source combines some structures.

Known source limitations are recorded in `public/data/female-skeleton-source.json`: incomplete elbow surfaces; grouped phalanges; combined cranium/maxilla, sacrum/coccyx and sternum; absent hyoid and most sesamoid bones; and no costal cartilage.

## Female muscle coverage

The current female manifest already includes 76 donor-muscle meshes across 40 distinct source names, from a second female Visible Human specimen. The University of Denver release covers the pelvis-to-ankle region and is licensed CC BY 4.0. It does **not** supply a whole-body female muscle set for the trunk, upper limbs, neck or head. See `public/data/female-muscle-source.json` for the coverage inventory. The Portuguese term dictionary and educational explanations were expanded for 26 additional muscle names in this branch; laterality is rendered from the source's left/right suffix.

A generic muscle atlas may be considered only as a separately labelled illustrative layer, never as female-specimen-specific geometry. Any such source must retain its own licence and attribution.

## Integration rules

1. Keep the current Human Reference Atlas female organ/surface model as its own source layer.
2. Keep the Visible Human bones as a separately attributed source reference. Do not overlay them on the HRA female body: bilateral geometry checks rejected a single global similarity transform.
3. If a future overlay is proposed, require a matching body-surface reference and independent anatomical landmark validation; never conceal mismatch with per-bone scaling or arbitrary joint offsets.
4. Keep the source mesh identity and attribution available in each selected bone's detail panel.
5. Do not merge grouped source labels into individually named bones unless there is a validated segmentation to support that split.
6. Preserve the existing male atlas and current female dataset as fallbacks until visual, picking, search, mobile and performance tests pass.

## Next implementation stages

- Add a lazy-loaded STL pipeline with bounded concurrency, caching and graceful failure handling.
- Build a separate Visible Human scene in its own patient coordinate frame; do not convert it into HRA scene coordinates unless new matching-body evidence supports a validated transform.
- Add selectable/searchable bone records and Portuguese labels while retaining the original source identifier.
- Replace the provisional male-derived placeholder layer only after the female source skeleton is aligned and tested.
- Expand muscle coverage separately; this full-skeleton dataset contains bone meshes, not whole-body muscle geometry.
