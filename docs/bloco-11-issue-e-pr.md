# Bloco 11 — Issue e Pull Request

Issue e PR criados direto pelo Claude no GitHub.

## Issue #34 — [Nova função] Lei do Salão-Parceiro: cota-parte do parceiro fora da receita e do imposto

O app trata o preço inteiro de cada serviço como receita do salão e calcula o imposto sobre ele. No contrato de parceria da Lei do Salão-Parceiro, a cota-parte repassada ao profissional-parceiro não integra a receita bruta do salão (Lei 12.592/2012, art. 1º-A, §5º, com a redação da Lei 13.352/2016). Para quem trabalha assim, o app superestima o imposto e o preço.

Regras conferidas com o Daniel (contador):
- a cota-parte sai da receita do salão se o parceiro tiver CNPJ (exigência das regras do Simples Nacional) e houver contrato escrito e homologado (sindicato ou, sem ele, Ministério do Trabalho);
- sem contrato, há vínculo de emprego (art. 1º-C);
- salão MEI não pode ser salão-parceiro.

Decisões:
- novo tipo "Profissional-parceiro" no cadastro;
- DRE com "valor cobrado − cota-parte = receita bruta do salão";
- taxa da maquininha dividida pela cota.

Critério de aceite:
- Em Profissionais: tipo "Profissional-parceiro", com cota-parte, atendimentos, "Tem CNPJ" e "Contrato escrito e homologado". A tela diz se a cota sai ou não da receita, e por quê.
- Calculadora: imposto e taxa só sobre a parte do salão, com a média da equipe (só a parte dos parceiros) ou com a comissão própria marcada como cota-parte.
- Salão MEI: a cota vira comissão comum, com aviso.
- DRE (Painel, Excel, memorial, compartilhar): valor cobrado, cota-parte e receita bruta do salão. Sem parceiros, nada muda.
- Fechamento mensal: cota-parte do mês e imposto só sobre a parte do salão; fechamentos antigos iguais.
- Regime tributário: orientação para informar a receita de 12 meses sem as cotas e a folha sem os parceiros.
- FAQ com a explicação e a base legal.
- Testes automáticos das contas novas.

## Pull Request — Bloco 11: Lei do Salão-Parceiro

Closes #34

## O que mudou

### Cadastro
- Novo tipo em "Como trabalha": **Profissional-parceiro**. Campos:
  - **Cota-parte do parceiro** (%);
  - **Atendimentos/mês**;
  - **Tem CNPJ (MEI ou microempresa)**;
  - **Contrato de parceria escrito e homologado**.
- A linha de cada parceiro diz, em uma frase, o que vale para ele:
  - "a cota-parte fica fora da receita do salão";
  - "sem CNPJ e contrato homologado, entra como comissão comum";
  - "salão MEI não pode ser salão-parceiro".
- Com parceria válida, a seção Profissionais mostra o resumo, com link para o FAQ. O Regime tributário orienta a informar a receita de 12 meses sem as cotas e a folha sem os parceiros.

### Contas (`src/calculos.js`)
- `parceiroValido(p)` exige CNPJ e contrato. `computeNegocioDerivado` calcula `parceriaPermitida`, que é falso para salão MEI, e `temParceriaValida`.
- `calcularComissaoEquipe` inclui os parceiros na média e devolve `parcelaParceiroPct`, a parte da média que é cota-parte de parceiro válido.
- `parcelaParceiro(servico, nd)`: com a média da equipe, a parte dos parceiros; com comissão própria marcada como cota-parte, a comissão inteira; senão, 0.
- **Motores de preço (Modo A e B):** imposto sobre o preço = alíquota × (1 − cota) e taxa da maquininha = taxa × (1 − cota), com a taxa dividida pela cota. A comissão continua inteira. Novos campos devolvidos: `parcelaParceiroPct`, `impostoSobrePrecoPct` e `valorCotaParte`.
- **DRE (`montarDRE`):** `valorCobrado` − `cotaParteParceiros` = `receitaBruta` do salão. A cota sai dos custos variáveis, para não ser descontada duas vezes.
- **DRE do mês (`montarDREMensal`):** lê `cotaParteSnapshot`, com 0 para os fechamentos antigos.
- **Preço mínimo de pacote:** imposto e taxa ponderados já sem a cota.

