# Bloco 7 — Issue e Pull Request

Crie a Issue **antes** de abrir o Pull Request e não a feche: o merge do PR fecha. Ela deve sair com o número **#13** (o último foi o PR #12). Se sair outro, ajuste a linha `Closes` do PR.

---

## Issue #13

**Título:**
```
[Melhoria] Polimento visual: textos, espaçamentos e selos
```

**Descrição:**
```
Revisão de tipografia e espaçamento combinada depois do Bloco 3. Problemas encontrados nas telas:

- Rótulos de campo que quebram em duas linhas ficam com um vão grande entre elas (ex.: "Capital investido no / negócio").
- Na aba Negócio, cada seção já é um cartão com borda, mas há uma linha divisória entre eles, somando cerca de 50 px de espaço, contra 12 px entre os cartões do Painel.
- No celular, o título das seções é cortado ("Contas Fixas…") enquanto o resumo ao lado aparece inteiro.
- O link "recarregar dados de exemplo" tem o ícone à esquerda e o texto centralizado.
- Selos com texto longo (como o do SINDECOBE) viram um balão de várias linhas, com o ícone solto.
- No computador, os textos de apoio ocupam a largura inteira dos cartões, com linhas longas demais para ler.
- Parágrafos terminam com uma palavra sozinha na última linha.

Decisão: o alinhamento continua à esquerda. Texto justificado não será usado, porque em colunas estreitas e sem hifenização em português ele abre espaços irregulares entre as palavras e piora a leitura (WCAG 1.4.8).

Critério de aceite:
- Rótulos que quebram linha sem vão extra.
- Seções do Negócio com o mesmo espaçamento do Painel e sem linhas divisórias redundantes.
- Título das seções sem corte no celular.
- Selos longos exibidos como nota de rodapé.
- Textos com largura máxima de linha e sem palavra sozinha no fim.
- Nenhuma tela com rolagem horizontal, no celular e no computador.
```

---

## Pull Request

**Título:**
```
Bloco 7: polimento visual de textos, espaçamentos e selos
```

**Descrição:**
```markdown
Closes #13

## O que mudou

### Tipografia de leitura
- `text-wrap: pretty` em parágrafos, itens de lista e rótulos (sem palavra sozinha na última linha) e `text-wrap: balance` em títulos. Navegadores que não suportam simplesmente ignoram.
- Largura máxima de linha: parágrafos em tamanho normal com até **75 caracteres**; legendas pequenas (10 a 12 px) com até **42rem** (~670 px). Um limite único em caracteres encolhia demais as legendas pequenas e quebrava frases curtas em duas linhas no computador. Blocos centralizados continuam centralizados.
- Alinhamento à esquerda mantido em todo o app. **Texto justificado não foi usado**, por decisão registrada no `CONTEXTO.md`.

### Espaçamentos
- Rótulos de campo viraram bloco (`block leading-snug`). Antes, ao quebrar em duas linhas, herdavam a altura de linha do texto base (24 px) e ficavam com um vão entre as linhas.
- Aba Negócio: removidas as 7 linhas divisórias entre as seções (cada seção já é um cartão com borda) e espaçamento de 12 px entre elas, igual ao do Painel. Antes eram cerca de 50 px.

### Seções recolhíveis
- O título pode quebrar em duas linhas e não é mais cortado com "…" no celular. Quem encurta agora é o resumo ao lado.
- O "?" do título fica dentro do texto e acompanha a última palavra quando o título quebra.

### Selos e notas
- `Selo` com mais de 45 caracteres vira automaticamente nota de rodapé (mesma cor e ícone, sem fundo nem borda). Afeta os selos do SINDECOBE, da tabela do Simples Nacional e da tabela de preços dos sindicatos no Observatório. Os selos curtos continuam como pílula.
- O aviso de coleta do Observatório passou a seguir a mesma regra de largura das outras legendas.
- O link "recarregar dados de exemplo" ficou com ícone e texto alinhados à esquerda.

### Outros
- Versão exibida no app: v7.10 → v7.11.
- `CONTEXTO.md`: Bloco 7 concluído e nova seção "Regras de tipografia e espaçamento" para os próximos blocos seguirem.

## Como foi validado
- Sintaxe com esbuild e build de produção (PWA e arquivo único) sem erros.
- Capturas de página inteira das 6 abas, antes e depois, no celular (375 px) e no computador (1280 px), comparadas lado a lado. A aba Negócio ficou 322 px mais curta no celular sem perder conteúdo.
- Nenhuma rolagem horizontal em nenhuma aba, nos dois tamanhos.
- Medido no navegador: legenda pequena com largura máxima de 672 px, texto normal com ~659 px (75 caracteres), `text-wrap: pretty` aplicado; "?" dentro do título da seção, logo após a última palavra.
- Regressão dos blocos 1, 2 e 3: avisos de jornada e de regime, "Carregar exemplo", dicas e painel de explicação, rascunho da Calculadora, selos do DRE, Observatório, os cinco cenários do Simples Nacional, a escada de pontos de equilíbrio e a leitura de valores ("2.500" → R$ 2.500,00). Nenhum erro de JavaScript.

## Riscos e limitações
- As regras de largura e de quebra de linha são globais (valem para qualquer parágrafo dentro do conteúdo). Telas futuras herdam o padrão automaticamente; um parágrafo que precise ocupar a largura toda terá de declarar isso.
- `text-wrap: pretty` e `balance` não existem em navegadores mais antigos; nesses, o texto quebra como antes, sem nenhum erro.
- O limite de 45 caracteres que transforma o selo em nota é uma regra simples por tamanho de texto; um selo curto que precise ser nota (ou o contrário) teria de ser ajustado à mão.

## Próximos passos
- Bloco 4: comissão por profissional e modo "aluguel de cadeira".
- Primeiros testes automatizados no repositório.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Jysjppu3ZxHZKVkdUuezka
```
