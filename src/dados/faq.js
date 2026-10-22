/* Perguntas e respostas do FAQ. As dicas "?" de todas as telas abrem estas respostas. */
import { Building2, Calculator, Landmark, LayoutDashboard, MapPin, PiggyBank } from "lucide-react";

/* ======================================================================= */
/* Aba: FAQ                                                                */
/* Conteúdo fundamentado em contabilidade gerencial consolidada (custo     */
/* fixo/variável, margem de contribuição, ponto de equilíbrio, alavancagem */
/* operacional) e na legislação vigente do Simples Nacional (LC 123/2006). */
/* Cada resposta é montada em blocos tipados (texto/formula/lista/exemplo) */
/* em vez de markdown cru — mais fácil de manter e de estilizar sem        */
/* depender de parsing de texto em tempo de execução.                      */
/* ======================================================================= */
export const FAQ_DADOS = [
  {
    categoria: "Custos e despesas",
    icon: Building2,
    perguntas: [
      {
        id: "custo-fixo-variavel",
        pergunta: "Qual a diferença entre custo fixo e custo variável, e por que isso importa tanto?",
        blocos: [
          {
            tipo: "texto",
            texto: `Custo fixo é o que você paga independentemente de atender 5 ou 50 clientes no mês: aluguel, energia da parte fixa (iluminação, ar-condicionado ligado o dia todo), internet, salário fixo da recepcionista, pró-labore. Custo variável é o que só existe porque um atendimento aconteceu: a tinta usada naquela coloração, o descartável, a comissão do profissional sobre aquele serviço específico.`,
          },
          {
            tipo: "texto",
            texto: `A separação importa porque muda a pergunta que você consegue responder. Sem ela, você só sabe "gastei X esse mês". Com ela, você sabe: "esse corte específico, depois de pagar o produto e a comissão dele, sobra quanto pra ajudar a pagar meu aluguel?" — essa sobra é a margem de contribuição, e é ela que paga os custos fixos e, só depois, gera lucro.`,
          },
          {
            tipo: "exemplo",
            texto: `Se você atende zero clientes em um mês de baixa, o aluguel e a internet continuam vencendo do mesmo jeito — isso é fixo. Já a tinta de coloração só é comprada e usada quando alguém agenda o serviço — isso é variável. Tratar tudo como "gasto do mês" misturado impede saber se um serviço específico está, na prática, dando prejuízo.`,
          },
        ],
      },
      {
        id: "rateio-despesas-fixas",
        pergunta: "Como faço o rateio de despesas fixas (aluguel, energia, água) entre os serviços?",
        blocos: [
          {
            tipo: "texto",
            texto: `Rateio é dividir um custo fixo, que não pertence a nenhum serviço específico, entre todos os serviços de forma proporcional a algum critério razoável — geralmente tempo de uso da estrutura (tempo de cadeira) ou número de atendimentos.`,
          },
          {
            tipo: "texto",
            texto: `O método mais simples e defensável para um negócio pequeno é: somar todos os custos fixos do mês, dividir pelo total de horas de atendimento disponíveis (ou realizadas) no mês, chegando a um "custo fixo por hora de cadeira". Cada serviço recebe a fatia proporcional ao tempo que ocupa.`,
          },
          {
            tipo: "exemplo",
            texto: `Se aluguel + energia + água + internet somam R$ 3.000/mês e o negócio tem capacidade para 300 horas de atendimento no mês, o custo fixo por hora é R$ 10. Uma escova de 40 min carrega R$ 6,67 de custo fixo rateado; uma coloração de 2h30 carrega R$ 25,00. É por isso que o app pede a duração de cada serviço — sem ela, o rateio não tem como ser feito de forma justa.`,
          },
        ],
      },
      {
        id: "consumo-ml-gramas",
        pergunta: 'Por que o app pede o consumo de produtos em mililitros ou gramas, em vez de só "quanto gasto de produto por mês"?',
        blocos: [
          {
            tipo: "texto",
            texto: `Porque "gasto por mês" mistura o consumo de serviços diferentes e não diz o custo real de UM atendimento. O consumo por ml/g permite chegar ao custo variável unitário de cada serviço — o dado que entra direto na fórmula de precificação.`,
          },
          {
            tipo: "exemplo",
            texto: `Um pote de coloração de 900 ml custa R$ 45,00, ou seja, R$ 0,05/ml. Uma coloração completa usa, em média, 60 ml de produto — isso é R$ 3,00 de custo de produto para aquele atendimento específico. Só com "gasto R$ 800 de produto por mês" não dá pra saber se esse valor está bem distribuído entre um serviço de R$ 40 e outro de R$ 150.`,
          },
        ],
      },
      {
        id: "depreciacao-equipamentos",
        pergunta: 'O que é depreciação de equipamentos, e por que ela entra na conta mesmo eu não "gastando" dinheiro todo mês?',
        blocos: [
          {
            tipo: "texto",
            texto: `Depreciação é a distribuição do custo de compra de um equipamento (secador, prancha, cadeira, autoclave) ao longo da sua vida útil estimada, transformando um gasto único em uma "parcela mensal" que representa o desgaste do bem em uso.`,
          },
          {
            tipo: "texto",
            texto: `Ela entra na conta porque, mesmo não sendo saída de caixa todo mês, é um custo real: o equipamento vai quebrar ou ficar obsoleto e vai precisar ser substituído. Sem reservar esse valor no preço, quando o equipamento quebrar o dinheiro pra repor sai "do nada" — geralmente do próprio bolso.`,
          },
          {
            tipo: "exemplo",
            texto: `Uma prancha de R$ 400 com vida útil estimada de 24 meses representa depreciação de R$ 16,67/mês. Isso entra no custo fixo mensal e é rateado como qualquer outro — e é também por isso que existe um Ponto de Equilíbrio Financeiro separado do contábil: ele mostra quanto é preciso faturar só em caixa, sem contar a depreciação.`,
          },
        ],
      },
    ],
  },
  {
    categoria: "Precificação",
    icon: Calculator,
    perguntas: [
      {
        id: "markup-divisor",
        pergunta: "Como a Calculadora chega no preço final de um serviço?",
        blocos: [
          {
            tipo: "texto",
            texto: `O app usa o método de markup divisor, tecnicamente correto quando existem custos e margens expressos como percentual sobre o preço de venda (impostos, comissões, margem de lucro desejada) — exatamente o caso de um negócio.`,
          },
          {
            tipo: "formula",
            texto: `Preço de Venda = Custo Variável Unitário ÷ (1 − (% despesas variáveis sobre o preço + % margem de lucro desejada + % impostos sobre a venda))`,
          },
          {
            tipo: "texto",
            texto: `O erro comum é usar "markup multiplicador" (multiplicar o custo por um número fixo), que aplica os percentuais sobre o custo em vez de sobre o preço final — isso subprecifica sistematicamente o serviço, porque impostos e comissões incidem sobre o que o cliente paga, não sobre o que você gastou.`,
          },
          {
            tipo: "exemplo",
            texto: `Um serviço com custo variável de R$ 20, imposto efetivo de 8% e margem de lucro desejada de 20% resulta em: R$ 20 ÷ (1 − 0,28) = R$ 27,78. Se você tivesse somado 20% sobre o custo (R$ 24), o preço não cobriria nem o imposto devido — o "lucro" apareceria na conta, mas sumiria na hora de pagar o DAS.`,
          },
        ],
      },
      {
        id: "margem-contribuicao",
        pergunta: 'O que é margem de contribuição, e por que ela é mais importante que "lucro" no dia a dia?',
        blocos: [
          {
            tipo: "texto",
            texto: `Margem de contribuição é o que sobra do preço de um serviço depois de descontar apenas os custos variáveis daquele serviço (produto, comissão, taxa de cartão). É esse valor que "contribui" para pagar os custos fixos do mês e, depois de pagos, vira lucro.`,
          },
          {
            tipo: "texto",
            texto: `Ela é mais útil que "lucro" no dia a dia porque o lucro só existe no fechamento do mês inteiro, enquanto a margem de contribuição diz, serviço por serviço, se vale a pena continuar oferecendo aquilo.`,
          },
          {
            tipo: "exemplo",
            texto: `Um serviço vendido a R$ 50, com R$ 15 de custo variável, tem margem de contribuição de R$ 35. Se o negócio tem R$ 3.500 de custos fixos no mês, são necessários 100 atendimentos desse serviço específico só para zerar o mês.`,
          },
        ],
      },
      {
        id: "comissao-parceiros",
        pergunta: "Como entram as comissões de profissionais parceiros no cálculo do preço?",
        blocos: [
          {
            tipo: "texto",
            texto: `Comissão sobre serviço (cadeira alugada com repasse por atendimento, ou profissional comissionado) é um custo variável, porque só existe quando o atendimento acontece — diferente do aluguel de cadeira fixo mensal, que é custo fixo independente de quantos clientes o profissional atendeu.`,
          },
          {
            tipo: "texto",
            texto: `Ela entra na fórmula de markup divisor como percentual sobre o preço de venda, junto dos impostos, já que normalmente é definida como "X% sobre o valor do serviço".`,
          },
          {
            tipo: "exemplo",
            texto: `Se um profissional comissionado recebe 40% sobre cada serviço, esse 40% precisa estar dentro do "% despesas variáveis" da fórmula. Ignorar isso e "pagar do que sobrar no fim do mês" é o caminho mais comum para o negócio descobrir, meses depois, que trabalhava basicamente pra cobrir a comissão do parceiro, sem margem real pro próprio negócio.`,
          },
        ],
      },
      {
        id: "taxa-media-recebimento",
        pergunta: "Como calcular a taxa de cartão quando eu recebo por várias formas de pagamento?",
        blocos: [
          {
            tipo: "texto",
            texto: `Cada forma de pagamento tem um custo diferente: dinheiro não tem taxa, e Pix, débito, crédito à vista e crédito parcelado podem ter taxas diferentes, que mudam de uma maquininha e de um banco para outro. Usar uma taxa só, "no chute", faz o preço sair errado para mais ou para menos.`,
          },
          {
            tipo: "texto",
            texto: `O jeito correto é a média ponderada: cada taxa pesa conforme a parte das vendas que entra por aquela forma. Assim, uma taxa alta numa forma pouco usada pesa pouco, e uma taxa baixa na forma mais usada pesa muito. A taxa entra na fórmula do markup divisor como percentual sobre o preço, junto da comissão e do imposto, porque ela é cobrada sobre o valor que o cliente paga.`,
          },
          { tipo: "formula", texto: `Taxa média = Σ (% das vendas na forma × taxa da forma) ÷ 100` },
          {
            tipo: "exemplo",
            texto: `Números só para ilustrar: se 20% das vendas entram em dinheiro (sem taxa), 40% em Pix sem taxa, 25% no débito a 1,6% e 15% no crédito a 3%, a taxa média é (20 × 0 + 40 × 0 + 25 × 1,6 + 15 × 3) ÷ 100 = 0,85%. Usar 3% em todos os serviços, "porque é a taxa do cartão", deixaria o preço mais alto do que precisa. A mensalidade da maquininha não entra aqui: ela é um custo fixo.`,
          },
        ],
      },
      {
        id: "preco-concorrencia",
        pergunta: "Como usar os preços da concorrência sem entrar numa guerra de preço?",
        blocos: [
          {
            tipo: "texto",
            texto: `O preço da concorrência mostra o que o cliente da sua região está acostumado a pagar, mas não paga os seus custos. Por isso o app mostra, para cada serviço, três referências juntas: o seu preço, o preço do meio entre os concorrentes que você anotou (a mediana) e o seu piso, que é o preço que só cobre os seus custos, sem lucro.`,
          },
          {
            tipo: "texto",
            texto: `A mediana é usada no lugar da média porque um concorrente muito caro ou muito barato não a puxa para um lado. E ela vale tanto quanto as anotações: com poucos concorrentes, ou com preços vistos há muitos meses, a comparação é só um indicativo.`,
          },
          {
            tipo: "lista",
            itens: [
              {
                titulo: "Acima da mediana",
                texto: `pode estar certo, se o seu serviço entrega mais (tempo, produto, atendimento). Deixe isso claro para o cliente.`,
              },
              { titulo: "Abaixo da mediana, mas acima do piso", texto: `há espaço para subir o preço sem sair do que a região pratica.` },
              {
                titulo: "Mediana abaixo do seu piso",
                texto: `baixar até ela daria prejuízo. O caminho é rever custos e tempo do serviço, não acompanhar o preço.`,
              },
            ],
          },
          {
            tipo: "exemplo",
            texto: `Números só para ilustrar: se o seu corte custa R$ 35, o seu piso é R$ 28 e a mediana de cinco barbearias anotadas num raio de 3 km é R$ 30, você está acima da região, mas com folga sobre o custo. Descer para R$ 30 ainda daria lucro, só que menor; descer para R$ 25 daria prejuízo em cada corte.`,
          },
        ],
      },
      {
        id: "salao-parceiro",
        pergunta: "Como funciona a Lei do Salão-Parceiro, e o que muda no preço?",
        blocos: [
          {
            tipo: "texto",
            texto: `A Lei 13.352/2016 incluiu na Lei 12.592/2012 o contrato de parceria entre salões e profissionais da beleza. O salão-parceiro recebe o pagamento do cliente, fica com a sua cota e repassa ao profissional-parceiro a cota-parte dele. Essa cota-parte não integra a receita bruta do salão, mesmo quando a nota fiscal ao cliente é uma só (art. 1º-A, §5º).`,
          },
          {
            tipo: "lista",
            itens: [
              {
                titulo: "Contrato",
                texto: `escrito, assinado perante duas testemunhas e homologado pelo sindicato da categoria ou, na falta dele, pelo órgão local do Ministério do Trabalho (§8º). Sem contrato, ou com o profissional fazendo funções fora dele, há vínculo de emprego (art. 1º-C).`,
              },
              {
                titulo: "CNPJ do parceiro",
                texto: `a lei permite (§7º), e as regras do Simples Nacional exigem o CNPJ do parceiro para o repasse sair da receita do salão.`,
              },
              { titulo: "Salão", texto: `precisa ser microempresa ou empresa de pequeno porte: salão MEI não pode ser salão-parceiro.` },
            ],
          },
          {
            tipo: "texto",
            texto: `No app, a cota-parte dos parceiros que cumprem esses requisitos sai da receita do salão. Por isso o imposto e a taxa da maquininha (dividida pela cota) entram no preço só sobre a parte do salão, e o DRE começa no valor cobrado dos clientes, desconta a cota-parte e chega à receita bruta do salão.`,
          },
          {
            tipo: "formula",
            texto: `Preço = (custo fixo rateado + custo variável) ÷ (1 − comissão − taxa × (1 − cota) − imposto × (1 − cota) − margem)`,
          },
          {
            tipo: "exemplo",
            texto: `Números do exemplo do app: corte com R$ 3,00 de produto, meia hora de cadeira, parceiro com 40% de cota, Simples de 6%, maquininha de 3% e margem de 25%. Com a parceria, o imposto fica em 3,6% do preço e a taxa em 1,8%, e o preço sai R$ 24,59. Tratando os 40% como comissão comum, o preço seria R$ 28,00. Confirme com seu contador o enquadramento do contrato antes de usar.`,
          },
        ],
      },
      {
        id: "tempo-de-cadeira",
        pergunta: "Por que o tempo de cadeira influencia tanto o preço quanto um material caro?",
        blocos: [
          {
            tipo: "texto",
            texto: `Porque o tempo de cadeira é o recurso mais escasso do negócio: você tem um número finito de horas por dia, por cadeira, por profissional. Um serviço que ocupa 2 horas impede, durante esse período, que qualquer outro serviço seja vendido naquele mesmo espaço.`,
          },
          {
            tipo: "texto",
            texto: `É por isso que o custo fixo rateado é distribuído por tempo, e não igualmente entre todos os serviços: um serviço rápido e um longo consomem quantidades muito diferentes do recurso mais limitado, mesmo usando quantidade parecida de produto.`,
          },
          {
            tipo: "exemplo",
            texto: `Uma escova (40 min) e uma coloração completa (2h30) podem usar valores parecidos de produto, mas a coloração "trava" a cadeira quase 4x mais tempo — sem preço proporcionalmente maior, esse mesmo tempo poderia ter atendido dois ou três clientes de serviços rápidos.`,
          },
        ],
      },
    ],
  },
  {
    categoria: "Pró-labore",
    icon: PiggyBank,
    perguntas: [
      {
        id: "o-que-e-pro-labore",
        pergunta: 'O que é pró-labore, e por que eu, dono do negócio, preciso "me pagar um salário"?',
        blocos: [
          {
            tipo: "texto",
            texto: `Pró-labore é a remuneração fixa mensal que o empresário se paga pelo trabalho de gestão e/ou atendimento que exerce no próprio negócio — juridicamente distinta da distribuição de lucros, e sujeita a INSS.`,
          },
          {
            tipo: "texto",
            texto: `A razão técnica para lançar isso como custo fixo é simples: se o seu trabalho não tiver um custo dentro da precificação, o app (e você) vai calcular uma margem de contribuição e um "lucro" que, na verdade, incluem escondido o valor do seu próprio trabalho — ou seja, você estaria trabalhando de graça sem perceber.`,
          },
          {
            tipo: "exemplo",
            texto: `Dois salões faturam o mesmo, mas um lança R$ 2.500 de pró-labore como custo fixo e o outro não lança nada. O segundo vai aparentar um "lucro" maior no papel — mas esse excedente é, na realidade, o salário não contabilizado do dono, confundido com lucro do negócio.`,
          },
        ],
      },
      {
        id: "pro-labore-vs-retirada",
        pergunta: 'Pró-labore e retirar dinheiro do caixa quando "sobra" são a mesma coisa?',
        blocos: [
          {
            tipo: "texto",
            texto: `Não. Pró-labore é fixo, previsível, definido antes de saber o resultado do mês, e entra na conta como custo — é o que garante que o preço dos serviços já cobre o seu trabalho. Retirar "o que sobrou" é distribuição de lucro, e só deveria acontecer depois que custos fixos (pró-labore incluso), variáveis e impostos já foram cobertos e o resultado do mês mostrou lucro de fato.`,
          },
          {
            tipo: "texto",
            texto: `Misturar os dois é o erro clássico do pequeno negócio: retirar do caixa conforme a necessidade pessoal do mês, sem relação com o resultado real, corrói o capital de giro do negócio silenciosamente até faltar dinheiro para comprar produto ou pagar o DAS.`,
          },
        ],
      },
    ],
  },
  {
    categoria: "Impostos e Simples Nacional",
    icon: Landmark,
    perguntas: [
      {
        id: "fator-r",
        pergunta: "O que é o Fator R, e por que ele pode reduzir o imposto que pago?",
        blocos: [
          {
            tipo: "texto",
            texto: `O Fator R é a razão entre a folha de pagamento dos últimos 12 meses (incluindo pró-labore, salários e encargos) e a receita bruta dos últimos 12 meses (RBT12). Para atividades de prestação de serviço, ele decide se você é tributado pelo Anexo III (alíquotas menores) ou pelo Anexo V (alíquotas maiores) do Simples Nacional, conforme a LC 123/2006: atingindo Fator R igual ou superior a 28%, a atividade migra para o Anexo III.`,
          },
          {
            tipo: "texto",
            texto: `Na prática, quanto maior a proporção da sua folha de pagamento (incluindo o seu próprio pró-labore) em relação ao faturamento, menor tende a ser sua carga tributária percentual — mais um motivo pelo qual lançar corretamente o pró-labore não é só uma questão contábil, é uma alavanca tributária real.`,
          },
        ],
      },
      {
        id: "rbt12-aliquota-efetiva",
        pergunta: "Como o app usa a Receita Bruta dos últimos 12 meses (RBT12) para calcular minha alíquota?",
        blocos: [
          {
            tipo: "texto",
            texto: `O Simples Nacional não usa uma alíquota fixa por faixa: dentro de cada tabela (Anexo III ou V), a alíquota efetiva é progressiva de fato, calculada por:`,
          },
          { tipo: "formula", texto: `Alíquota Efetiva = [(RBT12 × Alíquota Nominal da faixa) − Parcela a Deduzir] ÷ RBT12` },
          {
            tipo: "texto",
            texto: `É por isso que o app pede o faturamento acumulado dos últimos 12 meses, e não só o do mês — a alíquota que incide sobre o seu preço hoje depende do histórico recente do negócio, não apenas do mês corrente.`,
          },
        ],
      },
    ],
  },
  {
    categoria: "Painel Gerencial",
    icon: LayoutDashboard,
    perguntas: [
      {
        id: "dre",
        pergunta: "O que é a DRE, e o que ela mostra que o extrato do banco não mostra?",
        blocos: [
          {
            tipo: "texto",
            texto: `DRE (Demonstração do Resultado do Exercício) é o relatório que parte da receita bruta e vai descontando, em ordem, impostos, custos variáveis, custos fixos e pró-labore, até chegar no resultado líquido do período.`,
          },
          {
            tipo: "texto",
            texto: `A diferença fundamental para o extrato bancário é que a DRE segue o regime de competência (reconhece receitas e despesas quando ocorrem, não quando o dinheiro entra ou sai) e separa cada camada de custo — enquanto o extrato só mostra entradas e saídas misturadas, sem dizer se o negócio deu lucro ou só teve mais entradas que saídas naquele mês (o que pode acontecer mesmo com prejuízo real, por exemplo recebendo um pacote pago à vista antecipadamente).`,
          },
        ],
      },
      {
        id: "ponto-de-equilibrio",
        pergunta: "O que é ponto de equilíbrio, e por que existem três tipos diferentes no Painel?",
        blocos: [
          {
            tipo: "texto",
            texto: `Ponto de equilíbrio é o faturamento mínimo necessário para cobrir todos os custos, sem lucro nem prejuízo. Os três tipos existem porque respondem perguntas diferentes:`,
          },
          {
            tipo: "lista",
            itens: [
              {
                titulo: "Ponto de Equilíbrio Contábil",
                texto: `custos fixos totais (incluindo depreciação) ÷ margem de contribuição — responde "quanto preciso faturar para o resultado contábil zerar".`,
              },
              {
                titulo: "Ponto de Equilíbrio Financeiro",
                texto: `custos fixos menos a depreciação (que não é desembolso de caixa), mais eventuais parcelas de empréstimo, ÷ margem de contribuição — responde "quanto preciso faturar para o caixa não ficar negativo".`,
              },
              {
                titulo: "Ponto de Equilíbrio Econômico",
                texto: `custos fixos mais um retorno mínimo esperado sobre o capital investido, ÷ margem de contribuição — responde "quanto preciso faturar para esse negócio valer mais a pena do que deixar o dinheiro investido em outro lugar".`,
              },
            ],
          },
          {
            tipo: "texto",
            texto: `Por que os três importam juntos: é possível estar acima do ponto de equilíbrio financeiro (o caixa fecha) e ainda assim abaixo do contábil ou do econômico — ou seja, o negócio "sobrevive" no curto prazo, mas está descapitalizando o dono ou deixando de gerar o retorno que justificaria o risco do negócio.`,
          },
          {
            tipo: "texto",
            texto: `Com profissionais-parceiros (Lei do Salão-Parceiro), a cota-parte deles não é receita do salão. Por isso os pontos de equilíbrio, a margem de segurança, a sazonalidade e os gráficos de Evolução e da Projeção de caixa usam a receita do salão: o valor cobrado dos clientes menos a cota-parte. Para facilitar a comparação com o que passa na maquininha, o app mostra ao lado quanto cada ponto representa em valor cobrado. Exemplo: com R$ 20.000 cobrados e R$ 4.000 de cota-parte, um ponto de equilíbrio de R$ 12.000 de receita do salão equivale a R$ 15.000 cobrados (12.000 × 20.000 ÷ 16.000). A margem de segurança é a mesma nas duas réguas.`,
          },
        ],
      },
      {
        id: "margem-de-seguranca",
        pergunta: "O que é margem de segurança operacional?",
        blocos: [
          {
            tipo: "texto",
            texto: `É a distância percentual entre o seu faturamento atual e o ponto de equilíbrio. Ela mede o quanto o faturamento pode cair antes do negócio entrar na zona de prejuízo.`,
          },
          { tipo: "formula", texto: `Margem de Segurança = (Receita Atual − Receita no Ponto de Equilíbrio) ÷ Receita Atual` },
          {
            tipo: "exemplo",
            texto: `Se seu ponto de equilíbrio é R$ 8.000 e você fatura R$ 10.000, sua margem de segurança é 20% — um mês de baixa temporada com queda de até 20% no faturamento ainda mantém o negócio sem prejuízo; acima disso, entra em zona de risco.`,
          },
        ],
      },
      {
        id: "gao",
        pergunta: "O que é grau de alavancagem operacional (GAO), e por que ele é um alerta de risco?",
        blocos: [
          {
            tipo: "texto",
            texto: `O GAO mostra o quanto o seu lucro varia, percentualmente, para cada 1% de variação no faturamento. Quanto maior a proporção de custos fixos na sua estrutura, maior tende a ser o GAO — o negócio fica mais sensível a oscilações de demanda, para o bem e para o mal.`,
          },
          { tipo: "formula", texto: `GAO = Margem de Contribuição Total ÷ Lucro Operacional` },
          {
            tipo: "exemplo",
            texto: `Um GAO de 3 significa que uma queda de 10% no faturamento pode reduzir o lucro operacional em cerca de 30%. Isso é especialmente relevante para salões com estrutura fixa pesada (aluguel maior, mais cadeiras, mais equipamentos): o potencial de ganho em alta temporada é maior, mas a exposição em baixa temporada também.`,
          },
        ],
      },
      {
        id: "fluxo-caixa-sazonal",
        pergunta: "Por que o app projeta fluxo de caixa sazonal ao longo de 12 meses, e não só o mês atual?",
        blocos: [
          {
            tipo: "texto",
            texto: `Porque o setor de beleza tem sazonalidade real e recorrente (datas como Natal, Dia das Mães e formaturas geram picos; janeiro e fevereiro costumam ser mais fracos), e decisões como contratar um profissional, comprar um equipamento novo ou assumir um aluguel maior precisam considerar o ano inteiro — não o melhor (ou pior) mês isolado.`,
          },
          {
            tipo: "texto",
            texto: `Ver apenas o mês atual pode levar a decisões equivocadas nas duas direções: expandir demais baseado em um mês de alta temporada, ou cortar investimento necessário baseado em um mês tradicionalmente fraco.`,
          },
        ],
      },
    ],
  },
  {
    categoria: "Observatório de Mercado",
    icon: MapPin,
    perguntas: [
      {
        id: "copiar-concorrente",
        pergunta: "Posso simplesmente copiar o preço dos concorrentes que aparecem no Observatório?",
        blocos: [
          {
            tipo: "texto",
            texto: `Não é recomendado. O Observatório mostra preços praticados publicamente por outros estabelecimentos da região, o que é útil como referência de mercado — mas cada negócio tem uma estrutura de custos própria (aluguel, portfólio de equipamentos, nível de comissão, regime tributário) que só o seu próprio cálculo na Calculadora reflete.`,
          },
          {
            tipo: "texto",
            texto: `Um concorrente pode praticar um preço mais baixo porque tem aluguel menor, ou porque, sem saber, está com margem de contribuição negativa naquele serviço. Copiar o preço sem saber qual dessas situações é a real significa importar o problema do concorrente para o seu negócio. O Observatório deve ser usado para entender o posicionamento do seu preço na região — não para substituir o cálculo dos seus próprios custos.`,
          },
        ],
      },
    ],
  },
];

export function encontrarPerguntaFaq(id) {
  for (const c of FAQ_DADOS) {
    const p = c.perguntas.find((q) => q.id === id);
    if (p) return { ...p, categoria: c.categoria };
  }
  return null;
}
