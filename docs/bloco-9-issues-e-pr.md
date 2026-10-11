# Bloco 9 — Issues e Pull Request

Desta vez as Issues e o PR foram criados direto pelo Claude no GitHub (conector com permissão de escrita).

## Issue #28 — [Correção] Trocar de aba apaga o que ainda não foi salvo

Ao trocar de aba, o que ainda não tinha sido salvo some:

- **Negócio:** o salvamento automático espera 1,2 s depois da última tecla. Quem digita um valor (por exemplo, o pró-labore) e troca de aba logo em seguida perde a alteração.
- **Calculadora:** o serviço novo que está sendo criado no passo a passo não é guardado. Trocar de aba ou recarregar a página apaga tudo o que foi preenchido.
- **Fechamento mensal (Painel):** o mesmo acontece com o fechamento do mês que está sendo digitado.

O problema já existia antes dos blocos e é o defeito que o usuário mais sente ("sumiu o que eu fiz").

Critério de aceite:
- O que estava esperando o salvamento automático é salvo na hora ao trocar de aba, ao esconder ou fechar a página e antes de o app atualizar.
- O serviço novo pela metade volta ao reabrir a Calculadora, mesmo depois de recarregar a página, com o aviso "Recuperamos o serviço que você estava criando" e a opção "Começar de novo".
- O fechamento do mês pela metade volta ao reabrir o Painel, com aviso.
- Salvar, cancelar ou começar de novo apagam o rascunho.
- Teste de navegador que falha sem a correção.

## Issue #29 — [Melhoria] Aviso de "nova versão disponível"

O app baixa a versão nova em segundo plano, mas não avisa. Quem abre pelo ícone da tela inicial continua vendo a versão anterior até fechar e abrir o app de novo, sem saber disso. Foi o caso da v7.8 aparecendo depois de várias versões novas publicadas.

Critério de aceite:
- Quando houver versão nova, o app mostra "Nova versão disponível", com os botões "Atualizar agora" e "Depois".
- Antes de recarregar, tudo o que estava sendo digitado é salvo.
- O app procura versão nova sozinho de tempos em tempos e quando volta para a tela.
- O arquivo único (app.html, sem service worker) continua funcionando.

## Issue #30 — [Nova função] Cópia de segurança dos dados (baixar e restaurar)

Todos os dados do app ficam só no navegador do aparelho. Limpar os dados do navegador, trocar de celular ou usar outro navegador faz tudo parecer perdido, e não há como levar os dados de um aparelho para outro.

Critério de aceite:
- Na aba Negócio, "Cópia de segurança" com "Baixar cópia" (um arquivo .json com todos os dados) e "Restaurar de uma cópia".
- Antes de restaurar, o app mostra a data e o conteúdo da cópia e avisa que os dados atuais serão substituídos.
- Arquivo que não é uma cópia do app é recusado com uma mensagem clara.
- No primeiro acesso (aparelho novo ou dados apagados), dá para restaurar sem passar pelo cadastro.
- A tela mostra a data da última cópia baixada.
- Orientação para guardar o arquivo num lugar seguro e não compartilhar (dados do negócio).

## Pull Request — Bloco 9: não perder trabalho (rascunhos, aviso de nova versão e cópia de segurança)

Closes #28
Closes #29
Closes #30

## O que mudou

### Não perder o que foi digitado (#28)
- **`useAutoSalvar` descarrega o que está pendente:** antes, o que esperava a pausa de 1,2 s se perdia ao trocar de aba. Agora é salvo na hora em quatro situações:
  - quando o formulário sai da tela (troca de aba);
  - quando a página é escondida ou fechada (`pagehide` e `visibilitychange`);
  - antes de o app atualizar;
  - antes de baixar a cópia de segurança (evento `EVENTO_SALVAR_PENDENTES`).
  Vale para o Negócio e para a edição de serviços já salvos.
- **Rascunho do serviço novo (Calculadora):** o que foi preenchido no passo a passo fica guardado no aparelho (`rascunho:servico-novo`) a cada mudança, só quando há algo de fato preenchido. Ao reabrir a Calculadora, mesmo depois de recarregar, o serviço volta no mesmo passo, com "Recuperamos o serviço que você estava criando", "Ok" e "Começar de novo". Salvar, fechar ou começar de novo apagam o rascunho.
  - O aviso do navegador "sair do site?" desse formulário foi retirado: ele não cobria a troca de aba e o rascunho cobre os dois casos.
- **Rascunho do fechamento do mês (Painel):** mesmo mecanismo (`rascunho:fechamento:AAAA-MM`). O Painel reabre direto no fechamento que estava sendo digitado, com aviso. Cancelar apaga o rascunho.
- Funções comuns: `lerRascunho`, `CHAVE_RASCUNHO_SERVICO` e `chaveRascunhoFechamento`.

### Aviso de nova versão (#29)
- PWA passou de `autoUpdate` para **`prompt`**. A versão nova é baixada em segundo plano e fica esperando a pessoa.
- Novo componente `AvisoNovaVersao` (via `virtual:pwa-register/react`): cartão "Nova versão disponível — Atualize para ter as últimas melhorias. O que você digitou fica salvo."
  - Botões "Atualizar agora" (com estado "Atualizando…") e "Depois".
  - No celular fica acima da barra de navegação; no computador, no canto inferior direito.
