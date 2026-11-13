# Female articulation proxy validation

**Status:** read-only diagnostic; no geometry or transforms changed  
**Host revision:** c67dabc7189f90a17b7d3fe997d517913eb3474c  
**Donor revision:** b0a20fa3a009ca5f6bfa07b7479312e04c862af2

## Purpose

After the rotation-aware landmark screen, this audit inventories selected adjacent-bone relationships and compares donor versus host distances between matched bounding-box centers. It helps identify where the host assembly departs from the donor's relative layout before any transform is proposed.

## Included proxy groups

- Shoulder: clavicle-scapula and scapula-humerus.
- Elbow: humerus-radius and humerus-ulna.
- Wrist: radius/ulna to selected carpal bones.
- Hand: metacarpal-to-proximal-phalanx and inter-phalangeal proxies.
- Ankle/foot: talus, calcaneus, navicular, cuboid, and cuneiform relationships.
- Toes: adjacent phalanx and metatarsal-to-proximal-phalanx proxies.
- Costal: rib-to-costal-cartilage proxies.

## Method

1. Load immutable host and donor manifests.
2. Match host borrowed skeletal parts to donor skeletal parts only by exact source ID.
3. Select explicitly named adjacent structures; include a pair only when both source-matched parts and bounds exist.
4. Compare Euclidean distances between donor bounding-box centers with the corresponding host center distances.
5. Report absolute and relative differences per pair and summarize by proxy group.

## Interpretation limits

- Bounding-box centers are not anatomical joint centers, articular surface landmarks, or cartilage-gap measurements.
- Center-to-center distance cannot establish surface congruence, contact, collision, range of motion, stability, or biomechanical correctness.
- Pair selection is an audit aid, not a complete joint inventory. Missing adjacent bones are excluded rather than inferred.
- This diagnostic does not apply the candidate transforms from PR #37 and does not establish a corrected alignment.

## Safety boundary

Read-only. The script downloads only pinned manifests and writes a JSON report in CI. It does not modify source meshes, manifests, viewer code, Wix integration, production assets, or deployment.
