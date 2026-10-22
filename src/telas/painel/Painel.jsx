/* Aba Painel (carregada sob demanda, Bloco 21): resultado do negócio,
   ponto de equilíbrio, indicadores e memorial de cálculo. */
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  Info,
  LayoutDashboard,
  Pencil,
  Printer,
  Share2,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { excluirComFallback, lerComFallback, listarComFallback, salvarComFallback } from "../../armazenamento.js";
import {
  calcularIndicadoresGerenciais,
  calcularParaExibicao,
  comissaoEfetiva,
  equivalenteEmValorCobrado,
  fmtBRL,
  fmtPct,
  linhasPlanilhaObservatorio,
  montarDRE,
  N,
  pontoEquilibrioSemanal,
  taxaEfetiva,
} from "../../calculos.js";
import { CaixaSemaforo, Girando, SkeletonCard, useAcaoComProgresso, useToast } from "../../componentes/base.jsx";
import { FaqLinkContext, useBalaoAncorado } from "../../componentes/campos.jsx";
import { GraficoRoscaPreco } from "../../componentes/GraficoRoscaPreco.jsx";
import { anexarAbasObservatorio, carregarXLSX, lerDadosObservatorio } from "../../planilhas.js";
import { useT } from "../../tema.js";
import { DRECard } from "./DRECard.jsx";
import { EvolucaoComparativos } from "./Evolucao.jsx";
import { FechamentoMensal } from "./FechamentoMensal.jsx";
import { MESES } from "./meses.js";
import { ProjecaoCaixa } from "./ProjecaoCaixa.jsx";

