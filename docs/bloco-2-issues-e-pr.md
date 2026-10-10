# Bloco 2 — Issues e Pull Request

As Issues #1 a #4 já existem no repositório. As três abaixo devem ser criadas **antes** de abrir o Pull Request, para que ele possa citá-las. Se o GitHub atribuir números diferentes de #5, #6 e #7, ajuste a linha `Closes` do PR.

---

## Issue #5 — [Melhoria] Dicas "?" não levam à explicação completa do FAQ

**Descrição:**

As dicas "?" ao lado dos campos e a aba FAQ não se conectam. O FAQ tem explicações completas e didáticas (Fator R, RBT12, comissão, pró-labore, ponto de equilíbrio), mas o usuário que tem dúvida num campo precisa adivinhar que a resposta existe, trocar de aba e procurar. Os campos mais técnicos do Simples Nacional (RBT12, folha de 12 meses, Fator R, alíquota nominal e efetiva) não tinham dica nenhuma. Além disso, dentro de seções recolhíveis o balão da dica era cortado pela borda da seção.

**Critério de aceite:**
- Os campos de RBT12, folha de 12 meses, Fator R, alíquota nominal, alíquota efetiva e capital investido têm dica em linguagem simples.
- As dicas ligadas a uma pergunta do FAQ mostram o link "Entender melhor", que abre a explicação completa sem trocar de aba (nada do que está sendo preenchido se perde).
- O balão da dica nunca é cortado e nunca sai da tela no celular.

---

## Issue #6 — [Melhoria] DRE não diz se é dado real, exemplo ou projeção

**Descrição:**

O app tem dois tipos de DRE com naturezas diferentes: o do Painel, recalculado ao vivo com a configuração de hoje, e o do Fechamento Mensal, que guarda os números reais daquele mês e não muda se a configuração mudar depois. Na tela, os dois apareciam com o mesmo título ("DRE gerencial do mês"), sem indicar a diferença. Os meses criados pelo botão de exemplo também apareciam sem distinção.

**Critério de aceite:**
- DRE do Painel com selo "projeção com a configuração de hoje".
- DRE do Fechamento com título "DRE de [mês]" e selo "dado real de [mês]".
- Mês de exemplo com selo "exemplo ilustrativo, não é dado real".

---

## Issue #7 — [Melhoria] Observatório não mostra quando os dados foram coletados

**Descrição:**

A lista de estabelecimentos do Observatório vem de uma coleta única no Google Maps (Google Places), mas a tela não informa isso. O usuário pode achar que a lista é atualizada em tempo real.

**Critério de aceite:**
- A tela informa que é o retrato de uma coleta única, a fonte e o período.
- Nenhuma data é inventada: como a data exata não foi registrada, mostra o limite comprovado ("até agosto de 2026").

---

## Pull Request — Bloco 2: explicações conectadas ao FAQ, origem do DRE e correção do "Carregar exemplo"

**Título:**

```
Bloco 2: dicas ligadas ao FAQ, origem do DRE, coleta do Observatório e correção do "Carregar exemplo"
```

**Descrição (colar inteira):**

