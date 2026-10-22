import { useRegisterSW } from "virtual:pwa-register/react";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { EVENTO_SALVAR_PENDENTES } from "../armazenamento.js";
import { useT } from "../tema.js";

/* ======================================================================= */
/* Aviso de nova versão (Bloco 9). O app baixa a versão nova em segundo      */
/* plano e, em vez de trocar sozinho na próxima abertura (o que deixava     */
/* quem abre pelo ícone preso na versão anterior sem saber), avisa e deixa  */
/* a pessoa escolher a hora. Antes de recarregar, avisa os formulários para */
/* salvarem o que estiver pendente. Procura versão nova a cada 30 minutos e */
/* sempre que o app volta para a tela.                                      */
/* ======================================================================= */
export function AvisoNovaVersao() {
  const t = useT();
  const [atualizando, setAtualizando] = useState(false);
  const [adiado, setAdiado] = useState(false);
  const {
    needRefresh: [precisaAtualizar],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registro) {
      if (!registro) return;
      const verificar = () => {
        if (navigator.onLine !== false) registro.update().catch(() => {});
      };
      setInterval(verificar, 30 * 60 * 1000);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") verificar();
      });
    },
  });
  if (!precisaAtualizar || adiado) return null;
  const atualizar = () => {
    setAtualizando(true);
    window.dispatchEvent(new Event(EVENTO_SALVAR_PENDENTES));
    // Dá um instante para os salvamentos terminarem antes de recarregar.
    setTimeout(() => updateServiceWorker(true), 300);
  };
  return (
    <div
      role="status"
      aria-live="polite"
      className="pop-in no-print fixed z-[60] left-4 right-4 bottom-[88px] sm:left-auto sm:right-6 sm:bottom-6 sm:w-[380px] rounded-2xl p-4 flex items-start gap-3"
      style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: "0 12px 32px rgba(15,23,42,.18)" }}
    >
      <span
        className="shrink-0 rounded-full flex items-center justify-center"
        style={{ width: 32, height: 32, background: t.primarySoft, color: t.primaryText }}
      >
        <Sparkles size={16} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: t.text }}>
          Nova versão disponível
        </p>
        <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
          Atualize para ter as últimas melhorias. O que você digitou fica salvo.
        </p>
        <div className="flex gap-2 mt-2.5">
          <button
            type="button"
            onClick={atualizar}
            disabled={atualizando}
            className="btn-press touch-target inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
            style={{ background: t.primaryText, color: t.onPrimary, opacity: atualizando ? 0.8 : 1 }}
          >
            {atualizando && (
              <span
                className="inline-block w-3 h-3 rounded-full border-2 border-current border-r-transparent animate-spin"
                aria-hidden="true"
              />
            )}
            {atualizando ? "Atualizando…" : "Atualizar agora"}
          </button>
          {!atualizando && (
            <button
              type="button"
              onClick={() => setAdiado(true)}
              className="btn-press touch-target rounded-lg px-3 py-2 text-xs font-medium"
              style={{ color: t.textMuted }}
            >
              Depois
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