### Telas
- **Calculadora:**
  - na comissão própria, a opção "Esta comissão é a cota-parte de um profissional-parceiro";
  - na média da equipe, cada parceiro aparece como "(parceiro)" ou "(parceiro, conta como comissão)";
  - um aviso diz quanto do preço é cota-parte;
  - a linha de imposto mostra o percentual já sobre a parte do salão;
  - o simulador de sensibilidade segue a mesma regra.
- **DRE do Painel, Excel, memorial de cálculo e texto de compartilhar:** "Valor cobrado dos clientes", "(–) Cota-parte repassada aos parceiros" e "= Receita bruta do salão", só quando houver parceiros.
- **Fechamento mensal:**
  - a cota-parte do mês vem do detalhamento por serviço ou, sem ele, do faturamento de cada parceiro na divisão por profissional;
  - o imposto estimado incide só sobre a parte do salão;
  - o fechamento guarda `cotaParteSnapshot`;
  - a margem por serviço nos comparativos usa a mesma regra.
- **FAQ:** "Como funciona a Lei do Salão-Parceiro, e o que muda no preço?", com a base legal, os requisitos, a fórmula e um exemplo com os números do app.

### Outros
- Versão exibida no app: v7.17 → v7.18.
- `CONTEXTO.md`: seção "Lei do Salão-Parceiro" com a base legal conferida e as regras do código.

## Como foi validado
- **63 testes unitários** passando, 10 deles novos. Os novos conferem:
  - parceiro só vale com CNPJ e contrato;
  - imposto de 3,6% (6% × 60%) e taxa de 1,8% (3% × 60%), com o Corte a **R$ 24,59** contra **R$ 28,00** sem parceria;
  - salão MEI sem redução;
  - média da equipe com parcela de parceiro de 17,8% (40% × 80 ÷ 180), que cai para 0 sem CNPJ;
  - Modo A e Modo B batendo;
  - DRE com valor cobrado − cota = receita do salão e imposto só sobre a parte do salão;
  - DRE sem parceiros igual ao de antes;
  - fechamentos antigos e novos.
- **16 testes no navegador** passando no celular e no computador, incluindo um novo: marcar a comissão do Corte (30%) como cota-parte faz o preço ir de R$ 20,22 para **R$ 18,81** (conferido à mão: 7,28 ÷ (1 − 30% − 2,1% − 4,2% − 25%)), e o DRE passa a mostrar a cota-parte.
- **Conferido no navegador:**
  - DRE do exemplo com o Corte em parceria: valor cobrado de R$ 8.829,69, cota-parte de R$ 677,10 (R$ 18,81 × 30% × 120) e receita do salão de R$ 8.152,58;
  - aviso de 17,8% de cota-parte na média da equipe;
  - aviso de salão MEI;
  - fechamento do mês com R$ 10.000,00 de faturamento e R$ 5.000,00 da parceira: cota de R$ 2.000,00, imposto de R$ 480,00 ((10.000 − 2.000) × 6%) e lucro de R$ 3.960,00.
- **Regressão dos blocos 3 a 6** com os mesmos números de antes. Sem parceiros, o app calcula exatamente como na v7.17. Nenhum erro de JavaScript e nenhuma rolagem lateral, no celular e no computador, nos temas claro e escuro.

## Riscos e limitações
- **Responsabilidade de quem cadastra:** o app confia nas marcações de CNPJ e contrato homologado. O texto do FAQ recomenda confirmar o contrato com o contador.
- **Cota sobre o valor cheio:** a cota-parte é calculada sobre o preço cheio, e a taxa da maquininha é dividida na proporção da cota. Contratos com outra regra (por exemplo, cota sobre o valor líquido de produtos) não são representados.
- **Pontos de equilíbrio e margem de segurança** passam a ser sobre a receita do salão, já sem a cota. Com parceiros, esses valores ficam menores que o valor cobrado dos clientes.
- **ISS fora do Simples** não é tratado: o app só calcula Simples e MEI.
- **Fechamento sem detalhamento e sem divisão por profissional:** não há como saber a cota do mês, que fica em 0.

## Próximos passos
- Lembrete de cópia de segurança depois de salvar o fechamento do mês.
- Biome (lint e formatação) em PR próprio.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Jysjppu3ZxHZKVkdUuezka
