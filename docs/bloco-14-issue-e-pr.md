# Bloco 14 — Issue e Pull Request

Issue e PR criados direto pelo Claude no GitHub.

## Issue #43 — [Melhoria] Fonte dentro do app (sem Google Fonts) e Aviso de Privacidade v0.2

**Tipo:** Melhoria

### Objetivo
Guardar a fonte Poppins dentro do próprio app em vez de buscá-la no Google Fonts. Com isso, o Google sai da lista de terceiros do Aviso de Privacidade, e a letra certa aparece mesmo sem internet (PWA offline).

### Escopo
- [ ] Usar `@fontsource/poppins` (só o subconjunto latino, pesos 300 a 700) e remover o `@import` do Google Fonts.
- [ ] Incluir a fonte no cache do PWA.
- [ ] Atualizar o Aviso de Privacidade para a v0.2, com dois serviços de terceiros, e pedir um novo aceite.
- [ ] Criar um teste que falhe se o código passar a chamar um endereço externo que não esteja no Aviso.

### Critério de aceite
- Ao abrir o app, nenhuma requisição sai para fonts.googleapis.com ou fonts.gstatic.com.
- A letra continua a mesma.
- Quem aceitou a v0.1 vê "Os termos foram atualizados" uma vez.

## Pull Request — Bloco 14

Fecha #43.

> Este PR foi criado em cima do Bloco 13 (#42). Faça o merge do #42 primeiro: depois disso, este PR passa a mostrar só as mudanças do Bloco 14.

### O que mudou
- A fonte Poppins agora fica dentro do app, com `@fontsource/poppins` 5.3.0. Entram só o subconjunto latino, que cobre o português, e os pesos 300 a 700, importados em `src/main.jsx`.
- Saiu o `@import` do Google Fonts.
- O cache do PWA passou a incluir os arquivos `.woff2`, então a letra aparece mesmo offline.
- Aviso de Privacidade v0.2:
  - o item 3 lista dois serviços, Vercel e OpenStreetMap;
  - `VERSAO_TERMOS` foi para `0.2`, então quem aceitou a v0.1 vê "Os termos foram atualizados" uma vez;
  - o documento de rascunho também foi atualizado.
- Teste novo, "o código só acessa os serviços declarados no Aviso de Privacidade": ele falha se aparecer um endereço `https://` novo no código ou no `index.html` sem estar no aviso.
- O E2E de privacidade lê a versão de `termos.js`, em vez de deixá-la fixa no teste.
- Versão do app: v7.21.

### Como foi validado
- Testes unitários: 84 passando. O teste novo falharia com o `@import` antigo do Google Fonts.
- Testes E2E: 28 passando, no celular e no computador.
- No navegador, abrindo o app, todas as requisições foram para o próprio app (`localhost`), e a Poppins carregou nos pesos usados na tela.
- O print confere que a letra está igual.
- `build` e `build:single` geram sem erro.

### Riscos e limitações
- O arquivo único (`build:single`) cresceu de cerca de 1,41 MB para 1,53 MB, porque leva a fonte embutida.
- O build da Vercel ganhou 5 arquivos `.woff2` de cerca de 8 KB cada. O navegador só baixa os pesos usados na tela.
- Caracteres fora do subconjunto latino, como a seta →, usam a fonte padrão do aparelho. Isso já acontecia com o Google Fonts.

### Próximos passos
- Bloco 15: Biome e mais testes.

