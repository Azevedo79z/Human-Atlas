# Female left-foot overlay preview

This branch creates a separate downloadable GLB review artifact.

- Orange: 17 candidate female source meshes after applying the transform estimated from 12 paired centroids.
- Blue translucent: 12 existing borrowed atlas meshes used as references.
- Five phalange files remain grouped by digit and have no one-to-one atlas counterpart.

The workflow downloads the isolated source set and atlas manifest/chunk, estimates the transform, validates packed reference indices, and exports a GLB plus JSON reports.

## Safety boundary

This is a visual review artifact only. It does not write to \`public/models\`, replace meshes, change the application viewer, or publish an import. Review laterality, toe direction, ankle articulation, joint-surface compatibility, and fit against the female body before any replacement proposal.

## Run

GitHub Actions → **Female left-foot overlay preview** → Run workflow → branch \`feat/female-foot-overlay-preview\`.

The workflow also runs on pushes to this branch when its script or workflow changes.
