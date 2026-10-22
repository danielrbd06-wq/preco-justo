/* ======================================================================= */
/* Testes das contas do Preço Justo (Vitest). Os valores esperados foram   */
/* conferidos à mão e batem com o que o app mostra com "Carregar exemplo". */
/* Se uma mudança alterar um destes números, o teste falha e o merge fica  */
/* bloqueado até alguém confirmar que a conta nova está certa.             */
/* ======================================================================= */
import { describe, expect, it } from "vitest";
import {
  ANEXO_III,
  ANEXO_V,
  aliquotaEfetiva,
  calcularComissaoEquipe,
  calcularIndicadoresGerenciais,
  calcularParaExibicao,
  calcularPrecoMinimoPacote,
  calcularReverso,
  calcularServico,
  calcularTaxaRecebimento,
  calcularUnificado,
  calcularValorItemVariavel,
  comissaoEfetiva,
  computeNegocioDerivado,
  converterParaDias,
  custoMensalInsumoCompartilhado,
  diasDesde,
  distanciaKm,
  equivalenteEmValorCobrado,
  fmtPct,
  linhasPlanilhaObservatorio,
  mediana,
  montarDRE,
  montarDREMensal,
  N,
  normalizarValorBR,
  parceiroValido,
  parcelaParceiro,
  pisoDoServico,
  pontoEquilibrioSemanal,
  posicaoNaConcorrencia,
  precoUnitarioItem,
  receitaDoSalao,
  taxaEfetiva,
  ultimoPrecoPorConcorrente,
  vinculoDe,
} from "./calculos.js";

/* Mesmo cenário do "Carregar exemplo": salão de 2 profissionais no Simples. */
const negocioExemplo = () => ({
  custosFixos: [
    { id: "a", nome: "Aluguel do espaço", valor: "900", semCaixa: false },
    { id: "b", nome: "Água, luz e internet", valor: "280", semCaixa: false },
    { id: "c", nome: "Contador", valor: "180", semCaixa: false },
    { id: "d", nome: "Depreciação", valor: "", semCaixa: true },
  ],
  insumosCompartilhados: [],
  profissionais: [],
  recebimento: {},
  perfil: { segmento: "salao", modeloOperacao: "autonomo", cidade: "Feira de Santana" },
  diasMes: "26",
  horasDia: "8",
  numeroProfissionais: "2",
  proLabore: "2200",
  regime: "simples",
  meiDas: "",
  rbt12: "90000",
  folha12: "22000",
  atividadeSempreAnexoIII: true,
  capitalInvestido: "8000",
  taxaRetorno: "0.8",
});
const servicosExemplo = () => [
  {
    id: "corte",
    nome: "Corte Masculino",
    modo: "descobrir",
    custosVariaveis: [{ id: "1", modo: "direto", valor: "3" }],
    comissaoPct: 30,
    taxaCartaoPct: 3,
    margemPct: 25,
    horasPorAtendimento: 0.5,
    atendimentosMes: 120,
  },
  {
    id: "escova",
    nome: "Escova",
    modo: "descobrir",
    custosVariaveis: [{ id: "2", modo: "direto", valor: "5" }],
    comissaoPct: 30,
    taxaCartaoPct: 3,
    margemPct: 25,
    horasPorAtendimento: 1,
    atendimentosMes: 55,
  },
  {
    id: "coloracao",
    nome: "Coloração",
    modo: "descobrir",
    custosVariaveis: [
      { id: "3", modo: "direto", valor: "35" },
      { id: "4", modo: "direto", valor: "2" },
    ],
    comissaoPct: 30,
    taxaCartaoPct: 3,
    margemPct: 30,
    horasPorAtendimento: 1.5,
    atendimentosMes: 28,
  },
];
const comCalc = (servicos, nd) => servicos.map((s) => ({ ...s, calc: calcularParaExibicao(s, nd) }));

describe("leitura de valores no padrão brasileiro", () => {
  it.each([
    ["2.500", 2500],
    ["2.500,00", 2500],
    ["22.000", 22000],
    ["1.234.567", 1234567],
    ["2500,50", 2500.5],
    ["4.800.000,00", 4800000],
    ["2.5", 2.5],
    ["2.50", 2.5],
    ["R$ 1.234,56", 1234.56],
  ])("'%s' vira %d", (digitado, esperado) => {
    expect(N(normalizarValorBR(digitado))).toBe(esperado);
  });
  it("mostra percentual com vírgula", () => {
    expect(fmtPct(6, 2)).toBe("6,00%");
    expect(fmtPct(27.777)).toBe("27,8%");
  });
});

describe("Simples Nacional (LC 123/2006)", () => {
  it("1ª faixa: a alíquota efetiva é a nominal", () => {
    expect(aliquotaEfetiva(90000, ANEXO_III).aliqEfetiva).toBeCloseTo(0.06, 10);
    expect(aliquotaEfetiva(90000, ANEXO_V).aliqEfetiva).toBeCloseTo(0.155, 10);
  });
  it("2ª faixa do Anexo III: (RBT12 × 11,2% − 9.360) ÷ RBT12", () => {
    expect(aliquotaEfetiva(300000, ANEXO_III).aliqEfetiva).toBeCloseTo(24240 / 300000, 10);
  });
  it("acima de R$ 4,8 milhões sai do Simples", () => {
    expect(aliquotaEfetiva(5000000, ANEXO_III)).toBeNull();
  });
  it("Fator R abaixo de 28% e sem a regra da atividade vai para o Anexo V", () => {
    const nd = computeNegocioDerivado({ ...negocioExemplo(), atividadeSempreAnexoIII: false });
    expect(nd.fatorR).toBeCloseTo(22000 / 90000, 10);
    expect(nd.anexoUsado).toBe("V");
    expect(nd.impostoPct).toBeCloseTo(15.5, 10);
  });
  it("Fator R de 28% ou mais vai para o Anexo III", () => {
    const nd = computeNegocioDerivado({ ...negocioExemplo(), atividadeSempreAnexoIII: false, folha12: "30000" });
    expect(nd.anexoUsado).toBe("III");
  });
});

