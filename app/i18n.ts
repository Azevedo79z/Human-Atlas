/** Interface language. Anatomical names and descriptions are translated
 * separately, in `terms-ar.json` and `anatomy-ar.ts`, because they come from
 * sources with their own provenance rather than from this file. */
export type Language = 'en'|'pt'|'ar';
export const LANGUAGES:{id:Language;label:string;direction:'ltr'|'rtl'}[] = [
 {id:'en',label:'English',direction:'ltr'},
 {id:'pt',label:'Português (Brasil)',direction:'ltr'},
 {id:'ar',label:'العربية',direction:'rtl'},
];
export const direction = (language:Language) => LANGUAGES.find(l=>l.id===language)?.direction ?? 'ltr';

/** Every piece of interface text, available in English, Brazilian Portuguese and Arabic. */
const TEXT = {
 title:{en:'Human Atlas',ar:'أطلس الجسم البشري' ,pt:"Atlas Humano"},
 eyebrow:{en:'INTERACTIVE ANATOMY',ar:'تشريح تفاعلي' ,pt:"ANATOMIA INTERATIVA"},
 pieces:{en:'modeled pieces',ar:'قطعة مُجسَّمة' ,pt:"peças modeladas"},
 referenceBody:{en:'reference body',ar:'الجسم المرجعي' ,pt:"corpo de referência"},
 referenceBodyLabel:{en:'Reference body',ar:'الجسم المرجعي' ,pt:"Corpo de referência"},
 language:{en:'Language',ar:'اللغة' ,pt:"Idioma"},

 findStructure:{en:'Find a structure',ar:'ابحث عن تركيب' ,pt:"Buscar estrutura"},
 searchAnatomy:{en:'Search anatomy',ar:'البحث في التشريح' ,pt:"Pesquisar anatomia"},
 findAnatomy:{en:'Find anatomy',ar:'البحث في التشريح' ,pt:"Buscar anatomia"},
 searchNamed:{en:'Search named anatomical structures',ar:'ابحث في التراكيب التشريحية المسماة' ,pt:"Pesquisar estruturas anatômicas"},
 searchPlaceholder:{en:'Heart, femur, cranial nerve…',ar:'قلب، عظم الفخذ، عصب قحفي…' ,pt:"Coração, fêmur, nervo craniano…"},
 closeSearch:{en:'Close search',ar:'إغلاق البحث' ,pt:"Fechar pesquisa"},
 noMatches:{en:'No structures match your search.',ar:'لا توجد تراكيب مطابقة لبحثك.' ,pt:"Nenhuma estrutura corresponde à pesquisa."},
 searchHintEmpty:{en:'Start with a major organ, or search every named structure.',ar:'ابدأ بعضو رئيسي، أو ابحث في كل تركيب مسمى.' ,pt:"Comece por um órgão importante ou pesquise entre todas as estruturas."},
 searchHintTyping:{en:'Showing up to 80 matches. Refine your search to find smaller structures.',ar:'يُعرض حتى ٨٠ نتيجة. ضيّق بحثك للوصول إلى التراكيب الأصغر.' ,pt:"Exibindo até 80 resultados. Refine a pesquisa para encontrar estruturas menores."},
 piece:{en:'piece',ar:'قطعة' ,pt:"peça"},
 pieces_plural:{en:'pieces',ar:'قطعة' ,pt:"peças"},

 systems:{en:'Systems',ar:'الأجهزة' ,pt:"Sistemas"},
 anatomicalLayers:{en:'Anatomical layers',ar:'الطبقات التشريحية' ,pt:"Camadas anatômicas"},
 openLayers:{en:'Open system layers',ar:'فتح طبقات الأجهزة' ,pt:"Abrir camadas dos sistemas"},
 closeSystems:{en:'Close systems',ar:'إغلاق الأجهزة' ,pt:"Fechar sistemas"},
 presetAll:{en:'All',ar:'الكل' ,pt:"Todos"},
 presetSkeleton:{en:'Skeleton',ar:'الهيكل' ,pt:"Esqueleto"},
 presetOrgans:{en:'Organs',ar:'الأعضاء' ,pt:"Órgãos"},
 showOnly:{en:'Show only',ar:'إظهار فقط' ,pt:"Mostrar apenas"},
 show:{en:'Show',ar:'إظهار' ,pt:"Mostrar"},
 piecesVisible:{en:'pieces visible',ar:'قطعة ظاهرة' ,pt:"peças visíveis"},
 hideAll:{en:'Hide all',ar:'إخفاء الكل' ,pt:"Ocultar tudo"},

 cameraControls:{en:'Camera controls',ar:'التحكم في الكاميرا' ,pt:"Controles da câmera"},
 explorerPanels:{en:'Explorer panels',ar:'لوحات المستكشف' ,pt:"Painéis do explorador"},
 viewThreeQuarter:{en:'three-quarter view',ar:'منظور ثلاثة أرباع' ,pt:"Vista em três quartos"},
 viewFront:{en:'front view',ar:'منظور أمامي' ,pt:"Vista frontal"},
 viewSide:{en:'side view',ar:'منظور جانبي' ,pt:"Vista lateral"},
 viewBack:{en:'back view',ar:'منظور خلفي' ,pt:"Vista posterior"},
 autoRotate:{en:'Auto rotate',ar:'دوران تلقائي' ,pt:"Rotação automática"},
 rotateBody:{en:'Rotate body',ar:'تدوير الجسم' ,pt:"Girar corpo"},
 pauseRotation:{en:'Pause rotation',ar:'إيقاف الدوران' ,pt:"Pausar rotação"},
 reset:{en:'Reset',ar:'إعادة' ,pt:"Redefinir"},
 resetView:{en:'Reset view and layers',ar:'إعادة ضبط المنظور والطبقات' ,pt:"Redefinir vista e camadas"},
 assembleReset:{en:'Assemble and reset',ar:'إعادة التجميع' ,pt:"Reunir e redefinir"},

 explode:{en:'Explode anatomy',ar:'تفكيك التشريح' ,pt:"Separar anatomia"},
 assembled:{en:'Assembled',ar:'مُجمَّع' ,pt:"Montado"},
 everyPiece:{en:'Every piece',ar:'كل قطعة' ,pt:"Todas as peças"},
 inventory:{en:'ANATOMICAL INVENTORY',ar:'جرد تشريحي' ,pt:"INVENTÁRIO ANATÔMICO"},
 separated:{en:'SEPARATED STRUCTURES',ar:'تراكيب مفصولة' ,pt:"ESTRUTURAS SEPARADAS"},
 selectedStructure:{en:'SELECTED STRUCTURE',ar:'التركيب المحدد' ,pt:"ESTRUTURA SELECIONADA"},

 dragToOrbit:{en:'Drag to orbit',ar:'اسحب للدوران' ,pt:"Arraste para girar"},
 dragToPan:{en:'Drag to pan',ar:'اسحب للتحريك' ,pt:"Arraste para deslocar"},
 pinchToZoom:{en:'Pinch to zoom',ar:'اقرص للتكبير' ,pt:"Pinça para ampliar"},
 tapToInspect:{en:'Tap to inspect',ar:'انقر للفحص' ,pt:"Toque para inspecionar"},

 anatomy:{en:'ANATOMY',ar:'تشريح' ,pt:"ANATOMIA"},
 atlasReference:{en:'Atlas reference',ar:'مرجع الأطلس' ,pt:"Referência do atlas"},
 selectedPieces:{en:'Selected pieces',ar:'القطع المحددة' ,pt:"Peças selecionadas"},
 includedStructures:{en:'Included structures',ar:'التراكيب المتضمنة' ,pt:"Estruturas incluídas"},
 andMore:{en:'more modeled pieces.',ar:'قطعة مُجسَّمة أخرى.' ,pt:"outras peças modeladas."},
 and:{en:'And',ar:'و' ,pt:"E"},
 systemOverview:{en:'System overview · structure identified from source anatomy',ar:'نظرة عامة على الجهاز · التركيب محدد من التشريح المصدر' ,pt:"Visão geral do sistema · estrutura identificada a partir da anatomia de origem"},
 isolate:{en:'Isolate structure',ar:'عزل التركيب' ,pt:"Isolar estrutura"},
 showSurrounding:{en:'Show surrounding anatomy',ar:'إظهار التشريح المحيط' ,pt:"Mostrar anatomia ao redor"},
 clearSelection:{en:'Clear selection',ar:'إلغاء التحديد' ,pt:"Limpar seleção"},
 viewSource:{en:'View anatomical source',ar:'عرض المصدر التشريحي' ,pt:"Ver fonte anatômica"},

 aboutThisAtlas:{en:'About this atlas',ar:'عن هذا الأطلس' ,pt:"Sobre este atlas"},
 sourceScope:{en:'SOURCE & SCOPE',ar:'المصدر والنطاق' ,pt:"FONTES E ESCOPO"},
 aboutTitle:{en:'A body, revealed.',ar:'جسدٌ مكشوف.' ,pt:"O corpo em detalhes."},
 aboutIntro:{en:'Explore the adult',ar:'استكشف التشريح المرجعي للبالغ' ,pt:"Explore a anatomia de referência adulta"},
 aboutIntroFrom:{en:'reference anatomy from',ar:'من' ,pt:"de"},
 shared:{en:'The two reference bodies come from different projects, so their coverage and level of detail differ. Neither contains every human structure or variation. Named concepts can contain multiple pieces; each source mesh is rendered once.',
        ar:'الجسمان المرجعيان من مشروعين مختلفين، فتغطيتهما ومستوى تفصيلهما مختلفان. ولا أحدهما يحوي كل تركيب أو تنوع بشري. المفهوم المسمى قد يضم عدة قطع، وكل شبكة مصدرية تُرسم مرة واحدة.' ,pt:"Os dois corpos de referência vêm de projetos diferentes, por isso a cobertura e o nível de detalhe variam. Nenhum deles contém todas as estruturas ou variações humanas. Um conceito nomeado pode conter várias peças; cada malha de origem é renderizada uma única vez."},
 caveat:{en:'Colors and system groupings are designed for exploration. The geometry is simplified for the web, and short explanations provide general educational context. This is an anatomical reference, not a diagnostic or surgical tool.',
        ar:'الألوان وتجميع الأجهزة مصممة للاستكشاف. الهندسة مبسطة للويب، والشروح القصيرة تقدم سياقًا تعليميًا عامًا. هذا مرجع تشريحي، وليس أداة تشخيص أو جراحة.' ,pt:"As cores e os agrupamentos por sistema foram pensados para exploração. A geometria foi simplificada para a web, e as explicações oferecem contexto educacional geral. Este é um atlas anatômico, não uma ferramenta de diagnóstico ou cirurgia."},
 sourceHeading:{en:'Source',ar:'المصدر' ,pt:"Fonte"},
 datasetLicense:{en:'Dataset license',ar:'رخصة البيانات' ,pt:"Licença do conjunto de dados"},
 originalGeometry:{en:'Original geometry & metadata',ar:'الهندسة الأصلية والبيانات الوصفية' ,pt:"Geometria original e metadados"},
 readPublication:{en:'Read the source publication',ar:'اقرأ البحث المنشور' ,pt:"Ler publicação de origem"},
 sourceCredits:{en:'Source & credits',ar:'المصدر والاعتمادات' ,pt:"Fontes e créditos"},

 preparing:{en:'Preparing the anatomy',ar:'جارٍ تحضير التشريح' ,pt:"Preparando a anatomia"},
 loadingBody:{en:'Loading',ar:'تحميل' ,pt:"Carregando"},
 reference:{en:'reference anatomy',ar:'التشريح المرجعي' ,pt:"anatomia de referência"},
 reloadViewer:{en:'Reload viewer',ar:'إعادة تحميل العارض' ,pt:"Recarregar visualizador"},
 catalogueError:{en:'The anatomy catalogue could not be loaded.',ar:'تعذر تحميل فهرس التشريح.' ,pt:"Não foi possível carregar o catálogo de anatomia."},
} as const;

export type Phrase = keyof typeof TEXT;
export const say = (language:Language, phrase:Phrase) => (TEXT[phrase] as Record<Language,string>)[language] ?? (TEXT[phrase] as Record<string,string>).en;

/** Arabic writes several letters more than one way and marks vowels optionally,
 * so a search has to compare stripped forms or it misses obvious matches. */
export const fold = (text:string) => text
 .toLowerCase()
 .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 .replace(/[ً-ْٰـ]/g,'')
 .replace(/[أإآٱ]/g,'ا')
 .replace(/ى/g,'ي')
 .replace(/ؤ/g,'و')
 .replace(/ئ/g,'ي')
 .replace(/ة/g,'ه')
 .trim();
