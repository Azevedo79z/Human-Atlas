# Visible Human Female — separate skeletal reference viewer

## Decision

The Visible Human Female bone meshes must remain a separate anatomical reference,
not be overlaid onto the current HuBMAP/HRA female body. Bilateral validation
showed that one global similarity transform cannot reconcile the two references.
Do not repair the mismatch with independent bone scaling or arbitrary joint offsets.

## Viewer concept

Add a separately selectable **Visible Human Female skeletal reference** mode while
leaving the existing male and HRA female atlas modes unchanged.

- Use the source dataset's own patient coordinate frame: +Z superior, -Y anterior,
  +X left; source STL coordinates are millimetres.
- Keep the HRA female skin, organs, native bones, borrowed bones and donor muscles
  in their existing scene and coordinate system.
- Display the Visible Human bones as an independent skeleton scene. Do not imply
  that its surface position matches the HRA skin.
- Preserve the source part ID, Portuguese display label, region, licence and
  citation in the selection panel.
- Make known segmentation limitations visible in the relevant part details.

## Loading and performance

The 143 STL files total approximately 5.33 GB. Never fetch or parse the entire
dataset at startup.

- Load only the selected anatomical region, with bounded concurrency and
  cancellation when the user changes region.
- Cache only recently used region assets; release GPU geometries/materials when
  evicting a region.
- Prefer a preprocessed, decimated and compressed asset format for browser use.
  Preserve original STL downloads as source provenance, not as the runtime format.
- Provide progress, retry and a clear message when a region cannot be loaded.
- Test desktop and mobile memory/GPU limits before exposing the mode publicly.

## Interaction requirements

- Search by Portuguese name, Latin/source name and original source ID.
- Select a bone by tapping its mesh or choosing it from the region inventory.
- Show name, laterality, region, source ID, source citation and known limitations.
- Support front, side, back and three-quarter views, zoom, reset and isolate.
- Keep the model centered by its own loaded region bounds; do not use HRA body
  bounds or HRA camera targets.

## Pilot sequence

1. Build and visually inspect a lower-limb pilot (left/right femur, patella and tibia).
2. Add the fibula and pelvic anchors; verify laterality and joint orientation.
3. Expand region-by-region to spine, thorax, upper limbs, hands, skull and feet.
4. Only after all regions pass picking, visual, mobile and performance QA should
   the separate reference mode be linked from the main atlas UI.

## Acceptance gates

- No runtime fetch of all 143 raw STL files.
- No transform borrowed from the HRA female scene.
- No deployment or merge until a complete region pilot has been visually reviewed.
- Keep the original HRA atlas as the default and fallback.
