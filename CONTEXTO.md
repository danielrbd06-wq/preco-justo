# Contexto do Projeto — Preço Justo

> **Leia este arquivo antes de qualquer mudança.** Vale para qualquer pessoa ou agente de IA, de qualquer modelo, que for trabalhar neste repositório.

## 1. O que é o projeto

Aplicativo (PWA) de **precificação e gestão gerencial** para pequenos e médios negócios do setor de beleza — principalmente **salões de beleza e barbearias** — no estado da **Bahia**, com possível expansão para o Nordeste.

- **Diferencial:** vai além da calculadora que para na margem de contribuição. Integra contabilidade gerencial: markup divisor, custeio, três pontos de equilíbrio (contábil, financeiro e econômico), ponto de equilíbrio pelo mix (MCP), GAO, DRE por competência, Simples Nacional com alíquota efetiva e Fator R.
- **Público:** profissionais de beleza geralmente **leigos em contabilidade**. O desafio central do produto é tornar a conta correta compreensível sem simplificá-la errado.
- **Visão de médio prazo:** mapa de Feira de Santana para análise de densidade e concorrência, observatório de mercado e benchmarking regional com dados de sindicatos oficiais.

## 2. Restrições (inegociáveis)

- **Proibido inventar dados.** Use apenas dados de fontes oficiais (sindicatos como SINDBEFS) e dados informados pelo próprio empreendedor. Quando não houver fonte, mostre isso ("aguardando fonte oficial") em vez de preencher com estimativa.
- **Conformidade tributária:** respeitar o regime aplicável (MEI, Simples Nacional — LC 123/2006, Fator R). Nenhum imposto incidente pode ser omitido.
- **LGPD:** dados financeiros e operacionais tratados como confidenciais. Hoje ficam salvos apenas no dispositivo do usuário (localStorage).
- **Travas de validação:** o sistema deve bloquear ou sinalizar dados matematicamente inconsistentes (percentuais somando 100% ou mais, jornadas irreais, custos zerados).
- Toda documentação e texto de interface em **português do Brasil**.

## 3. Fluxo de trabalho obrigatório

### Issues e Pull Requests
1. Crie uma **Issue** no GitHub para cada tarefa, classificada como **Correção**, **Melhoria** ou **Nova função**.
2. Toda entrega entra por **Pull Request**. Nada vai direto para a `main`.
3. Todo PR deve:
   - mencionar a Issue relacionada (`Refs #N` ou `Closes #N`);
   - explicar o que mudou;
   - descrever como foi validado;
   - registrar riscos, limitações e próximos passos.
4. Mantenha **este arquivo** atualizado quando o padrão ou o estado do projeto mudar.

### Interface (Motion Principles)
Siga a skill **Motion Principles**: https://github.com/kylezantos/design-principles

Toda interface deve ter, quando fizer sentido:
- lazy loading;
- skeleton screens no carregamento;
- animações suaves de entrada e saída;
- estados de progresso em elementos interativos;
- feedback visual para ações do usuário;
- transições consistentes entre telas, cards, modais e listas.

Antes de finalizar, revise a interface como **designer de produto sênior** e corrija o que parecer brusco, travado, genérico ou amador.

### Esteira de qualidade (aplicar quando fizer sentido para o porte do projeto)
1. **Observabilidade:** Sentry, Datadog, New Relic, OpenTelemetry.
2. **Qualidade e lint:** arch-contract, Biome, Commitlint, Knip, Stryker.
3. **Testes:** unitários, integração, end-to-end, Codecov, Playwright, Endtest.
4. **Segurança e operação:** rate limit, revisão de segurança, performance budget, separação backend/frontend, termos de uso e política de privacidade aprovados pelo jurídico.
5. **Arquitetura:** evitar overengineering e gargalos; componentizar desde o início; DRY com critério, sem abstrações prematuras; **não reconstruir componentes que já existem** (ex.: `CampoNumero`, `Campo`, `Ajuda`, `SecaoColapsavel`, `SemaforoDiagnostico`).

## 4. Arquitetura atual

