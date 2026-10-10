/* ======================================================================= */
/* Testes das contas do Preço Justo (Vitest). Os valores esperados foram   */
/* conferidos à mão e batem com o que o app mostra com "Carregar exemplo". */
/* Se uma mudança alterar um destes números, o teste falha e o merge fica  */
/* bloqueado até alguém confirmar que a conta nova está certa.             */
/* ======================================================================= */
import { describe, it, expect } from "vitest";
import {
  N, fmtPct, normalizarValorBR, ANEXO_III, ANEXO_V, aliquotaEfetiva,
  calcularComissaoEquipe, comissaoEfetiva, calcularTaxaRecebimento, taxaEfetiva,
  computeNegocioDerivado, calcularValorItemVariavel, calcularServico, calcularReverso,
  calcularParaExibicao, montarDRE, montarDREMensal, calcularIndicadoresGerenciais,
  calcularPrecoMinimoPacote, distanciaKm, mediana, ultimoPrecoPorConcorrente, pisoDoServico,
} from "./calculos.js";

/* Mesmo cenário do "Carregar exemplo": salão de 2 profissionais no Simples. */
const negocioExemplo = () => ({
  custosFixos: [
    { id: "a", nome: "Aluguel do espaço", valor: "900", semCaixa: false },
    { id: "b", nome: "Água, luz e internet", valor: "280", semCaixa: false },
    { id: "c", nome: "Contador", valor: "180", semCaixa: false },
    { id: "d", nome: "Depreciação", valor: "", semCaixa: true },
  ],
  insumosCompartilhados: [], profissionais: [], recebimento: {},
  perfil: { segmento: "salao", modeloOperacao: "autonomo", cidade: "Feira de Santana" },
  diasMes: "26", horasDia: "8", numeroProfissionais: "2", proLabore: "2200",
  regime: "simples", meiDas: "", rbt12: "90000", folha12: "22000", atividadeSempreAnexoIII: true,
  capitalInvestido: "8000", taxaRetorno: "0.8",
});
const servicosExemplo = () => [
  { id: "corte", nome: "Corte Masculino", modo: "descobrir", custosVariaveis: [{ id: "1", modo: "direto", valor: "3" }],
    comissaoPct: 30, taxaCartaoPct: 3, margemPct: 25, horasPorAtendimento: 0.5, atendimentosMes: 120 },
  { id: "escova", nome: "Escova", modo: "descobrir", custosVariaveis: [{ id: "2", modo: "direto", valor: "5" }],
    comissaoPct: 30, taxaCartaoPct: 3, margemPct: 25, horasPorAtendimento: 1, atendimentosMes: 55 },
  { id: "coloracao", nome: "Coloração", modo: "descobrir",
    custosVariaveis: [{ id: "3", modo: "direto", valor: "35" }, { id: "4", modo: "direto", valor: "2" }],
    comissaoPct: 30, taxaCartaoPct: 3, margemPct: 30, horasPorAtendimento: 1.5, atendimentosMes: 28 },
];
const comCalc = (servicos, nd) => servicos.map((s) => ({ ...s, calc: calcularParaExibicao(s, nd) }));

describe("leitura de valores no padrão brasileiro", () => {
  it.each([
    ["2.500", 2500], ["2.500,00", 2500], ["22.000", 22000], ["1.234.567", 1234567],
    ["2500,50", 2500.5], ["4.800.000,00", 4800000], ["2.5", 2.5], ["2.50", 2.5], ["R$ 1.234,56", 1234.56],
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
    const ind = calcularIndicadoresGerenciais(sc.filter((s) => s.calc.status === "ok"), dre, nd, negocioExemplo());
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
    const d = montarDREMensal({ faturamentoBruto: 1000, impostoPagoReal: 60, custosVariaveisReaisInformados: 300, custosFixosSnapshot: 500 });
    expect(d.resultadoOperacional).toBe(140);
  });
});

describe("custos variáveis", () => {
  const ctx = { atendimentosMes: 120, diasMesNegocio: 26, insumosCompartilhados: [] };
  it("por duração: R$ 80 que duram 45 dias", () => {
    expect(calcularValorItemVariavel({ modo: "duracao", valorCompra: "80", duracaoValor: "45", duracaoUnidade: "dias" }, ctx))
      .toBeCloseTo(80 / ((45 / 26) * 120), 10);
  });
  it("por unidade: caixa de 100 toucas a R$ 40, 1 por atendimento", () => {
    expect(calcularValorItemVariavel({ modo: "unidade", valorCompra: "40", quantidadeComprada: "100", usoPorAtendimento: "1" }, ctx))
      .toBeCloseTo(0.4, 10);
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
    dinheiro: { participacaoPct: "20" }, pix: { participacaoPct: "40", taxaPct: "0" },
    debito: { participacaoPct: "25", taxaPct: "1.6" }, credito: { participacaoPct: "15", taxaPct: "3" },
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
    const c = [{ id: "x", precos: [
      { servicoId: "corte", valor: 20, data: "2026-01-10" },
      { servicoId: "corte", valor: 28, data: "2026-09-01" },
      { servicoId: "escova", valor: 40, data: "2026-09-02" },
    ] }];
    const r = ultimoPrecoPorConcorrente(c, "corte");
    expect(r).toHaveLength(1);
    expect(r[0].valor).toBe(28);
  });
  it("distância: 1 grau de latitude ≈ 111,2 km", () => {
    expect(distanciaKm({ lat: -12, lng: -38.9 }, { lat: -13, lng: -38.9 })).toBeCloseTo(111.19, 1);
    expect(distanciaKm({ lat: -12.27, lng: -38.97 }, { lat: -12.27, lng: -38.97 })).toBe(0);
  });
});
