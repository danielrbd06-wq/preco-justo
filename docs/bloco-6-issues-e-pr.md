# Bloco 6 — Issues e Pull Request

Crie as duas Issues **antes** de abrir o Pull Request e não as feche: o merge do PR fecha as duas. Como o último foi o PR #22, devem sair **#23** e **#24**. Se saírem outros números, ajuste as linhas `Closes` do PR.

Decisões tomadas com o Daniel antes de implementar:
- Os **preços dos concorrentes são anotados pelo próprio usuário**, com data. Nada é inventado e tudo fica no aparelho.
- Cada estabelecimento entra no mapa **pelo toque do usuário** no ponto da rua.
- Cidades: **Feira de Santana, Irará** (cidade de testes do app) **e Salvador**.
- A média anônima entre usuários do app **fica para depois**: exige servidor e aprovação jurídica (LGPD).

---

## Issue #23

**Título:**
```
[Nova função] Mapa da concorrência no Observatório
```

**Descrição:**
```
O Observatório mostra hoje uma lista de estabelecimentos (nome, bairro e avaliação) e um gráfico por bairro, sem mapa e sem a posição de ninguém. O objetivo do produto é que o empreendedor veja a concorrência na região exata dele.

Decisão: mapa com as ruas do OpenStreetMap (gratuito), em Feira de Santana, Irará (cidade de testes do app) e Salvador. O usuário marca o próprio negócio e os concorrentes tocando no mapa. Nenhuma posição é estimada.

Critério de aceite:
- Mapa com as ruas da cidade escolhida e a atribuição do OpenStreetMap.
- "Marcar meu negócio" e "Adicionar concorrente": o usuário toca no ponto do mapa. Também dá para adicionar um concorrente sem posição.
- Concorrentes coloridos por tipo (salão, barbearia, outro) e o próprio negócio em destaque.
- Com o negócio marcado, filtro de raio (1, 3 ou 5 km) e distância de cada concorrente.
- Os estabelecimentos da coleta de referência podem ser levados para o mapa ("marcar no mapa"), com nome, tipo e bairro já preenchidos.
- O mapa carrega só quando o Observatório abre, com skeleton, e funciona no celular e no tema escuro. Sem internet, avisa que as ruas não carregam.
```

## Issue #24

**Título:**
```
[Nova função] Preços dos concorrentes e comparação com os meus
```

**Descrição:**
```
O empreendedor não tem onde registrar os preços que vê na concorrência nem como compará-los com os dele. Não existe tabela pública de preços dos sindicatos (SINDBEFS, SINDBACSS), e o app não pode inventar preço de mercado.

Decisão: o próprio usuário anota os preços que viu, sempre com data e onde viu, e o app compara com os preços dele, serviço por serviço.

Critério de aceite:
- Em cada concorrente: anotar preço escolhendo um dos meus serviços (ou "outro serviço"), com valor, data (não pode ser futura) e onde viu (tabela no local, Instagram ou site, WhatsApp ou ligação, cliente contou, outro). Dá para apagar um preço, editar e excluir o concorrente.
- Comparação por serviço: meu preço, a mediana dos concorrentes, a faixa (do menor ao maior) e o meu piso (o preço que só cobre os meus custos, sem lucro), em texto e numa faixa visual.
- Usa só o preço mais recente de cada concorrente, para ninguém pesar em dobro.
- Avisos: menos de 3 concorrentes, preços com mais de 6 meses e mediana da concorrência abaixo do meu piso.
- Respeita a cidade e o raio escolhidos no mapa.
- Tudo fica salvo só no aparelho.
```

---

## Pull Request

**Título:**
```
Bloco 6: mapa da concorrência e comparação de preços no Observatório
```

