# Visible Human Female thorax source inventory

Status: source inventory only. No images are committed, no geometry is generated, and no production manifest is changed.

## Result

**GO for a small source-format inspection; NO-GO for anatomical segmentation or Atlas integration yet.**

The NLM public Female-Images index exposes a dedicated `Fullcolor/thorax/` directory. This confirms that original female thoracic cryosection data is available separately from the lower-limb-only University of Denver muscle meshes.

## Verified directory inventory

Source directory: https://data.lhncbc.nlm.nih.gov/public/Visible-Human/Female-Images/Fullcolor/thorax/

- The directory index lists numbered file groups from `avf1262` through `avf1488`.
- Each numbered group has three files: suffixes `a`, `b`, and `c`, each with extension `.raw.Z`.
- The index therefore lists 227 numbered groups × 3 files = 681 compressed raw files, plus a README.
- The displayed compressed file sizes are generally about 4.5–5.2 MB per file. This is a multi-gigabyte source region, not a tiny pilot download.
- The public NLM sample directory separately lists `Five slices from the visible Female.zip` at 16,400,864 bytes. The directory listing alone does not establish that those five slices are thoracic or that they correspond to the thorax sequence above.

## What is not yet verified

The NLM directory index does not explain the meaning of the `a/b/c` suffixes, the raw image dimensions, channel layout, byte order, pixel spacing, slice spacing, anatomical index mapping, or the exact thoracic extent. The README is listed, but the current browser retrieval returned an unsupported binary content-type error; a direct retrieval attempt was also unavailable in this environment.

Do not guess these values and do not concatenate or import the raw files until the README/specification is obtained and checked.

## Minimal next preflight

1. Obtain the NLM thorax README or official format specification.
2. Inspect the five-slice female sample archive and identify its anatomical level and file format. Do not assume it is thoracic.
3. Confirm raw dimensions, channel semantics, byte order, orientation, pixel spacing, and slice spacing from authoritative metadata.
4. Identify a small contiguous thoracic interval suitable for pectoralis-major review. Estimate download size before retrieval.
5. Load the validated sample in 3D Slicer (or a controlled conversion script) and visually confirm orientation and soft-tissue detail before segmenting.


## Additional finding — full-body image directory

The NLM Female-Images Fullcolor index also exposes a separate `fullbody/` directory, in addition to `thorax/`, `abdomen/`, `pelvis/`, `thighs/`, `legs/`, and `head/`. Its listing begins with `avf1001a.raw.Z`, `avf1001b.raw.Z`, and `avf1001c.raw.Z`. This is a potentially better source path for preserving one continuous female image sequence across anatomical regions, but the index alone does not establish how its files relate to the region-specific directories or what the a/b/c suffixes mean.

The sample-data index confirms a five-slice female ZIP of 16,400,864 bytes. It does not identify the anatomical levels in the index, so it remains a format/sample candidate only—not yet a thorax sample.

- Fullcolor directory index: https://data.lhncbc.nlm.nih.gov/public/Visible-Human/Female-Images/Fullcolor/index.html
- Fullbody directory index: https://data.lhncbc.nlm.nih.gov/public/Visible-Human/Female-Images/Fullcolor/fullbody/index.html
- Sample-data index: https://data.lhncbc.nlm.nih.gov/public/Visible-Human/Sample-Data/index.html


## Fullbody sequence bounds and README retrieval test

The official fullbody directory index starts at `avf1001a.raw.Z` and visibly reaches at least `avf2729c.raw.Z` near the end of the indexed listing. The files are grouped by numeric identifier with three suffixes (`a/b/c`) per identifier. This is a large sequence (thousands of raw files), so a whole-folder download is not an appropriate preflight.

The parent Fullcolor index lists a 2,034-byte file named `README`. Both the browser page reader and direct page open rejected it as `application/octet-stream` (unsupported content type); an attempted binary download from this environment also failed. Its contents therefore remain **unread**, and no meaning is assigned to the a/b/c suffixes.

**Decision:** do not download the fullbody folder, infer channel semantics, concatenate files, or build a volume yet. First obtain the README through a supported binary/file retrieval route or another authoritative NLM format specification. Then test only a tiny, explicitly documented sample.

Verified index references:
- Fullcolor parent index and README entry: https://data.lhncbc.nlm.nih.gov/public/Visible-Human/Female-Images/Fullcolor/index.html
- Fullbody listing, first entries: https://data.lhncbc.nlm.nih.gov/public/Visible-Human/Female-Images/Fullcolor/fullbody/index.html
- Fullbody listing, terminal entries visible in the fetched page: https://data.lhncbc.nlm.nih.gov/public/Visible-Human/Female-Images/Fullcolor/fullbody/index.html

## Atlas safety boundary

The existing 76 lower-limb donor-muscle structures remain unchanged. This inventory does not establish that pectoralis major is already segmented, does not authorize synthetic or male-derived female geometry, and does not authorize production integration. Any future left/right pectoralis-major segment must be independently evidenced in the female source slices and pass the project's anatomy, geometry, coordinate, attribution, and viewer acceptance gates.

## Sources

- NLM Female Images index: https://data.lhncbc.nlm.nih.gov/public/Visible-Human/Female-Images/index.html
- NLM Fullcolor thorax directory index: https://data.lhncbc.nlm.nih.gov/public/Visible-Human/Female-Images/Fullcolor/thorax/index.html
- NLM sample-data directory index: https://data.lhncbc.nlm.nih.gov/public/Visible-Human/Sample-Data/index.html
- University of Denver lower-extremity dataset and paper: https://digitalcommons.du.edu/visiblehuman/1/ and https://www.nature.com/articles/s41597-022-01905-2
