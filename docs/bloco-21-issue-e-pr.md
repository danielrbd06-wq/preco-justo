# Bloco 21 — Issue e Pull Request

Issue e PR criados direto pelo Claude no GitHub.

## Issue #58 — [Melhoria] Dividir o App.jsx por tela e carregar as abas sob demanda

**Tipo:** Melhoria

### Objetivo
Dividir o `src/App.jsx` (~12.400 linhas, o app inteiro num arquivo) em arquivos por tela e por peça compartilhada, **sem mudar o comportamento**. As abas que não são a primeira tela passam a ser carregadas sob demanda. Assim:
- fica mais fácil achar, revisar e mudar cada tela, e mais difícil recriar um componente que já existe;
- a primeira tela abre mais rápido no celular, porque os gráficos e as abas não escolhidas deixam de vir junto.

### Escopo
- [ ] `App.jsx` só com a casca (tema, cabeçalho, abas, folhas por cima da tela).
- [ ] Uma pasta ou arquivo por aba em `src/telas/`; peças usadas por mais de uma tela em `src/componentes/`; dados fixos em `src/dados/`.
- [ ] Painel, Estoque, Observatório e FAQ carregados sob demanda, com o mesmo esqueleto de carregamento da troca de aba.
- [ ] Rosca do preço com o desenho sob demanda (a legenda aparece na hora).
- [ ] Conferir por script que as declarações foram movidas sem mudar o código.
- [ ] Apertar o orçamento de tamanho da primeira tela.
- [ ] Teste E2E que garanta que a primeira tela não baixa gráficos nem as abas não escolhidas.
- [ ] `CONTEXTO.md`: mapa dos arquivos e regra de onde fica cada coisa.

### Critério de aceite
- Mesmas telas e mesmos valores: todos os testes (unitários, E2E e acessibilidade) passando sem mudar nenhum valor esperado.
- Lint, Knip e orçamento de tamanho passando.

## Pull Request — Bloco 21

Fecha #58.

