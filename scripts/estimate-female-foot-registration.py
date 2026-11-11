#!/usr/bin/env python3
"""Estimate one global similarity transform from 12 paired female left-foot bones.

This is a preflight only. It uses per-bone vertex centroids as anatomical
landmarks, fits a uniform-scale proper rotation + translation, and reports
residuals. It never edits atlas geometry or writes a transformed mesh.
"""
import argparse
import json
import math
import os
import struct
import sys

import numpy as np
from scipy.spatial import cKDTree

PAIRS = {
    "CALCANEUS_LEFT": "BM0134",
    "CUBOID_LEFT": "BM0135",
    "INTERMEDIATE_CUNEIFORM_LEFT": "BM0136",
    "LATERAL_CUNEIFORM_LEFT": "BM0138",
    "MEDIAL_CUNEIFORM_LEFT": "BM0140",
    "METATARSAL_1_LEFT": "BM0129",
    "METATARSAL_2_LEFT": "BM0130",
    "METATARSAL_3_LEFT": "BM0131",
    "METATARSAL_4_LEFT": "BM0132",
    "METATARSAL_5_LEFT": "BM0133",
    "NAVICULAR_LEFT": "BM0146",
    "TALUS_LEFT": "BM0141",
}

def read_stl_vertices(path):
    data = open(path, "rb").read()
    if len(data) < 84:
        raise ValueError(f"{path}: truncated STL")
    count = struct.unpack_from("<I", data, 80)[0]
    if 84 + count * 50 != len(data):
        raise ValueError(f"{path}: expected binary STL")
    vertices = np.empty((count * 3, 3), dtype=np.float64)
    for i in range(count):
        base = 84 + i * 50 + 12
        vertices[i*3:i*3+3] = np.frombuffer(data, dtype="<f4", count=9, offset=base).reshape(3, 3)
    if not np.isfinite(vertices).all():
        raise ValueError(f"{path}: non-finite coordinates")
    return vertices

def target_vertices(chunk, part):
    count = int(part["vertexCount"])
    offset = int(part["positions"])
    raw = np.frombuffer(chunk, dtype="<f4", count=count * 3, offset=offset)
    points = raw.astype(np.float64).reshape(count, 3)
    if not np.isfinite(points).all():
        raise ValueError(f'{part["id"]}: non-finite atlas coordinates')
    return points

def fit_similarity(source, target):
    """Return scale, proper rotation R, translation t for row vectors: s*X@R+t."""
    xs = source.mean(axis=0)
    yt = target.mean(axis=0)
    x0 = source - xs
    y0 = target - yt
    covariance = x0.T @ y0
    u, singular, vt = np.linalg.svd(covariance)
    correction = np.eye(3)
    if np.linalg.det(u @ vt) < 0:
        correction[-1, -1] = -1
    rotation = u @ correction @ vt
    denom = np.sum(x0 * x0)
    if denom <= 0:
        raise ValueError("degenerate source landmarks")
    scale = float(np.sum(singular * np.diag(correction)) / denom)
    translation = yt - scale * (xs @ rotation)
    predicted = scale * (source @ rotation) + translation
    residuals = np.linalg.norm(predicted - target, axis=1)
    return scale, rotation, translation, residuals

def surface_distance(source, target, scale, rotation, translation, sample_limit=5000):
    """Symmetric nearest-vertex distances after the centroid-derived transform."""
    transformed = scale * (source @ rotation) + translation
    def sample(points):
        if len(points) <= sample_limit:
            return points
        indices = np.linspace(0, len(points) - 1, sample_limit, dtype=np.int64)
        return points[indices]
    a = sample(transformed)
    b = sample(target)
    ab = cKDTree(b).query(a, k=1)[0]
    ba = cKDTree(a).query(b, k=1)[0]
    def stats(values):
        return {
            "meanMeters": float(np.mean(values)),
            "medianMeters": float(np.median(values)),
            "p95Meters": float(np.percentile(values, 95)),
            "maxMeters": float(np.max(values)),
        }
    return {"sourceToAtlas": stats(ab), "atlasToSource": stats(ba),
            "symmetricMeanMeters": float((np.mean(ab) + np.mean(ba)) / 2)}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stl-dir", required=True)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--chunk", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    manifest = json.load(open(args.manifest, encoding="utf-8"))
    chunk_info = manifest["chunks"][12]
    chunk = open(args.chunk, "rb").read()
    if len(chunk) != int(chunk_info["bytes"]):
        raise ValueError(f'female-12.bin byte mismatch: expected {chunk_info["bytes"]}, got {len(chunk)}')
    parts = {p["id"]: p for p in manifest["parts"]}
    source_centroids, target_centroids, names, vertex_counts = [], [], [], []
    source_meshes, target_meshes = [], []
    for filename, part_id in PAIRS.items():
        stl_path = os.path.join(args.stl_dir, filename + ".stl")
        source = read_stl_vertices(stl_path)
        target = target_vertices(chunk, parts[part_id])
        source_centroids.append(source.mean(axis=0))
        target_centroids.append(target.mean(axis=0))
        source_meshes.append(source)
        target_meshes.append(target)
        names.append(filename)
        vertex_counts.append({"sourceVertices": int(len(source)), "atlasVertices": int(len(target)), "atlasPartId": part_id})

    source_centroids = np.asarray(source_centroids)
    target_centroids = np.asarray(target_centroids)
    scale, rotation, translation, residuals = fit_similarity(source_centroids, target_centroids)
    per_bone = []
    for i, name in enumerate(names):
        per_bone.append({
            "source": name,
            "atlasPartId": vertex_counts[i]["atlasPartId"],
            "sourceVertices": vertex_counts[i]["sourceVertices"],
            "atlasVertices": vertex_counts[i]["atlasVertices"],
            "centroidResidualMeters": float(residuals[i]),
            "surfaceDistance": surface_distance(source_meshes[i], target_meshes[i], scale, rotation, translation),
        })

    report = {
        "status": "preflight_only_not_approved_for_import",
        "method": "12 paired bone vertex centroids; least-squares uniform-scale proper rotation and translation; symmetric nearest-vertex surface-distance diagnostics",
        "sourceDataset": "BoneHub Visible-Human-3D-Models / 02_Female / FOOT_LEFT",
        "atlasManifest": "public/models/atlas-female.json",
        "atlasChunk": "public/models/female-12.bin",
        "sourceCoordinateUnits": "unconfirmed; scale is estimated rather than assumed",
        "atlasCoordinateUnits": "meters, per atlas pipeline",
        "pairCount": len(names),
        "estimatedSourceToAtlasScale": scale,
        "estimatedRotationRowVectorConvention": rotation.tolist(),
        "estimatedTranslationMeters": translation.tolist(),
        "centroidResidualRmsMeters": float(math.sqrt(np.mean(residuals ** 2))),
        "centroidResidualMaxMeters": float(np.max(residuals)),
        "perBone": per_bone,
        "limitations": [
            "Centroid registration is a global initialization, not a surface-level anatomical validation.",
            "Nearest-vertex distances are diagnostic only; meshes have different tessellation and are not a substitute for signed-distance or joint-surface review.",
            "A low centroid residual does not prove joint-surface compatibility or correct bone orientation.",
            "No atlas files or source meshes are modified by this script.",
            "The source represents one 59-year-old female cadaveric reference.",
        ],
        "decision": "Review scale, transform, and per-bone residuals; require visual overlay and joint checks before any import proposal.",
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
        f.write("\n")
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    main()