describe("negócio de exemplo", () => {
  const nd = computeNegocioDerivado(negocioExemplo());
  it("custo fixo, capacidade, custo por hora e imposto", () => {
    expect(nd.custoFixoTotal).toBe(3560);
    expect(nd.horasTotais).toBe(416);
    expect(nd.custoFixoPorHora).toBeCloseTo(3560 / 416, 10);
    expect(nd.impostoPct).toBeCloseTo(6, 10);
    expect(nd.configurado).toBe(true);
  });
  it("preços pelo markup divisor (iguais aos do exemplo)", () => {
    const [corte, escova, coloracao] = servicosExemplo().map((s) => calcularServico(s, nd));
    expect(corte.preco).toBeCloseTo(20.22, 2);
    expect(escova.preco).toBeCloseTo(37.66, 2);
    expect(coloracao.preco).toBeCloseTo(160.76, 2);
    // preço × (1 − 64%) = custo fixo rateado + variáveis
    expect(corte.preco * 0.36).toBeCloseTo(nd.custoFixoPorHora * 0.5 + 3, 10);
  });
  it("Modo A e Modo B batem: cobrando o preço do Modo A, a margem é a meta", () => {
    const corte = servicosExemplo()[0];
    const a = calcularServico(corte, nd);
    const b = calcularReverso({ ...corte, precoCobrado: a.preco, margemMetaPct: 25 }, nd);
    expect(b.margemLiquidaPct).toBeCloseTo(25, 8);
    expect(b.precoIdeal).toBeCloseTo(a.preco, 8);
  });
  it("trava quando os percentuais somam 100% ou mais", () => {
    const r = calcularServico({ ...servicosExemplo()[0], margemPct: 61 }, nd);
    expect(r.status).toBe("trava-percentual");
  });
  it("DRE gerencial do mês", () => {
    const dre = montarDRE(comCalc(servicosExemplo(), nd), nd);
    expect(dre.receitaBruta).toBeCloseTo(8998.96, 1);
    expect(dre.margemContribuicaoTotal).toBeCloseTo(3818.37, 1);
    expect(dre.resultadoOperacional).toBeCloseTo(258.37, 1);
  });
  it("pontos de equilíbrio, margem de segurança e GAO", () => {
    const sc = comCalc(servicosExemplo(), nd);
    const dre = montarDRE(sc, nd);
    const ind = calcularIndicadoresGerenciais(
      sc.filter((s) => s.calc.status === "ok"),
      dre,
      nd,
      negocioExemplo(),
    );
    expect(ind.peContabilRS).toBeCloseTo(8390.05, 1);
    expect(ind.peFinanceiroRS).toBeCloseTo(8390.05, 1); // sem depreciação cadastrada
    expect(ind.peEconomicoRS).toBeCloseTo(8540.89, 1); // + R$ 8.000 × 0,8%
    expect(ind.custoOportunidadeMes).toBeCloseTo(64, 10);
    expect(ind.margemSeguranca).toBeCloseTo(6.8, 1);
    expect(ind.gao).toBeCloseTo(dre.margemContribuicaoTotal / dre.resultadoOperacional, 10);
  });
  it("piso do serviço: preço com margem zero", () => {
    expect(pisoDoServico(servicosExemplo()[0], nd)).toBeCloseTo(11.93, 2);
  });
  it("preço mínimo de pacote usa a menor margem dos serviços escolhidos", () => {
    const sc = comCalc(servicosExemplo(), nd);
    const r = calcularPrecoMinimoPacote([sc[0], sc[2]], nd);
    expect(r.status).toBe("ok");
    expect(r.margemUsadaPct).toBe(25);
  });
  it("DRE de um fechamento antigo, sem aluguel, continua igual", () => {
    const d = montarDREMensal({
      faturamentoBruto: 1000,
      impostoPagoReal: 60,
      custosVariaveisReaisInformados: 300,
      custosFixosSnapshot: 500,
    });
    expect(d.resultadoOperacional).toBe(140);
  });
});

describe("custos variáveis", () => {
  const ctx = { atendimentosMes: 120, diasMesNegocio: 26, insumosCompartilhados: [] };
  it("por duração: R$ 80 que duram 45 dias", () => {
    expect(calcularValorItemVariavel({ modo: "duracao", valorCompra: "80", duracaoValor: "45", duracaoUnidade: "dias" }, ctx)).toBeCloseTo(
      80 / ((45 / 26) * 120),
      10,
    );
  });
  it("por unidade: caixa de 100 toucas a R$ 40, 1 por atendimento", () => {
    expect(
      calcularValorItemVariavel({ modo: "unidade", valorCompra: "40", quantidadeComprada: "100", usoPorAtendimento: "1" }, ctx),
    ).toBeCloseTo(0.4, 10);
  });
});

describe("comissão média da equipe e aluguel de cadeira (Bloco 4)", () => {
  const equipe = [
    { id: "ana", nome: "Ana", ativo: true, vinculo: "comissao", comissaoPct: "40", atendimentosMes: "80" },
    { id: "bia", nome: "Bia", ativo: true, vinculo: "comissao", comissaoPct: "30", atendimentosMes: "60" },
    { id: "maria", nome: "Maria", ativo: true, vinculo: "dono", atendimentosMes: "40" },
    { id: "carla", nome: "Carla", ativo: true, vinculo: "aluguel", aluguelMes: "600" },
  ];
  it("média ponderada pelos atendimentos: (3.200 + 1.800 + 0) ÷ 180", () => {
    const r = calcularComissaoEquipe(equipe);
    expect(r.ponderada).toBe(true);
    expect(r.pct).toBeCloseTo(5000 / 180, 10);
    expect(r.participantes.map((p) => p.nome)).toEqual(["Ana", "Bia", "Maria"]);
  });
  it("sem atendimentos de alguém, vira média simples", () => {
    const r = calcularComissaoEquipe([equipe[0], { ...equipe[1], atendimentosMes: "" }]);
    expect(r.ponderada).toBe(false);
    expect(r.pct).toBeCloseTo(35, 10);
  });
  it("com uma pessoa só, não há média", () => {
    expect(calcularComissaoEquipe([equipe[0]])).toBeNull();
  });
  it("serviço antigo, sem comissaoModo, mantém a comissão própria", () => {
    const nd = computeNegocioDerivado({ ...negocioExemplo(), profissionais: equipe });
    expect(comissaoEfetiva({ comissaoPct: 30 }, nd)).toBe(30);
    expect(comissaoEfetiva({ comissaoPct: 30, comissaoModo: "equipe" }, nd)).toBeCloseTo(27.78, 2);
  });
  it("aluguel recebido reduz o custo fixo a cobrir e entra no DRE como receita", () => {
    const nd = computeNegocioDerivado({ ...negocioExemplo(), profissionais: equipe });
    expect(nd.receitaAluguelCadeiras).toBe(600);
    expect(nd.custoFixoLiquido).toBe(2960);
    expect(nd.custoFixoPorHora).toBeCloseTo(2960 / 416, 10);
    const dre = montarDRE(comCalc(servicosExemplo(), nd), nd);
    expect(dre.aluguelRecebido).toBe(600);
    expect(dre.resultadoOperacional).toBeCloseTo(dre.margemContribuicaoTotal - 3560 + 600, 10);
    expect(dre.resultadoOperacional).toBeCloseTo(458.12, 1);
  });
});

describe("taxa média de recebimento (Bloco 5)", () => {
  const formas = {
    dinheiro: { participacaoPct: "20" },
    pix: { participacaoPct: "40", taxaPct: "0" },
    debito: { participacaoPct: "25", taxaPct: "1.6" },
    credito: { participacaoPct: "15", taxaPct: "3" },
  };
  it("(25 × 1,6 + 15 × 3) ÷ 100 = 0,85%", () => {
    const r = calcularTaxaRecebimento(formas);
    expect(r.completo).toBe(true);
    expect(r.pct).toBeCloseTo(0.85, 10);
  });
  it("só vale como média do negócio quando soma 100%", () => {
    const parcial = { dinheiro: formas.dinheiro, pix: formas.pix };
    expect(calcularTaxaRecebimento(parcial).completo).toBe(false);
    const nd = computeNegocioDerivado({ ...negocioExemplo(), recebimento: parcial });
    expect(nd.taxaRecebimento).toBeNull();
    expect(taxaEfetiva({ taxaCartaoPct: 3, taxaModo: "negocio" }, nd)).toBe(3);
  });
  it("dinheiro nunca tem taxa, mesmo se alguém digitar", () => {
    const r = calcularTaxaRecebimento({ dinheiro: { participacaoPct: "100", taxaPct: "5" } });
    expect(r.pct).toBe(0);
  });
  it("com a média, o preço é o mesmo de digitar a taxa à mão", () => {
    const nd = computeNegocioDerivado({ ...negocioExemplo(), recebimento: formas });
    const corte = servicosExemplo()[0];
    const comMedia = calcularServico({ ...corte, taxaModo: "negocio" }, nd);
    const aMao = calcularServico({ ...corte, taxaCartaoPct: 0.85 }, nd);
    expect(comMedia.preco).toBeCloseTo(aMao.preco, 10);
    expect(comMedia.taxaCartaoPct).toBeCloseTo(0.85, 10);
  });
});

