# Bloco 16 — Issue e Pull Request

Issue e PR criados direto pelo Claude no GitHub.

## Issue #47 — [Correção] Gráficos e pontos de equilíbrio com parceiros na mesma régua (receita do salão), com equivalência em valor cobrado

**Tipo:** Correção

### Problema
Com profissionais-parceiros (Bloco 11), o app usa duas réguas misturadas:
- **Painel, DRE e pontos de equilíbrio:** usam a receita do salão, ou seja, o valor cobrado menos a cota-parte.
- **Gráfico de Evolução:** as barras usam o valor cobrado, mas a linha do ponto de equilíbrio está na receita do salão. Exemplo: barra de R$ 20.000 contra uma linha de R$ 12.000. Parece uma folga de 40%, mas a real é de 25%. **O salão parece mais seguro do que está.**
- **Projeção de caixa:** os meses fechados usam o valor cobrado e os projetados usam a receita do salão. A linha cai sem motivo na passagem de um para o outro.
- **Sazonalidade, margem líquida do mês e alerta de anomalia:** são calculados sobre o valor cobrado.

### Decisão do Daniel (16/10/2026): opção C
- **Régua única:** tudo fica na receita do salão.
- **Equivalência:** quando houver parceiros, o app mostra junto o equivalente em valor cobrado. Exemplo: "R$ 12.000 de receita do salão, o que equivale a cerca de R$ 15.000 cobrados dos clientes".
- **Detalhe do mês:** no gráfico de Evolução, tocar no mês mostra o valor cobrado e a cota-parte.

### Escopo
- [ ] Criar `receitaDoSalao(fechamento)` e `equivalenteEmValorCobrado(valor, dre)` em `calculos.js`, com testes.
- [ ] Gráfico de Evolução: barras em receita do salão, margem do mês sobre a receita do salão e detalhe com valor cobrado e cota-parte.
- [ ] Sazonalidade automática, alerta de anomalia e meses reais da projeção de caixa na receita do salão.
- [ ] Escada de pontos de equilíbrio, memorial de cálculo e relatório Excel com a equivalência em valor cobrado.
- [ ] FAQ do ponto de equilíbrio explicando as duas réguas.

### Critério de aceite
- Sem parceiros, nenhum número muda.
- Com parceiros, barras, linha do ponto de equilíbrio e projeção ficam na mesma régua.
- A margem de segurança fica igual nas duas réguas, com teste.

## Pull Request — Bloco 16

Fecha #47.

### O que mudou
Implementa a **opção C** escolhida pelo Daniel: tudo fica na régua da receita do salão (valor cobrado − cota-parte dos parceiros), com a tradução para o valor cobrado quando há parceiros.

- **Contas novas em `calculos.js`:**
  - `receitaDoSalao(fechamento)` e `equivalenteEmValorCobrado(valor, dre)`, que calcula valor × cobrado ÷ (cobrado − cota). Exemplo: R$ 12.000 de receita do salão equivalem a R$ 15.000 cobrados.
- **Gráfico de Evolução:**
  - A área mostra a receita do salão, com título e legenda "Receita do salão" quando há parceiros.
  - A margem líquida do mês passou a ser calculada sobre a receita do salão, igual ao DRE.
  - Ao tocar no mês, o detalhe mostra a receita do salão, o valor cobrado dos clientes e a cota-parte.
  - Uma nota abaixo do gráfico explica a régua.
- **Sazonalidade automática, alerta de anomalia e meses reais da Projeção de caixa:** passam a usar a receita do salão. Acaba o degrau que aparecia entre os meses fechados e os projetados.
- **Escada de pontos de equilíbrio:**
  - Com parceiros, o título vira "quanto o salão precisa receber por mês".
  - Uma frase explica a régua.
  - Cada ponto ganha uma linha "≈ R$ X cobrados".
- **Memorial de cálculo e relatório Excel:** ganham o ponto de equilíbrio contábil em valor cobrado, com a fórmula.
- **FAQ do ponto de equilíbrio:** novo parágrafo sobre as duas réguas, com o exemplo numérico.
- **Duas correções que apareceram nos testes do gráfico:**
  - A linha do ponto de equilíbrio sumia quando ficava acima de todos os meses, que é justamente o caso mais grave. Agora a escala cresce até ela.
  - O eixo arredondava R$ 2.500 para "3k". Agora mostra "2,5k".
- Versão do app: v7.22. O `CONTEXTO.md` foi atualizado com a regra da régua única.

### Como foi validado
- **Testes unitários:** 104 passando. Os novos cobrem:
  - a equivalência (R$ 12.000 viram R$ 15.000), mais os casos sem parceiros e com dado inválido;
  - **a margem de segurança igual nas duas réguas**, num cenário real com parceira;
  - a receita do salão no fechamento, inclusive em fechamento antigo sem cota.
- **Testes E2E:** 28 passando no celular e no computador. O teste do Salão-Parceiro agora também confere que:
  - sem parceiros, não aparece nenhum "≈ … cobrados";
  - com parceiros, aparecem a frase da régua e as três equivalências.
- **Conferência visual**, com dois fechamentos de exemplo (R$ 10.000 cobrados e R$ 2.000 de cota):
  - o detalhe do mês mostra receita do salão de R$ 8.000, valor cobrado de R$ 10.000, cota-parte de R$ 2.000 e margem de 18,8% (1.500 ÷ 8.000);
  - a área e a linha do ponto de equilíbrio estão na mesma escala.
- `npm run lint`, `build` e `build:single` passam sem erro.

### Riscos e limitações
- **Sem parceiros, nenhum número muda**, porque a receita do salão é igual ao faturamento.
- **Fechamentos antigos com parceiros** (Bloco 11) passam a mostrar a margem do mês sobre a receita do salão. Ela fica um pouco maior que antes e igual ao DRE do mês.
- **A equivalência usa a proporção da cota no DRE projetado do mês atual.** Se a fatia dos parceiros mudar muito de um mês para o outro, o valor real em cobrado pode variar um pouco. Por isso o app mostra "≈".
- **Ticket médio:** continua em valor cobrado, porque é o que o cliente paga, e o rótulo diz isso: "Ticket médio do cliente".

### Próximos passos
- Revisar os 23 avisos do Biome.
- Modo do profissional-parceiro, se o Daniel quiser.

