# Bloco 13 — Issues e Pull Request

Issues e PR criados direto pelo Claude no GitHub.

## Issue #40 — [Melhoria] Lembrete de cópia de segurança depois de salvar o fechamento do mês

**Tipo:** Melhoria

### Objetivo
Lembrar o empreendedor de baixar a cópia de segurança logo depois de salvar o fechamento do mês. Os dados ficam só no aparelho, e o fechamento é o registro mais valioso que ele faz.

### Escopo
- [ ] Depois de "Salvar fechamento", aparece um aviso com "Baixar cópia agora" e "Agora não".
- [ ] O aviso diz quando foi a última cópia, ou que ainda não houve nenhuma.
- [ ] Baixar mostra progresso, confirma com "Cópia baixada" e o aviso some sozinho.

### Critério de aceite
- O aviso aparece depois de salvar um fechamento, mas não depois de carregar os meses de exemplo.
- O texto da última cópia é testado em `copiaSeguranca.test.js`.
- Há teste E2E que salva um fechamento e baixa a cópia pelo aviso.

## Issue #41 — [Melhoria] Rascunho automático nos formulários do Observatório e do Estoque

**Tipo:** Melhoria

### Objetivo
Levar a regra "não perder trabalho" do Bloco 9 aos formulários menores. Hoje, o que está sendo digitado no Observatório e no Estoque se perde quando a pessoa troca de aba, recarrega a página ou atualiza o app.

### Escopo
- [ ] Observatório: novo concorrente ou edição de concorrente, e o preço sendo anotado.
- [ ] Estoque: produto novo ou edição de produto, e a movimentação de entrada ou saída.
- [ ] Ao voltar, o formulário reabre com o que foi digitado e mostra "Recuperamos o que você estava digitando".
- [ ] Salvar ou cancelar apaga o rascunho.
- [ ] O padrão vira o hook `useRascunho` e o componente `AvisoRascunhoRecuperado`, que os formulários novos devem reaproveitar.

### Critério de aceite
- Há testes E2E com troca de aba no Estoque e no Observatório.

## Pull Request — Bloco 13

Fecha #40 e #41.

### O que mudou
- **Lembrete de cópia de segurança (#40).** Depois de "Salvar fechamento", aparece o aviso "Fechamento salvo. Que tal guardar uma cópia?".
  - Diz quando foi a última cópia, ou que ainda não houve nenhuma.
  - Tem "Baixar cópia agora", com progresso e confirmação "Cópia baixada", e "Agora não".
  - Some sozinho depois de baixar.
  - O texto da última cópia vem de `textoUltimaCopia` (em `copiaSeguranca.js`).
- **Rascunhos (#41).** O que está sendo digitado volta depois de trocar de aba, recarregar a página ou atualizar o app, com o aviso "Recuperamos o que você estava digitando":
  - Observatório: concorrente novo ou em edição, e o preço sendo anotado. O app reabre o concorrente certo com o formulário aberto.
  - Estoque: produto novo ou em edição, e a movimentação de entrada ou saída.
- **Peças reaproveitáveis:**
  - hook `useRascunho(chave, estado, { aoRecuperar })`. Se a pessoa começa a digitar antes de terminar a leitura do aparelho, vale o que ela digitou, e não o rascunho antigo;
  - componente `AvisoRascunhoRecuperado`, que também passou a ser usado no fechamento do mês.
- Versão do app: v7.20. O `CONTEXTO.md` foi atualizado com o padrão novo.

### Como foi validado
- Testes unitários: 83 passando (eram 77). Os 6 novos cobrem o texto da última cópia: nenhuma, inválida, hoje, ontem e há N dias.
- Testes E2E: 28 passando, no celular e no computador (eram 22). Os novos são:
  - Estoque: produto pela metade volta depois de trocar de aba, e a movimentação volta depois de recarregar. Cancelar apaga o rascunho.
  - Observatório: concorrente e preço pela metade voltam depois de trocar de aba.
  - Fechamento do mês: depois de salvar, o lembrete aparece, baixa a cópia e some.
- Conferência visual do lembrete e do aviso de rascunho no celular.

### Riscos e limitações
- **Um rascunho por formulário:** anotar preço em outro concorrente substitui o rascunho de preço anterior.
- **Concorrente apagado:** se o concorrente de um rascunho de preço tiver sido excluído, o rascunho é ignorado.
- **Lembrete sempre aparece:** ele aparece a cada vez que um fechamento é salvo, mesmo numa edição. A cópia antiga não tem o fechamento novo, por isso a repetição é intencional.
- **Formulários antigos:** o serviço novo e o fechamento ainda usam o código próprio do Bloco 9, com o mesmo comportamento. Migrar para `useRascunho` pode ser feito depois.

### Próximos passos
- Bloco 14: fonte dentro do app e aviso de privacidade v0.2.
- Bloco 15: Biome e mais testes.