describe("comparação com a concorrência (Bloco 6)", () => {
  it("mediana", () => {
    expect(mediana([30, 18, 25])).toBe(25);
    expect(mediana([1, 2, 3, 4])).toBe(2.5);
  });
  it("conta só o preço mais recente de cada concorrente", () => {
    const c = [
      {
        id: "x",
        precos: [
          { servicoId: "corte", valor: 20, data: "2026-01-10" },
          { servicoId: "corte", valor: 28, data: "2026-09-01" },
          { servicoId: "escova", valor: 40, data: "2026-09-02" },
        ],
      },
    ];
    const r = ultimoPrecoPorConcorrente(c, "corte");
    expect(r).toHaveLength(1);
    expect(r[0].valor).toBe(28);
  });
  it("distância: 1 grau de latitude ≈ 111,2 km", () => {
    expect(distanciaKm({ lat: -12, lng: -38.9 }, { lat: -13, lng: -38.9 })).toBeCloseTo(111.19, 1);
    expect(distanciaKm({ lat: -12.27, lng: -38.97 }, { lat: -12.27, lng: -38.97 })).toBe(0);
  });
});

describe("planilha do Observatório (Bloco 10)", () => {
  const nd = computeNegocioDerivado(negocioExemplo());
  const hoje = new Date("2026-10-11T12:00:00");
  const concorrentes = [
    {
      id: "a",
      cidade: "Feira de Santana",
      nome: "Barbearia A",
      tipo: "Barbearia",
      bairro: "Centro",
      lat: -12.26,
      lng: -38.96,
      precos: [
        { id: "p1", servicoId: "corte", servicoNome: "Corte Masculino", valor: 20, data: "2026-01-10", fonte: "local" },
        { id: "p2", servicoId: "corte", servicoNome: "Corte Masculino", valor: 25, data: "2026-10-01", fonte: "internet" },
      ],
    },
    {
      id: "b",
      cidade: "Feira de Santana",
      nome: "Salão B",
      tipo: "Salão",
      bairro: "",
      lat: null,
      lng: null,
      precos: [
        { id: "p3", servicoId: "corte", servicoNome: "Corte Masculino", valor: 30, data: "2026-03-01", fonte: "contato" },
        { id: "p4", servicoId: null, servicoNome: "Sobrancelha", valor: 35, data: "2026-10-01", fonte: "cliente" },
      ],
    },
    {
      id: "c",
      cidade: "Irará",
      nome: "Barbearia C",
      tipo: "Barbearia",
      bairro: "Centro",
      lat: -12.046,
      lng: -38.766,
      precos: [{ id: "p5", servicoId: "corte", servicoNome: "Corte Masculino", valor: 18, data: "2026-10-05", fonte: "local" }],
    },
  ];
  const meusLocais = { "Feira de Santana": { lat: -12.2667, lng: -38.9667 } };
  const linhas = linhasPlanilhaObservatorio(concorrentes, meusLocais, servicosExemplo(), nd, hoje);

  it("posição na concorrência, com o mesmo texto da tela", () => {
    expect(posicaoNaConcorrencia(20.22, [25, 30]).texto).toBe("abaixo de todos");
    expect(posicaoNaConcorrencia(20.22, [25]).texto).toBe("abaixo do concorrente");
    expect(posicaoNaConcorrencia(25.3, [18, 25, 30]).texto).toBe("na mediana");
    expect(posicaoNaConcorrencia(28, [18, 25, 30]).texto).toBe("acima da mediana");
  });
  it("dias desde a anotação", () => {
    expect(diasDesde("2026-10-01", hoje)).toBe(10);
  });
  it("aba de concorrentes: distância só para quem tem posição e está na cidade do negócio marcado", () => {
    expect(linhas.concorrentes).toHaveLength(4);
    const [, a, b, c] = linhas.concorrentes;
    expect(a[0]).toBe("Feira de Santana");
    expect(a[4]).toBeGreaterThan(0.5);
    expect(a[4]).toBeLessThan(1.5);
    expect(b[4]).toBeNull(); // sem posição no mapa
    expect(c[4]).toBeNull(); // Irará: negócio não marcado lá
  });
  it("aba de preços: todas as anotações, com data no padrão brasileiro e fora da comparação marcado", () => {
    expect(linhas.precos).toHaveLength(6);
    const sobrancelha = linhas.precos.find((l) => l[2] === "Sobrancelha");
    expect(sobrancelha[3]).toBe("Não");
    expect(sobrancelha[5]).toBe("01/10/2026");
    expect(sobrancelha[6]).toBe("Cliente contou");
  });
  it("aba de comparação: por cidade, com o preço mais recente de cada concorrente", () => {
    expect(linhas.comparacao).toHaveLength(3); // cabeçalho + Feira + Irará (só o Corte tem preços)
    const feira = linhas.comparacao.find((l) => l[0] === "Feira de Santana");
    expect(feira[1]).toBe("Corte Masculino");
    expect(feira[2]).toBeCloseTo(20.22, 2);
    expect(feira[3]).toBeCloseTo(11.93, 2);
    expect(feira[4]).toBe(2); // Barbearia A conta uma vez só (R$ 25, a mais recente)
    expect(feira[5]).toBe(25); // menor
    expect(feira[6]).toBe(27.5); // mediana de 25 e 30
    expect(feira[7]).toBe(30); // maior
    // diferença para a mediana, em %, com uma casa: (20,22 − 27,50) ÷ 27,50 ≈ −26,5%
    expect(feira[8]).toBe(-26.5);
    expect(feira[9]).toBe("abaixo de todos");
    expect(feira[10]).toBe(1); // o de R$ 30 é de março: mais de 6 meses
    const irara = linhas.comparacao.find((l) => l[0] === "Irará");
    expect(irara[9]).toBe("acima do concorrente");
  });
});

