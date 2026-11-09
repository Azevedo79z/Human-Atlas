import {flushSync} from 'react-dom';
import {registerAtlasTools} from './agent-tools';\nimport AuthPanel from './auth-panel';\nimport {getSupabaseClient} from './supabase';\nimport type {User} from '@supabase/supabase-js';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Activity,ArrowUpRight,BookOpen,CheckCircle2,ChevronLeft,ChevronRight,ClipboardCheck,Focus,GraduationCap,Info,Layers3,Pause,RotateCcw,RotateCw,Search,X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Slider} from '@/components/ui/slider';
import {Switch} from '@/components/ui/switch';
import {Sheet,SheetContent,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {Combobox,ComboboxInput,ComboboxContent,ComboboxList,ComboboxItem,ComboboxEmpty} from '@/components/ui/combobox';
import {Select,SelectContent,SelectItem,SelectTrigger} from '@/components/ui/select';
import AnatomyScene from './scene';
import {EDITIONS,SYSTEMS,defaultVisible,described,edition,edition_,explanation,systemName,term,type Atlas,type Concept,type SceneState,type Sex,type SystemId,type View} from './anatomy';
import {LANGUAGES,direction,fold,say,type Language} from './i18n';
import {anatomyRelations} from './anatomy-relations-pt';
const anatomicalRegion=(raw:string,language:Language):string=>{
 const n=raw.toLowerCase();
 const groups:[RegExp,string,string][]=[
  [/brain|cerebr|hippocamp|thalam|hypothalam|amygdal|cerebell|olfactory bulb/,'Encéfalo','Brain'],
  [/skull|cranial|mandible|maxilla|zygoma|frontal bone|parietal bone|temporal bone|occipital bone|sphenoid|ethmoid|nasal bone|eye|orbit|retina|cornea|iris|sclera|pupil|lens|ear|cochlea|tongue|mouth|tooth|teeth/,'Cabeça','Head'],
  [/vertebr|spinal cord|intervertebral|back|erector spinae/,'Coluna e dorso','Spine and back'],
  [/cervical|larynx|pharynx|thyroid cartilage|trachea|neck/,'Pescoço','Neck'],
  [/thorac|rib|sternum|manubrium|heart|lung|bronch|aorta|pulmonary|esophag|diaphragm/,'Tórax','Thorax'],
  [/abdomen|abdominal|liver|stomach|spleen|pancrea|gallbladder|kidney|renal|intestin|colon|duodenum|omentum|ureter/,'Abdome','Abdomen'],
  [/pelv|uterus|ovary|vagina|cervix|placenta|umbilical|urinary bladder|prostate|sacrum|coccyx|pubis|ilium|ischium/,'Pelve','Pelvis'],
  [/shoulder|scapula|clavicle|rotator cuff/,'Cintura escapular','Shoulder girdle'],
  [/humerus|biceps brachii|triceps brachii|brachial/,'Braço','Arm'],
  [/forearm|radius|ulna|radial|ulnar|median nerve|wrist|carpal|metacarp|phalanx of hand|hand/,'Antebraço e mão','Forearm and hand'],
  [/knee|meniscus|patella|cruciate|collateral ligament/,'Joelho','Knee'],
  [/hip|glute|femur|femoral|thigh|quadriceps|hamstring|adductor|sartorius/,'Quadril e coxa','Hip and thigh'],
  [/tibia|fibula|calf|gastrocnemius|soleus|tibialis|perone|ankle|tarsal|calcaneus|talus|metatars|foot|plantar/,'Perna e pé','Leg and foot']
 ];
 const match=groups.find(([pattern])=>pattern.test(n));
 if(!match)return language==='pt'?'Não especificada na referência':language==='ar'?'غير محددة في المرجع':'Not specified in source';
 return language==='pt'?match[1]:match[2];
};
const anatomicalLaterality=(raw:string,language:Language):string=>{
 const n=raw.toLowerCase();
 const right=/(^|\b)(right|dexter|dextra)(\b|$)/.test(n),left=/(^|\b)(left|sinister|sinistra)(\b|$)/.test(n);
 if(right&&left)return language==='pt'?'Bilateral / múltiplos lados':language==='ar'?'ثنائي الجانب':'Bilateral / multiple sides';
 if(right)return language==='pt'?'Direito':language==='ar'?'أيمن':'Right';
 if(left)return language==='pt'?'Esquerdo':language==='ar'?'أيسر':'Left';
 return language==='pt'?'Não especificada':language==='ar'?'غير محدد':'Not specified';
};
const initial=(sex:Sex):SceneState=>({explode:0,visible:defaultVisible(sex),selected:[],isolate:false,view:'three-quarter',rotate:false,reset:0});
export default function Home(){
 const detailTitle=useRef<HTMLHeadingElement>(null);
 const [sex,setSex]=useState<Sex>('male');
 const [language,setLanguage]=useState<Language>('pt');
 const t=(phrase:Parameters<typeof say>[1])=>say(language,phrase);
 const name=(text:string)=>term(text,language);
 const rtl=direction(language)==='rtl';
 // The document carries the language so the browser hyphenates, aligns and
 // orders punctuation correctly, and so `dir`-based styling applies.
 useEffect(()=>{document.documentElement.lang=language;document.documentElement.dir=direction(language);},[language]);
 const [atlas,setAtlas]=useState<Atlas|null>(null),[state,setState]=useState(()=>initial('male')),[progress,setProgress]=useState(0),[error,setError]=useState(''),[panel,setPanel]=useState<'layers'|'search'|null>(null),[details,setDetails]=useState(false),[about,setAbout]=useState(false),[query,setQuery]=useState(''),[chosen,setChosen]=useState<Concept|null>(null),[studyOpen,setStudyOpen]=useState(false),[studySystem,setStudySystem]=useState<SystemId>('skeletal'),[studyIndex,setStudyIndex]=useState(0),[studyCompleted,setStudyCompleted]=useState<string[]>([]),[studyQuizMode,setStudyQuizMode]=useState(false),[studyQuizIndex,setStudyQuizIndex]=useState(0),[studyQuizAnswer,setStudyQuizAnswer]=useState<string|null>(null),[studyQuizMastered,setStudyQuizMastered]=useState<string[]>([]),[studyProgressLoadedFor,setStudyProgressLoadedFor]=useState<Sex|null>(null),[studySaveStatus,setStudySaveStatus]=useState<'saved'|'unavailable'>('saved');\n const [authUser,setAuthUser]=useState<User|null>(null),[cloudProgressLoadedFor,setCloudProgressLoadedFor]=useState<string|null>(null);\n const supabase=getSupabaseClient();
 const source=edition_(sex,language);
 // Browser-only persistence; the static atlas has no account or backend yet.
 useEffect(()=>{
  let completed:string[]=[];
  let mastered:string[]=[];
  try{
   const raw=window.localStorage.getItem('human-atlas:study-progress:v1:'+sex);
   if(raw){
    const parsed=JSON.parse(raw) as {version?:number;completed?:unknown;mastered?:unknown};
    if(parsed.version===1){
     completed=Array.isArray(parsed.completed)?parsed.completed.filter((value):value is string=>typeof value==='string'&&value.startsWith(sex+':')):[];
     mastered=Array.isArray(parsed.mastered)?parsed.mastered.filter((value):value is string=>typeof value==='string'&&value.startsWith(sex+':')):[];
    }
   }
   setStudySaveStatus('saved');
  }catch{setStudySaveStatus('unavailable');}
  setStudyCompleted(completed);
  setStudyQuizMastered(mastered);
  setStudyProgressLoadedFor(sex);
 },[sex]);
 useEffect(()=>{
  if(studyProgressLoadedFor!==sex)return;
  try{
   window.localStorage.setItem('human-atlas:study-progress:v1:'+sex,JSON.stringify({version:1,sex,completed:studyCompleted.filter(key=>key.startsWith(sex+':')),mastered:studyQuizMastered.filter(key=>key.startsWith(sex+':')),updatedAt:new Date().toISOString()}));
   setStudySaveStatus('saved');
  }catch{setStudySaveStatus('unavailable');}
 },[sex,studyProgressLoadedFor,studyCompleted,studyQuizMastered]);
 useEffect(()=>{
  if(!authUser||!supabase){setCloudProgressLoadedFor(null);return;}
  let active=true;
  const ownerKey=authUser.id+':'+sex;
  setCloudProgressLoadedFor(null);
  supabase.from('study_progress').select('completed_concepts,mastered_questions').eq('reference_body',sex).maybeSingle().then(({data,error})=>{
   if(!active)return;
   if(error){setCloudProgressLoadedFor(null);return;}
   const cloudCompleted=Array.isArray(data?.completed_concepts)?data.completed_concepts.filter((value)=>typeof value==='string'&&value.startsWith(sex+':')):[];
   const cloudMastered=Array.isArray(data?.mastered_questions)?data.mastered_questions.filter((value)=>typeof value==='string'&&value.startsWith(sex+':')):[];
   setStudyCompleted(local=>[...new Set([...local,...cloudCompleted])]);
   setStudyQuizMastered(local=>[...new Set([...local,...cloudMastered])]);
   setCloudProgressLoadedFor(ownerKey);
  });
  return()=>{active=false;};
 },[authUser?.id,sex,supabase]);
 useEffect(()=>{
  if(!authUser||!supabase||cloudProgressLoadedFor!==authUser.id+':'+sex||studyProgressLoadedFor!==sex)return;
  const completed=studyCompleted.filter(key=>key.startsWith(sex+':'));
  const mastered=studyQuizMastered.filter(key=>key.startsWith(sex+':'));
  supabase.from('study_progress').upsert({reference_body:sex,completed_concepts:completed,mastered_questions:mastered},{onConflict:'user_id,reference_body'}).then(({error})=>{
   if(error) console.error('Falha ao sincronizar progresso na nuvem:',error.message);
  });
 },[authUser?.id,sex,cloudProgressLoadedFor,studyProgressLoadedFor,studyCompleted,studyQuizMastered,supabase]);


 useEffect(()=>{const abort=new AbortController();setProgress(0);setError('');setAtlas(null);setChosen(null);setDetails(false);setPanel(null);setQuery('');setStudyIndex(0);setStudyQuizIndex(0);setStudyQuizAnswer(null);setStudyQuizMode(false);setState(initial(sex));fetch(edition(sex).manifest,{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error(say(language,'catalogueError'));return r.json();}).then(data=>setAtlas(data as Atlas)).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>abort.abort();},[sex,language]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='/'&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLTextAreaElement)){e.preventDefault();setPanel('search');setDetails(false);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 const parts=useMemo(()=>new Map(atlas?.parts.map(p=>[p.id,p])),[atlas]);
 const counts=useMemo(()=>Object.fromEntries(SYSTEMS.map(s=>[s.id,atlas?.parts.filter(p=>p.system===s.id).length??0])),[atlas]);
 const activeSystems=SYSTEMS.filter(s=>counts[s.id]>0);
 const studyItems=useMemo(()=>atlas?.concepts.filter(c=>c.elements.some(id=>parts.get(id)?.system===studySystem))??[],[atlas,parts,studySystem]);
 const studyCurrent=studyItems[studyIndex];
 const studyKey=(c:Concept)=>sex+':'+c.id;
 const studyDone=studyCurrent?studyCompleted.includes(studyKey(studyCurrent)):false;
 const studyProgress=studyItems.length?Math.round(studyItems.filter(c=>studyCompleted.includes(studyKey(c))).length/studyItems.length*100):0;
 const studyQuizQuestions=useMemo(()=>{if(!atlas)return[];return studyItems.flatMap(sourceConcept=>{const relation=anatomyRelations(sourceConcept.name)[0];if(!relation)return[];const relatedNames=relation.structures;const correct=relatedNames.map(target=>atlas.concepts.find(item=>item.name===target)).find((item):item is Concept=>!!item);if(!correct)return[];const correctSystem=parts.get(correct.elements[0])?.system;const sameSystem=atlas.concepts.filter(item=>item.elements.some(id=>parts.get(id)?.system===correctSystem));const pool=sameSystem.length>=4?sameSystem:atlas.concepts;const distractors=pool.filter(item=>item.id!==sourceConcept.id&&item.id!==correct.id&&!relatedNames.includes(item.name)).sort((a,b)=>a.name.localeCompare(b.name)).slice(0,3);if(distractors.length<3)return[];const options=[correct,...distractors].sort((a,b)=>a.name.localeCompare(b.name));return[{source:sourceConcept,relation,correct,options,key:studyKey(sourceConcept)}];});},[atlas,studyItems,parts,sex]);
 const studyQuizCurrent=studyQuizQuestions[studyQuizIndex];
 const studyQuizDone=studyQuizCurrent?studyQuizMastered.includes(studyQuizCurrent.key):false;
 const studyQuizProgress=studyQuizQuestions.length?Math.round(studyQuizMastered.filter(key=>studyQuizQuestions.some(q=>q.key===key)).length/studyQuizQuestions.length*100):0;
 useEffect(()=>{if(activeSystems.length&&!activeSystems.some(s=>s.id===studySystem)){setStudySystem(activeSystems[0].id);setStudyIndex(0);}},[sex,atlas]);
 const selectedParts=state.selected.map(id=>parts.get(id)).filter(p=>!!p),selected=selectedParts[0],system=SYSTEMS.find(s=>s.id===selected?.system);
 const relatedIds=useMemo(()=>{if(!atlas||!chosen)return[];const names=anatomyRelations(chosen.name).flatMap(r=>r.structures);return [...new Set(names.flatMap(n=>atlas.concepts.find(concept=>concept.name===n)?.elements??[]))].filter(id=>!state.selected.includes(id));},[atlas,chosen,state.selected]);
 const selectedSource=selected?.system==='borrowed'
  ? {name:language==='pt'?'BodyParts3D 4.0 · referência masculina':'BodyParts3D 4.0 · male reference',url:'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html'}
  : selected?.system==='donor-muscle'
   ? {name:language==='pt'?'Visible Human Female · referência feminina doadora':'Visible Human Female · female donor reference',url:'https://digitalcommons.du.edu/visiblehuman/1/'}
   : sex==='male'
    ? {name:'BodyParts3D 4.0',url:'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html'}
    : {name:'Human Reference Atlas feminino v1.10',url:'https://humanatlas.io/3d-reference-library'};
 const provenanceLabel=language==='pt'?'Origem da malha':language==='ar'?'مصدر النموذج':'Mesh provenance';
 const provenanceLink=language==='pt'?'Consultar fonte':language==='ar'?'عرض المصدر':'View source';
 const visibleCount=atlas?.parts.filter(p=>state.isolate?state.selected.includes(p.id):state.visible.includes(p.system)||state.selected.includes(p.id)).length??0;
 const results=useMemo(()=>{if(!atlas)return[];const term=query.toLowerCase().trim();if(!term)return edition(atlas.sex??'male').suggestions.map(name=>atlas.concepts.find(c=>c.name.toLowerCase()===name)).filter((x):x is Concept=>!!x);const folded=fold(term);return atlas.concepts.filter(c=>c.name.toLowerCase().includes(term)||c.id.toLowerCase().includes(term)||fold(name(c.name)).includes(folded)).sort((a,b)=>a.name.length-b.name.length).slice(0,80);},[atlas,query,language]);
 const choose=(c:Concept)=>{setChosen(c);setState(s=>({...s,selected:c.elements,isolate:false,rotate:false}));setDetails(true);setPanel(null);};
 useEffect(()=>{if(!atlas)return;return registerAtlasTools(atlas,c=>flushSync(()=>choose(c)));},[atlas]);
 const choosePart=(id:string)=>{const p=parts.get(id);if(!p)return;setChosen({id:p.conceptId,name:p.name,elements:[id]});setState(s=>({...s,selected:[id],isolate:false,rotate:false}));setDetails(true);setPanel(null);};
 const toggle=(id:SystemId)=>{setDetails(false);setState(s=>({...s,selected:[],isolate:false,visible:s.visible.includes(id)?s.visible.filter(x=>x!==id):[...s.visible,id]}));};
 const reset=()=>{setState(s=>({...initial(sex),reset:s.reset+1}));setChosen(null);setDetails(false);setPanel(null);};
 const openPanel=(next:'layers'|'search')=>{setDetails(false);setStudyOpen(false);setPanel(p=>p===next?null:next);};
 const openStudy=()=>{setPanel(null);setDetails(false);setStudyOpen(v=>!v);};
 const inspectStudyItem=()=>{if(!studyCurrent)return;choose(studyCurrent);setDetails(false);};
 const completeStudyItem=()=>{if(!studyCurrent)return;setStudyCompleted(items=>items.includes(studyKey(studyCurrent))?items:[...items,studyKey(studyCurrent)]);};
 const answerStudyQuiz=(id:string)=>{if(!studyQuizCurrent)return;setStudyQuizAnswer(id);if(id===studyQuizCurrent.correct.id)setStudyQuizMastered(items=>items.includes(studyQuizCurrent.key)?items:[...items,studyQuizCurrent.key]);};
 return <main className="studio">
  {atlas&&<AnatomyScene atlas={atlas} state={{...state,related:relatedIds,inspectorOpen:details&&selectedParts.length>0}} onSelect={choosePart} onProgress={n=>{setProgress(n);if(n===100)setError('');}} onError={setError}/>}
  <div className="vignette"/>
  <header className="identity"><div className="eyebrow"><span className="status-dot"/> {t('eyebrow')}</div><h1>{t('title')}<Badge variant="outline" className="edition">3D</Badge></h1><div className="identity-meta">{atlas?atlas.parts.length.toLocaleString('en'):'—'} {t('pieces')} <span>·</span> {source.dataset}</div>
   <div className="anatomy-choice"><Select value={sex} onValueChange={value=>setSex(value as Sex)}><SelectTrigger aria-label={t('referenceBodyLabel')}><span>{rtl?`${t('referenceBody')} ${source.label}`:`${source.label} ${t('referenceBody')}`}</span></SelectTrigger><SelectContent className="anatomy-choice-menu">{EDITIONS.map(e=><SelectItem key={e.sex} value={e.sex}>{rtl?`${t('referenceBody')} ${edition_(e.sex,language).label}`:`${edition_(e.sex,language).label} ${t('referenceBody')}`}</SelectItem>)}</SelectContent></Select></div></header>
  <nav className="top-actions" aria-label={t('explorerPanels')}><Button variant="ghost" className={studyOpen?'active':''} onClick={openStudy} aria-label="Modo de estudo guiado" title="Modo de estudo guiado"><GraduationCap size={18}/><span>Estudar</span></Button><Button variant="ghost" className={panel==='search'?'active':''} onClick={()=>openPanel('search')} aria-label={t('searchAnatomy')}><Search size={18}/><span>{t('findStructure')}</span><kbd>/</kbd></Button><Button variant="ghost" className="icon-button language-switch" aria-label={t('language')} title={t('language')} onClick={()=>setLanguage(l=>LANGUAGES[(LANGUAGES.findIndex(x=>x.id===l)+1)%LANGUAGES.length].id)}><span>{LANGUAGES[(LANGUAGES.findIndex(l=>l.id===language)+1)%LANGUAGES.length].label}</span></Button><Button variant="ghost" className="icon-button" aria-label={t('aboutThisAtlas')} onClick={()=>{setDetails(false);setPanel(null);setAbout(true);}}><Info size={18}/></Button><AuthPanel onUserChange={setAuthUser}/></nav>
  <section className={`layers-panel glass ${panel==='layers'?'mobile-open':''}`} aria-label={t('anatomicalLayers')}>
   <div className="panel-heading"><span>{t('systems')}</span><Button variant="ghost" className="mobile-only icon-button" onClick={()=>setPanel(null)} aria-label={t('closeSystems')}><X size={18}/></Button><Badge variant="secondary" className="desktop-only small-number">{activeSystems.length}</Badge></div>
   <div className="layer-presets"><Button variant="ghost" aria-pressed={activeSystems.every(x=>state.visible.includes(x.id))} onClick={()=>setState(s=>({...s,selected:[],isolate:false,visible:activeSystems.map(x=>x.id)}))}>{t('presetAll')}</Button><Button variant="ghost" aria-pressed={sex==='female'?state.visible.length===2&&state.visible.includes('skeletal')&&state.visible.includes('borrowed'):state.visible.length===1&&state.visible[0]==='skeletal'} onClick={()=>setState(s=>({...s,selected:[],isolate:false,visible:sex==='female'?['skeletal','borrowed']:['skeletal']}))}>{t('presetSkeleton')}</Button><Button variant="ghost" aria-pressed={state.visible.length===6&&['cardiac','respiratory','digestive','urinary','endocrine','reproductive'].every(id=>state.visible.includes(id as SystemId))} onClick={()=>setState(s=>({...s,selected:[],isolate:false,visible:['cardiac','respiratory','digestive','urinary','endocrine','reproductive']}))}>{t('presetOrgans')}</Button></div>
   <div className="system-list">{activeSystems.map(s=><div className={`system-row ${state.visible.includes(s.id)?'enabled':''}`} key={s.id}><Button variant="ghost" className="system-name" title={`${t('showOnly')} ${systemName(s.id,language)}`} onClick={()=>setState(v=>({...v,visible:[s.id],isolate:false,selected:[]}))}><span className="system-dot" style={{background:s.color}}/>{systemName(s.id,language)}<span className="system-count">{counts[s.id]}</span></Button><Switch checked={state.visible.includes(s.id)} onCheckedChange={()=>toggle(s.id)} aria-label={`${t('show')} ${systemName(s.id,language)}`} /></div>)}</div>
   <div className="panel-foot"><span>{visibleCount.toLocaleString('en')} {t('piecesVisible')}</span><Button variant="ghost" onClick={()=>setState(s=>({...s,visible:[],selected:[],isolate:false}))}>{t('hideAll')}</Button></div>
  </section>
  {studyOpen&&<section className="study-panel glass" aria-label="Modo de estudo guiado">
   <div className="study-panel-heading"><div><span className="study-kicker"><BookOpen size={13}/> CENTRAL FORENSE · APRENDIZAGEM</span><h2>Estudo guiado</h2></div><Button variant="ghost" className="icon-button" onClick={()=>setStudyOpen(false)} aria-label="Fechar estudo guiado"><X size={18}/></Button></div>
   <p className="study-intro">Escolha um sistema, explore as estruturas em sequência e marque cada etapa quando terminar.</p>
   <label className="study-label">Sistema anatômico</label>
   <Select value={studySystem} onValueChange={value=>{setStudySystem(value as SystemId);setStudyIndex(0);setStudyQuizIndex(0);setStudyQuizAnswer(null);}}><SelectTrigger aria-label="Escolher sistema anatômico"><span>{systemName(studySystem,'pt')}</span></SelectTrigger><SelectContent>{activeSystems.map(s=><SelectItem key={s.id} value={s.id}>{systemName(s.id,'pt')} · {counts[s.id]}</SelectItem>)}</SelectContent></Select>

   <div className="study-mode-tabs"><Button variant={studyQuizMode?'ghost':'outline'} onClick={()=>setStudyQuizMode(false)}><BookOpen size={14}/> Roteiro</Button><Button variant={studyQuizMode?'outline':'ghost'} onClick={()=>{setStudyQuizMode(true);setStudyQuizIndex(0);setStudyQuizAnswer(null);}}><ClipboardCheck size={14}/> Avaliação</Button></div>
   {studyQuizMode?<div className="study-quiz">
    <div className="study-progress"><div><span>Domínio do conteúdo</span><strong>{studyQuizMastered.filter(key=>studyQuizQuestions.some(q=>q.key===key)).length}/{studyQuizQuestions.length}</strong></div><div className="study-progress-track"><i style={{width:studyQuizProgress+'%'}}/></div></div>
    {studyQuizQuestions.length===0?<p className="study-empty">Ainda não há relações anatômicas documentadas para criar perguntas seguras neste sistema. O roteiro de exploração continua disponível.</p>:studyQuizCurrent?<><div className="study-step-count">QUESTÃO {studyQuizIndex+1} DE {studyQuizQuestions.length}</div><h3 className="study-structure-name">Qual estrutura está relacionada a {name(studyQuizCurrent.source.name)}?</h3><p className="study-structure-description">Selecione uma das estruturas relacionadas no catálogo anatômico.</p>
     <div className="study-quiz-options">{studyQuizCurrent.options.map(option=><Button key={option.id} variant="outline" className={"study-quiz-option "+(studyQuizAnswer===option.id?(option.id===studyQuizCurrent.correct.id?'is-correct':'is-wrong'):'')} onClick={()=>answerStudyQuiz(option.id)}><span>{name(option.name)}</span>{studyQuizAnswer===option.id?(option.id===studyQuizCurrent.correct.id?<CheckCircle2 size={16}/>:<X size={16}/>):null}</Button>)}</div>
     {studyQuizAnswer&&<div className={"study-feedback "+(studyQuizAnswer===studyQuizCurrent.correct.id?'feedback-correct':'feedback-retry')}><strong>{studyQuizAnswer===studyQuizCurrent.correct.id?'Resposta correta!':'Ainda não. Tente outra alternativa.'}</strong><p>{studyQuizCurrent.relation.explanation}</p></div>}
     <div className="study-navigation"><Button variant="ghost" disabled={studyQuizIndex===0} onClick={()=>{setStudyQuizIndex(i=>Math.max(0,i-1));setStudyQuizAnswer(null);}}><ChevronLeft size={16}/> Anterior</Button><Button variant="outline" disabled={!studyQuizDone} onClick={()=>{setStudyQuizIndex(i=>i+1);setStudyQuizAnswer(null);}}>{studyQuizIndex===studyQuizQuestions.length-1?'Concluir avaliação':'Próxima questão'} <ChevronRight size={16}/></Button></div>
    </>:<div className="study-empty"><CheckCircle2 size={22}/> Avaliação concluída! Você dominou {studyQuizMastered.filter(key=>studyQuizQuestions.some(q=>q.key===key)).length} de {studyQuizQuestions.length} relações disponíveis.</div>}
   </div>:studyCurrent?<><div className="study-progress"><div><span>Estruturas exploradas</span><strong>{studyItems.filter(item=>studyCompleted.includes(studyKey(item))).length}/{studyItems.length}</strong></div><div className="study-progress-track"><i style={{width:studyProgress+'%'}}/></div></div><div className="study-step-count">ETAPA {studyIndex+1} DE {studyItems.length}</div><h3 className="study-structure-name">{name(studyCurrent.name)}</h3><p className="study-structure-description">{explanation(studyCurrent.name,parts.get(studyCurrent.elements[0])?.system??studySystem,sex,'pt')||'Explore a estrutura no modelo 3D e consulte suas relações anatômicas quando disponíveis.'}</p><div className="study-actions"><Button variant="outline" onClick={inspectStudyItem}><Focus size={15}/> Ver no modelo 3D</Button><Button variant="ghost" className={studyDone?'study-done':''} onClick={completeStudyItem}><CheckCircle2 size={15}/>{studyDone?'Concluída':'Marcar como concluída'}</Button></div><div className="study-navigation"><Button variant="ghost" disabled={studyIndex===0} onClick={()=>setStudyIndex(i=>Math.max(0,i-1))}><ChevronLeft size={16}/> Anterior</Button><Button variant="ghost" disabled={studyIndex>=studyItems.length-1} onClick={()=>setStudyIndex(i=>Math.min(studyItems.length-1,i+1))}>Próxima <ChevronRight size={16}/></Button></div></>:<p className="study-empty">Não há estruturas catalogadas neste sistema para esta referência.</p>}
   <p className="study-storage-status">{authUser&&cloudProgressLoadedFor===authUser.id+':'+sex?'✓ Progresso sincronizado com sua conta':studySaveStatus==='saved'?'✓ Progresso salvo neste dispositivo':'Não foi possível salvar neste navegador. O progresso pode se perder ao fechar a página.'}</p><p className="study-footnote">O histórico é separado entre as referências masculina e feminina. Ao entrar, o Atlas combina o progresso local com o da sua conta e sincroniza as alterações na nuvem.</p>
  </section>}{panel==='search'&&<section className="search-panel glass" aria-label={t('findAnatomy')}><div className="panel-heading"><span>{t('findStructure')}</span><Button variant="ghost" className="icon-button" onClick={()=>setPanel(null)} aria-label={t('closeSearch')}><X size={18}/></Button></div><Combobox<Concept> items={results} value={null} onValueChange={value=>{if(value)choose(value);}} inputValue={query} onInputValueChange={setQuery} itemToStringLabel={c=>name(c.name)} filter={null} open onOpenChange={open=>{if(!open)setPanel(null);}}><ComboboxInput autoFocus placeholder={t('searchPlaceholder')} aria-label={t('searchNamed')} showTrigger={false}/><ComboboxContent className="anatomy-search-results"><ComboboxEmpty>{t('noMatches')}</ComboboxEmpty><ComboboxList>{(c:Concept)=><ComboboxItem key={c.id} value={c}><span className="search-result-name">{name(c.name)}</span><span className="small-number">{c.elements.length} {c.elements.length===1?t('piece'):t('pieces_plural')}</span></ComboboxItem>}</ComboboxList></ComboboxContent></Combobox><p className="search-note">{query?t('searchHintTyping'):t('searchHintEmpty')}</p></section>}
  <nav className="view-controls glass" aria-label={t('cameraControls')}>{(['three-quarter','front','side','back'] as View[]).map((v,i)=><Button variant="ghost" key={v} className={state.view===v?'active':''} aria-pressed={state.view===v} disabled={state.explode>.8&&v!=='front'} onClick={()=>setState(s=>({...s,view:v,reset:s.reset+1,rotate:false}))} title={t((['viewThreeQuarter','viewFront','viewSide','viewBack'] as const)[i])} aria-label={t((['viewThreeQuarter','viewFront','viewSide','viewBack'] as const)[i])}><span>{[rtl?'¾':'¾',rtl?'أ':'F',rtl?'ج':'S',rtl?'خ':'B'][i]}</span></Button>)}<i/><Button variant="ghost" disabled={state.explode>=.4} aria-label={state.rotate?t('pauseRotation'):t('rotateBody')} title={t('autoRotate')} className={state.rotate?'active':''} onClick={()=>setState(s=>({...s,rotate:!s.rotate}))}>{state.rotate?<Pause size={17}/>:<RotateCw size={18}/>}</Button><Button variant="ghost" aria-label={t('resetView')} title={t('reset')} onClick={reset}><RotateCcw size={17}/></Button></nav>
  <div className="scene-caption"><span className="caption-line"/><span>{state.isolate?(chosen?name(chosen.name):t('selectedStructure')):state.explode>.95?t('inventory'):state.explode>.05?t('separated'):source.caption}</span><span className="caption-line"/></div>
  <div className="bottom-dock glass"><Button variant="ghost" className="mobile-only dock-layers" onClick={()=>openPanel('layers')} aria-label={t('openLayers')}><Layers3 size={20}/><span>{t('systems')}</span></Button><div className="explode-control"><div className="explode-label"><label id="explode-label">{t('explode')}</label><output>{Math.round(state.explode*100)}<span>%</span></output></div><Slider aria-labelledby="explode-label" min={0} max={100} step={1} value={[state.explode*100]} onValueChange={v=>setState(s=>({...s,explode:(Array.isArray(v)?v[0]:v)/100,view:(Array.isArray(v)?v[0]:v)>80?'front':s.view,rotate:false}))}/><div className="slider-endpoints"><span>{t('assembled')}</span><span>{t('everyPiece')}</span></div></div><Button variant="ghost" className="dock-reset" onClick={reset} aria-label={t('assembleReset')}><RotateCcw size={18}/><span>{t('reset')}</span></Button></div>
  <footer className="studio-footer"><span>{state.explode>.8?t('dragToPan'):t('dragToOrbit')} <b>·</b> {t('pinchToZoom')} <b>·</b> {t('tapToInspect')}</span><Button variant="ghost" onClick={()=>{setDetails(false);setPanel(null);setAbout(true);}}>{t('sourceCredits')} <ArrowUpRight size={12}/></Button></footer>
  {progress<100&&!error&&<div className="loading glass" role="status"><Activity size={18}/><div><strong>{t('preparing')}</strong><span>{progress}% · {t('loadingBody')} {source.label.toLowerCase()} {t('reference')}</span><div className="loading-track"><i style={{width:`${progress}%`}}/></div></div></div>}
  {error&&<div className="loading glass error" role="alert"><p>{error}</p><Button variant="ghost" onClick={()=>location.reload()}>{t('reloadViewer')}</Button></div>}
  <Sheet open={details&&selectedParts.length>0} modal={false} disablePointerDismissal onOpenChange={setDetails}><SheetContent initialFocus={detailTitle} className={`detail-sheet glass ${state.isolate?'is-isolated':''}`} showCloseButton={true}><div className="detail-header"><div className="detail-accent" style={{background:system?.color}}/><div className="eyebrow">{system?systemName(system.id,language):t('anatomy')}</div><SheetTitle ref={detailTitle} tabIndex={-1} className="structure-title">{chosen?name(chosen.name):''}</SheetTitle>{chosen&&(rtl||language==='pt')&&name(chosen.name)!==chosen.name&&<span className="structure-latin">{chosen.name}</span>}</div><div className="detail-scroll" key={`${chosen?.id}-${state.isolate}`}><SheetDescription className="structure-description">{chosen&&selected?explanation(chosen.name,selected.system,sex,language):''}</SheetDescription>{chosen&&language==='pt'&&anatomyRelations(chosen.name).map((relation,i)=><section className="structure-relations" key={`${chosen.id}-relation-${i}`}><div className="relation-heading">Relações anatômicas · {relation.kind}</div><p>{relation.explanation}</p><div className="relation-legend"><span><i className="legend-selected"/> Estrutura selecionada</span><span><i className="legend-related"/> Estruturas relacionadas</span></div><div className="relation-structures">{relation.structures.map(item=>{const target=atlas?.concepts.find(c=>c.name===item);return <Button key={item} type="button" variant="ghost" className="relation-chip" disabled={!target} aria-label={target?`Selecionar ${name(item)}`:`${name(item)} não disponível para seleção`} onClick={()=>{if(target)choose(target);}}>{name(item)} <ArrowUpRight size={12}/></Button>;})}</div></section>)}<div className="structure-meta structure-provenance"><span>{provenanceLabel}</span><strong>{selectedSource?.name??source.dataset}</strong><a href={selectedSource?.url??source.download} target="_blank" rel="noreferrer">{provenanceLink} <ArrowUpRight size={12}/></a></div>{chosen&&!described(chosen.name,language)&&<span className="context-note">{t('systemOverview')}</span>}<div className="structure-meta"><span>{language==='pt'?'Região anatômica':language==='ar'?'المنطقة التشريحية':'Anatomical region'}<strong>{chosen?anatomicalRegion(chosen.name,language):'—'}</strong></span><span>{language==='pt'?'Lateralidade':language==='ar'?'الجانب':'Laterality'}<strong>{chosen?anatomicalLaterality(chosen.name,language):'—'}</strong></span></div><div className="structure-meta"><span>{language==='pt'?'Identificação científica':language==='ar'?'التسمية العلمية':'Scientific identification'}<strong>{chosen?.name??'—'}</strong></span><span>{t('atlasReference')}<strong>{chosen?.id}</strong></span><span>{language==='pt'?'Sistema':language==='ar'?'الجهاز':'System'}<strong>{system?systemName(system.id,language):'—'}</strong></span><span>{t('selectedPieces')}<strong>{state.selected.length.toLocaleString('en')}</strong></span></div>{selectedParts.length>1&&<div className="member-list"><h3>{t('includedStructures')}</h3>{selectedParts.slice(0,50).map(p=><Button variant="ghost" key={p.id} onClick={()=>choosePart(p.id)}><span>{name(p.name)}</span><ChevronRight size={14}/></Button>)}{selectedParts.length>50&&<p>{t('and')} {selectedParts.length-50} {t('andMore')}</p>}</div>}<a className="source-link" href={selectedSource?.url??source.download} target="_blank" rel="noreferrer">{provenanceLink} <ArrowUpRight size={14}/></a></div><div className="detail-actions"><Button className={`primary-action ${state.isolate?'active':''}`} onClick={()=>setState(s=>({...s,isolate:!s.isolate,explode:0}))}><Focus size={18}/>{state.isolate?t('showSurrounding'):t('isolate')}<ChevronRight size={16}/></Button><Button variant="ghost" className="secondary-action" onClick={()=>{setState(s=>({...s,selected:[],isolate:false}));setDetails(false);}}>{t('clearSelection')}</Button></div></SheetContent></Sheet>
  <Sheet open={about} onOpenChange={setAbout}><SheetContent className="about-sheet glass"><div className="eyebrow">{t('sourceScope')}</div><SheetTitle className="structure-title">{t('aboutTitle')}</SheetTitle><SheetDescription>{t('aboutIntro')} {source.label.toLowerCase()} {t('aboutIntroFrom')} {source.dataset}.</SheetDescription><div className="about-copy"><p><strong>{source.label} · {source.dataset}</strong><br/>{source.summary}</p><p>{source.limits}</p><p>{t('shared')}</p><p>{t('caveat')}</p><h3>{t('sourceHeading')}</h3><p>{source.credit}</p><a href={source.licence} target="_blank" rel="noreferrer">{t('datasetLicense')} <ArrowUpRight size={14}/></a><a href={source.download} target="_blank" rel="noreferrer">{t('originalGeometry')} <ArrowUpRight size={14}/></a>{source.publication&&<a href={source.publication} target="_blank" rel="noreferrer">{t('readPublication')} <ArrowUpRight size={14}/></a>}</div></SheetContent></Sheet>
 </main>;
}
