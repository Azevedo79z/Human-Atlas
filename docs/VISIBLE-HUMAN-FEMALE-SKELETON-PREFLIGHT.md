# Pré-validação — esqueleto feminino Visible Human

## Fonte escolhida
- Dataset: [BoneHub — Visible Human Full-Skeleton 3D Bone Models](https://huggingface.co/datasets/BoneHub/visible-human-3d-models)
- Pasta feminina: `visible_human_3d_models/CT/Mesh/02_Female`
- Inventário declarado: 143 rótulos ósseos femininos em STL.
- Licença: CC BY 4.0.
- DOI: https://doi.org/10.57967/hf/10464
- Artigo de origem: Andreassen et al. (2023), https://doi.org/10.1038/s41597-022-01905-2
- Cópia de trabalho usada no preflight: [Hugging Face Storage Bucket](https://huggingface.co/buckets/Azevedo79z/visible-human-3d-models-bucket)

## Automação de pré-validação
O branch de homologação contém:
- `scripts/download-visible-human-female-bones.mjs`: baixa os 143 STL públicos do Storage Bucket, sem Hugging Face CLI, Python, token ou privilégios de administrador.
- `scripts/audit-visible-human-female-bones.mjs`: inventaria as regiões, verifica contagem e nomes duplicados e registra a cobertura atual do Atlas.
- `scripts/inspect-visible-human-female-stl.mjs`: identifica formato, triângulos, limites, dimensões e faces degeneradas.
- `scripts/measure-visible-human-female-registration.mjs`: mede o ajuste preliminar de marcos anatômicos entre a fonte e o manifesto feminino.
- `.github/workflows/visible-human-female-preflight.yml`: executa o preflight em GitHub Actions somente no branch de homologação e publica relatórios como artefato temporário.

## Resultado do preflight — 9 de novembro de 2026
- **143/143** arquivos STL encontrados; nenhum nome duplicado.
- **143/143** malhas binárias válidas.
- **6.070.400** triângulos no total.
- **0** faces degeneradas e **0** arquivos inválidos.
- Tamanho total dos arquivos: aproximadamente **304 MB**.
- Manifesto feminino atual: **1.220** partes, incluindo **65** malhas no sistema esquelético e **180** placeholders derivados do modelo masculino.

## Registro anatômico preliminar
Os STL usam um referencial de eixos diferente do manifesto HRA. A melhor rotação ortogonal testada foi:
```text
[ 1  0  0 ]
[ 0  0  1 ]
[ 0 -1  0 ]
```
A conversão provisória de coordenadas para metros produziu escala global de 1,0172, mas o ajuste global tem erro RMS de **41,4 mm** e máximo de **88,8 mm**. Portanto, **não é seguro aplicar uma transformação global única**.

Com a mesma rotação e ajustes regionais uniformes (sem escala não uniforme), os resíduos dos centros dos marcos ficaram:
| Região | RMS | Máximo |
| --- | ---: | ---: |
| Pelve | 4,6 mm | 6,4 mm |
| Coluna | 4,8 mm | 6,8 mm |
| Tórax | 11,9 mm | 15,6 mm |
| Perna esquerda | 19,2 mm | 27,8 mm |
| Perna direita | 21,3 mm | 29,4 mm |

Esses valores são uma **pré-validação por centros de caixas delimitadoras**, não uma validação de superfície, encaixe articular ou postura. Crânio, costelas, membros superiores, mãos e pés ainda precisam de validação anatômica específica.

### Unidade dos STL
STL não registra a unidade física. Os tamanhos corporais e a escala resultante são consistentes com a hipótese de milímetros, mas essa unidade permanece **provisória, não confirmada**. Não importar geometria até validar a documentação da fonte e conferir marcos/encaixes no visualizador.

## Limitações declaradas pela fonte
- Cotovelo incompleto; extremidade distal do úmero e porções proximais do rádio/ulna truncadas.
- Falanges agrupadas por dedo.
- Crânio e maxila combinados; mandíbula separada.
- Sacro inclui cóccix; esterno não é dividido em manúbrio/corpo/processo xifoide.
- Hioide, a maioria dos sesamoides e cartilagens costais ausentes.
- Mãos e pés armazenados em pastas separadas dos demais ossos dos membros.

## Mapeamento completo — 143 arquivos
O planejador read-only `scripts/plan-visible-human-female-import.mjs` relacionou os 143 STL a 223 malhas/landmarks do manifesto atual, sem arquivos sem correspondência. O workflow executou essa etapa em 9 de novembro de 2026. A relação é uma associação de referência, não uma autorização para aplicar as transformações.

| Região de planejamento | STL mapeados | RMS dos centros | Maior resíduo |
| --- | ---: | ---: | ---: |
| Pelve | 2 | 0,24 mm | 0,24 mm |
| Coluna (inclui sacro) | 26 | 3,87 mm | 8,72 mm |
| Tórax (costelas e esterno) | 25 | 14,69 mm | 33,44 mm |
| Perna esquerda | 4 | 19,17 mm | 27,81 mm |
| Perna direita | 4 | 21,32 mm | 29,41 mm |
| Braço esquerdo | 5 | 68,29 mm | 100,07 mm |
| Braço direito | 5 | 76,25 mm | 104,29 mm |
| Mão esquerda | 18 | 41,16 mm | 74,84 mm |
| Mão direita | 18 | 39,34 mm | 72,42 mm |
| Pé esquerdo | 17 | 31,07 mm | 59,54 mm |
| Pé direito | 17 | 32,58 mm | 61,22 mm |
| Crânio/maxila e mandíbula | 2 | insuficiente | insuficiente |

**Como interpretar:** os resíduos medem a distância entre centros de caixas delimitadoras após o melhor ajuste uniforme regional, não a distância entre superfícies. Braços, mãos e pés apresentam discrepâncias grandes; crânio e mandíbula têm somente um landmark cada, insuficiente para determinar uma transformação confiável. A pelve tem somente dois anchors, portanto o seu resultado também exige inspeção visual independente.

## Ampliação dos marcos de registro — etapa de homologação

O medidor de registro foi ampliado para amostrar também:
- Clavícula, úmero, rádio, escápula e ulna de cada lado.
- As 12 costelas de cada lado, além do esterno e da coluna.
- Metacarpos e falanges agrupadas dos dedos indicador, médio, anelar e mínimo.
- Ossos do tarso, metatarsos e falanges agrupadas dos cinco dedos de cada pé.
- Complexo craniano/maxilar e mandíbula como grupos separados.

Esses alvos são referências já presentes no manifesto e continuam identificados como estruturas doadoras/placeholder quando essa é sua procedência. A ampliação aumenta a cobertura dos centros de caixas delimitadoras; **não** transforma esses centros em registro de superfície, não valida articulações e não autoriza substituir as malhas. Ossos do carpo e falanges do polegar não entram nesta rodada porque a correspondência individual no manifesto não foi confirmada.

O novo relatório precisa ser produzido pelo workflow após esta alteração. Até que o artefato seja inspecionado, não há novos resíduos medidos nem aprovação de alinhamento para membros superiores, mãos, pés ou crânio.

## Bloqueio de importação
A etapa de mapeamento passou (143/143), mas o registro geométrico ainda **não está aprovado para importação**. Não aplicar a transformação global ou regional atual às malhas. A próxima fase precisa de registro de superfície/ICP ou landmarks anatômicos adicionais, revisão de articulações e checagem visual em pose neutra. A transformação final deverá preservar escala uniforme por estrutura/região e passar por validação de colisões e continuidade articular.

O workflow executa o planejador como etapa obrigatória; falha de mapeamento interrompe a validação. Nenhum arquivo do Atlas ativo é modificado.

## Próxima etapa — integração ainda bloqueada
A integração deverá substituir as 65 malhas esqueléticas atuais e os 180 placeholders masculinos pelas 143 malhas femininas, preservando órgãos, tecidos e demais sistemas. Usar transformações regionais e validar articulações/pose antes de atualizar o manifesto e os chunks. A geometria óssea não pode ser deformada por escala não uniforme.

**Estado:** pré-validação automatizada concluída. Nenhuma malha foi importada, removida ou alterada; `atlas-female.json`, chunks atuais e produção permanecem intocados.

O planejador `scripts/plan-visible-human-female-import.mjs` foi alinhado ao medidor: `SKULL_CRANIAL_MAXILLA` considera apenas alvos cranianos/maxilares identificados no manifesto, e `SKULL_MANDIBLE` permanece separado. O plano e o medidor passam, assim, a usar o mesmo recorte anatômico para esses dois arquivos. Essa consistência de mapeamento não equivale a validação geométrica.


## Integridade exata do inventário de origem

O planejador agora reconstrói a lista canônica dos 143 caminhos STL esperados e compara os caminhos reais do diretório com essa lista antes de mapear qualquer estrutura. A validação interrompe a execução se houver arquivo esperado ausente, arquivo STL inesperado ou divergência na quantidade total. Isso evita que uma pasta com 143 arquivos, mas contendo uma peça errada no lugar de outra, passe por uma verificação baseada apenas em contagem.

A checagem valida nomes e caminhos, não o conteúdo anatômico dos arquivos. A integridade geométrica continua dependendo da inspeção STL, dos relatórios de malha e da validação de registro descrita acima.


## Fonte única do inventário de origem

A lista canônica dos 143 arquivos está centralizada em `scripts/lib/visible-human-female-inventory.mjs`. O downloader usa essa lista para obter os STL e o planejador importa a mesma lista para conferir a pasta extraída antes do mapeamento. O workflow também observa alterações nesse módulo. Assim, a definição dos caminhos não precisa ser mantida em dois scripts independentes.


## Testes automatizados do inventário

Antes de baixar os STL, o workflow verifica a sintaxe dos módulos Node.js e executa `scripts/test-visible-human-female-inventory.mjs`. O teste usa apenas APIs nativas do Node.js e confere os 143 caminhos únicos, a contagem esperada por região, a extensão STL e a consistência da chave canônica. Não exige pacote adicional, token ou serviço pago. Essa etapa testa a lista centralizada; não substitui o download nem a inspeção geométrica dos arquivos.


## Regressão do leitor STL

O leitor geométrico rejeita agora STL binário com zero triângulos, STL ASCII com quantidade de vértices que não fecha grupos de três, coordenadas não finitas e caixas delimitadoras com dimensão nula ou inválida. O workflow executa também um teste de regressão com uma malha binária válida e dois arquivos inválidos sintéticos, antes de baixar os 143 arquivos de origem. Esses testes sintéticos verificam o comportamento do leitor; não certificam as malhas reais do repositório de origem.


## Conferência exata do inventário durante auditoria e geometria

A auditoria de cobertura e o inspetor geométrico agora comparam os caminhos STL encontrados com a lista canônica compartilhada de 143 entradas. Os relatórios identificam caminhos esperados ausentes e caminhos STL inesperados; a inspeção geométrica também falha quando o conjunto não corresponde exatamente ao inventário. No workflow, as etapas de auditoria e inspeção deixaram de usar `continue-on-error`: inventário divergente, arquivo inválido ou faceta degenerada interrompem o preflight antes do planejamento final.

O teste de regressão do inspetor cria um conjunto sintético completo de 143 malhas mínimas e verifica também cenários de arquivo ausente, arquivo extra, STL binário vazio e STL ASCII incompleto. É um teste do código com fixtures artificiais, não uma medição dos modelos anatômicos originais.


## Diagnóstico regional e comparação bilateral — nova etapa de homologação

O medidor agora informa, para cada região, a quantidade de marcos disponíveis, quantos centros-alvo distintos existem, a extensão espacial dos centros de origem e do Atlas e se há pelo menos três marcos/centros distintos para uma avaliação candidata. Essa indicação é apenas uma triagem de suficiência: não comprova independência geométrica, registro de superfície ou encaixe articular. Regiões abaixo desse mínimo são marcadas como insuficientes, em vez de receberem uma aparência enganosa de ajuste aprovado.

O relatório também compara distâncias entre centros esquerdo/direito para pares de ossos presentes nos dois lados (pelve, membros, metacarpos, tarso e metatarsos). A diferença é uma pista para assimetrias de escala ou posicionamento, não um teste clínico de simetria nem uma regra para espelhar anatomia. A anatomia real pode ter assimetrias.

Esses diagnósticos só terão valores reais após uma nova execução do workflow com os 143 STL. Permanecem bloqueados a importação, a aplicação de transformações e a substituição de malhas do Atlas.


## Auditoria de cobertura das articulações — 9 de novembro de 2026

Foi acrescentado `scripts/audit-visible-human-female-joint-coverage.mjs`, uma auditoria somente de leitura que cruza os nomes do manifesto feminino com os componentes esperados de seis articulações. O relatório distingue estruturas nomeadas de estruturas que não foram encontradas pelo nome. Uma malha de osso inteiro não é contabilizada como identificação individual da cabeça, superfície articular, ligamento, tendão ou cartilagem.

### Cobertura identificada no manifesto atual

| Articulação | Estruturas nomeadas encontradas | Lacunas que exigem atenção |
| --- | --- | --- |
| Quadril | Regiões do ílio, púbis e ísquio; fêmur | Acetábulo e cabeça femoral não estão identificados separadamente; lábio e ligamentos do quadril não foram encontrados pelo nome |
| Joelho | Fêmur, tíbia, fíbula, patela, meniscos, ligamentos cruzados e colaterais, cartilagem articular | A presença nominal não comprova superfícies, orientação ou encaixe |
| Tornozelo | Tíbia, fíbula, tálus e calcâneo | Maléolos individualizados, ligamentos do tornozelo e cartilagem articular não foram encontrados pelo nome |
| Ombro | Clavícula, escápula e úmero | Cavidade glenoidal, lábio, tendões do manguito rotador e ligamentos/cápsula não foram encontrados pelo nome |
| Cotovelo | Úmero, rádio e ulna | Marcos do olécrano/incisura troclear, ligamentos e cartilagem articular não foram encontrados pelo nome |
| Punho | Rádio, ulna e ossos do carpo | Complexo fibrocartilaginoso triangular, ligamentos radiocárpicos e cartilagem não foram encontrados pelo nome |

**Importante:** este quadro é uma leitura nominal do manifesto, não uma avaliação visual ou biomecânica. Algumas estruturas são regiões de ossos maiores e podem ser representadas por seleção de superfície numa etapa futura; não devem ser inventadas como malhas independentes sem fonte anatômica confiável.

### Automação

O workflow agora verifica a sintaxe do novo auditor, executa a análise do manifesto e inclui `visible-human-female-joint-coverage.json` no artefato de pré-validação. O relatório real só será produzido quando o workflow executar. Nenhum STL ou chunk é modificado por essa auditoria.


## Auditoria de músculos, tendões e ligamentos — 9 de novembro de 2026

Foi acrescentado `scripts/audit-visible-human-female-soft-tissue-coverage.mjs`. A ferramenta faz inventário nominal, somente de leitura, dos sistemas `muscular`, `donor-muscle` e `connective`, agrupando músculos por regiões anatômicas e listando tendões e ligamentos explicitamente nomeados.

### Leitura inicial do manifesto

O manifesto possui 16 entradas no sistema `muscular`, 76 em `donor-muscle` e 76 em `connective`. As 76 entradas `donor-muscle` concentram-se em quadril, coxa e perna, bilateralmente; as entradas `muscular` incluem músculos extraoculares, reto femoral e tendão do quadríceps. As entradas `connective` incluem discos intervertebrais e estruturas do joelho.

Isso revela uma cobertura nominal desigual: não há no inventário muscular atual um conjunto equivalente de músculos do tronco, cintura escapular, braço, antebraço e mão. A auditoria também vai discriminar tendões e ligamentos encontrados por nome, sem presumir que toda estrutura de tecido conjuntivo seja um tendão ou ligamento.

### Limites e segurança

A presença no manifesto não comprova que a malha exista, esteja carregada, tenha geometria válida ou seja selecionável na interface. A ausência de um nome não prova ausência anatômica: uma estrutura pode estar agrupada numa malha maior ou ter outro rótulo. O relatório não cria anatomia nem altera geometrias.

O workflow verifica a sintaxe do auditor, executa a análise e anexa `visible-human-female-soft-tissue-coverage.json` ao artefato de pré-validação. Os números detalhados do relatório dependem da execução real do workflow.
