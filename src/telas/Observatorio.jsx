/* Aba Observatório (carregada sob demanda, Bloco 21): concorrentes, preços
   anotados e mapa. */
import { AlertTriangle, CalendarCheck, CheckCircle2, Download, Info, MapPin, Pencil, Plus, Trash2, TrendingUp } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { lerComFallback, lerRascunho, salvarComFallback, uid } from "../armazenamento.js";
import {
  calcularParaExibicao,
  DIAS_PRECO_ANTIGO,
  diasDesde,
  distanciaKm,
  FONTES_PRECO,
  fmtBRL,
  fmtPct,
  linhasPlanilhaObservatorio,
  N,
  pisoDoServico,
  posicaoNaConcorrencia,
  ultimoPrecoPorConcorrente,
} from "../calculos.js";
import { Girando, Selo, SkeletonBlock, SkeletonCard, useAcaoComProgresso, useToast } from "../componentes/base.jsx";
import { Ajuda, CAMPO, Campo, CampoMoeda } from "../componentes/campos.jsx";
import { AvisoRascunhoRecuperado, useRascunho } from "../componentes/salvamento.jsx";
import { COLETA_ESTABELECIMENTOS, ESTABELECIMENTOS_REAIS } from "../dados/referencias.js";
import { anexarAbasObservatorio, carregarXLSX, lerJSON } from "../planilhas.js";
import { TOKENS, useT } from "../tema.js";
import { VERSAO_APP } from "../versao.js";

/* ======================================================================= */
/* Aba: Observatório                                                       */
/* ======================================================================= */
/* ======================================================================= */
/* Observatório (Bloco 6): mapa da concorrência, preços anotados pelo       */
/* próprio usuário e comparação com os preços dele. Nada aqui é estimado:  */
/* os concorrentes, as posições e os preços são os que o usuário informou, */
/* sempre com data. Tudo fica no aparelho (chaves "observatorio:*").       */
/* ======================================================================= */
const MapaConcorrencia = React.lazy(() => import("../MapaConcorrencia.jsx"));

/* Centro inicial do mapa em cada cidade (só posiciona a vista; não é dado  */
/* exibido). Coordenadas das páginas da Wikipédia de cada município,       */
/* consultadas em 10/10/2026. Irará entra como cidade de testes do app.    */
const CIDADES_OBSERVATORIO = [
  { id: "Feira de Santana", centro: [-12.2667, -38.9667], zoom: 13 },
  { id: "Irará", centro: [-12.0458, -38.7658], zoom: 15 },
  { id: "Salvador", centro: [-12.9711, -38.5108], zoom: 12 },
];
const TIPOS_CONCORRENTE = ["Salão", "Barbearia", "Outro"];
const RAIOS_KM = [null, 1, 3, 5];

const pad2 = (n) => String(n).padStart(2, "0");
const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const fmtDataBR = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR") : "");

