#!/usr/bin/env python3
"""Non-destructive sampled-vertex proximity diagnostics for a female left-foot GLB.

Screening aid only: vertex nearest-neighbour distances are not exact surface
distances and do not establish joint fit, collision, cartilage, or clinical space.
"""
import argparse, json
import numpy as np
import trimesh
from scipy.spatial import cKDTree

PAIRS = [
 ("CALCANEUS_LEFT","TALUS_LEFT","subtalar region"),
 ("CALCANEUS_LEFT","CUBOID_LEFT","calcaneocuboid region"),
 ("TALUS_LEFT","NAVICULAR_LEFT","talonavicular region"),
 ("NAVICULAR_LEFT","MEDIAL_CUNEIFORM_LEFT","naviculocuneiform region"),
 ("NAVICULAR_LEFT","INTERMEDIATE_CUNEIFORM_LEFT","naviculocuneiform region"),
 ("NAVICULAR_LEFT","LATERAL_CUNEIFORM_LEFT","naviculocuneiform region"),
 ("CUBOID_LEFT","LATERAL_CUNEIFORM_LEFT","midfoot region"),
 ("CUBOID_LEFT","METATARSAL_4_LEFT","fourth tarsometatarsal region"),
 ("CUBOID_LEFT","METATARSAL_5_LEFT","fifth tarsometatarsal region"),
 ("MEDIAL_CUNEIFORM_LEFT","METATARSAL_1_LEFT","first tarsometatarsal region"),
 ("INTERMEDIATE_CUNEIFORM_LEFT","METATARSAL_2_LEFT","second tarsometatarsal region"),
 ("LATERAL_CUNEIFORM_LEFT","METATARSAL_3_LEFT","third tarsometatarsal region"),
 *[(f"METATARSAL_{i}_LEFT",f"PHALANGE_FOOT_{i}_LEFT",f"{i}th metatarsophalangeal region") for i in range(1,6)],
]

def sample(vertices, limit):
    if len(vertices) <= limit: return np.asarray(vertices)
    return np.asarray(vertices)[np.linspace(0,len(vertices)-1,limit,dtype=np.int64)]

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--glb",required=True); p.add_argument("--out",required=True)
    p.add_argument("--sample-limit",type=int,default=6000)
    a=p.parse_args()
    scene=trimesh.load(a.glb,force="scene")
    meshes={}
    for node in scene.graph.nodes_geometry:
        _,name=scene.graph[node]
        if node.startswith("FEMALE_CANDIDATE_"):
            meshes[node.removeprefix("FEMALE_CANDIDATE_")]=np.asarray(scene.geometry[name].vertices)
    missing=sorted({n for pair in PAIRS for n in pair[:2]}-set(meshes))
    if missing: raise SystemExit("Missing candidate meshes: "+", ".join(missing))
    results=[]
    for left,right,region in PAIRS:
        va=sample(meshes[left],a.sample_limit); vb=sample(meshes[right],a.sample_limit)
        ab=cKDTree(vb).query(va,k=1)[0]; ba=cKDTree(va).query(vb,k=1)[0]
        stats=lambda d: {"minMeters":float(d.min()),"medianMeters":float(np.median(d)),"p95Meters":float(np.percentile(d,95)),"meanMeters":float(d.mean())}
        results.append({"boneA":left,"boneB":right,"region":region,"sampledVerticesA":len(va),"sampledVerticesB":len(vb),"aToB":stats(ab),"bToA":stats(ba),"symmetricMeanMeters":float((ab.mean()+ba.mean())/2),"interpretation":"sampled vertex proximity only; not a joint-fit or collision verdict"})
    report={"status":"screening_diagnostics_only_not_approved_for_import","input":"female-left-foot-overlay.glb","method":"deterministic vertex subsampling plus symmetric nearest-neighbour distances using scipy cKDTree","sampleLimitPerMesh":a.sample_limit,"pairCount":len(results),"results":results,"limitations":["Vertex-to-vertex distances are not exact triangle-surface distances.","No cartilage, ligament, capsule, joint-space, or contact-mechanics model is present.","No pass/fail threshold is applied; distances are not clinical joint spaces.","Five phalange files are grouped by digit, not separated into individual phalanges.","Tibia and fibula are absent from this FOOT_LEFT source set; ankle articulation cannot be assessed.","Visual review of laterality, orientation, and anatomical landmarks remains mandatory."]}
    with open(a.out,"w",encoding="utf-8") as f: json.dump(report,f,indent=2); f.write("\n")
    print(json.dumps({"status":report["status"],"pairCount":len(results),"output":a.out},indent=2))
if __name__=="__main__": main()