- Antes de recarregar, dispara `EVENTO_SALVAR_PENDENTES`.
- O app procura versão nova a cada 30 minutos e sempre que volta para a tela.
- O arquivo único (`app.html`) não tem service worker: `vite.single.config.js` ganhou um plugin que entrega uma versão vazia do registro, que nunca avisa nada.

### Cópia de segurança (#30)
- Novo módulo `src/copiaSeguranca.js` (funções puras):
  - `montarCopia` e `nomeArquivoCopia`, para o arquivo `preco-justo-copia-AAAA-MM-DD.json`;
  - `lerCopia`, que valida o app, o formato, o tamanho máximo de 5 MB e as chaves no formato do app, e nunca lança erro;
  - `resumirCopia`.
- Aba Negócio, nova seção **Cópia de segurança**:
  - **Baixar cópia:** salva o que estiver pendente e baixa todas as chaves do app.
  - **Restaurar de uma cópia:** mostra a data, a versão e o conteúdo da cópia (negócio, serviços, fechamentos, produtos e concorrentes) e avisa que os dados atuais serão substituídos. Depois de restaurar, o app recarrega.
  - O resumo da seção mostra a data da última cópia baixada.
  - O texto orienta a guardar o arquivo num lugar seguro e a não compartilhar.
- No primeiro acesso (aparelho novo ou dados apagados), um link "Já usa o app em outro aparelho? Restaure uma cópia de segurança" abaixo do cadastro inicial.

### Outros
- Versão exibida no app: v7.15 → v7.16.
- `CONTEXTO.md`:
  - nova seção "Não perder trabalho", com as regras para todo formulário novo;
  - pendências resolvidas retiradas;
  - Bloco 11 (Lei do Salão-Parceiro) registrado com a pesquisa conferida.
- Testes: `src/copiaSeguranca.test.js` (10 testes), `tests/e2e/nao-perder-trabalho.spec.js` (3 cenários, no celular e no computador) e `tests/e2e/ajuda.js` (passos comuns, tirados do `app.spec.js`).

## Como foi validado
- **48 testes unitários** passando: os 38 das contas e os 10 da cópia de segurança. Cobertura de linhas de 91,9% em `calculos.js` e de 100% em `copiaSeguranca.js`.
- **14 testes de navegador** passando no celular e no computador. Os novos:
  - **Negócio:** digitar o pró-labore e trocar de aba na hora mantém o valor (custo fixo de R$ 4.360,00 = R$ 1.360,00 + R$ 3.000,00).
  - **Calculadora:** serviço novo pela metade volta depois de trocar de aba e de recarregar; "Começar de novo" limpa.
  - **Cópia de segurança:** baixar, apagar tudo, restaurar no primeiro acesso e conferir a receita de R$ 8.998,96 no Painel.
- **Teste do teste:** sem a linha que salva ao sair da tela, o teste do Negócio falha; com ela, passa.
- **Aviso de nova versão,** testado com duas versões publicadas no mesmo endereço:
  - o aviso aparece;
  - um valor digitado logo antes de atualizar foi mantido (custo fixo de R$ 3.860,00);
  - depois de "Atualizar agora", o app abre na versão nova e o aviso some.
- **Fechamento do mês:** o rascunho volta depois de trocar de aba (R$ 5.000,00), e cancelar faz ele não voltar mais.
- **Arquivo inválido** na restauração: "Este arquivo não é uma cópia de segurança do Preço Justo."
- **Regressão dos blocos 4, 5 e 6** com os mesmos números de antes. Nenhum erro de JavaScript e nenhuma rolagem lateral.
- **Revisão visual** do aviso, da seção de cópia, do aviso de rascunho recuperado e do primeiro acesso, no celular e no computador, nos temas claro e escuro.

## Riscos e limitações
- **Transição para o modo `prompt`:** quem está na v7.15 recebe a v7.16 do jeito antigo, ao fechar e abrir o app. O aviso passa a valer a partir da v7.16.
- **"Depois" esconde o aviso só até a próxima abertura do app.** A versão nova continua esperando.
- **Os rascunhos ficam no aparelho:** não passam para outro celular, a não ser pela cópia de segurança, que também os inclui.
- **A cópia não é automática nem fica na nuvem.** Depende de a pessoa baixar e guardar o arquivo. Uma cópia automática na nuvem depende de servidor, termos de uso e LGPD.
- **O arquivo da cópia não é criptografado.** Tem os números do negócio, e a tela avisa para não compartilhar.
- Os formulários menores do Observatório e do Estoque continuam sem rascunho. O impacto de perder um deles é baixo.

## Próximos passos
- Bloco 10: Excel do Observatório.
- Bloco 11: Lei do Salão-Parceiro.
- Lembrete de cópia de segurança, por exemplo depois de salvar o fechamento do mês.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Jysjppu3ZxHZKVkdUuezka
