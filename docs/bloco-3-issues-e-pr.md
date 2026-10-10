# Bloco 3 — Issues e Pull Request

Crie as três Issues **antes** de abrir o Pull Request e não feche nenhuma: o merge do PR fecha as três. O GitHub numera Issues e PRs na mesma sequência; como o último foi o PR #8, devem sair #9, #10 e #11. Se saírem outros números, ajuste as linhas `Closes` do PR.

---

## Issue #9

**Título:**
```
[Melhoria] Fator R e Anexo aparecem só como números soltos
```

**Descrição:**
```
No Regime tributário (Simples Nacional), o resultado aparece como quatro números lado a lado (Fator R, Anexo aplicado, Alíquota nominal, Alíquota efetiva), sem dizer o que significam para o negócio. Além disso, quando a receita de 12 meses passa do limite do Simples (R$ 4,8 milhões), o imposto deixa de entrar no preço sem nenhum aviso.

Critério de aceite:
- Uma caixa no padrão do semáforo diz, em uma frase, em que anexo o negócio está, por quê e quanto paga sobre cada venda.
- No Anexo V, mostra quanto pagaria no Anexo III e quanto de folha faltaria para chegar ao Fator R de 28%, com o alerta de que aumentar a folha também tem custo.
- Avisa quando falta o faturamento de 12 meses e quando ele passa do limite do Simples.
- Os quatro números continuam disponíveis como "Detalhes do cálculo".
```

## Issue #10

**Título:**
```
[Melhoria] Os três pontos de equilíbrio aparecem sem explicação
```

**Descrição:**
```
O Painel mostra três pontos de equilíbrio (contábil, financeiro e econômico) lado a lado, sem explicar por que existem três nem onde a receita do negócio está em relação a cada um. A margem de segurança aparece num card separado, embora meça a distância até um deles.

Critério de aceite:
- Antes dos números, uma frase explica que são três perguntas diferentes, com link para a explicação completa.
- Os três pontos aparecem como uma escada, na ordem: o caixa fecha? → cobre todos os custos? → rende mais que o dinheiro aplicado?
- Cada degrau mostra o valor, se a receita projetada já chegou nele e quanto falta.
- Um resumo no padrão do semáforo diz a situação do negócio em uma frase.
- A margem de segurança fica no mesmo card.
```

## Issue #11

**Título:**
```
[Correção] Valores digitados no padrão brasileiro são gravados errados
```

**Descrição:**
```
Os campos em reais (custos fixos, pró-labore, receita de 12 meses, folha, preço cobrado) não entendem o ponto de milhar. O valor é gravado errado, sem nenhum aviso, e todos os cálculos que dependem dele saem errados.

Exemplos:
- "2.500" é gravado como R$ 2,50
- "22.000" é gravado como R$ 22,00
- "2.500,00" é gravado como R$ 0,00
- "1.234.567" é gravado como R$ 0,00

Critério de aceite:
- "2.500", "2.500,00", "22.000", "1.234.567" e "2500,50" são gravados com o valor que a pessoa quis dizer.
- Funciona também digitando tecla por tecla.
- Os percentuais exibidos usam vírgula decimal, como os valores em reais.
```

---

## Pull Request

**Título:**
```
Bloco 3: Simples Nacional e pontos de equilíbrio em linguagem natural, e correção da leitura de valores
```

