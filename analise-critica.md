# Análise Crítica — Preço Justo
### Precificação e Gestão para Salões, Barbearias e Segmentos de Beleza

**Persona da análise:** Contador Gerencial sênior (20 anos de mercado) e Doutor em Contabilidade Gerencial com ênfase em Controladoria, com bagagem complementar em programação, design de software e product management.

**Data:** 20 de agosto de 2026
**Escopo:** Leitura direta do código-fonte (`app.jsx`, 6.327 linhas), cruzado com o build standalone (`app_1__1_.html`) e o pacote de distribuição PWA (`app__1_.zip`) — os três arquivos são consistentes entre si, então as observações valem para a versão atual do app como um todo.
**Natureza:** Documento estritamente consultivo e analítico. Nenhuma alteração de código, texto ou estrutura foi feita.

---

## Sumário

- [Resumo Executivo](#resumo-executivo)
- [1. Diagnóstico Geral](#1-diagnóstico-geral)
- [2. Principais Gargalos para o Público Leigo](#2-principais-gargalos-para-o-público-leigo)
- [3. Sugestões de Melhorias por Módulo](#3-sugestões-de-melhorias-por-módulo)
- [4. Plano de Ação Priorizado](#4-plano-de-ação-priorizado)

---

## Resumo Executivo

- **O motor de cálculo é tecnicamente correto e, em vários pontos, mais rigoroso do que soluções comerciais equivalentes no mercado** — alíquota efetiva progressiva do Simples Nacional, Fator R com base legal citada, distinção correta entre MEI (custo fixo) e Simples (percentual), DRE histórica "congelada", três pontos de equilíbrio corretamente diferenciados.
- **O princípio de não inventar dados é verificável no próprio código**, não apenas um valor declarado: há selos de "aguardando fonte oficial" em vez de dados forjados, e ressalvas legais explícitas sobre onde um dado real não pode ser aplicado.
- **A tensão central do produto:** a conta por trás é sofisticada e correta, mas a *apresentação* ainda expõe boa parte dessa complexidade ao usuário leigo em vez de traduzi-la — jargão técnico (Fator R, RBT12, alíquota efetiva) aparece sem tradução exatamente nos pontos de maior densidade cognitiva.
- **Uma lacuna concreta do briefing original ainda não foi fechada:** trava lógica contra "jornadas irreais" (dias/horas trabalhadas sem teto).
- O plano de ação ao final separa ganhos rápidos (baixo esforço, alto retorno) de iniciativas que merecem Issue própria.

---

## 1. Diagnóstico Geral

### 1.1 Visão contábil: o motor de cálculo é sólido

- `calcularServico` usa a fórmula de **markup divisor** (preço = custo base ÷ (1 − Σ%)), tecnicamente correta quando comissão, taxa de cartão e imposto incidem sobre o *preço de venda* — não sobre o custo. É um erro comum em calculadoras amadoras usar a base errada.
- `aliquotaEfetiva()` implementa a **alíquota efetiva progressiva** do Simples Nacional — (RBT12 × alíquota nominal − parcela a deduzir) ÷ RBT12 — em vez da alíquota nominal simples, que é o erro mais comum em apps concorrentes.
- O **Fator R** é calculado corretamente (`folha12 / rbt12 >= 0,28`), e a exceção para cabeleireiro/barbeiro/manicure/pedicure/esteticista/depilador cita a base legal real (Solução de Consulta Cosit nº 127/2021), com a ressalva explícita "confirme com seu contador antes de decidir" — postura tecnicamente honesta, não uma afirmação categórica.
- **DAS-MEI entra como custo fixo, não como imposto percentual** — correto, já que é valor fixo mensal, diferente do Simples Nacional (percentual sobre faturamento). Muitos apps tratam os dois regimes com a mesma lógica, o que é um erro conceitual.
- **Pró-labore está dentro do custo fixo total** — evita o erro clássico de tratar o trabalho do dono como "grátis" na formação de preço.
- Existem **três pontos de equilíbrio** — contábil, financeiro (exclui custos não-caixa como depreciação) e econômico (inclui custo de oportunidade do capital investido) — além do **ponto de equilíbrio ponderado pelo mix de vendas** (MCP), todos com citação acadêmica correta (Padoveze; Perez Jr., Oliveira e Costa).
- A **DRE do Fechamento Mensal fica "congelada"**: `montarDREMensal()` não recalcula com a configuração atual — preserva o dado real de cada mês mesmo que o custo fixo ou o regime tributário mudem depois. É uma sutileza que a maioria dos apps de gestão financeira simplesmente ignora.
- Há prevenção deliberada de **dupla contagem no rateio de insumos compartilhados**: cada serviço aloca um percentual da compra compartilhada para si (modo "duração"), evitando que o mesmo custo apareça inteiro em dois serviços na DRE.
- Os dois motores de cálculo (Modo A "criar preço" e Modo B "já tenho um preço") foram **verificados numericamente como equivalentes**, segundo comentário no próprio código — sinal de disciplina de teste, não apenas de intenção.

### 1.2 O princípio de não inventar dados é verificável no código

Isso não é apenas uma diretriz seguida "de boa vontade" — está implementado como comportamento visível:

- O Observatório mostra um selo de **"aguardando fonte oficial"** em vez de forjar uma tabela de preços sindical, com o texto explícito: *"Ainda não encontrei tabela de preços pública de nenhuma das duas [SINDBEFS/SINDBACSS]."*
- A referência salarial do SINDECOBE (Convenção Coletiva 2025/2027, fonte real, assinada digitalmente) vem acompanhada de um comentário no código dizendo que **por cláusula da própria convenção ela não vale legalmente para Salvador nem para Feira de Santana** (que tem sindicato patronal próprio, o SINDBEFS) — e que por isso **nunca é aplicada automaticamente a nenhum cálculo do app**, sendo mostrada apenas como referência de consulta.
- Os dados de estabelecimentos do Observatório (Google Places) são tratados no código como uma coleta pontual de uma sessão específica — não como uma fonte viva.

### 1.3 A tensão central do produto

A conta por trás é sofisticada e correta, mas a **apresentação** ainda expõe boa parte da complexidade tributário-contábil real ao usuário leigo, em vez de sempre traduzi-la. Existem dois sistemas de explicação convivendo no app:

1. **`hint`** — legenda curta sempre visível abaixo do campo (11 usos no arquivo).
2. **`Ajuda` / `info`** — tooltip tocável ("?") com citação acadêmica, concentrado principalmente no Painel.

Esses dois sistemas **não se conectam ao FAQ** (18 perguntas, muito bem escritas, com exemplos concretos). O conteúdo educacional de melhor qualidade do app existe, mas fica isolado numa aba separada, sem link direto a partir do campo que gera a dúvida.

### 1.4 Escopo original vs. o que existe hoje

Vale registrar com transparência: a visão original de "mapa interativo com ruas mapeadas" e "benchmarking regional via sindicatos" ainda não foi alcançada por completo. O que existe hoje — um Observatório com cerca de 30 estabelecimentos reais do Google Places e um gráfico de barras por bairro/cidade — é uma **redução de escopo honesta**, não uma simulação disfarçada de dado real. Isso é uma virtude de integridade (nenhum dado foi forjado para parecer mais completo), mas também é um gap de expectativa que vale nomear explicitamente, já que a nomenclatura "Observatório" no menu pode sugerir algo mais abrangente do que o que está implementado.

---

## 2. Principais Gargalos para o Público Leigo

### 2.1 Jargão técnico concentrado exatamente no ponto de maior atrito
Ao escolher "Simples Nacional", o usuário precisa informar RBT12 e folha de pagamento de 12 meses — dados que provavelmente só o contador dele tem à mão — e o app devolve quatro termos técnicos em sequência (Fator R, Anexo aplicado, Alíquota nominal, Alíquota efetiva) **sem nenhum tooltip ali**, mesmo esses conceitos estando muito bem explicados no FAQ.

### 2.2 As duas camadas de explicação não se falam
`Ajuda` (tooltip tocável) e FAQ existem separadamente, sem nenhum link de um campo confuso direto para a pergunta do FAQ que o explica. O usuário precisaria adivinhar que a resposta já existe, navegar até a aba FAQ e procurar manualmente.

### 2.3 Falta a trava contra "jornadas irreais" pedida no briefing original
O componente reutilizável `CampoNumero` define apenas `min="0"`, sem teto. "Dias trabalhados/mês" e "Horas por profissional/dia" aceitam qualquer valor (ex.: 45 dias, 30 horas/dia) sem aviso algum. A trava percentual (`trava-percentual`, soma de percentuais ≥ 100%) existe e funciona bem em três pontos diferentes do código — mas é a **única** trava lógica implementada; a trava de jornada irreal, mencionada explicitamente no briefing, ainda não existe.

### 2.4 Comissão é por serviço, não por profissional
O campo se chama "Comissão do profissional", mas o valor pertence ao **serviço**, não a uma pessoa específica do cadastro de Profissionais. Esse cadastro já existe e já divide faturamento no Fechamento Mensal — mas, por design explícito (há comentário no código confirmando isso), não influencia rateio de custo fixo nem comissão. Um salão com comissionamentos diferentes por pessoa para o mesmo serviço não consegue representar isso sem duplicar o serviço.

### 2.5 Taxa de cartão é um único percentual "achatado"
Não há diferenciação entre débito, crédito à vista e parcelado — que na prática têm custos bem diferentes — nem um caminho guiado para o usuário leigo chegar a uma média ponderada razoável.

### 2.6 O bloco de "ponto de equilíbrio econômico" aparece antes de explicar por que ele importa
Os hints existentes ("equipamentos, reforma, capital de giro" / "ex: CDI do seu banco") dizem *o quê* preencher, mas o *porquê* de isso importar só aparece depois, como tooltip acadêmico dentro do Painel — ou seja, no momento de preencher o campo, o usuário ainda não viu a justificativa.

### 2.7 O onboarding entrega o usuário direto no ponto mais técnico do app
Os 4 passos do wizard (Você / Segmento / Modelo / Local) são curtos e amigáveis, mas terminam exatamente onde começa a etapa mais densa de todo o fluxo — configuração de regime tributário — sem nenhuma rampa intermediária.

---

## 3. Sugestões de Melhorias por Módulo

### 3.1 Precificação (Calculadora + motores de cálculo)
- Portar o conteúdo já escrito do FAQ (Fator R, RBT12, DRE) para tooltips `ajuda` inline nos campos correspondentes — reaproveitamento de texto existente, não conteúdo novo.
- Estender o padrão do `SemaforoDiagnostico` (🔴🟡🟢 + uma frase única com número concreto, ex.: "cobre a partir de R$X para empatar") ao bloco de Fator R/Anexo, que hoje mostra quatro números crus lado a lado sem tradução em linguagem natural.
- Um mini-helper guiado para chegar a um percentual de cartão "misturado" seria consistente com o espírito do já excelente sistema de custo variável inteligente.

### 3.2 Custos
- O sistema de custo variável "inteligente" (modos `direto` / `duração` / `unidade`) é o ponto mais forte de UX encontrado no app inteiro — parte de como o dono do salão realmente pensa ("paguei R$80, dura 45 dias" ou "a caixa de 100 custou R$40, uso 1 por atendimento") em vez de exigir custo unitário pré-calculado. Vale considerar torná-lo o modo padrão sugerido na criação de um item.
- Adicionar `max="31"` em dias/mês e `max="24"` em horas/dia, com aviso no mesmo estilo visual já usado para "regime indefinido" — fecha a lacuna da trava de jornada irreal com esforço baixo.
- Repetir o aviso "sem regime definido, o preço fica subestimado" também dentro da Calculadora, não só na seção recolhível do Negócio — hoje é possível chegar à Calculadora sem nunca ter visto esse aviso.

### 3.3 Comissões
- A lógica atual (comissão como percentual do preço, dentro do markup divisor) está correta, e a resposta do FAQ sobre o tema é uma das melhores do app — explica bem por que pagar comissão "do que sobrar no fim do mês" é um erro comum e caro.
- Sugestão principal: permitir uma comissão diferente por profissional como **opção**, aparecendo apenas quando há mais de um profissional ativo cadastrado — reaproveitando o mesmo padrão de disclosure progressivo que o app já usa (com 1 só profissional, o campo comissão já é escondido, com explicação).
- Vale um modo dedicado para "aluguel de cadeira" (valor fixo mensal), citado no próprio FAQ como alternativa à comissão percentual, mas sem input próprio hoje — comportamentalmente é custo fixo, não variável, e merece ser tratado como tal (mesmo racional já aplicado ao DAS-MEI).

### 3.4 Relatórios
- O tratamento de DRE congelada vs. projeção ao vivo é um diferencial real; sugiro torná-lo visível na própria interface (ex.: rótulo "dado real de [mês]" vs. "projeção com a configuração de hoje"), não apenas no comentário do código.
- Os três pontos de equilíbrio + GAO + margem de segurança são conceitos avançados e corretos, mas hoje cada um só tem explicação individual isolada; um momento único de "por que existem três pontos de equilíbrio?" antes de exibir os três números ajudaria a orientar antes de detalhar.
- No Observatório, a coleta via Google Places está honestamente tratada no código como um retrato estático de uma sessão específica — mas essa data de coleta não aparece para o usuário na tela. Exibi-la evita que alguém confunda a lista com dado de mercado ao vivo.

---

## 4. Plano de Ação Priorizado

### 4.1 Ações rápidas (baixo esforço, alto retorno — cabem em uma sessão cada)

| # | Ação | Módulo | Fecha a lacuna de |
|---|------|--------|--------------------|
| 1 | Teto (`max`) em dias/mês (31) e horas/dia (24), com aviso visual | Custos | Trava de "jornada irreal" do briefing original, ainda ausente |
| 2 | Repetir o aviso "regime indefinido → preço subestimado" dentro da Calculadora | Precificação | Aviso hoje só existe na aba Negócio |
| 3 | Portar respostas do FAQ (Fator R, RBT12, comissão de parceiros) para tooltips `ajuda` nos campos correspondentes | Precificação / Custos | Jargão sem tradução no ponto de maior densidade técnica |

### 4.2 Próxima fase (merece Issue própria)

| # | Ação | Módulo | Observação |
|---|------|--------|------------|
| 4 | Comissão opcional por profissional, com disclosure progressivo | Comissões | Só aparece quando há mais de 1 profissional ativo |
| 5 | Mini-calculadora guiada de taxa de cartão ponderada | Precificação | Reduz estimativa "no chute" do usuário leigo |
| 6 | Momento único explicando os 3 pontos de equilíbrio antes do Painel | Relatórios | Hoje cada um só tem explicação isolada |
| 7 | Data de coleta visível no Observatório + roadmap de benchmarking a partir do Fechamento Mensal agregado (anônimo) | Relatórios | Cumpre o objetivo original de benchmarking regional sem inventar dado |
| 8 | Mapa real (ex.: Leaflet + OpenStreetMap, sem custo de API) plotando os estabelecimentos já coletados por bairro | Relatórios | Primeiro passo concreto rumo à visão original de "mapa com ruas" |

---

*Documento gerado a partir de leitura direta do código-fonte anexado. Nenhuma alteração foi feita no app nesta etapa — conforme solicitado, o papel aqui foi estritamente consultivo e analítico.*
