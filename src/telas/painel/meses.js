/* Painel: contas com meses (chaves, nomes, janelas, sazonalidade) e o
   fechamento de exemplo. */
import { calcularParaExibicao, comissaoEfetiva, N, receitaDoSalao, taxaEfetiva } from "../../calculos.js";

export const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
/* ======================================================================= */
/* Fechamento Mensal — o registro do que REALMENTE aconteceu no mês.       */
/* Fase 1 do módulo de Evolução de Desempenho: sem isso, não existe        */
/* histórico real no app, só a configuração atual e a sazonalidade         */
/* projetada — nenhum gráfico de "evolução" teria dado de verdade pra      */
/* mostrar. Ver Especificacao_Analise_Avancada.md.                         */
/* ======================================================================= */
// Normaliza uma entrada de detalhe por serviço — aceita tanto o formato antigo
// (número puro = só quantidade) quanto o novo ({quantidade, valorReal}), pra não
// quebrar fechamentos que já tinham sido salvos antes desta mudança.
export function normalizarDetalheServico(raw) {
  if (raw == null) return { quantidade: 0, valorReal: null };
  if (typeof raw === "number" || typeof raw === "string") return { quantidade: N(raw), valorReal: null };
  return { quantidade: N(raw.quantidade), valorReal: raw.valorReal != null && raw.valorReal !== "" ? N(raw.valorReal) : null };
}

export function chaveMes(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
const NOMES_MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export function labelMes(chave) {
  const [y, m] = chave.split("-").map(Number);
  return `${NOMES_MES[m - 1]}/${String(y).slice(2)}`;
}

function mesAnterior(chave, quantos = 1) {
  const [y, m] = chave.split("-").map(Number);
  return chaveMes(new Date(y, m - 1 - quantos, 1));
}

function mesSeguinte(chave, quantos = 1) {
  const [y, m] = chave.split("-").map(Number);
  return chaveMes(new Date(y, m - 1 + quantos, 1));
}

// Janela rolante de N meses consecutivos a partir de uma chave "AAAA-MM" — usada pra fazer
// o Fluxo de Caixa Projetado começar no mês mais antigo com fechamento real (em vez de
// sempre Jan-Dez fixo), como pedido.
export function janelaDeMeses(chaveInicio, quantidade) {
  return Array.from({ length: quantidade }, (_, i) => mesSeguinte(chaveInicio, i));
}

// Sazonalidade calculada a partir do histórico REAL de fechamentos — agrupa por mês-
// calendário (Jan, Fev... independente do ano) e compara a média de cada mês com a média
// geral. Só preenche os meses-calendário que de fato têm pelo menos 1 fechamento real —
// meses sem nenhum dado voltam null, pra não inventar percentual pra mês nunca observado.
export function calcularSazonalidadeAutomatica(fechamentos) {
  if (!fechamentos || fechamentos.length === 0) return null;
  const porMesCalendario = Array.from({ length: 12 }, () => []);
  fechamentos.forEach((f) => {
    const mesIndex = Number(f.mes.split("-")[1]) - 1;
    porMesCalendario[mesIndex].push(receitaDoSalao(f));
  });
  const mediaGeral = fechamentos.reduce((s, f) => s + receitaDoSalao(f), 0) / fechamentos.length;
  if (mediaGeral <= 0) return null;
  return porMesCalendario.map((valores) => {
    if (valores.length === 0) return null;
    const media = valores.reduce((s, v) => s + v, 0) / valores.length;
    return Math.round((media / mediaGeral) * 100);
  });
}

// Acha os N meses mais recentes que AINDA NÃO têm fechamento salvo, andando pra trás a
// partir do mês passado — nunca sobrescreve um mês que já existe (real ou exemplo).
export function proximosMesesLivres(fechamentosExistentes, quantidade) {
  const ocupados = new Set((fechamentosExistentes || []).map((f) => f.mes));
  const livres = [];
  let cursor = 1;
  while (livres.length < quantidade && cursor <= 36) {
    const chave = mesAnterior(chaveMes(new Date()), cursor);
    if (!ocupados.has(chave)) livres.push(chave);
    cursor++;
  }
  return livres.reverse(); // do mais antigo pro mais recente, pra o gráfico mostrar uma tendência
}

// Gera um Fechamento Mensal ILUSTRATIVO — mesmo espírito de gerarDadosExemplo(), sempre marcado
// com exemplo:true e uma observação explícita, nunca escondido como se fosse dado real. Se já
// existem serviços salvos de verdade, usa os IDs deles (até 3, com uma divisão de atendimento
// plausível) pra também demonstrar o ranking por serviço e a ocupação x lucro.
export function gerarFechamentoExemplo(chave, nd, servicos, indice) {
  const servicosValidos = (servicos || []).filter((s) => calcularParaExibicao(s, nd).status === "ok");
  const faturamentoBruto = 6200 + indice * 1200;
  const atendimentosTotais = 160 + indice * 25;
  const proporcoes = [0.5, 0.3, 0.2];

  let atendimentosPorServico = null;
  let custosVariaveisReais = null;
  if (servicosValidos.length > 0) {
    atendimentosPorServico = {};
    let somaMateriais = 0;
    let somaComissaoTaxa = 0;
    servicosValidos.slice(0, 3).forEach((s, i) => {
      const qtd = Math.round(atendimentosTotais * (proporcoes[i] || 0));
      if (qtd <= 0) return;
      atendimentosPorServico[s.id] = { quantidade: qtd, valorReal: null };
      const calc = calcularParaExibicao(s, nd);
      somaMateriais += qtd * calc.totalVariaveis;
      const receitaEstimada = qtd * calc.preco;
      somaComissaoTaxa += receitaEstimada * ((comissaoEfetiva(s, nd) + taxaEfetiva(s, nd)) / 100);
    });
    custosVariaveisReais = somaMateriais + somaComissaoTaxa;
  }

  const custosFixosSnapshot = nd.custoFixoTotal;
  const aluguelRecebidoSnapshot = N(nd.receitaAluguelCadeiras);
  const impostoPagoReal = faturamentoBruto * (nd.impostoPct / 100);
  const custosVariaveisUsados = custosVariaveisReais ?? 0;
  const lucroLiquidoCalculado = faturamentoBruto - custosVariaveisUsados - custosFixosSnapshot + aluguelRecebidoSnapshot - impostoPagoReal;
  const margemLiquidaPctCalculada = faturamentoBruto > 0 ? (lucroLiquidoCalculado / faturamentoBruto) * 100 : 0;

  return {
    mes: chave,
    faturamentoBruto,
    atendimentosTotais,
    atendimentosPorServico,
    custosVariaveisReaisInformados: custosVariaveisReais,
    custosFixosSnapshot,
    aluguelRecebidoSnapshot,
    impostoPagoReal,
    proLaboreRealPago: nd.proLabore,
    observacoes: "Dado de exemplo — gerado só pra demonstrar o gráfico, não é real.",
    exemplo: true,
    lucroLiquidoCalculado,
    margemLiquidaPctCalculada,
    fechadoEm: Date.now(),
    editadoEm: Date.now(),
  };
}