**Descrição:**
```markdown
Closes #9
Closes #10
Closes #11

## O que mudou

### Fator R e Anexo em linguagem natural (#9)
- Novo componente `DiagnosticoSimples`, na seção Regime tributário, acima dos números. Usa só os dados informados pelo usuário e as tabelas da LC 123/2006 já existentes no app. Cinco situações:
  - 🟢 **Anexo III pelo Fator R** (≥ 28%).
  - 🟢 **Anexo III pela atividade** (Solução de Consulta Cosit nº 127/2021), com a recomendação de confirmar com o contador.
  - 🟡 **Anexo V**: quanto pagaria no Anexo III com o mesmo faturamento, a diferença por mês em reais e quanto de folha faltaria para chegar a 28%, com o alerta de que aumentar a folha também aumenta o INSS sobre o pró-labore.
  - 🟡 **Sem faturamento de 12 meses**: avisa que o app está usando a alíquota da 1ª faixa.
  - 🔴 **Acima de R$ 4,8 milhões**: avisa que o negócio passou do limite do Simples e que nenhum imposto está entrando nos preços. Antes, isso acontecia sem aviso nenhum.
- Os quatro números (com as dicas do Bloco 2) continuam embaixo, como "Detalhes do cálculo".

### Escada dos pontos de equilíbrio (#10)
- Novo componente `EscadaPontoEquilibrio` no Painel, no lugar dos cards "Ponto de equilíbrio" e "Margem de segurança".
- Explicação antes dos números ("São três valores porque respondem a três perguntas diferentes") com o link "Por que três? →", que abre a resposta do FAQ por cima da tela.
- Resumo no padrão do semáforo, em seis situações: falta volume de atendimentos; margem de contribuição não positiva (vender mais só aumenta o prejuízo); o caixa não fecha; o caixa fecha, mas há prejuízo; cobre os custos, mas rende menos que o capital aplicado; todos os pontos alcançados.
- Três degraus, na ordem financeiro → contábil → econômico, cada um com a pergunta que responde, valor, ícone e texto de "alcançado" ou "faltam R$ X", medidor de quanto a receita projetada cobre e explicação com os números do próprio negócio (depreciação excluída, capital investido e taxa).
- Medidores seguem as cores de status já existentes (sucesso, atenção, perigo), com trilho no tom claro da mesma cor, ícone e texto, para que a cor nunca seja a única pista. Têm `role="meter"` e rótulo acessível.
- A margem de segurança virou o rodapé do card. A grade de indicadores ficou com dois cards (ponto de equilíbrio pelo mix e GAO), um ao lado do outro.
- As referências acadêmicas (Padoveze; Perez Jr., Oliveira e Costa) foram mantidas nos ⓘ de cada degrau.

### Leitura de valores no padrão brasileiro (#11)
- Nova função `normalizarValorBR`, usada no `CampoMoeda` (todos os campos em reais) e nos dois campos de "Já tenho um preço". Com vírgula, ela é o decimal e os pontos são milhar; sem vírgula, vários pontos são milhar, e um ponto seguido de exatamente 3 dígitos também é milhar (centavos têm 2 dígitos).
- `fmtPct` passou a usar vírgula decimal ("6,00%"). Antes saía "6.00%" ao lado de "R$ 8.000,00", na mesma frase.

### Componentes compartilhados (sem recriar o que já existia)
- `CaixaSemaforo`: a caixa visual do semáforo, extraída do `SemaforoDiagnostico` (que passou a usá-la) e reaproveitada nos dois diagnósticos novos.
- `useBalaoAncorado`: o posicionamento por portal criado no Bloco 2 para a `Ajuda` virou uma função compartilhada, agora também usada pelo `InfoConceito` (o ⓘ das referências). Ele criava rolagem horizontal no celular perto da borda da tela.

### Ajustes visuais encontrados na revisão
- Os cards do Painel ficavam colados uns nos outros, sem espaço vertical. A área ganhou o mesmo espaçamento (12 px) que as grades já usam entre colunas.

### Outros
- Versão exibida no app: v7.9 → v7.10.
- `CONTEXTO.md`: status do Bloco 3, o Bloco 7 (polimento visual, com a decisão de não justificar textos), regras de formatação e leitura de números e os novos componentes compartilhados.

## Como foi validado
- Sintaxe com esbuild e build de produção (PWA e arquivo único) sem erros.
- `normalizarValorBR`: 15 casos, incluindo "2.500", "2.500,00", "22.000", "1.234.567", "4.800.000,00", "2.5" e "2500,50", mais a digitação tecla por tecla de "2.500,00" e "1.234.567,89". Todos corretos.
- Testes no navegador (Chromium headless) sobre o build de produção, no celular (375 × 812):
  - **Simples Nacional:** os cinco cenários, com as contas conferidas à mão (Anexo V de 15,50% contra 6,00% no III = R$ 712,50 a menos por mês sobre R$ 7.500; folha necessária de 28% × R$ 90.000 = R$ 25.200; folha de R$ 30.000 → Fator R de 33,3%).
  - **Escada:** os estados verde, "cobre os custos, mas rende pouco", "o caixa fecha, mas há prejuízo" e "o caixa não fecha". Conferido que o "faltam R$ 532,10" da escada é coerente com o resultado de -R$ 241,01 no DRE (R$ 532,10 × margem de 45,3%).
  - **Campo de dinheiro:** "2.500" no pró-labore → R$ 2.500,00; "22.000" → R$ 22.000,00, refletido no resumo do negócio.
  - "Por que três? →" abre a explicação certa; os ⓘ não criam rolagem horizontal.
- Computador (1280 × 900), tema escuro: escada e espaçamento do Painel.
- Regressão dos blocos 1 e 2: avisos de jornada e de regime, "Carregar exemplo", dicas e painel de explicação, rascunho da Calculadora mantido, selos do DRE e Observatório. Nenhum erro de JavaScript em nenhum cenário.
- Revisão visual das telas alteradas, no celular e no computador, nos temas claro e escuro.

## Riscos e limitações
- **`fmtPct` muda em todo o app:** qualquer percentual exibido passa a usar vírgula, inclusive no memorial de cálculo e no texto de compartilhar. É só formatação de exibição: a exportação para Excel usa os números, não o texto.
- **Leitura de "2.500":** um ponto seguido de exatamente 3 dígitos é lido como milhar. Quem digitar "2.500" querendo dizer dois reais e cinquenta centavos vai gravar R$ 2.500,00 e verá o valor formatado ao sair do campo. É a leitura esperada no Brasil, mas vale saber.
- **Valores já salvos com o erro:** o que alguém gravou antes desta correção (por exemplo, um pró-labore de R$ 2,50) continua salvo. A correção vale para o que for digitado a partir de agora.
- A diferença de imposto entre os Anexos V e III é calculada sobre o faturamento médio dos últimos 12 meses informado. Não considera o custo de aumentar a folha, e o texto diz isso.
- O projeto ainda não tem testes automatizados no repositório; os testes deste PR foram roteiros externos.

## Próximos passos
- Bloco 7 (polimento visual), já registrado no `CONTEXTO.md`.
- Primeiros testes automatizados no repositório, começando por `normalizarValorBR`, `aliquotaEfetiva` e pontos de equilíbrio.
- Bloco 4: comissão por profissional e modo "aluguel de cadeira".

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Jysjppu3ZxHZKVkdUuezka
```
