/* Calculadora: resultado do preço, preço a partir da margem e simulador. */
import { AlertTriangle, Info, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { calcularReverso, fmtBRL, fmtPct, N, pontoEquilibrioSemanal } from "../../calculos.js";
import { CaixaSemaforo } from "../../componentes/base.jsx";
import { GraficoRoscaPreco } from "../../componentes/GraficoRoscaPreco.jsx";
import { GRADIENTE, useT } from "../../tema.js";

function SemaforoDiagnostico({ diagnostico, r, margemMetaPct }) {
  const map = {
    prejuizo: {
      tom: "perigo",
      label: "Prejuízo",
      frase: `Você está perdendo ${fmtBRL(Math.abs(r.lucroLiquido))} a cada atendimento. ${r.precoMinimo !== null ? `Cobre a partir de ${fmtBRL(r.precoMinimo)} para empatar.` : ""}`,
    },
    apertado: {
      tom: "atencao",
      label: "Apertado",
      frase:
        r.precoIdeal !== null
          ? `Sua margem está ${fmtPct(Math.max(0, N(margemMetaPct) - r.margemLiquidaPct))} abaixo da meta. Para chegar no ideal, cobre ${fmtBRL(r.precoIdeal)}.`
          : "Sua margem está abaixo da meta que você definiu.",
    },
    saudavel: {
      tom: "ok",
      label: "Saudável",
      frase: `Margem líquida de ${fmtPct(r.margemLiquidaPct)}, na meta ou acima dela (${fmtPct(N(margemMetaPct))}).`,
    },
  };
  const s = map[diagnostico];
  return (
    <CaixaSemaforo tom={s.tom} titulo={s.label}>
      <p>{s.frase}</p>
    </CaixaSemaforo>
  );
}

const fmtOuTraco = (v) => (v === null || v === undefined || !Number.isFinite(v) ? "—" : fmtBRL(v));

/* Painel de resultados do Modo B — tudo derivado do preço informado.      */
export function ResultadoReversoCard({ r, margemMetaPct, horas, diasMesNegocio }) {
  const t = useT();
  const [detalheAberto, setDetalheAberto] = useState(false);

  if (r.status === "sem-negocio") return <EstadoResultado icon={Info} text="Configure o negócio primeiro, na aba Negócio." />;
  if (r.status === "sem-preco") {
    return (
      <EstadoResultado
        icon={Info}
        text="Informe o preço que você cobra (ou pretende cobrar) por esse serviço para ver o diagnóstico completo."
      />
    );
  }

  const peMensal = Number.isFinite(r.pontoEquilibrioServico) ? Math.ceil(r.pontoEquilibrioServico) : null;
  const peSemanal = peMensal !== null ? Math.ceil(pontoEquilibrioSemanal(r.pontoEquilibrioServico, diasMesNegocio)) : null;

  return (
    <div className="space-y-3">
      <SemaforoDiagnostico diagnostico={r.diagnostico} r={r} margemMetaPct={margemMetaPct} />

      <div className="rounded-2xl p-5" style={{ backgroundImage: GRADIENTE, color: "#fff" }}>
        <span className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,.85)" }}>
          Preço informado
        </span>
        <p className="font-num text-4xl mt-1 font-bold">{fmtBRL(r.preco)}</p>
        <div className="grid grid-cols-2 gap-3 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,.25)" }}>
          <div>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,.75)" }}>
              Preço mínimo (margem zero)
            </p>
            <p className="font-num text-sm font-medium">{fmtOuTraco(r.precoMinimo)}</p>
          </div>
          <div>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,.75)" }}>
              Preço ideal (meta {fmtPct(N(margemMetaPct))})
            </p>
            <p className="font-num text-sm font-medium">{fmtOuTraco(r.precoIdeal)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px]" style={{ color: t.textMuted }}>
              Lucro bruto
            </p>
            <p className="font-num text-base font-bold" style={{ color: t.text }}>
              {fmtBRL(r.lucroBruto)}
            </p>
          </div>
          <div>
            <p className="text-[11px]" style={{ color: t.textMuted }}>
              Lucro líquido
            </p>
            <p className="font-num text-base font-bold" style={{ color: r.lucroLiquido >= 0 ? t.successText : t.danger }}>
              {fmtBRL(r.lucroLiquido)}
            </p>
          </div>
          <div>
            <p className="text-[11px]" style={{ color: t.textMuted }}>
              Margem líquida
            </p>
            <p className="font-num text-sm font-medium" style={{ color: t.text }}>
              {fmtPct(r.margemLiquidaPct)}
            </p>
          </div>
          <div>
            <p className="text-[11px]" style={{ color: t.textMuted }}>
              Markup aplicado
            </p>
            <p className="font-num text-sm font-medium" style={{ color: t.text }}>
              {r.markup !== null ? `${r.markup.toFixed(2)}×` : "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px]" style={{ color: t.textMuted }}>
              Lucro por hora
            </p>
            <p className="font-num text-sm font-medium" style={{ color: t.text }}>
              {r.lucroPorHora !== null ? `${fmtBRL(r.lucroPorHora)}/h` : "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px]" style={{ color: t.textMuted }}>
              Ponto de equilíbrio
            </p>
            {peMensal !== null ? (
              <p className="font-num text-xs font-medium" style={{ color: t.text }}>
                {peMensal}/mês · {peSemanal}/semana
              </p>
            ) : (
              <p className="font-num text-sm font-medium" style={{ color: t.text }}>
                —
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDetalheAberto(!detalheAberto)}
          className="btn-press text-xs font-medium mt-3"
          style={{ color: t.primaryText }}
          aria-expanded={detalheAberto}
          aria-controls="detalhe-custo-reverso"
        >
          {detalheAberto ? "ocultar detalhamento do custo" : "ver detalhamento do custo"}
        </button>
        {detalheAberto && (
          <div id="detalhe-custo-reverso" className="pop-in mt-2 space-y-1.5 text-xs" style={{ color: t.textMuted }}>
            <div className="flex justify-between">
              <span>Custo fixo rateado ({horas || 0}h)</span>
              <span className="font-num">{fmtBRL(r.custoFixoRateado)}</span>
            </div>
            <div className="flex justify-between">
              <span>Custo variável (insumos)</span>
              <span className="font-num">{fmtBRL(r.totalVariaveis)}</span>
            </div>
            <div className="flex justify-between">
              <span>Comissão</span>
              <span className="font-num">{fmtBRL(r.valorComissao)}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxa de cartão/Pix</span>
              <span className="font-num">{fmtBRL(r.valorTaxaCartao)}</span>
            </div>
            <div className="flex justify-between">
              <span>Impostos</span>
              <span className="font-num">{fmtBRL(r.valorImposto)}</span>
            </div>
            <div className="flex justify-between font-semibold pt-1.5" style={{ borderTop: `1px solid ${t.border}`, color: t.text }}>
              <span>Custo total</span>
              <span className="font-num">{fmtBRL(r.custoTotal)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* Simulador de sensibilidade — colapsado, slider ±30% do preço informado. */
export function SimuladorSensibilidade({
  precoBase,
  custosVariaveis,
  comissaoPct,
  taxaCartaoPct,
  parcelaParceiroPct = 0,
  horasPorAtendimento,
  atendimentosMes,
  nd,
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [precoSimulado, setPrecoSimulado] = useState(precoBase || 0);

  useEffect(() => {
    setPrecoSimulado(precoBase || 0);
  }, [precoBase]);

  if (!precoBase || precoBase <= 0) return null;

  const min = Math.max(0, precoBase * 0.7);
  const max = precoBase * 1.3;
  const r = calcularReverso(
    {
      custosVariaveis,
      comissaoPct,
      taxaCartaoPct,
      parcelaParceiroPct,
      precoCobrado: precoSimulado,
      horasPorAtendimento,
      atendimentosMes,
      margemMetaPct: 0,
    },
    nd,
  );

  return (
    <div className="rounded-2xl p-5" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="btn-press flex items-center justify-between w-full"
        aria-expanded={aberto}
        aria-controls="simulador-sensibilidade"
      >
        <span className="text-sm font-semibold" style={{ color: t.text }}>
          Simulador de sensibilidade
        </span>
        <span className="text-xs font-medium" style={{ color: t.primaryText }}>
          {aberto ? "ocultar" : "explorar"}
        </span>
      </button>
      {aberto && (
        <div id="simulador-sensibilidade" className="pop-in mt-3">
          <label className="sr-only" htmlFor="slider-preco-simulado">
            Simular outro preço para este serviço
          </label>
          <input
            id="slider-preco-simulado"
            type="range"
            min={min}
            max={max}
            step="0.5"
            value={precoSimulado}
            onChange={(e) => setPrecoSimulado(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] mt-1" style={{ color: t.textMuted }}>
            <span>{fmtBRL(min)}</span>
            <span>{fmtBRL(max)}</span>
          </div>
          {r.status === "ok" && (
            <div className="mt-3 rounded-xl p-3" style={{ background: t.surfaceAlt }}>
              <p className="font-num text-lg font-bold" style={{ color: t.text }}>
                {fmtBRL(precoSimulado)}
              </p>
              <p className="text-xs mt-1" style={{ color: t.textMuted }}>
                Lucro líquido:{" "}
                <span className="font-num font-medium" style={{ color: r.lucroLiquido >= 0 ? t.successText : t.danger }}>
                  {fmtBRL(r.lucroLiquido)}
                </span>
                {" · "}Margem: <span className="font-num font-medium">{fmtPct(r.margemLiquidaPct)}</span>
              </p>
              <p className="text-xs mt-1.5" style={{ color: t.textMuted }}>
                Se cobrar {fmtBRL(precoSimulado)}, você ganha{" "}
                <b className="font-num" style={{ color: t.text }}>
                  {fmtBRL(r.lucroProjetadoMes)}
                </b>{" "}
                por mês fazendo {N(atendimentosMes)} atendimentos.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ResultadoCard({ resultado, diasMesNegocio }) {
  const t = useT();
  if (resultado.status === "sem-volume") {
    return (
      <EstadoResultado
        icon={Info}
        text="Informe quantos atendimentos você espera fazer por mês para eu ratear os custos fixos e calcular o preço."
      />
    );
  }
  if (resultado.status === "sem-custo") {
    return (
      <EstadoResultado
        icon={Info}
        text="Adicione ao menos um custo variável, ou informe horas por atendimento maior que zero, para calcular."
      />
    );
  }
  if (resultado.status === "trava-percentual") {
    return (
      <div className="rounded-2xl p-5 pop-in" style={{ background: t.dangerSoft, border: `1px solid ${t.danger}55` }}>
        <div className="flex gap-2 items-start" style={{ color: t.danger }}>
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Trava matemática: cálculo impossível</p>
            <p className="text-sm mt-1">
              Comissão + taxa de cartão + imposto + margem desejada somam {fmtPct(resultado.soma)} do preço. Isso precisa ficar abaixo de
              100%.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const dados = [
    { name: "Custo fixo rateado", value: resultado.custoFixoRateado, color: t.textMuted },
    { name: "Custo variável", value: resultado.totalVariaveis, color: t.secondary },
    { name: "Comissão", value: resultado.valorComissao, color: t.primary },
    { name: "Taxa cartão", value: resultado.valorTaxaCartao, color: t.warning },
    { name: "Imposto", value: resultado.valorImposto, color: t.danger },
    { name: "Margem/lucro", value: resultado.valorMargem, color: t.success },
  ].filter((d) => d.value > 0.005);

  return (
    <div className="pop-in rounded-2xl p-5" style={{ backgroundImage: GRADIENTE, color: "#fff" }}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,.85)" }}>
          Preço sugerido
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
          style={{ background: "rgba(255,255,255,.2)", color: "#fff" }}
        >
          <Sparkles size={12} /> Preço Justo
        </span>
      </div>
      <p className="font-num text-4xl mt-1 font-bold">{fmtBRL(resultado.preco)}</p>

      <div className="mt-4 space-y-1.5">
        {dados.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <div style={{ width: 8, height: 8, borderRadius: 99, background: d.color }} />
            <span className="text-xs flex-1" style={{ color: "rgba(255,255,255,.85)" }}>
              {d.name}
            </span>
            <span className="font-num text-xs">{fmtBRL(d.value)}</span>
          </div>
        ))}
        <div className="h-2 rounded-full overflow-hidden flex mt-2" style={{ background: "rgba(0,0,0,.2)" }}>
          {dados.map((d) => (
            <div key={d.name} style={{ width: `${(d.value / resultado.preco) * 100}%`, background: d.color }} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,.25)" }}>
        <div>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,.75)" }}>
            Margem de contribuição
          </p>
          <p className="font-num text-sm mt-0.5 font-medium">{fmtBRL(resultado.margemContribuicaoUnitaria)} / atend.</p>
        </div>
        <div>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,.75)" }}>
            Lucro projetado/mês
          </p>
          <p className="font-num text-sm mt-0.5 font-medium">{fmtBRL(resultado.lucroProjetadoMes)}</p>
        </div>
        <div className="col-span-2 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,.2)" }}>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,.75)" }}>
            Ponto de equilíbrio deste serviço
          </p>
          <p className="font-num text-sm mt-0.5 font-medium">
            {Number.isFinite(resultado.pontoEquilibrioServico) ? `${Math.ceil(resultado.pontoEquilibrioServico)} atend./mês` : "—"}
            {" · "}
            {Number.isFinite(resultado.pontoEquilibrioServico)
              ? `${Math.ceil(pontoEquilibrioSemanal(resultado.pontoEquilibrioServico, diasMesNegocio))} atend./semana`
              : "—"}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,.65)" }}>
            se só esse serviço existisse, cobriria o custo fixo do negócio inteiro
          </p>
        </div>
      </div>
    </div>
  );
}

export function DecomposicaoCard({ materiais, custoFixo, taxas, lucro, preco }) {
  const t = useT();
  return (
    <div className="rounded-2xl p-5" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
      <p className="text-sm font-semibold mb-3" style={{ color: t.text }}>
        Pra onde vai cada real
      </p>
      <GraficoRoscaPreco materiais={materiais} custoFixo={custoFixo} taxas={taxas} lucro={lucro} preco={preco} />
    </div>
  );
}

function EstadoResultado({ icon: Icon, text }) {
  const t = useT();
  return (
    <div className="rounded-2xl p-8 text-center" style={{ background: t.surfaceAlt, border: `1px dashed ${t.border}` }}>
      <Icon size={20} className="mx-auto mb-2" style={{ color: t.textMuted }} />
      <p className="text-sm" style={{ color: t.textMuted }}>
        {text}
      </p>
    </div>
  );
}
