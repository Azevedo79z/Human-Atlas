#!/usr/bin/env python3
"""Append native female atlas tibia/fibula to an isolated left-foot review GLB.

The output is a review-only artifact. No production manifest or geometry is changed.
"""
import argparse
import json
import numpy as np
import trimesh


def add_mesh(scene, name, vertices, faces, rgba):
    mesh = trimesh.Trimesh(
        vertices=np.asarray(vertices, dtype=np.float32),
        faces=np.asarray(faces, dtype=np.int64),
        process=False,
    )
    mesh.visual.face_colors = np.tile(np.asarray(rgba, dtype=np.uint8), (len(mesh.faces), 1))
    scene.add_geometry(mesh, geom_name=name, node_name=name)


def main():
    p = argparse.ArgumentParser()
    for key in ("glb", "manifest", "chunk", "out", "report"):
        p.add_argument("--" + key, required=True)
    a = p.parse_args()

    manifest = json.load(open(a.manifest, encoding="utf-8"))
    chunk_info = manifest["chunks"][11]
    chunk = open(a.chunk, "rb").read()
    if len(chunk) != int(chunk_info["bytes"]):
        raise ValueError("Female atlas chunk 11 byte count mismatch")

    parts = {part["id"]: part for part in manifest["parts"]}
    expected = {
        "HRAF0954": ("Tibia (left)", "ATLAS_NATIVE_TIBIA_LEFT"),
        "HRAF0955": ("Fibula (left)", "ATLAS_NATIVE_FIBULA_LEFT"),
    }
    scene = trimesh.load(a.glb, force="scene")
    added = []

    for part_id, (expected_name, node_name) in expected.items():
        part = parts.get(part_id)
        if not part:
            raise ValueError(f"Missing native female atlas part {part_id}")
        if part["name"] != expected_name or part["system"] != "skeletal" or int(part["chunk"]) != 11:
            raise ValueError(f"Unexpected atlas mapping for {part_id}: {part}")
        n, ni = int(part["vertexCount"]), int(part["indexCount"])
        po, io = int(part["positions"]), int(part["indices"])
        if n <= 0 or ni <= 0 or ni % 3:
            raise ValueError(f"{part_id}: invalid vertex/index counts")
        if po < 0 or po + n * 12 > len(chunk) or io < 0 or io + ni * 2 > len(chunk):
            raise ValueError(f"{part_id}: geometry offsets exceed chunk bounds")

        vertices = np.frombuffer(chunk, dtype="<f4", count=n * 3, offset=po).copy().reshape(n, 3)
        indices = np.frombuffer(chunk, dtype="<u2", count=ni, offset=io).astype(np.int64)
        if not np.isfinite(vertices).all() or int(indices.max()) >= n:
            raise ValueError(f"{part_id}: invalid packed geometry")
        actual_bounds = [vertices.min(axis=0).tolist(), vertices.max(axis=0).tolist()]
        expected_bounds = part["bounds"]
        bounds_delta = max(
            max(abs(actual_bounds[side][axis] - expected_bounds[side][axis]) for axis in range(3))
            for side in range(2)
        )
        # The packed atlas chunk and JSON manifest can differ slightly due to
        # float serialization; reject only a material (>5 mm) bounds mismatch.
        if bounds_delta > 0.005:
            raise ValueError(
                f"{part_id}: packed geometry bounds differ from manifest by "
                f"{bounds_delta:.6f} m; actual={actual_bounds}, expected={expected_bounds}"
            )

        add_mesh(scene, node_name, vertices, indices.reshape(-1, 3), [45, 205, 160, 220])
        added.append({
            "atlasPartId": part_id,
            "name": expected_name,
            "node": node_name,
            "system": part["system"],
            "vertices": n,
            "triangles": ni // 3,
            "boundsMeters": part["bounds"],
            "source": "Human Reference Atlas female v1.10 native geometry",
        })

    glb = scene.export(file_type="glb")
    with open(a.out, "wb") as f:
        f.write(glb)
    report = {
        "status": "ankle_overlay_review_only_not_approved_for_import",
        "inputReviewGlb": a.glb,
        "nativeLowerLegMeshesAdded": added,
        "color": "teal",
        "units": "meters",
        "safety": [
            "Native female atlas tibia and fibula are shown beside the transformed BoneHub female left-foot candidate.",
            "This is a visual review artifact; no production geometry, manifest, viewer, or source STL is modified.",
            "The foot candidate comes from a different cadaveric subject and coordinate frame; the global registration is only a preflight estimate.",
            "Visual review is required for laterality, ankle articulation, talar alignment, and local surface compatibility.",
        ],
        "glbBytes": len(glb),
    }
    with open(a.report, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
        f.write("\n")
    print(json.dumps({"status": report["status"], "added": len(added), "glbBytes": len(glb)}, indent=2))


if __name__ == "__main__":
    main()
