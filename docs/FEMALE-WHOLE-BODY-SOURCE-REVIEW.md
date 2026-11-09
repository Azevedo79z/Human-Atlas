# Revisão de fontes para completar a anatomia feminina

**Projeto:** Human Atlas / Central Forense  
**Branch:** `central-forense/preflight-cartilagens-ligamentos-femininos`  
**Decisão:** não trocar fidelidade anatômica por volume de malhas. Toda estrutura complementar precisa declarar sexo/espécime de origem, licença e método de alinhamento.

## Estado confirmado do atlas atual

A referência feminina HRA v1.10 tem cobertura de corpo inteiro para superfície e órgãos selecionados, mas não oferece um sistema musculoesquelético completo. O manifesto atual acrescenta ossos complementares da referência BodyParts3D masculina e 76 músculos de membro inferior de uma segunda referência feminina, mantendo cada origem identificada. A camada conjuntiva já contém 76 estruturas, incluindo discos intervertebrais, núcleo pulposo, ligamentos do joelho, meniscos, cartilagens e enteses.

O arquivo `public/ATTRIBUTION.md` registra explicitamente que as cartilagens e os ligamentos da referência doadora da University of Denver não são importados: os ossos dos membros inferiores e os ligamentos do joelho já estão modelados pela referência feminina principal. Portanto, não adicionar duplicatas apenas para aumentar a contagem.

## Candidatos avaliados

### 1. Female Atlas — 3.004 malhas

- Repositório: https://github.com/HiMahendraBeniwal/female-atlas
- README informa 343 estruturas ósseas, 416 musculares e 434 nervosas, além de 16 sistemas.
- O próprio `public/ATTRIBUTION.md` do projeto explica que os órgãos reprodutivos e viscerais vêm do HRA feminino v1.5, mas o esqueleto completo, os 416 músculos e a vasculatura vêm do BodyParts3D.
- O script `scripts/build-female-composite.mjs` confirma que as malhas BodyParts3D são escaladas e transformadas por fatores globais e ajustes morfológicos manuais.

**Veredito:** não importar essas malhas como se fossem músculos ou ossos de uma mulher escaneada. O projeto pode ser consultado como referência de interface ou como composição didática separada, desde que a origem BodyParts3D masculina e as transformações fiquem explícitas. Não substituir a referência feminina atual por esse conjunto sem validação anatômica independente.

### 2. Open3DModel — membro superior

- Página de referência: https://anatomytool.org/open3dmodel
- Atlas regional: https://ana3d.app/en/atlas/o3d-upper-limb/
- Inclui 707 estruturas do membro superior direito: ossos, cartilagens, cápsulas, ligamentos, músculos, tendões, fáscias, retináculos, artérias, veias, plexo braquial e nervos.
- A página do atlas identifica o modelo como masculino e a licença como CC BY-SA 4.0.

**Veredito:** fonte anatômica regional rica para estudo comparativo, mas não é uma referência feminina. A licença ShareAlike exige que adaptações e redistribuições mantenham CC BY-SA 4.0; revisar compatibilidade com o projeto antes de qualquer incorporação. Não apresentar como anatomia feminina.

### 3. Pennsieve — scaffold humano de corpo inteiro

- Dataset: https://discover.pennsieve.io/datasets/307
- DOI: https://doi.org/10.26275/BBVG-GJ86
- Licença declarada: CC BY 4.0.
- Contém scaffold genérico com órgãos, musculoesquelético, vasculatura e linhas centrais nervosas.
- A própria descrição diz que o scaffold não é específico de um sujeito; os marcos nervosos foram posicionados por estimativa fundamentada na literatura.

**Veredito:** possível referência de pesquisa para trajetos nervosos, mas não usar como malhas anatômicas precisas ou como corpo feminino individual sem validação. A natureza genérica e os marcos nervosos estimados não atendem, por si só, ao critério de clique anatômico rigoroso.

### 4. Visible Human Female — University of Denver

- Página: https://digitalcommons.du.edu/visiblehuman/1/
- DOI: https://doi.org/10.56902/COB.vh.2022.1
- Licença: CC BY 4.0.
- O conjunto fornece músculos, ossos, cartilagens e ligamentos segmentados da pelve ao tornozelo.

**Veredito:** manter os 76 músculos de membro inferior já importados e documentados. Não reimportar ossos, cartilagens ou ligamentos enquanto a referência principal já oferecer essas estruturas sem lacuna demonstrada.

## Plano técnico recomendado

1. **Concluir informação e localização das estruturas já presentes:** PT-BR, lateralidade, região, função e explicação específica no inspetor.
2. **Nervos periféricos:** procurar malhas com origem, licença e geometria verificáveis. Um scaffold genérico pode servir como referência, mas não como substituto de uma segmentação anatômica.
3. **Músculos de tronco e membro superior:** priorizar segmentação feminina de fonte rastreável. Se a única fonte viável for masculina, oferecer como camada comparativa separada e opt-in, nunca rotular como tecido feminino.
4. **Tendões e fáscias:** aproveitar somente malhas identificadas individualmente e alinhadas a marcos anatômicos. Open3DModel é candidato regional, sujeito à decisão de licença e à rotulagem masculina.
5. **Esqueleto feminino:** a coleção BoneHub / Visible Human Female pode ser avaliada para as regiões que realmente faltam; manter a referência masculina complementar até a nova malha feminina passar por registro e comparação.

## Critérios de aceite

- Fonte e licença identificadas para cada grupo de malhas.
- Espécime/sexo de origem declarado no inspetor.
- Camadas doadoras separadas da referência feminina principal.
- Nenhuma malha espelhada ou escalada apresentada como anatomia feminina nativa.
- Registro espacial medido por marcos anatômicos, não apenas por escala global.
- Nenhuma estrutura duplicada, deslocada ou sem nome.
- Build, validação do manifesto e homologação visual antes de qualquer merge ou deploy.

**Conclusão:** há conjuntos grandes com milhares de estruturas, mas os mais completos encontrados usam musculatura e esqueleto masculinos adaptados à silhueta feminina ou são scaffolds genéricos. Para a Central Forense, a origem anatômica explícita é mais importante que aumentar a contagem de peças.
