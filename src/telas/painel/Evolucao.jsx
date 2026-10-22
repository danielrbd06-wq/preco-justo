/* Painel: evolução mês a mês, ranking e comparativos dos serviços. */
import { AlertTriangle, ChevronDown, Info, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { calcularParaExibicao, comissaoEfetiva, fmtBRL, fmtPct, N, parcelaParceiro, receitaDoSalao, taxaEfetiva } from "../../calculos.js";
import { SkeletonBlock } from "../../componentes/base.jsx";
import { Ajuda } from "../../componentes/campos.jsx";
import { useT } from "../../tema.js";
import { labelMes, normalizarDetalheServico } from "./meses.js";

/* ======================================================================= */
/* Evolução e Comparativos — Fase 2 do módulo (ver Especificacao_          */
/* Analise_Avancada.md). Lê os registros de FechamentoMensal; não          */
/* recalcula nada que já não esteja salvo ali (lucroLiquidoCalculado etc), */
/* só organiza/deriva pra visualização.                                    */
/* ======================================================================= */
function computeHistoricoMensal(fechamentos, sazonalidade) {
  return [...fechamentos]
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .map((f) => {
      const mesIndex = Number(f.mes.split("-")[1]) - 1;
      // Bloco 16: régua única = receita do salão (valor cobrado − cota-parte dos parceiros).
      // Margem e custos do mês na mesma régua; o valor cobrado aparece no detalhe do mês.
      const receita = receitaDoSalao(f);
      const lucro = N(f.lucroLiquidoCalculado);
      return {
        mes: f.mes,
        mesLabel: labelMes(f.mes),
        receita,
        valorCobrado: N(f.faturamentoBruto),
        cotaParte: N(f.cotaParteSnapshot),
        lucroLiquido: f.lucroLiquidoCalculado,
        custosTotais: receita - lucro,
        margemLiquidaPct: receita > 0 ? Math.round((lucro / receita) * 1000) / 10 : 0,
        // Ticket médio é o que o cliente paga por atendimento (valor cobrado).
        ticketMedio: f.atendimentosTotais > 0 ? N(f.faturamentoBruto) / f.atendimentosTotais : 0,
        atendimentos: f.atendimentosTotais,
        temBreakdownServico:
          !!f.atendimentosPorServico && Object.values(f.atendimentosPorServico).some((v) => normalizarDetalheServico(v).quantidade > 0),
        sazonalidadeEsperadaPct: N(sazonalidade?.[mesIndex]) || 100,
      };
    });
}

// Calcula a margem de contribuição de cada serviço DENTRO de um único fechamento — usada
// tanto pelo ranking acumulado quanto pelo comparativo mensal, pra não duplicar a mesma
// fórmula em dois lugares. Usa a receita REAL quando foi informada (valorReal); só cai pra
// "quantidade × preço salvo" como estimativa quando não foi. Custo de material escala com
// quantidade; comissão/taxa de cartão/imposto escalam sobre a receita real de cada serviço
// (não sobre o preço teórico), porque é sobre o que entrou de fato que essas % incidem.
function margensPorServicoNoFechamento(fechamento, servicos, nd) {
  const resultado = {};
  if (!fechamento.atendimentosPorServico) return resultado;
  Object.entries(fechamento.atendimentosPorServico).forEach(([id, raw]) => {
    const d = normalizarDetalheServico(raw);
    if (d.quantidade <= 0) return;
    const servico = (servicos || []).find((s) => s.id === id);
    if (!servico) return;
    const calc = calcularParaExibicao(servico, nd);
    if (calc.status !== "ok") return;
    const receita = d.valorReal != null ? d.valorReal : d.quantidade * calc.preco;
    const custoMaterial = d.quantidade * calc.totalVariaveis;
    const custoComissao = receita * (comissaoEfetiva(servico, nd) / 100); // inclui a cota-parte de parceiro
    const fatorSalao = 1 - parcelaParceiro(servico, nd) / 100; // Bloco 11
    const custoTaxaCartao = receita * (taxaEfetiva(servico, nd) / 100) * fatorSalao;
    const custoImposto = receita * (nd.impostoPct / 100) * fatorSalao;
    resultado[id] = {
      nome: servico.nome,
      categoria: servico.categoria || "Outros",
      tipo: servico.tipo || "servico",
      quantidade: d.quantidade,
      receita,
      temReceitaReal: d.valorReal != null,
      margem: receita - custoMaterial - custoComissao - custoTaxaCartao - custoImposto,
      horasOcupadas: d.quantidade * N(servico.horasPorAtendimento),
    };
  });
  return resultado;
}

function computeRankingServicos(fechamentos, servicos, nd) {
  const acumulado = {};
  fechamentos.forEach((f) => {
    Object.entries(margensPorServicoNoFechamento(f, servicos, nd)).forEach(([id, d]) => {
      if (!acumulado[id])
        acumulado[id] = {
          nome: d.nome,
          categoria: d.categoria,
          tipo: d.tipo,
          atendimentosNoPeriodo: 0,
          margemContribuicaoTotal: 0,
          horasTotaisOcupadas: 0,
          temReceitaReal: false,
        };
      const a = acumulado[id];
      a.atendimentosNoPeriodo += d.quantidade;
      a.margemContribuicaoTotal += d.margem;
      a.horasTotaisOcupadas += d.horasOcupadas;
      if (d.temReceitaReal) a.temReceitaReal = true;
    });
  });
  return Object.entries(acumulado)
    .map(([servicoId, a]) => ({
      servicoId,
      ...a,
      lucroPorHoraCadeira: a.horasTotaisOcupadas > 0 ? a.margemContribuicaoTotal / a.horasTotaisOcupadas : 0,
    }))
    .sort((a, b) => b.margemContribuicaoTotal - a.margemContribuicaoTotal);
}

// Mesma fonte (margensPorServicoNoFechamento), mas preservando o mês em vez de somar tudo
// junto — é o "recorte mensal" do comparativo: um ponto por mês, uma linha por serviço.
// Limita aos 5 serviços de maior margem acumulada, pra não virar um gráfico ilegível.
function computeComparativoMensalServicos(fechamentos, servicos, nd) {
  const porMes = {};
  const totalPorServico = {};
  [...fechamentos]
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .forEach((f) => {
      const porServico = margensPorServicoNoFechamento(f, servicos, nd);
      if (Object.keys(porServico).length === 0) return;
      porMes[f.mes] = porMes[f.mes] || {};
      Object.values(porServico).forEach((d) => {
        porMes[f.mes][d.nome] = (porMes[f.mes][d.nome] || 0) + d.margem;
        totalPorServico[d.nome] = (totalPorServico[d.nome] || 0) + d.margem;
      });
    });
  const servicosNomes = Object.entries(totalPorServico)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nome]) => nome);
  const dados = Object.keys(porMes)
    .sort()
    .map((mes) => {
      const linha = { mes, mesLabel: labelMes(mes) };
      servicosNomes.forEach((nome) => {
        linha[nome] = Math.round(porMes[mes][nome] || 0);
      });
      return linha;
    });
  return { dados, servicosNomes };
}

