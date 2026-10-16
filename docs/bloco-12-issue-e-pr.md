# Bloco 12 — Issue e Pull Request

Issue e PR criados direto pelo Claude no GitHub.

## Issue #36 — [Nova função] Termos de uso e aviso de privacidade preliminares, com tela de aceite

**Tipo:** Nova função

### Objetivo
Colocar no app os termos de uso e o aviso de privacidade em **versão preliminar**, com uma tela de aceite. Isso adianta a parte que não depende do jurídico. A coleta de dados continua desligada, porque o app não envia nada a servidor.

Texto-base: documento "Preço Justo — Termos de Uso e Aviso de Privacidade (rascunho)", versão 0.1, de 16/10/2026.

### Escopo
- [ ] **Tela de aceite** na primeira abertura e sempre que a versão dos textos mudar. A caixa precisa estar marcada para liberar o botão. O app grava no aparelho a versão aceita e a data.
- [ ] **Leitura completa** dos Termos de Uso e do Aviso de Privacidade dentro do app, em painel próprio.
- [ ] **FAQ → Privacidade e termos:** mostra a versão aceita e a data, permite reler os textos e tem a opção "Apagar todos os dados deste aparelho". Antes de apagar, há confirmação em duas etapas, com sugestão de baixar a cópia de segurança.
- [ ] **Textos e regras** em `src/termos.js`, com funções puras e testes.

### Fora do escopo
- Coleta de preços entre usuários, servidor ou qualquer envio de dados.
- Versão final dos textos, que depende da revisão jurídica.

### Critérios de aceite
- Quem já usa o app vê a tela de aceite uma vez, sem perder nenhum dado.
- Recarregar a página depois de aceitar não mostra a tela de novo.
- Mudar a versão dos textos faz a tela aparecer de novo.
- "Apagar todos os dados" remove tudo o que o app guardou no aparelho e volta para a tela de aceite.
- Testes unitários e E2E (celular e computador) passando no CI.

## Pull Request — Bloco 12: termos e privacidade (preliminar)

Fecha #36.

### O que mudou
- **Tela de aceite** ("Antes de começar"): aparece na primeira abertura e sempre que a versão dos textos mudar. Mostra três pontos em linguagem simples, tem links para ler os textos completos e uma caixa que precisa estar marcada para liberar o botão "Aceitar e continuar". Não fecha com Esc nem com clique fora.
- **Termos de Uso e Aviso de Privacidade** (v0.1, preliminar) dentro do app, em painel próprio. Os textos vêm do documento de rascunho de 16/10/2026, sem as marcações para o jurídico.
- **FAQ → Privacidade e termos:** mostra a versão aceita e a data, reabre os dois textos e tem "Apagar todos os dados deste aparelho". A confirmação acontece em duas etapas e oferece "Baixar cópia antes".
- **`src/termos.js`:** textos, versão e funções puras (`montarAceite`, `lerAceite`, `chavesDoApp`), com 15 testes em `termos.test.js`.
- **`PainelFolha`:** a folha usada pelo `PainelExplicacao` virou componente base, e o painel dos documentos e a tela de aceite usam essa mesma folha. O `PainelExplicacao` continua igual para o usuário.
- **`baixarCopiaSeguranca()`:** a geração da cópia saiu de dentro do `CopiaSeguranca` para ser usada também antes de apagar os dados.
- O aceite fica em `localStorage["preco-justo:aceite-termos"]`, fora do espaço de dados do app. Não vai para a cópia de segurança, e restaurar uma cópia não apaga o aceite.
- Versão do app: v7.19. O `CONTEXTO.md` foi atualizado com as regras do bloco.

### Como foi validado
- **Testes unitários:** 76 passando (eram 63). Os novos cobrem:
  - ida e volta do aceite;
  - versão nova pedindo aceite de novo;
  - registro corrompido;
  - "apagar" que só remove chaves do app;
  - nenhum "[a definir]" visível ao usuário.
- **E2E:** 22 passando no celular e no computador (eram 16).
  - Nos testes antigos, o primeiro acesso agora passa pela tela de aceite.
  - Novo `privacidade.spec.js` com três testes:
    - **aceite:** o botão só libera com a caixa marcada, os dois textos abrem e fecham, o Esc não fecha a tela de aceite e o aceite é lembrado depois de recarregar;
    - **versão nova:** o app mostra "Os termos foram atualizados" e pede o aceite de novo;
    - **apagar dados:** cancelar não apaga nada, a cópia é baixada antes e, depois de apagar, não sobra nenhuma chave `preco-justo:` e a tela de aceite volta.
- **Builds:** `build` e `build:single` geram sem erro.
- **Conferência visual:** celular de 375 px e computador de 1280 px, nos temas claro e escuro. A caixa de marcar estava branca demais no tema escuro e foi corrigida.

### Riscos e limitações
- **Textos preliminares:** ainda não passaram por advogado. O próprio app diz "Versão preliminar, em revisão jurídica".
- **Responsável e contato:** o nome do responsável aparece como Daniel Almeida dos Santos Barbosa. O canal de contato está vazio (`CONTATO_PRIVACIDADE`), então o app diz que ele será informado na versão final.
- **Usuários atuais:** veem a tela de aceite uma vez ao atualizar. Nenhum dado é perdido.
- **Apagar dados não tem volta.** Por isso a confirmação acontece em duas etapas, com a oferta de baixar a cópia antes.
- **Sem servidor:** o registro do aceite fica só no aparelho, então não serve como prova centralizada. Só passa a ser necessário se o app passar a enviar dados.

### Próximos passos
- **Revisão jurídica:** levar ao advogado os pontos em aberto no documento.
- **Canal de contato:** preencher o e-mail em `CONTATO_PRIVACIDADE`.
- **Versão final:** quando os textos mudarem, subir `VERSAO_TERMOS`.
- **Fonte do app (opcional):** guardar a Poppins dentro do app tira o Google da lista de terceiros.
- **Média de preços:** o consentimento já tem texto no documento, mas só entra no app junto com o recurso.

