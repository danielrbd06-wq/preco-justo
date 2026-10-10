# Bloco 4 — Issues e Pull Request

Crie as duas Issues **antes** de abrir o Pull Request e não as feche: o merge do PR fecha as duas. Como o último foi o PR #14, devem sair **#15** e **#16**. Se saírem outros números, ajuste as linhas `Closes` do PR.

Decisões tomadas com o Daniel antes de implementar:
- Com comissões diferentes por profissional, o serviço tem **um preço só**, calculado com a **comissão média ponderada pelos atendimentos** de cada pessoa.
- O aluguel de cadeira é tratado **dos dois lados**: o dono que recebe e o profissional que paga.

---

## Issue #15

**Título:**
```
[Nova função] Comissão média da equipe, ponderada pelos atendimentos
```

**Descrição:**
```
Hoje a comissão é um percentual fixo por serviço. Num salão em que cada profissional tem uma comissão diferente (ex.: Ana 40%, Bia 30%), não há como representar isso sem duplicar o serviço, e o cadastro de Profissionais serve só para dividir o faturamento no Fechamento Mensal.

Decisão: o serviço continua com um preço único, calculado com a comissão média da equipe, ponderada pelo número de atendimentos de cada pessoa.

Critério de aceite:
- No cadastro de Profissionais, cada pessoa tem um vínculo: comissionado(a) (com comissão e atendimentos por mês), dono(a)/sem comissão (com atendimentos por mês, pesando com 0%) ou aluga cadeira.
- Com duas ou mais pessoas atendendo pelo salão e pelo menos uma comissionada, a Calculadora oferece "Média da equipe" e mostra de onde a média saiu (pessoa, comissão e atendimentos).
- Continua possível usar uma comissão própria em cada serviço.
- Serviços já salvos mantêm a comissão que tinham, sem mudança automática.
- Se faltar o número de atendimentos de alguém, a média vira simples e a tela avisa.
```

## Issue #16

**Título:**
```
[Nova função] Aluguel de cadeira, para quem recebe e para quem paga
```

**Descrição:**
```
O app não tem como representar o aluguel de cadeira, comum em salões e barbearias, em nenhum dos dois lados:

- Dono do salão que aluga cadeiras: o aluguel recebido não aparece no DRE nem reduz o custo fixo que os serviços do salão precisam cobrir. Os preços saem mais altos do que o necessário.
- Profissional que aluga cadeira em outro salão: não há um modelo de operação para esse caso, nem orientação sobre onde lançar o aluguel (fixo por mês ou percentual por serviço).

Critério de aceite:
- Dono: profissionais com vínculo "Aluga cadeira" informam o aluguel mensal. Ele aparece como receita no DRE, em linha própria (não como custo negativo), e reduz o custo fixo usado no preço e nos pontos de equilíbrio. Fica de fora da comissão média.
- O Fechamento Mensal registra o aluguel do mês. Fechamentos antigos continuam iguais.
- Profissional que aluga: novo modelo de operação "Alugo cadeira ou sala em outro salão", com orientação para lançar o aluguel fixo em "Aluguel do espaço" ou o percentual no campo "% que fica com o salão" da Calculadora.
```

---

## Pull Request

**Título:**
```
Bloco 4: comissão média da equipe e aluguel de cadeira
```

