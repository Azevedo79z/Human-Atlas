# Female mesh registration gate

The Visible Human Female STL meshes must not be added to the live scene until their
coordinate registration has been measured against the female atlas.

## Registration utility

`app/anatomy-registration.ts` provides a deliberately small similarity transform:

- uniform scale;
- proper 3D rotation;
- translation;
- per-landmark residual reporting.

It does **not** assume that patient axes match the viewer axes, that STL coordinates
are millimetres, or that the two female references share an origin. The transform is
fitted from three non-collinear corresponding landmarks. Every additional landmark
is an independent validation point; it does not change the fit.

## Candidate shared structures found in the current female atlas

The female atlas manifest contains native skeletal meshes that also have named
counterparts in the Visible Human Female STL inventory. These are candidate
registration anchors, not proof that the two geometries are already aligned:

- Femur (left/right): HRA parts HRAF0937 / HRAF0911.
- Tibia (left/right): HRA parts HRAF0954 / HRAF0927.
- Fibula (left/right): HRA parts HRAF0955 / HRAF0928.
- Patella (left/right): HRA parts HRAF0953 / HRAF0929.
- Sacrum: HRA part HRAF0825.
- Ilium compact bone (left/right): HRA parts HRAF0828 / HRAF0827.
- Thoracic and cervical vertebrae: HRA parts HRAF0831–HRAF0849.

These names give us a practical pilot region (knee/lower limb) and additional
cross-checks around the pelvis and spine. The atlas also contains a sternum and
native vertebral/pelvic structures, but those are not all one-to-one with the STL
segmentation labels.

## Calibration procedure

1. Identify unambiguous structures present in both references (prefer the same
   specimen and source lineage where that can be established).
2. Record at least three non-collinear landmark coordinates in the STL and target
   atlas spaces. Use named, reproducible anatomical points rather than guessed
   bounding-box centers.
3. Fit the transform with `fitSimilarityRegistration`.
4. Inspect every residual, including landmarks not used in the fit. Reject a fit
   with large or regionally biased residuals.
5. Apply the transform to a small pilot set only (for example, a single patella
   and femur), then inspect front, side and three-quarter views.
6. Confirm joint relationships, left/right orientation, scale and body-surface
   alignment before expanding to the rest of the skeleton.

## Acceptance rules

- Never display an uncalibrated STL with an identity transform or guessed axis swap.
- Never infer a global fit from only one bone or one bounding box.
- A single uniform similarity transform is only a first test. If independent
  landmarks show systematic local mismatch, stop: the references may differ in
  pose, segmentation, specimen or deformation. Do not hide that mismatch with
  arbitrary per-bone scaling.
- Record the source revision, landmark definitions, transform, residuals and
  reviewer decision alongside the generated asset manifest.
- Keep the existing female atlas and complementary-bone layer available as the
  fallback until the pilot passes visual and anatomical QA.

## Current status

The registration utility is committed, but no landmark coordinates have yet been
measured. Therefore no transform has been approved, no STL has been converted or
loaded into the viewer, and no preview deployment should be treated as updated.

## Automated checks

The repository now exposes `npm run test:registration`, with focused checks for:

- identity transforms;
- a known 90-degree rotation, uniform scale and translation;
- rejection of collinear anchors;
- rejection of duplicate IDs and non-finite coordinates;
- reporting of an independent validation-point mismatch without silently refitting.

These tests are committed but have **not yet been executed** in this environment. They must pass before the registration helper is used in the asset pipeline.

## Binary geometry access status

The pinned source inventory identifies the left/right femur and patella STL files and their exact byte sizes. The repository manifest also identifies their candidate atlas counterparts. However, the STL payloads and the atlas chunk binary have not yet been retrieved into a local analysis workspace, so no vertex coordinates or anatomical landmarks have been measured. File names and bounding boxes alone are not sufficient to approve a transform.

A GitHub Actions workflow now runs the focused registration test file on pushes to
this development branch and on relevant pull-request changes. The workflow is
configured, but no run result has been observed yet; do not treat the tests as
passing until GitHub reports a completed successful run.

## First binary-geometry diagnostic (not an approved transform)

A temporary GitHub Actions artifact successfully retrieved the pinned left femur
and patella STL files plus atlas chunk `female-11.bin`. The artifact was kept
outside the repository and has a three-day retention period.

A surface-point-cloud diagnostic was run on the left femur. The candidate axis
orientation was seeded from the source dataset's documented patient directions,
then a constrained similarity ICP fit was estimated from the femur surface only.
With that femur-derived transform, independent left-patella surface comparison
produced a symmetric nearest-surface RMS of approximately 6.23 mm; the femur
symmetric RMS was approximately 7.23 mm. These are exploratory surface distances,
not anatomical landmark residuals, and no clinical or anatomical acceptance
threshold has been established.

This is encouraging enough to continue the investigation, but it is **not**
approval to load the mesh. The transform remains diagnostic only: the candidate
must also be checked against the tibia and additional landmarks, and the joint
relationships and three-dimensional overlays must be reviewed before any scene
integration. The transform has not been written into the application or applied
to production assets.

A second exploratory fit combined the left femur, patella and tibia, using
bone-specific nearest-surface correspondences but one shared transform. On the
sampled point clouds, symmetric surface RMS was approximately 8.18 mm (femur),
3.43 mm (patella) and 6.37 mm (tibia). This is a better diagnostic than fitting
the femur alone and then transferring that transform, but it remains a surface
registration—not landmark validation—and must be checked against held-out
right-side bones before it can be considered a candidate for visual review.
