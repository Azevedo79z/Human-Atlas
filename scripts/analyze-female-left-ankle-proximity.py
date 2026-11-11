#!/usr/bin/env python3
"""Screen local ankle-neighbourhood vertex proximity in a review-only GLB.

Distances are geometric screening values, not clinical joint-space measurements.
"""
import argparse
import json
import numpy as np
import trimesh
from scipy.spatial import cKDTree


def sampled(vertices, limit):
    vertices = np.asarray(vertices)
    if len(vertices) <= limit:
        return vertices
    return vertices[np.linspace(0, len(vertices) - 1, limit, dtype=np.int64)]


def local_to_bbox(vertices, reference, padding):
    lo = reference.min(axis=0) - padding
    hi = reference.max(axis=0) + padding
    return vertices[np.all((vertices >= lo) & (vertices <= hi), axis=1)]


def stats(values):
    return {
        "minMeters": float(values.min()),
        "medianMeters": float(np.median(values)),
        "p95Meters": float(np.percentile(values, 95)),
        "meanMeters": float(values.mean()),
    }


def compare(left, right, region, sample_limit):
    va = sampled(left, sample_limit)
    vb = sampled(right, sample_limit)
    if not len(va) or not len(vb):
        raise ValueError(f"Empty local vertex set for {region}")
    ab = cKDTree(vb).query(va, k=1)[0]
    ba = cKDTree(va).query(vb, k=1)[0]
    return {
        "region": region,
        "sampledVerticesA": len(va),
        "sampledVerticesB": len(vb),
        "aToB": stats(ab),
        "bToA": stats(ba),
        "symmetricMeanMeters": float((ab.mean() + ba.mean()) / 2),
        "interpretation": "local sampled vertex proximity only; not a joint-fit, contact, or collision verdict",
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--glb", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--sample-limit", type=int, default=8000)
    p.add_argument("--local-padding-mm", type=float, default=20.0)
    a = p.parse_args()
    if a.sample_limit < 100 or a.local_padding_mm <= 0:
        raise ValueError("sample limit must be >=100 and local padding must be positive")

    scene = trimesh.load(a.glb, force="scene")
    meshes = {}
    for node in scene.graph.nodes_geometry:
        transform, geometry_name = scene.graph[node]
        vertices = np.asarray(scene.geometry[geometry_name].vertices)
        meshes[node] = trimesh.transform_points(vertices, transform)

    required = [
        "FEMALE_CANDIDATE_TALUS_LEFT",
        "ATLAS_NATIVE_TIBIA_LEFT",
        "ATLAS_NATIVE_FIBULA_LEFT",
    ]
    missing = sorted(set(required) - set(meshes))
    if missing:
        raise SystemExit("Missing review meshes: " + ", ".join(missing))

    talus = meshes["FEMALE_CANDIDATE_TALUS_LEFT"]
    tibia_all = meshes["ATLAS_NATIVE_TIBIA_LEFT"]
    fibula_all = meshes["ATLAS_NATIVE_FIBULA_LEFT"]
    padding = a.local_padding_mm / 1000.0

    # Restrict the lower-leg bones to a local box around the candidate talus.
    # This excludes most of the long shafts, which otherwise dominate the
    # reverse-direction distances and obscure the ankle neighbourhood.
    tibia_local = local_to_bbox(tibia_all, talus, padding)
    fibula_local = local_to_bbox(fibula_all, talus, padding)
    if len(tibia_local) < 10 or len(fibula_local) < 10:
        raise ValueError(
            "Too few native lower-leg vertices in local ankle crop: "
            f"tibia={len(tibia_local)}, fibula={len(fibula_local)}"
        )

    results = [
        compare(talus, tibia_local, "candidate talus–native tibia local ankle neighbourhood", a.sample_limit),
        compare(talus, fibula_local, "candidate talus–native fibula local ankle neighbourhood", a.sample_limit),
        compare(tibia_local, fibula_local, "native tibia–fibula local ankle neighbourhood", a.sample_limit),
    ]

    report = {
        "status": "ankle_local_neighbourhood_screening_only_not_approved_for_import",
        "method": "native lower-leg vertices cropped to candidate talus axis-aligned bounds expanded by padding; deterministic vertex subsampling and symmetric nearest-neighbour distances using scipy cKDTree",
        "sampleLimitPerMesh": a.sample_limit,
        "localPaddingMm": a.local_padding_mm,
        "candidateTalusVertices": len(talus),
        "nativeTibiaVerticesTotal": len(tibia_all),
        "nativeFibulaVerticesTotal": len(fibula_all),
        "nativeTibiaVerticesInLocalCrop": len(tibia_local),
        "nativeFibulaVerticesInLocalCrop": len(fibula_local),
        "pairCount": len(results),
        "results": results,
        "limitations": [
            "The axis-aligned crop is a reproducible local screening region, not an anatomical segmentation of articular surfaces.",
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
    print(json.dumps({
        "status": report["status"],
        "pairCount": len(results),
        "localTibiaVertices": len(tibia_local),
        "localFibulaVertices": len(fibula_local),
        "output": a.out,
    }, indent=2))


if __name__ == "__main__":
    main()