describe("Lei do Salão-Parceiro (Bloco 11)", () => {
  const parceira = {
    id: "ana",
    nome: "Ana",
    ativo: true,
    vinculo: "parceiro",
    comissaoPct: "40",
    atendimentosMes: "80",
    temCnpj: true,
    contratoHomologado: true,
  };
  const comissionada = { id: "bia", nome: "Bia", ativo: true, vinculo: "comissao", comissaoPct: "30", atendimentosMes: "60" };
  const dona = { id: "maria", nome: "Maria", ativo: true, vinculo: "dono", atendimentosMes: "40" };
  const ndCom = (extra = {}) => computeNegocioDerivado({ ...negocioExemplo(), profissionais: [parceira, comissionada, dona], ...extra });
  const corteParceiro = { ...servicosExemplo()[0], comissaoPct: 40, comissaoEhCotaParte: true };

  it("parceiro só vale com CNPJ e contrato homologado", () => {
    expect(parceiroValido(parceira)).toBe(true);
    expect(parceiroValido({ ...parceira, temCnpj: false })).toBe(false);
    expect(parceiroValido({ ...parceira, contratoHomologado: false })).toBe(false);
    expect(parceiroValido(comissionada)).toBe(false);
  });
  it("imposto e taxa só sobre a parte do salão: 6% × 60% = 3,6%; 3% × 60% = 1,8%", () => {
    const nd = ndCom();
    const r = calcularServico(corteParceiro, nd);
    expect(r.parcelaParceiroPct).toBe(40);
    expect(r.impostoSobrePrecoPct).toBeCloseTo(3.6, 10);
    expect(r.taxaCartaoPct).toBeCloseTo(1.8, 10);
    // (R$ 3,00 + 0,5 h × custo/h) ÷ (1 − 40% − 1,8% − 3,6% − 25%)
    expect(r.preco).toBeCloseTo((3 + 0.5 * nd.custoFixoPorHora) / (1 - 0.704), 8);
    expect(r.preco).toBeCloseTo(24.59, 2);
    expect(r.valorCotaParte).toBeCloseTo(r.preco * 0.4, 10);
  });
  it("sem parceria, a mesma comissão de 40% dá preço maior", () => {
    const nd = ndCom();
    const r = calcularServico({ ...corteParceiro, comissaoEhCotaParte: false }, nd);
    expect(r.parcelaParceiroPct).toBe(0);
    expect(r.preco).toBeCloseTo((3 + 0.5 * nd.custoFixoPorHora) / (1 - 0.74), 8);
  });
  it("salão MEI não pode ser salão-parceiro: a cota vira comissão comum", () => {
    const nd = ndCom({ regime: "mei", meiDas: "80" });
    expect(nd.temParceriaValida).toBe(false);
    expect(parcelaParceiro(corteParceiro, nd)).toBe(0);
  });
  it("média da equipe: só a parte dos parceiros válidos sai da receita (40% × 80 ÷ 180)", () => {
    const nd = ndCom();
    expect(nd.comissaoEquipe.pct).toBeCloseTo(5000 / 180, 10);
    expect(nd.comissaoEquipe.parcelaParceiroPct).toBeCloseTo(3200 / 180, 10);
    expect(parcelaParceiro({ comissaoModo: "equipe" }, nd)).toBeCloseTo(17.78, 2);
    const semCnpj = computeNegocioDerivado({ ...negocioExemplo(), profissionais: [{ ...parceira, temCnpj: false }, comissionada, dona] });
    expect(semCnpj.comissaoEquipe.parcelaParceiroPct).toBe(0);
  });
  it("Modo A e Modo B batem também com parceiro", () => {
    const nd = ndCom();
    const a = calcularServico(corteParceiro, nd);
    const b = calcularReverso({ ...corteParceiro, precoCobrado: a.preco, margemMetaPct: 25 }, nd);
    expect(b.margemLiquidaPct).toBeCloseTo(25, 8);
  });
  it("DRE: valor cobrado − cota-parte = receita do salão, e a cota sai dos custos variáveis", () => {
    const nd = ndCom();
    const sc = [{ ...corteParceiro, calc: calcularServico(corteParceiro, nd) }];
    const dre = montarDRE(sc, nd);
    const P = sc[0].calc.preco;
    expect(dre.valorCobrado).toBeCloseTo(P * 120, 8);
    expect(dre.cotaParteParceiros).toBeCloseTo(P * 0.4 * 120, 8);
    expect(dre.receitaBruta).toBeCloseTo(P * 0.6 * 120, 8);
    expect(dre.impostos).toBeCloseTo(P * 0.6 * 0.06 * 120, 8); // 6% sobre a parte do salão
    // margem de contribuição = mesma conta por unidade do motor
    expect(dre.margemContribuicaoTotal).toBeCloseTo(sc[0].calc.margemContribuicaoUnitaria * 120, 8);
  });
  // Bloco 16 (opção C): a régua é a receita do salão; o valor cobrado é a tradução.
  it("equivalente em valor cobrado: R$ 12.000 × 20.000 ÷ (20.000 − 4.000) = R$ 15.000", () => {
    expect(equivalenteEmValorCobrado(12000, { valorCobrado: 20000, cotaParteParceiros: 4000 })).toBe(15000);
    expect(equivalenteEmValorCobrado(12000, { valorCobrado: 20000, cotaParteParceiros: 0 })).toBeNull();
    expect(equivalenteEmValorCobrado(12000, { valorCobrado: 4000, cotaParteParceiros: 4000 })).toBeNull();
    expect(equivalenteEmValorCobrado(Number.POSITIVE_INFINITY, { valorCobrado: 20000, cotaParteParceiros: 4000 })).toBeNull();
    expect(equivalenteEmValorCobrado(12000)).toBeNull();
  });
  it("margem de segurança é a mesma nas duas réguas", () => {
    const nd = ndCom();
    const sc = [{ ...corteParceiro, calc: calcularServico(corteParceiro, nd) }];
    const dre = montarDRE(sc, nd);
    const ind = calcularIndicadoresGerenciais(sc, dre, nd, negocioExemplo());
    const peCobrado = equivalenteEmValorCobrado(ind.peContabilRS, dre);
    expect(peCobrado).toBeGreaterThan(ind.peContabilRS);
    expect(((dre.valorCobrado - peCobrado) / dre.valorCobrado) * 100).toBeCloseTo(ind.margemSeguranca, 8);
  });
  it("receita do salão no fechamento: faturamento − cota-parte; fechamento antigo fica igual", () => {
    expect(receitaDoSalao({ faturamentoBruto: 20000, cotaParteSnapshot: 4000 })).toBe(16000);
    expect(receitaDoSalao({ faturamentoBruto: 9000 })).toBe(9000);
    expect(receitaDoSalao(null)).toBe(0);
  });
  it("sem parceiros, o DRE não muda (valor cobrado = receita bruta)", () => {
    const nd = computeNegocioDerivado(negocioExemplo());
    const dre = montarDRE(comCalc(servicosExemplo(), nd), nd);
    expect(dre.cotaParteParceiros).toBe(0);
    expect(dre.valorCobrado).toBeCloseTo(dre.receitaBruta, 10);
  });
  it("fechamento antigo, sem cota-parte, continua igual", () => {
    const d = montarDREMensal({
      faturamentoBruto: 1000,
      impostoPagoReal: 60,
      custosVariaveisReaisInformados: 300,
      custosFixosSnapshot: 500,
    });
    expect(d.cotaParteParceiros).toBe(0);
    expect(d.receitaBruta).toBe(1000);
  });
  it("fechamento com cota-parte: receita do salão = faturamento − cota", () => {
    const d = montarDREMensal({
      faturamentoBruto: 1000,
      cotaParteSnapshot: 400,
      impostoPagoReal: 36,
      custosVariaveisReaisInformados: 50,
      custosFixosSnapshot: 300,
    });
    expect(d.receitaBruta).toBe(600);
    expect(d.resultadoOperacional).toBe(600 - 36 - 50 - 300);
  });
});