> Este PR foi criado em cima dos Blocos 18 (#53), 19 (#55) e 20 (#57). Faça o merge na ordem #53, #55, #57 e depois este.

### O que mudou
- **`App.jsx` dividido em 32 arquivos.** O mapa completo está no `CONTEXTO.md`, seção 4.
  - `App.jsx` ficou só com a casca: tema, cabeçalho, abas e o que abre por cima da tela.
  - `src/telas/`: uma pasta ou arquivo por aba. Negócio, Calculadora e Painel, que passavam de 1.500 linhas, foram divididos pelas seções da tela.
  - `src/componentes/`: peças usadas por mais de uma tela (esqueletos, campos, "?", salvar sozinho, rascunhos, folhas, logotipo).
  - `src/dados/`: FAQ, segmentos, negócio de exemplo e dados de referência (estabelecimentos coletados e referência salarial, com fonte).
  - Base: `tema.js`, `armazenamento.js`, `planilhas.js` e `versao.js`.
- **Como a divisão foi feita:** por script (`docs/bloco-21/dividir.mjs` com o mapa em `config.mjs`). Ele leva cada declaração inteira, com os comentários acima dela, e calcula os `import` e `export` pelo uso real de cada nome. O script falha se:
  - alguma declaração ficar sem destino;
  - dois arquivos importarem um do outro (importação circular);
  - houver JSX em arquivo `.js`.
- **Conferência:** outro script (`docs/bloco-21/conferir.mjs`) compara o código de cada declaração antes e depois, sem comentários e formatação. Resultado: **186 das 189 idênticas**. As 3 diferentes são de propósito:
  - `App`: abas sob demanda (abaixo);
  - `GraficoRoscaPreco`: desenho sob demanda (abaixo);
  - `MapaConcorrencia`: o caminho do arquivo mudou porque o Observatório foi para `telas/`.
- **Abas sob demanda:** Negócio e Calculadora são a primeira tela e continuam vindo com o app. Painel, Estoque, Observatório e FAQ, com os gráficos que usam, só baixam quando a aba é escolhida.
  - O download começa no clique, junto com o esqueleto de 320 ms que a troca de aba já mostrava.
  - Se a internet demorar mais, o mesmo esqueleto continua até a aba chegar.
- **Rosca do preço:** a legenda e as porcentagens aparecem na hora. O desenho da rosca chega com a biblioteca de gráficos, e até lá um anel de carregamento do mesmo tamanho segura o lugar, sem a tela pular.
- **Comentários fora do lugar:** dois blocos de comentário que já estavam longe do código que explicam (abas de acesso rápido e preenchimento rápido) foram para junto dele.
- **Orçamento de tamanho:** o limite da primeira tela caiu de 270 para 150 KB.
- **Teste novo:** `tests/e2e/sob-demanda.spec.js`.
- **Documentação:** `CONTEXTO.md` ganhou o mapa dos arquivos e a regra "Onde fica cada coisa"; o `README.md` ganhou a estrutura nova.
- **Versão do app:** v7.26.

**Tamanho, compactado (gzip):**

| | Antes (Bloco 18) | Agora |
| --- | --- | --- |
| Primeira tela | 258,8 KB | **114,4 KB** |
| Maior arquivo | 112,5 KB (gráficos) | 112,5 KB (gráficos, agora fora da primeira tela) |
| Total | 403,7 KB | 410,2 KB |

O total subiu 6,5 KB porque cada arquivo separado carrega um pouco de código de ligação.

### Como foi validado
- **Script de conferência:** 186 de 189 declarações idênticas; as 3 diferenças são as descritas acima.
- **Testes unitários:** 124 passando. A cobertura não mudou.
- **Testes E2E:** 44 passando, no celular e no computador. Os 42 que já existiam não tiveram nenhum valor esperado alterado. Os 2 novos são o teste de carregamento sob demanda nos dois tamanhos de tela. O teste de acessibilidade (axe) passou em todas as telas.
- **Teste novo (`sob-demanda.spec.js`):** sem service worker, para ver o que a página realmente pede, confere que:
  - a primeira tela não baixa gráficos, Excel nem as quatro abas;
  - cada aba baixa só no clique e mostra o conteúdo;
  - a rosca é desenhada.
- **Conferência visual com a internet atrasada de propósito:** o anel de carregamento e a rosca aparecem no mesmo lugar, e o esqueleto da troca de aba continua igual.
- **Outras verificações:**
  - `npm run lint` e `npm run knip` sem erros;
  - os dois builds funcionando (o de arquivo único continua com tudo dentro);
  - `npm run orcamento` passando com o limite novo.

### Riscos e limitações
- **Aba que ainda não baixou:** num navegador sem o app instalado, se a internet cair antes de uma aba baixar pela primeira vez, ela mostra o aviso de erro; recarregar resolve. Com o app instalado (PWA), o service worker já guarda todas as abas para uso offline, então isso não acontece.
- **Versão publicada durante o uso:** se uma versão nova for publicada enquanto alguém usa o app pelo navegador, sem instalar, uma aba que ainda não abriu pode procurar um arquivo da versão antiga. O aviso de erro aparece, e recarregar resolve. Com o app instalado, o service worker mantém os arquivos da versão em uso até a pessoa aceitar a atualização.
- **Histórico de linhas (git blame):** o código mudou de arquivo. Para ver o autor original de uma linha, use `git blame -C -C <arquivo>`.
- **Merge:** este PR mexe no `App.jsx` inteiro. PRs abertos depois dele que alterem o `App.jsx` antigo vão precisar ser refeitos em cima da estrutura nova.

### Próximos passos
- Com as telas separadas, cada aba pode ganhar o seu próprio teste de componente, se fizer sentido.
- Os itens que dependem do Daniel continuam abertos:
  - alerta da Reforma Tributária;
  - Codecov, Sentry e Datadog;
  - revisão jurídica dos termos.

### Como repetir a conferência
Na pasta do repositório, com as dependências instaladas:

```bash
git show <commit anterior ao Bloco 21>:src/App.jsx > /tmp/App.original.jsx
node docs/bloco-21/conferir.mjs "$PWD" /tmp/App.original.jsx
```
