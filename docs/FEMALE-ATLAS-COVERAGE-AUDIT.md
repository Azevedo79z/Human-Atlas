# Auditoria de cobertura — anatomia feminina

**Escopo:** Human Atlas / Central Forense  
**Base de trabalho:** `central-forense/pt-br-anatomia-feminina`  
**Regra de segurança:** esta auditoria não altera `main`, não faz merge e não publica em produção.

## 1. Inventário confirmado no manifesto

Leitura de `public/models/atlas-female.json` na branch de homologação:

| Camada | Malhas | Observação |
| --- | ---: | --- |
| Referência feminina nativa — total | 964 | Parte do conjunto Human Reference Atlas |
| Complementos `borrowed` | 180 | Estruturas complementares derivadas da referência masculina; não devem ser apresentadas como anatomia nativa feminina |
| Músculos `donor-muscle` | 76 | Músculos de membros inferiores provenientes de uma segunda referência feminina |
| Esqueleto nativo (`skeletal`) | 65 | Cobertura parcial da fonte feminina |
| Músculos nativos (`muscular`) | 16 | Predominantemente músculos extraoculares, mais estruturas do quadríceps/tendão |
| Tecido conjuntivo (`connective`) | 76 | Inclui discos, cartilagens e ligamentos; não equivale a uma camada completa de tendões e ligamentos |

O manifesto totaliza **1.220 malhas e 1.439 conceitos nomeados**. Os 180 itens `borrowed` são complementos provenientes do modelo masculino e incluem estruturas cartilaginosas; por isso, a contagem não deve ser descrita simplesmente como “180 ossos”.

## 2. Lacunas confirmadas

1. **Esqueleto:** a referência feminina nativa não cobre todo o crânio, caixa torácica, cintura escapular, braços, mãos, tornozelos e pés. A camada complementar atual resolve parte da visualização, mas usa estruturas de outra referência corporal.
2. **Musculatura:** os 76 músculos doadores cobrem quadril e membros inferiores. A fonte feminina nativa tem apenas 16 estruturas na camada muscular, sem musculatura completa de tronco e membros superiores.
3. **Ligamentos e cartilagens:** existem estruturas na camada conjuntiva, mas a cobertura é parcial e concentrada em discos e joelhos.
4. **Tendões:** a presença de tendões é pontual; não há um inventário completo por região.
5. **Nervos periféricos:** as 33 malhas do sistema nervoso representam principalmente segmentos da medula, dura-máter e nervos ópticos; não constituem uma rede periférica completa.

## 3. Fontes abertas avaliadas

### 3.1 Esqueleto feminino — Visible Human 3D Models

O conjunto **BoneHub / visible-human-3d-models** disponibiliza malhas STL individuais de ossos do Visible Human Female, com 143 rótulos ósseos femininos. A licença declarada é **CC BY 4.0**. Algumas estruturas são agrupadas (por exemplo, crânio, esterno, sacro e falanges), portanto “143 rótulos” não significa 143 ossos anatomicamente isolados.

- Dataset: https://huggingface.co/datasets/BoneHub/visible-human-3d-models
- Citação do dataset: Alavi & Asseln (2026), DOI: https://doi.org/10.57967/hf/10464
- Trabalho de origem: Andreassen et al. (2023), DOI: https://doi.org/10.1038/s41597-022-01905-2

**Decisão técnica:** candidato prioritário para substituir, gradualmente, os complementos ósseos masculinos. Antes de integrar, filtrar somente os arquivos da referência feminina, registrar a origem por estrutura, alinhar as malhas aos marcos ósseos comuns e medir o erro de registro. Não substituir a camada atual até a comparação visual e numérica passar.

### 3.2 Músculos, cartilagens e ligamentos — Visible Human Female / University of Denver

O repositório do Center for Orthopaedic Biomechanics da University of Denver disponibiliza geometrias musculoesqueléticas da região **pelve até tornozelo**. Para cada espécime, a descrição informa 76 músculos, 28 ossos, 16 cartilagens, 8 ligamentos e 2 geometrias de gordura. O material inclui STL e máscaras de segmentação.

- Página da referência feminina: https://digitalcommons.du.edu/visiblehuman/1/
- DOI do conjunto: https://doi.org/10.56902/COB.vh.2022.1
- Artigo: https://doi.org/10.1038/s41597-022-01905-2

O importador atual `scripts/import-lower-limb.mjs` reconhece nomes de arquivos do tipo Muscle, Cartilage e Ligament, mas a lógica de geometria adicionada ao manifesto importa somente os músculos.

**Decisão técnica:** próximo incremento de baixo risco é avaliar a importação das cartilagens e dos ligamentos femininos desta mesma fonte para a camada conjuntiva, com deduplicação contra as estruturas já existentes. Não presumir que todos os 16/8 itens são novos: comparar nomes, lateralidade, região e sobreposição geométrica antes de adicionar.

### 3.3 Limite para tronco e membros superiores

A coleção musculoesquelética da University of Denver citada acima é descrita como pelve até tornozelo. Ela não fornece, nesse pacote, uma musculatura feminina segmentada completa de tronco, ombro, braço, antebraço e mão.

O Visible Human Project mantém imagens e cortes anatômicos de corpo inteiro, mas imagens-fonte não são malhas musculares prontas. Produzir estruturas adicionais exigiria segmentação, validação anatômica e registro espacial; não basta importar ou espelhar músculos masculinos.

- Visible Human Project — National Library of Medicine: https://www.nlm.nih.gov/research/visible/visible_human.html

## 4. Ordem de implementação recomendada

1. **Importar cartilagens e ligamentos da referência feminina inferior**, se a comparação confirmar que são complementos e não duplicatas.
2. **Integrar o esqueleto feminino Visible Human** como uma camada de origem explicitamente identificada; comparar com os 65 elementos nativos e os 180 complementos atuais antes de substituir qualquer geometria.
3. **Expandir tendões** somente quando houver malhas segmentadas de fonte identificável e compatível.
4. **Expandir músculos de tronco e membros superiores** somente com uma fonte feminina segmentada ou com segmentação validada; não usar anatomia muscular masculina como substituta.
5. **Expandir nervos periféricos** com fonte, licença e correspondência anatômica documentadas.
6. **Completar nomes e fichas em PT-BR** com nome anatômico, lateralidade, região, sistema, função e fonte. Traduções não verificadas devem permanecer sinalizadas para revisão.

## 5. Critérios de aceite

- Cada malha nova tem fonte, licença, espécime de referência e método de alinhamento registrados.
- Nenhuma estrutura doadora é apresentada como se pertencesse ao mesmo espécime da referência feminina nativa.
- Estruturas duplicadas são identificadas antes da importação.
- Registro validado por marcos anatômicos, com erro documentado por região.
- Clique/seleção identifica a estrutura correta; nome e lateralidade correspondem à malha.
- Camadas podem ser ligadas/desligadas sem deformar ou deslocar o corpo.
- `npm run check`, `npm run build` e `node scripts/validate-atlas.mjs atlas-female.json` passam antes da homologação visual.
- Nenhuma alteração chega a `main` ou produção sem revisão explícita.

## 6. Resultado desta etapa

A auditoria confirma que a principal lacuna não é apenas de interface: é de **cobertura e proveniência dos dados anatômicos**. Há uma fonte feminina aberta promissora para substituir os complementos ósseos e uma fonte feminina já usada para os músculos inferiores que também contém cartilagens e ligamentos ainda não aproveitados pelo importador. A expansão de músculos superiores, tronco, tendões e nervos permanece dependente de novas malhas segmentadas e verificáveis.