/* Bloco 15: casos-limite. Garantem que dado faltando ou zerado nunca vira    */
/* divisão por zero, número inventado ou tela quebrada, e cobrem os caminhos   */
/* que o exemplo não usa (insumo compartilhado, "já tenho preço", pacote).     */
describe("casos-limite (Bloco 15)", () => {
  const nd = computeNegocioDerivado(negocioExemplo());
  const [corte] = servicosExemplo();
  const jaTenho = { ...corte, modo: "ja-tenho", precoCobrado: 30, margemPct: 25 };

  it("valores inválidos viram zero", () => {
    expect(fmtPct(Number.NaN)).toBe("0,0%");
    expect(fmtPct(Number.POSITIVE_INFINITY, 2)).toBe("0,00%");
    expect(N(normalizarValorBR(null))).toBe(0);
    expect(N(normalizarValorBR(undefined))).toBe(0);
    expect(N(normalizarValorBR("abc"))).toBe(0);
  });

  it("Simples sem faturamento: primeira faixa, sem parcela a deduzir", () => {
    expect(aliquotaEfetiva(0, ANEXO_III)).toEqual({ faixaIdx: 0, aliqNominal: ANEXO_III[0].aliq, pd: 0, aliqEfetiva: ANEXO_III[0].aliq });
  });

  it("profissional sem tipo conta como comissionado", () => {
    expect(vinculoDe(undefined)).toBe("comissao");
    expect(vinculoDe({})).toBe("comissao");
  });

  it("comissão média só existe com 2 pessoas ativas e ao menos um comissionado", () => {
    expect(calcularComissaoEquipe(null)).toBeNull();
    expect(
      calcularComissaoEquipe([
        { nome: "", comissaoPct: 30 },
        { nome: "Ana", comissaoPct: 30 },
      ]),
    ).toBeNull();
    expect(
      calcularComissaoEquipe([
        { nome: "A", vinculo: "dono" },
        { nome: "B", vinculo: "dono" },
      ]),
    ).toBeNull();
    // Inativo fica de fora; sem atendimentos, média simples: (30 + 20) ÷ 2 = 25
    const r = calcularComissaoEquipe([
      { nome: "A", comissaoPct: 40, ativo: false },
      { nome: "B", comissaoPct: 30 },
      { nome: "C", comissaoPct: 20 },
    ]);
    expect(r.pct).toBe(25);
    expect(r.ponderada).toBe(false);
  });

  it("duração em semanas e meses vira dias", () => {
    expect(converterParaDias(2, "semanas")).toBe(14);
    expect(converterParaDias(1, "meses")).toBe(30);
    expect(converterParaDias(5, "dias")).toBe(5);
    expect(converterParaDias("", "dias")).toBe(0);
    expect(precoUnitarioItem({ valorCompra: 40, quantidadeComprada: 0 })).toBe(0);
  });

  it("insumo compartilhado por unidade: R$ 40 ÷ 100 × 2 por atendimento = R$ 0,80", () => {
    const insumos = [{ id: "t", modo: "unidade", valorCompra: 40, quantidadeComprada: 100 }];
    const item = { modo: "compartilhado", insumoId: "t", usoPorAtendimento: 2 };
    expect(calcularValorItemVariavel(item, { atendimentosMes: 40, diasMesNegocio: 26, insumosCompartilhados: insumos })).toBeCloseTo(
      0.8,
      10,
    );
  });

  it("insumo compartilhado por duração: R$ 80 em 45 dias, 26 dias/mês, 50% para 40 atendimentos", () => {
    const insumo = { id: "g", modo: "duracao", valorCompra: 80, duracaoValor: 45, duracaoUnidade: "dias" };
    // 80 × 26 ÷ 45 = 46,22 por mês; metade = 23,11; ÷ 40 atendimentos = 0,5778
    expect(custoMensalInsumoCompartilhado(insumo, 26)).toBeCloseTo(46.2222, 4);
    const item = { modo: "compartilhado", insumoId: "g", percentualAlocado: 50 };
    const ctx = { atendimentosMes: 40, diasMesNegocio: 26, insumosCompartilhados: [insumo] };
    expect(calcularValorItemVariavel(item, ctx)).toBeCloseTo(0.5778, 4);
    expect(calcularValorItemVariavel(item, { ...ctx, atendimentosMes: 0 })).toBe(0);
    expect(custoMensalInsumoCompartilhado(insumo, 0)).toBe(0);
    expect(calcularValorItemVariavel({ ...item, insumoId: "nao-existe" }, ctx)).toBe(0);
  });

  it("custo por duração sem atendimentos não divide por zero; custo direto é o valor digitado", () => {
    const ctx = { atendimentosMes: 0, diasMesNegocio: 26, insumosCompartilhados: [] };
    expect(calcularValorItemVariavel({ modo: "duracao", valorCompra: 80, duracaoValor: 45, duracaoUnidade: "dias" }, ctx)).toBe(0);
    expect(calcularValorItemVariavel({ modo: "direto", valor: "3" }, ctx)).toBe(3);
  });

  it("os motores dizem o que falta em vez de inventar um preço", () => {
    expect(calcularServico(corte, null).status).toBe("sem-negocio");
    expect(calcularServico({ ...corte, atendimentosMes: 0 }, nd).status).toBe("sem-volume");
    expect(calcularServico({ ...corte, custosVariaveis: [], horasPorAtendimento: 0 }, nd).status).toBe("sem-custo");
    expect(calcularReverso({ ...corte, precoCobrado: 30 }, null).status).toBe("sem-negocio");
    expect(calcularReverso({ ...corte, precoCobrado: 0, margemMetaPct: 25 }, nd).status).toBe("sem-preco");
    expect(calcularReverso({ ...corte, horasPorAtendimento: 0, precoCobrado: 30, margemMetaPct: 25 }, nd).lucroPorHora).toBeNull();
  });

  it("diagnóstico do preço cobrado: saudável, apertado ou prejuízo", () => {
    const precoA = calcularServico(corte, nd).preco; // margem de 25%
    expect(calcularReverso({ ...corte, precoCobrado: precoA, margemMetaPct: 20 }, nd).diagnostico).toBe("saudavel");
    expect(calcularReverso({ ...corte, precoCobrado: precoA, margemMetaPct: 40 }, nd).diagnostico).toBe("apertado");
    expect(calcularReverso({ ...corte, precoCobrado: 5, margemMetaPct: 25 }, nd).diagnostico).toBe("prejuizo");
    // Percentuais somando 100% ou mais: não existe preço mínimo nem ideal.
    const r = calcularReverso({ ...corte, comissaoPct: 99, precoCobrado: 30, margemMetaPct: 25 }, nd);
    expect(r.precoMinimo).toBeNull();
    expect(r.precoIdeal).toBeNull();
  });

  it("serviço com preço já definido usa o Modo B em todas as telas", () => {
    const r = calcularReverso({ ...jaTenho, margemMetaPct: 25 }, nd);
    expect(calcularParaExibicao(jaTenho, nd)).toEqual(r);
    expect(calcularUnificado(jaTenho, nd)).toEqual({
      status: "ok",
      preco: 30,
      margemPct: r.margemLiquidaPct,
      diagnostico: r.diagnostico,
      lucroUnitario: r.lucroLiquido,
    });
    expect(calcularUnificado({ ...jaTenho, precoCobrado: 0 }, nd)).toEqual({ status: "sem-preco" });
    expect(calcularUnificado({ ...corte, atendimentosMes: 0 }, nd)).toEqual({ status: "sem-volume" });
    const a = calcularUnificado(corte, nd);
    expect(a.margemPct).toBe(25);
    expect(a.diagnostico).toBe("saudavel");
    expect(pisoDoServico(jaTenho, nd)).toBe(calcularReverso({ ...jaTenho, margemMetaPct: 0 }, nd).precoMinimo);
    expect(pisoDoServico({ ...jaTenho, precoCobrado: 0 }, nd)).toBeNull();
    expect(pisoDoServico({ ...corte, atendimentosMes: 0 }, nd)).toBeNull();
  });

  it("negócio sem movimento: indicadores sem divisão por zero", () => {
    const dre = montarDRE([], nd);
    const ind = calcularIndicadoresGerenciais([], dre, nd, negocioExemplo());
    expect(ind.pontoEquilibrioMix).toBe(Number.POSITIVE_INFINITY);
    expect(ind.peContabilRS).toBe(Number.POSITIVE_INFINITY);
    expect(ind.peFinanceiroRS).toBe(Number.POSITIVE_INFINITY);
    expect(ind.peEconomicoRS).toBe(Number.POSITIVE_INFINITY);
    expect(ind.margemSeguranca).toBeNull();
    expect(ind.gao).toBeNull();
  });

  it("pacote: sem dados, percentuais demais e serviço com preço já definido", () => {
    const itemCorte = { ...corte, calc: calcularServico(corte, nd) };
    expect(calcularPrecoMinimoPacote([], nd).status).toBe("sem-dado");
    expect(calcularPrecoMinimoPacote([itemCorte], null).status).toBe("sem-dado");
    expect(calcularPrecoMinimoPacote([{ ...itemCorte, calc: { ...itemCorte.calc, preco: 0 } }], nd).status).toBe("sem-dado");
    expect(calcularPrecoMinimoPacote([{ ...itemCorte, margemPct: 95 }], nd).status).toBe("trava-percentual");
    const itemJaTenho = { ...jaTenho, calc: calcularReverso({ ...jaTenho, margemMetaPct: 25 }, nd) };
    const r = calcularPrecoMinimoPacote([itemCorte, itemJaTenho], nd);
    expect(r.status).toBe("ok");
    expect(r.margemUsadaPct).toBeCloseTo(Math.min(25, itemJaTenho.calc.margemLiquidaPct), 10);
  });

  it("posição na concorrência: todos os casos", () => {
    expect(posicaoNaConcorrencia(30, [25]).texto).toBe("acima do concorrente");
    expect(posicaoNaConcorrencia(20, [25]).texto).toBe("abaixo do concorrente");
    expect(posicaoNaConcorrencia(30, [20, 25]).texto).toBe("acima de todos");
    expect(posicaoNaConcorrencia(22, [20, 25, 30]).texto).toBe("abaixo da mediana");
    expect(posicaoNaConcorrencia(28, [20, 25, 30]).texto).toBe("acima da mediana");
    expect(posicaoNaConcorrencia(10, [0]).texto).toBe("na mediana");
  });

  it("preço mais recente ignora valor zerado e concorrente sem preço", () => {
    const lista = [
      {
        id: "a",
        precos: [
          { servicoId: "s", valor: 0, data: "2026-10-10" },
          { servicoId: "s", valor: 25, data: "2026-09-01" },
        ],
      },
      { id: "b" },
    ];
    const r = ultimoPrecoPorConcorrente(lista, "s");
    expect(r.map((o) => [o.concorrente.id, o.valor, o.data])).toEqual([["a", 25, "2026-09-01"]]);
  });

  it("planilha do Observatório com dados faltando", () => {
    const vazia = linhasPlanilhaObservatorio(null, null, null, null);
    expect([vazia.concorrentes.length, vazia.precos.length, vazia.comparacao.length]).toEqual([1, 1, 1]);
    const c = {
      cidade: "Irará",
      nome: "X",
      tipo: "Salão",
      precos: [{ servicoNome: "Corte", valor: 20, data: "2026-10-01", fonte: "??", servicoId: null }],
    };
    const r = linhasPlanilhaObservatorio([c], null, [corte], null, new Date("2026-10-16T12:00:00"));
    expect(r.concorrentes[1]).toEqual(["Irará", "X", "Salão", "", null, 1, null, null]);
    expect(r.precos[1]).toEqual(["Irará", "X", "Corte", "Não", 20, "01/10/2026", "Outro", 15]);
    expect(r.comparacao.length).toBe(1); // sem negócio configurado, não há comparação
  });
});

