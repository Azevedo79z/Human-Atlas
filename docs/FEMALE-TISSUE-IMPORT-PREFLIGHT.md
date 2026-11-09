# Pré-validação de cartilagens e ligamentos — referência feminina

Esta etapa é deliberadamente somente leitura. Ela inventaria os tecidos da referência feminina usada para os músculos de membro inferior, mas **não autoriza importá-los automaticamente**. A atribuição anatômica já presente no projeto registra que os ossos, cartilagens e ligamentos dessa fonte doadora não são usados porque a referência feminina principal já modela os ossos dos membros inferiores e os ligamentos do joelho. A prioridade é preservar essa decisão e evitar duplicatas.

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

## Decisão de escopo

O arquivo `public/ATTRIBUTION.md` da própria branch declara expressamente que as geometrias de ossos, cartilagens e ligamentos da referência doadora não são utilizadas: a referência feminina principal já contém os ossos dos membros inferiores e os ligamentos do joelho. Portanto, não vamos importar essas estruturas apenas porque existem no pacote. A eventual reconsideração exige demonstrar uma lacuna anatômica real, ausência de duplicata e ganho visual/educacional mensurável.

## Critérios para qualquer reconsideração futura

1. Conferir todos os arquivos e pares esquerda/direita.
2. Revisar possíveis colisões com estruturas já existentes; comparar anatomia e geometria, não apenas texto.
3. Demonstrar que a estrutura não está representada na referência principal.
4. Se houver uma lacuna real, ajustar a malha ao corpo de referência usando marcos ósseos compartilhados e registrar erro de alinhamento por região.
5. Manter estruturas da segunda referência feminina identificadas separadamente da referência HRA principal, com atribuição CC BY 4.0.
6. Manter a branch de homologação isolada; nenhum merge ou deploy de produção nesta fase.

**Estado:** pré-validação read-only adicionada como ferramenta de auditoria; nenhuma malha foi adicionada ao atlas. O projeto agora prioriza a tradução PT-BR e as fichas das estruturas conjuntivas que já existem.
