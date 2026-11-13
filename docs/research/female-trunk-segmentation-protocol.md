# Female trunk muscle segmentation — source audit and pilot protocol

Status: research plan only. No anatomy geometry or production manifest is changed by this document.

## Confirmed source facts

- The University of Denver Visible Human Female record provides aligned cryosection DICOM, aligned CT, original segmentation masks/label maps, 3D Slicer NRRD masks, STL models, and a 55 KB metadata package.
- Its published musculoskeletal geometry paper describes the extracted structures as lower-extremity structures, from pelvis to ankle. The listed muscle set contains 38 named muscles per side (76 geometries per subject); it is not a published full-body muscle segmentation.
- The University of Denver page says its 3D Slicer masks are editable NRRD files and that the original segmentation work was manually outlined. The same page describes its published 3D models as cropped to the sternum during the image-processing workflow. Therefore, do not assume that the downloadable mask archive contains complete thoracic or upper-limb muscles.
- The NLM Visible Human Project provides the original female cryosection image dataset. The NLM page states that access to its FTP data does not require registration; the female image collection is large, so obtain only a small validation subset before any full download.
- The existing Atlas female donor-muscle layer contains the 76 lower-limb structures from the University of Denver dataset. Keep that layer and its attribution unchanged during this research phase.

## Objective

Determine whether a reproducible, anatomically defensible female pectoralis-major pilot can be segmented from original Visible Human Female cryosections and then represented as a separately selectable mesh in the Atlas.

The pilot is a feasibility test, not a claim of complete female musculature.

## Preflight — do these before segmentation

1. Inspect the University of Denver 55 KB metadata archive and inventory every named object, side, file, and anatomical region. Confirm whether any mask extends superior to the pelvis/hip. Do not infer coverage from archive size or folder names.
2. Inspect the NLM female sample cryosection images to confirm image orientation, spacing, color-channel integrity, and whether the thorax is represented.
3. Confirm the coordinate relationship between the NLM cryosections and any aligned University of Denver volumes. Do not combine volumes unless orientation, origin, spacing, and registration are verified.
4. Record source provenance, license/terms, acquisition resolution, image spacing, and all transformations in the project attribution.
5. If the sample passes, obtain only the required contiguous thoracic slices and aligned reference data. Avoid downloading the complete multi-gigabyte collection until the pilot requires it.

## Pilot segmentation

- Region: pectoralis major, left and right if image evidence supports both.
- Tool: 3D Slicer, using the original female cryosection volume as the primary evidence.
- Use adjacent slices and orthogonal views; do not interpolate through missing or ambiguous boundaries as if they were observed.
- Use CT only as an aligned secondary reference where it genuinely helps distinguish boundaries; CT is not a substitute for soft-tissue contrast in cryosections.
- Keep each side as a distinct segment and preserve the native voxel geometry.
- Record uncertain boundaries, excluded regions, and any manual edits.

## Acceptance gates before Atlas integration

A pilot mesh may proceed only when all gates pass:

1. **Source gate:** original female source images and their provenance are recorded and reproducible.
2. **Anatomy gate:** muscle boundaries are reviewed in axial, coronal, and sagittal planes; origin/insertion and neighboring structures are plausible.
3. **Geometry gate:** surface extraction produces a closed, non-self-intersecting mesh without obvious holes, spikes, or smoothing-induced shape loss.
4. **Coordinate gate:** the mesh is registered to the female reference body using documented anatomical landmarks; no non-uniform scaling or arbitrary stretching is allowed.
5. **Viewer gate:** left/right names, selection, visibility, isolation, and reset behavior work in the Atlas preview.
6. **Review gate:** the pilot is labeled as a donor-derived female reference structure, not as native geometry of the HRA body, and attribution is visible.

## Stop conditions

Stop and report the blocker if the source sample lacks the target region, image spacing/orientation cannot be verified, the muscle boundary cannot be reliably distinguished, or registration requires deformation that changes anatomy. Do not replace missing female geometry with a male mesh or an artist-deformed substitute.

## Next deliverable

A short source-inventory report identifying the exact files and labels available in the smallest relevant archive/sample, followed by a go/no-go decision for the pectoralis-major pilot. No production model changes are authorized by this research plan.
