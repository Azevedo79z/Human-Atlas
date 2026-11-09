# Plano de registro de superfície — pelve feminina

**Estado: planejamento técnico; nenhuma transformação ou importação autorizada.**

## Objetivo

Comparar as superfícies das malhas de origem `HIP_LEFT.stl`, `HIP_RIGHT.stl` e `SACRUM.stl` com as estruturas correspondentes do Human Reference Atlas feminino. A comparação por centros de caixas delimitadoras é apenas uma triagem e não pode aprovar o encaixe.

## Evidência disponível no preflight de 2026-11-09

- `HIP_LEFT.stl`: 284.940 triângulos; dimensões de caixa delimitadora 149,21 × 154,65 × 210,83 unidades de origem.
- `HIP_RIGHT.stl`: 281.504 triângulos; dimensões 147,52 × 151,87 × 213,31 unidades.
- `SACRUM.stl`: 191.444 triângulos; dimensões 120,35 × 99,36 × 124,07 unidades.
- As três malhas passaram na inspeção estrutural e não apresentaram faces degeneradas.
- O STL não contém metadados de unidade. A hipótese de milímetros permanece provisória.
- A medição de registro usa centros das caixas delimitadoras, não vértices amostrados nem distâncias entre superfícies.
- O alvo `HIP_LEFT`/`HIP_RIGHT` no manifesto agrega várias partes do Atlas (ílio, púbis e ísquio do respectivo lado); não é uma malha única de osso do quadril.
- A pelve foi marcada como candidata para revisão, não como aprovada.

## Pré-condições para executar ICP

1. Obter as geometrias trianguladas reais do alvo do Atlas e confirmar os offsets/índices dos chunks usados pelo manifesto feminino. Bounds isolados não são suficientes para ICP.
2. Confirmar a unidade física por documentação da fonte e por dimensões anatômicas independentes. Não inferir unidade apenas porque uma escala parece plausível.
3. Construir três conjuntos de superfície separados: quadril esquerdo (ílio + ísquio + púbis), quadril direito (ílio + ísquio + púbis) e sacro. Preservar a identidade de cada osso e seus limites.
4. Aplicar somente a rotação de eixos candidata documentada no relatório como hipótese inicial; validar orientação e lateralidade com marcos independentes antes de qualquer ajuste.
5. Amostrar pontos de superfície de forma determinística e ponderada por área; não usar somente vértices originais, pois a densidade de tesselação pode enviesar o ajuste.
6. Executar ICP robusto em duas direções (origem → Atlas e Atlas → origem), com correspondências rejeitadas por distância, normais incompatíveis e outliers. Registrar distância média, RMS, percentis 50/95/99, cobertura de superfície e erro máximo.
7. Comparar ajuste rígido (escala fixa) com escala uniforme limitada e explicitamente reportada. Não permitir escala não uniforme, deformação, espelhamento ou ajuste independente que rompa as articulações.
8. Validar separadamente as interfaces sacroilíacas, a continuidade com a coluna e a relação dos acetábulos com as cabeças femorais. A cobertura incompleta/truncada da fonte deve ser registrada, não corrigida artificialmente.
9. Produzir visualizações de sobreposição e mapas de distância para inspeção humana. Sem visualização e revisão anatômica, o resultado permanece candidato.
10. Executar teste de colisão/auto-interseção e regressão de lateralidade antes de considerar qualquer integração.

## Saídas obrigatórias

- Versões/hash dos arquivos de origem e dos chunks do Atlas usados.
- Unidade assumida e evidência que a sustenta.
- Transformação inicial e transformação candidata, em matrizes completas.
- Parâmetros ICP, amostragem determinística e critérios de rejeição.
- Métricas bidirecionais e cobertura por estrutura.
- Relatório de articulações e colisões.
- Imagens de sobreposição anterior, posterior, lateral e oblíqua.
- Resultado explícito: `REVIEW_REQUIRED`, `REJECTED` ou `CANDIDATE_FOR_HUMAN_REVIEW`. Este documento não define aprovação automática.

## Segurança e escopo

- Somente branch de homologação.
- Não editar `public/models/atlas-female.json`, chunks ativos ou assets de produção.
- Não substituir placeholders nem importar STL nesta etapa.
- Não publicar nem fazer merge.
- Se as superfícies reais do Atlas não puderem ser recuperadas com integridade verificável, interromper a etapa e registrar a dependência; não substituir superfícies por caixas delimitadoras.

## Próxima ação técnica

Implementar um executor de registro de superfície somente depois de confirmar como reconstruir, sem ambiguidade, as malhas-alvo a partir dos chunks e offsets do manifesto. O primeiro ensaio deve ser reproduzível e limitado à pelve, sem escrita nos assets do Atlas.
