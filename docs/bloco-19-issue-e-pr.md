# Bloco 19 — Issue e Pull Request

Issue e PR criados direto pelo Claude no GitHub.

## Issue #54 — [Melhoria] Knip, Commitlint e teste de mutação (Stryker) nas contas

**Tipo:** Melhoria

### Objetivo
Completar a esteira de qualidade pedida nas instruções do projeto com três ferramentas:
- **Knip:** acha código, exportações e bibliotecas que ficaram sem uso.
- **Commitlint:** padroniza as mensagens dos commits.
- **Stryker (teste de mutação):** altera de propósito as fórmulas de `calculos.js` e confere se os testes percebem. É a melhor medida de quanto as contas contábeis estão protegidas.

### Escopo
- [ ] Knip no CI, removendo o que ele achar sem uso.
- [ ] Commitlint no CI, conferindo os commits de cada PR. O padrão é "Bloco N: …" ou um tipo curto, como "fix: …". As mensagens que o próprio GitHub cria ficam de fora.
- [ ] Stryker em `calculos.js`, com testes novos para as fórmulas cujas mutações passavam despercebidas, e um mínimo de pontuação.
- [ ] Workflow próprio para o teste de mutação, que roda quando as contas mudam.

### Critério de aceite
- O Knip não acha nada sem uso.
- A pontuação de mutação de `calculos.js` fica em 80% ou mais.

## Pull Request — Bloco 19

Fecha #54.

> Este PR foi criado em cima do Bloco 18 (#53). Faça o merge do #53 primeiro.

### O que mudou
- **Knip** (`npm run knip`, no CI): achou 9 exportações sem uso, todas removidas.
  - `LogoMark` saiu dos exports do `App.jsx`.
  - Em `calculos.js`, `copiaSeguranca.js` e `termos.js`, o que só era usado dentro do próprio arquivo deixou de ser exportado.
  - Não sobrou nenhuma dependência sem uso.
- **Commitlint** (`commitlint.config.js`, no CI dos PRs):
  - O título do commit deve começar com "Bloco N:" ou com um tipo curto, como `fix:`, `test:` ou `docs:`. As regras estão no `CONTEXTO.md`.
  - Mensagens criadas pelo GitHub (merge, edição pela web) passam.
  - A mensagem de erro, em português, diz como corrigir.
- **Stryker** (`npm run test:mutacao`, workflow próprio `mutacao.yml`):
  - Altera as fórmulas de `calculos.js` (+ por −, > por >=, condições removidas) e mede quantas alterações os testes percebem.
  - Roda quando as contas ou os testes delas mudam, e o mínimo para passar é 80%.
- **20 testes novos de fórmula**, escritos a partir do que o Stryker mostrou que não estava protegido. Os principais:
  - **MEI:** o DAS entra no custo fixo, não há imposto sobre o preço e não há parceria. Nenhum teste cobria o MEI.
  - **Depreciação:** separa o ponto de equilíbrio financeiro do contábil. O exemplo tinha depreciação zerada, então isso nunca era testado.
  - **Limites do Simples:** R$ 180.000 ainda é a 1ª faixa, R$ 4,8 milhões ainda é Simples (19,5%) e Fator R de exatamente 28% vai para o Anexo III.
  - **Aluguel de cadeira:** só conta quem está ativo.
  - **Modo B:** markup, lucro por hora, margem de contribuição, ponto de equilíbrio do serviço, preço mínimo e preço ideal, cada um conferido pela definição.
  - **Indicadores:** margem ponderada pelo mix, ponto de equilíbrio em atendimentos, ponto de equilíbrio econômico e GAO.
  - **Pacote:** preço mínimo com comissões diferentes (média ponderada pelo preço) e com parceira.
  - **Posição na concorrência:** os limites exatos (2,5%, igual ao menor, igual ao maior).
  - **Planilha do Observatório:** cabeçalhos, ordem, distância, "Entra na comparação" e o preço de 180 dias, que ainda não conta como antigo.
- Versão do app: igual (v7.24). Só testes e ferramentas mudaram, e o comportamento continua o mesmo.

### Resultado
| Medida | Antes | Depois |
|---|---|---|
| Pontuação de mutação de `calculos.js` | 67,7% | **83,9%** |
| Testes unitários | 104 | 124 |
| Cobertura de ramos (contas, cópia, termos) | 92,7% | 94,6% |

**As 170 mutações que ainda passam** são, na maioria, textos de rótulo (nomes de formas de pagamento e de vínculos), proteções para dado ausente (`?.`) e trocas que não mudam o resultado. O relatório completo sai no artefato do workflow "Mutação".

### Como foi validado
- `npm run lint` e `npm run knip` passam sem erros.
- `npm run test:cobertura`: 124 testes passando, com 94,6% dos ramos.
- `npm run test:mutacao`: 83,86%, acima do mínimo de 80%.
- Testes E2E: 30 passando.
- Commitlint conferido com exemplos válidos e inválidos.

### Riscos e limitações
- **O teste de mutação leva cerca de 6 minutos.** Por isso fica num workflow separado e não bloqueia o merge.
- **Commitlint:** commits feitos pela web do GitHub com mensagem personalizada fora do padrão vão ser recusados. A mensagem padrão do GitHub ("Update …") passa.

### Próximos passos
- Bloco 20: teste automático de acessibilidade.