const fmtKm = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`);

function BotaoSegmento({ ativo, onClick, children, ...rest }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      {...rest}
      className="btn-press rounded-md px-2.5 py-1.5 text-xs font-medium leading-snug"
      style={{
        background: ativo ? t.surface : "transparent",
        color: ativo ? t.text : t.textMuted,
        boxShadow: ativo ? t.shadow : "none",
        border: `1px solid ${ativo ? t.border : "transparent"}`,
        transition: "background .18s ease, color .18s ease",
      }}
    >
      {children}
    </button>
  );
}

/* Faixa de preços de um serviço: cada ponto é um concorrente; o losango é  */
/* o preço do usuário; o traço tracejado, o piso dele (sem lucro).          */
function FaixaPrecos({ seu, piso, observacoes, med }) {
  const t = useT();
  const valores = [...observacoes.map((o) => o.valor), seu, ...(piso ? [piso] : [])];
  const lo = Math.min(...valores);
  const hi = Math.max(...valores);
  const folga = (hi - lo) * 0.08 || hi * 0.1 || 1;
  const a = lo - folga;
  const b = hi + folga;
  const frac = (v) => ((v - a) / (b - a)) * 100;
  const pos = (v) => `${frac(v)}%`;
  const min = Math.min(...observacoes.map((o) => o.valor));
  const max = Math.max(...observacoes.map((o) => o.valor));
  // Rótulo embaixo do ponto, sem sair da faixa nas pontas.
  const rotulo = (v) => {
    const f = frac(v);
    return { left: `${f}%`, transform: f < 12 ? "translateX(0)" : f > 88 ? "translateX(-100%)" : "translateX(-50%)" };
  };
  return (
    <div className="mt-3 max-w-[42rem]" aria-hidden="true">
      <div className="relative h-10">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full" style={{ background: t.border }} />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full"
          style={{
            left: pos(min),
            width: `calc(${pos(max)} - ${pos(min)})`,
            background: t.secondarySoft,
            transition: "left .4s ease, width .4s ease",
          }}
        />
        {piso && (
          <div
            className="absolute top-1 bottom-1"
            title={`Seu piso: ${fmtBRL(piso)}`}
            style={{ left: pos(piso), borderLeft: `2px dashed ${t.danger}`, transition: "left .4s ease" }}
          />
        )}
        <div
          className="absolute top-1.5 bottom-1.5 w-0.5 rounded"
          title={`Mediana: ${fmtBRL(med)}`}
          style={{ left: pos(med), background: t.secondaryText, transition: "left .4s ease" }}
        />
        {observacoes.map((o) => (
          <div
            key={o.concorrente.id}
            className="absolute top-1/2 rounded-full pop-in"
            title={`${o.concorrente.nome}: ${fmtBRL(o.valor)}`}
            style={{
              left: pos(o.valor),
              width: 10,
              height: 10,
              transform: "translate(-50%, -50%)",
              background: t.secondary,
              border: `2px solid ${t.surface}`,
              transition: "left .4s ease",
            }}
          />
        ))}
        <div
          className="absolute top-1/2 pop-in"
          title={`Seu preço: ${fmtBRL(seu)}`}
          style={{
            left: pos(seu),
            width: 14,
            height: 14,
            transform: "translate(-50%, -50%) rotate(45deg)",
            background: t.warning,
            border: `2px solid ${t.text}`,
            borderRadius: 3,
            transition: "left .4s ease",
          }}
        />
      </div>
      <div className="relative h-4 text-[10px] font-num" style={{ color: t.textMuted }}>
        <span className="absolute whitespace-nowrap" style={{ ...rotulo(min), transition: "left .4s ease" }}>
          {fmtBRL(min)}
        </span>
        {max !== min && (
          <span className="absolute whitespace-nowrap" style={{ ...rotulo(max), transition: "left .4s ease" }}>
            {fmtBRL(max)}
          </span>
        )}
      </div>
    </div>
  );
}

function LegendaPonto({ cor, forma = "circulo", borda, children }) {
  const t = useT();
  const estilo =
    forma === "losango"
      ? { width: 10, height: 10, background: cor, border: `2px solid ${t.text}`, borderRadius: 2, transform: "rotate(45deg)" }
      : forma === "traco"
        ? { width: 0, height: 12, borderLeft: `2px dashed ${cor}` }
        : { width: 10, height: 10, background: cor, borderRadius: 999, border: `2px solid ${borda || t.surface}` };
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: t.textMuted }}>
      <span aria-hidden="true" style={{ display: "inline-block", flexShrink: 0, ...estilo }} />
      {children}
    </span>
  );
}

/* Comparação de um serviço do usuário com os preços anotados. */
function ComparacaoServico({ s, seu, piso, observacoes }) {
  const t = useT();
  const { chave, texto, difPct, med, min, max } = posicaoNaConcorrencia(
    seu,
    observacoes.map((o) => o.valor),
  );
  const antigos = observacoes.filter((o) => diasDesde(o.data) > DIAS_PRECO_ANTIGO).length;
  const cores =
    chave === "mediana"
      ? { cor: t.successText, bg: t.successSoft }
      : chave.endsWith("todos")
        ? { cor: t.warningText, bg: t.warningSoft }
        : { cor: t.secondaryText, bg: t.secondarySoft };
  const posicao = { texto, ...cores };
  const plural = observacoes.length === 1 ? "concorrente" : "concorrentes";
  return (
    <div className="fade-up rounded-xl p-3" style={{ background: t.surfaceAlt }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold min-w-0" style={{ color: t.text }}>
          {s.nome}
        </p>
        <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: posicao.bg, color: posicao.cor }}>
          {posicao.texto}
        </span>
      </div>
      <p className="text-xs mt-1" style={{ color: t.textMuted }}>
        Seu preço,{" "}
        <b className="font-num" style={{ color: t.text }}>
          {fmtBRL(seu)}
        </b>
        {Math.abs(difPct) >= 2.5 && (
          <>
            , está {fmtPct(Math.abs(difPct), 0)} {difPct < 0 ? "abaixo" : "acima"} da mediana
          </>
        )}{" "}
        de {observacoes.length} {plural}:{" "}
        <b className="font-num" style={{ color: t.text }}>
          {fmtBRL(med)}
        </b>
        {observacoes.length > 1 && (
          <>
            {" "}
            (de {fmtBRL(min)} a {fmtBRL(max)})
          </>
        )}
        .
        {piso && (
          <>
            {" "}
            Seu piso, sem lucro, é{" "}
            <b className="font-num" style={{ color: t.text }}>
              {fmtBRL(piso)}
            </b>
            .
          </>
        )}
      </p>
      <FaixaPrecos seu={seu} piso={piso} observacoes={observacoes} med={med} />
      {piso && med < piso && (
        <p className="text-[11px] mt-2 flex items-start gap-1" style={{ color: t.danger }}>
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <span>
            A mediana da concorrência ({fmtBRL(med)}) fica abaixo do seu piso ({fmtBRL(piso)}), o preço que só cobre os seus custos. Baixar
            até ela daria prejuízo: revise custos e tempo do serviço ou mostre o que o seu tem de diferente.
          </span>
        </p>
      )}
      {piso && seu < piso && med >= piso && (
        <p className="text-[11px] mt-2 flex items-start gap-1" style={{ color: t.danger }}>
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <span>Seu preço está abaixo do seu piso ({fmtBRL(piso)}): cada atendimento dá prejuízo.</span>
        </p>
      )}
      {(observacoes.length < 3 || antigos > 0) && (
        <p className="text-[11px] mt-2" style={{ color: t.textMuted }}>
          {observacoes.length < 3 && "Poucas observações: use a comparação só como indicativo. "}
          {antigos > 0 &&
            `${antigos} preço${antigos > 1 ? "s" : ""} anotado${antigos > 1 ? "s" : ""} há mais de 6 meses: vale conferir de novo.`}
        </p>
      )}
    </div>
  );
}

/* Formulário de um concorrente (novo ou edição). */
const CHAVE_RASCUNHO_CONCORRENTE = "rascunho:observatorio:concorrente";
const CHAVE_RASCUNHO_PRECO = "rascunho:observatorio:preco";

function FormularioConcorrente({ rascunho, setRascunho, onSalvar, onCancelar, recuperado }) {
  const t = useT();
  const campoStyle = { background: t.surface, border: `1px solid ${t.border}`, color: t.text };
  const valido = (rascunho.nome || "").trim().length > 0;
  return (
    <div className="pop-in rounded-xl p-3 space-y-2.5" style={{ background: t.primarySoft }}>
      <p className="text-xs font-semibold" style={{ color: t.primaryText }}>
        {rascunho.id
          ? "Editar concorrente"
          : rascunho.lat != null
            ? "Novo concorrente no ponto marcado"
            : "Novo concorrente (sem posição no mapa)"}
      </p>
      {recuperado && <AvisoRascunhoRecuperado />}
      <Campo label="Nome">
        <input
          className={CAMPO}
          style={campoStyle}
          value={rascunho.nome || ""}
          placeholder="ex.: Barbearia do Zé"
          // biome-ignore lint/a11y/noAutofocus: o formulário abre por ação da pessoa (marcar no mapa ou "adicionar"), então o foco vai para o nome
          autoFocus
          onChange={(e) => setRascunho({ ...rascunho, nome: e.target.value })}
        />
      </Campo>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Tipo">
          <select
            className={CAMPO}
            style={campoStyle}
            value={rascunho.tipo || "Salão"}
            onChange={(e) => setRascunho({ ...rascunho, tipo: e.target.value })}
          >
            {TIPOS_CONCORRENTE.map((tp) => (
              <option key={tp} value={tp}>
                {tp}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Bairro (opcional)">
          <input
            className={`${CAMPO} min-w-0`}
            style={campoStyle}
            value={rascunho.bairro || ""}
            onChange={(e) => setRascunho({ ...rascunho, bairro: e.target.value })}
          />
        </Campo>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={onSalvar}
          disabled={!valido}
          className="btn-press touch-target rounded-lg px-3 py-2 text-xs font-semibold"
          style={{
            background: valido ? t.primaryText : t.border,
            color: valido ? t.onPrimary : t.textMuted,
            cursor: valido ? "pointer" : "not-allowed",
          }}
        >
          Salvar concorrente
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="btn-press touch-target rounded-lg px-3 py-2 text-xs font-medium"
          style={{ color: t.textMuted }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* Formulário para anotar um preço visto num concorrente. */
function FormularioPreco({ concorrenteId, servicos, onSalvar, onCancelar }) {
  const t = useT();
  const campoStyle = { background: t.surface, border: `1px solid ${t.border}`, color: t.text };
  const [servicoId, setServicoId] = useState(servicos[0]?.id || "outro");
  const [servicoNome, setServicoNome] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hojeISO());
  const [fonte, setFonte] = useState("local");
  // Rascunho (Bloco 13): um preço sendo anotado por vez.
  const { recuperado, descartar } = useRascunho(
    CHAVE_RASCUNHO_PRECO,
    { concorrenteId, servicoId, servicoNome, valor, data, fonte },
    {
      aoRecuperar: (d) => {
        if (d.concorrenteId !== concorrenteId) return false;
        setServicoId(d.servicoId === "outro" || servicos.some((s) => s.id === d.servicoId) ? d.servicoId : servicos[0]?.id || "outro");
        setServicoNome(d.servicoNome ?? "");
        setValor(d.valor ?? "");
        setData(d.data || hojeISO());
        setFonte(d.fonte || "local");
        return true;
      },
    },
  );
  const nomeFinal = servicoId === "outro" ? servicoNome.trim() : servicos.find((s) => s.id === servicoId)?.nome || "";
  const dataValida = data && data <= hojeISO();
  const valido = N(valor) > 0 && nomeFinal && dataValida;
  return (
    <div className="pop-in rounded-xl p-3 space-y-2.5 mt-2" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
      {recuperado && <AvisoRascunhoRecuperado />}
      <Campo
        label="Serviço"
        hint={
          servicoId !== "outro"
            ? "Ligado ao seu serviço de mesmo nome: entra na comparação."
            : "Sem ligação com um serviço seu: fica anotado, mas não entra na comparação."
        }
      >
        <select className={CAMPO} style={campoStyle} value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
          {servicos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
          <option value="outro">Outro serviço…</option>
        </select>
      </Campo>
      {servicoId === "outro" && (
        <Campo label="Nome do serviço">
          <input className={CAMPO} style={campoStyle} value={servicoNome} onChange={(e) => setServicoNome(e.target.value)} />
        </Campo>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Preço cobrado">
          <CampoMoeda value={valor} onChange={setValor} />
        </Campo>
        <Campo label="Quando você viu">
          <input
            type="date"
            className={`${CAMPO} min-w-0`}
            style={campoStyle}
            value={data}
            max={hojeISO()}
            onChange={(e) => setData(e.target.value)}
          />
        </Campo>
      </div>
      <Campo label="Onde você viu">
        <select className={CAMPO} style={campoStyle} value={fonte} onChange={(e) => setFonte(e.target.value)}>
          {FONTES_PRECO.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </Campo>
      {!dataValida && (
        <p className="text-[11px]" style={{ color: t.danger }}>
          A data não pode ser no futuro.
        </p>
      )}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          disabled={!valido}
          onClick={() => {
            descartar();
            onSalvar({
              id: uid(),
              servicoId: servicoId === "outro" ? null : servicoId,
              servicoNome: nomeFinal,
              valor: N(valor),
              data,
              fonte,
            });
          }}
          className="btn-press touch-target rounded-lg px-3 py-2 text-xs font-semibold"
          style={{
            background: valido ? t.primaryText : t.border,
            color: valido ? t.onPrimary : t.textMuted,
            cursor: valido ? "pointer" : "not-allowed",
          }}
        >
          Salvar preço
        </button>
        <button
          type="button"
          onClick={() => {
            descartar();
            onCancelar();
          }}
          className="btn-press touch-target rounded-lg px-3 py-2 text-xs font-medium"
          style={{ color: t.textMuted }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* Um concorrente anotado, com os preços dele. */
function ItemConcorrente({
  c,
  distancia,
  servicos,
  selecionado,
  onSelecionar,
  onAtualizar,
  onExcluir,
  onEditar,
  onMover,
  anotandoInicial = false,
}) {
  const t = useT();
  const [anotando, setAnotando] = useState(anotandoInicial);
  const [confirmando, setConfirmando] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (selecionado) ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selecionado]);
  const precos = [...(c.precos || [])].sort((a, b) => (a.data < b.data ? 1 : -1));
  const corTipo =
    c.tipo === "Salão"
      ? { bg: t.successSoft, fg: t.successText }
      : c.tipo === "Barbearia"
        ? { bg: t.primarySoft, fg: t.primaryText }
        : { bg: t.secondarySoft, fg: t.secondaryText };
  return (
    <div
      ref={ref}
      className="fade-up rounded-xl p-3"
      style={{
        background: t.surfaceAlt,
        border: `1px solid ${selecionado ? t.primaryText : "transparent"}`,
        transition: "border-color .2s ease",
      }}
    >
      <button type="button" onClick={onSelecionar} className="btn-press w-full text-left" aria-expanded={selecionado}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold min-w-0" style={{ color: t.text }}>
            {c.nome}
          </p>
          <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: corTipo.bg, color: corTipo.fg }}>
            {c.tipo}
          </span>
        </div>
        <p className="text-[11px] mt-0.5" style={{ color: t.textMuted }}>
          {[c.bairro, distancia != null ? `${fmtKm(distancia)} do seu negócio` : null, c.lat == null ? "sem posição no mapa" : null]
            .filter(Boolean)
            .join(" · ") || "sem bairro informado"}
          {" · "}
          {precos.length} preço{precos.length === 1 ? "" : "s"} anotado{precos.length === 1 ? "" : "s"}
        </p>
      </button>
      {selecionado && (
        <div className="pop-in mt-2 space-y-2">
          {precos.length > 0 && (
            <ul className="space-y-1">
              {precos.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 text-xs rounded-lg px-2 py-1.5"
                  style={{ background: t.surface }}
                >
                  <span className="min-w-0" style={{ color: t.text }}>
                    {p.servicoNome}
                    <span className="block text-[10px]" style={{ color: t.textMuted }}>
                      {fmtDataBR(p.data)} · {FONTES_PRECO.find((f) => f.id === p.fonte)?.label || "Outro"}
                      {!p.servicoId || !servicos.some((s) => s.id === p.servicoId) ? " · fora da comparação" : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    <b className="font-num" style={{ color: t.text }}>
                      {fmtBRL(p.valor)}
                    </b>
                    <button
                      type="button"
                      onClick={() => onAtualizar({ ...c, precos: c.precos.filter((x) => x.id !== p.id) })}
                      className="btn-press touch-target"
                      style={{ color: t.danger }}
                      aria-label={`Apagar preço de ${p.servicoNome}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {anotando ? (
            <FormularioPreco
              concorrenteId={c.id}
              servicos={servicos}
              onCancelar={() => setAnotando(false)}
              onSalvar={(preco) => {
                onAtualizar({ ...c, precos: [...(c.precos || []), preco] });
                setAnotando(false);
              }}
            />
          ) : (
            <div className="flex gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setAnotando(true)}
                className="btn-press inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1.5"
                style={{ color: t.primaryText, background: t.primarySoft }}
              >
                <Plus size={13} /> anotar preço
              </button>
              <button
                type="button"
                onClick={onMover}
                className="btn-press inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1.5"
                style={{ color: t.textMuted, background: t.surface }}
              >
                <MapPin size={13} /> {c.lat == null ? "marcar no mapa" : "mudar posição"}
              </button>
              <button
                type="button"
                onClick={onEditar}
                className="btn-press inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1.5"
                style={{ color: t.textMuted, background: t.surface }}
              >
                <Pencil size={13} /> editar
              </button>
              {!confirmando ? (
                <button
                  type="button"
                  onClick={() => setConfirmando(true)}
                  className="btn-press inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1.5"
                  style={{ color: t.danger, background: t.surface }}
                >
                  <Trash2 size={13} /> excluir
                </button>
              ) : (
                <span
                  className="pop-in inline-flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5"
                  style={{ background: t.dangerSoft, color: t.danger }}
                >
                  Excluir com os preços?
                  <button type="button" onClick={onExcluir} className="btn-press font-semibold underline">
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmando(false)}
                    className="btn-press underline"
                    style={{ color: t.textMuted }}
                  >
                    Não
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Observatorio({ servicos, nd, cidadePerfil }) {
  const t = useT();
  const escuro = t.bg === TOKENS.escuro.bg;
  const cidadeInicial =
    CIDADES_OBSERVATORIO.find((c) => c.id.toLowerCase() === (cidadePerfil || "").trim().toLowerCase())?.id || "Feira de Santana";
  const [cidade, setCidade] = useState(cidadeInicial);
  const [filtro, setFiltro] = useState("Todos");
  const [carregado, setCarregado] = useState(false);
  const [concorrentes, setConcorrentes] = useState([]);
  const [meusLocais, setMeusLocais] = useState({});
  const [raioKm, setRaioKm] = useState(null);
  const [marcando, setMarcando] = useState(null); // { tipo: 'meu-local' } | { tipo: 'novo', base } | { tipo: 'mover', id }
  const [rascunho, setRascunho] = useState(null);
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [precoPendenteId, setPrecoPendenteId] = useState(null); // concorrente com preço sendo anotado (rascunho)
  // Rascunho do concorrente sendo cadastrado ou editado (Bloco 13).
  const { recuperado: concorrenteRecuperado } = useRascunho(CHAVE_RASCUNHO_CONCORRENTE, rascunho ? { cidade, rascunho } : null, {
    aoRecuperar: (d) => {
      if (!d?.rascunho) return false;
      if (CIDADES_OBSERVATORIO.some((c) => c.id === d.cidade)) setCidade(d.cidade);
      setRascunho(d.rascunho);
      return true;
    },
  });
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
  const { show, node: toastNode } = useToast();

  useEffect(() => {
    let vivo = true;
    Promise.all([
      lerComFallback("observatorio:concorrentes"),
      lerComFallback("observatorio:meus-locais"),
      lerRascunho(CHAVE_RASCUNHO_PRECO),
    ]).then(([c, l, rp]) => {
      if (!vivo) return;
      const lista = lerJSON(c, []);
      const locais = lerJSON(l, {});
      setConcorrentes(Array.isArray(lista) ? lista : []);
      setMeusLocais(locais && typeof locais === "object" ? locais : {});
      // Havia um preço sendo anotado? Abre o concorrente com o formulário (Bloco 13).
      const comPreco = Array.isArray(lista) && rp?.concorrenteId ? lista.find((x) => x.id === rp.concorrenteId) : null;
      if (comPreco) {
        setCidade(comPreco.cidade);
        setSelecionadoId(comPreco.id);
        setPrecoPendenteId(comPreco.id);
      }
      setCarregado(true);
    });
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      vivo = false;
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const salvarConcorrentes = (lista) => {
    setConcorrentes(lista);
    salvarComFallback("observatorio:concorrentes", JSON.stringify(lista));
  };
  const salvarMeusLocais = (locais) => {
    setMeusLocais(locais);
    salvarComFallback("observatorio:meus-locais", JSON.stringify(locais));
  };

  const cfgCidade = CIDADES_OBSERVATORIO.find((c) => c.id === cidade);
  const meuLocal = meusLocais[cidade] || null;
  const raioAtivo = meuLocal ? raioKm : null;

  const daCidade = useMemo(
    () =>
      concorrentes
        .filter((c) => c.cidade === cidade)
        .map((c) => {
          const distancia = meuLocal && c.lat != null ? distanciaKm(meuLocal, c) : null;
          const foraDoRaio = raioAtivo != null && (distancia == null || distancia > raioAtivo);
          return { ...c, distancia, foraDoRaio };
        })
        .sort((a, b) => (a.distancia ?? Infinity) - (b.distancia ?? Infinity) || a.nome.localeCompare(b.nome)),
    [concorrentes, cidade, meuLocal, raioAtivo],
  );
  const considerados = daCidade.filter((c) => !c.foraDoRaio);

  const corDoTipo = useCallback((tipo) => (tipo === "Salão" ? t.success : tipo === "Barbearia" ? t.primary : t.secondary), [t]);

  // Comparação: serviços do usuário com preço calculado e pelo menos um preço anotado.
  const comparacoes = useMemo(
    () =>
      (servicos || [])
        .map((s) => {
          const calc = nd ? calcularParaExibicao(s, nd) : { status: "sem-negocio" };
          if (calc.status !== "ok") return null;
          const observacoes = ultimoPrecoPorConcorrente(considerados, s.id);
          if (observacoes.length === 0) return null;
          return { s, seu: calc.preco, piso: pisoDoServico(s, nd), observacoes };
        })
        .filter(Boolean)
        .sort((a, b) => a.s.nome.localeCompare(b.s.nome, "pt-BR")),
    [servicos, nd, considerados],
  );

  // Planilha só do Observatório, com todas as cidades (Bloco 10).
  const [baixarPlanilha, gerandoPlanilha] = useAcaoComProgresso(async () => {
    const XLSX = await carregarXLSX();
    const wb = XLSX.utils.book_new();
    const hoje = new Date();
    const sobre = XLSX.utils.aoa_to_sheet([
      ["Observatório de concorrentes — Preço Justo"],
      [`Exportado em ${hoje.toLocaleDateString("pt-BR")}, versão ${VERSAO_APP}.`],
      ["Concorrentes, posições e preços foram anotados por você no app, cada preço com a data e o lugar onde foi visto."],
      ["A comparação usa o preço mais recente de cada concorrente, a mediana e o seu piso (preço com margem zero), como na tela."],
      ["Preços com mais de 6 meses podem ter mudado: confira antes de decidir."],
    ]);
    sobre["!cols"] = [{ wch: 110 }];
    XLSX.utils.book_append_sheet(wb, sobre, "Sobre");
    anexarAbasObservatorio(XLSX, wb, linhasPlanilhaObservatorio(concorrentes, meusLocais, servicos || [], nd, hoje));
    XLSX.writeFile(
      wb,
      `preco-justo-observatorio-${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}.xlsx`,
    );
    show("Planilha baixada.");
  });

  const iniciarMarcacao = (m) => {
    setMarcando(m);
    setRascunho(null);
  };
  const aoMarcar = ({ lat, lng }) => {
    if (!marcando) return;
    if (marcando.tipo === "meu-local") {
      salvarMeusLocais({ ...meusLocais, [cidade]: { lat, lng } });
      show("Seu negócio foi marcado no mapa.");
    } else if (marcando.tipo === "mover") {
      salvarConcorrentes(concorrentes.map((c) => (c.id === marcando.id ? { ...c, lat, lng } : c)));
      show("Posição atualizada.");
    } else {
      setRascunho({ tipo: "Salão", ...(marcando.base || {}), lat, lng });
    }
    setMarcando(null);
  };
  const salvarRascunho = () => {
    const r = { ...rascunho, nome: rascunho.nome.trim(), bairro: (rascunho.bairro || "").trim() };
    if (r.id) {
      salvarConcorrentes(concorrentes.map((c) => (c.id === r.id ? { ...c, nome: r.nome, tipo: r.tipo, bairro: r.bairro } : c)));
      show("Concorrente atualizado.");
    } else {
      const novo = {
        id: uid(),
        cidade,
        nome: r.nome,
        tipo: r.tipo || "Salão",
        bairro: r.bairro,
        lat: r.lat ?? null,
        lng: r.lng ?? null,
        precos: [],
        criadoEm: Date.now(),
      };
      salvarConcorrentes([...concorrentes, novo]);
      setSelecionadoId(novo.id);
      show("Concorrente salvo. Agora anote os preços dele.");
    }
    setRascunho(null);
  };

  // Estabelecimentos da coleta de referência (Google Maps, sem posição exata).
  const referencia = ESTABELECIMENTOS_REAIS.filter((e) => e.cidade === cidade && (filtro === "Todos" || e.tipo === filtro));
  const porBairro = useMemo(() => {
    const map = {};
    ESTABELECIMENTOS_REAIS.filter((e) => e.cidade === cidade).forEach((e) => {
      map[e.bairro] = (map[e.bairro] || 0) + 1;
    });
    return Object.entries(map)
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total);
  }, [cidade]);

  const cardStyle = { background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow };
  const textoMarcacao = !marcando
    ? null
    : marcando.tipo === "meu-local"
      ? "Toque no mapa onde fica o seu negócio."
      : marcando.tipo === "mover"
        ? `Toque no novo ponto de ${concorrentes.find((c) => c.id === marcando.id)?.nome || "concorrente"}.`
        : `Toque no mapa onde fica ${marcando.base?.nome || "o concorrente"}.`;

  if (!carregado) {
    return (
      <div className="space-y-4" aria-busy="true">
        <SkeletonBlock h={34} w="70%" />
        <SkeletonBlock h={320} radius={16} />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div
          className="flex gap-1 p-1 rounded-lg w-fit max-w-full flex-wrap"
          role="radiogroup"
          aria-label="Cidade"
          style={{ background: t.surfaceAlt }}
        >
          {CIDADES_OBSERVATORIO.map((c) => (
            <BotaoSegmento
              key={c.id}
              ativo={cidade === c.id}
              role="radio"
              aria-checked={cidade === c.id}
              onClick={() => {
                setCidade(c.id);
                setMarcando(null);
                setRascunho(null);
                setSelecionadoId(null);
              }}
            >
              {c.id}
            </BotaoSegmento>
          ))}
        </div>
        <p className="text-xs" style={{ color: t.textMuted }}>
          Marque no mapa o seu negócio e os concorrentes que você conhece, e anote os preços que eles cobram (com a data em que você viu). O
          app compara com os seus preços. Tudo fica salvo só neste aparelho.
        </p>
      </div>

      {/* ---------- Mapa ---------- */}
      <div className="rounded-2xl p-4 space-y-3 min-w-0" style={cardStyle}>
        <div className="flex items-center gap-1.5">
          <MapPin size={15} style={{ color: t.primaryText }} />
          <p className="text-sm font-semibold" style={{ color: t.text }}>
            Mapa da concorrência
            <Ajuda
              faq="preco-concorrencia"
              texto="Toque em um botão abaixo e depois no ponto do mapa. Os círculos coloridos são os concorrentes que você marcou; o círculo amarelo é o seu negócio. Com o seu negócio marcado, dá para olhar só quem está perto."
            />
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => iniciarMarcacao({ tipo: "meu-local" })}
            className="btn-press touch-target inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
            style={{ background: t.warningSoft, color: t.warningText }}
          >
            <MapPin size={14} /> {meuLocal ? "Mudar meu negócio" : "Marcar meu negócio"}
          </button>
          <button
            type="button"
            onClick={() => iniciarMarcacao({ tipo: "novo" })}
            className="btn-press touch-target inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
            style={{ background: t.primaryText, color: t.onPrimary }}
          >
            <Plus size={14} /> Adicionar concorrente
          </button>
        </div>
        {textoMarcacao && (
          <div
            className="pop-in flex items-center justify-between gap-2 rounded-xl p-2.5 text-xs"
            role="status"
            style={{ background: t.primarySoft, color: t.primaryText }}
          >
            <span className="font-medium">{textoMarcacao}</span>
            <button type="button" onClick={() => setMarcando(null)} className="btn-press touch-target underline shrink-0">
              Cancelar
            </button>
          </div>
        )}
        {!online && (
          <div className="flex gap-2 items-start rounded-xl p-2.5 text-xs" style={{ background: t.warningSoft, color: t.warningText }}>
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>Sem internet, as ruas do mapa não carregam. Seus concorrentes e preços continuam aqui embaixo.</span>
          </div>
        )}
        <div
          className="h-[320px] sm:h-[400px] rounded-xl overflow-hidden"
          style={{ outline: marcando ? `2px solid ${t.primaryText}` : "none", outlineOffset: 2, transition: "outline-color .2s ease" }}
        >
          <React.Suspense fallback={<SkeletonBlock h="100%" radius={12} />}>
            <MapaConcorrencia
              t={t}
              escuro={escuro}
              centro={cfgCidade.centro}
              zoom={cfgCidade.zoom}
              concorrentes={daCidade}
              meuLocal={meuLocal}
              raioKm={raioAtivo}
              selecionadoId={selecionadoId}
              marcando={!!marcando}
              onMarcar={aoMarcar}
              onSelecionar={(id) => setSelecionadoId(id)}
              corDoTipo={corDoTipo}
            />
          </React.Suspense>
        </div>
        <div className="flex gap-x-3 gap-y-1 flex-wrap">
          <LegendaPonto cor={t.warning} borda={t.text}>
            Meu negócio
          </LegendaPonto>
          <LegendaPonto cor={t.success}>Salão</LegendaPonto>
          <LegendaPonto cor={t.primary}>Barbearia</LegendaPonto>
          <LegendaPonto cor={t.secondary}>Outro</LegendaPonto>
        </div>
        {meuLocal && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-medium" style={{ color: t.textMuted }}>
              Raio:
            </span>
            <div
              className="flex gap-1 p-1 rounded-lg flex-wrap"
              role="radiogroup"
              aria-label="Distância do seu negócio"
              style={{ background: t.surfaceAlt }}
            >
              {RAIOS_KM.map((r) => (
                <BotaoSegmento
                  key={String(r)}
                  ativo={raioAtivo === r}
                  role="radio"
                  aria-checked={raioAtivo === r}
                  onClick={() => setRaioKm(r)}
                >
                  {r == null ? "cidade toda" : `${r} km`}
                </BotaoSegmento>
              ))}
            </div>
          </div>
        )}
        {rascunho && (
          <FormularioConcorrente
            rascunho={rascunho}
            setRascunho={setRascunho}
            onSalvar={salvarRascunho}
            onCancelar={() => setRascunho(null)}
            recuperado={concorrenteRecuperado}
          />
        )}
        {!rascunho && !marcando && (
          <button
            type="button"
            onClick={() => setRascunho({ tipo: "Salão" })}
            className="btn-press text-[11px] underline underline-offset-2"
            style={{ color: t.textMuted }}
          >
            Adicionar concorrente sem marcar no mapa
          </button>
        )}
      </div>

      {/* ---------- Comparação ---------- */}
      <div className="rounded-2xl p-4 space-y-3 min-w-0" style={cardStyle}>
        <div className="flex items-center gap-1.5">
          <TrendingUp size={15} style={{ color: t.primaryText }} />
          <p className="text-sm font-semibold" style={{ color: t.text }}>
            Seus preços × concorrência
            <Ajuda
              faq="preco-concorrencia"
              texto="Para cada serviço seu, a mediana é o preço do meio entre os concorrentes anotados: metade cobra menos, metade cobra mais. O seu piso é o preço que só cobre os seus custos, sem lucro."
            />
          </p>
        </div>
        {raioAtivo != null && (
          <p className="text-[11px]" style={{ color: t.textMuted }}>
            Considerando só concorrentes até {raioAtivo} km do seu negócio ({considerados.length} de {daCidade.length} em {cidade}).
          </p>
        )}
        {comparacoes.length > 0 ? (
          <>
            <div className="flex gap-x-3 gap-y-1 flex-wrap">
              <LegendaPonto cor={t.warning} forma="losango">
                Seu preço
              </LegendaPonto>
              <LegendaPonto cor={t.secondary}>Concorrente</LegendaPonto>
              <LegendaPonto cor={t.danger} forma="traco">
                Seu piso (sem lucro)
              </LegendaPonto>
            </div>
            <div className="space-y-2">
              {comparacoes.map((cmp) => (
                <ComparacaoServico key={cmp.s.id} {...cmp} />
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-xl p-3 text-xs space-y-1.5" style={{ background: t.surfaceAlt, color: t.textMuted }}>
            <p style={{ color: t.text }} className="font-medium">
              A comparação aparece quando houver preços anotados.
            </p>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>Adicione um concorrente (no mapa ou sem marcar).</li>
              <li>Toque nele e em "anotar preço", escolhendo um dos seus serviços.</li>
              {(servicos || []).length === 0 && <li>Antes disso, salve pelo menos um serviço na Calculadora.</li>}
            </ol>
          </div>
        )}
      </div>

      {/* ---------- Concorrentes anotados ---------- */}
      <div className="rounded-2xl p-4 space-y-3 min-w-0" style={cardStyle}>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p className="text-sm font-semibold" style={{ color: t.text }}>
            Concorrentes anotados em {cidade}{" "}
            <span className="font-num font-normal" style={{ color: t.textMuted }}>
              ({daCidade.length})
            </span>
          </p>
          {concorrentes.length > 0 && (
            <button
              type="button"
              onClick={baixarPlanilha}
              disabled={gerandoPlanilha}
              aria-busy={gerandoPlanilha}
              className="btn-press touch-target inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
              style={{ background: t.surfaceAlt, color: t.text, border: `1px solid ${t.border}` }}
            >
              {gerandoPlanilha ? <Girando /> : <Download size={13} />} {gerandoPlanilha ? "Gerando planilha…" : "Baixar planilha (Excel)"}
            </button>
          )}
        </div>
        {daCidade.length === 0 ? (
          <p className="text-xs" style={{ color: t.textMuted }}>
            Nenhum ainda. Use "Adicionar concorrente" no mapa acima.
          </p>
        ) : (
          <div className="space-y-2">
            {daCidade.map((c) => (
              <ItemConcorrente
                key={c.id}
                c={c}
                distancia={c.distancia}
                servicos={servicos || []}
                selecionado={selecionadoId === c.id}
                anotandoInicial={precoPendenteId === c.id}
                onSelecionar={() => setSelecionadoId(selecionadoId === c.id ? null : c.id)}
                onAtualizar={(novo) => salvarConcorrentes(concorrentes.map((x) => (x.id === novo.id ? { ...x, precos: novo.precos } : x)))}
                onExcluir={() => {
                  salvarConcorrentes(concorrentes.filter((x) => x.id !== c.id));
                  setSelecionadoId(null);
                  show("Concorrente excluído.");
                }}
                onEditar={() => {
                  setMarcando(null);
                  setRascunho({ id: c.id, nome: c.nome, tipo: c.tipo, bairro: c.bairro });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onMover={() => {
                  iniciarMarcacao({ tipo: "mover", id: c.id });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ---------- Coleta de referência ---------- */}
      <div className="rounded-2xl p-4 space-y-3 min-w-0" style={cardStyle}>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p className="text-sm font-semibold" style={{ color: t.text }}>
            Coleta de referência em {cidade}{" "}
            <span className="font-num font-normal" style={{ color: t.textMuted }}>
              ({referencia.length})
            </span>{" "}
            <Selo tipo="real" />
          </p>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: t.surfaceAlt }}>
            {["Todos", "Salão", "Barbearia"].map((f) => (
              <BotaoSegmento key={f} ativo={filtro === f} onClick={() => setFiltro(f)}>
                {f}
              </BotaoSegmento>
            ))}
          </div>
        </div>
        <div className="flex gap-2 items-start rounded-xl p-3 text-xs" style={{ background: t.surfaceAlt, color: t.textMuted }}>
          <CalendarCheck size={14} className="mt-0.5 shrink-0" />
          <p className="text-xs">
            <strong style={{ color: t.text }}>Retrato de uma coleta única</strong>, feita
            {COLETA_ESTABELECIMENTOS.data
              ? ` em ${new Date(`${COLETA_ESTABELECIMENTOS.data}T12:00:00`).toLocaleDateString("pt-BR")}`
              : ` até ${COLETA_ESTABELECIMENTOS.limiteComprovado}`}{" "}
            em {COLETA_ESTABELECIMENTOS.fonte}. Tem só nome, bairro e avaliação, sem preço nem endereço exato. Para colocar um deles no
            mapa, toque em "marcar no mapa" e depois no ponto onde ele fica.
          </p>
        </div>
        {porBairro.length > 0 ? (
          <>
            <p className="text-xs font-medium" style={{ color: t.textMuted }}>
              Estabelecimentos por bairro
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={porBairro} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
                <XAxis dataKey="nome" tick={{ fontSize: 10, fill: t.textMuted }} interval={0} angle={-30} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: t.textMuted }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {porBairro.map((b, i) => (
                    <Cell key={b.nome} fill={i % 2 === 0 ? t.primary : t.secondary} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="grid sm:grid-cols-2 gap-2">
              {referencia.map((e) => {
                const jaAnotado = concorrentes.some((c) => c.cidade === cidade && c.nome.toLowerCase() === e.nome.toLowerCase());
                return (
                  <div key={e.nome} className="fade-up rounded-xl p-3" style={{ background: t.surfaceAlt }}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm" style={{ color: t.text }}>
                        {e.nome}
                      </p>
                      <span
                        className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{
                          background: e.tipo === "Salão" ? t.successSoft : t.primarySoft,
                          color: e.tipo === "Salão" ? t.successText : t.primaryText,
                        }}
                      >
                        {e.tipo}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: t.textMuted }}>
                      {e.bairro} ·{" "}
                      <span className="font-num">
                        ★ {e.avaliacao} · {e.avaliacoes} avaliações
                      </span>
                    </p>
                    {jaAnotado ? (
                      <p className="text-[11px] mt-1.5 inline-flex items-center gap-1" style={{ color: t.successText }}>
                        <CheckCircle2 size={12} /> já está nos seus concorrentes
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          iniciarMarcacao({ tipo: "novo", base: { nome: e.nome, tipo: e.tipo, bairro: e.bairro } });
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="btn-press mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium"
                        style={{ color: t.primaryText }}
                      >
                        <MapPin size={12} /> marcar no mapa
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-xs" style={{ color: t.textMuted }}>
            A coleta de referência não inclui {cidade}. Marque no mapa os concorrentes que você conhece.
          </p>
        )}
        <div className="flex items-start gap-2 text-[11px] pt-1" style={{ color: t.textMuted }}>
          <Info size={13} className="mt-0.5 shrink-0" />
          <p className="text-[11px]">
            <strong>SINDBEFS</strong> (Feira de Santana) e <strong>SINDBACSS</strong> (Salvador) são as entidades patronais da categoria.
            Não há tabela pública de preços de nenhuma das duas; por isso, os preços daqui são só os que você anota.
          </p>
        </div>
        <div className="text-[11px]">
          <Selo tipo="aguardando">tabela de preços dos sindicatos — aguardando fonte oficial</Selo>
        </div>
      </div>
      {toastNode}
    </div>
  );
}
