# Pré-validação de cartilagens e ligamentos — referência feminina

Esta etapa é deliberadamente somente leitura. Ela prepara a importação de tecidos da mesma referência feminina usada para os músculos de membro inferior, sem modificar o manifesto nem publicar novas malhas.

## Fonte e pacote exato

- Página do conjunto: https://digitalcommons.du.edu/visiblehuman/1/
- Download direto do pacote **Final 3D STL Models** (87,8 MB): https://digitalcommons.du.edu/cgi/viewcontent.cgi?filename=3&article=1001&context=visiblehuman&type=additional
- Licença: Creative Commons Attribution 4.0 International (CC BY 4.0).
- Dataset DOI: https://doi.org/10.56902/COB.vh.2022.1
- Artigo: Andreassen et al. (2023), https://doi.org/10.1038/s41597-022-01905-2

O pacote final foi escolhido porque os autores descrevem as malhas como visualmente inspecionadas e corrigidas para evitar sobreposições entre estruturas vizinhas. A coleção cobre pelve até tornozelo; não preenche lacunas anatômicas de tronco, braços ou nervos periféricos.

## Inventário esperado

Por espécime feminino, o artigo e a página do repositório descrevem:
- 16 geometrias de cartilagem articular;
- 8 geometrias de ligamentos do joelho;
- 76 geometrias musculares;
- 28 geometrias ósseas da pelve aos pés.

As cartilagens cobrem articulações do quadril, joelho e tornozelo. Os ligamentos incluem cruzados anterior/posterior e colaterais medial/lateral, bilateralmente.

## Executar a pré-validação

Após baixar e extrair o ZIP, executar na raiz do repositório:

```bash
node scripts/audit-female-donor-tissues.mjs PATH_TO_FINAL_STL_FOLDER
```

O relatório lista arquivos reconhecidos, lateralidade, contagem por tipo e possíveis colisões nominais com estruturas já existentes na camada `connective`.

O script:
- não escreve no manifesto;
- não cria buffers binários;
- não altera geometrias;
- não decide automaticamente que uma estrutura parecida é duplicata anatômica.

Se a contagem não for exatamente 16 cartilagens e 8 ligamentos, confirmar se foi extraído o pacote **Final 3D STL Models** feminino, e não os pacotes original/smoothed ou o conjunto masculino.

## Critérios antes de importar

1. Conferir todos os arquivos e pares esquerda/direita.
2. Revisar possíveis colisões com estruturas já existentes; comparar anatomia e geometria, não apenas texto.
3. Ajustar as malhas ao corpo de referência usando marcos ósseos compartilhados e registrar erro de alinhamento por região.
4. Manter as estruturas da segunda referência feminina identificadas separadamente da referência HRA principal.
5. Só então gerar buffers, atualizar conceitos PT-BR, adicionar atribuição CC BY 4.0 e rodar validação/build.
6. Manter a branch de homologação isolada; nenhum merge ou deploy de produção nesta fase.

**Estado:** pré-validação adicionada; integração geométrica ainda não executada. Nenhuma malha foi adicionada ao atlas por esta etapa.
