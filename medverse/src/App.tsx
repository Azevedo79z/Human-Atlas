import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDown, ArrowRight, ArrowUpRight, Atom, AudioWaveform,
  BookOpen, BrainCircuit, Check, CircleHelp,
  Dna, FlaskConical, GraduationCap, Layers3, Menu, Microscope,
  Search, ShieldCheck, Sparkles, Stethoscope, X,
} from "lucide-react";

type ModuleItem = {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  description: string;
  icon: typeof Activity;
  status: "available" | "building" | "planned";
  tags: string[];
  action?: string;
};

const modules: ModuleItem[] = [
  {
    id: "anatomy",
    number: "01",
    title: "Anatomy Explorer",
    subtitle: "O corpo humano em outra dimensão",
    description: "Explore estruturas anatômicas em 3D, alterne sistemas, selecione estruturas e descubra como o corpo humano se organiza. O Human Atlas existente será a base deste ambiente.",
    icon: Activity, status: "available", tags: ["3D", "Estruturas", "Sistemas"], action: "atlas",
  },
  {
    id: "radiology",
    number: "02",
    title: "Radiology Lab",
    subtitle: "Enxergue além da superfície",
    description: "Um laboratório educacional para navegar por imagens de raio X, tomografia, ressonância e ultrassom. O visualizador DICOM será integrado em uma etapa própria.",
    icon: AudioWaveform, status: "building", tags: ["DICOM", "CT", "MRI"],
  },
  {
    id: "pathology",
    number: "03",
    title: "Pathology Atlas",
    subtitle: "Conecte estrutura e doença",
    description: "Um atlas visual para estudar alterações patológicas, tecidos e relações entre estruturas anatômicas, com fontes e referências rastreáveis.",
    icon: Microscope, status: "planned", tags: ["Histologia", "Patologia", "Atlas"],
  },
  {
    id: "library",
    number: "04",
    title: "Medical Library",
    subtitle: "Conhecimento com contexto",
    description: "Biblioteca pesquisável com materiais de acesso permitido, publicações abertas, referências e organização por assunto.",
    icon: BookOpen, status: "planned", tags: ["Artigos", "Referências", "Pesquisa"],
  },
  {
    id: "med-ai",
    number: "05",
    title: "MED AI",
    subtitle: "Um copiloto para aprender medicina",
    description: "Assistente educacional com respostas fundamentadas, referências e limites claros. Não substitui avaliação, diagnóstico ou orientação profissional.",
    icon: BrainCircuit, status: "planned", tags: ["IA", "Fontes", "Estudo"],
  },
  {
    id: "clinical",
    number: "06",
    title: "Clinical Learning",
    subtitle: "Aprenda tomando decisões",
    description: "Casos e simulações educacionais com etapas, pistas, feedback e explicações para desenvolver raciocínio clínico em ambiente de aprendizagem.",
    icon: Stethoscope, status: "planned", tags: ["Casos", "Simulação", "Raciocínio"],
  },
  {
    id: "academy",
    number: "07",
    title: "MED Academy",
    subtitle: "Sua jornada de aprendizagem",
    description: "Trilhas, desafios, avaliações, metas e acompanhamento de progresso com perfis e níveis de acesso.",
    icon: GraduationCap, status: "planned", tags: ["Cursos", "Desafios", "Progresso"],
  },
  {
    id: "research",
    number: "08",
    title: "Research Center",
    subtitle: "Da pergunta à evidência",
    description: "Ferramentas para estruturar perguntas, organizar fontes e explorar evidências científicas com transparência sobre a origem dos dados.",
    icon: FlaskConical, status: "planned", tags: ["Evidências", "Projetos", "Dados"],
  },
];

const statusLabel = {
  available: "Conectado",
  building: "Em desenvolvimento",
  planned: "Na sequência",
};

