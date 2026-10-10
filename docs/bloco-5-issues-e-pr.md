# Bloco 5 — Issues e Pull Request

Crie as duas Issues **antes** de abrir o Pull Request e não as feche: o merge do PR fecha as duas. Como o último foi o PR #17, devem sair **#18** e **#19**. Se saírem outros números, ajuste as linhas `Closes` do PR.

Decisões tomadas com o Daniel antes de implementar:
- A taxa média fica na aba **Negócio** e cada serviço escolhe entre ela e uma taxa própria, do mesmo jeito que a comissão média do Bloco 4.
- O **crédito parcelado** é uma linha só, com a taxa média já somada à da antecipação, quando houver.

---

## Issue #18

**Título:**
```
[Nova função] Taxa média de recebimento pelas formas de pagamento
```

**Descrição:**
```
Hoje a taxa de cartão é um único percentual digitado em cada serviço. Débito, crédito à vista, crédito parcelado, Pix e dinheiro têm custos bem diferentes, e o usuário não tem um caminho para chegar a um número que represente o próprio negócio: acaba usando a taxa do crédito em tudo (preço mais alto do que precisa) ou deixando 0 (preço mais baixo do que deveria).

Decisão: a taxa média fica na aba Negócio e cada serviço escolhe entre ela e uma taxa própria, como a comissão média da equipe.

Critério de aceite:
- Na aba Negócio, uma seção "Formas de pagamento" com dinheiro, Pix, débito, crédito à vista e crédito parcelado, cada uma com a parte das vendas (%) e a taxa cobrada (%). Dinheiro não tem taxa.
- Nenhuma taxa vem preenchida: cada maquininha e banco cobra diferente.
- A taxa média é a média ponderada pela parte das vendas e só passa a valer quando as partes somam 100%. Antes disso, a tela mostra quanto falta.
- Na Calculadora, com a média disponível, cada serviço escolhe "Média do negócio" ou "Própria deste serviço" e vê de onde a média saiu.
- Serviços já salvos mantêm a taxa que tinham, sem mudança automática.
- A taxa usada pelo serviço vale em todos os cálculos: preço, pacotes, Fechamento Mensal e Excel.
- Orientação: mensalidade da maquininha é custo fixo; no parcelado, usar a taxa já somada à da antecipação.
```

## Issue #19

**Título:**
```
[Melhoria] Calculadora: campos de comissão e taxa com largura irregular
```

**Descrição:**
```
Encontrado na pré-visualização do Bloco 4, na Calculadora (passo Taxas), no computador:

- Com a comissão média da equipe ligada, o campo "Taxa de cartão/Pix" fica com metade da largura, enquanto "Margem de lucro desejada", logo abaixo, ocupa a linha inteira.
- Na caixa que mostra de onde a comissão média saiu, os percentuais ficam no canto direito, muito longe dos nomes, em telas largas.

Critério de aceite:
- Quando houver escolha entre média e valor próprio, comissão e taxa ocupam a linha inteira, como a margem.
- A lista da composição da média tem largura máxima, com o valor perto do nome.
```

---

## Pull Request

**Título:**
```
Bloco 5: taxa média de recebimento e ajustes visuais da Calculadora
```

