# Bloco 20 — Issue e Pull Request

Issue e PR criados direto pelo Claude no GitHub.

## Issue #56 — [Melhoria] Teste automático de acessibilidade (axe, WCAG 2.1 AA) e correções

**Tipo:** Melhoria

### Objetivo
Verificar a acessibilidade de forma automática (axe-core, regras WCAG 2.1 A e AA) nas telas principais, nos temas claro e escuro, e corrigir o que aparecer. Os critérios conferidos são contraste, rótulos, estrutura de controles e acesso pelo teclado.

### Escopo
- [ ] Teste E2E `acessibilidade.spec.js` cobrindo:
  - aceite, termos e primeiro acesso;
  - as seis abas com o exemplo carregado;
  - formulários e seções abertas.
- [ ] Corrigir as violações encontradas.
- [ ] Documentar o que fica fora da verificação e o motivo.

### Critério de aceite
- Zero violações nas telas verificadas, no celular e no computador, nos dois temas.

## Pull Request — Bloco 20

Fecha #56.

> Este PR foi criado em cima dos Blocos 18 (#53) e 19 (#55). Faça o merge na ordem #53, #55 e depois este.

### O que mudou
- **Teste novo `tests/e2e/acessibilidade.spec.js`** (axe-core 4.13, regras WCAG 2.1 A e AA):
  - **onde:** tela de aceite, aviso de privacidade, primeiro acesso, as seis abas com o exemplo, serviço novo, Painel com Evolução aberta, Negócio com seções abertas e FAQ com a confirmação de apagar;
  - **como:** nos temas claro e escuro, no celular e no computador. São 12 execuções, e qualquer violação nova derruba o CI.
- **Correções do que o teste achou:**
  - **Contraste dos botões roxos com texto branco (4,24:1, abaixo dos 4,5:1):** passaram a usar o tom `primaryText` (6,0:1). Ajustados: "Voltar" e "Entendi, voltar" das folhas, "Aceitar e continuar", regime tributário, Modo A/B, abas de serviço e passos do assistente.
  - **Controle dentro de controle:** nas seções recolhíveis do Negócio, o "?" de ajuda ficava dentro do botão da seção, o que confunde leitores de tela. Agora o botão cobre o cabeçalho e o "?" fica por cima, como irmão. O visual é o mesmo, e o leitor de tela anuncia o título e o resumo da seção.
  - **Abas da Calculadora:** o botão "+ Novo" estava dentro da lista de abas (`role="tablist"`). Saiu da lista.
  - **Folha de texto (termos e aviso):** a área rolável ganhou foco pelo teclado, para dar para rolar com as setas.
- **Fora da verificação, com motivo no teste:**
  - o logotipo "Preço Justo", que usa as cores da marca (logotipos são exceção da WCAG 1.4.3);
  - o mapa do Leaflet, que é de terceiros.
- O helper dos testes que abre seções passou a clicar no começo do cabeçalho, porque no meio pode estar o "?".
- Versão do app: v7.25.

### Como foi validado
- `acessibilidade.spec.js`: 12 de 12 passando.
- Testes E2E: 42 passando no celular e no computador.
- Conferência visual das seções do Negócio e das abas da Calculadora no celular.
- `npm run lint` e `npm run knip` passam sem erros.

### Riscos e limitações
- **Mudança visual pequena:** os botões roxos selecionados ficaram um tom mais escuros no tema claro. O tema escuro não muda.
- **O axe não cobre tudo:** ele encontra cerca de metade dos problemas de acessibilidade. Ordem de leitura, clareza dos textos e uso real com leitor de tela ainda pedem uma revisão manual.
- **Tempo do CI:** os testes de navegador passaram de cerca de 4 para cerca de 8 minutos.

### Próximos passos
- Bloco 21: dividir o `App.jsx` por tela e carregar cada aba sob demanda.