/* Bloco 19: cada fórmula conferida pela própria definição. Estes testes fecham  */
/* os buracos que o teste de mutação (Stryker) achou: trocar um "+" por "−", um   */
/* ">" por ">=" ou apagar uma condição nas contas agora derruba algum teste.      */
describe("fórmulas conferidas uma a uma (Bloco 19)", () => {
  const nd = computeNegocioDerivado(negocioExemplo());
  const [corte, escova] = servicosExemplo();

  it("Simples: limites das faixas e do regime (LC 123/2006)", () => {
    // R$ 180.000 ainda é a 1ª faixa; logo acima, a 2ª faixa dá praticamente os mesmos 6%.
    expect(aliquotaEfetiva(180000, ANEXO_III).faixaIdx).toBe(0);
    expect(aliquotaEfetiva(180000.01, ANEXO_III).faixaIdx).toBe(1);
    expect(aliquotaEfetiva(180000.01, ANEXO_III).aliqEfetiva).toBeCloseTo(0.06, 6);
    // R$ 4,8 milhões ainda é Simples: (4.800.000 × 33% − 648.000) ÷ 4.800.000 = 19,5%
    expect(aliquotaEfetiva(4800000, ANEXO_III).aliqEfetiva).toBeCloseTo(0.195, 10);
    expect(aliquotaEfetiva(4800000.01, ANEXO_III)).toBeNull();
  });

  it("Fator R de exatamente 28% já vai para o Anexo III", () => {
    const base = { ...negocioExemplo(), atividadeSempreAnexoIII: false, rbt12: "100000" };
    expect(computeNegocioDerivado({ ...base, folha12: "28000" }).anexoUsado).toBe("III");
    expect(computeNegocioDerivado({ ...base, folha12: "27999" }).anexoUsado).toBe("V");
  });

  it("MEI: o DAS entra no custo fixo, não há imposto sobre o preço e não há salão-parceiro", () => {
    const n = computeNegocioDerivado({ ...negocioExemplo(), regime: "mei", meiDas: "75.90" });
    expect(n.meiDas).toBeCloseTo(75.9, 10);
    expect(n.custoFixoTotal).toBeCloseTo(n.custosFixosSoma + 2200 + 75.9, 10);
    expect(n.impostoPct).toBe(0);
    expect(n.parceriaPermitida).toBe(false);
    // No Simples, o DAS-MEI digitado é ignorado.
    expect(computeNegocioDerivado({ ...negocioExemplo(), meiDas: "75.90" }).meiDas).toBe(0);
  });

  it("depreciação: entra no custo fixo e é o que separa o ponto de equilíbrio financeiro do contábil", () => {
    const comDepreciacao = negocioExemplo();
    comDepreciacao.custosFixos = comDepreciacao.custosFixos.map((c) => (c.id === "d" ? { ...c, valor: "150" } : c));
    const n = computeNegocioDerivado(comDepreciacao);
    expect(n.custoFixoNaoCaixa).toBe(150);
    expect(n.custoFixoTotal).toBe(900 + 280 + 180 + 150 + 2200);
    const sc = comCalc(servicosExemplo(), n);
    const dre = montarDRE(sc, n);
    const ind = calcularIndicadoresGerenciais(
      sc.filter((x) => x.calc.status === "ok"),
      dre,
      n,
      negocioExemplo(),
    );
    expect(ind.peContabilRS).toBeCloseTo(dre.custosFixosLiquidos / dre.rcm, 8);
    expect(ind.peFinanceiroRS).toBeCloseTo((dre.custosFixosLiquidos - 150) / dre.rcm, 8);
    expect(ind.peContabilRS - ind.peFinanceiroRS).toBeCloseTo(150 / dre.rcm, 8);
  });

  it("aluguel de cadeira: só de quem está ativo e aluga, e abate o custo fixo a cobrir", () => {
    const n = computeNegocioDerivado({
      ...negocioExemplo(),
      profissionais: [
        { id: "a", nome: "A", vinculo: "aluguel", aluguelMes: "600" },
        { id: "b", nome: "B", vinculo: "aluguel", aluguelMes: "500", ativo: false },
        { id: "c", nome: "C", vinculo: "comissao", comissaoPct: "30", aluguelMes: "999" },
      ],
    });
    expect(n.receitaAluguelCadeiras).toBe(600);
    expect(n.custoFixoLiquido).toBe(n.custoFixoTotal - 600);
    expect(n.custoFixoPorHora).toBeCloseTo(n.custoFixoLiquido / n.horasTotais, 10);
    const dre = montarDRE(comCalc(servicosExemplo(), n), n);
    expect(dre.custosFixosLiquidos).toBe(n.custoFixoTotal - 600);
  });

  it("capacidade: sem número de profissionais conta 1; sem custo fixo ou sem horas, o negócio não está configurado", () => {
    expect(computeNegocioDerivado({ ...negocioExemplo(), numeroProfissionais: "0" }).numeroProfissionais).toBe(1);
    expect(computeNegocioDerivado({ ...negocioExemplo(), numeroProfissionais: "" }).horasTotais).toBe(26 * 8);
    expect(computeNegocioDerivado({ ...negocioExemplo(), diasMes: "0" }).configurado).toBe(false);
    expect(computeNegocioDerivado({ ...negocioExemplo(), custosFixos: [], proLabore: "0" }).configurado).toBe(false);
    expect(computeNegocioDerivado({ ...negocioExemplo(), custosFixos: [] }).configurado).toBe(false);
    expect(computeNegocioDerivado({ ...negocioExemplo(), horasDia: "0" }).custoFixoPorHora).toBe(0);
    const semNada = computeNegocioDerivado({ ...negocioExemplo(), perfil: undefined, insumosCompartilhados: undefined });
    expect(semNada.perfil).toBeNull();
    expect(semNada.insumosCompartilhados).toEqual([]);
  });

  it("ponto de equilíbrio semanal: mensal ÷ (365,25 ÷ 12 ÷ 7) semanas", () => {
    expect(pontoEquilibrioSemanal(100)).toBeCloseTo(100 / (365.25 / 12 / 7), 10);
    expect(pontoEquilibrioSemanal(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
  });

  it("Modo A: margem em R$, lucro do mês e ponto de equilíbrio do serviço", () => {
    const r = calcularServico(corte, nd);
    expect(r.valorMargem).toBeCloseTo(r.preco * 0.25, 10);
    expect(r.lucroProjetadoMes).toBeCloseTo(r.valorMargem * 120, 8);
    expect(r.pontoEquilibrioServico).toBeCloseTo(nd.custoFixoLiquido / r.margemContribuicaoUnitaria, 8);
    // Só custo fixo (sem material) ainda gera preço; só sem material E sem tempo é "sem-custo".
    expect(calcularServico({ ...corte, custosVariaveis: [] }, nd).status).toBe("ok");
    expect(calcularServico({ ...corte, horasPorAtendimento: 0 }, nd).status).toBe("ok");
  });

  it("Modo B: cada número do preço já cobrado, pela definição", () => {
    const preco = 30;
    const r = calcularReverso({ ...corte, precoCobrado: preco, margemMetaPct: 25 }, nd);
    const horas = 0.5;
    const custoFixo = nd.custoFixoPorHora * horas;
    const comissao = preco * 0.3;
    const taxa = preco * 0.03;
    const imposto = preco * (nd.impostoPct / 100);
    const custoTotal = custoFixo + 3 + comissao + taxa + imposto;
    const lucro = preco - custoTotal;
    expect(r.lucroLiquido).toBeCloseTo(lucro, 10);
    expect(r.lucroBruto).toBeCloseTo(preco - 3, 10);
    expect(r.markup).toBeCloseTo(preco / custoTotal, 10);
    expect(r.lucroPorHora).toBeCloseTo(lucro / horas, 10);
    const mcu = preco - 3 - comissao - taxa - imposto;
    expect(r.margemContribuicaoUnitaria).toBeCloseTo(mcu, 10);
    expect(r.pontoEquilibrioServico).toBeCloseTo(nd.custoFixoLiquido / mcu, 8);
    const somaSemMargem = 30 + 3 + nd.impostoPct;
    expect(r.precoMinimo).toBeCloseTo((custoFixo + 3) / (1 - somaSemMargem / 100), 10);
    expect(r.precoIdeal).toBeCloseTo((custoFixo + 3) / (1 - (somaSemMargem + 25) / 100), 10);
    expect(r.lucroProjetadoMes).toBeCloseTo(lucro * 120, 8);
    // Margem de contribuição negativa: ponto de equilíbrio impossível.
    expect(calcularReverso({ ...corte, precoCobrado: 2, margemMetaPct: 25 }, nd).pontoEquilibrioServico).toBe(Number.POSITIVE_INFINITY);
  });

  it("Modo B com parceira: a cota-parte é parte do preço", () => {
    const n = computeNegocioDerivado({
      ...negocioExemplo(),
      profissionais: [
        {
          id: "ana",
          nome: "Ana",
          vinculo: "parceiro",
          comissaoPct: "40",
          atendimentosMes: "80",
          temCnpj: true,
          contratoHomologado: true,
        },
        { id: "bia", nome: "Bia", vinculo: "comissao", comissaoPct: "30", atendimentosMes: "60" },
      ],
    });
    const r = calcularReverso({ ...corte, comissaoPct: 40, comissaoEhCotaParte: true, precoCobrado: 30, margemMetaPct: 25 }, n);
    expect(r.valorCotaParte).toBeCloseTo(30 * 0.4, 10);
  });

  it("DRE: serviço inválido fica de fora e é contado", () => {
    const sc = comCalc([...servicosExemplo(), { ...corte, id: "x", atendimentosMes: 0 }], nd);
    const dre = montarDRE(sc, nd);
    const soValidos = montarDRE(comCalc(servicosExemplo(), nd), nd);
    expect(dre.qtdInvalidos).toBe(1);
    expect(dre.receitaBruta).toBeCloseTo(soValidos.receitaBruta, 8);
  });

  it("indicadores: margem ponderada pelo mix e ponto de equilíbrio em atendimentos", () => {
    const sc = comCalc(servicosExemplo(), nd).filter((x) => x.calc.status === "ok");
    const dre = montarDRE(sc, nd);
    const ind = calcularIndicadoresGerenciais(sc, dre, nd, negocioExemplo());
    const total = 120 + 55 + 28;
    const mcp = sc.reduce((s, x) => s + (N(x.atendimentosMes) / total) * x.calc.margemContribuicaoUnitaria, 0);
    expect(ind.somaAtendimentosMix).toBe(total);
    expect(ind.margemContribuicaoPonderada).toBeCloseTo(mcp, 10);
    expect(ind.pontoEquilibrioMix).toBeCloseTo(nd.custoFixoLiquido / mcp, 8);
    expect(ind.peEconomicoRS).toBeCloseTo((dre.custosFixosLiquidos + 8000 * 0.008) / dre.rcm, 8);
    expect(ind.gao).toBeCloseTo(dre.margemContribuicaoTotal / dre.resultadoOperacional, 10);
    // Resultado exatamente zero: alavancagem indefinida.
    expect(calcularIndicadoresGerenciais(sc, { ...dre, resultadoOperacional: 0 }, nd, negocioExemplo()).gao).toBeNull();
  });

  it("pacote: preço mínimo = custos somados ÷ (1 − comissão − taxa − imposto − menor margem)", () => {
    const itens = [
      { ...corte, calc: calcularServico(corte, nd) },
      { ...escova, calc: calcularServico(escova, nd) },
    ];
    const r = calcularPrecoMinimoPacote(itens, nd);
    const custoBase = itens.reduce((s, it) => s + it.calc.totalVariaveis + it.calc.custoFixoRateado, 0);
    const soma = 30 + 3 + nd.impostoPct + 25; // mesmas comissão e taxa; menor margem 25%
    expect(r.precoMinimoRecomendado).toBeCloseTo(custoBase / (1 - soma / 100), 10);
    expect(r.margemUsadaPct).toBe(25);
    // Com margens diferentes, vale a menor, de quem a tem.
    const r2 = calcularPrecoMinimoPacote([itens[0], { ...itens[1], margemPct: 10 }], nd);
    expect(r2.margemUsadaPct).toBe(10);
    expect(r2.servicoMargemMenor).toBe("Escova");
    // Comissões diferentes: média ponderada pelo preço de cada serviço.
    const r3 = calcularPrecoMinimoPacote([itens[0], { ...itens[1], comissaoPct: 50 }], nd);
    const pesoA = itens[0].calc.preco;
    const pesoB = itens[1].calc.preco;
    const comissaoMedia = (30 * pesoA + 50 * pesoB) / (pesoA + pesoB);
    expect(r3.precoMinimoRecomendado).toBeCloseTo(custoBase / (1 - (comissaoMedia + 3 + nd.impostoPct + 25) / 100), 10);
    // Soma de exatamente 100% já trava.
    expect(calcularPrecoMinimoPacote([{ ...itens[0], margemPct: 100 - 30 - 3 - nd.impostoPct }], nd).status).toBe("trava-percentual");
  });

  it("pacote com parceira: taxa e imposto só sobre a parte do salão", () => {
    const n = computeNegocioDerivado({
      ...negocioExemplo(),
      profissionais: [
        { id: "ana", nome: "Ana", vinculo: "parceiro", comissaoPct: "40", temCnpj: true, contratoHomologado: true },
        { id: "bia", nome: "Bia", vinculo: "comissao", comissaoPct: "30" },
      ],
    });
    const s = { ...corte, comissaoPct: 40, comissaoEhCotaParte: true };
    const it = { ...s, calc: calcularServico(s, n) };
    const r = calcularPrecoMinimoPacote([it], n);
    const custoBase = it.calc.totalVariaveis + it.calc.custoFixoRateado;
    const soma = 40 + 3 * 0.6 + n.impostoPct * 0.6 + 25;
    expect(r.precoMinimoRecomendado).toBeCloseTo(custoBase / (1 - soma / 100), 10);
  });

  it("comissão média: nome com espaços conta, comissão vazia não, dono entra com 0%", () => {
    const r = calcularComissaoEquipe([
      { nome: " Ana ", comissaoPct: "40", atendimentosMes: "10" },
      { nome: "Bia", comissaoPct: "  ", atendimentosMes: "10" },
      { nome: "Cris", vinculo: "dono", atendimentosMes: "10" },
    ]);
    expect(r.participantes.map((p) => p.nome)).toEqual(["Ana", "Cris"]);
    expect(r.pct).toBe(20); // (40 × 10 + 0 × 10) ÷ 20
    // Parceiro conta como comissionado na média.
    const p = calcularComissaoEquipe([
      { nome: "Ana", vinculo: "parceiro", comissaoPct: "40", temCnpj: true, contratoHomologado: true },
      { nome: "Cris", vinculo: "dono" },
    ]);
    expect(p.pct).toBe(20);
    expect(p.parcelaParceiroPct).toBe(20);
  });

  it("taxa média: forma com 0% de participação fica de fora; 99,5% já conta como completo", () => {
    const r = calcularTaxaRecebimento({
      pix: { participacaoPct: "60", taxaPct: "1" },
      credito: { participacaoPct: "39.5", taxaPct: "3" },
      debito: { participacaoPct: "0", taxaPct: "2" },
    });
    expect(r.itens.map((i) => i.id)).toEqual(["pix", "credito"]);
    expect(r.completo).toBe(true);
    expect(r.pct).toBeCloseTo((60 * 1 + 39.5 * 3) / 99.5, 10);
    expect(calcularTaxaRecebimento({ pix: { participacaoPct: "99.4", taxaPct: "1" } }).completo).toBe(false);
    expect(calcularTaxaRecebimento({})).toBeNull();
  });

  it("leitura de valores: só 3 dígitos depois do ponto é milhar", () => {
    expect(N(normalizarValorBR("2.5000"))).toBe(2.5);
    expect(N(normalizarValorBR("12.345"))).toBe(12345);
    expect(normalizarValorBR("2500,")).toBe("2500.");
    expect(normalizarValorBR(" 7 ")).toBe("7");
  });

  it("posição na concorrência: chaves e limites de cada faixa", () => {
    const chave = (seu, valores) => posicaoNaConcorrencia(seu, valores).chave;
    expect(chave(25.5, [20, 25, 30])).toBe("mediana"); // 2% acima: ainda conta como na mediana
    expect(chave(25.625, [20, 25, 30])).toBe("acima"); // exatamente 2,5% acima já não conta
    expect(chave(24.375, [20, 25, 30])).toBe("abaixo"); // exatamente 2,5% abaixo
    expect(chave(20, [20, 25, 30])).toBe("abaixo"); // igual ao menor não é "abaixo de todos"
    expect(chave(30, [20, 25, 30])).toBe("acima"); // igual ao maior não é "acima de todos"
    expect(chave(19, [20, 25, 30])).toBe("abaixo-todos");
    expect(chave(31, [20, 25, 30])).toBe("acima-todos");
    const p = posicaoNaConcorrencia(22, [20, 25, 30]);
    expect([p.min, p.med, p.max]).toEqual([20, 25, 30]);
    expect(p.difPct).toBeCloseTo(-12, 10);
  });

  it("planilha do Observatório: cabeçalhos, ordem e preços fora da comparação", () => {
    const hoje = new Date("2026-10-16T12:00:00");
    const concorrentes = [
      {
        id: "z",
        cidade: "Irará",
        nome: "Z",
        tipo: "Salão",
        lat: -12.05,
        lng: -38.77,
        precos: [{ servicoId: "corte", servicoNome: "Corte", valor: 25.555, data: "2026-04-01", fonte: "internet" }],
      },
      {
        id: "a",
        cidade: "Feira de Santana",
        nome: "A",
        tipo: "Barbearia",
        lat: null,
        lng: null,
        precos: [{ servicoId: "corte", servicoNome: "Corte", valor: 30, data: "2026-10-01", fonte: "contato" }],
      },
    ];
    const meus = { "Feira de Santana": { lat: -12.26, lng: -38.96 } };
    const r = linhasPlanilhaObservatorio(concorrentes, meus, [escova, corte], nd, hoje);
    expect(r.concorrentes[0]).toEqual([
      "Cidade",
      "Concorrente",
      "Tipo",
      "Bairro",
      "Distância do meu negócio (km)",
      "Preços anotados",
      "Latitude",
      "Longitude",
    ]);
    expect(r.precos[0]).toEqual([
      "Cidade",
      "Concorrente",
      "Serviço",
      "Entra na comparação",
      "Preço (R$)",
      "Data",
      "Onde viu",
      "Dias desde a anotação",
    ]);
    expect(r.comparacao[0]).toEqual([
      "Cidade",
      "Serviço",
      "Meu preço (R$)",
      "Meu piso, sem lucro (R$)",
      "Concorrentes",
      "Menor (R$)",
      "Mediana (R$)",
      "Maior (R$)",
      "Diferença para a mediana (%)",
      "Situação",
      "Preços com mais de 6 meses",
    ]);
    // Sem posição no mapa, não há distância, mesmo com o negócio marcado na cidade.
    expect(r.concorrentes[2][4]).toBeNull();
    // Irará não tem o negócio marcado: sem distância.
    expect(r.concorrentes[1][4]).toBeNull();
    expect(r.precos[1]).toEqual(["Irará", "Z", "Corte", "Sim", 25.56, "01/04/2026", "Instagram ou site", 198]);
    expect(r.precos[2][6]).toBe("WhatsApp ou ligação");
    // Cidades em ordem alfabética; dentro da cidade, serviços em ordem alfabética.
    expect(r.comparacao.slice(1).map((l) => l[0])).toEqual(["Feira de Santana", "Irará"]);
    const irara = r.comparacao.find((l) => l[0] === "Irará");
    expect(irara[1]).toBe("Corte Masculino");
    expect(irara[10]).toBe(1); // anotado há 198 dias: mais de 6 meses
    const feira = r.comparacao.find((l) => l[0] === "Feira de Santana");
    expect(feira[10]).toBe(0);
    // Exatamente 180 dias ainda não conta como antigo.
    const r180 = linhasPlanilhaObservatorio(
      [{ ...concorrentes[1], precos: [{ ...concorrentes[1].precos[0], data: "2026-04-19" }] }],
      meus,
      [corte],
      nd,
      hoje,
    );
    expect(r180.precos[1][7]).toBe(180);
    expect(r180.comparacao[1][10]).toBe(0);
  });

  it("custo por duração e por unidade: as divisões e os limites", () => {
    const ctx = { atendimentosMes: 40, diasMesNegocio: 26, insumosCompartilhados: [] };
    // R$ 80 que duram 45 dias, 40 atendimentos em 26 dias: 80 ÷ (45 ÷ 26 × 40)
    expect(calcularValorItemVariavel({ modo: "duracao", valorCompra: 80, duracaoValor: 45, duracaoUnidade: "dias" }, ctx)).toBeCloseTo(
      80 / ((45 / 26) * 40),
      10,
    );
    expect(calcularValorItemVariavel({ modo: "duracao", valorCompra: 80, duracaoValor: 45 }, { ...ctx, diasMesNegocio: 0 })).toBe(0);
    expect(calcularValorItemVariavel({ modo: "duracao", valorCompra: 80, duracaoValor: 0 }, ctx)).toBe(0);
    // R$ 40 por 100 unidades, 2 por atendimento: 0,40 × 2
    expect(calcularValorItemVariavel({ modo: "unidade", valorCompra: 40, quantidadeComprada: 100, usoPorAtendimento: 2 }, ctx)).toBeCloseTo(
      0.8,
      10,
    );
    const insumo = { id: "g", valorCompra: 80, duracaoValor: 0, duracaoUnidade: "dias" };
    expect(custoMensalInsumoCompartilhado(insumo, 26)).toBe(0);
  });
});
