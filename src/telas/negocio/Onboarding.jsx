/* Aba Negócio: assistente do primeiro acesso (perfil do negócio). */
import { Building2, CheckCircle2, Sparkles } from "lucide-react";
import React, { useState } from "react";
import { CAMPO, Campo } from "../../componentes/campos.jsx";
import { MODELOS_OPERACAO, SEGMENTOS } from "../../dados/segmentos.js";
import { useT } from "../../tema.js";

function CardSelecao({ ativo, onClick, icon: Icon, titulo, descricao }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-press text-left rounded-xl p-3 w-full flex items-start gap-2.5"
      style={{ background: ativo ? t.primarySoft : t.surfaceAlt, border: `1.5px solid ${ativo ? t.primaryText : t.border}` }}
    >
      <Icon size={18} style={{ color: ativo ? t.primaryText : t.textMuted, flexShrink: 0, marginTop: 1 }} />
      <div>
        <p className="text-sm font-semibold" style={{ color: t.text }}>
          {titulo}
        </p>
        {descricao && (
          <p className="text-[11px] mt-0.5" style={{ color: t.textMuted }}>
            {descricao}
          </p>
        )}
      </div>
    </button>
  );
}

// Onboarding — 4 passos curtos + confirmação, antes de qualquer custo fixo. Tom
// conversacional na copy, mas é um wizard estruturado (ver Especificacao_Onboarding.md,
// §0 — por que não é um chat de IA de verdade dentro do app).
export function OnboardingPerfil({ onConcluir }) {
  const t = useT();
  const [passo, setPasso] = useState(1);
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [segmento, setSegmento] = useState(null);
  const [modeloOperacao, setModeloOperacao] = useState(null);
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");

  const passos = [
    { id: 1, label: "Você" },
    { id: 2, label: "Segmento" },
    { id: 3, label: "Modelo" },
    { id: 4, label: "Local" },
  ];
  const podeAvancarPasso1 = nomeResponsavel.trim().length > 0 && nomeFantasia.trim().length > 0;
  const podeAvancarPasso2 = !!segmento;
  const podeAvancarPasso3 = !!modeloOperacao;
  const labelSegmento = SEGMENTOS.find((s) => s.id === segmento)?.label || "";
  const labelModelo = (MODELOS_OPERACAO.find((m) => m.id === modeloOperacao)?.label || "").toLowerCase();

  const concluir = () => {
    onConcluir({
      nomeResponsavel: nomeResponsavel.trim(),
      nomeFantasia: nomeFantasia.trim(),
      cnpj: cnpj.trim(),
      segmento,
      modeloOperacao,
      cidade: cidade.trim(),
      estado: estado.trim(),
    });
  };

  return (
    <div className="rounded-2xl p-5" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={16} style={{ color: t.primaryText }} />
        <p className="text-sm font-semibold" style={{ color: t.text }}>
          Vamos te conhecer rapidinho
        </p>
      </div>
      <p className="text-[11px] mb-4" style={{ color: t.textMuted }}>
        4 perguntas curtas antes de levantar os custos fixos — assim o app já sugere os itens certos pro seu tipo de negócio.
      </p>

      <div className="flex items-center mb-5">
        {passos.map((p, i) => (
          <React.Fragment key={p.id}>
            <div className="flex flex-col items-center gap-1" style={{ flexShrink: 0 }}>
              <span
                className="flex items-center justify-center rounded-full font-num text-[11px] font-bold"
                style={{
                  width: 22,
                  height: 22,
                  background: passo >= p.id ? t.primaryText : t.surfaceAlt,
                  color: passo >= p.id ? t.onPrimary : t.textMuted,
                }}
              >
                {passo > p.id ? "✓" : p.id}
              </span>
              <span className="text-[9px] font-medium" style={{ color: passo === p.id ? t.text : t.textMuted }}>
                {p.label}
              </span>
            </div>
            {i < passos.length - 1 && (
              <div style={{ flex: 1, height: 2, background: passo > p.id ? t.primary : t.border, marginBottom: 14 }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {passo === 1 && (
        <div className="space-y-3 fade-up">
          <Campo label="Seu nome completo">
            <input
              className={CAMPO}
              style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
              placeholder="ex: Maria da Silva"
              value={nomeResponsavel}
              onChange={(e) => setNomeResponsavel(e.target.value)}
            />
          </Campo>
          <Campo label="Nome fantasia do negócio">
            <input
              className={CAMPO}
              style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
              placeholder="ex: Barbearia do João"
              value={nomeFantasia}
              onChange={(e) => setNomeFantasia(e.target.value)}
            />
          </Campo>
          <button
            type="button"
            onClick={() => setPasso(2)}
            disabled={!podeAvancarPasso1}
            className="btn-press w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
            style={{
              background: podeAvancarPasso1 ? t.primaryText : t.surfaceAlt,
              color: podeAvancarPasso1 ? t.onPrimary : t.textMuted,
              opacity: podeAvancarPasso1 ? 1 : 0.6,
            }}
          >
            Continuar
          </button>
        </div>
      )}

      {passo === 2 && (
        <div className="space-y-2 fade-up">
          {SEGMENTOS.map((s) => (
            <CardSelecao key={s.id} ativo={segmento === s.id} onClick={() => setSegmento(s.id)} icon={s.icon} titulo={s.label} />
          ))}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setPasso(1)}
              className="btn-press rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{ background: t.surfaceAlt, color: t.textMuted }}
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={() => setPasso(3)}
              disabled={!podeAvancarPasso2}
              className="btn-press flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{
                background: podeAvancarPasso2 ? t.primaryText : t.surfaceAlt,
                color: podeAvancarPasso2 ? t.onPrimary : t.textMuted,
                opacity: podeAvancarPasso2 ? 1 : 0.6,
              }}
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {passo === 3 && (
        <div className="space-y-2 fade-up">
          {MODELOS_OPERACAO.map((m) => (
            <CardSelecao
              key={m.id}
              ativo={modeloOperacao === m.id}
              onClick={() => setModeloOperacao(m.id)}
              icon={Building2}
              titulo={m.label}
              descricao={m.descricao}
            />
          ))}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setPasso(2)}
              className="btn-press rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{ background: t.surfaceAlt, color: t.textMuted }}
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={() => setPasso(4)}
              disabled={!podeAvancarPasso3}
              className="btn-press flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{
                background: podeAvancarPasso3 ? t.primaryText : t.surfaceAlt,
                color: podeAvancarPasso3 ? t.onPrimary : t.textMuted,
                opacity: podeAvancarPasso3 ? 1 : 0.6,
              }}
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {passo === 4 && (
        <div className="space-y-3 fade-up">
          <div className="grid grid-cols-2 gap-2">
            <Campo label="Cidade (opcional)">
              <input
                className={CAMPO}
                style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
                placeholder="ex: Feira de Santana"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
              />
            </Campo>
            <Campo label="Estado (opcional)">
              <input
                className={CAMPO}
                style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
                placeholder="ex: BA"
                value={estado}
                onChange={(e) => setEstado(e.target.value.toUpperCase().slice(0, 2))}
              />
            </Campo>
          </div>
          <Campo
            label="CNPJ (opcional)"
            ajuda="Só se você já tiver — não é obrigatório pra usar o app; MEI sem CNPJ formal pode deixar em branco."
          >
            <input
              className={CAMPO}
              style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
              placeholder="00.000.000/0000-00"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
            />
          </Campo>
          <div className="rounded-xl p-3" style={{ background: t.successSoft }}>
            <p className="text-xs" style={{ color: t.text }}>
              Perfeito, {nomeResponsavel.split(" ")[0] || "tudo certo"}! Cadastrado como <strong>{labelSegmento}</strong>
              {cidade ? ` em ${cidade}${estado ? `, ${estado}` : ""}` : ""} — {labelModelo}. Agora vamos levantar os custos fixos do mês.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPasso(3)}
              className="btn-press rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{ background: t.surfaceAlt, color: t.textMuted }}
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={concluir}
              className="btn-press flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{ background: t.success, color: t.onSuccess }}
            >
              <CheckCircle2 size={14} /> Confirmar e ir pros custos fixos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