**Descrição:**
```markdown
Closes #15
Closes #16

## O que mudou

### Comissão média da equipe (#15)
- Cadastro de Profissionais: cada pessoa ganhou um vínculo (`comissao`, `dono` ou `aluguel`), com os campos de cada caso: comissão e atendimentos por mês; só atendimentos; ou aluguel mensal. O campo "Como trabalha" ocupa a linha inteira, para não cortar o texto no celular.
- Nova função `calcularComissaoEquipe`: média dos comissionados e do dono (que pesa com 0%), ponderada pelos atendimentos. Só existe com duas ou mais pessoas atendendo e pelo menos uma comissionada. Se faltar o número de atendimentos de alguém, vira média simples e a tela avisa.
- Cada serviço ganhou `comissaoModo` (`equipe` ou `propria`), e a nova função `comissaoEfetiva(servico, nd)` decide a comissão que entra no preço. Ela é usada nos dois motores de cálculo (Modo A e Modo B), no preço mínimo de pacotes, no Fechamento Mensal, na margem por serviço e na exportação para Excel. A fórmula do preço (markup divisor) não mudou: só a origem do percentual de comissão.
- Calculadora: novo componente `BlocoComissaoETaxa`, usado nos dois modos. Com a média disponível, mostra a escolha "Média da equipe · X%" ou "Própria deste serviço" e a composição da média (pessoa, comissão, atendimentos).
- **Compatibilidade:** serviços salvos antes deste PR não têm `comissaoModo` e mantêm a comissão própria. Serviços novos nascem com a média, quando ela existe. Se um serviço usa a média e ela deixa de existir, a tela avisa e volta para a comissão própria.
- Negócio: resumo da comissão média na seção Profissionais e no Resumo do negócio.

### Aluguel de cadeira (#16)
- **Dono que recebe:** o aluguel das pessoas com vínculo "Aluga cadeira" vira `nd.receitaAluguelCadeiras`.
  - DRE (Painel, Fechamento, impressão, memorial e Excel): linha própria "(+) Aluguel de cadeiras recebido", depois dos custos fixos. É receita, não custo negativo.
  - Preço: o custo fixo por hora passa a usar o custo fixo líquido do aluguel (`nd.custoFixoLiquido`).
  - Pontos de equilíbrio (contábil, financeiro, econômico, pelo mix e por serviço): calculados sobre o custo fixo líquido. O memorial de cálculo mostra a fórmula ajustada, "(Custos Fixos − Aluguel de Cadeiras Recebido) ÷ RCM".
  - Fechamento Mensal: guarda `aluguelRecebidoSnapshot` e o soma ao resultado. Fechamentos antigos não têm o campo e continuam iguais.
  - Projeções sazonais e o texto de compartilhar incluem o aluguel.
  - Quem aluga cadeira fica fora da comissão média, e a dica do "Número de profissionais" orienta a não contá-lo na capacidade.
- **Profissional que paga:** novo modelo de operação "Alugo cadeira ou sala em outro salão" (`locatario`). Nas Contas Fixas, uma orientação explica onde lançar o aluguel fixo ("Aluguel do espaço"); na Calculadora, o campo de comissão vira "% que fica com o salão", para o aluguel cobrado por percentual.

### Outros
- Versão exibida no app: v7.11 → v7.12.
- `CONTEXTO.md`: regras do Bloco 4 (modelo de dados, `comissaoEfetiva`, aluguel como receita) e duas pendências novas: a Lei do Salão-Parceiro e o aviso de "nova versão disponível".

## Como foi validado
- Sintaxe com esbuild e build de produção (PWA e arquivo único) sem erros.
- Contas conferidas à mão no navegador (Chromium headless, celular 375 px), com o exemplo do app:
  - Ana 40% × 80 atendimentos, Bia 30% × 60 e dona 0% × 40 → média ponderada de **27,8%** ((3.200 + 1.800 + 0) ÷ 180).
  - Carla aluga cadeira por R$ 600 → custo fixo a cobrir de R$ 3.560 para **R$ 2.960**; custo por hora de **R$ 7,12** (2.960 ÷ 416 h).
  - DRE: margem de contribuição R$ 3.418,12 − custos fixos R$ 3.560,00 + aluguel R$ 600,00 = resultado de **R$ 458,12**, igual ao exibido.
- Com uma única comissionada, a média não aparece.
- Serviço novo nasce com "Média da equipe · 27,8%" e mostra a composição; a opção "Própria" volta ao campo normal.
- Serviço salvo antes (Corte Masculino, 30%) continua com "Própria deste serviço" e 30% depois de a média passar a existir.
- Fechamento Mensal: o DRE do mês mostra a linha de aluguel.
- Modelo "Alugo cadeira ou sala em outro salão": orientação nas Contas Fixas e campo "% que fica com o salão" na Calculadora, sem a opção de média da equipe.
- Sem nenhum profissional cadastrado, todos os números do exemplo ficaram idênticos aos da versão anterior.
- Regressão dos blocos 1, 2, 3 e 7 completa, sem nenhuma rolagem horizontal e sem nenhum erro de JavaScript.
- Revisão visual do cadastro, da Calculadora, do DRE e da orientação ao locatário no celular. Ajuste feito na revisão: "Como trabalha" em linha própria (o texto era cortado).

## Riscos e limitações
- **A média vale para todos os serviços:** ela usa a participação de cada pessoa no total de atendimentos do salão, não por serviço. Se um serviço é feito só por uma pessoa, use a comissão própria nele.
- **Os atendimentos por pessoa são aproximados** (informados pelo usuário) e não são ligados ao Fechamento Mensal real.
- **Aluguel recebido maior que os custos fixos:** o custo fixo por hora fica em zero (nunca negativo). O excedente aparece no resultado do DRE, mas não reduz o preço dos serviços.
- **Lei do Salão-Parceiro (Lei 13.352/2016):** quem trabalha com contrato de parceria (cota-parte) pode não tributar a parte do profissional-parceiro. O app ainda calcula o imposto sobre o preço inteiro. Registrado como pendência no `CONTEXTO.md`, para tratar com validação de um contador.
- O número de profissionais da capacidade produtiva continua sendo informado à parte; o app só orienta a não contar quem aluga cadeira.

## Próximos passos
- Bloco 5: calculadora guiada da taxa de cartão ponderada.
- Avaliar com um contador o tratamento da Lei do Salão-Parceiro.
- Aviso de "nova versão disponível" no app.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Jysjppu3ZxHZKVkdUuezka
```
