/* Peças usadas em todas as telas: esqueletos de carregamento, avisos rápidos,
   botão com progresso, selos, semáforo e a rede de segurança das abas. */
import { AlertTriangle, CheckCircle2, Clock3, Landmark, ShieldCheck, Sparkles } from "lucide-react";
import React, { useCallback, useRef, useState } from "react";
import { useT } from "../tema.js";

/* ======================================================================= */
/* Selo — proveniência do dado (real / calculado / aguardando / legal)     */
/* ======================================================================= */
export function Selo({ tipo, children }) {
  const t = useT();
  const map = {
    real: { bg: t.successSoft, fg: t.successText, icon: ShieldCheck, label: "dado real" },
    calculado: { bg: t.primarySoft, fg: t.primaryText, icon: Sparkles, label: "calculado a partir do que você informou" },
    aguardando: { bg: t.surfaceAlt, fg: t.textMuted, icon: Clock3, label: "aguardando fonte oficial", dashed: true },
    legal: { bg: t.secondarySoft, fg: t.secondaryText, icon: Landmark, label: "conforme legislação vigente" },
  };
  const s = map[tipo];
  const Icon = s.icon;
  // Texto longo (fonte legal, documento sindical) não cabe numa "pílula": no celular
  // virava um balão de 5 linhas com o ícone solto. Acima de 45 caracteres o selo vira
  // uma nota de rodapé — mesma cor e ícone, sem fundo nem borda, alinhada à esquerda.
  const textoPlano = React.Children.toArray(children)
    .filter((c) => typeof c === "string" || typeof c === "number")
    .join("");
  if (textoPlano.length > 45) {
    return (
      <span className="flex items-start gap-1.5 text-[11px] leading-snug text-left" style={{ color: s.fg }}>
        <Icon size={12} strokeWidth={2.5} className="shrink-0 mt-[1px]" aria-hidden="true" />
        <span>{children}</span>
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide"
      style={{ background: s.bg, color: s.fg, border: `1px ${s.dashed ? "dashed" : "solid"} ${s.fg}55` }}
    >
      <Icon size={12} strokeWidth={2.5} />
      {children || s.label}
    </span>
  );
}

/* ======================================================================= */
/* Skeleton / Toast                                                        */
/* ======================================================================= */
export function SkeletonBlock({ h = 16, w = "100%", radius = 8 }) {
  return <div className="skeleton-shimmer" style={{ height: h, width: w, borderRadius: radius }} />;
}
export function SkeletonCard() {
  const t = useT();
  return (
    <div className="rounded-2xl p-5" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
      <SkeletonBlock h={14} w="40%" />
      <div className="h-3" />
      <SkeletonBlock h={28} w="70%" />
      <div className="h-4" />
      <SkeletonBlock h={10} w="90%" />
      <div className="h-2" />
      <SkeletonBlock h={10} w="60%" />
    </div>
  );
}

/* Ação demorada de um botão: evita clique duplo e informa o progresso. */
export function useAcaoComProgresso(acao) {
  const [ocupado, setOcupado] = useState(false);
  const ocupadoRef = useRef(false);
  const acaoRef = useRef(acao);
  acaoRef.current = acao;
  const executar = useCallback(async () => {
    if (ocupadoRef.current) return;
    ocupadoRef.current = true;
    setOcupado(true);
    try {
      await acaoRef.current();
    } finally {
      ocupadoRef.current = false;
      setOcupado(false);
    }
  }, []);
  return [executar, ocupado];
}

export function useToast() {
  const t = useT();
  const [toast, setToast] = useState(null);
  const show = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }, []);
  const node = toast ? (
    <div
      className="pop-in fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full px-4 py-2.5 text-sm font-medium flex items-center gap-2"
      style={{ background: t.success, color: t.onSuccess, boxShadow: t.shadow }}
    >
      <CheckCircle2 size={15} />
      {toast}
    </div>
  ) : null;
  return { show, node };
}

/* Rede de segurança: se qualquer aba travar por um motivo que eu não       */
/* previu, mostra um jeito de voltar em vez de tela congelada/em branco.    */
export class LimiteDeErro extends React.Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }
  static getDerivedStateFromError(erro) {
    return { erro };
  }
  componentDidCatch(erro, info) {
    console.error("Erro capturado pela rede de segurança:", erro, info);
  }
  render() {
    if (this.state.erro) {
      return (
        <div className="rounded-2xl p-8 text-center" style={{ background: "#FCE7EA", border: "1px solid #C2365255" }}>
          <AlertTriangle size={22} className="mx-auto mb-3" style={{ color: "#C23652" }} />
          <p className="font-semibold text-sm" style={{ color: "#C23652" }}>
            Essa tela travou
          </p>
          <p className="text-xs mt-1 mb-4" style={{ color: "#5B6472" }}>
            Algo deu errado ao abrir isso. Toca em voltar e tenta de novo — se acontecer sempre com o mesmo item, exclua e recrie.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ erro: null });
              this.props.onReset?.();
            }}
            className="btn-press rounded-xl px-4 py-2 text-sm font-semibold"
            style={{ background: "#00CBA7", color: "#0F172A" }}
          >
            Voltar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* Semáforo de diagnóstico do Modo B — feedback imediato, sem jargão.       */
/* Caixa no padrão "semáforo": emoji + título curto + frase com número       */
/* concreto e próximo passo. Usada no diagnóstico de cada serviço, no        */
/* enquadramento do Simples Nacional e na escada de pontos de equilíbrio.    */
/* O emoji e o título carregam o estado — a cor nunca é a única pista.      */
export function CaixaSemaforo({ tom, titulo, children }) {
  const t = useT();
  const tons = {
    perigo: { emoji: "🔴", bg: t.dangerSoft, fg: t.danger },
    atencao: { emoji: "🟡", bg: t.warningSoft, fg: t.warningText },
    ok: { emoji: "🟢", bg: t.successSoft, fg: t.successText },
    neutro: { emoji: "⚪", bg: t.surfaceAlt, fg: t.textMuted },
  };
  const s = tons[tom] || tons.neutro;
  return (
    <div className="rounded-2xl p-4 pop-in" style={{ background: s.bg, color: s.fg }} role="status">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>
          {s.emoji}
        </span>
        <p className="font-semibold text-sm">{titulo}</p>
      </div>
      <div className="text-sm mt-1.5 space-y-1.5">{children}</div>
    </div>
  );
}

/* ======================================================================= */
/* Termos de Uso e Aviso de Privacidade (Bloco 12). Versão preliminar: os   */
/* textos e as regras ficam em termos.js.                                   */
/* ======================================================================= */
export const Girando = () => (
  <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-r-transparent animate-spin" aria-hidden="true" />
);
