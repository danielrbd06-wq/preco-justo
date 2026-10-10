# Bloco 8 — Issue e Pull Request

Crie a Issue **antes** de abrir o Pull Request e não a feche: o merge do PR fecha. Como o último foi o PR #25, ela deve sair com o número **#26**. Se sair outro, ajuste a linha `Closes` do PR.

---

## Issue #26

**Título:**
```
[Nova função] Esteira de qualidade: testes automáticos antes do merge
```

**Descrição:**
```
Hoje nenhum teste roda no repositório. As contas do app (preço, Simples Nacional, pontos de equilíbrio, comissão e taxa médias, comparação com a concorrência) foram conferidas a cada bloco com roteiros fora do GitHub. Uma mudança futura pode quebrar uma conta sem ninguém perceber, e o erro vai direto para o site.

As instruções do projeto pedem uma esteira de qualidade antes de qualquer código entrar na main.

Critério de aceite:
- As contas ficam num arquivo próprio, sem tela, que pode ser testado sozinho, sem mudar nenhum resultado.
- Testes automáticos das contas, com valores conferidos à mão (os mesmos do "Carregar exemplo").
- Testes no navegador, no celular e no computador: primeiro acesso, exemplo, valores do Painel, todas as abas sem erro e sem rolagem lateral, Calculadora e Observatório.
- O GitHub roda tudo em cada Pull Request e marca ❌ se algo falhar.
- A main fica protegida: o merge só é liberado com a verificação verde.
- CONTEXTO.md com a regra: conta nova entra com teste.
```

---

## Pull Request

**Título:**
```
Bloco 8: esteira de qualidade com testes automáticos e verificação no GitHub
```

**Descrição:**
```markdown
Closes #26

## O que mudou

### Contas separadas da tela
- Novo arquivo `src/calculos.js` com as 34 funções e tabelas de cálculo que estavam no `App.jsx`: leitura de valores no padrão brasileiro, formatação, tabelas e alíquota efetiva do Simples Nacional, comissão média, taxa média de recebimento, `computeNegocioDerivado`, custos variáveis, os dois motores de preço (Modo A e Modo B), DRE, preço mínimo de pacote e comparação com a concorrência.
- O código foi **movido sem alteração**; o `App.jsx` passou a importá-lo.
- O bloco de indicadores do Painel (ponto de equilíbrio pelo mix, os três pontos de equilíbrio, margem de segurança e GAO) virou a função `calcularIndicadoresGerenciais`, também testada. O Painel usa o resultado dela, com os mesmos nomes de antes.

### Testes das contas — Vitest (`src/calculos.test.js`, 38 testes)
- Valores conferidos à mão e iguais aos do "Carregar exemplo":
  - leitura de "2.500", "2.500,00", "1.234.567" e outros;
  - Simples Nacional: 1ª e 2ª faixa, limite de R$ 4,8 milhões, Fator R;
  - preços de R$ 20,22, R$ 37,66 e R$ 160,76;
  - Modo A e Modo B batendo;
  - DRE (receita de R$ 8.998,96, resultado de R$ 258,37);
  - pontos de equilíbrio (R$ 8.390,05 e R$ 8.540,89) e margem de segurança de 6,8%;
  - comissão média de 27,8%, aluguel de cadeira e resultado de R$ 458,12;
  - taxa média de 0,85%;
  - piso de R$ 11,93, mediana e distância.
- Cobertura mínima de `calculos.js`: 85% das linhas e 80% das funções (hoje 91,9% e 86,7%). Abaixo disso, a verificação falha.

### Testes no navegador — Playwright (`tests/e2e/app.spec.js`)
- O app compilado é aberto como no celular (375 px) e no computador (1280 px). Testes:
  - primeiro acesso e exemplo, com os valores do Painel;
  - todas as abas sem erro de JavaScript e sem rolagem lateral;
  - preço salvo na Calculadora;
  - Observatório: mapa carregado, atribuição do OpenStreetMap, concorrente e preço anotados e comparação com o piso.

### Verificação no GitHub (`.github/workflows/qualidade.yml`)
- Em cada Pull Request para a `main` e em cada merge: instala as dependências (`npm ci`), roda os testes das contas com cobertura, os dois builds (PWA e arquivo único) e os testes no navegador. Se algo falhar, o relatório fica guardado por 7 dias.
- Com a regra de proteção da `main` ("Testes e build" obrigatório), o merge só é liberado com a verificação verde.

### Outros
- Novas dependências só de desenvolvimento, em versões fixas: `vitest` 2.1.9, `@vitest/coverage-v8` 2.1.9 e `@playwright/test` 1.56.0. Nada muda no que o usuário baixa.
- Novos comandos: `npm test`, `npm run test:cobertura` e `npm run test:e2e`.
- Versão exibida no app: v7.14 → v7.15 (só para confirmar a publicação; o app funciona igual).
- `CONTEXTO.md`: nova seção "Esteira de qualidade" (conta nova entra com teste, como rodar, o que fazer quando uma conta muda de propósito), blocos 9 e 10 registrados e a pendência de testes trocada pelo próximo passo (Biome).

## Como foi validado
- 38 testes das contas passando, com cobertura de 91,9% das linhas.
- **Teste do teste:** mudei de propósito a alíquota da 1ª faixa do Anexo III de 6% para 7%. Sete testes falharam, como esperado; com o valor certo de volta, todos passam.
- 8 testes no navegador passando (4 no celular e 4 no computador), contra o build de produção.
- Roteiros de regressão dos blocos 3 a 6 contra o build novo, com os mesmos números de antes: DRE de R$ 8.998,96, comissão média de 27,8%, DRE com aluguel, taxa média de 0,85%, preços de R$ 11,70 e R$ 12,05, comparação com a concorrência. Nenhum erro de JavaScript e nenhuma rolagem lateral.
- Builds de produção (PWA e arquivo único) sem erros.
- **A verificação no GitHub roda pela primeira vez neste PR.** Ela só pôde ser conferida aqui depois de criada; o resultado aparece na própria página do PR.

## Riscos e limitações
- **Movimentação grande de código:** 34 funções mudaram de arquivo. O risco foi coberto pelos testes novos e pela regressão com os mesmos números de antes.
- A verificação leva alguns minutos por PR (a maior parte é instalar o navegador).
- Cobertura de ramos ainda em 66%: casos de borda menos comuns (por exemplo, serviço sem volume) ainda não têm teste próprio.
- Lint e formatação automáticos (Biome) ficaram para um PR próprio, para não misturar milhares de mudanças de formatação com esta esteira.
- A regra de proteção da `main` é configurada no GitHub (Settings), não pelo código; sem ela, a verificação avisa, mas não bloqueia.

## Próximos passos
- Bloco 9: trocar de aba sem perder o que foi digitado e aviso de "nova versão disponível", com testes no navegador para os dois.
- Biome (lint e formatação) em PR próprio.
- Bloco 10: Excel do Observatório.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Jysjppu3ZxHZKVkdUuezka
```
