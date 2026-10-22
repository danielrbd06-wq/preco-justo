/* Painel: projeção de caixa dos próximos meses. */

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtBRL, N, receitaDoSalao } from "../../calculos.js";
import { Selo } from "../../componentes/base.jsx";
import { CAMPO } from "../../componentes/campos.jsx";
import { useT } from "../../tema.js";
import { calcularSazonalidadeAutomatica, chaveMes, janelaDeMeses, labelMes, MESES } from "./meses.js";

export function ProjecaoCaixa({ dre, sazonalidade, onChange, fechamentos }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [mostrarComoCalcular, setMostrarComoCalcular] = useState(false);

  const fechamentosOrdenados = [...(fechamentos || [])].sort((a, b) => a.mes.localeCompare(b.mes));
  // Começa no mês mais antigo com fechamento real salvo (em vez de sempre Jan fixo) — se não
  // houver nenhum ainda, começa no mês atual. É por isso que, com Jun/26 carregado, a janela
  // passa a abrir em Jun/26 em vez de Jan/26.
  const chaveInicio = fechamentosOrdenados.length > 0 ? fechamentosOrdenados[0].mes : chaveMes(new Date());
  const janela = janelaDeMeses(chaveInicio, 12);
  const fechamentosPorMes = Object.fromEntries((fechamentos || []).map((f) => [f.mes, f]));

  // Conexão em tempo real com o Fechamento Mensal: mês com fechamento salvo usa o valor
  // REAL registrado; mês sem fechamento continua projetando a partir do DRE atual ×
  // sazonalidade, exatamente como antes.
  const dados = janela.map((chave) => {
    const mesIndex = Number(chave.split("-")[1]) - 1;
    const real = fechamentosPorMes[chave];
    if (real) {
      return {
        mes: labelMes(chave),
        Receita: Math.round(receitaDoSalao(real)),
        Resultado: Math.round(real.lucroLiquidoCalculado),
        real: true,
      };
    }
    const mult = N(sazonalidade[mesIndex]) / 100;
    const receita = dre.receitaBruta * mult;
    const variavelProp = dre.receitaBruta > 0 ? dre.custosVariaveisTotais / dre.receitaBruta : 0;
    const impostoProp = dre.receitaBruta > 0 ? dre.impostos / dre.receitaBruta : 0;
    const custosVar = receita * variavelProp;
    const impostos = receita * impostoProp;
    const resultado = receita - impostos - custosVar - dre.custosFixos + dre.aluguelRecebido;
    return { mes: labelMes(chave), Receita: Math.round(receita), Resultado: Math.round(resultado), real: false };
  });

  const updateMes = (i, v) => {
    const novo = [...sazonalidade];
    novo[i] = v;
    onChange(novo);
  };

  const totalFechamentos = (fechamentos || []).length;
  const temHistoricoSuficiente = totalFechamentos >= 12;
  const calcularAutomatico = () => {
    const auto = calcularSazonalidadeAutomatica(fechamentos);
    if (!auto) return;
    onChange(sazonalidade.map((atual, i) => (auto[i] != null ? auto[i] : atual)));
  };

  const PontoComReal = (cor) => (props) => {
    const { cx, cy, payload } = props;
    return payload.real ? (
      <circle cx={cx} cy={cy} r={4} fill={cor} stroke={t.surface} strokeWidth={1.5} />
    ) : (
      <circle cx={cx} cy={cy} r={2.5} fill="none" stroke={cor} strokeWidth={1.5} />
    );
  };

  return (
    <div className="rounded-2xl p-5" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-semibold" style={{ color: t.text }}>
          Fluxo de caixa projetado (12 meses)
        </p>
        <button type="button" onClick={() => setAberto(!aberto)} className="btn-press text-xs font-medium" style={{ color: t.primaryText }}>
          {aberto ? "ocultar sazonalidade" : "ajustar sazonalidade"}
        </button>
      </div>
      <p className="text-[11px] mt-1 mb-3" style={{ color: t.textMuted }}>
        Mês com Fechamento Mensal salvo mostra o valor real (ponto cheio no gráfico); os demais projetam a partir do DRE atual ×
        sazonalidade (ponto vazado). Sazonalidade é uma estimativa sua, não um dado de mercado.
      </p>

      {aberto && (
        <div className="pop-in mb-4">
          <button
            type="button"
            onClick={() => setMostrarComoCalcular((v) => !v)}
            className="text-[11px] font-medium underline btn-press mb-2 block"
            style={{ color: t.primaryText }}
          >
            {mostrarComoCalcular ? "ocultar como calcular esse percentual" : "como calcular esse percentual"}
          </button>
          {mostrarComoCalcular && (
            <div className="rounded-lg p-3 mb-3 text-[11px] space-y-1.5" style={{ background: t.surfaceAlt, color: t.textMuted }}>
              <p>
                <strong style={{ color: t.text }}>1.</strong> Pegue o faturamento real de cada mês que você tiver (Fechamento Mensal,
                extrato, caderno — qualquer fonte que já exista).
              </p>
              <p>
                <strong style={{ color: t.text }}>2.</strong> Calcule a média mensal desse período.
              </p>
              <p>
                <strong style={{ color: t.text }}>3.</strong> Para cada mês: (faturamento daquele mês ÷ média) × 100.
              </p>
              <p className="pt-1" style={{ color: t.text }}>
                Exemplo: média de R$ 8.000/mês, dezembro fica em R$ 10.400 → dezembro = 130%. Fevereiro fica em R$ 5.600 → fevereiro = 70%.
              </p>
            </div>
          )}

          {temHistoricoSuficiente ? (
            <button
              type="button"
              onClick={calcularAutomatico}
              className="btn-press w-full rounded-lg px-3 py-2 text-xs font-semibold mb-3 inline-flex items-center justify-center gap-1.5"
              style={{ background: t.primarySoft, color: t.primaryText }}
            >
              <Sparkles size={13} /> Calcular automaticamente a partir do meu histórico real ({totalFechamentos} meses)
            </button>
          ) : (
            <p className="text-[11px] mb-3" style={{ color: t.textMuted }}>
              Com 12 ou mais meses de Fechamento Mensal salvos, o app aplica essa mesma conta sozinho a partir do seu histórico real. Você
              tem {totalFechamentos} até agora.
            </p>
          )}

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {MESES.map((mes, i) => (
              <label key={mes} className="block">
                <span className="text-[10px]" style={{ color: t.textMuted }}>
                  {mes}
                </span>
                <input
                  className={`${CAMPO} font-num text-xs py-1`}
                  style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
                  type="number"
                  min="0"
                  value={sazonalidade[i]}
                  onChange={(e) => updateMes(i, e.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={dados} margin={{ left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 11, fill: t.textMuted }} />
          <YAxis tickFormatter={(v) => `R$${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: t.textMuted }} />
          <Tooltip
            formatter={(v) => fmtBRL(v)}
            contentStyle={{ fontSize: 12, borderRadius: 8, background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="Receita" stroke={t.secondary} strokeWidth={2} dot={PontoComReal(t.secondary)} />
          <Line type="monotone" dataKey="Resultado" stroke={t.success} strokeWidth={2} dot={PontoComReal(t.success)} />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <Selo tipo="calculado">projeção com sazonalidade estimada por você</Selo>
        {dados.some((d) => d.real) && <Selo tipo="real">inclui meses reais do Fechamento Mensal</Selo>}
      </div>
    </div>
  );
}
