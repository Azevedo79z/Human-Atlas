#!/usr/bin/env python3
"""Build a non-destructive GLB overlay for the female left-foot pilot."""
import argparse, json, os, struct
import numpy as np
import trimesh

PAIRS = {
 "CALCANEUS_LEFT":"BM0134","CUBOID_LEFT":"BM0135",
 "INTERMEDIATE_CUNEIFORM_LEFT":"BM0136","LATERAL_CUNEIFORM_LEFT":"BM0138",
 "MEDIAL_CUNEIFORM_LEFT":"BM0140","METATARSAL_1_LEFT":"BM0129",
 "METATARSAL_2_LEFT":"BM0130","METATARSAL_3_LEFT":"BM0131",
 "METATARSAL_4_LEFT":"BM0132","METATARSAL_5_LEFT":"BM0133",
 "NAVICULAR_LEFT":"BM0146","TALUS_LEFT":"BM0141",
}
PHALANGES=[f"PHALANGE_FOOT_{i}_LEFT" for i in range(1,6)]

def read_binary_stl(path):
 data=open(path,"rb").read()
 if len(data)<84: raise ValueError(f"{path}: truncated STL")
 n=struct.unpack_from("<I",data,80)[0]
 if 84+n*50!=len(data): raise ValueError(f"{path}: expected validated binary STL")
 v=np.empty((n*3,3),dtype=np.float32)
 for i in range(n):
  off=84+i*50+12
  v[i*3:i*3+3]=np.frombuffer(data,dtype="<f4",count=9,offset=off).reshape(3,3)
 if not len(v) or not np.isfinite(v).all(): raise ValueError(f"{path}: empty/non-finite mesh")
 return v,np.arange(len(v),dtype=np.int64).reshape(-1,3)

def add_mesh(scene,name,vertices,faces,rgba):
 mesh=trimesh.Trimesh(vertices=np.asarray(vertices,dtype=np.float32),faces=np.asarray(faces,dtype=np.int64),process=False)
 mesh.visual.face_colors=np.tile(np.asarray(rgba,dtype=np.uint8),(len(mesh.faces),1))
 scene.add_geometry(mesh,geom_name=name,node_name=name)

def main():
 p=argparse.ArgumentParser()
 for key in ("stl-dir","manifest","chunk","registration","out","report"): p.add_argument("--"+key,required=True)
 a=p.parse_args()
 reg=json.load(open(a.registration,encoding="utf-8"))
 if reg.get("status")!="preflight_only_not_approved_for_import": raise ValueError("Unexpected registration status")
 scale=float(reg["estimatedSourceToAtlasScale"])
 rot=np.asarray(reg["estimatedRotationRowVectorConvention"],dtype=np.float64)
 trans=np.asarray(reg["estimatedTranslationMeters"],dtype=np.float64)
 if rot.shape!=(3,3) or trans.shape!=(3,) or not np.isfinite(rot).all() or not np.isfinite(trans).all() or not np.isfinite(scale): raise ValueError("Invalid transform")
 if np.linalg.det(rot)<0.999: raise ValueError("Rotation is not proper")
 manifest=json.load(open(a.manifest,encoding="utf-8"))
 chunk_info=manifest["chunks"][12]
 chunk=open(a.chunk,"rb").read()
 if len(chunk)!=int(chunk_info["bytes"]): raise ValueError("Female atlas chunk byte count mismatch")
 parts={x["id"]:x for x in manifest["parts"]}
 scene=trimesh.Scene()
 for name,pid in PAIRS.items():
  part=parts[pid]; n=int(part["vertexCount"]); ni=int(part["indexCount"])
  v=np.frombuffer(chunk,dtype="<f4",count=n*3,offset=int(part["positions"])).astype(np.float32).reshape(n,3)
  idx=np.frombuffer(chunk,dtype="<u2",count=ni,offset=int(part["indices"])).astype(np.int64)
  if not np.isfinite(v).all() or (len(idx) and int(idx.max())>=n): raise ValueError(f"{pid}: invalid packed atlas geometry")
  if ni%3: raise ValueError(f"{pid}: non-triangular index count")
  add_mesh(scene,"ATLAS_REFERENCE_"+name,v,idx.reshape(-1,3),[45,135,235,105])
 included=[]
 for name in list(PAIRS)+PHALANGES:
  v,faces=read_binary_stl(os.path.join(a.stl_dir,name+".stl"))
  placed=scale*(v.astype(np.float64)@rot)+trans
  if not np.isfinite(placed).all(): raise ValueError(f"{name}: invalid transformed vertices")
  add_mesh(scene,"FEMALE_CANDIDATE_"+name,placed,faces,[255,126,36,220])
  included.append({"source":name,"vertices":int(len(v)),"triangles":int(len(faces)),"atlasPartId":PAIRS.get(name),"note":"grouped phalanges; no one-to-one atlas counterpart" if name in PHALANGES else "paired with borrowed atlas reference"})
 glb=scene.export(file_type="glb")
 open(a.out,"wb").write(glb)
 report={"status":"visual_review_artifact_not_approved_for_import","candidateMeshes":len(included),"atlasReferenceMeshes":len(PAIRS),"candidateColor":"orange","atlasReferenceColor":"blue translucent","units":"meters","transform":{"scale":scale,"rotationRowVectorConvention":rot.tolist(),"translationMeters":trans.tolist()},"sourceMeshes":included,"limitations":["Global transform initialized from 12 paired bone centroids.","Human visual review is required for laterality, articulation, orientation, and joint-surface fit.","Five phalange files are grouped by digit and have no one-to-one atlas counterpart.","This GLB is a separate review artifact; it does not modify or replace atlas geometry."],"glbBytes":len(glb)}
 with open(a.report,"w",encoding="utf-8") as f: json.dump(report,f,indent=2); f.write("\n")
 print(json.dumps(report,indent=2))
if __name__=="__main__": main()