// Regra simples de comparação de deltas reais — nenhum número inventado, só
// compara o que já está no histórico calculado a partir dos fechamentos.
function detectarAnomalia(mesAtual, mesAnterior, comParceiros = false) {
  if (!mesAtual || !mesAnterior || mesAnterior.receita <= 0 || mesAnterior.lucroLiquido === 0) return null;
  const deltaFaturamento = (mesAtual.receita - mesAnterior.receita) / mesAnterior.receita;
  const oQue = comParceiros ? "A receita do salão" : "O faturamento";
  const deltaLucro = (mesAtual.lucroLiquido - mesAnterior.lucroLiquido) / Math.abs(mesAnterior.lucroLiquido);
  if (deltaFaturamento > 0.1 && deltaLucro < deltaFaturamento * 0.5) {
    return `${oQue} subiu ${(deltaFaturamento * 100).toFixed(0)}% de ${mesAnterior.mesLabel} pra ${mesAtual.mesLabel}, mas o lucro só ${(deltaLucro * 100).toFixed(0)}%. Vale revisar custo de insumos ou comissão dos serviços que mais venderam nesse período.`;
  }
  if (deltaFaturamento < -0.1 && mesAtual.sazonalidadeEsperadaPct >= 110) {
    return `${mesAtual.mesLabel} é um mês de alta esperada na sua sazonalidade configurada, mas ${oQue.toLowerCase()} caiu ${(Math.abs(deltaFaturamento) * 100).toFixed(0)}% em relação a ${mesAnterior.mesLabel}. Vale investigar se foi concorrência, preço ou queda de demanda.`;
  }
  return null;
}