- **React 18 + Vite 5 + Tailwind CSS 3**, gráficos com **Recharts**, ícones **lucide-react**, exportação Excel com **xlsx**, mapa com **Leaflet** 1.9.4 sobre o **OpenStreetMap**.
- PWA via **vite-plugin-pwa** (instalável, funciona offline).
- Telas e componentes em `src/App.jsx` (~7.500 linhas), com componentes reutilizáveis definidos no próprio arquivo.
- **Contas em `src/calculos.js`** (funções puras, sem React): leitura de valores, Simples Nacional, motores de preço (Modo A e B), custos variáveis, comissão e taxa médias, DRE, pontos de equilíbrio, pacote e comparação com a concorrência. Testadas em `src/calculos.test.js`.
- `src/MapaConcorrencia.jsx`: mapa do Observatório, carregado sob demanda (`React.lazy`) para o Leaflet não pesar no resto do app.
- Persistência: `window.storage` com fallback para `localStorage` (`listarComFallback()`), tudo no dispositivo do usuário.
- Autenticação com Supabase: **pausada** (não está em uso nesta versão).
- Deploy: **Vercel**, conectada a este repositório (push na `main` = deploy; cada PR ganha URL de preview).

## 5. Estado atual e próximos passos

As melhorias foram organizadas em **blocos** (os 7 da análise inicial e os seguintes), um PR por bloco, por ordem de risco e dependência (detalhes em `docs/analise-critica.md`).