**Descrição:**
```markdown
Closes #18
Closes #19

## O que mudou

### Taxa média de recebimento (#18)
- Aba Negócio: nova seção **Formas de pagamento**, em tabela, com dinheiro, Pix, débito, crédito à vista e crédito parcelado. Cada forma recebe a parte das vendas (%) e a taxa cobrada (%); dinheiro aparece como "sem taxa". Linha de total, que fica em destaque quando não fecha 100%.
- Nenhuma taxa vem preenchida. O texto orienta a buscar as taxas no extrato ou no contrato da maquininha e do banco, a usar no parcelado a taxa já somada à da antecipação e a lançar a mensalidade da maquininha nas Contas Fixas.
- Nova função `calcularTaxaRecebimento`: média das taxas ponderada pela parte das vendas. Só vira a média do negócio (`nd.taxaRecebimento`) quando as partes somam 100% (tolerância de 0,5 ponto). Antes disso, a seção avisa quanto falta ou quanto passou.
- Com a média pronta, a seção mostra "Taxa média de recebimento: X%" e quanto fica com a maquininha e o banco a cada R$ 100,00 vendidos. A média aparece também no Resumo do negócio e no resumo da seção fechada.
- Cada serviço ganhou `taxaModo` (`negocio` ou `propria`), e a nova função `taxaEfetiva(servico, nd)` decide a taxa que entra no preço. Ela é usada nos dois motores de cálculo (Modo A e Modo B), no simulador de sensibilidade, no preço mínimo de pacotes, no Fechamento Mensal, na margem por serviço e na exportação para Excel. A fórmula do preço (markup divisor) não mudou: só a origem do percentual da taxa.
- Calculadora: com a média disponível, aparece a escolha "Média do negócio · X%" ou "Própria deste serviço" e a composição da média (forma, taxa e parte das vendas).
- **Compatibilidade:** serviços salvos antes deste PR não têm `taxaModo` e mantêm a taxa própria. Serviços novos nascem com a média, quando ela existe. Se um serviço usa a média e ela deixa de valer (a soma deixou de fechar 100%), a Calculadora avisa e usa a taxa própria.
- O aviso "Taxa de cartão em 0%" passou para dentro do bloco e só aparece quando a taxa digitada no serviço é a que vale. Sem a média, uma dica indica onde calculá-la.
- FAQ: nova pergunta "Como calcular a taxa de cartão quando eu recebo por várias formas de pagamento?", com fórmula e um exemplo marcado como ilustrativo. As dicas "?" da taxa levam a ela.

### Ajustes visuais da Calculadora (#19)
- Novos componentes compartilhados **`SeletorOrigem`** (escolha entre média e valor próprio) e **`ComposicaoMedia`** (de onde a média saiu), usados pela comissão e pela taxa, sem duplicar código.
- Quando há escolha entre média e valor próprio, comissão e taxa ocupam a linha inteira, como a margem. Sem nenhuma média, os dois campos continuam lado a lado, como antes.
- A lista da composição tem largura máxima: o valor fica perto do nome em telas largas.
- A opção escolhida ganhou borda, para se destacar também no tema escuro, e a troca tem transição suave.

### Outros
- Versão exibida no app: v7.12 → v7.13.
- `CONTEXTO.md`: regras do Bloco 5 (modelo de dados, `taxaEfetiva`, componentes compartilhados).

## Como foi validado
- Sintaxe com esbuild e build de produção (PWA e arquivo único) sem erros.
- Testes no navegador (Chromium headless), celular (375 px) e computador (1280 px, temas claro e escuro), com o exemplo do app:
  - Dinheiro 20% e Pix 40% → aviso "somam 60% das vendas. Faltam 40%".
  - Dinheiro 20%, Pix 40% a 0%, débito 25% a 1,6% e crédito 15% a 3% → **0,85%** ((25 × 1,6 + 15 × 3) ÷ 100), igual ao exibido na seção, no Resumo do negócio e na Calculadora.
  - O mesmo serviço sai com o mesmo preço usando a média (0,85%) ou digitando 0,85% como taxa própria (R$ 11,70), e mais caro com 3% (R$ 12,05).
  - Serviço salvo antes (Corte Masculino, 3%) continua com "Própria deste serviço" e 3%.
  - Serviço que usava a média, com a soma em 90%: aviso na Calculadora, sem seletor, usando a taxa própria; a seção do Negócio mostra "soma 90% — incompleto".
  - O "?" da seção abre a nova pergunta do FAQ por cima da tela.
- Sem formas de pagamento informadas, todos os números do exemplo ficaram idênticos aos da versão anterior.
- Regressão dos blocos 1, 2, 3, 4 e 7 completa (inclusive comissão média de 27,8% e DRE com aluguel de R$ 458,12), sem nenhuma rolagem horizontal e sem nenhum erro de JavaScript.
- Revisão visual da seção Formas de pagamento e do passo Taxas da Calculadora no celular e no computador, nos temas claro e escuro.

## Riscos e limitações
- **A média vale para todos os serviços:** ela usa a forma de pagamento do negócio como um todo. Se um serviço é pago de um jeito bem diferente (por exemplo, pacotes sempre parcelados), use a taxa própria nele.
- **A parte das vendas é uma estimativa do usuário** e não é ligada ao Fechamento Mensal real.
- **Crédito parcelado numa linha só:** quem parcela em prazos muito diferentes perde precisão. Foi a escolha mais simples para quem não domina o extrato.
- **Taxas por transação em reais** (valor fixo por venda) não são representadas; só taxas em %.
- Os campos de % usam o teclado numérico do navegador; o separador decimal segue o idioma do aparelho.

## Próximos passos
- Bloco 6: benchmarking regional agregado e mapa.
- Avaliar com um contador o tratamento da Lei do Salão-Parceiro.
- Aviso de "nova versão disponível" no app.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Jysjppu3ZxHZKVkdUuezka
```
