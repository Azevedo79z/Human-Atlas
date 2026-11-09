# Pré-validação — esqueleto feminino Visible Human

## Fonte escolhida
- Dataset: [BoneHub — Visible Human Full-Skeleton 3D Bone Models](https://huggingface.co/datasets/BoneHub/visible-human-3d-models)
- Pasta feminina: `visible_human_3d_models/CT/Mesh/02_Female`
- Inventário declarado: 143 rótulos ósseos femininos em STL.
- Licença: CC BY 4.0.
- DOI: https://doi.org/10.57967/hf/10464
- Artigo de origem: Andreassen et al. (2023), https://doi.org/10.1038/s41597-022-01905-2

## Pré-validação criada
Depois de extrair a pasta feminina, executar:
```bash
node scripts/audit-visible-human-female-bones.mjs PATH_TO_02_Female
```
A ferramenta exige uma pasta chamada exatamente `02_Female`, inventaria os STL por região, verifica a contagem de 143 arquivos, procura nomes duplicados e registra quantos elementos ósseos complementares já existem no manifesto feminino. É somente leitura.

## Limitações declaradas pela fonte
- Cotovelo incompleto; extremidade distal do úmero e porções proximais do rádio/ulna truncadas.
- Falanges agrupadas por dedo.
- Crânio e maxila combinados; mandíbula separada.
- Sacro inclui cóccix; esterno não é dividido em manúbrio/corpo/processo xifoide.
- Hioide, a maioria dos sesamoides e cartilagens costais ausentes.
- Mãos e pés armazenados em pastas separadas dos demais ossos dos membros.

## Próxima etapa — não executada ainda
A contagem correta não autoriza importação automática. Precisamos inspecionar unidades e eixos dos STL, encontrar marcos anatômicos correspondentes, medir o registro por região e validar as articulações no visualizador. A geometria óssea não pode ser deformada por escala não uniforme. A camada atual deve continuar disponível para rollback.

**Estado:** ferramenta de pré-validação criada. Nenhuma malha foi importada, removida ou alterada; produção permanece intocada.
