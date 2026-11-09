import {useEffect,useMemo,useRef,useState} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {STLLoader} from 'three/examples/jsm/loaders/STLLoader.js';

type Bone={id:string;file:string;region:string;regionLabel:string;bytes:number;url:string};
type Manifest={title:string;source:{dataset:string;revision:string;license:string;licenseUrl:string;datasetCitation:string;originalCitation:string};anatomy:{coordinateSystem:string;unit:string;knownLimitations:string[]};bones:Bone[]};
type Props={onClose:()=>void};
const LABELS:Record<string,string>={FEMUR:'Fêmur',PATELLA:'Patela',TIBIA:'Tíbia',FIBULA:'Fíbula'};
const formatName=(id:string)=>{const side=id.endsWith('_LEFT')?'esquerdo':'direito';const key=id.replace(/_(LEFT|RIGHT)$/,'');return `${LABELS[key]??key} ${side}`;};

export default function VisibleHumanReference({onClose}:Props){
 const host=useRef<HTMLDivElement>(null),sceneRef=useRef<T.Scene|null>(null),cameraRef=useRef<T.PerspectiveCamera|null>(null),controlsRef=useRef<OrbitControls|null>(null),rendererRef=useRef<T.WebGLRenderer|null>(null),meshes=useRef(new Map<string,T.Mesh>()),manifestRef=useRef<Manifest|null>(null);
 const [manifest,setManifest]=useState<Manifest|null>(null),[side,setSide]=useState<'LEFT'|'RIGHT'>('LEFT'),[selected,setSelected]=useState('FEMUR_LEFT'),[loaded,setLoaded]=useState<string[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const items=useMemo(()=>manifest?.bones.filter(b=>b.region===`LOWER_EXTREMITY_${side}`&&/^(FEMUR|PATELLA|TIBIA|FIBULA)_/.test(b.file))??[],[manifest,side]);
 useEffect(()=>{const abort=new AbortController();fetch('/data/female-skeleton-source.json',{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error('Não foi possível abrir o catálogo da referência.');return r.json();}).then((m:Manifest)=>{manifestRef.current=m;setManifest(m);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>abort.abort();},[]);
 useEffect(()=>{
  const el=host.current;if(!el)return;let disposed=false,frame=0;
  let renderer:T.WebGLRenderer;
  try{renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch{setError('Este navegador não conseguiu iniciar o visualizador 3D (WebGL).');return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));renderer.setSize(el.clientWidth,el.clientHeight);renderer.setClearColor('#eef1f2');renderer.outputColorSpace=T.SRGBColorSpace;el.appendChild(renderer.domElement);renderer.domElement.style.width='100%';renderer.domElement.style.height='100%';renderer.domElement.style.touchAction='none';
  const scene=new T.Scene();scene.background=new T.Color('#eef1f2');scene.add(new T.HemisphereLight(0xffffff,0x89939b,2));
  const key=new T.DirectionalLight(0xffffff,2.4);key.position.set(-2,4,3);scene.add(key);const rim=new T.DirectionalLight(0xd8e6f0,1.2);rim.position.set(2,2,-3);scene.add(rim);
  const camera=new T.PerspectiveCamera(38,el.clientWidth/el.clientHeight,.001,100);camera.position.set(0,0.5,2.5);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=.12;controls.maxDistance=8;controls.target.set(0,.5,0);
  sceneRef.current=scene;cameraRef.current=camera;controlsRef.current=controls;rendererRef.current=renderer;
  const resize=()=>{if(!el.clientWidth||!el.clientHeight)return;camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight);};const observer=new ResizeObserver(resize);observer.observe(el);
  const animate=()=>{if(disposed)return;frame=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);};animate();
  return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();meshes.current.forEach(m=>{m.geometry.dispose();(m.material as T.Material).dispose();});meshes.current.clear();renderer.dispose();renderer.domElement.remove();sceneRef.current=null;};
 },[]);
 const loadSide=async(nextSide:'LEFT'|'RIGHT')=>{
  const m=manifestRef.current;if(!m||!sceneRef.current||!cameraRef.current||!controlsRef.current)return;
  setSide(nextSide);setSelected(`FEMUR_${nextSide}`);setError('');setLoading(true);
  try{
   const bones=m.bones.filter(b=>b.region===`LOWER_EXTREMITY_${nextSide}`&&/^(FEMUR|PATELLA|TIBIA|FIBULA)_/.test(b.file));
   const loader=new STLLoader();let completed=0;
   for(const bone of bones){
    if(meshes.current.has(bone.id)){completed++;continue;}
    const response=await fetch(bone.url);if(!response.ok)throw new Error(`Falha ao carregar ${bone.file} (HTTP ${response.status}).`);
    const buffer=await response.arrayBuffer();const geometry=loader.parse(buffer);
    const pos=geometry.getAttribute('position');
    // Convert the dataset's documented patient axes (+Z superior, -Y anterior, +X left)
    // into the viewer convention (Y up, camera looking from +Z); retain uniform millimetre scale.
    for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);pos.setXYZ(i,-x*.001,z*.001,-y*.001);}
    geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const material=new T.MeshStandardMaterial({color:bone.file.startsWith('FEMUR')?0xc6bba2:bone.file.startsWith('TIBIA')?0xb6c0c4:bone.file.startsWith('FIBULA')?0x9caeb7:0xd5c8ac,roughness:.62,metalness:.04});
    const mesh=new T.Mesh(geometry,material);mesh.name=bone.id;mesh.userData.bone=bone;sceneRef.current!.add(mesh);meshes.current.set(bone.id,mesh);completed++;setLoaded([...meshes.current.keys()]);
   }
   const box=new T.Box3();meshes.current.forEach(mesh=>{if(mesh.name.endsWith(nextSide))box.expandByObject(mesh);});
   if(!box.isEmpty()){const center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),extent=Math.max(size.x,size.y,size.z);controlsRef.current.target.copy(center);cameraRef.current.position.copy(center).add(new T.Vector3(0,extent*.18,extent*2.3));cameraRef.current.near=Math.max(.001,extent/1000);cameraRef.current.far=Math.max(20,extent*20);cameraRef.current.updateProjectionMatrix();controlsRef.current.update();}
  }catch(e){setError(e instanceof Error?e.message:'Erro desconhecido ao carregar os modelos.');}
  finally{setLoading(false);}
 };
 useEffect(()=>{if(manifest&&!loaded.some(id=>id.endsWith(side)))void loadSide(side);},[manifest,side]);
 useEffect(()=>{const el=host.current;if(!el)return;const raycaster=new T.Raycaster(),pointer=new T.Vector2();const click=(event:PointerEvent)=>{const rect=el.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);if(!cameraRef.current||!sceneRef.current)return;raycaster.setFromCamera(pointer,cameraRef.current);const hits=raycaster.intersectObjects([...meshes.current.values()],false);if(hits[0])setSelected(hits[0].object.name);};el.addEventListener('pointerup',click);return()=>el.removeEventListener('pointerup',click);},[]);
 const selectedBone=manifest?.bones.find(b=>b.id===selected);
 const focus=(id:string)=>{setSelected(id);const mesh=meshes.current.get(id),camera=cameraRef.current,controls=controlsRef.current;if(!mesh||!camera||!controls)return;const box=new T.Box3().setFromObject(mesh),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),extent=Math.max(size.x,size.y,size.z);controls.target.copy(center);camera.position.copy(center).add(new T.Vector3(0,extent*.25,extent*2.6));controls.update();};
 return <section style={{position:'absolute',inset:0,zIndex:30,background:'#f4f6f6',color:'#202a32',display:'grid',gridTemplateRows:'auto 1fr',fontFamily:'inherit'}}>
  <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,padding:'16px 22px',borderBottom:'1px solid #d9e0e3',background:'#ffffffed'}}>
   <div><div style={{fontSize:10,letterSpacing:'.18em',color:'#73808a'}}>REFERÊNCIA ANATÔMICA INDEPENDENTE</div><strong style={{display:'block',fontSize:20,fontWeight:500,marginTop:4}}>Visible Human Female · Esqueleto</strong><small style={{color:'#73808a'}}>Amostra anatômica real · origem CT · licença CC BY 4.0</small></div>
   <button onClick={onClose} style={{border:'1px solid #d5dde1',borderRadius:6,padding:'10px 14px',background:'#fff'}}>Voltar ao atlas ×</button>
  </header>
  <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 300px',minHeight:0}}>
   <div style={{position:'relative',minHeight:0}}><div ref={host} style={{position:'absolute',inset:0}}/>
    <div style={{position:'absolute',left:18,bottom:18,padding:'9px 12px',background:'#ffffffdf',border:'1px solid #dce2e5',borderRadius:5,fontSize:12,color:'#65727c'}}>Arraste para girar · role/pinça para aproximar · clique em um osso para identificar</div>
    {loading&&<div style={{position:'absolute',top:18,left:18,padding:'10px 14px',background:'#fff',borderRadius:5,fontSize:12}}>Carregando malhas da região…</div>}
    {error&&<div role="alert" style={{position:'absolute',top:18,left:18,right:18,padding:12,background:'#fff0ed',color:'#9c3f32',borderRadius:5,fontSize:13}}>{error}<div style={{fontSize:11,marginTop:5}}>A origem dos arquivos é externa; verifique a conexão e a disponibilidade do repositório.</div></div>}
   </div>
   <aside style={{background:'#fff',borderLeft:'1px solid #dce2e5',padding:18,overflowY:'auto'}}>
    <div style={{fontSize:11,letterSpacing:'.13em',color:'#77848d'}}>REGIÃO PILOTO</div>
    <div style={{display:'flex',gap:7,margin:'10px 0 18px'}}><button onClick={()=>void loadSide('LEFT')} aria-pressed={side==='LEFT'} style={{flex:1,padding:10,borderRadius:4,border:'1px solid #ccd6da',background:side==='LEFT'?'#e7eeef':'#fff'}}>Perna esquerda</button><button onClick={()=>void loadSide('RIGHT')} aria-pressed={side==='RIGHT'} style={{flex:1,padding:10,borderRadius:4,border:'1px solid #ccd6da',background:side==='RIGHT'?'#e7eeef':'#fff'}}>Perna direita</button></div>
    <div style={{fontSize:11,letterSpacing:'.13em',color:'#77848d',marginBottom:9}}>ESTRUTURAS CARREGADAS POR REGIÃO</div>
    {items.map(b=><button key={b.id} onClick={()=>focus(b.id)} disabled={!meshes.current.has(b.id)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',width:'100%',textAlign:'left',padding:'11px 9px',marginBottom:5,border:'1px solid #e2e7e9',borderRadius:4,background:selected===b.id?'#eaf0f0':'#fff',opacity:meshes.current.has(b.id)?1:.55}}><span>{formatName(b.id)}</span><small>{meshes.current.has(b.id)?'3D':'aguardando'}</small></button>)}
    <div style={{marginTop:20,paddingTop:16,borderTop:'1px solid #e2e7e9'}}><div style={{fontSize:11,letterSpacing:'.13em',color:'#77848d'}}>ESTRUTURA SELECIONADA</div><strong style={{display:'block',fontSize:18,fontWeight:500,margin:'8px 0'}}>{selectedBone?formatName(selectedBone.id):'Selecione um osso'}</strong>{selectedBone&&<><div style={{fontSize:12,color:'#687680',lineHeight:1.6}}>ID original: {selectedBone.id}<br/>Região: membro inferior {side==='LEFT'?'esquerdo':'direito'}<br/>Arquivo STL: {(selectedBone.bytes/1024/1024).toFixed(1)} MB</div></>}</div>
    <div style={{marginTop:18,paddingTop:14,borderTop:'1px solid #e2e7e9',fontSize:11,lineHeight:1.55,color:'#73808a'}}>Fonte: BoneHub / Visible Human 3D Models, revisão fixada {manifest?.source.revision.slice(0,10)}. Malhas exibidas na referência de coordenadas do próprio espécime; não são sobrepostas ao corpo HRA feminino.</div>
    <a href={manifest?.source.licenseUrl} target="_blank" rel="noreferrer" style={{display:'inline-block',marginTop:10,fontSize:12}}>Licença CC BY 4.0 ↗</a>
   </aside>
  </div>
 </section>;
}