/* ======================================================================= */
/* Aba: Painel                                                             */
/* ======================================================================= */
export default function Painel({ nd, negocio, servicos, onRemoverServico, onEditarServico }) {
  const t = useT();
  const [sazonalidade, setSazonalidade] = useState(Array(12).fill(100));
  const [fechamentos, setFechamentos] = useState(null);
  const { show, node: toastNode } = useToast();

  // window.print() chamado direto e de forma SÍNCRONA dentro do clique — não
  // atrás de um setTimeout/estado. Isso importa de verdade: vários navegadores
  // (principalmente mobile) só permitem abrir a caixa de impressão quando a
  // chamada acontece na MESMA pilha de execução do clique do usuário; um
  // setTimeout no meio quebra esse vínculo e o navegador ignora a chamada
  // sem avisar nada — exatamente o "não acontece nada" relatado.
  const exportarMemorial = () => {
    document.body.classList.add("imprimindo-memorial");
    window.print();
    const limpar = () => {
      document.body.classList.remove("imprimindo-memorial");
      window.removeEventListener("afterprint", limpar);
    };
    window.addEventListener("afterprint", limpar);
    setTimeout(limpar, 4000); // reforço: alguns navegadores mobile não disparam "afterprint" de jeito nenhum
  };

  const carregar = useCallback(async () => {
    const valor = await lerComFallback("painel:sazonalidade");
    if (valor) {
      try {
        setSazonalidade(JSON.parse(valor));
      } catch {}
    }
  }, []);
  useEffect(() => {
    carregar();
  }, [carregar]);

  const carregarFechamentos = useCallback(async () => {
    try {
      const chaves = await listarComFallback("fechamento:");
      const resultados = await Promise.all(
        chaves.map(async (k) => {
          const valor = await lerComFallback(k);
          try {
            return valor ? JSON.parse(valor) : null;
          } catch {
            return null;
          }
        }),
      );
      setFechamentos(resultados.filter(Boolean).sort((a, b) => b.mes.localeCompare(a.mes)));
    } catch {
      setFechamentos([]);
    }
  }, []);
  useEffect(() => {
    carregarFechamentos();
  }, [carregarFechamentos]);

  // Única fonte de verdade dos fechamentos no Painel — FechamentoMensal e
  // EvolucaoComparativos recebem por prop em vez de buscar cada um pra si. Antes disso,
  // cada componente carregava sua própria cópia isolada: salvar um fechamento (ou os de
  // exemplo) atualizava a lista de um, mas o outro só saberia na próxima vez que fosse
  // desmontado/remontado — na prática nunca, e o gráfico continuava dizendo "sem dado
  // suficiente" mesmo depois de gerar os exemplos. Com estado único, os dois enxergam a
  // mesma lista sempre, e uma mudança aparece nos dois ao mesmo tempo.
  const salvarFechamento = (registro) => {
    salvarComFallback(`fechamento:${registro.mes}`, JSON.stringify(registro));
    setFechamentos((prev) => [...(prev || []).filter((f) => f.mes !== registro.mes), registro].sort((a, b) => b.mes.localeCompare(a.mes)));
  };
  const removerFechamento = (mes) => {
    excluirComFallback(`fechamento:${mes}`);
    setFechamentos((prev) => (prev || []).filter((f) => f.mes !== mes));
  };
  const salvarFechamentosEmLote = (registros) => {
    registros.forEach((f) => {
      salvarComFallback(`fechamento:${f.mes}`, JSON.stringify(f));
    });
    setFechamentos((prev) => [...(prev || []), ...registros].sort((a, b) => b.mes.localeCompare(a.mes)));
  };

  const remover = (id) => {
    onRemoverServico(id);
    show("Serviço removido");
  };
  const salvarSazonalidade = (novo) => {
    setSazonalidade(novo);
    salvarComFallback("painel:sazonalidade", JSON.stringify(novo));
  };

  const cardStyle = { background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow };

  // Corrigido nesta revisão: este useMemo estava depois dos dois "return" condicionais
  // abaixo (servicos===null e servicos.length===0) — bug pré-existente (não introduzido
  // nesta sessão), pego agora com eslint-plugin-react-hooks. Na prática dispara assim que
  // alguém salva o primeiro serviço: o componente pula de "não chamou o hook" pra "chamou",
  // e o React acusa "Rendered more hooks than during the previous render". Hooks sempre
  // antes de qualquer return condicional — por isso subiu pra cá, com fallback pra [].
  const servicosCalc = useMemo(() => (servicos || []).map((s) => ({ ...s, calc: calcularParaExibicao(s, nd) })), [servicos, nd]);
  // Bloco 18: o hook do botão "Baixar Excel" também precisa vir antes dos returns
  // condicionais; a planilha em si é montada mais abaixo (gerarExcelRef).
  const gerarExcelRef = useRef(null);
  const [exportarExcel, gerandoExcel] = useAcaoComProgresso(() => gerarExcelRef.current?.());

  if (servicos === null)
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );

  if (servicos.length === 0) {
    return (
      <div className="rounded-2xl p-10 text-center" style={{ background: t.surfaceAlt, border: `1px dashed ${t.border}` }}>
        <LayoutDashboard size={22} className="mx-auto mb-3" style={{ color: t.textMuted }} />
        <p className="text-sm font-medium" style={{ color: t.text }}>
          Nenhum serviço salvo ainda
        </p>
        <p className="text-xs mt-1" style={{ color: t.textMuted }}>
          Calcule o preço de um serviço na aba Calculadora e clique em "Salvar" para o painel ganhar vida.
        </p>
      </div>
    );
  }

  const servicosValidos = servicosCalc.filter((s) => s.calc.status === "ok");
  const dre = montarDRE(servicosCalc, nd);
  const margemMedia =
    servicosValidos.length > 0
      ? servicosValidos.reduce((s, x) => s + (x.modo === "ja-tenho" ? N(x.calc.margemLiquidaPct) : N(x.margemPct)), 0) /
        servicosValidos.length
      : null;
  const servicosEmPrejuizo = servicosValidos.filter((s) => s.calc.diagnostico === "prejuizo");

  const {
    margemContribuicaoPonderada,
    pontoEquilibrioMix,
    custoOportunidadeMes,
    peContabilRS,
    peFinanceiroRS,
    peEconomicoRS,
    margemSeguranca,
    gao,
  } = calcularIndicadoresGerenciais(servicosValidos, dre, nd, negocio);

  const chartData = servicosCalc
    .filter((s) => s.calc.status === "ok")
    .map((s) => ({ name: s.nome, Preço: Math.round(s.calc.preco), Margem: Math.round(s.calc.margemContribuicaoUnitaria) }));

  gerarExcelRef.current = async () => {
    const XLSX = await carregarXLSX();
    const wb = XLSX.utils.book_new();
    const wsDRE = XLSX.utils.aoa_to_sheet([
      ["DRE gerencial do mês (recalculado com as configurações atuais)", ""],
      ...(dre.cotaParteParceiros > 0
        ? [
            ["Valor cobrado dos clientes", dre.valorCobrado],
            ["(-) Cota-parte repassada aos parceiros", -dre.cotaParteParceiros],
          ]
        : []),
      [dre.cotaParteParceiros > 0 ? "= Receita bruta do salão" : "Receita bruta", dre.receitaBruta],
      ["(-) Impostos sobre vendas", -dre.impostos],
      ["= Receita líquida", dre.receitaLiquida],
      ["(-) Custos variáveis totais", -dre.custosVariaveisTotais],
      ["= Margem de contribuição", dre.margemContribuicaoTotal],
      ["(-) Custos fixos (incl. pró-labore)", -dre.custosFixos],
      ...(dre.aluguelRecebido > 0 ? [["(+) Aluguel de cadeiras recebido", dre.aluguelRecebido]] : []),
      ["= Resultado operacional", dre.resultadoOperacional],
    ]);
    XLSX.utils.book_append_sheet(wb, wsDRE, "DRE Gerencial");

    const wsInd = XLSX.utils.aoa_to_sheet([
      ["Indicador", "Valor"],
      [
        dre.cotaParteParceiros > 0 ? "Ponto de equilíbrio contábil, em receita do salão (R$)" : "Ponto de equilíbrio contábil (R$)",
        Number.isFinite(peContabilRS) ? peContabilRS : null,
      ],
      ...(equivalenteEmValorCobrado(peContabilRS, dre) !== null
        ? [["Ponto de equilíbrio contábil, em valor cobrado dos clientes (R$)", equivalenteEmValorCobrado(peContabilRS, dre)]]
        : []),
      ["Ponto de equilíbrio financeiro (R$)", Number.isFinite(peFinanceiroRS) ? peFinanceiroRS : null],
      ["Ponto de equilíbrio econômico (R$)", Number.isFinite(peEconomicoRS) ? peEconomicoRS : null],
      ["Margem de segurança (%)", margemSeguranca],
      ["Grau de alavancagem operacional (x)", gao],
      ["Alíquota de imposto efetiva aplicada (%)", nd.impostoPct],
      ["Custo fixo total do negócio (R$/mês)", nd.custoFixoTotal],
      ["Aluguel de cadeiras recebido (R$/mês)", nd.receitaAluguelCadeiras],
      ["Custo fixo a cobrir pelos serviços (R$/mês)", nd.custoFixoLiquido],
      ["Custo fixo por hora (R$)", nd.custoFixoPorHora],
      ["Capacidade produtiva (horas/mês)", nd.horasTotais],
      ["Número de profissionais", nd.numeroProfissionais],
    ]);
    XLSX.utils.book_append_sheet(wb, wsInd, "Indicadores");

    const wsServ = XLSX.utils.aoa_to_sheet([
      [
        "Serviço",
        "Preço (R$)",
        "Custo variável (R$)",
        "Comissão (%)",
        "Taxa cartão (%)",
        "Imposto (%)",
        "Margem desejada (%)",
        "Horas/atend.",
        "Atendimentos/mês",
        "Margem contrib. unit. (R$)",
        "Lucro projetado/mês (R$)",
        "Status",
      ],
      ...servicosCalc.map((s) =>
        s.calc.status === "ok"
          ? [
              s.nome,
              s.calc.preco,
              s.calc.totalVariaveis,
              comissaoEfetiva(s, nd),
              taxaEfetiva(s, nd),
              nd.impostoPct,
              s.margemPct,
              s.horasPorAtendimento,
              s.atendimentosMes,
              s.calc.margemContribuicaoUnitaria,
              s.calc.lucroProjetadoMes,
              "ok",
            ]
          : [
              s.nome,
              null,
              null,
              comissaoEfetiva(s, nd),
              taxaEfetiva(s, nd),
              nd.impostoPct,
              s.margemPct,
              s.horasPorAtendimento,
              s.atendimentosMes,
              null,
              null,
              "inválido com a config. atual — revisar na Calculadora",
            ],
      ),
    ]);
    XLSX.utils.book_append_sheet(wb, wsServ, "Serviços");

    const variavelProp = dre.receitaBruta > 0 ? dre.custosVariaveisTotais / dre.receitaBruta : 0;
    const impostoProp = dre.receitaBruta > 0 ? dre.impostos / dre.receitaBruta : 0;
    const wsFluxo = XLSX.utils.aoa_to_sheet([
      ["Mês", "Sazonalidade (%)", "Receita projetada (R$)", "Resultado projetado (R$)"],
      ...MESES.map((mes, i) => {
        const mult = N(sazonalidade[i]) / 100;
        const receita = dre.receitaBruta * mult;
        const resultado = receita - receita * impostoProp - receita * variavelProp - dre.custosFixos + dre.aluguelRecebido;
        return [mes, N(sazonalidade[i]), Math.round(receita), Math.round(resultado)];
      }),
    ]);
    XLSX.utils.book_append_sheet(wb, wsFluxo, "Fluxo de Caixa 12m");

    // Bloco 10: concorrentes e preços anotados no Observatório, quando houver.
    const obs = await lerDadosObservatorio();
    if (obs.concorrentes.length > 0) {
      anexarAbasObservatorio(XLSX, wb, linhasPlanilhaObservatorio(obs.concorrentes, obs.meusLocais, servicosCalc, nd));
    }

    XLSX.writeFile(wb, `preco-justo-relatorio-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const compartilharResumo = async () => {
    const texto = [
      "📊 Preço Justo — Resumo do negócio",
      "",
      ...(dre.cotaParteParceiros > 0
        ? [`Valor cobrado dos clientes: ${fmtBRL(dre.valorCobrado)}`, `Cota-parte dos parceiros: ${fmtBRL(dre.cotaParteParceiros)}`]
        : []),
      `Receita bruta${dre.cotaParteParceiros > 0 ? " do salão" : ""}: ${fmtBRL(dre.receitaBruta)}`,
      `Custos variáveis: ${fmtBRL(dre.custosVariaveisTotais)}`,
      `Custos fixos: ${fmtBRL(dre.custosFixos)}`,
      ...(dre.aluguelRecebido > 0 ? [`Aluguel de cadeiras recebido: ${fmtBRL(dre.aluguelRecebido)}`] : []),
      `Resultado operacional: ${fmtBRL(dre.resultadoOperacional)}`,
      "",
      "Gerado no app Preço Justo.",
    ].join("\n");
    if (navigator.share) {
      try {
        await navigator.share({ title: "Preço Justo — Resumo do negócio", text: texto });
      } catch {
        /* usuário cancelou o compartilhamento — não faz nada */
      }
    } else {
      try {
        await navigator.clipboard.writeText(texto);
        show("Resumo copiado — cole onde quiser (WhatsApp, e-mail...)");
      } catch {
        show("Não consegui copiar automaticamente neste navegador");
      }
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 no-print">
        <p className="text-xs" style={{ color: t.textMuted }}>
          Exportar este painel
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportarExcel}
            disabled={gerandoExcel}
            aria-busy={gerandoExcel}
            className="btn-press inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
            style={{ background: t.success, color: t.onSuccess, opacity: gerandoExcel ? 0.85 : 1 }}
          >
            {gerandoExcel ? <Girando /> : <Download size={13} />} {gerandoExcel ? "Gerando planilha…" : "Baixar Excel"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-press inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
            style={{ background: t.surfaceAlt, color: t.text, border: `1px solid ${t.border}` }}
          >
            <Printer size={13} /> Imprimir / PDF
          </button>
          <button
            type="button"
            onClick={compartilharResumo}
            className="btn-press touch-target inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
            style={{ background: t.surfaceAlt, color: t.text, border: `1px solid ${t.border}` }}
            aria-label="Compartilhar resumo"
          >
            <Share2 size={13} /> Compartilhar
          </button>
          <button
            type="button"
            onClick={exportarMemorial}
            className="btn-press touch-target inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
            style={{ background: t.surfaceAlt, color: t.text, border: `1px solid ${t.border}` }}
          >
            <Printer size={13} /> Memorial de cálculo (PDF)
          </button>
        </div>
      </div>

      <div id="memorial-calculo-wrapper" style={{ display: "none" }}>
        <MemorialCalculo
          negocio={negocio}
          nd={nd}
          dre={dre}
          peContabilRS={peContabilRS}
          peFinanceiroRS={peFinanceiroRS}
          peEconomicoRS={peEconomicoRS}
          custoOportunidadeMes={custoOportunidadeMes}
          margemSeguranca={margemSeguranca}
          gao={gao}
          pontoEquilibrioMix={pontoEquilibrioMix}
          margemContribuicaoPonderada={margemContribuicaoPonderada}
        />
      </div>

      <div className="conteudo-normal-painel">
        {/* space-y-3: os cards desta área ficavam colados uns nos outros (sem espaço   */}
        {/* vertical), o mesmo gap-3 que as grades de indicadores já usam entre colunas. */}
        <div id="area-impressao" className="space-y-3">
          <p className="text-[11px]" style={{ color: t.textMuted }}>
            Recalculado com as configurações atuais do Negócio — mude um custo fixo ou o regime tributário e tudo aqui se atualiza sozinho.
          </p>
          <DRECard dre={dre} />

          {dre.qtdInvalidos > 0 && (
            <div className="pop-in flex gap-2 items-start rounded-xl p-3 text-sm" style={{ background: t.dangerSoft, color: t.danger }}>
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>
                {dre.qtdInvalidos} serviço{dre.qtdInvalidos > 1 ? "s" : ""} ficou{dre.qtdInvalidos > 1 ? "ram" : ""} matematicamente
                inválido{dre.qtdInvalidos > 1 ? "s" : ""} com a configuração atual — está{dre.qtdInvalidos > 1 ? "ão" : ""} fora do DRE até
                você editar e recalcular.
              </span>
            </div>
          )}

          <EscadaPontoEquilibrio
            receita={dre.receitaBruta}
            cobrado={{ valorCobrado: dre.valorCobrado, cotaParteParceiros: dre.cotaParteParceiros }}
            rcm={dre.rcm}
            financeiro={peFinanceiroRS}
            contabil={peContabilRS}
            economico={peEconomicoRS}
            capitalInvestido={N(negocio.capitalInvestido)}
            taxaRetorno={N(negocio.taxaRetorno)}
            custoNaoCaixa={nd.custoFixoNaoCaixa}
            margemSeguranca={margemSeguranca}
          />

          <div className="grid sm:grid-cols-2 gap-3">
            <IndicadorCard titulo="Ponto de Equilíbrio Ponderado (Mix de Serviços)" icon={TrendingUp}>
              {servicosValidos.length === 0 || margemContribuicaoPonderada <= 0 ? (
                <p className="text-xs" style={{ color: t.textMuted }}>
                  —
                </p>
              ) : (
                <>
                  <p className="font-num text-2xl font-bold" style={{ color: t.text }}>
                    {Number.isFinite(pontoEquilibrioMix) ? Math.ceil(pontoEquilibrioMix) : "—"}
                    <span className="text-xs font-medium" style={{ color: t.textMuted }}>
                      {" "}
                      atendimentos/mês
                    </span>
                  </p>
                  <div className="mt-2 rounded-lg p-2" style={{ background: t.primarySoft }}>
                    <p className="text-[10px]" style={{ color: t.primaryText }}>
                      MCP — Margem de Contribuição Ponderada
                    </p>
                    <p className="font-num text-sm font-bold" style={{ color: t.primaryText }}>
                      {fmtBRL(margemContribuicaoPonderada)} <span className="text-[10px] font-normal">/ atendimento</span>
                    </p>
                  </div>
                  <p className="text-[11px] mt-2" style={{ color: t.textMuted }}>
                    soma de todos os serviços, na proporção real de atendimentos/mês entre eles
                  </p>
                </>
              )}
              <p className="text-[10px] mt-2" style={{ color: t.textMuted }}>
                <b>Método:</b> cada serviço pesa no mix conforme sua fatia de atendimentos/mês; a MCP é a soma (peso × margem de
                contribuição unitária) de cada um. Ponto de equilíbrio = custo fixo total ÷ MCP. (Padoveze, Contabilidade Gerencial.)
              </p>
            </IndicadorCard>
            <IndicadorCard
              titulo="Alavancagem operacional (GAO)"
              icon={TrendingDown}
              info={{
                texto:
                  "Mostra o quanto o resultado do negócio varia, em %, pra cada 1% de variação na receita — custo fixo alto costuma deixar o GAO mais alto (mais sensível a oscilar as vendas).",
                referencia: "Perez Jr., Oliveira e Costa, Gestão Estratégica de Custos",
              }}
            >
              {gao === null ? (
                <p className="text-xs" style={{ color: t.textMuted }}>
                  Operando abaixo do ponto de equilíbrio.
                </p>
              ) : (
                <>
                  <p className="font-num text-2xl font-bold" style={{ color: t.text }}>
                    {gao.toFixed(2)}x
                  </p>
                  <p className="text-xs mt-1" style={{ color: t.textMuted }}>
                    cada 1% de variação na receita muda o resultado em ~{gao.toFixed(1)}%
                  </p>
                </>
              )}
            </IndicadorCard>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <IndicadorCard titulo="Margem média entre serviços" icon={TrendingUp}>
              {margemMedia === null ? (
                <p className="text-xs" style={{ color: t.textMuted }}>
                  —
                </p>
              ) : (
                <>
                  <p className="font-num text-2xl font-bold" style={{ color: t.text }}>
                    {fmtPct(margemMedia)}
                  </p>
                  <p className="text-xs mt-1" style={{ color: t.textMuted }}>
                    média simples entre os {servicosValidos.length} serviços válidos
                  </p>
                </>
              )}
            </IndicadorCard>
            <IndicadorCard titulo="Serviços em prejuízo" icon={AlertTriangle}>
              <p className="font-num text-2xl font-bold" style={{ color: servicosEmPrejuizo.length > 0 ? t.danger : t.successText }}>
                {servicosEmPrejuizo.length}
              </p>
              {servicosEmPrejuizo.length > 0 ? (
                <p className="text-xs mt-1" style={{ color: t.textMuted }}>
                  {servicosEmPrejuizo.map((s) => s.nome).join(", ")}
                </p>
              ) : (
                <p className="text-xs mt-1" style={{ color: t.textMuted }}>
                  nenhum serviço "Já tenho um preço" abaixo do custo
                </p>
              )}
            </IndicadorCard>
          </div>

          <ProjecaoCaixa dre={dre} sazonalidade={sazonalidade} onChange={salvarSazonalidade} fechamentos={fechamentos} />
          <div className="mt-4">
            <FechamentoMensal
              nd={nd}
              servicos={servicos}
              fechamentos={fechamentos}
              onSalvar={salvarFechamento}
              onRemover={removerFechamento}
              onCarregarExemplos={salvarFechamentosEmLote}
              profissionais={negocio.profissionais}
            />
          </div>
          <div className="mt-4">
            <EvolucaoComparativos
              nd={nd}
              servicos={servicos}
              fechamentos={fechamentos}
              sazonalidade={sazonalidade}
              pontoEquilibrio={peContabilRS}
            />
          </div>
        </div>

        <div className="rounded-2xl p-5 no-print" style={cardStyle}>
          <p className="text-sm font-semibold mb-3" style={{ color: t.text }}>
            Comparativo entre serviços
          </p>
          <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 46)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 11, fill: t.textMuted }} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: t.textMuted }} />
              <Tooltip
                formatter={(v) => fmtBRL(v)}
                contentStyle={{ fontSize: 12, borderRadius: 8, background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Preço" fill={t.secondary} radius={[0, 4, 4, 0]} />
              <Bar dataKey="Margem" fill={t.success} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 no-print">
          {servicosCalc.map((s) => (
            <CardServicoPainel key={s.id} s={s} onEditar={onEditarServico} onExcluir={remover} diasMesNegocio={nd.diasMes} />
          ))}
        </div>
      </div>
      <div className="no-print">{toastNode}</div>
    </div>
  );
}

function CardServicoPainel({ s, onEditar, onExcluir, diasMesNegocio }) {
  const t = useT();
  const [expandido, setExpandido] = useState(false);
  const ok = s.calc.status === "ok";
  const baseline = s.precoConfirmado ?? (ok ? s.calc.preco : null);
  const desatualizado = ok && baseline !== null && Math.abs(s.calc.preco - baseline) > 0.005;
  const lucroReal = ok ? (s.modo === "ja-tenho" ? s.calc.lucroLiquido : s.calc.valorMargem) : 0;

  return (
    <div
      className="fade-up rounded-2xl overflow-hidden"
      style={{ background: t.surface, border: `1px solid ${ok ? t.border : t.danger}`, boxShadow: t.shadow }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-sm" style={{ color: t.text }}>
              {s.nome}
            </p>
            {s.categoria && (
              <span
                className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
                style={{ background: t.surfaceAlt, color: t.textMuted }}
              >
                {s.categoria}
              </span>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onEditar(s)}
              className="btn-press touch-target-48"
              style={{ color: t.primaryText }}
              aria-label={`Editar ${s.nome}`}
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={() => onExcluir(s.id)}
              className="btn-press touch-target-48"
              style={{ color: t.danger }}
              aria-label={`Excluir ${s.nome}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        {ok ? (
          <>
            <p className="font-num text-xl mt-1 font-bold" style={{ color: t.text }}>
              {fmtBRL(s.calc.preco)}
            </p>
            <div className="flex flex-wrap gap-2 mt-2 text-xs" style={{ color: t.textMuted }}>
              <span>margem: {fmtBRL(s.calc.margemContribuicaoUnitaria)}</span>
              <span>·</span>
              <span>{s.atendimentosMes} atend./mês</span>
            </div>
            {Number.isFinite(s.calc.pontoEquilibrioServico) && (
              <p className="text-[11px] mt-1" style={{ color: t.primaryText }}>
                equilíbrio: {Math.ceil(s.calc.pontoEquilibrioServico)}/mês ·{" "}
                {Math.ceil(pontoEquilibrioSemanal(s.calc.pontoEquilibrioServico, diasMesNegocio))}/semana
              </p>
            )}
          </>
        ) : (
          <p className="text-xs mt-1.5" style={{ color: t.danger }}>
            Inválido com a config. atual — toque em editar para recalcular.
          </p>
        )}
        {desatualizado && (
          <p className="text-[11px] mt-2 rounded-lg p-1.5" style={{ background: t.warningSoft, color: t.warningText }}>
            Preço mudou de {fmtBRL(baseline)} para {fmtBRL(s.calc.preco)} desde a última vez que foi salvo.
          </p>
        )}
        {ok && (
          <button
            type="button"
            onClick={() => setExpandido((v) => !v)}
            className="btn-press touch-target mt-2.5 inline-flex items-center gap-1 text-xs font-medium"
            style={{ color: t.primaryText }}
            aria-expanded={expandido}
          >
            {expandido ? "ocultar decomposição" : "ver decomposição do preço"}
            <ChevronDown size={13} style={{ transform: expandido ? "rotate(180deg)" : "none", transition: "transform .2s ease" }} />
          </button>
        )}
      </div>

      {expandido && ok && (
        <div className="px-4 pb-4 pop-in" style={{ borderTop: `1px solid ${t.border}` }}>
          <p className="text-xs font-semibold mt-3 mb-2" style={{ color: t.text }}>
            Decomposição do preço
          </p>
          <GraficoRoscaPreco
            materiais={s.calc.totalVariaveis}
            custoFixo={s.calc.custoFixoRateado}
            taxas={s.calc.valorComissao + s.calc.valorTaxaCartao + s.calc.valorImposto}
            lucro={lucroReal}
            preco={s.calc.preco}
          />
          <button
            type="button"
            onClick={() => onEditar(s)}
            className="btn-press touch-target w-full mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold"
            style={{ background: t.primaryText, color: t.onPrimary }}
          >
            <Pencil size={14} /> Editar serviço
          </button>
        </div>
      )}
    </div>
  );
}

