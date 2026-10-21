# Bloco 17 — Issues e Pull Request

Issues e PR criados direto pelo Claude no GitHub.

## Issue #49 — [Melhoria] Revisar os 23 avisos do Biome e voltar as regras a erro

**Tipo:** Melhoria

### Objetivo
Revisar um a um os 23 avisos que o Biome deixou no Bloco 15:
- 13 de dependências de hooks (`useExhaustiveDependencies`);
- 10 de `key` pela posição na lista (`noArrayIndexKey`).

Para cada um, a decisão é corrigir o código ou justificar no próprio código por que está certo. Depois, as duas regras voltam a valer como **erro** no CI, para que um aviso novo não passe despercebido.

### Escopo
- [ ] Corrigir o que der: chave estável nas listas e nos gráficos, comparadores fora do componente, valores padrão memorizados e dependências explícitas no mapa.
- [ ] Justificar com `biome-ignore` e motivo o que é intencional: gatilhos de efeito, criação única do mapa e listas de texto fixas.
- [ ] Voltar `useExhaustiveDependencies` e `noArrayIndexKey` a erro no `biome.json`.

### Critério de aceite
- `npm run lint` sem erros e sem avisos.
- Testes unitários e E2E passando, sem mudança visível para o usuário.

## Issue #50 — [Melhoria] Rascunhos do serviço novo e do fechamento do mês com useRascunho

**Tipo:** Melhoria

### Objetivo
Passar os rascunhos do serviço novo (Calculadora) e do fechamento do mês para o hook `useRascunho` (Bloco 13). Assim os seis formulários seguem um só padrão, e o código repetido do Bloco 9 sai do app.

### Escopo
- [ ] Calculadora: rascunho do serviço novo com `useRascunho`. Continua só para serviço novo, só com conteúdo preenchido, e recupera também o passo do assistente.
- [ ] Fechamento do mês: rascunho por mês com `useRascunho` e `AvisoRascunhoRecuperado`.
- [ ] O hook ganha `dispensarAviso`, para o botão "Ok" do aviso.

### Critério de aceite
- O comportamento fica igual ao de hoje. Os testes E2E da Calculadora e do fechamento continuam passando.

## Pull Request — Bloco 17

Fecha #49 e #50.

### O que mudou
#### #49: os 23 avisos do Biome, um a um
**Corrigidos (14):**
- **Gráficos e listas sem chave pela posição (8):**
  - fatias da rosca do preço, pelo nome;
  - barras do ranking e pontos do gráfico de ocupação, pelo id do serviço;
  - marcadores da faixa de preços, pelo concorrente;
  - barras por bairro, pelo nome;
  - itens das listas do FAQ, dos termos e do resumo do aceite, pelo próprio texto.
- **Ordenação dos serviços (1):** os comparadores saíram de dentro do componente para uma constante fixa, `COMPARADORES_SERVICO`.
- **Valores de um serviço novo (1):** o `vazio`, que guarda os valores iniciais, passou a ser memorizado com as dependências reais: segmento, comissão média e taxa média. O `rascunhoBase` também passou a declarar essa dependência.
- **Mapa (2):**
  - o efeito de troca de cidade agora declara latitude e longitude;
  - o clique num ponto do mapa passou a usar uma ref, como já acontecia com o clique de marcar ponto. Isso evita usar uma versão velha da função.
- **Rascunhos antigos (2 grupos de avisos):** sumiram com a migração da #50.

**Justificados no código com `biome-ignore` e motivo (9 avisos, em 5 trechos):**
- **Troca de aba:** é o gatilho do esqueleto de carregamento.
- **Balão de ajuda:** a segunda passada de posicionamento depende da largura medida.
- **Mapa:** o Leaflet é criado uma única vez, ao montar.
- **Blocos de texto do FAQ (2):** são fixos, nunca reordenados.

**Regras de volta a erro:** `useExhaustiveDependencies` e `noArrayIndexKey` voltaram a valer como erro no `biome.json`, então um caso novo derruba o CI.

#### #50: rascunhos antigos com `useRascunho`
- **Serviço novo (Calculadora):** o código do Bloco 9 saiu e o hook entrou no lugar.
  - Continua guardando só quando há conteúdo, e recupera também o passo do assistente.
  - Nada é gravado nem apagado enquanto um serviço já salvo está em edição.
- **Fechamento do mês:** o mesmo hook, por mês, com o mesmo aviso.
- **O hook ganhou duas opções:**
  - `ativo`, que pausa a gravação;
  - `dispensarAviso`, para o botão "Ok" do aviso.
- **Compatível com rascunhos antigos:** os que estiverem guardados no aparelho de alguém continuam sendo recuperados, porque o formato não mudou.
- Versão do app: v7.23.

### Como foi validado
- `npm run lint`: **0 erros e 0 avisos**. Antes eram 23 avisos.
- Testes unitários: 104 passando.
- Testes E2E: 30 passando no celular e no computador. Teste novo: o fechamento pela metade volta depois de trocar de aba, e cancelar apaga o rascunho. O teste do rascunho da Calculadora, com "Começar de novo", continua passando.
- `build` e `build:single` geram sem erro.

### Riscos e limitações
- **Edição em andamento:** se a pessoa estava criando um serviço e abre outro para editar, o rascunho do novo fica guardado sem ser apagado, como antes. Ao voltar a criar um serviço, "Novo serviço" começa do zero e descarta esse rascunho, também como antes.
- **Diferença em relação ao Bloco 9:** se a pessoa apaga tudo o que digitou, o rascunho é apagado, porque o estado voltou ao inicial. Antes, ficava o último rascunho com conteúdo.

### Próximos passos
- Revisão jurídica, data da coleta do Observatório e retorno da Inovatec, que dependem do Daniel.

