#!/usr/bin/env python3
"""Screen ankle-neighbourhood vertex proximity in a review-only GLB.

Distances are geometric screening values, not clinical joint-space measurements.
"""
import argparse
import json
import numpy as np
import trimesh
from scipy.spatial import cKDTree


PAIRS = [
    ("FEMALE_CANDIDATE_TALUS_LEFT", "ATLAS_NATIVE_TIBIA_LEFT", "talus–tibia ankle neighbourhood"),
    ("FEMALE_CANDIDATE_TALUS_LEFT", "ATLAS_NATIVE_FIBULA_LEFT", "talus–fibula ankle neighbourhood"),
    ("ATLAS_NATIVE_TIBIA_LEFT", "ATLAS_NATIVE_FIBULA_LEFT", "tibia–fibula lower-leg neighbourhood"),
]


def sampled(vertices, limit):
    vertices = np.asarray(vertices)
    if len(vertices) <= limit:
        return vertices
    return vertices[np.linspace(0, len(vertices) - 1, limit, dtype=np.int64)]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--glb", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--sample-limit", type=int, default=8000)
    a = p.parse_args()
    if a.sample_limit < 100:
        raise ValueError("--sample-limit must be at least 100")

    scene = trimesh.load(a.glb, force="scene")
    meshes = {}
    for node in scene.graph.nodes_geometry:
        transform, geometry_name = scene.graph[node]
        vertices = np.asarray(scene.geometry[geometry_name].vertices)
        meshes[node] = trimesh.transform_points(vertices, transform)

    missing = sorted({name for pair in PAIRS for name in pair[:2]} - set(meshes))
    if missing:
        raise SystemExit("Missing review meshes: " + ", ".join(missing))

    results = []
    for left, right, region in PAIRS:
        va = sampled(meshes[left], a.sample_limit)
        vb = sampled(meshes[right], a.sample_limit)
        ab = cKDTree(vb).query(va, k=1)[0]
        ba = cKDTree(va).query(vb, k=1)[0]

        def stats(values):
            return {
                "minMeters": float(values.min()),
                "medianMeters": float(np.median(values)),
                "p95Meters": float(np.percentile(values, 95)),
                "meanMeters": float(values.mean()),
            }

        results.append({
            "meshA": left,
            "meshB": right,
            "region": region,
            "sampledVerticesA": len(va),
            "sampledVerticesB": len(vb),
            "aToB": stats(ab),
            "bToA": stats(ba),
            "symmetricMeanMeters": float((ab.mean() + ba.mean()) / 2),
            "interpretation": "sampled vertex proximity only; not a joint-fit, contact, or collision verdict",
        })

    report = {
        "status": "ankle_neighbourhood_screening_only_not_approved_for_import",
        "method": "deterministic vertex subsampling and symmetric nearest-neighbour distances using scipy cKDTree",
        "sampleLimitPerMesh": a.sample_limit,
        "pairCount": len(results),
        "results": results,
        "limitations": [
            "Vertex-to-vertex distances are not exact triangle-surface distances.",
            "The foot candidate is from a different female cadaveric subject than the native atlas lower leg.",
            "The registration transform is a global preflight estimate, not local ankle registration.",
            "No cartilage, ligaments, capsule, joint-space, or contact-mechanics model is included.",
            "No pass/fail threshold is applied; values are not clinical joint spaces.",
            "Visual review of laterality, orientation, ankle landmarks, and talus-to-mortise articulation remains mandatory.",
        ],
    }
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
        f.write("\n")
    print(json.dumps({"status": report["status"], "pairCount": len(results), "output": a.out}, indent=2))


if __name__ == "__main__":
    main()