// Eixo em milhares: "2,5k" em vez de arredondar 2.500 para "3k" (Bloco 16).
const fmtMilhar = (v) => `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;

const BANDAS_SAZONAIS_PADRAO = [
  { de: "05", ate: "05", label: "Dia das Mães" },
  { de: "06", ate: "06", label: "Dia dos Namorados" },
  { de: "11", ate: "12", label: "Black Friday + Natal" },
  { de: "01", ate: "02", label: "baixa temporada" },
];

function TooltipEvolucao({ active, payload }) {
  const t = useT();
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg p-2.5 text-xs" style={{ background: t.text, color: t.bg, boxShadow: t.shadow }}>
      <p className="font-semibold mb-1">{d.mesLabel}</p>
      {d.cotaParte > 0 ? (
        <>
          <p>Receita do salão: {fmtBRL(d.receita)}</p>
          <p style={{ opacity: 0.8 }}>Valor cobrado dos clientes: {fmtBRL(d.valorCobrado)}</p>
          <p style={{ opacity: 0.8 }}>Cota-parte dos parceiros: −{fmtBRL(d.cotaParte)}</p>
        </>
      ) : (
        <p>Faturamento: {fmtBRL(d.receita)}</p>
      )}
      <p>Custos totais: {fmtBRL(d.custosTotais)}</p>
      <p>
        Lucro líquido: {fmtBRL(d.lucroLiquido)} ({fmtPct(d.margemLiquidaPct)})
      </p>
      <p>
        Ticket médio do cliente: {fmtBRL(d.ticketMedio)} · {d.atendimentos} atendimentos
      </p>
    </div>
  );
}

function GraficoEvolucao({ historico, pontoEquilibrio }) {
  const t = useT();
  const [mostrarEsperado, setMostrarEsperado] = useState(true);
  const comParceiros = historico.some((h) => h.cotaParte > 0);
  const nomeReceita = comParceiros ? "Receita do salão" : "Faturamento";
  const anosNoHistorico = [...new Set(historico.map((h) => h.mes.slice(0, 4)))];
  const mostrarPE = Number.isFinite(pontoEquilibrio) && pontoEquilibrio > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <p className="text-sm font-semibold" style={{ color: t.text }}>
          Evolução do lucro e {comParceiros ? "da receita do salão" : "faturamento"}
        </p>
        <label className="flex items-center gap-1.5 text-[11px] cursor-pointer" style={{ color: t.textMuted }}>
          <input type="checkbox" checked={mostrarEsperado} onChange={(e) => setMostrarEsperado(e.target.checked)} />
          comparar com o esperado
          <Ajuda texto="O esperado vem da sazonalidade que você configurou na Projeção de Caixa. Aqui a gente compara com o que de fato aconteceu." />
        </label>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={historico} margin={{ left: -10, right: 8 }}>
          <defs>
            <linearGradient id="gradienteFaturamento" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.primary} stopOpacity={0.38} />
              <stop offset="100%" stopColor={t.primary} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
          {anosNoHistorico.flatMap((ano) =>
            BANDAS_SAZONAIS_PADRAO.map((b) => (
              <ReferenceArea
                key={`${ano}-${b.label}`}
                x1={`${ano}-${b.de}`}
                x2={`${ano}-${b.ate}`}
                fill={t.warningSoft}
                fillOpacity={0.6}
                ifOverflow="hidden"
              />
            )),
          )}
          <XAxis dataKey="mesLabel" tick={{ fontSize: 10, fill: t.textMuted }} />
          <YAxis yAxisId="reais" tick={{ fontSize: 10, fill: t.textMuted }} tickFormatter={fmtMilhar} />
          <YAxis yAxisId="pct" orientation="right" tick={{ fontSize: 10, fill: t.textMuted }} tickFormatter={(v) => `${v}%`} />
          <Tooltip content={<TooltipEvolucao />} />
          {mostrarPE && (
            <ReferenceLine
              yAxisId="reais"
              y={pontoEquilibrio}
              // Bloco 16: a escala cresce até o ponto de equilíbrio. Antes, quando ele ficava acima
              // de todos os meses (o caso mais grave), a linha simplesmente sumia do gráfico.
              ifOverflow="extendDomain"
              stroke={t.danger}
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{ value: "Ponto de equilíbrio", position: "insideTopLeft", fill: t.danger, fontSize: 10 }}
            />
          )}
          <Area
            yAxisId="reais"
            type="monotone"
            dataKey="receita"
            stroke={t.primary}
            strokeWidth={2.5}
            fill="url(#gradienteFaturamento)"
            name={nomeReceita}
            dot={{ r: 3, fill: t.primary, strokeWidth: 0 }}
          />
          <Line
            yAxisId="pct"
            type="monotone"
            dataKey="margemLiquidaPct"
            stroke={t.success}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            name="Margem líquida %"
          />
          {mostrarEsperado && (
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="sazonalidadeEsperadaPct"
              stroke={t.textMuted}
              strokeDasharray="4 4"
              dot={false}
              strokeWidth={1.5}
              name="Esperado (sazonalidade)"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-3 mt-1 text-[10px] flex-wrap" style={{ color: t.textMuted }}>
        <span className="inline-flex items-center gap-1">
          <span style={{ width: 10, height: 2, background: t.primary, display: "inline-block" }} /> {nomeReceita}
        </span>
        <span className="inline-flex items-center gap-1">
          <span style={{ width: 8, height: 8, borderRadius: 999, background: t.success, display: "inline-block" }} /> Margem líquida
        </span>
        {mostrarPE && (
          <span className="inline-flex items-center gap-1">
            <span style={{ width: 10, height: 2, background: t.danger, display: "inline-block" }} /> Ponto de equilíbrio
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <span style={{ width: 10, height: 2, background: t.warningSoft, display: "inline-block" }} /> período sazonal típico
        </span>
      </div>
      {comParceiros && (
        <p className="text-[11px] mt-1.5" style={{ color: t.textMuted }}>
          Com parceiros, a receita e o ponto de equilíbrio estão na mesma régua: a receita do salão, sem a cota-parte. Toque num mês para
          ver o valor cobrado dos clientes.
        </p>
      )}
    </div>
  );
}

// Tendência dos últimos até-3 meses de UM serviço específico, a partir dos mesmos dados
// mensais já usados no ComparativoMensalServicos — nenhum cálculo novo, só uma leitura
// diferente do que já existe. null quando não dá pra falar de tendência de verdade
// (menos de 2 meses no histórico, ou o primeiro ponto da janela é zero).
function calcularTendenciaServico(dadosMensais, nomeServico) {
  const valores = dadosMensais.map((d) => d[nomeServico] ?? 0);
  const janela = valores.slice(-3);
  if (janela.length < 2) return null;
  const primeiro = janela[0];
  const ultimo = janela[janela.length - 1];
  if (primeiro === 0) return null;
  return { variacaoPct: ((ultimo - primeiro) / Math.abs(primeiro)) * 100, meses: janela.length };
}

// Card de destaque: cruza o #1 do ranking (maior margem acumulada — já é a ordenação que
// computeRankingServicos entrega) com a tendência recente DESSE MESMO serviço. Não inventa
// um "score" novo nem reordena por outro critério — "melhor" aqui continua sendo definido
// por margem total, e a tendência entra como informação complementar na mesma frase.
function DestaqueMelhorServico({ ranking, dadosMensais }) {
  const t = useT();
  if (!ranking.length) return null;
  const melhor = ranking[0];
  const tendencia = calcularTendenciaServico(dadosMensais, melhor.nome);

  let frase;
  let Icone = Sparkles;
  let corIcone = t.primaryText;
  const base = `${melhor.nome} é o serviço com maior margem de contribuição no período (${fmtBRL(melhor.margemContribuicaoTotal)})`;

  if (!tendencia) {
    frase = `${base} — ainda não dá pra falar de tendência com esse histórico curto.`;
  } else if (tendencia.variacaoPct > 5) {
    frase = `${base} — e está em alta: subiu ${tendencia.variacaoPct.toFixed(0)}% nos últimos ${tendencia.meses} meses.`;
    Icone = TrendingUp;
    corIcone = t.successText;
  } else if (tendencia.variacaoPct < -5) {
    frase = `${base} — mas caiu ${Math.abs(tendencia.variacaoPct).toFixed(0)}% nos últimos ${tendencia.meses} meses, vale atenção.`;
    Icone = TrendingDown;
    corIcone = t.danger;
  } else {
    frase = `${base}, e vem se mantendo estável nos últimos ${tendencia.meses} meses.`;
  }

  return (
    <div className="rounded-xl p-3 flex gap-2 items-start" style={{ background: t.primarySoft }}>
      <Icone size={15} className="mt-0.5 shrink-0" style={{ color: corIcone }} />
      <p className="text-xs" style={{ color: t.text }}>
        {frase}
      </p>
    </div>
  );
}

function RankingServicos({ ranking }) {
  const t = useT();
  const top = ranking.slice(0, 8);
  const dados = top.map((r) => ({ id: r.servicoId, nome: r.nome, valor: Math.round(r.margemContribuicaoTotal) }));
  const temEstimativa = top.some((r) => !r.temReceitaReal);
  return (
    <div>
      <p className="text-sm font-semibold mb-2" style={{ color: t.text }}>
        Ranking de margem por serviço
      </p>
      <p className="text-[11px] mb-2" style={{ color: t.textMuted }}>
        Margem de contribuição total gerada no período — não é só volume, é o que cada serviço realmente deixou de lucro.
      </p>
      <ResponsiveContainer width="100%" height={Math.max(140, dados.length * 34)}>
        <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={t.border} horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => fmtBRL(v)} tick={{ fontSize: 10, fill: t.textMuted }} />
          <YAxis type="category" dataKey="nome" width={90} tick={{ fontSize: 11, fill: t.text }} />
          <Tooltip
            formatter={(v) => fmtBRL(v)}
            contentStyle={{ fontSize: 12, borderRadius: 8, background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
          />
          <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
            {dados.map((d) => (
              <Cell key={d.id} fill={d.valor >= 0 ? t.success : t.danger} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {temEstimativa && (
        <p className="text-[10px] mt-1" style={{ color: t.textMuted }}>
          Serviços sem "valor ganho — real" informado em nenhum fechamento entram aqui estimados pelo preço salvo, não pelo que de fato foi
          cobrado.
        </p>
      )}
    </div>
  );
}

// Paleta reaproveitando tokens já existentes no design system — nenhuma cor nova, só
// rotaciona entre os tons semânticos que o app já usa em outros lugares (badges, botões).
const PALETA_LINHAS_SERVICO = (t) => [t.primary, t.success, t.warning, t.danger, t.secondary];

function ComparativoMensalServicos({ dados, servicosNomes }) {
  const t = useT();
  const paleta = PALETA_LINHAS_SERVICO(t);
  if (servicosNomes.length === 0 || dados.length < 2) {
    return (
      <div className="rounded-xl p-3" style={{ background: t.surfaceAlt }}>
        <p className="text-xs" style={{ color: t.textMuted }}>
          O recorte mensal por serviço aparece aqui a partir de 2 meses com detalhamento por serviço preenchido.
        </p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-sm font-semibold mb-2" style={{ color: t.text }}>
        Comparação entre serviços — mês a mês
      </p>
      <p className="text-[11px] mb-2" style={{ color: t.textMuted }}>
        Margem de contribuição por serviço em cada mês (top 5) — mostra não só quem lucra mais, mas se está subindo ou caindo.
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={dados} margin={{ left: -10, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
          <XAxis dataKey="mesLabel" tick={{ fontSize: 10, fill: t.textMuted }} />
          <YAxis tick={{ fontSize: 10, fill: t.textMuted }} tickFormatter={(v) => fmtBRL(v)} />
          <Tooltip
            formatter={(v) => fmtBRL(v)}
            contentStyle={{ fontSize: 12, borderRadius: 8, background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
          />
          {servicosNomes.map((nome, i) => (
            <Line
              key={nome}
              type="monotone"
              dataKey={nome}
              stroke={paleta[i % paleta.length]}
              strokeWidth={2.2}
              dot={{ r: 2.5 }}
              name={nome}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-3 mt-1 text-[10px] flex-wrap" style={{ color: t.textMuted }}>
        {servicosNomes.map((nome, i) => (
          <span key={nome} className="inline-flex items-center gap-1">
            <span style={{ width: 10, height: 2, background: paleta[i % paleta.length], display: "inline-block" }} /> {nome}
          </span>
        ))}
      </div>
    </div>
  );
}

function OcupacaoXLucro({ ranking }) {
  const t = useT();
  const apenasServicos = ranking.filter((r) => r.tipo !== "produto");
  const dados = apenasServicos.map((r) => ({
    id: r.servicoId,
    nome: r.nome,
    x: Math.round(r.horasTotaisOcupadas),
    y: Number(r.lucroPorHoraCadeira.toFixed(2)),
  }));
  if (apenasServicos.length === 0) return null;
  return (
    <div>
      <p className="text-sm font-semibold mb-2" style={{ color: t.text }}>
        Ocupação de cadeira × lucro por hora
      </p>
      <p className="text-[11px] mb-2" style={{ color: t.textMuted }}>
        Cada ponto é um serviço. Mais pra direita = ocupa mais tempo de cadeira; mais pra cima = mais lucro por hora ocupada.
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <ScatterChart margin={{ left: -10, right: 16, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
          <XAxis type="number" dataKey="x" name="Horas ocupadas" unit="h" tick={{ fontSize: 10, fill: t.textMuted }} />
          <YAxis type="number" dataKey="y" name="Lucro/hora" tickFormatter={(v) => fmtBRL(v)} tick={{ fontSize: 10, fill: t.textMuted }} />
          <ZAxis range={[80, 80]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            formatter={(v, nome) => (nome === "Lucro/hora" ? fmtBRL(v) : `${v}h`)}
            contentStyle={{ fontSize: 12, borderRadius: 8, background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
          />
          <Scatter data={dados} fill={t.primary}>
            {dados.map((d) => (
              <Cell key={d.id} fill={d.y >= 0 ? t.primary : t.danger} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EvolucaoComparativos({ nd, servicos, fechamentos, sazonalidade, pontoEquilibrio }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);

  const cardStyle = { background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow };

  // useMemo precisa rodar em toda renderização, na mesma ordem — por isso vem ANTES do
  // "return" condicional de carregamento, com fallback pra lista vazia enquanto fechamentos===null.
  // (Bug real que existiu aqui antes: os useMemo ficavam depois do early-return, o que quebra
  // as Rules of Hooks do React assim que os dados terminam de carregar — "Rendered more hooks
  // than during the previous render". Corrigido nesta revisão.)
  const historico = useMemo(() => computeHistoricoMensal(fechamentos || [], sazonalidade), [fechamentos, sazonalidade]);
  const ranking = useMemo(() => computeRankingServicos(fechamentos || [], servicos, nd), [fechamentos, servicos, nd]);
  const comparativoMensal = useMemo(() => computeComparativoMensalServicos(fechamentos || [], servicos, nd), [fechamentos, servicos, nd]);

  if (fechamentos === null) {
    return (
      <div className="rounded-2xl p-4 no-print" style={cardStyle}>
        <SkeletonBlock h={20} w="60%" />
      </div>
    );
  }

  const comParceiros = historico.some((h) => h.cotaParte > 0);
  const anomalia =
    historico.length >= 2 ? detectarAnomalia(historico[historico.length - 1], historico[historico.length - 2], comParceiros) : null;
  const temBreakdown = historico.some((h) => h.temBreakdownServico);
  const temExemplo = fechamentos.some((f) => f.exemplo);

  return (
    <div className="rounded-2xl p-4 no-print" style={cardStyle}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="btn-press touch-target flex items-center justify-between w-full"
        aria-expanded={aberto}
      >
        <span className="text-sm font-semibold inline-flex items-center gap-1.5" style={{ color: t.text }}>
          <TrendingUp size={14} style={{ color: t.primaryText }} /> Evolução e comparativos
        </span>
        <ChevronDown
          size={15}
          style={{ color: t.textMuted, transform: aberto ? "rotate(180deg)" : "none", transition: "transform .2s ease" }}
        />
      </button>

      {aberto && (
        <div className="pop-in mt-3 space-y-5">
          {historico.length < 2 ? (
            <div className="rounded-xl p-4 text-center" style={{ background: t.surfaceAlt, border: `1px dashed ${t.border}` }}>
              <p className="text-sm" style={{ color: t.text }}>
                Ainda não tem dado suficiente pra esse gráfico.
              </p>
              <p className="text-xs mt-1" style={{ color: t.textMuted }}>
                Registre o fechamento de pelo menos 2 meses (na seção "Fechamento mensal" acima) pra começar a ver a evolução.
                {historico.length === 1 && " Você já tem 1 — falta mais 1."}
              </p>
            </div>
          ) : (
            <>
              {temExemplo && (
                <div
                  className="rounded-xl p-3 flex gap-2 items-start"
                  style={{ background: t.surfaceAlt, border: `1px dashed ${t.border}` }}
                >
                  <Info size={15} className="mt-0.5 shrink-0" style={{ color: t.textMuted }} />
                  <p className="text-xs" style={{ color: t.textMuted }}>
                    Este gráfico inclui mês(es) de exemplo (não reais) — dá pra apagar em "Fechamento mensal" → "Meses anteriores" antes de
                    mostrar dado real pra alguém.
                  </p>
                </div>
              )}

              {anomalia && (
                <div className="rounded-xl p-3 flex gap-2 items-start" style={{ background: t.warningSoft }}>
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: t.warningText }} />
                  <p className="text-xs" style={{ color: t.text }}>
                    {anomalia}
                  </p>
                </div>
              )}

              <GraficoEvolucao historico={historico} pontoEquilibrio={pontoEquilibrio} />

              {temBreakdown ? (
                <>
                  <div style={{ borderTop: `1px solid ${t.border}` }} />
                  <DestaqueMelhorServico ranking={ranking} dadosMensais={comparativoMensal.dados} />
                  <RankingServicos ranking={ranking} />
                  <ComparativoMensalServicos dados={comparativoMensal.dados} servicosNomes={comparativoMensal.servicosNomes} />
                  <OcupacaoXLucro ranking={ranking} />
                </>
              ) : (
                <div className="rounded-xl p-3" style={{ background: t.surfaceAlt }}>
                  <p className="text-xs" style={{ color: t.textMuted }}>
                    O ranking por serviço e o gráfico de ocupação × lucro aparecem aqui quando você preencher o "detalhamento por serviço"
                    no Fechamento Mensal de pelo menos um mês.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