/* Memorial de cálculo — documento de impressão separado, com cores fixas    */
/* (não os tokens de tema: se alguém imprimir no modo escuro, texto claro    */
/* sobre o fundo branco forçado da impressão ficaria ilegível). Mostra       */
/* fórmula + substituição numérica + resultado de cada indicador, não só o   */
/* resultado final — é isso que faz ser "memorial", não só um resumo.        */
const COR_MEMORIAL = { texto: "#0F172A", mudo: "#5B6472", borda: "#D8DEE8", fundoAlt: "#F5F7FA" };

function LinhaFormula({ nome, formula, substituicao, resultado }) {
  const c = COR_MEMORIAL;
  return (
    <div style={{ padding: "10px 0", borderBottom: `1px solid ${c.borda}` }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: c.texto, margin: 0 }}>{nome}</p>
      <p style={{ fontSize: 11, color: c.mudo, margin: "3px 0 0", fontStyle: "italic" }}>{formula}</p>
      <p style={{ fontSize: 11, color: c.mudo, margin: "2px 0 0", fontFamily: "monospace" }}>{substituicao}</p>
      <p style={{ fontSize: 13, fontWeight: 700, color: c.texto, margin: "4px 0 0" }}>= {resultado}</p>
    </div>
  );
}

function MemorialCalculo({
  negocio,
  nd,
  dre,
  peContabilRS,
  peFinanceiroRS,
  peEconomicoRS,
  custoOportunidadeMes,
  margemSeguranca,
  gao,
  pontoEquilibrioMix,
  margemContribuicaoPonderada,
}) {
  const c = COR_MEMORIAL;
  const agora = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const rcmPct = fmtPct(dre.rcm * 100, 2);
  // Com aluguel de cadeiras recebido, a base dos pontos de equilíbrio é o custo
  // fixo líquido desse aluguel; a fórmula e a substituição deixam isso visível.
  const temAluguel = dre.aluguelRecebido > 0;
  const nomeBaseCF = temAluguel ? "(Custos Fixos − Aluguel de Cadeiras Recebido)" : "Custos Fixos";
  const valorBaseCF = temAluguel ? `(${fmtBRL(dre.custosFixos)} − ${fmtBRL(dre.aluguelRecebido)})` : fmtBRL(dre.custosFixos);

  return (
    <div id="memorial-calculo" style={{ background: "#fff", color: c.texto, padding: 16, fontFamily: "'Poppins', sans-serif" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Memorial de Cálculo</p>
        <p style={{ fontSize: 12, color: c.mudo, margin: "2px 0 0" }}>Preço Justo — gerado em {agora}</p>
      </div>

      <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px", borderBottom: `2px solid ${c.texto}`, paddingBottom: 4 }}>
        1. Dados de entrada do negócio
      </p>
      <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", marginBottom: 16 }}>
        <tbody>
          <tr>
            <td style={{ padding: "3px 0", color: c.mudo }}>Custos fixos mensais</td>
            <td style={{ padding: "3px 0", textAlign: "right", fontWeight: 600 }}>
              {negocio.custosFixos
                .filter((cf) => N(cf.valor) > 0)
                .map((cf) => `${cf.nome}: ${fmtBRL(N(cf.valor))}`)
                .join(" · ") || "—"}
            </td>
          </tr>
          <tr>
            <td style={{ padding: "3px 0", color: c.mudo }}>Pró-labore</td>
            <td style={{ padding: "3px 0", textAlign: "right", fontWeight: 600 }}>{fmtBRL(nd.proLabore)}</td>
          </tr>
          <tr>
            <td style={{ padding: "3px 0", color: c.mudo }}>Custo fixo total/mês</td>
            <td style={{ padding: "3px 0", textAlign: "right", fontWeight: 600 }}>{fmtBRL(nd.custoFixoTotal)}</td>
          </tr>
          {nd.receitaAluguelCadeiras > 0 && (
            <tr>
              <td style={{ padding: "3px 0", color: c.mudo }}>Aluguel de cadeiras recebido/mês</td>
              <td style={{ padding: "3px 0", textAlign: "right", fontWeight: 600 }}>{fmtBRL(nd.receitaAluguelCadeiras)}</td>
            </tr>
          )}
          <tr>
            <td style={{ padding: "3px 0", color: c.mudo }}>Capacidade produtiva</td>
            <td style={{ padding: "3px 0", textAlign: "right", fontWeight: 600 }}>
              {nd.numeroProfissionais} profissional(is) × {negocio.horasDia}h × {negocio.diasMes} dias = {nd.horasTotais}h/mês
            </td>
          </tr>
          <tr>
            <td style={{ padding: "3px 0", color: c.mudo }}>Regime tributário</td>
            <td style={{ padding: "3px 0", textAlign: "right", fontWeight: 600 }}>
              {negocio.regime === "simples"
                ? `Simples Nacional, Anexo ${nd.anexoUsado} (alíq. efetiva ${fmtPct(nd.impostoPct, 2)})`
                : negocio.regime === "mei"
                  ? "MEI"
                  : "Não definido"}
            </td>
          </tr>
          <tr>
            <td style={{ padding: "3px 0", color: c.mudo }}>Capital investido / retorno alternativo</td>
            <td style={{ padding: "3px 0", textAlign: "right", fontWeight: 600 }}>
              {fmtBRL(N(negocio.capitalInvestido))} a {fmtPct(N(negocio.taxaRetorno))}/mês
            </td>
          </tr>
        </tbody>
      </table>

      <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px", borderBottom: `2px solid ${c.texto}`, paddingBottom: 4 }}>
        2. Indicadores — fórmula, substituição e resultado
      </p>

      {/* Com aluguel de cadeiras recebido, a base dos pontos de equilíbrio é o custo   */}
      {/* fixo líquido desse aluguel — a fórmula e a substituição mostram isso.          */}
      <LinhaFormula
        nome="Razão de Contribuição Margem (RCM)"
        formula="RCM = Margem de Contribuição Total ÷ Receita Bruta"
        substituicao={`${fmtBRL(dre.margemContribuicaoTotal)} ÷ ${fmtBRL(dre.receitaBruta)}`}
        resultado={rcmPct}
      />

      <LinhaFormula
        nome="Ponto de Equilíbrio Contábil"
        formula={`PE Contábil = ${nomeBaseCF} ÷ RCM`}
        substituicao={`${valorBaseCF} ÷ ${rcmPct}`}
        resultado={fmtBRL(peContabilRS)}
      />

      {equivalenteEmValorCobrado(peContabilRS, dre) !== null && (
        <LinhaFormula
          nome="Ponto de Equilíbrio Contábil em valor cobrado dos clientes (com parceiros)"
          formula="PE em valor cobrado = PE Contábil × Valor Cobrado ÷ (Valor Cobrado − Cota-parte dos Parceiros)"
          substituicao={`${fmtBRL(peContabilRS)} × ${fmtBRL(dre.valorCobrado)} ÷ (${fmtBRL(dre.valorCobrado)} − ${fmtBRL(dre.cotaParteParceiros)})`}
          resultado={fmtBRL(equivalenteEmValorCobrado(peContabilRS, dre))}
        />
      )}

      <LinhaFormula
        nome="Ponto de Equilíbrio Financeiro"
        formula={`PE Financeiro = (${nomeBaseCF} − Itens sem Saída de Caixa) ÷ RCM`}
        substituicao={`(${valorBaseCF} − ${fmtBRL(nd.custoFixoNaoCaixa)}) ÷ ${rcmPct}`}
        resultado={fmtBRL(peFinanceiroRS)}
      />

      <LinhaFormula
        nome="Ponto de Equilíbrio Econômico"
        formula={`PE Econômico = (${nomeBaseCF} + Custo de Oportunidade do Capital) ÷ RCM`}
        substituicao={`(${valorBaseCF} + ${fmtBRL(custoOportunidadeMes)}) ÷ ${rcmPct}`}
        resultado={fmtBRL(peEconomicoRS)}
      />

      <LinhaFormula
        nome="Margem de Segurança"
        formula="MS = (Receita Bruta − PE Contábil) ÷ Receita Bruta"
        substituicao={`(${fmtBRL(dre.receitaBruta)} − ${fmtBRL(peContabilRS)}) ÷ ${fmtBRL(dre.receitaBruta)}`}
        resultado={margemSeguranca === null ? "—" : fmtPct(margemSeguranca)}
      />

      <LinhaFormula
        nome="Grau de Alavancagem Operacional (GAO)"
        formula="GAO = Margem de Contribuição Total ÷ Resultado Operacional"
        substituicao={`${fmtBRL(dre.margemContribuicaoTotal)} ÷ ${fmtBRL(dre.resultadoOperacional)}`}
        resultado={gao === null ? "— (operando abaixo do equilíbrio)" : `${gao.toFixed(2)}×`}
      />

      <LinhaFormula
        nome="Ponto de Equilíbrio Ponderado (Mix de Serviços)"
        formula={`PE Mix = ${nomeBaseCF} ÷ MCP, onde MCP = Σ(peso do serviço × margem de contribuição unitária)`}
        substituicao={`${valorBaseCF} ÷ ${fmtBRL(margemContribuicaoPonderada)}/atend.`}
        resultado={Number.isFinite(pontoEquilibrioMix) ? `${Math.ceil(pontoEquilibrioMix)} atendimentos/mês` : "—"}
      />

      <p style={{ fontSize: 13, fontWeight: 700, margin: "16px 0 8px", borderBottom: `2px solid ${c.texto}`, paddingBottom: 4 }}>
        3. DRE Gerencial do Mês
      </p>
      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
        <tbody>
          {[
            ...(dre.cotaParteParceiros > 0
              ? [
                  ["Valor cobrado dos clientes", dre.valorCobrado, false],
                  ["(–) Cota-parte repassada aos parceiros", -dre.cotaParteParceiros, false],
                ]
              : []),
            [dre.cotaParteParceiros > 0 ? "= Receita bruta do salão" : "Receita bruta", dre.receitaBruta, true],
            ["(–) Impostos sobre vendas", -dre.impostos, false],
            ["= Receita líquida", dre.receitaLiquida, true],
            ["(–) Custos variáveis totais", -dre.custosVariaveisTotais, false],
            ["= Margem de contribuição", dre.margemContribuicaoTotal, true],
            ["(–) Custos fixos (incl. pró-labore)", -dre.custosFixos, false],
            ...(dre.aluguelRecebido > 0 ? [["(+) Aluguel de cadeiras recebido", dre.aluguelRecebido, false]] : []),
            ["= Resultado operacional", dre.resultadoOperacional, true],
          ].map(([label, valor, forte]) => (
            <tr key={label} style={{ borderTop: forte ? `1px solid ${c.borda}` : "none" }}>
              <td style={{ padding: "4px 0", fontWeight: forte ? 700 : 400 }}>{label}</td>
              <td style={{ padding: "4px 0", textAlign: "right", fontWeight: forte ? 700 : 400 }}>{fmtBRL(valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ fontSize: 9, color: c.mudo, marginTop: 24, textAlign: "center" }}>
        Documento gerado automaticamente pelo Preço Justo a partir dos dados informados pelo usuário — não constitui parecer contábil ou
        fiscal.
      </p>
    </div>
  );
}

/* Ícone "i" — explicação conceitual com referência acadêmica, diferente do   */
/* "?" de ajuda de preenchimento: aqui é "o que esse indicador SIGNIFICA",    */
/* não "o que eu preencho aqui". Toque abre, toque de novo fecha (mobile).    */
function InfoConceito({ texto, referencia }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const botaoRef = useRef(null);
  const balaoRef = useRef(null);
  const posicaoBalao = useBalaoAncorado({ aberto, setAberto, botaoRef, balaoRef, largura: 230, preferencia: "abaixo" });
  return (
    <span className="relative inline-block" style={{ marginLeft: 4, verticalAlign: "middle" }}>
      <button
        ref={botaoRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setAberto((v) => !v);
        }}
        aria-label="O que é isso"
        aria-expanded={aberto}
        className="btn-press touch-target inline-flex items-center justify-center rounded-full"
        style={{ width: 15, height: 15, background: t.secondarySoft, color: t.secondaryText, border: `1px solid ${t.secondaryText}44` }}
      >
        <Info size={10} strokeWidth={2.75} />
      </button>
      {aberto &&
        createPortal(
          // biome-ignore lint/a11y/useKeyWithClickEvents: tocar no balão fecha; pelo teclado ele fecha com Esc ou ao sair do botão "?"
          <span
            ref={balaoRef}
            role="tooltip"
            onClick={(e) => {
              e.stopPropagation();
              setAberto(false);
            }}
            className="pop-in rounded-lg p-2.5 text-[11px] leading-snug text-left"
            style={{ ...posicaoBalao, background: t.text, color: t.bg, boxShadow: t.shadow, fontWeight: 400, whiteSpace: "normal" }}
          >
            <span style={{ display: "block" }}>{texto}</span>
            {referencia && <span style={{ display: "block", marginTop: 6, opacity: 0.72, fontStyle: "italic" }}>{referencia}</span>}
          </span>,
          document.body,
        )}
    </span>
  );
}

/* Os três pontos de equilíbrio como uma escada de perguntas, na ordem em   */
/* que o dono do negócio precisa respondê-las: o caixa fecha? → cobre todos */
/* os custos? → rende mais que o dinheiro aplicado? Cada degrau mostra o    */
/* valor, um medidor de quanto a receita projetada já cobre e quanto falta. */
/* A margem de segurança fecha o card: é a folga sobre o degrau do meio.    */
function EscadaPontoEquilibrio({
  receita,
  rcm,
  financeiro,
  contabil,
  economico,
  capitalInvestido,
  taxaRetorno,
  custoNaoCaixa,
  margemSeguranca,
  cobrado,
}) {
  const t = useT();
  const abrirFaq = useContext(FaqLinkContext);
  const temCapital = capitalInvestido > 0;
  // Bloco 16: com parceiros, cada ponto aparece também em valor cobrado dos clientes.
  const emCobrado = (v) => equivalenteEmValorCobrado(v, cobrado);
  const comParceiros = emCobrado(1) !== null;
  const semVolume = !(receita > 0);
  const semMargem = !semVolume && !(rcm > 0);

  const degraus = [
    {
      id: "financeiro",
      pergunta: "O caixa fecha?",
      nome: "Financeiro",
      valor: financeiro,
      explica:
        custoNaoCaixa > 0
          ? `Paga as contas que saem do bolso. Não inclui ${fmtBRL(custoNaoCaixa)} de depreciação, que não é saída de dinheiro.`
          : "Paga as contas que saem do bolso. Sem depreciação cadastrada, fica igual ao contábil.",
      info: {
        texto:
          "Igual ao contábil, mas tira do custo fixo o que não sai do caixa de verdade (como depreciação) — mostra o mínimo pra não faltar dinheiro no bolso.",
        referencia: "Padoveze, Contabilidade Gerencial",
      },
    },
    {
      id: "contabil",
      pergunta: "Cobre todos os custos?",
      nome: "Contábil",
      valor: contabil,
      explica: "O zero a zero: paga as contas do mês, o seu pró-labore e o desgaste dos equipamentos.",
      info: {
        texto: "Quanto você precisa faturar pra cobrir todos os custos, sem sobrar nem faltar nada — o zero a zero clássico.",
        referencia: "Padoveze, Contabilidade Gerencial",
      },
    },
    {
      id: "economico",
      pergunta: "Rende mais que o dinheiro aplicado?",
      nome: "Econômico",
      valor: economico,
      explica: temCapital
        ? `Além dos custos, paga o que os ${fmtBRL(capitalInvestido)} investidos renderiam aplicados (${fmtPct(taxaRetorno)} ao mês).`
        : "Informe o capital investido na aba Negócio para calcular. Sem ele, fica igual ao contábil.",
      info: {
        texto:
          "Vai além de não ter prejuízo: soma ao custo fixo o quanto seu capital investido renderia em outro lugar, então mostra o ponto onde o negócio realmente compensa mais que a alternativa.",
        referencia: "Padoveze, Contabilidade Gerencial",
      },
    },
  ];
  const alcancou = (v) => Number.isFinite(v) && receita >= v;

  let resumo;
  if (semVolume) {
    resumo = {
      tom: "neutro",
      titulo: "Falta o volume de atendimentos",
      frase: "Informe quantos atendimentos por mês cada serviço tem, na Calculadora, para comparar a receita com os pontos de equilíbrio.",
    };
  } else if (semMargem) {
    resumo = {
      tom: "perigo",
      titulo: "Nenhum volume de vendas cobre os custos",
      frase:
        "Com os preços atuais, o que sobra de cada venda depois dos custos variáveis e impostos não é positivo. Vender mais só aumenta o prejuízo: revise os preços na Calculadora.",
    };
  } else if (!alcancou(financeiro)) {
    resumo = {
      tom: "perigo",
      titulo: "O caixa não fecha",
      frase: `Com a receita projetada de ${fmtBRL(receita)} por mês, faltam ${fmtBRL(financeiro - receita)} só para pagar as contas que saem do caixa.`,
    };
  } else if (!alcancou(contabil)) {
    resumo = {
      tom: "atencao",
      titulo: "O caixa fecha, mas há prejuízo",
      frase: `A receita projetada de ${fmtBRL(receita)} paga as contas do mês, mas não cobre o desgaste dos equipamentos. Faltam ${fmtBRL(contabil - receita)} por mês para o zero a zero.`,
    };
  } else if (temCapital && !alcancou(economico)) {
    resumo = {
      tom: "atencao",
      titulo: "Cobre os custos, mas rende pouco",
      frase: `A receita projetada de ${fmtBRL(receita)} cobre todos os custos, mas o negócio ainda rende menos do que o capital investido renderia aplicado. Faltam ${fmtBRL(economico - receita)} por mês.`,
    };
  } else if (temCapital) {
    resumo = {
      tom: "ok",
      titulo: "Os três pontos foram alcançados",
      frase: `A receita projetada de ${fmtBRL(receita)} fecha o caixa, cobre todos os custos e rende mais do que o capital investido renderia aplicado.`,
    };
  } else {
    resumo = {
      tom: "ok",
      titulo: "O caixa fecha e os custos estão cobertos",
      frase: `A receita projetada de ${fmtBRL(receita)} passa do zero a zero com ${fmtBRL(receita - contabil)} de folga por mês.`,
    };
  }

  return (
    <div className="rounded-2xl p-4 sm:p-5" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
      <div className="flex items-center gap-1.5">
        <TrendingUp size={14} style={{ color: t.primaryText }} />
        <span className="text-xs font-semibold" style={{ color: t.text }}>
          Ponto de equilíbrio: {comParceiros ? "quanto o salão precisa receber por mês" : "quanto faturar por mês"}
        </span>
      </div>
      <p className="text-xs mt-1.5 mb-3" style={{ color: t.textMuted }}>
        São três valores porque respondem a três perguntas diferentes, uma depois da outra.
        {comParceiros &&
          " Com parceiros, os valores são da receita do salão, sem a cota-parte; abaixo de cada um, quanto isso dá em valor cobrado dos clientes."}
        {abrirFaq && (
          <>
            {" "}
            <button
              type="button"
              onClick={() => abrirFaq("ponto-de-equilibrio")}
              className="btn-press font-semibold underline underline-offset-2"
              style={{ color: t.primaryText }}
            >
              Por que três? →
            </button>
          </>
        )}
      </p>

      <CaixaSemaforo tom={resumo.tom} titulo={resumo.titulo}>
        <p>{resumo.frase}</p>
      </CaixaSemaforo>

      <ol className="mt-4 space-y-3">
        {degraus.map((d, i) => {
          const calculavel = Number.isFinite(d.valor) && !semVolume;
          const ok = calculavel && alcancou(d.valor);
          const critico = d.id === "financeiro";
          const cor = ok ? t.success : critico ? t.danger : t.warning;
          const trilho = ok ? t.successSoft : critico ? t.dangerSoft : t.warningSoft;
          const pctCoberto = calculavel && d.valor > 0 ? Math.min(100, (receita / d.valor) * 100) : 0;
          const Icone = ok ? CheckCircle2 : AlertTriangle;
          return (
            <li key={d.id} className="fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium inline-flex items-center gap-1.5" style={{ color: t.text }}>
                    {calculavel && (
                      <Icone
                        size={14}
                        className="shrink-0"
                        style={{ color: ok ? t.successText : critico ? t.danger : t.warningText }}
                        aria-hidden="true"
                      />
                    )}
                    {d.pergunta}
                  </p>
                  <p className="text-[11px]" style={{ color: t.textMuted }}>
                    {d.nome}
                    <InfoConceito texto={d.info.texto} referencia={d.info.referencia} />
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-num text-sm font-semibold whitespace-nowrap" style={{ color: t.text }}>
                    {Number.isFinite(d.valor) ? fmtBRL(d.valor) : "—"}
                  </p>
                  {comParceiros && Number.isFinite(d.valor) && (
                    <p className="font-num text-[11px] whitespace-nowrap" style={{ color: t.textMuted }}>
                      ≈ {fmtBRL(emCobrado(d.valor))} cobrados
                    </p>
                  )}
                  {calculavel && (
                    <p
                      className="text-[11px] font-medium whitespace-nowrap"
                      style={{ color: ok ? t.successText : critico ? t.danger : t.warningText }}
                    >
                      {ok ? "alcançado" : `faltam ${fmtBRL(d.valor - receita)}`}
                    </p>
                  )}
                </div>
              </div>
              {calculavel && (
                // biome-ignore lint/a11y/useSemanticElements: barra desenhada com div para seguir as cores do tema; role="meter" informa o valor a leitores de tela
                <div
                  className="mt-1.5 rounded-full overflow-hidden"
                  style={{ height: 6, background: trilho }}
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(pctCoberto)}
                  aria-label={`${d.pergunta} A receita projetada cobre ${Math.round(pctCoberto)}% deste ponto.`}
                >
                  <div
                    className="rounded-full"
                    style={{ height: "100%", width: `${pctCoberto}%`, background: cor, transition: "width .5s cubic-bezier(.2,.8,.2,1)" }}
                  />
                </div>
              )}
              <p className="text-[11px] mt-1" style={{ color: t.textMuted }}>
                {d.explica}
              </p>
            </li>
          );
        })}
      </ol>

      {margemSeguranca !== null && !semVolume && (
        <div className="mt-4 pt-3 flex items-start justify-between gap-3" style={{ borderTop: `1px solid ${t.border}` }}>
          <p className="text-xs" style={{ color: t.textMuted }}>
            <span className="inline-flex items-center gap-1 font-medium" style={{ color: t.text }}>
              <ShieldCheck size={13} style={{ color: t.primaryText }} aria-hidden="true" /> Margem de segurança
              <InfoConceito
                texto="Quanto sua receita atual pode cair antes de você chegar no ponto de equilíbrio — quanto maior, mais colchão de segurança o negócio tem."
                referencia="Perez Jr., Oliveira e Costa, Gestão Estratégica de Custos"
              />
            </span>
            <br />
            {margemSeguranca > 0
              ? `A receita pode cair até ${fmtPct(margemSeguranca)} antes de chegar ao zero a zero.`
              : "A receita já está abaixo do zero a zero."}
          </p>
          <p className="font-num text-lg font-bold shrink-0" style={{ color: margemSeguranca > 0 ? t.successText : t.danger }}>
            {fmtPct(margemSeguranca)}
          </p>
        </div>
      )}
    </div>
  );
}

function IndicadorCard({ titulo, icon: Icon, info, children }) {
  const t = useT();
  return (
    <div className="rounded-2xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={14} style={{ color: t.primaryText }} />
        <span className="text-xs font-semibold" style={{ color: t.text }}>
          {titulo}
        </span>
        {info && <InfoConceito texto={info.texto} referencia={info.referencia} />}
      </div>
      {children}
    </div>
  );
}
