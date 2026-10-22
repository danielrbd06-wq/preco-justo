# Bloco 18 — Issue e Pull Request

Issue e PR criados direto pelo Claude no GitHub.

## Issue #52 — [Melhoria] Carregamento sob demanda e orçamento de tamanho do app

**Tipo:** Melhoria

### Objetivo
Fazer o app abrir mais rápido no celular. Hoje a primeira tela baixa um arquivo único de 354 KB compactados (1,2 MB sem compactar). Ele inclui a biblioteca do Excel, que só é usada quando alguém pede uma planilha. As instruções do projeto pedem *lazy loading* quando fizer sentido e um *performance budget*.

### Escopo
- [ ] Carregar a biblioteca do Excel (`xlsx`) só no clique de "Baixar Excel" e de "Baixar planilha", com o estado "Gerando planilha…" no botão.
- [ ] Separar React e gráficos em arquivos próprios. Numa atualização do app, quem já tem o app instalado baixa só o que mudou.
- [ ] Criar um orçamento de tamanho no CI (`npm run orcamento`), que falha se a primeira tela, o maior arquivo ou o total passarem do limite.

### Critério de aceite
- A primeira tela fica bem abaixo dos 354 KB atuais.
- As planilhas saem iguais, com teste E2E do relatório do Painel e do Observatório.
- O arquivo único continua funcionando.

## Pull Request — Bloco 18

Fecha #52.

### O que mudou
- **Excel sob demanda:** a biblioteca `xlsx` só é baixada quando a pessoa clica em "Baixar Excel" (Painel) ou "Baixar planilha (Excel)" (Observatório).
  - O botão mostra "Gerando planilha…", com indicador de progresso, e não aceita clique duplo. Para isso foi criado o hook `useAcaoComProgresso`.
  - O build leva só as partes da biblioteca que o app usa: 283 KB, contra 429 KB da biblioteca inteira.
- **Bibliotecas em arquivos próprios:** React e gráficos ficaram separados do código do app (`manualChunks`). Numa atualização, quem já tem o app instalado baixa só o código novo.
- **Orçamento de tamanho:** o script `scripts/orcamento-tamanho.mjs` (`npm run orcamento`) roda no CI depois do build. Limites em KB compactados:
  - primeira tela: 270;
  - maior arquivo: 130;
  - total: 450.
- **Arquivo único:** o Excel continua dentro dele (`inlineDynamicImports`).
- **Correção pega pelo Biome durante o trabalho:** o primeiro rascunho do botão do Painel chamava um hook depois de um `return` condicional. É o mesmo tipo de defeito que já tinha travado o app antes. O hook subiu para antes dos `return`.
- Versão do app: v7.24. O `CONTEXTO.md` registra as regras novas.

### Resultado (KB compactados)
| | Antes | Depois |
|---|---|---|
| Primeira tela | 354 | **259** (−27%) |
| Excel | dentro da primeira tela | 95, só ao pedir planilha |
| Mapa | 44, só no Observatório | 44, só no Observatório |

### Como foi validado
- Testes unitários: 104 passando.
- Testes E2E: 30 passando no celular e no computador. O teste do Painel agora baixa o relatório Excel, confere as abas e confere que o ponto de equilíbrio na planilha é igual ao da tela. O do Observatório já lia a planilha.
- `npm run orcamento`: tudo dentro dos limites.
- O arquivo único abre sem erros.
- `npm run lint` passa sem erros.

### Riscos e limitações
- **Primeira planilha offline:** se o app estiver sem internet e o service worker ainda não tiver guardado o Excel, a primeira planilha não sai. O PWA guarda todos os arquivos em segundo plano logo depois da primeira visita, então isso só acontece num app recém-aberto e sem conexão.
- **Gráficos continuam na primeira tela,** porque a Calculadora já mostra a rosca do preço. Carregar cada aba sob demanda entra no Bloco 21, junto com a divisão do `App.jsx`.

### Próximos passos
- Bloco 19: Knip, Commitlint e Stryker.