**Descrição:**
```markdown
Closes #23
Closes #24

## O que mudou

### Mapa da concorrência (#23)
- Nova dependência: **Leaflet 1.9.4** (versão fixa), com as ruas do **OpenStreetMap** e a atribuição exigida no canto do mapa. Sem chave de API e sem custo.
- Novo arquivo `src/MapaConcorrencia.jsx`, carregado sob demanda com `React.lazy`: o Leaflet (cerca de 45 kB comprimido) só é baixado quando o Observatório abre, com skeleton no lugar do mapa enquanto carrega. O resto do app não ficou mais pesado.
- Cidades: Feira de Santana, Irará (cidade de testes do app) e Salvador. A cidade do perfil abre primeiro. O centro de cada cidade só posiciona a vista inicial (coordenadas das páginas da Wikipédia).
- "Marcar meu negócio" e "Adicionar concorrente": uma faixa diz o que tocar, o mapa ganha contorno e cursor de mira, e o ponto tocado vira o local. Também há "Adicionar concorrente sem marcar no mapa", para quem está sem internet ou não acha o ponto.
- Pontos coloridos por tipo (salão, barbearia, outro); o negócio do usuário é um ponto amarelo com borda. Tocar num ponto abre o concorrente na lista.
- Com o negócio marcado: filtro de raio (cidade toda, 1, 3 ou 5 km), círculo tracejado no mapa e distância de cada concorrente (haversine).
- Coleta de referência (Google Maps): continua com o gráfico por bairro e a lista, agora por cidade. Cada estabelecimento tem "marcar no mapa", que já preenche nome, tipo e bairro; os que já estão nos concorrentes mostram "já está nos seus concorrentes". Esses estabelecimentos **não** são plotados sozinhos: não há coordenadas deles, e o app não estima posição.
- Movimento: a troca de cidade é um voo curto do mapa (direto para quem pede menos movimento no sistema); formulários e itens entram com as animações já existentes. No tema escuro, as ruas são invertidas por CSS e os controles seguem as cores do app. O mapa fica num contexto de empilhamento próprio, para não passar por cima da barra de navegação nem dos balões de ajuda.
- Sem internet, um aviso diz que as ruas não carregam; a lista e a comparação continuam funcionando.

### Preços dos concorrentes e comparação (#24)
- Cada concorrente tem nome, tipo, bairro (opcional), posição (opcional) e preços. Cada preço tem o serviço (um dos serviços do usuário ou "outro serviço"), o valor (pelo `CampoMoeda`, no padrão brasileiro), a data (não pode ser futura) e onde foi visto. Dá para editar, mudar a posição, apagar um preço e excluir o concorrente (com confirmação).
- Novo cartão **Seus preços × concorrência**, por serviço:
  - texto com o preço do usuário, quanto está acima ou abaixo da **mediana**, a faixa (menor e maior) e o **piso** (preço com margem 0, calculado pelos mesmos motores da Calculadora);
  - faixa visual com cada concorrente, a mediana, o preço do usuário e o piso, com legenda;
  - selo: na mediana, acima ou abaixo dela, ou acima ou abaixo de todos.
- Regras: só o preço mais recente de cada concorrente entra (`ultimoPrecoPorConcorrente`); mediana no lugar da média, para um preço fora da curva não puxar o resultado.
- Avisos: menos de 3 concorrentes ("só indicativo"), preços com mais de 6 meses, mediana abaixo do piso (baixar até ela daria prejuízo) e preço do usuário abaixo do próprio piso.
- Preços ligados a "outro serviço" ficam anotados no concorrente com "fora da comparação".
- Armazenamento local, pelos mesmos `salvarComFallback`/`lerComFallback` do resto do app: `observatorio:concorrentes` e `observatorio:meus-locais`. Nada é enviado para fora do aparelho.
- FAQ: nova pergunta "Como usar os preços da concorrência sem entrar numa guerra de preço?", com exemplo marcado como ilustrativo.

### Outros
- Versão exibida no app: v7.13 → v7.14.
- `CONTEXTO.md`: regras do Bloco 6 (de onde vêm os dados, armazenamento, regras da comparação, uso dos tiles) e a média anônima entre usuários registrada como bloco futuro.

## Como foi validado
- Sintaxe com esbuild; builds de produção (PWA e arquivo único) sem erros. O mapa vira um arquivo separado (`MapaConcorrencia-*.js`), incluído no cache do PWA. No arquivo único, o mapa também abre.
- Testes no navegador (Chromium headless), no celular (375 px) e no computador (1280 px, temas claro e escuro), com o exemplo do app:
  - marcar o negócio, dois concorrentes no mapa e um sem posição; anotar o preço do Corte Masculino em cada um (R$ 25, R$ 30 e R$ 18);
  - comparação: seu preço R$ 20,22, **19% abaixo da mediana de R$ 25,00**, faixa de R$ 18,00 a R$ 30,00 e **piso de R$ 11,93** (conferido à mão: (R$ 3,00 + 0,5 h × R$ 8,56) ÷ (1 − 39%));
  - distâncias de 590 m e 2,8 km; com o raio de 1 km, a comparação passa a usar só 1 de 3 concorrentes e avisa que há poucas observações;
  - "marcar no mapa" de um estabelecimento da coleta preenche o nome e, depois, mostra "já está nos seus concorrentes";
  - os dados continuam lá depois de recarregar a página; Irará abre sem coleta de referência e com a orientação certa;
  - preço com mais de 6 meses gera o aviso; "outro serviço" fica fora da comparação.
- Nenhuma rolagem horizontal e nenhum erro de JavaScript em nenhum cenário.
- Regressão dos blocos 2, 3, 4, 5 e 7 completa, com os mesmos números de antes (comissão média de 27,8%, DRE com aluguel de R$ 458,12, taxa média de 0,85%).
- Revisão visual: ajustados os rótulos da faixa (ficavam nas pontas, longe dos pontos), a trilha invisível no tema escuro, o selo "abaixo de todos" com um concorrente só e os botões de raio, que quebravam linha no celular.
- **Não testado aqui:** a imagem das ruas. O ambiente de testes não acessa o servidor de tiles do OpenStreetMap; o mapa, os controles, a atribuição e os pontos foram verificados. Confira as ruas na pré-visualização da Vercel.

## Riscos e limitações
- **Os dados valem o que o usuário anotar:** a comparação é tão boa quanto as anotações. Por isso a tela mostra a quantidade de observações, a data dos preços e os avisos.
- **Tiles do OpenStreetMap:** a política de uso pede uso moderado e atribuição (presente). Para um número grande de usuários, será preciso um provedor de tiles com plano próprio. Sem internet, as ruas não aparecem.
- **Coleta de referência fora do mapa:** os estabelecimentos coletados não têm coordenadas e não aparecem sozinhos no mapa; o usuário precisa marcá-los.
- **Tudo fica no aparelho:** trocar de celular ou limpar os dados do site apaga os concorrentes anotados, como o resto dos dados do app.
- Nova dependência (`leaflet`): é preciso subir também o `package.json` e o `package-lock.json`.

## Próximos passos
- Média anônima de preços entre usuários, por bairro (precisa de servidor, consentimento e aprovação jurídica).
- Exportar os concorrentes e preços anotados no Excel.
- Avaliar com um contador o tratamento da Lei do Salão-Parceiro.
- Aviso de "nova versão disponível" no app.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Jysjppu3ZxHZKVkdUuezka
```