```markdown
Closes #4
Closes #5
Closes #6
Closes #7

## O que mudou

### Correção do "Carregar exemplo" (#4)
- **Causa:** o negócio de exemplo era montado a partir do negócio em branco (`NEGOCIO_PADRAO`), cujo perfil é vazio. Ao carregá-lo, o perfil do usuário era substituído, o segmento sumia e o app voltava a mostrar o assistente inicial.
- **Correção:** `carregarExemplo` mantém o perfil já informado (nome, segmento, modelo, cidade) e substitui só custos, configurações e serviços.
- O texto de confirmação passou a dizer exatamente isso: "Seu perfil (nome, segmento e cidade) é mantido."

### Dicas ligadas ao FAQ (#5)
- `Ajuda` ganhou a prop `faq` (id de uma pergunta de `FAQ_DADOS`). Quando presente, o balão mostra o link **"Entender melhor →"**. `Campo`, `CampoPct` e `SecaoColapsavel` repassam a prop.
- Novo componente `PainelExplicacao`: mostra a resposta completa do FAQ **por cima da tela atual** (bottom sheet no celular, diálogo centralizado no computador), com animação de entrada e saída, fechamento por Esc, toque fora ou botão, e foco devolvido ao "?" ao fechar. Inclui "Ver todas as perguntas", que abre a aba FAQ já com a pergunta expandida e destacada.
  - **Por que não troca de aba:** mudar de aba descarta o que ainda não foi salvo (o rascunho de um serviço novo e os últimos 1,2 s digitados no Negócio). O usuário lê a explicação e volta exatamente de onde estava.
- O balão da dica agora é renderizado num portal com posição fixa calculada a partir do "?". Antes, dentro de seções recolhíveis (`overflow: hidden`), ele era cortado. Ele acompanha a rolagem, fecha ao tocar fora e nunca sai da tela.
- Novas dicas: RBT12, folha de pagamento de 12 meses, Fator R, alíquota nominal, alíquota efetiva e seção de capital investido (ponto de equilíbrio econômico).
- Link para o FAQ adicionado às dicas existentes: custos fixos, pró-labore, comissão, taxa de cartão e margem.

### Origem do DRE (#6)
- `DRECard` ganhou `origem` (`projecao` | `real` | `exemplo`) e `mesLabel`, reaproveitando o componente `Selo`.
- Painel: selo "projeção com a configuração de hoje".
- Fechamento Mensal: título "DRE de [mês]", selo "dado real de [mês]" e nota de que os números não mudam com a configuração.
- Meses de exemplo: selo "exemplo ilustrativo, não é dado real".
- Ajustes visuais encontrados na revisão: o valor negativo do DRE quebrava a linha no celular (o sinal de menos ficava sozinho) e o texto acima do DRE no Painel era coberto em 4 px pelo card (margem negativa `-mb-1`).

### Coleta do Observatório (#7)
- Nova constante `COLETA_ESTABELECIMENTOS` (fonte, data, limite comprovado).
- Aviso na tela: "Retrato de uma coleta única, feita até agosto de 2026 em Google Maps (perfis públicos via Google Places). A lista não se atualiza sozinha."
- A data exata não foi registrada no código; por isso a tela mostra só o limite comprovado (o build de 16/08/2026 já continha os dados). Ao refazer a coleta, basta preencher `COLETA_ESTABELECIMENTOS.data`.

### Outros
- Versão exibida no app: v7.8 → v7.9.
- `CONTEXTO.md` atualizado (status dos blocos, componentes de explicação a reutilizar, pendências).

## Como foi validado
- Sintaxe com esbuild e build de produção (PWA e arquivo único) sem erros.
- Testes no navegador (Chromium headless) sobre o build de produção:
  - **Celular (375 × 812):** assistente inicial → "Carregar exemplo" → aba Negócio: assistente não reaparece e o nome do negócio é mantido; dica da folha de 12 meses dentro da seção recolhível aparece inteira, dentro da tela e sem rolagem horizontal; "Entender melhor" abre a explicação certa; Esc fecha e o usuário continua no Negócio; "Ver todas as perguntas" abre o FAQ com a pergunta expandida; serviço novo em edição na Calculadora: abrir e fechar a explicação da comissão mantém o passo do assistente e o nome digitado; selos do DRE no Painel (projeção), no Fechamento (dado real) e em mês de exemplo (exemplo ilustrativo); aviso de coleta no Observatório; nenhuma rolagem horizontal em nenhuma tela testada.
  - **Computador (1280 × 800), tema escuro:** painel de explicação centralizado; fecha ao clicar fora.
  - **Regressão do Bloco 1:** avisos de jornada irreal e de regime indefinido continuam funcionando.
  - Nenhum erro de JavaScript em nenhum dos cenários.
- Revisão visual das telas alteradas, no celular e no computador, nos temas claro e escuro.

## Riscos e limitações
- A função de abrir a explicação é passada por contexto (`FaqLinkContext`). Uma `Ajuda` renderizada fora do `App` mostra a dica normalmente, só sem o link.
- O balão da dica acompanha a rolagem e fecha se o "?" sair da tela; em rolagens muito rápidas no celular, pode haver um leve atraso de reposicionamento.
- "Ver todas as perguntas" troca de aba: nesse caso continua valendo o comportamento anterior de descartar o que não foi salvo (registrado como pendência no `CONTEXTO.md`).
- Meses de exemplo que o usuário editar continuam marcados como exemplo (mesmo comportamento que já existia na lista).

## Próximos passos
- Bloco 3: Fator R e Anexo em linguagem natural (padrão do semáforo) e explicação única dos três pontos de equilíbrio.
- Issue separada para não perder alterações ao trocar de aba.
- Registrar a data exata da próxima coleta do Observatório.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Jysjppu3ZxHZKVkdUuezka
```
