# Female left-foot joint proximity screening

This diagnostic runs against the separate review GLB created by the female left-foot overlay workflow.

```bash
python -m pip install numpy scipy trimesh
python scripts/analyze-female-foot-joint-proximity.py \
  --glb /path/to/female-left-foot-overlay.glb \
  --out female-left-foot-joint-proximity.json
```

It reports symmetric nearest-neighbour distances between deterministic samples of candidate vertices for 17 anatomically adjacent bone pairs.

## Safety and interpretation

- This is a screening aid only, not an anatomical approval.
- Vertex-to-vertex distances are not exact triangle-surface distances.
- No cartilage, ligaments, capsule, joint-space, or contact-mechanics model is included.
- No pass/fail threshold is applied; values must not be interpreted as clinical joint spaces.
- The five source phalange files are grouped by digit and are not individual phalanges.
- Tibia and fibula are not part of the current FOOT_LEFT source set, so ankle articulation is not assessed.
- No atlas model, source STL, application viewer, or production asset is modified.

Human review remains required for laterality, toe direction, orientation, articulation, and compatibility with the female body before any import proposal.