function HumanHologram() {
  return (
    <div className="holo-stage" aria-label="Ilustração holográfica abstrata do corpo humano">
      <div className="holo-orbit orbit-one" />
      <div className="holo-orbit orbit-two" />
      <div className="holo-orbit orbit-three" />
      <div className="holo-scan" />
      <div className="holo-cross cross-a" />
      <div className="holo-cross cross-b" />
      <svg className="human-wire" viewBox="0 0 360 650" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="bodyGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a5f7ff" />
            <stop offset="48%" stopColor="#35c9ed" />
            <stop offset="100%" stopColor="#557dff" />
          </linearGradient>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g fill="none" stroke="url(#bodyGlow)" strokeWidth="1.5" filter="url(#softGlow)" opacity=".95">
          <ellipse cx="180" cy="62" rx="36" ry="48" />
          <path d="M148 112 Q180 98 212 112 L231 145 Q245 171 238 220 L226 293 L222 368 Q219 401 211 425 L220 522 L209 604 M139 112 Q112 126 105 158 L90 225 Q84 250 96 270 L116 278 L129 245 L143 192 M212 112 Q240 126 255 158 L270 225 Q276 250 264 270 L244 278 L231 245 L217 192" />
          <path d="M148 112 Q133 142 137 183 L145 238 L139 292 Q130 327 136 363 L143 420 L140 520 L151 604 M212 112 Q227 142 223 183 L215 238 L221 292 Q230 327 224 363 L217 420 L220 520 L209 604" />
          <path d="M143 420 Q180 440 217 420 M139 292 Q180 311 221 292 M145 238 Q180 254 215 238 M137 183 Q180 196 223 183" />
          <path d="M151 604 L142 628 L169 632 L180 608 L191 632 L218 628 L209 604" />
          <path d="M180 112 L180 420 M148 145 Q180 160 212 145 M151 356 Q180 370 209 356" opacity=".65" />
          <path d="M157 132 Q180 144 203 132 M158 164 Q180 178 202 164 M158 198 Q180 212 202 198 M160 232 Q180 244 200 232 M157 270 Q180 282 203 270 M153 312 Q180 325 207 312 M150 350 Q180 364 210 350" opacity=".45" />
          <path d="M160 64 Q180 74 200 64 M180 15 L180 109 M145 62 L215 62" opacity=".4" />
          <path d="M144 148 L115 224 L104 268 M216 148 L245 224 L256 268 M150 420 L130 510 L146 608 M210 420 L230 510 L214 608" opacity=".55" />
        </g>
        <g fill="#8df3ff">
          <circle cx="180" cy="62" r="3" /><circle cx="180" cy="145" r="3" />
          <circle cx="180" cy="292" r="3" /><circle cx="180" cy="420" r="3" />
          <circle cx="143" cy="420" r="2.5" /><circle cx="217" cy="420" r="2.5" />
        </g>
      </svg>
      <div className="holo-label label-top"><span className="pulse-dot" /> BIO-SCAN / LIVE</div>
      <div className="holo-label label-left"><i /> SISTEMAS<br /><b>08</b></div>
      <div className="holo-label label-right"><i /> ATLAS 3D<br /><b>READY</b></div>
      <div className="holo-coordinate">MEDVERSE // HUMAN INTERFACE</div>
    </div>
  );
}

