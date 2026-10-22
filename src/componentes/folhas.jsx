/* Folhas que abrem por cima da tela: explicação do FAQ, documentos legais
   e a tela de aceite dos termos (Bloco 12). */
import { Calculator, CheckCircle2, Download, FileText, HelpCircle, Info, ShieldCheck, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { encontrarPerguntaFaq } from "../dados/faq.js";
import { TOKENS, useT } from "../tema.js";
import { DATA_TERMOS, DOCUMENTOS_LEGAIS, RESUMO_ACEITE, VERSAO_TERMOS } from "../termos.js";

export function BlocoResposta({ bloco }) {
  const t = useT();
  if (bloco.tipo === "formula") {
    return (
      <div
        className="rounded-lg px-3 py-2.5 my-2 font-num text-[13px]"
        style={{ background: t.primarySoft, color: t.primaryText, fontWeight: 600, lineHeight: 1.5 }}
      >
        {bloco.texto}
      </div>
    );
  }
  if (bloco.tipo === "exemplo") {
    return (
      <div
        className="rounded-lg pl-3 pr-3 py-2.5 my-2 text-[13px] leading-relaxed"
        style={{ background: t.successSoft, color: t.text, borderLeft: `3px solid ${t.success}` }}
      >
        <span className="font-semibold" style={{ color: t.successText }}>
          Exemplo prático:{" "}
        </span>
        {bloco.texto}
      </div>
    );
  }
  if (bloco.tipo === "lista") {
    return (
      <ul className="my-2 space-y-1.5 pl-0.5">
        {bloco.itens.map((item) => (
          <li key={item.titulo} className="text-sm leading-relaxed flex gap-2" style={{ color: t.textMuted }}>
            <span className="shrink-0" style={{ color: t.primaryText }}>
              •
            </span>
            <span>
              <strong style={{ color: t.text }}>{item.titulo}:</strong> {item.texto}
            </span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p className="text-sm leading-relaxed mb-2 last:mb-0" style={{ color: t.textMuted }}>
      {bloco.texto}
    </p>
  );
}

/* Explicação completa de uma pergunta do FAQ, aberta a partir de uma dica  */
/* "?" — por cima da tela atual, sem trocar de aba. Trocar de aba descarta  */
/* o que ainda não foi salvo (rascunho de serviço, últimos segundos do      */
/* Negócio), então o usuário lê e volta exatamente de onde estava.          */
/* Celular: sobe de baixo (bottom sheet). Telas maiores: centralizado.      */
/* Folha (sobe de baixo no celular, diálogo no computador), com entrada e  */
/* saída simétricas. Base da explicação do FAQ, dos documentos legais e da  */
/* tela de aceite (Bloco 12). dispensavel=false: sem X, sem Esc, sem clique */
/* fora — só a ação do rodapé fecha.                                        */
function PainelFolha({ tituloId, cabecalho, rodape, onFechar, dispensavel = true, rotuloFechar = "Fechar", children }) {
  const t = useT();
  const [saindo, setSaindo] = useState(false);
  const fecharRef = useRef(null);
  const dialogoRef = useRef(null);
  const focoAnteriorRef = useRef(null);
  const onFecharRef = useRef(onFechar);
  onFecharRef.current = onFechar;

  const fechar = useCallback((depois) => {
    setSaindo(true);
    const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setTimeout(
      () => {
        onFecharRef.current();
        if (typeof depois === "function") depois();
        else focoAnteriorRef.current?.focus?.();
      },
      reduzido ? 0 : 180,
    );
  }, []);

  useEffect(() => {
    focoAnteriorRef.current = document.activeElement;
    (fecharRef.current || dialogoRef.current)?.focus();
    if (!dispensavel) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") fechar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fechar, dispensavel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center no-print">
      <div
        className={saindo ? "backdrop-out" : "backdrop-in"}
        onClick={dispensavel ? () => fechar() : undefined}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, background: "rgba(10, 14, 26, .45)", touchAction: "none" }}
      />
      <div
        ref={dialogoRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className={`${saindo ? "sheet-out" : "sheet-in"} relative w-full sm:max-w-lg sm:mx-4 rounded-t-2xl sm:rounded-2xl flex flex-col outline-none`}
        style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow, maxHeight: "86dvh" }}
      >
        <div className="sm:hidden flex justify-center pt-2" aria-hidden="true">
          <span style={{ width: 36, height: 4, borderRadius: 4, background: t.border }} />
        </div>
        <div className="flex items-start justify-between gap-3 px-5 pt-3 sm:pt-5 pb-3" style={{ borderBottom: `1px solid ${t.border}` }}>
          <div className="min-w-0">{cabecalho}</div>
          {dispensavel && (
            <button
              ref={fecharRef}
              type="button"
              onClick={() => fechar()}
              aria-label={rotuloFechar}
              className="btn-press touch-target shrink-0 rounded-full p-1.5"
              style={{ background: t.surfaceAlt, color: t.textMuted }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        {/* tabIndex 0: dá para rolar o texto pelo teclado (setas, Page Down). */}
        {/* biome-ignore lint/a11y/noNoninteractiveTabindex: área rolável precisa de foco para ser lida pelo teclado (WCAG 2.1.1) */}
        <div className="px-5 py-4 overflow-y-auto rounded-sm" style={{ overscrollBehavior: "contain" }} tabIndex={0}>
          {children}
        </div>
        {rodape && (
          <div
            className="px-5 py-3"
            style={{ borderTop: `1px solid ${t.border}`, paddingBottom: "calc(.75rem + env(safe-area-inset-bottom))" }}
          >
            {rodape(fechar)}
          </div>
        )}
      </div>
    </div>
  );
}

export function PainelExplicacao({ faqId, onFechar, onVerFaq }) {
  const t = useT();
  const pergunta = encontrarPerguntaFaq(faqId);
  if (!pergunta) return null;
  return (
    <PainelFolha
      tituloId="painel-explicacao-titulo"
      onFechar={onFechar}
      rotuloFechar="Fechar explicação"
      cabecalho={
        <>
          <p className="text-[11px] font-medium inline-flex items-center gap-1" style={{ color: t.primaryText }}>
            <HelpCircle size={12} /> {pergunta.categoria}
          </p>
          <p id="painel-explicacao-titulo" className="text-sm font-semibold mt-1" style={{ color: t.text }}>
            {pergunta.pergunta}
          </p>
        </>
      }
      rodape={(fechar) => (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => fechar(onVerFaq)}
            className="btn-press text-xs font-medium underline underline-offset-2"
            style={{ color: t.textMuted }}
          >
            Ver todas as perguntas
          </button>
          <button
            type="button"
            onClick={() => fechar()}
            className="btn-press rounded-xl px-4 py-2 text-xs font-semibold"
            style={{ background: t.primaryText, color: t.onPrimary }}
          >
            Entendi, voltar
          </button>
        </div>
      )}
    >
      {pergunta.blocos.map((bloco, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: texto fixo do FAQ, que nunca é reordenado nem editado
        <BlocoResposta key={i} bloco={bloco} />
      ))}
    </PainelFolha>
  );
}

export function PainelDocumentoLegal({ documento, onFechar }) {
  const t = useT();
  const doc = DOCUMENTOS_LEGAIS[documento];
  if (!doc) return null;
  const paragrafo = (texto, i) => (
    <p key={i} className="text-sm leading-relaxed mb-1.5" style={{ color: t.text }}>
      {texto}
    </p>
  );
  return (
    <PainelFolha
      tituloId="documento-legal-titulo"
      onFechar={onFechar}
      rotuloFechar={`Fechar ${doc.titulo}`}
      cabecalho={
        <>
          <p className="text-[11px] font-medium inline-flex items-center gap-1" style={{ color: t.primaryText }}>
            <FileText size={12} /> Versão {VERSAO_TERMOS} (preliminar) · {DATA_TERMOS}
          </p>
          <p id="documento-legal-titulo" className="text-sm font-semibold mt-1" style={{ color: t.text }}>
            {doc.titulo}
          </p>
        </>
      }
      rodape={(fechar) => (
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px]" style={{ color: t.textMuted }}>
            Versão preliminar, em revisão jurídica.
          </p>
          <button
            type="button"
            onClick={() => fechar()}
            className="btn-press rounded-xl px-4 py-2 text-xs font-semibold shrink-0"
            style={{ background: t.primaryText, color: t.onPrimary }}
          >
            Voltar
          </button>
        </div>
      )}
    >
      <div className="space-y-4">
        {doc.secoes.map((s) => (
          <section key={s.titulo}>
            <h3 className="text-sm font-semibold mb-1" style={{ color: t.text }}>
              {s.titulo}
            </h3>
            {s.paragrafos.map(paragrafo)}
            {s.itens && (
              <ul className="list-disc pl-5 space-y-1 mb-1.5 text-sm leading-relaxed" style={{ color: t.text }}>
                {s.itens.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {s.depois?.map(paragrafo)}
          </section>
        ))}
      </div>
    </PainelFolha>
  );
}

const ICONES_RESUMO_ACEITE = [ShieldCheck, Calculator, Download];

export function TelaAceite({ atualizacao, onAceitar, onLer }) {
  const t = useT();
  const [marcado, setMarcado] = useState(false);
  const [aceitando, setAceitando] = useState(false);
  return (
    <PainelFolha
      tituloId="aceite-titulo"
      dispensavel={false}
      onFechar={onAceitar}
      cabecalho={
        <>
          <p className="text-[11px] font-medium inline-flex items-center gap-1" style={{ color: t.primaryText }}>
            <ShieldCheck size={12} /> {atualizacao ? "Os termos foram atualizados" : "Bem-vindo ao Preço Justo"}
          </p>
          <p id="aceite-titulo" className="text-base font-semibold mt-1" style={{ color: t.text }}>
            Antes de começar
          </p>
        </>
      }
      rodape={(fechar) => (
        <div className="space-y-3">
          <label className="flex items-start gap-2.5 text-sm cursor-pointer" style={{ color: t.text }}>
            <input
              type="checkbox"
              checked={marcado}
              onChange={(e) => setMarcado(e.target.checked)}
              disabled={aceitando}
              className="mt-0.5 w-5 h-5 shrink-0 cursor-pointer"
              style={{ accentColor: t.primary, colorScheme: t === TOKENS.escuro ? "dark" : "light" }}
            />
            <span>Li e aceito os Termos de Uso e estou ciente do Aviso de Privacidade.</span>
          </label>
          <button
            type="button"
            disabled={!marcado || aceitando}
            onClick={() => {
              setAceitando(true);
              fechar();
            }}
            className="btn-press w-full rounded-xl px-4 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2"
            style={{
              background: marcado ? t.primaryText : t.surfaceAlt,
              color: marcado ? t.onPrimary : t.textMuted,
              cursor: marcado ? "pointer" : "not-allowed",
            }}
          >
            {aceitando && <CheckCircle2 size={16} className="pop-in" />}
            Aceitar e continuar
          </button>
          <p className="text-[11px] text-center" style={{ color: t.textMuted }}>
            Versão {VERSAO_TERMOS} (preliminar), em revisão jurídica.
          </p>
        </div>
      )}
    >
      <ul className="space-y-3">
        {RESUMO_ACEITE.map((texto, i) => {
          const Icone = ICONES_RESUMO_ACEITE[i] || Info;
          return (
            <li key={texto} className="flex items-start gap-3 text-sm" style={{ color: t.text }}>
              <span
                className="shrink-0 rounded-full flex items-center justify-center"
                style={{ width: 28, height: 28, background: t.primarySoft, color: t.primaryText }}
              >
                <Icone size={14} />
              </span>
              <span className="pt-1 leading-snug">{texto}</span>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5">
        {[
          ["termos", "Ler os Termos de Uso"],
          ["privacidade", "Ler o Aviso de Privacidade"],
        ].map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            onClick={() => onLer(id)}
            className="btn-press touch-target inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-2"
            style={{ color: t.primaryText }}
          >
            <FileText size={14} /> {rotulo}
          </button>
        ))}
      </div>
    </PainelFolha>
  );
}
