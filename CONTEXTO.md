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

- **React 18 + Vite 5 + Tailwind CSS 3**, gráficos com **Recharts**, ícones **lucide-react**, exportação Excel com **xlsx**.
- PWA via **vite-plugin-pwa** (instalável, funciona offline).
- Código principal em um único arquivo: `src/App.jsx` (~6.300 linhas), com componentes reutilizáveis definidos no próprio arquivo.
- Persistência: `window.storage` com fallback para `localStorage` (`listarComFallback()`), tudo no dispositivo do usuário.
- Autenticação com Supabase: **pausada** (não está em uso nesta versão).
- Deploy: **Vercel**, conectada a este repositório (push na `main` = deploy; cada PR ganha URL de preview).

## 5. Estado atual e próximos passos

As melhorias foram organizadas em **7 blocos**, um PR por bloco, por ordem de risco e dependência (detalhes em `docs/analise-critica.md`).

| Bloco | Conteúdo | Status |
|---|---|---|
| 1 | Travas de jornada (31 dias / 24 h), modo "por duração" como padrão em novo custo variável, aviso de regime indefinido na Calculadora | ✅ Implementado (`docs/bloco-1-issues-e-pr.md`) |
| 2 | Dicas "?" com link para a explicação completa do FAQ; rótulo "dado real" / "exemplo" / "projeção" no DRE; aviso de coleta única no Observatório; correção do "Carregar exemplo" (Issue #4) | ✅ Implementado (`docs/bloco-2-issues-e-pr.md`) |
| 3 | Fator R/Anexo em linguagem natural (padrão semáforo); escada dos 3 pontos de equilíbrio com margem de segurança; leitura de valores no padrão brasileiro (Issue #11); percentuais com vírgula | ✅ Implementado (`docs/bloco-3-issues-e-pr.md`) |
| 4 | Comissão por profissional (opcional); modo "aluguel de cadeira" | Pendente |
| 5 | Calculadora guiada de taxa de cartão ponderada | Pendente |
| 6 | Benchmarking regional agregado e mapa (Leaflet + OpenStreetMap) | Pendente |
| 7 | Polimento visual (decidido com o Daniel): quebra de linha equilibrada (`text-wrap`), largura máxima de linha, rótulos sem vão ao quebrar, seções do Negócio sem linhas divisórias redundantes, títulos de seção sem corte, selos longos como nota de rodapé | ✅ Implementado (`docs/bloco-7-issue-e-pr.md`) |

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

### Formatação e leitura de números (padrão brasileiro)
- Exibição: `fmtBRL` (R$ 2.500,00) e `fmtPct` (6,00%), sempre com vírgula decimal.
- Entrada: **todo campo em que o usuário digita valor deve passar por `normalizarValorBR`**. Ele entende "2.500", "2.500,00", "1.234.567" e "2500,50". Ler direto com `Number()` ou trocar só a vírgula por ponto grava "2.500" como R$ 2,50.

### Pendências e achados para virar Issue
- **[Dado]** A data exata da coleta dos estabelecimentos do Observatório não foi registrada. A tela mostra "até agosto de 2026" (limite comprovado pelo build de 16/08/2026). Ao refazer a coleta, preencher `COLETA_ESTABELECIMENTOS.data` em `src/App.jsx`.
- **[Qualidade]** O projeto ainda não tem testes automatizados no repositório. Os blocos 1 a 3 foram validados com roteiros Playwright fora do repositório. Candidatos óbvios para os primeiros testes: `normalizarValorBR`, `aliquotaEfetiva`, `computeNegocioDerivado` e os pontos de equilíbrio.
- **[Correção]** Mudar de aba descarta alterações ainda não salvas (o auto-salvar do Negócio espera 1,2 s; o rascunho de serviço novo da Calculadora não é guardado). Já existia antes dos blocos; vale tratar em bloco próprio.
- **[Segurança]** A biblioteca `xlsx` 0.18.5 tem alertas conhecidos (prototype pollution e ReDoS) que afetam a **leitura** de planilhas. O app hoje só **gera** planilhas (não lê arquivos do usuário), então o risco prático é baixo — reavaliar se um dia o app passar a importar `.xlsx`.
