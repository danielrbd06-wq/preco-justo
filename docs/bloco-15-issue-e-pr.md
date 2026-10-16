# Bloco 15 — Issue e Pull Request

Issue e PR criados direto pelo Claude no GitHub.

## Issue #45 — [Melhoria] Biome (lint e formatação) e mais testes em calculos.js

**Tipo:** Melhoria

### Objetivo
Completar a esteira de qualidade com lint e formatação automáticos (Biome) e aumentar a cobertura de testes de `calculos.js`, que estava em 71,8% dos ramos. Os dois ficaram de fora do Bloco 8 de propósito, para não misturar milhares de linhas de formatação com a esteira.

### Escopo
- [ ] Biome 2.5.15 com o preset recomendado e os scripts `npm run lint` (`biome ci`) e `npm run formatar`.
- [ ] Corrigir o que o lint aponta e justificar no código o que é intencional.
- [ ] Formatar todo o código num commit só de formatação, registrado em `.git-blame-ignore-revs`.
- [ ] Adicionar o passo de lint no CI.
- [ ] Criar testes dos casos-limite de `calculos.js` e subir o piso de cobertura, incluindo ramos.

### Critério de aceite
- `npm run lint` passa sem erros.
- A cobertura de ramos de `calculos.js` fica em 85% ou mais.
- Todos os testes E2E continuam passando, sem mudança de comportamento.

## Pull Request — Bloco 15

Fecha #45.

> Este PR foi criado em cima dos Blocos 13 (#42) e 14 (#44). Faça o merge na ordem #42, #44 e depois este. A cada merge, este PR passa a mostrar menos mudanças.

### O que mudou
Quatro commits, para facilitar a leitura:
1. **Configuração e correções do lint**
   - Biome 2.5.15 com o preset recomendado, e os scripts `npm run lint` (`biome ci`) e `npm run formatar`.
   - `type="button"` em todos os botões (o app não tem `<form>`).
   - `forEach` sem valor de retorno, encadeamento opcional e template strings.
   - Saíram imports, uma variável e dois componentes sem uso (`Secao` e `LinhaIndicador`).
   - Os 9 casos intencionais ganharam `biome-ignore` com o motivo escrito: balões que fecham ao toque, rótulos que envolvem o `CampoMoeda`, seletor segmentado e foco no nome do concorrente.
2. **Formatação de todo o código, sem mudança de comportamento**
   - O `App.jsx` passou de cerca de 8,1 mil para 12,3 mil linhas, por causa das quebras em 140 colunas.
   - O commit está em `.git-blame-ignore-revs`, então o "blame" do GitHub o ignora.
3. **CI:** novo passo "Lint e formatação (Biome)".
4. **Testes**
   - 16 testes novos de casos-limite em `calculos.js`: insumo compartilhado (por unidade e por duração), "já tenho preço", pacote, guardas dos motores, indicadores sem movimento, posição na concorrência e planilha com dados faltando.
   - Mais 1 teste em `copiaSeguranca.js`.
   - O piso de cobertura subiu para 95% das linhas, 90% das funções e 85% dos ramos, e o `termos.js` entrou na conta.

### Como foi validado
- `npm run lint`: sem erros. Ficam 23 avisos, explicados abaixo.
- Testes unitários: 101 passando (eram 84).
- Cobertura de ramos:
  - `calculos.js`: de 71,8% para 92,9%;
  - total: 92,7% dos ramos e 99,7% das linhas.
- Testes E2E: 28 passando no celular e no computador, depois da formatação.
- `build` e `build:single` geram sem erro.

### Riscos e limitações
- **Diff grande:** é mecânico, porque o formatador não muda o que o código faz. Os E2E passando depois do commit de formatação confirmam isso.
- **Branches antigos:** qualquer branch criado antes deste PR vai ter conflito em quase todo o `App.jsx`. Não há nenhum aberto além dos #42 e #44, que já estão na base deste.
- **23 avisos ficam como aviso:**
  - 13 de dependências de hooks (`useExhaustiveDependencies`), em geral omitidas de propósito, como em "ler o rascunho só ao montar";
  - 10 de `key` por índice em listas fixas de texto (`noArrayIndexKey`).
  - Ainda precisam ser revistos um a um.

### Próximos passos
- Revisar os 23 avisos.
- Migrar os rascunhos do serviço novo e do fechamento para `useRascunho`.

