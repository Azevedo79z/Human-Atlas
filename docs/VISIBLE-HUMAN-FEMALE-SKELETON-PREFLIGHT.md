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

## Próxima etapa — integração ainda bloqueada
A integração deverá substituir as 65 malhas esqueléticas atuais e os 180 placeholders masculinos pelas 143 malhas femininas, preservando órgãos, tecidos e demais sistemas. Usar transformações regionais e validar articulações/pose antes de atualizar o manifesto e os chunks. A geometria óssea não pode ser deformada por escala não uniforme.

**Estado:** pré-validação automatizada concluída. Nenhuma malha foi importada, removida ou alterada; `atlas-female.json`, chunks atuais e produção permanecem intocados.
