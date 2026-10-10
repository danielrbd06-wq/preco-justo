# Bloco 1 — Issues e Pull Request

> Não tenho um repositório GitHub conectado neste ambiente, então não consigo abrir Issues/PR de verdade por aqui. Os três blocos abaixo estão prontos para copiar e colar no GitHub (ou me avise se quiser conectar um repositório para eu abrir diretamente nas próximas rodadas).

---

## Issue #1 — [Correção] Sem trava para "jornada irreal" (dias/mês e horas/dia)

**Categoria:** Correção

**Descrição:**
`CampoNumero` (input reutilizável para dias trabalhados/mês e horas por profissional/dia, na aba Negócio) define `min="0"` mas não tem teto. É possível digitar, por exemplo, 45 dias/mês ou 30 horas/dia sem nenhum aviso, o que infla `horasTotais` e subestima `custoFixoPorHora` — e, por consequência, todos os preços calculados. Essa é a única lacuna do requisito original de "travas lógicas contra dados matematicamente inconsistentes (jornadas irreais)" que ainda não estava coberta (a trava percentual, `trava-percentual`, já existe e funciona bem).

**Critério de aceite:**
- Campo "Dias trabalhados/mês" sinaliza valores acima de 31.
- Campo "Horas por profissional/dia" sinaliza valores acima de 24.
- Mensagem explica a consequência (preço pode ficar subestimado), não só "valor inválido".

---

## Issue #2 — [Melhoria] Novo item de custo variável nasce no modo "Direto"

**Categoria:** Melhoria

**Descrição:**
Ao clicar em "adicionar item" em Produtos e Materiais, o item novo nasce com `modo: "direto"` — o modo que exige o usuário já ter calculado o custo por atendimento na cabeça. O próprio texto de ajuda logo acima do botão já sugere "por duração" ou "por unidade" como caminho mais fácil, mas o comportamento padrão não seguia essa própria recomendação.

**Critério de aceite:**
- Novo item nasce no modo "Duração".
- Usuário continua podendo trocar livremente para Direto/Unidade/Compartilhado a qualquer momento.

---

## Issue #3 — [Melhoria] Aviso de "regime tributário indefinido" não aparece na Calculadora

**Categoria:** Melhoria

**Descrição:**
O aviso "sem regime definido, nenhum imposto entra no preço — o preço final ficará subestimado" só existe dentro da seção recolhível "Regime tributário" da aba Negócio. É possível concluir o onboarding e ir direto para a Calculadora sem nunca abrir essa seção nem ver o aviso, e calcular preços com 0% de imposto embutido sem saber disso.

**Critério de aceite:**
- Mesmo aviso (ou equivalente) aparece na Calculadora quando `regime === "indefinido"`, independentemente do modo (Quero descobrir / Já tenho um preço) ou do passo do wizard.
- Aviso tem atalho direto para a configuração de regime.

---

## Pull Request — Bloco 1: travas e defaults de baixo risco

**Refs:** Issue #1, Issue #2, Issue #3

### O que mudou

1. **`CampoNumero`** ganhou uma prop opcional `max` (sem valor por padrão — nenhum uso existente do componente muda de comportamento).
2. **Aba Negócio:** `max="31"` em "Dias trabalhados/mês" e `max="24"` em "Horas por profissional/dia", mais um aviso visual (mesmo padrão visual do aviso já existente de "regime indefinido") quando qualquer um dos dois passa do limite.
3. **`ListaCustosVariaveis.add`:** novo item de custo variável nasce com `modo: "duracao"` em vez de `"direto"`. Dados de exemplo/demonstração não foram tocados.
4. **`computeNegocioDerivado`:** passou a expor `regime` no objeto derivado (`nd`), que já é passado para a Calculadora — sem isso, a Calculadora não tinha como saber se o regime estava indefinido (só recebia `impostoPct`, que é 0 tanto para "indefinido" quanto para MEI, por razões legítimas e diferentes).
5. **`Calculadora`:** aviso de regime indefinido adicionado uma única vez no topo do `return` principal, então cobre os dois modos de cálculo e todos os passos do wizard sem duplicar código; usa `irParaNegocio` (já disponível como prop) para levar direto à correção.

### Como foi validado

- Diff completo revisado linha a linha contra o arquivo original (`bloco1.patch` em anexo) — só as 5 mudanças pretendidas, nada além disso.
- Parse/sintaxe do arquivo inteiro verificado com `esbuild` (JSX) — sem erros.
- Rastreei manualmente os campos novos/alterados contra os *fallbacks* defensivos já existentes no componente (`item.duracaoValor || ""`, `item.duracaoUnidade || "dias"`, `CampoMoeda` já trata `value === undefined`) para confirmar que o novo item no modo "duração" não quebra por campo ausente.
- **Não validado neste ambiente:** não há aqui um projeto React rodando (npm/vite) nem navegador para QA visual — recomendo revisão visual rápida no seu ambiente antes de mergear, especialmente para conferir se os dois avisos novos (Negócio e Calculadora) não se sobrepõem visualmente a outros avisos já existentes na mesma tela.

### Riscos e limitações

- O atributo HTML `max` sozinho não bloqueia a digitação em todos os navegadores — por isso o aviso em JS é o que realmente protege; o `max` é reforço, não a trava principal.
- O aviso de regime indefinido na Calculadora depende de `nd.regime`, que agora existe em `computeNegocioDerivado` — se algum outro ponto do código também gerar um objeto "derivado" manualmente sem passar por essa função, ele não teria esse campo (não encontrei nenhum caso assim no arquivo, mas vale confirmar se você tiver outro ponto de geração desse objeto fora do que revisei).
- Trocar o modo padrão para "duração" é uma mudança de comportamento visível ao usuário (ainda que pequena) — vale confirmar se você concorda com a escolha de "duração" sobre "unidade" como o novo padrão.

### Próximos passos

- Seguir para o Bloco 2 (tooltips com conteúdo do FAQ + rótulo "dado real" vs. "projeção" no DRE) depois de validado este bloco.
- Se fizer sentido, um teste automatizado simples (ex. Playwright) cobrindo "digitar 45 em dias/mês mostra aviso" evitaria regressão futura.

---

**Arquivos desta entrega:**
- `app.jsx` — código-fonte com as 3 mudanças aplicadas
- `bloco1.patch` — diff unificado das mudanças, para aplicar com `git apply` ou revisar isoladamente
