/* ======================================================================= */
/* Cálculos do Preço Justo — funções puras (sem React, sem tela).          */
/* Separadas do App.jsx no Bloco 8 para serem testadas automaticamente   */
/* (src/calculos.test.js). Qualquer conta nova entra aqui, com teste.      */
/* ======================================================================= */

export const fmtBRL = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number.isFinite(v) ? v : 0);

// Percentual no padrão brasileiro (vírgula decimal), igual ao fmtBRL — antes saía "6.00%"
// ao lado de "R$ 8.000,00" na mesma frase.
export const fmtPct = (v, casas = 1) =>
  `${(Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;

export const N = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// Lê um valor digitado no padrão brasileiro e devolve no formato que N() entende
// ("2500.5"). Antes, "2.500" virava R$ 2,50 e "2.500,00" virava R$ 0,00 sem aviso.
// Regras: com vírgula, ela é o decimal e os pontos são milhar ("2.500,50" → 2500.5);
// sem vírgula, vários pontos são milhar ("1.234.567"); um ponto só seguido de
// exatamente 3 dígitos também é milhar ("2.500" → 2500), porque centavos têm 2
// dígitos; nos demais casos o ponto é decimal ("2.5", "2.50"). Preserva valores
// parciais durante a digitação ("2500," → "2500.").
export function normalizarValorBR(texto) {
  const limpo = String(texto ?? "").replace(/[^\d.,]/g, "");
  if (limpo.includes(",")) {
    const [inteiro, ...resto] = limpo.split(",");
    return `${inteiro.replace(/\./g, "")}.${resto.join("")}`;
  }
  const pontos = (limpo.match(/\./g) || []).length;
  if (pontos > 1) return limpo.replace(/\./g, "");
  if (pontos === 1 && /^\d+\.\d{3}$/.test(limpo)) return limpo.replace(".", "");
  return limpo;
}

/* ======================================================================= */
/* Simples Nacional — tabelas reais, vigentes 2026 (LC 123/2006).          */
/* ======================================================================= */

export const ANEXO_III = [
  { limite: 180000, aliq: 0.06, pd: 0 },
  { limite: 360000, aliq: 0.112, pd: 9360 },
  { limite: 720000, aliq: 0.135, pd: 17640 },
  { limite: 1800000, aliq: 0.16, pd: 35640 },
  { limite: 3600000, aliq: 0.21, pd: 125640 },
  { limite: 4800000, aliq: 0.33, pd: 648000 },
];

export const ANEXO_V = [
  { limite: 180000, aliq: 0.155, pd: 0 },
  { limite: 360000, aliq: 0.18, pd: 4500 },
  { limite: 720000, aliq: 0.195, pd: 9900 },
  { limite: 1800000, aliq: 0.205, pd: 17100 },
  { limite: 3600000, aliq: 0.23, pd: 62100 },
  { limite: 4800000, aliq: 0.305, pd: 540000 },
];

export function aliquotaEfetiva(rbt12, tabela) {
  if (rbt12 <= 0) return { faixaIdx: 0, aliqNominal: tabela[0].aliq, pd: 0, aliqEfetiva: tabela[0].aliq };
  if (rbt12 > 4800000) return null;
  const idx = tabela.findIndex((f) => rbt12 <= f.limite);
  const faixa = tabela[idx];
  const efetiva = (rbt12 * faixa.aliq - faixa.pd) / rbt12;
  return { faixaIdx: idx, aliqNominal: faixa.aliq, pd: faixa.pd, aliqEfetiva: Math.max(0, efetiva) };
}

/* Vínculo de cada profissional cadastrado (Bloco 4). Cadastros antigos não  */
/* têm o campo: são tratados como comissionados, mas só entram na média de   */
/* comissão quando a comissão for informada.                                 */
export const VINCULOS_PROFISSIONAL = [
  { id: "comissao", label: "Comissionado(a)" },
  { id: "dono", label: "Dono(a) / sem comissão" },
  { id: "aluguel", label: "Aluga cadeira" },
  { id: "parceiro", label: "Profissional-parceiro" },
];

export const vinculoDe = (p) => p?.vinculo || "comissao";

/* Lei do Salão-Parceiro (Bloco 11) — Lei 12.592/2012, art. 1º-A, com a     */
/* redação da Lei 13.352/2016. A cota-parte do profissional-parceiro não     */
/* integra a receita bruta do salão (§5º). Para isso valer aqui, o parceiro  */
/* precisa de CNPJ (regra do Simples Nacional, Resolução CGSN) e de contrato */
/* escrito e homologado (§8º); sem contrato, há vínculo de emprego (art.     */
/* 1º-C). Salão MEI não pode ser salão-parceiro.                             */
export const parceiroValido = (p) => vinculoDe(p) === "parceiro" && !!p.temCnpj && !!p.contratoHomologado;

/* Comissão média da equipe, ponderada pelos atendimentos de cada pessoa que */
/* atende pelo salão (comissionados e dono). Quem aluga cadeira fica de fora: */
/* o serviço dele não é receita do salão. Se faltar o número de atendimentos */
/* de alguém, usa média simples e avisa (ponderada: false).                  */
export function calcularComissaoEquipe(profissionais, { parceriaPermitida = true } = {}) {
  const comPct = (p) => String(p.comissaoPct ?? "").trim() !== "";
  const participantes = (profissionais || [])
    .filter((p) => p.ativo !== false && (p.nome || "").trim())
    .filter((p) => ((vinculoDe(p) === "comissao" || vinculoDe(p) === "parceiro") && comPct(p)) || vinculoDe(p) === "dono")
    .map((p) => ({
      id: p.id,
      nome: p.nome.trim(),
      vinculo: vinculoDe(p),
      pct: vinculoDe(p) === "dono" ? 0 : Math.min(99, Math.max(0, N(p.comissaoPct))),
      atendimentos: Math.max(0, N(p.atendimentosMes)),
      // Bloco 11: cota-parte que sai da receita do salão (parceiro válido em salão que não é MEI).
      cotaForaDaReceita: parceriaPermitida && parceiroValido(p),
    }));
  const temComissionado = participantes.some((p) => p.vinculo === "comissao" || p.vinculo === "parceiro");
  if (participantes.length < 2 || !temComissionado) return null;
  const ponderada = participantes.every((p) => p.atendimentos > 0);
  const somaPesos = ponderada ? participantes.reduce((s, p) => s + p.atendimentos, 0) : participantes.length;
  const peso = (p) => (ponderada ? p.atendimentos : 1);
  const pct = participantes.reduce((s, p) => s + p.pct * peso(p), 0) / somaPesos;
  // Parte da média que é cota-parte de parceiro (fica fora da receita bruta do salão).
  const parcelaParceiroPct = participantes.reduce((s, p) => s + (p.cotaForaDaReceita ? p.pct * peso(p) : 0), 0) / somaPesos;
  return { pct, ponderada, participantes, parcelaParceiroPct };
}

/* Quanto do preço de um serviço é cota-parte de parceiro, em % (Bloco 11):  */
/* com a média da equipe, a parte dos parceiros válidos na média; com        */
/* comissão própria marcada como cota-parte, a comissão inteira; senão, 0.   */
export function parcelaParceiro(servico, nd) {
  // Valor já resolvido por quem chama (ex.: simulador de sensibilidade).
  if (servico?.parcelaParceiroPct != null) return Math.min(99, Math.max(0, N(servico.parcelaParceiroPct)));
  if (servico?.comissaoModo === "equipe" && nd?.comissaoEquipe) return N(nd.comissaoEquipe.parcelaParceiroPct);
  if (servico?.comissaoEhCotaParte && nd?.temParceriaValida) return Math.min(99, Math.max(0, N(servico.comissaoPct)));
  return 0;
}

/* Comissão que de fato entra no preço de um serviço: a média da equipe, se  */
/* o serviço foi marcado para usá-la e ela existe; senão, a do próprio       */
/* serviço. Serviços salvos antes do Bloco 4 não têm comissaoModo e mantêm   */
/* a comissão que já tinham.                                                 */
export function comissaoEfetiva(servico, nd) {
  if (servico?.comissaoModo === "equipe" && nd?.comissaoEquipe) return nd.comissaoEquipe.pct;
  return N(servico?.comissaoPct);
}

/* Formas de pagamento (Bloco 5). Cada forma tem a parte das vendas que     */
/* entra por ela e a taxa cobrada. Dinheiro não tem taxa. Nenhuma taxa vem   */
/* preenchida: cada maquininha e cada banco cobra diferente, e o número      */
/* certo está no extrato ou no contrato do próprio usuário.                  */
export const FORMAS_PAGAMENTO = [
  { id: "dinheiro", label: "Dinheiro", semTaxa: true },
  { id: "pix", label: "Pix" },
  { id: "debito", label: "Débito" },
  { id: "credito", label: "Crédito à vista" },
  { id: "parcelado", label: "Crédito parcelado" },
];

/* Taxa média de recebimento: média das taxas ponderada pela parte das vendas */
/* de cada forma. Só vale como média do negócio quando as partes somam 100%  */
/* (completo); antes disso, a tela mostra quanto falta.                      */
export function calcularTaxaRecebimento(recebimento) {
  const itens = FORMAS_PAGAMENTO.map((f) => {
    const r = recebimento?.[f.id] || {};
    return {
      id: f.id,
      label: f.label,
      participacao: Math.max(0, N(r.participacaoPct)),
      taxa: f.semTaxa ? 0 : Math.min(99, Math.max(0, N(r.taxaPct))),
    };
  }).filter((i) => i.participacao > 0);
  if (itens.length === 0) return null;
  const soma = itens.reduce((s, i) => s + i.participacao, 0);
  const pct = itens.reduce((s, i) => s + i.participacao * i.taxa, 0) / soma;
  return { pct, soma, completo: Math.abs(soma - 100) <= 0.5, itens };
}

/* Taxa de cartão que de fato entra no preço de um serviço: a média do       */
/* negócio, se o serviço foi marcado para usá-la e ela existe; senão, a do   */
/* próprio serviço. Serviços salvos antes do Bloco 5 não têm taxaModo e      */
/* mantêm a taxa que já tinham.                                              */
export function taxaEfetiva(servico, nd) {
  if (servico?.taxaModo === "negocio" && nd?.taxaRecebimento) return nd.taxaRecebimento.pct;
  return N(servico?.taxaCartaoPct);
}

export function computeNegocioDerivado(n) {
  const custosFixosSoma = n.custosFixos.reduce((s, i) => s + N(i.valor), 0);
  const proLabore = N(n.proLabore);
  const meiDas = n.regime === "mei" ? N(n.meiDas) : 0;
  const custoFixoTotal = custosFixosSoma + proLabore + meiDas;
  const custoFixoNaoCaixa = n.custosFixos.filter((i) => i.semCaixa).reduce((s, i) => s + N(i.valor), 0);
  const horasTotais = N(n.diasMes) * N(n.horasDia) * Math.max(1, N(n.numeroProfissionais) || 1);
  // Aluguel de cadeiras recebido (lado do dono): é receita do salão, não custo
  // negativo — aparece em linha própria no DRE. Para o preço, reduz o custo
  // fixo que os serviços do próprio salão precisam cobrir.
  const receitaAluguelCadeiras = (n.profissionais || [])
    .filter((p) => p.ativo !== false && vinculoDe(p) === "aluguel")
    .reduce((s, p) => s + N(p.aluguelMes), 0);
  const custoFixoLiquido = Math.max(0, custoFixoTotal - receitaAluguelCadeiras);
  const custoFixoPorHora = horasTotais > 0 ? custoFixoLiquido / horasTotais : 0;
  // Bloco 11: salão MEI não pode ser salão-parceiro.
  const parceriaPermitida = n.regime !== "mei";
  const comissaoEquipe = calcularComissaoEquipe(n.profissionais, { parceriaPermitida });
  const temParceriaValida = parceriaPermitida && (n.profissionais || []).some((p) => p.ativo !== false && parceiroValido(p));
  const recebimento = calcularTaxaRecebimento(n.recebimento);
  const taxaRecebimento = recebimento?.completo ? recebimento : null;

  let impostoPct = 0,
    fatorR = null,
    anexoUsado = null,
    aliqInfo = null;
  if (n.regime === "simples") {
    const rbt12 = N(n.rbt12);
    const folha12 = N(n.folha12);
    fatorR = rbt12 > 0 ? folha12 / rbt12 : 0;
    const elegivelIII = n.atividadeSempreAnexoIII || fatorR >= 0.28;
    anexoUsado = elegivelIII ? "III" : "V";
    aliqInfo = aliquotaEfetiva(rbt12, elegivelIII ? ANEXO_III : ANEXO_V);
    impostoPct = aliqInfo ? aliqInfo.aliqEfetiva * 100 : 0;
  }

  return {
    custosFixosSoma,
    proLabore,
    meiDas,
    custoFixoTotal,
    custoFixoNaoCaixa,
    receitaAluguelCadeiras,
    custoFixoLiquido,
    comissaoEquipe,
    taxaRecebimento,
    parceriaPermitida,
    temParceriaValida,
    horasTotais,
    custoFixoPorHora,
    impostoPct,
    fatorR,
    anexoUsado,
    aliqInfo,
    numeroProfissionais: Math.max(1, N(n.numeroProfissionais) || 1),
    diasMes: N(n.diasMes),
    insumosCompartilhados: n.insumosCompartilhados || [],
    perfil: n.perfil || null,
    regime: n.regime,
    configurado: n.custosFixos.length > 0 && custoFixoTotal > 0 && horasTotais > 0,
  };
}

/* ======================================================================= */
/* Custo variável "inteligente" — converte o jeito que o profissional      */
/* realmente pensa (duração de uma compra, ou quanto usa por atendimento)  */
/* no valor por atendimento que o motor de precificação já esperava. Três  */
/* modos coexistem no mesmo item, escolhidos por item:                     */
/*   'direto'  — valor por atendimento digitado à mão (comportamento       */
/*                original, mantido por compatibilidade com o que já foi   */
/*                salvo antes desta versão).                               */
/*   'duracao' — ex: "paguei R$80 num galão que dura 45 dias" — usa o      */
/*                volume de atendimentos do próprio serviço para converter.*/
/*   'unidade' — ex: "a caixa de 100 toucas custou R$40, uso 1 por         */
/*                atendimento" — divide o preço da compra pela quantidade  */
/*                comprada e multiplica pelo consumo unitário.             */
/* ======================================================================= */

export function converterParaDias(valor, unidade) {
  const v = N(valor);
  if (unidade === "semanas") return v * 7;
  if (unidade === "meses") return v * 30;
  return v; // "dias"
}

export function precoUnitarioItem(item) {
  const qtd = N(item.quantidadeComprada);
  return qtd > 0 ? N(item.valorCompra) / qtd : 0;
}

/* Custo mensal total de um insumo compartilhado (independe de quem usa) —   */
/* só existe pra insumo tipo 'duracao'; tipo 'unidade' não decai com o       */
/* tempo, então não tem "custo mensal" próprio, só preço por unidade.        */
export function custoMensalInsumoCompartilhado(insumo, diasMesNegocio) {
  const duracaoDias = converterParaDias(insumo.duracaoValor, insumo.duracaoUnidade);
  const dm = N(diasMesNegocio);
  if (duracaoDias <= 0 || dm <= 0) return 0;
  return (N(insumo.valorCompra) * dm) / duracaoDias;
}

export function calcularValorItemVariavel(item, { atendimentosMes, diasMesNegocio, insumosCompartilhados }) {
  if (item.modo === "compartilhado") {
    const insumo = (insumosCompartilhados || []).find((i) => i.id === item.insumoId);
    if (!insumo) return 0;
    if (insumo.modo === "unidade") {
      // consumo direto: cada atendimento realmente gasta sua própria unidade —
      // não precisa de alocação percentual, não tem risco de contar em dobro.
      return precoUnitarioItem(insumo) * N(item.usoPorAtendimento);
    }
    // insumo tipo 'duracao': o custo dele é por TEMPO, não por consumo — se dois
    // serviços puxassem 100% cada um, o insumo seria contado em dobro no DRE. Por
    // isso cada serviço aloca um % da compra compartilhada pra si.
    const custoMensal = custoMensalInsumoCompartilhado(insumo, diasMesNegocio);
    const custoMensalAlocado = custoMensal * (N(item.percentualAlocado) / 100);
    return N(atendimentosMes) > 0 ? custoMensalAlocado / N(atendimentosMes) : 0;
  }
  if (item.modo === "unidade") {
    return precoUnitarioItem(item) * N(item.usoPorAtendimento);
  }
  if (item.modo === "duracao") {
    const duracaoDias = converterParaDias(item.duracaoValor, item.duracaoUnidade);
    const dm = N(diasMesNegocio);
    if (duracaoDias <= 0 || N(atendimentosMes) <= 0 || dm <= 0) return 0;
    const atendimentosNoPeriodoDaCompra = (duracaoDias / dm) * N(atendimentosMes);
    return atendimentosNoPeriodoDaCompra > 0 ? N(item.valorCompra) / atendimentosNoPeriodoDaCompra : 0;
  }
  return N(item.valor); // 'direto'
}

function somaCustosVariaveis(custosVariaveis, contexto) {
  return custosVariaveis.reduce((s, i) => s + calcularValorItemVariavel(i, contexto), 0);
}

/* ======================================================================= */
/* Motor de cálculo por serviço (fórmula original intacta — só a origem    */
/* de "totalVariaveis" ficou inteligente)                                  */
/* ======================================================================= */

export function calcularServico(
  {
    custosVariaveis,
    comissaoPct: comissaoInformada,
    comissaoModo,
    comissaoEhCotaParte,
    parcelaParceiroPct: parcelaInformada,
    taxaCartaoPct: taxaInformada,
    taxaModo,
    margemPct,
    horasPorAtendimento,
    atendimentosMes,
  },
  nd,
) {
  if (!nd?.horasTotais) return { status: "sem-negocio" };
  const comissaoPct = comissaoEfetiva({ comissaoPct: comissaoInformada, comissaoModo }, nd);
  const taxaInformadaOuMedia = taxaEfetiva({ taxaCartaoPct: taxaInformada, taxaModo }, nd);
  // Bloco 11: a cota-parte do parceiro fica fora da receita do salão. O imposto e a
  // taxa da maquininha (dividida pela cota) incidem só sobre a parte do salão.
  const parcelaParceiroPct = parcelaParceiro(
    { comissaoPct: comissaoInformada, comissaoModo, comissaoEhCotaParte, parcelaParceiroPct: parcelaInformada },
    nd,
  );
  const fatorSalao = 1 - parcelaParceiroPct / 100;
  const taxaCartaoPct = taxaInformadaOuMedia * fatorSalao;
  const totalVariaveis = somaCustosVariaveis(custosVariaveis, {
    atendimentosMes,
    diasMesNegocio: nd.diasMes,
    insumosCompartilhados: nd.insumosCompartilhados,
  });
  const imposto = nd.impostoPct * fatorSalao;
  const soma = N(comissaoPct) + N(taxaCartaoPct) + imposto + N(margemPct);

  if (atendimentosMes <= 0) return { status: "sem-volume" };
  if (soma >= 100) return { status: "trava-percentual", soma };
  if (totalVariaveis <= 0 && nd.custoFixoPorHora * N(horasPorAtendimento) <= 0) return { status: "sem-custo" };

  const horas = N(horasPorAtendimento);
  const custoFixoRateado = nd.custoFixoPorHora * horas;
  const custoBase = custoFixoRateado + totalVariaveis;
  const preco = custoBase / (1 - soma / 100);
  const valorComissao = preco * (N(comissaoPct) / 100);
  const valorTaxaCartao = preco * (N(taxaCartaoPct) / 100);
  const valorImposto = preco * (imposto / 100);
  const valorMargem = preco * (N(margemPct) / 100);
  const valorCotaParte = preco * (parcelaParceiroPct / 100); // parte de valorComissao que é cota de parceiro
  const margemContribuicaoUnitaria = preco - valorImposto - totalVariaveis - valorComissao - valorTaxaCartao;
  const lucroProjetadoMes = valorMargem * atendimentosMes;
  const pontoEquilibrioServico = margemContribuicaoUnitaria > 0 ? nd.custoFixoLiquido / margemContribuicaoUnitaria : Infinity;

  return {
    status: "ok",
    totalVariaveis,
    custoFixoRateado,
    preco,
    comissaoPct,
    taxaCartaoPct,
    parcelaParceiroPct,
    impostoSobrePrecoPct: imposto,
    valorCotaParte,
    valorComissao,
    valorTaxaCartao,
    valorImposto,
    valorMargem,
    margemContribuicaoUnitaria,
    lucroProjetadoMes,
    pontoEquilibrioServico,
  };
}

/* Converte o ponto de equilíbrio mensal (já existente) para semanal, usando */
/* os dias trabalhados/mês do próprio negócio como base — assim fica         */
/* coerente com o resto do app, que já usa esse número pra tudo.             */
// Semana de CALENDÁRIO (365,25/12/7 ≈ 4,3482 semanas/mês), não semana de
// dias trabalhados — mais intuitivo pra bater com a conta de cabeça de
// "um mês tem uns 4 e pouco de semana". Parâmetro diasMesNegocio mantido
// na assinatura só por compatibilidade com quem já chama esta função —
// não é mais usado no cálculo.
const SEMANAS_POR_MES_CALENDARIO = 365.25 / 12 / 7;

export function pontoEquilibrioSemanal(mensal, _diasMesNegocioNaoUsado) {
  if (!Number.isFinite(mensal)) return Infinity;
  return mensal / SEMANAS_POR_MES_CALENDARIO;
}

/* ======================================================================= */
/* Motor de cálculo reverso — Modo B ("Já tenho um preço"). Usa exatamente */
/* os mesmos componentes de custo do Modo A (custoFixoPorHora, variáveis,  */
/* comissão, taxa, imposto) só resolvendo na direção contrária: em vez de  */
/* achar o preço a partir da margem, acha a margem a partir do preço.      */
/* Verificado numericamente que os dois modos batem exatamente (ver PR).   */
/* ======================================================================= */

export function calcularReverso(
  {
    custosVariaveis,
    comissaoPct: comissaoInformada,
    comissaoModo,
    comissaoEhCotaParte,
    parcelaParceiroPct: parcelaInformada,
    taxaCartaoPct: taxaInformada,
    taxaModo,
    precoCobrado,
    horasPorAtendimento,
    atendimentosMes,
    margemMetaPct,
  },
  nd,
) {
  if (!nd?.horasTotais) return { status: "sem-negocio" };
  const comissaoPct = comissaoEfetiva({ comissaoPct: comissaoInformada, comissaoModo }, nd);
  // Bloco 11: mesma regra do Modo A para a cota-parte do parceiro.
  const parcelaParceiroPct = parcelaParceiro(
    { comissaoPct: comissaoInformada, comissaoModo, comissaoEhCotaParte, parcelaParceiroPct: parcelaInformada },
    nd,
  );
  const fatorSalao = 1 - parcelaParceiroPct / 100;
  const taxaCartaoPct = taxaEfetiva({ taxaCartaoPct: taxaInformada, taxaModo }, nd) * fatorSalao;
  const preco = N(precoCobrado);
  if (preco <= 0) return { status: "sem-preco" };

  const totalVariaveis = somaCustosVariaveis(custosVariaveis, {
    atendimentosMes,
    diasMesNegocio: nd.diasMes,
    insumosCompartilhados: nd.insumosCompartilhados,
  });
  const horas = N(horasPorAtendimento);
  const imposto = nd.impostoPct * fatorSalao;
  const custoFixoRateado = nd.custoFixoPorHora * horas;

  const valorComissao = preco * (N(comissaoPct) / 100);
  const valorCotaParte = preco * (parcelaParceiroPct / 100);
  const valorTaxaCartao = preco * (N(taxaCartaoPct) / 100);
  const valorImposto = preco * (imposto / 100);
  const custoTotal = custoFixoRateado + totalVariaveis + valorComissao + valorTaxaCartao + valorImposto;

  const lucroBruto = preco - totalVariaveis;
  const lucroLiquido = preco - custoTotal;
  const margemLiquidaPct = (lucroLiquido / preco) * 100;
  const markup = custoTotal > 0 ? preco / custoTotal : null;
  const lucroPorHora = horas > 0 ? lucroLiquido / horas : null;

  // margem de contribuição no mesmo sentido do Modo A (não desconta o rateio do fixo) —
  // é o que alimenta o ponto de equilíbrio deste serviço específico.
  const margemContribuicaoUnitaria = preco - totalVariaveis - valorComissao - valorTaxaCartao - valorImposto;
  const pontoEquilibrioServico = margemContribuicaoUnitaria > 0 ? nd.custoFixoLiquido / margemContribuicaoUnitaria : Infinity;

  const somaSemMargem = N(comissaoPct) + N(taxaCartaoPct) + imposto;
  const custoBase = custoFixoRateado + totalVariaveis;
  const precoMinimo = somaSemMargem < 100 ? custoBase / (1 - somaSemMargem / 100) : null;
  const somaComMeta = somaSemMargem + N(margemMetaPct);
  const precoIdeal = somaComMeta < 100 ? custoBase / (1 - somaComMeta / 100) : null;

  const lucroProjetadoMes = lucroLiquido * N(atendimentosMes);

  let diagnostico = "prejuizo";
  if (lucroLiquido >= 0) diagnostico = margemLiquidaPct >= N(margemMetaPct) ? "saudavel" : "apertado";

  return {
    status: "ok",
    diagnostico,
    comissaoPct,
    taxaCartaoPct,
    parcelaParceiroPct,
    impostoSobrePrecoPct: imposto,
    valorCotaParte,
    preco,
    totalVariaveis,
    custoFixoRateado,
    valorComissao,
    valorTaxaCartao,
    valorImposto,
    custoTotal,
    lucroBruto,
    lucroLiquido,
    margemLiquidaPct,
    markup,
    lucroPorHora,
    margemContribuicaoUnitaria,
    pontoEquilibrioServico,
    precoMinimo,
    precoIdeal,
    lucroProjetadoMes,
  };
}

/* Visão unificada de um serviço salvo, independente do modo em que foi   */
/* criado — usada pelo Painel para "margem média" e "serviços em prejuízo" */
export function calcularUnificado(servico, nd) {
  if (servico.modo === "ja-tenho") {
    const r = calcularReverso({ ...servico, margemMetaPct: N(servico.margemPct) }, nd);
    if (r.status !== "ok") return { status: r.status };
    return { status: "ok", preco: r.preco, margemPct: r.margemLiquidaPct, diagnostico: r.diagnostico, lucroUnitario: r.lucroLiquido };
  }
  const r = calcularServico(servico, nd);
  if (r.status !== "ok") return { status: r.status };
  return { status: "ok", preco: r.preco, margemPct: N(servico.margemPct), diagnostico: "saudavel", lucroUnitario: r.valorMargem };
}

/* Escolhe automaticamente qual motor usar (Modo A ou B) pra exibição —    */
/* usado em toda lista/painel que soma vários serviços salvos de uma vez. */
export function calcularParaExibicao(servico, nd) {
  if (servico.modo === "ja-tenho") {
    return calcularReverso({ ...servico, margemMetaPct: N(servico.margemPct) }, nd);
  }
  return calcularServico(servico, nd);
}

/* DRE mensal — mesma forma exata de montarDRE(), mas derivada de um Fechamento     */
/* Mensal já salvo, não recalculada a partir da configuração atual. É por isso que  */
/* fica "congelada": se você mudar custo fixo ou regime tributário mês que vem, o   */
/* DRE de meses passados continua mostrando o que era real naquele mês.            */
export function montarDREMensal(fechamento) {
  // Bloco 11: com parceiros, o faturamento é o valor cobrado dos clientes; a
  // receita bruta do salão é ele menos a cota-parte repassada. Fechamentos
  // antigos não têm cotaParteSnapshot (vale 0) e continuam iguais.
  const valorCobrado = N(fechamento.faturamentoBruto);
  const cotaParteParceiros = N(fechamento.cotaParteSnapshot);
  const receitaBruta = valorCobrado - cotaParteParceiros;
  const impostos = N(fechamento.impostoPagoReal);
  const receitaLiquida = receitaBruta - impostos;
  const custosVariaveisTotais = N(fechamento.custosVariaveisReaisInformados);
  const margemContribuicaoTotal = receitaLiquida - custosVariaveisTotais;
  const custosFixos = N(fechamento.custosFixosSnapshot);
  const aluguelRecebido = N(fechamento.aluguelRecebidoSnapshot);
  const resultadoOperacional = margemContribuicaoTotal - custosFixos + aluguelRecebido;
  return {
    valorCobrado,
    cotaParteParceiros,
    receitaBruta,
    impostos,
    receitaLiquida,
    custosVariaveisTotais,
    margemContribuicaoTotal,
    custosFixos,
    aluguelRecebido,
    resultadoOperacional,
  };
}

export function montarDRE(servicosCalc, nd) {
  const validos = servicosCalc.filter((s) => s.calc.status === "ok");
  // Bloco 11: valor cobrado dos clientes − cota-parte dos parceiros = receita bruta
  // do salão. A cota sai dos custos variáveis para não ser descontada duas vezes.
  const valorCobrado = validos.reduce((s, x) => s + x.calc.preco * N(x.atendimentosMes), 0);
  const cotaParteParceiros = validos.reduce((s, x) => s + N(x.calc.valorCotaParte) * N(x.atendimentosMes), 0);
  const receitaBruta = valorCobrado - cotaParteParceiros;
  const impostos = validos.reduce((s, x) => s + x.calc.valorImposto * N(x.atendimentosMes), 0);
  const receitaLiquida = receitaBruta - impostos;
  const custosVariaveisTotais = validos.reduce(
    (s, x) => s + (x.calc.totalVariaveis + x.calc.valorComissao - N(x.calc.valorCotaParte) + x.calc.valorTaxaCartao) * N(x.atendimentosMes),
    0,
  );
  const margemContribuicaoTotal = receitaLiquida - custosVariaveisTotais;
  const custosFixos = nd.custoFixoTotal;
  // Aluguel de cadeiras recebido: outra receita operacional, em linha própria.
  // custosFixosLiquidos é o que a margem dos serviços precisa cobrir — base
  // dos pontos de equilíbrio.
  const aluguelRecebido = N(nd.receitaAluguelCadeiras);
  const custosFixosLiquidos = Math.max(0, custosFixos - aluguelRecebido);
  const resultadoOperacional = margemContribuicaoTotal - custosFixos + aluguelRecebido;
  const rcm = receitaBruta > 0 ? margemContribuicaoTotal / receitaBruta : 0;
  return {
    valorCobrado,
    cotaParteParceiros,
    receitaBruta,
    impostos,
    receitaLiquida,
    custosVariaveisTotais,
    margemContribuicaoTotal,
    custosFixos,
    aluguelRecebido,
    custosFixosLiquidos,
    resultadoOperacional,
    rcm,
    qtdInvalidos: servicosCalc.length - validos.length,
  };
}

/* Indicadores gerenciais do Painel: ponto de equilíbrio pelo mix (MCP), os três     */
/* pontos de equilíbrio em R$, margem de segurança e GAO. Funções puras, testadas.  */
export function calcularIndicadoresGerenciais(servicosValidos, dre, nd, negocio) {
  // Ponto de equilíbrio ponderado pelo mix de vendas (Padoveze, Contabilidade Gerencial):
  // cada serviço pesa no mix pela sua fatia de atendimentos/mês; a margem de contribuição
  // ponderada (MCP) é a soma de (peso × margem de contribuição unitária) de cada um. O
  // ponto de equilíbrio do negócio inteiro, em atendimentos, é custoFixoTotal ÷ MCP.
  const somaAtendimentosMix = servicosValidos.reduce((s, x) => s + N(x.atendimentosMes), 0);
  const margemContribuicaoPonderada =
    somaAtendimentosMix > 0
      ? servicosValidos.reduce((s, x) => s + (N(x.atendimentosMes) / somaAtendimentosMix) * x.calc.margemContribuicaoUnitaria, 0)
      : 0;
  const pontoEquilibrioMix = margemContribuicaoPonderada > 0 ? nd.custoFixoLiquido / margemContribuicaoPonderada : Infinity;

  const custoOportunidadeMes = N(negocio.capitalInvestido) * (N(negocio.taxaRetorno) / 100);
  const peContabilRS = dre.rcm > 0 ? dre.custosFixosLiquidos / dre.rcm : Infinity;
  const peFinanceiroRS = dre.rcm > 0 ? Math.max(0, dre.custosFixosLiquidos - nd.custoFixoNaoCaixa) / dre.rcm : Infinity;
  const peEconomicoRS = dre.rcm > 0 ? (dre.custosFixosLiquidos + custoOportunidadeMes) / dre.rcm : Infinity;
  const margemSeguranca =
    dre.receitaBruta > 0 && Number.isFinite(peContabilRS) ? ((dre.receitaBruta - peContabilRS) / dre.receitaBruta) * 100 : null;
  const gao = dre.resultadoOperacional > 0 ? dre.margemContribuicaoTotal / dre.resultadoOperacional : null;
  return {
    somaAtendimentosMix,
    margemContribuicaoPonderada,
    pontoEquilibrioMix,
    custoOportunidadeMes,
    peContabilRS,
    peFinanceiroRS,
    peEconomicoRS,
    margemSeguranca,
    gao,
  };
}

/* Seletor de pacote: escolhe 2+ serviços já salvos e pré-preenche um combo    */
/* a partir deles. Não inventa desconto nenhum — a economia (se houver) só     */
/* aparece se o usuário reduzir tempo/material de verdade no combo.            */
// Preço mínimo recomendado pro pacote — reaproveita a MESMA fórmula markup-divisor de
// calcularServico(), só que com os componentes somados/ponderados do combo:
// - custo de material e rateio de custo fixo: soma direta de cada serviço selecionado
// - comissão e taxa de cartão: média ponderada pelo preço de cada serviço (não inventa uma
//   taxa nova, só combina as que cada serviço já tem)
// - imposto: nd.impostoPct direto, é uma taxa do negócio, não do serviço específico
// - margem-alvo do combo: a MENOR margem efetiva entre os serviços escolhidos (decisão
//   conservadora — nenhum serviço do pacote fica "carregando" desconto dos outros escondido)
export function calcularPrecoMinimoPacote(itensSelecionados, nd) {
  if (!nd || itensSelecionados.length === 0) return { status: "sem-dado" };

  const totalVariaveisCombo = itensSelecionados.reduce((s, it) => s + it.calc.totalVariaveis, 0);
  const custoFixoRateadoCombo = itensSelecionados.reduce((s, it) => s + it.calc.custoFixoRateado, 0);
  const custoBaseCombo = totalVariaveisCombo + custoFixoRateadoCombo;

  const somaPrecos = itensSelecionados.reduce((s, it) => s + it.calc.preco, 0);
  if (somaPrecos <= 0) return { status: "sem-dado" };
  const comissaoPctPonderada = itensSelecionados.reduce((s, it) => s + comissaoEfetiva(it, nd) * it.calc.preco, 0) / somaPrecos;
  // Bloco 11: taxa e imposto já descontada a cota-parte de parceiro de cada serviço.
  const fatorSalao = (it) => 1 - parcelaParceiro(it, nd) / 100;
  const taxaCartaoPctPonderada =
    itensSelecionados.reduce((s, it) => s + taxaEfetiva(it, nd) * fatorSalao(it) * it.calc.preco, 0) / somaPrecos;
  const impostoPctPonderado = itensSelecionados.reduce((s, it) => s + nd.impostoPct * fatorSalao(it) * it.calc.preco, 0) / somaPrecos;

  const margensEfetivas = itensSelecionados.map((it) => ({
    nome: it.nome,
    margemPct: it.modo === "descobrir" ? N(it.margemPct) : it.calc.margemLiquidaPct,
  }));
  const menor = margensEfetivas.reduce((a, b) => (b.margemPct < a.margemPct ? b : a));

  const soma = comissaoPctPonderada + taxaCartaoPctPonderada + impostoPctPonderado + menor.margemPct;
  if (soma >= 100) return { status: "trava-percentual" };

  return {
    status: "ok",
    precoMinimoRecomendado: custoBaseCombo / (1 - soma / 100),
    margemUsadaPct: menor.margemPct,
    servicoMargemMenor: menor.nome,
  };
}

/* Distância em linha reta (fórmula de haversine), em km. */
export function distanciaKm(a, b) {
  const R = 6371;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function mediana(valores) {
  const v = [...valores].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/* Preço mais recente que cada concorrente tem anotado para um serviço.     */
/* Assim, anotar o mesmo concorrente duas vezes não pesa em dobro.          */
export function ultimoPrecoPorConcorrente(concorrentes, servicoId) {
  return concorrentes
    .map((c) => {
      const doServico = (c.precos || []).filter((p) => p.servicoId === servicoId && N(p.valor) > 0);
      if (doServico.length === 0) return null;
      const ultimo = doServico.reduce((a, b) => (b.data > a.data ? b : a));
      return { concorrente: c, valor: N(ultimo.valor), data: ultimo.data };
    })
    .filter(Boolean);
}

/* Piso do serviço: o preço que só cobre os custos, sem lucro (margem 0).   */
export function pisoDoServico(s, nd) {
  if (s.modo === "ja-tenho") {
    const r = calcularReverso({ ...s, margemMetaPct: 0 }, nd);
    return r.status === "ok" ? r.precoMinimo : null;
  }
  const r = calcularServico({ ...s, margemPct: 0 }, nd);
  return r.status === "ok" ? r.preco : null;
}

/* ======================================================================= */
/* Observatório: posição na concorrência e planilha (Bloco 10).            */
/* ======================================================================= */
export const FONTES_PRECO = [
  { id: "local", label: "Tabela no local" },
  { id: "internet", label: "Instagram ou site" },
  { id: "contato", label: "WhatsApp ou ligação" },
  { id: "cliente", label: "Cliente contou" },
  { id: "outro", label: "Outro" },
];
export const DIAS_PRECO_ANTIGO = 180;

/* Dias entre uma data AAAA-MM-DD e hoje (meio-dia, para não errar pelo fuso). */
export function diasDesde(iso, hoje = new Date()) {
  return Math.floor((hoje.getTime() - new Date(`${iso}T12:00:00`).getTime()) / 86400000);
}

/* Onde o preço do usuário fica entre os preços anotados dos concorrentes.   */
/* Até 2,5% de diferença conta como "na mediana".                            */
export function posicaoNaConcorrencia(seu, valores) {
  const med = mediana(valores);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const difPct = med > 0 ? ((seu - med) / med) * 100 : 0;
  const um = valores.length === 1;
  let chave, texto;
  if (Math.abs(difPct) < 2.5) {
    chave = "mediana";
    texto = "na mediana";
  } else if (seu < min) {
    chave = "abaixo-todos";
    texto = um ? "abaixo do concorrente" : "abaixo de todos";
  } else if (seu > max) {
    chave = "acima-todos";
    texto = um ? "acima do concorrente" : "acima de todos";
  } else if (difPct < 0) {
    chave = "abaixo";
    texto = "abaixo da mediana";
  } else {
    chave = "acima";
    texto = "acima da mediana";
  }
  return { chave, texto, difPct, med, min, max };
}

const centavos = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : null);
const dataBR = (iso) => (iso ? iso.split("-").reverse().join("/") : "");

/* Linhas das três abas do Observatório na planilha: concorrentes, preços    */
/* anotados e comparação por cidade e serviço (as mesmas regras da tela).    */
export function linhasPlanilhaObservatorio(concorrentes, meusLocais, servicos, nd, hoje = new Date()) {
  const lista = Array.isArray(concorrentes) ? concorrentes : [];
  const locais = meusLocais || {};
  const fonte = (id) => FONTES_PRECO.find((f) => f.id === id)?.label || "Outro";
  const servicoExiste = (id) => (servicos || []).some((s) => s.id === id);

  const abaConcorrentes = [
    ["Cidade", "Concorrente", "Tipo", "Bairro", "Distância do meu negócio (km)", "Preços anotados", "Latitude", "Longitude"],
    ...lista.map((c) => {
      const meu = locais[c.cidade];
      const dist = meu && c.lat != null ? Math.round(distanciaKm(meu, c) * 100) / 100 : null;
      return [c.cidade, c.nome, c.tipo, c.bairro || "", dist, (c.precos || []).length, c.lat ?? null, c.lng ?? null];
    }),
  ];

  const abaPrecos = [
    ["Cidade", "Concorrente", "Serviço", "Entra na comparação", "Preço (R$)", "Data", "Onde viu", "Dias desde a anotação"],
    ...lista.flatMap((c) =>
      (c.precos || []).map((p) => [
        c.cidade,
        c.nome,
        p.servicoNome,
        p.servicoId && servicoExiste(p.servicoId) ? "Sim" : "Não",
        centavos(N(p.valor)),
        dataBR(p.data),
        fonte(p.fonte),
        diasDesde(p.data, hoje),
      ]),
    ),
  ];

  const abaComparacao = [
    [
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
    ],
  ];
  const cidades = [...new Set(lista.map((c) => c.cidade))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const servicosOrdenados = [...(servicos || [])].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  for (const cidade of cidades) {
    const daCidade = lista.filter((c) => c.cidade === cidade);
    for (const s of servicosOrdenados) {
      const calc = nd ? calcularParaExibicao(s, nd) : { status: "sem-negocio" };
      if (calc.status !== "ok") continue;
      const obs = ultimoPrecoPorConcorrente(daCidade, s.id);
      if (obs.length === 0) continue;
      const pos = posicaoNaConcorrencia(
        calc.preco,
        obs.map((o) => o.valor),
      );
      abaComparacao.push([
        cidade,
        s.nome,
        centavos(calc.preco),
        centavos(pisoDoServico(s, nd)),
        obs.length,
        centavos(pos.min),
        centavos(pos.med),
        centavos(pos.max),
        Math.round(pos.difPct * 10) / 10,
        pos.texto,
        obs.filter((o) => diasDesde(o.data, hoje) > DIAS_PRECO_ANTIGO).length,
      ]);
    }
  }
  return { concorrentes: abaConcorrentes, precos: abaPrecos, comparacao: abaComparacao };
}

/* ======================================================================= */
/* Régua única com parceiros (Bloco 16, opção C). Gráficos, sazonalidade e  */
/* pontos de equilíbrio usam a receita do salão: valor cobrado − cota-parte */
/* dos parceiros (Lei 12.592/2012, art. 1º-A, § 5º). Com parceiros, o app    */
/* mostra junto o equivalente em valor cobrado dos clientes.                */
/* ======================================================================= */

/* Receita do salão num fechamento do mês. Fechamentos antigos, sem a cota  */
/* registrada, ficam iguais ao faturamento.                                 */
export function receitaDoSalao(fechamento) {
  return N(fechamento?.faturamentoBruto) - N(fechamento?.cotaParteSnapshot);
}

/* Quanto um valor em receita do salão representa em valor cobrado, pela    */
/* proporção da cota no DRE: valor × cobrado ÷ (cobrado − cota).            */
/* Ex.: R$ 12.000 com R$ 20.000 cobrados e R$ 4.000 de cota = R$ 15.000.   */
/* Sem parceiros devolve null (não há o que traduzir).                     */
export function equivalenteEmValorCobrado(valorReceitaSalao, { valorCobrado, cotaParteParceiros } = {}) {
  const cobrado = N(valorCobrado);
  const cota = N(cotaParteParceiros);
  if (!Number.isFinite(valorReceitaSalao) || cota <= 0 || cobrado <= cota) return null;
  return (valorReceitaSalao * cobrado) / (cobrado - cota);
}