function App() {
  const [activeSection, setActiveSection] = useState("home");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<ModuleItem | null>(null);
  const [notice, setNotice] = useState("");
  const [scrolled, setScrolled] = useState(false);

  const filteredModules = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return modules;
    return modules.filter((item) =>
      [item.title, item.subtitle, item.description, ...item.tags]
        .join(" ").toLocaleLowerCase("pt-BR").includes(normalized),
    );
  }, [query]);

  useEffect(() => {
    const sections = ["home", "universe", "modules", "vision"];
    const observers: IntersectionObserver[] = [];
    sections.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { rootMargin: "-38% 0px -48% 0px", threshold: 0 },
      );
      observer.observe(element);
      observers.push(observer);
    });
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observers.forEach((observer) => observer.disconnect());
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }),
      { threshold: 0.12, rootMargin: "0px 0px -5% 0px" },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [query]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const goTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenuOpen(false);
  };

  const openModule = (item: ModuleItem) => {
    if (item.action === "atlas") {
      window.open("https://atlas.taim.best", "_blank", "noopener,noreferrer");
      setNotice("Human Atlas aberto em uma nova aba. A integração nativa virá em uma próxima etapa.");
      return;
    }
    setSelectedModule(item);
  };

  return (
    <div className="app-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <div className="grid-overlay" />
      <header className={`topbar ${scrolled ? "topbar-scrolled" : ""}`}>
        <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); goTo("home"); }}>
          <span className="brand-mark"><Dna size={21} strokeWidth={1.8} /></span>
          <span className="brand-name">MED<span>VERSE</span><small>MEDICAL EXPLORATION UNIVERSE</small></span>
        </a>
        <nav className={`main-nav ${mobileMenuOpen ? "nav-open" : ""}`} aria-label="Navegação principal">
          {[
            ["home", "Início"], ["universe", "O universo"], ["modules", "Ambientes"], ["vision", "Nossa visão"],
          ].map(([id, label]) => (
            <button key={id} className={activeSection === id ? "nav-link active" : "nav-link"} onClick={() => goTo(id)}>{label}</button>
          ))}
        </nav>
        <div className="top-actions">
          <button className="icon-button search-trigger" aria-label="Pesquisar ambientes" onClick={() => setSearchOpen((value) => !value)}><Search size={18} /></button>
          <button className="access-button" onClick={() => goTo("modules")}>Explorar plataforma <ArrowUpRight size={15} /></button>
          <button className="icon-button mobile-trigger" aria-label="Abrir menu" onClick={() => setMobileMenuOpen((value) => !value)}>{mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </header>

      {searchOpen && (
        <div className="search-panel">
          <Search size={18} />
          <input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); goTo("modules"); }} placeholder="Buscar anatomia, radiologia, cursos..." />
          <kbd>ESC</kbd>
          <button className="icon-button" aria-label="Fechar pesquisa" onClick={() => { setSearchOpen(false); setQuery(""); }}><X size={17} /></button>
        </div>
      )}

      <main>
        <section id="home" className="hero-section page-section">
          <div className="hero-copy" data-reveal>
            <div className="eyebrow"><span className="eyebrow-line" /> UM NOVO UNIVERSO DO CONHECIMENTO MÉDICO</div>
            <h1>O corpo humano.<br /><em>Sem limites</em><span className="title-period">.</span></h1>
            <p className="hero-description">Explore a medicina de um jeito novo. Entre em ambientes interativos, descubra estruturas em 3D e transforme conhecimento em experiência.</p>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => goTo("modules")}>ENTRAR NO UNIVERSO <ArrowRight size={17} /></button>
              <button className="text-button" onClick={() => goTo("universe")}><span className="play-icon">↘</span> Descobrir o MEDVERSE</button>
            </div>
            <div className="hero-meta">
              <div><span className="meta-number">08</span><span className="meta-label">AMBIENTES PLANEJADOS</span></div>
              <div className="meta-divider" />
              <div><span className="meta-number">3D</span><span className="meta-label">EXPLORAÇÃO INTERATIVA</span></div>
              <div className="meta-divider" />
              <div><span className="meta-number">∞</span><span className="meta-label">POSSIBILIDADES DE APRENDER</span></div>
            </div>
          </div>
          <div className="hero-visual" data-reveal>
            <HumanHologram />
            <div className="visual-caption"><span>FIG. 001</span><span>HUMAN DIGITAL INTERFACE</span><span>01 / 08</span></div>
          </div>
          <div className="scroll-cue" onClick={() => goTo("universe")} role="button" tabIndex={0} onKeyDown={(event) => event.key === "Enter" && goTo("universe")}><span>DESLIZE PARA EXPLORAR</span><ArrowDown size={15} /></div>
          <div className="hero-index">01 <span>/</span> 04</div>
        </section>

        <section id="universe" className="universe-section page-section">
          <div className="section-intro" data-reveal>
            <div className="eyebrow"><span className="eyebrow-line" /> MAIS DO QUE CONTEÚDO. UMA EXPERIÊNCIA.</div>
            <h2>Conhecimento que<br /><em>ganha movimento.</em></h2>
          </div>
          <div className="universe-grid">
            <div className="universe-card universe-card-main" data-reveal>
              <div className="card-orbit"><Atom size={26} /></div>
              <span className="card-kicker">UMA PLATAFORMA VIVA</span>
              <h3>Aprender é<br />explorar.</h3>
              <p>O MEDVERSE conecta anatomia, imagens médicas, ciência e aprendizagem em ambientes digitais que respondem às suas escolhas.</p>
              <button className="inline-link" onClick={() => goTo("modules")}>Conhecer os ambientes <ArrowRight size={16} /></button>
              <div className="decorative-rings"><span /><span /><span /></div>
            </div>
            <div className="universe-card feature-card" data-reveal>
              <div className="feature-icon"><Layers3 size={22} /></div>
              <span className="card-kicker">NAVEGAÇÃO IMERSIVA</span>
              <h3>Entre em cada<br />ambiente.</h3>
              <p>Transições laterais, painéis dinâmicos e interações que acompanham sua jornada.</p>
              <div className="mini-interface"><span /><span /><span /><b>MEDVERSE / UI</b></div>
            </div>
            <div className="universe-card feature-card feature-card-alt" data-reveal>
              <div className="feature-icon"><Sparkles size={22} /></div>
              <span className="card-kicker">TECNOLOGIA COM PROPÓSITO</span>
              <h3>Interação de<br />verdade.</h3>
              <p>Ferramentas, visualizadores, busca e progresso: cada recurso terá uma função clara.</p>
              <div className="signal-bars"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
            </div>
          </div>
        </section>

        <section id="modules" className="modules-section page-section">
          <div className="modules-heading" data-reveal>
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> CENTRAL DE EXPLORAÇÃO</div>
              <h2>Escolha seu<br /><em>próximo destino.</em></h2>
            </div>
            <div className="modules-side-note"><span className="live-indicator" /> PLATAFORMA EM CONSTRUÇÃO<br /><small>Novos ambientes serão ativados por etapas.</small></div>
          </div>
          <div className="module-toolbar">
            <div className="module-count"><span>{String(filteredModules.length).padStart(2, "0")}</span> AMBIENTES ENCONTRADOS</div>
            <label className="module-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filtrar ambientes..." /><kbd>⌘ K</kbd></label>
          </div>
          {filteredModules.length ? (
            <div className="module-grid">
              {filteredModules.map((item) => {
                const Icon = item.icon;
                return (
                  <article className="module-card" key={item.id} data-reveal>
                    <div className="module-card-top"><span className="module-number">{item.number} / 08</span><span className={`module-status status-${item.status}`}><i />{statusLabel[item.status]}</span></div>
                    <div className="module-icon"><Icon size={23} strokeWidth={1.6} /></div>
                    <h3>{item.title}</h3>
                    <h4>{item.subtitle}</h4>
                    <p>{item.description}</p>
                    <div className="tag-row">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                    <button className="module-open" onClick={() => openModule(item)}>{item.action === "atlas" ? "ABRIR HUMAN ATLAS" : "ACESSAR AMBIENTE"} <ArrowUpRight size={16} /></button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state"><CircleHelp size={24} /><h3>Nenhum ambiente encontrado</h3><p>Tente outro termo de busca.</p><button className="text-button" onClick={() => setQuery("")}>Limpar pesquisa</button></div>
          )}
        </section>

        <section id="vision" className="vision-section page-section">
          <div className="vision-panel" data-reveal>
            <div className="vision-copy">
              <div className="eyebrow"><span className="eyebrow-line" /> O FUTURO É INTERATIVO</div>
              <h2>Ciência em<br /><em>uma nova dimensão.</em></h2>
              <p>Estamos construindo uma plataforma de aprendizagem e exploração médica. Cada ambiente será desenvolvido com atenção à precisão, à origem dos conteúdos, à acessibilidade e ao desempenho.</p>
              <button className="primary-button" onClick={() => goTo("modules")}>EXPLORAR AMBIENTES <ArrowRight size={17} /></button>
            </div>
            <div className="vision-visual">
              <div className="vision-core"><Dna size={58} strokeWidth={1} /></div>
              <div className="vision-ring ring-a" /><div className="vision-ring ring-b" /><div className="vision-ring ring-c" />
              <span className="vision-point point-a">ANATOMIA</span><span className="vision-point point-b">EVIDÊNCIA</span><span className="vision-point point-c">APRENDIZAGEM</span>
            </div>
          </div>
          <div className="footer-strip"><span>MEDVERSE © 2026</span><span>BUILT TO EXPLORE THE HUMAN BODY</span><span>FOUNDATION / 001</span></div>
        </section>
      </main>

      <aside className="side-progress" aria-label="Progresso da página">
        {["home", "universe", "modules", "vision"].map((id, index) => <button key={id} className={activeSection === id ? "progress-dot active" : "progress-dot"} onClick={() => goTo(id)} aria-label={`Ir para seção ${index + 1}`}><span>{String(index + 1).padStart(2, "0")}</span></button>)}
      </aside>

      {selectedModule && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedModule(null)}>
          <section className="module-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <button className="modal-close icon-button" aria-label="Fechar" onClick={() => setSelectedModule(null)}><X size={19} /></button>
            <div className="eyebrow"><span className="eyebrow-line" /> AMBIENTE {selectedModule.number} / MEDVERSE</div>
            <div className="modal-icon">{(() => { const Icon = selectedModule.icon; return <Icon size={27} />; })()}</div>
            <span className={`module-status status-${selectedModule.status}`}><i />{statusLabel[selectedModule.status]}</span>
            <h2 id="modal-title">{selectedModule.title}</h2>
            <h3>{selectedModule.subtitle}</h3>
            <p>{selectedModule.description}</p>
            <div className="modal-note"><ShieldCheck size={17} /><span>Este ambiente será liberado após implementação e testes. Nenhuma função clínica será apresentada como ferramenta de diagnóstico.</span></div>
            <button className="primary-button" onClick={() => { setSelectedModule(null); setNotice(`${selectedModule.title}: ambiente registrado no roteiro de desenvolvimento.`); }}>ENTENDI <Check size={16} /></button>
          </section>
        </div>
      )}

      {notice && <div className="toast"><Check size={16} />{notice}</div>}
      <div className="system-status"><span className="live-indicator" /> SYSTEM ONLINE <span className="status-divider">/</span> FOUNDATION 001</div>
    </div>
  );
}

export default App;
