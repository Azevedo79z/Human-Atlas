# Female full-skeleton source evaluation

Research snapshot: 2026-11-09. Scope: candidate female-specific skeletal geometry for filling missing skull, ribs, shoulder girdle, arms, forearms, hands and feet. This document is research and planning only. It does not import or replace any production geometry.

## Candidate: BoneHub Visible Human Full-Skeleton 3D Bone Models

- Dataset: https://huggingface.co/datasets/BoneHub/visible-human-3d-models
- DOI: https://doi.org/10.57967/hf/10464
- Interactive educational viewer: https://bonehub.github.io/Educational-Atlas/
- License: CC BY 4.0, stated in the dataset card. Preserve attribution to Seyed Hamidreza Alavi and Malte Asseln and cite the dataset DOI plus the underlying Visible Human source paper.
- Female subject: Visible Human Female, age 59, one cadaveric subject.
- Coverage: 143 individually labeled female bone structures spanning skull, spinal column, thorax, upper extremities, hands, lower extremities and feet.
- Available formats: CT segmentation label maps (.seg.nrrd), individual STL surface meshes, and NURBS CAD surfaces (.iges/.step).
- Provenance: aligned whole-body CT from the NLM Visible Human Project, redistributed/aligned by the University of Denver Center for Orthopaedic Biomechanics. Segmentation was model-assisted and human-verified by two trained annotators.
- The dataset is bone-only. CT does not resolve soft tissues well; it does not provide muscles, tendons, ligaments, cartilage or organs as individual meshes.

## Known limitations that must remain visible in the Atlas

1. Elbow region is incomplete in the original CT acquisition: distal humerus and proximal radius/ulna are incomplete.
2. Phalanges are grouped per digit rather than separated into proximal, middle and distal bones.
3. Cranium and maxilla are grouped; mandible is separate.
4. Sacrum and coccyx are grouped in one label.
5. Sternum is undivided (manubrium, body and xiphoid grouped).
6. Hyoid and most sesamoid bones are absent.
7. Costal cartilages are absent, so ribs do not geometrically connect to the sternum.
8. Segmentation reflects annotator judgment; the dataset card does not report inter-rater reliability.

## Relevance to the current female manifest

The current public/models/atlas-female.json manifest has 65 entries in skeletal, 16 in muscular, and 76 in donor-muscle. The skeletal inventory is visibly incomplete for a full skeleton: it includes selected vertebrae, sternum/manubrium, pelvis components and lower-limb structures, but does not yet provide a complete individually selectable skull, rib cage, shoulder girdle, arms, forearms, hands and feet.

BoneHub's 143 female bone labels are therefore a strong candidate for a separate missing-bone coverage comparison. They must not be blindly appended: many existing structures overlap anatomically with BoneHub labels, but the geometry definitions differ (for example, BoneHub's grouped sternum and sacrum/coccyx versus the current manifest's separate concepts). The source's incomplete elbow and grouped phalanges must be reflected in any coverage report.

## Required pre-import checks

1. Pin the exact dataset revision and download only the female subject files required for a first-pass inventory.
2. Verify the source file inventory and CC BY 4.0 attribution in the pinned revision.
3. Parse STL/segmentation metadata: units, orientation, coordinate frame, bounds, mesh count, vertex/triangle counts, normals and connected components.
4. Compare BoneHub anatomical labels to current HRA and Visible Human Female manifest concepts; classify each as exact match, partial/grouped match, missing candidate or incompatible.
5. Detect geometric overlap/duplicates and verify laterality and coordinate registration against validated landmarks.
6. Explicitly document known source limitations, especially elbow, grouped phalanges, cranium/maxilla, sacrum/coccyx, sternum and absent costal cartilage.
7. Produce a dry-run import plan and visual QA report. Do not modify the manifest until a separate import approval.

## Decision

Advance BoneHub to a **female skeleton inventory and compatibility audit**, not direct import. It is a promising female-specific source for the missing skeletal regions under CC BY 4.0, but it is one cadaver, has documented acquisition/segmentation limitations, and cannot fill the soft-tissue gap. Keep existing HRA and Visible Human Female muscle assets unchanged while comparing source coverage.

No geometry was downloaded or imported in this research step. No production assets or deployments were changed.