| Bloco | Conteúdo | Status |
|---|---|---|
| 1 | Travas de jornada (31 dias / 24 h), modo "por duração" como padrão em novo custo variável, aviso de regime indefinido na Calculadora | ✅ Implementado (`docs/bloco-1-issues-e-pr.md`) |
| 2 | Dicas "?" com link para a explicação completa do FAQ; rótulo "dado real" / "exemplo" / "projeção" no DRE; aviso de coleta única no Observatório; correção do "Carregar exemplo" (Issue #4) | ✅ Implementado (`docs/bloco-2-issues-e-pr.md`) |
| 3 | Fator R/Anexo em linguagem natural (padrão semáforo); escada dos 3 pontos de equilíbrio com margem de segurança; leitura de valores no padrão brasileiro (Issue #11); percentuais com vírgula | ✅ Implementado (`docs/bloco-3-issues-e-pr.md`) |
| 4 | Comissão média da equipe ponderada pelos atendimentos; aluguel de cadeira nos dois lados (dono recebe: receita; profissional que aluga: custo fixo ou % por serviço) | ✅ Implementado (`docs/bloco-4-issues-e-pr.md`) |
| 5 | Taxa média de recebimento: formas de pagamento no Negócio (dinheiro, Pix, débito, crédito à vista e parcelado) com média ponderada, usada por serviço como a comissão média; ajustes visuais da Calculadora | ✅ Implementado (`docs/bloco-5-issues-e-pr.md`) |
| 6 | Observatório: mapa da concorrência (Leaflet + OpenStreetMap) em Feira de Santana, Irará e Salvador, com marcação por toque; preços dos concorrentes anotados pelo usuário e comparação com os preços dele (mediana, faixa e piso), com raio de distância | ✅ Implementado (`docs/bloco-6-issues-e-pr.md`) |
| 7 | Polimento visual (decidido com o Daniel): quebra de linha equilibrada (`text-wrap`), largura máxima de linha, rótulos sem vão ao quebrar, seções do Negócio sem linhas divisórias redundantes, títulos de seção sem corte, selos longos como nota de rodapé | ✅ Implementado (`docs/bloco-7-issue-e-pr.md`) |
| 8 | Esteira de qualidade: contas separadas em `src/calculos.js`, 38 testes das contas (Vitest), testes no navegador (Playwright) e verificação no GitHub (Actions) em cada PR | ✅ Implementado (`docs/bloco-8-issue-e-pr.md`) |
| 9 | Não perder trabalho: o que foi digitado sobrevive à troca de aba, ao recarregar e à atualização (auto-salvar descarrega pendências; rascunhos do serviço novo e do fechamento); aviso "Nova versão disponível"; cópia de segurança (baixar e restaurar) | ✅ Implementado (`docs/bloco-9-issues-e-pr.md`) |
| 10 | Excel do Observatório: botão "Baixar planilha (Excel)" no Observatório (Sobre, Concorrentes, Preços anotados, Comparação de preços) e as mesmas abas no relatório completo do Painel | ✅ Implementado (`docs/bloco-10-issue-e-pr.md`) |
| 11 | Lei do Salão-Parceiro: cota-parte do parceiro fora da receita bruta e do imposto | Próximo (pesquisa feita) |

### Esteira de qualidade (Bloco 8) — vale para toda mudança
- **Toda conta nova ou alterada vai para `src/calculos.js`, com teste em `src/calculos.test.js`.** Os valores esperados devem ser conferidos à mão e explicados no teste. A cobertura mínima de `calculos.js` é de 85% das linhas e 80% das funções; abaixo disso, a verificação falha.
- Testes de navegador em `tests/e2e/` (Playwright, celular 375 px e computador 1280 px): primeiro acesso, exemplo carregado, valores do Painel, todas as abas sem erro de JavaScript e sem rolagem lateral, Calculadora e Observatório. Fluxo novo importante ganha teste aqui.
- `.github/workflows/qualidade.yml` roda tudo em cada Pull Request para a `main`: `npm ci`, `npm run test:cobertura`, os dois builds e `npm run test:e2e`. A `main` deve ter a regra de proteção exigindo a verificação **"Testes e build"** antes do merge.
- Rodar localmente: `npm test` (contas), `npm run test:cobertura`, `npm run build && npm run test:e2e` (navegador; na primeira vez, `npx playwright install chromium`).
- Se um teste falhar porque a conta mudou de propósito, atualize o valor esperado **no mesmo PR** e explique a mudança na descrição.

### Não perder trabalho (Bloco 9) — vale para todo formulário novo
- **Formulário que salva sozinho:** use `useAutoSalvar`. Ele já salva o que estiver pendente quando o componente sai da tela (troca de aba), quando a página é escondida ou fechada e quando o evento `EVENTO_SALVAR_PENDENTES` é disparado (antes de atualizar o app e de baixar a cópia de segurança).
- **Formulário com botão "Salvar"** (ex.: serviço novo, fechamento do mês): guarde um **rascunho** no aparelho a cada mudança (`salvarComFallback` numa chave `rascunho:*`), recupere ao montar com `lerRascunho` e mostre "Recuperamos o que você estava digitando". Salvar, cancelar ou "começar de novo" apagam o rascunho. Não use o aviso do navegador ao sair como única proteção: ele não cobre a troca de aba.
- **Atualização do app:** o PWA está em modo `prompt`. A versão nova é baixada em segundo plano e o componente `AvisoNovaVersao` mostra "Nova versão disponível — Atualizar agora". O app procura versão nova a cada 30 minutos e quando volta para a tela. O build de arquivo único usa uma versão vazia do registro (plugin em `vite.single.config.js`).
- **Cópia de segurança:** `src/copiaSeguranca.js` (funções puras, testadas). O arquivo `.json` leva todas as chaves salvas do app. Chave nova de armazenamento entra na cópia automaticamente, desde que use `salvarComFallback`. Se mudar o formato do arquivo, aumente `FORMATO_COPIA` e mantenha a leitura dos formatos antigos.
- **Testes de navegador:** `tests/e2e/nao-perder-trabalho.spec.js` cobre a troca de aba no Negócio, o rascunho da Calculadora e a cópia de ida e volta. Os passos comuns ficam em `tests/e2e/ajuda.js`.

### Regras de tipografia e espaçamento (Bloco 7)
- **Alinhamento sempre à esquerda. Não justificar texto:** em colunas estreitas e sem hifenização em português, o justificado abre "rios" de espaço entre as palavras e piora a leitura (WCAG 1.4.8). Decisão tomada com o Daniel.
- Parágrafos, itens de lista e rótulos usam `text-wrap: pretty` (sem palavra sozinha na última linha); títulos, `text-wrap: balance`.
- Parágrafos dentro do conteúdo têm largura máxima de **75 caracteres** (`main p { max-width: 75ch }`). Blocos com `text-center` continuam centralizados.
- Rótulo de campo é **bloco** (`block leading-snug`): em linha, ele herda a altura de linha do texto base e abre um vão ao quebrar.
- Cartões irmãos ficam a **12 px** (`space-y-3`), no Negócio e no Painel. Cartões com borda não levam linha divisória entre si.
- Título de seção pode quebrar linha; quem encurta (`truncate`) é o resumo ao lado.
- `Selo` com mais de 45 caracteres vira automaticamente nota de rodapé (mesma cor e ícone, sem fundo). Pílula só para rótulos curtos.

### Componentes de explicação (reutilize, não recrie)
- **`Ajuda`** — o "?" ao lado de um campo. Aceita `texto` (dica curta) e `faq` (id de uma pergunta de `FAQ_DADOS`, que adiciona o link "Entender melhor"). O balão é renderizado num portal com posição fixa, para não ser cortado por seções com `overflow: hidden` nem sair da tela no celular. `Campo`, `CampoPct` e `SecaoColapsavel` repassam `ajuda` e `faq`.
- **`PainelExplicacao`** — mostra a resposta completa do FAQ por cima da tela (bottom sheet no celular, diálogo centralizado no computador). **Não troque de aba para explicar algo:** trocar de aba descarta o que ainda não foi salvo (rascunho de serviço novo e os últimos segundos digitados no Negócio).
- **`Selo`** — selos de origem do dado: `real`, `calculado`, `aguardando`, `legal`. Todo número exibido deve deixar claro se é dado real, projeção ou exemplo.
- **`CaixaSemaforo`** — caixa 🔴🟡🟢⚪ com título curto e frase com número concreto e próximo passo. Usada no diagnóstico de cada serviço, no enquadramento do Simples (`DiagnosticoSimples`) e na escada de pontos de equilíbrio (`EscadaPontoEquilibrio`). Use-a para qualquer novo diagnóstico em linguagem natural.
- **`useBalaoAncorado`** — posicionamento compartilhado dos balões `Ajuda` e `InfoConceito` (portal, posição fixa, acompanha a rolagem). Qualquer novo balão deve usá-lo.

### Profissionais, comissão e aluguel de cadeira (Bloco 4)
- Cada profissional tem `vinculo`: `comissao` (com `comissaoPct` e `atendimentosMes`), `dono` (só `atendimentosMes`, pesa com 0%) ou `aluguel` (com `aluguelMes`). Cadastros antigos sem o campo são tratados como `comissao`.
- **Comissão média da equipe** (`calcularComissaoEquipe`): média dos comissionados e do dono, ponderada pelos atendimentos de cada um. Só existe com 2+ pessoas e pelo menos 1 comissionado. Sem os atendimentos de alguém, vira média simples e a tela avisa.
- Cada serviço tem `comissaoModo`: `equipe` ou `propria`. **Use sempre `comissaoEfetiva(servico, nd)`** para saber a comissão que entra no preço. Serviços salvos antes do Bloco 4 não têm o campo e mantêm a comissão própria.
- **Aluguel de cadeiras recebido** (`nd.receitaAluguelCadeiras`): é **receita**, em linha própria no DRE ("(+) Aluguel de cadeiras recebido"), nunca custo negativo. Para o preço e os pontos de equilíbrio, use o custo fixo líquido (`nd.custoFixoLiquido`, `dre.custosFixosLiquidos`). Fechamentos guardam `aluguelRecebidoSnapshot`; os antigos não têm o campo (vale 0).
- Quem aluga cadeira não entra na comissão média nem no "número de profissionais" da capacidade produtiva.
- Modelo de operação `locatario` (quem aluga cadeira em outro salão): aluguel fixo vai para "Aluguel do espaço" (custo fixo); aluguel em % por serviço vai no campo de comissão, rotulado "% que fica com o salão".

### Formas de pagamento e taxa média de recebimento (Bloco 5)
- `n.recebimento` guarda, por forma (`FORMAS_PAGAMENTO`: `dinheiro`, `pix`, `debito`, `credito`, `parcelado`), `participacaoPct` (parte das vendas) e `taxaPct`. Dinheiro não tem taxa. **Nenhuma taxa vem preenchida**: cada maquininha e banco cobra diferente; o número vem do extrato do usuário.
- **Taxa média** (`calcularTaxaRecebimento`): média das taxas ponderada pela parte das vendas. Só vale como média do negócio (`nd.taxaRecebimento`) quando as partes somam 100% (tolerância de 0,5 ponto); antes disso, a tela mostra quanto falta.
- Cada serviço tem `taxaModo`: `negocio` ou `propria`. **Use sempre `taxaEfetiva(servico, nd)`** para saber a taxa que entra no preço (motores, pacote, Fechamento, Excel). Serviços salvos antes do Bloco 5 não têm o campo e mantêm a taxa própria.
- Crédito parcelado é uma linha só, com a taxa média já somada à da antecipação, quando houver (decisão com o Daniel). Mensalidade ou aluguel da maquininha é custo fixo, não entra na taxa.
- Seleção "média ou própria" e a caixa "de onde a média saiu" são componentes compartilhados: **`SeletorOrigem`** e **`ComposicaoMedia`**. Use-os para qualquer novo valor médio do negócio que um serviço possa adotar.

### Observatório: mapa e preços da concorrência (Bloco 6)
- **Os preços dos concorrentes são anotados pelo próprio usuário**, sempre com data e "onde viu" (decisão com o Daniel). O app não traz nem estima preço de concorrente. Nada de dados de exemplo no Observatório.
- **Posição no mapa só por toque do usuário.** A coleta de referência (`ESTABELECIMENTOS_REAIS`) não tem coordenadas e não é plotada: cada item tem "marcar no mapa", que cria um concorrente com nome, tipo e bairro já preenchidos. Não foi encontrada fonte confiável para coordenadas de bairros; não invente.
- Cidades: `CIDADES_OBSERVATORIO` (Feira de Santana, Irará — cidade de testes do app — e Salvador). O centro de cada cidade só posiciona a vista inicial (coordenadas da Wikipédia).
- Armazenamento local: `observatorio:concorrentes` (lista de `{ id, cidade, nome, tipo, bairro, lat, lng, precos: [{ id, servicoId, servicoNome, valor, data, fonte }] }`) e `observatorio:meus-locais` (`{ [cidade]: { lat, lng } }`).
- Comparação por serviço: só o **preço mais recente de cada concorrente** (`ultimoPrecoPorConcorrente`), **mediana** em vez de média, faixa mín.–máx. e o **piso** do serviço (`pisoDoServico`: preço com margem 0). Avisos: menos de 3 observações; preços com mais de 180 dias; mediana abaixo do piso.
- **Planilha (Bloco 10):** as linhas vêm de `linhasPlanilhaObservatorio` (`calculos.js`, testada) e a posição de cada serviço de `posicaoNaConcorrencia`, a mesma função usada na tela. Qualquer regra nova da comparação muda nos dois lugares de uma vez.
- Com o local do negócio marcado, o filtro de raio (1, 3 ou 5 km, haversine) vale para o mapa e para a comparação.
- Tiles do OpenStreetMap: atribuição obrigatória (já no mapa) e uso moderado, pela política de uso dos tiles. Sem internet, as ruas não carregam; a lista e a comparação continuam funcionando. Se o uso crescer muito, trocar por um provedor de tiles com plano próprio.
- O mapa fica num contexto de empilhamento próprio (`z-index: 0`) para os painéis do Leaflet não cobrirem a barra de navegação e os balões do app. No tema escuro, os tiles são invertidos por CSS.

### Formatação e leitura de números (padrão brasileiro)
- Exibição: `fmtBRL` (R$ 2.500,00) e `fmtPct` (6,00%), sempre com vírgula decimal.
- Entrada: **todo campo em que o usuário digita valor deve passar por `normalizarValorBR`**. Ele entende "2.500", "2.500,00", "1.234.567" e "2500,50". Ler direto com `Number()` ou trocar só a vírgula por ponto grava "2.500" como R$ 2,50.

### Pendências e achados para virar Issue
- **[Tributário — Bloco 11, pesquisa feita]** Lei do Salão-Parceiro: regras conferidas com o Daniel em 10/10/2026 (Lei 12.592/2012, art. 1º-A, §§ 4º, 5º, 7º, 8º e 10; art. 1º-C; regras do Simples hoje na Resolução CGSN 140/2018). A cota-parte do profissional-parceiro sai da receita bruta do salão se o parceiro tiver CNPJ; salão-parceiro não pode ser MEI; contrato escrito e homologado; sem contrato, vínculo empregatício. Plano: tipo de profissional "Parceiro", imposto sobre o preço × (1 − cota do parceiro), DRE com a cota-parte deduzida da receita.
- **[Nova função — futuro]** Média anônima de preços entre usuários do app, por bairro. Exige servidor, consentimento, termos de uso e política de privacidade aprovados pelo jurídico (LGPD) e um número mínimo de negócios por grupo para não identificar ninguém. Adiada por decisão do Daniel no Bloco 6.
- **[Dado]** A data exata da coleta dos estabelecimentos do Observatório não foi registrada. A tela mostra "até agosto de 2026" (limite comprovado pelo build de 16/08/2026). Ao refazer a coleta, preencher `COLETA_ESTABELECIMENTOS.data` em `src/App.jsx`.
- **[Qualidade — próximo passo]** Lint e formatação automáticos (Biome) e cobertura de ramos (hoje 66%) ficaram de fora do Bloco 8 para não misturar milhares de mudanças de formatação com a esteira. Entram em um PR próprio.
- **[Documento]** Rascunho dos termos de uso e da política de privacidade, para revisão jurídica antes de entrar no app.
- **[Segurança]** A biblioteca `xlsx` 0.18.5 tem alertas conhecidos (prototype pollution e ReDoS) que afetam a **leitura** de planilhas. O app hoje só **gera** planilhas (não lê arquivos do usuário), então o risco prático é baixo — reavaliar se um dia o app passar a importar `.xlsx`.
