/* Campos de formulário, dicas "?" e seções que abrem e fecham. */
import { ChevronDown } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { N, normalizarValorBR } from "../calculos.js";
import { useT } from "../tema.js";

/* ======================================================================= */
/* Campos reutilizáveis                                                    */
/* ======================================================================= */
export const CAMPO = "w-full rounded-xl px-3 py-2.5 text-sm outline-none";

/* Ponte entre as dicas "?" e a aba FAQ: o App fornece uma função que abre */
/* a aba FAQ já com a pergunta certa expandida. Sem provider (ex.: em     */
/* testes ou fora do App), o link simplesmente não aparece.               */
export const FaqLinkContext = createContext(null);

/* Ajuda tocável (não hover, porque é mobile) — "?" pequeno que abre uma    */
/* dica curta, pro usuário leigo não precisar adivinhar o que preencher.    */
/* `faq` (opcional) é o id de uma pergunta do FAQ_DADOS: aparece o link    */
/* "Entender melhor" que leva à explicação completa.                        */
/* Posiciona um balão (dica ou referência) junto ao botão que o abriu.      */
/* O balão vai para o fim do <body> (portal) com posição fixa: assim não é  */
/* cortado por seções com overflow: hidden e nunca sai da tela no celular.  */
/* Acompanha a rolagem, fecha se o botão sair da tela ou com toque fora.     */
export function useBalaoAncorado({ aberto, setAberto, botaoRef, balaoRef, largura = 230, preferencia = "acima" }) {
  const [pos, setPos] = useState(null);
  const FOLGA = 12;
  const posicionar = useCallback(() => {
    const r = botaoRef.current?.getBoundingClientRect();
    if (!r) return;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (r.bottom < 0 || r.top > vh) {
      setAberto(false);
      return;
    }
    const w = Math.min(largura, vw - FOLGA * 2);
    const left = Math.min(Math.max(r.left + r.width / 2 - w / 2, FOLGA), vw - FOLGA - w);
    const altura = balaoRef.current?.offsetHeight || 0;
    const cabeAcima = r.top - 8 - altura >= FOLGA;
    const cabeAbaixo = r.bottom + 8 + altura <= vh - FOLGA;
    const acima = preferencia === "acima" ? cabeAcima || !cabeAbaixo : !cabeAbaixo && cabeAcima;
    setPos(acima || !altura ? { left, largura: w, bottom: vh - r.top + 8 } : { left, largura: w, top: r.bottom + 8 });
  }, [botaoRef, balaoRef, largura, preferencia, setAberto]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: pos?.largura dispara a segunda passada, já com a altura real do balão medida
  useLayoutEffect(() => {
    if (!aberto) {
      setPos(null);
      return;
    }
    posicionar();
  }, [aberto, pos?.largura, posicionar]);

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => {
      if (balaoRef.current?.contains(e.target) || botaoRef.current?.contains(e.target)) return;
      setAberto(false);
    };
    document.addEventListener("pointerdown", fora);
    window.addEventListener("scroll", posicionar, true);
    window.addEventListener("resize", posicionar);
    return () => {
      document.removeEventListener("pointerdown", fora);
      window.removeEventListener("scroll", posicionar, true);
      window.removeEventListener("resize", posicionar);
    };
  }, [aberto, posicionar, balaoRef, botaoRef, setAberto]);

  const estilo = {
    position: "fixed",
    zIndex: 55,
    display: "block",
    left: pos?.left ?? 0,
    width: pos?.largura ?? largura,
    ...(pos?.top != null ? { top: pos.top } : { bottom: pos?.bottom ?? 0 }),
    visibility: pos ? "visible" : "hidden",
  };
  return estilo;
}

export function Ajuda({ texto, faq }) {
  const t = useT();
  const abrirFaq = useContext(FaqLinkContext);
  const [aberto, setAberto] = useState(false);
  const botaoRef = useRef(null);
  const balaoRef = useRef(null);
  const posicaoBalao = useBalaoAncorado({ aberto, setAberto, botaoRef, balaoRef, largura: 230, preferencia: "acima" });

  if (!texto) return null;
  const linkFaq = faq && abrirFaq;
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
        aria-label="Ajuda"
        aria-expanded={aberto}
        className="btn-press touch-target inline-flex items-center justify-center rounded-full"
        style={{
          width: 15,
          height: 15,
          background: aberto ? t.text : t.surfaceAlt,
          color: aberto ? t.bg : t.textMuted,
          fontSize: 10,
          fontWeight: 700,
          border: `1px solid ${aberto ? t.text : t.border}`,
          lineHeight: 1,
        }}
      >
        ?
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
            {texto}
            {linkFaq && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setAberto(false);
                  abrirFaq(faq);
                }}
                className="btn-press block mt-2 font-semibold underline underline-offset-2"
                style={{ color: t.bg }}
              >
                Entender melhor →
              </button>
            )}
          </span>,
          document.body,
        )}
    </span>
  );
}

export function Campo({ label, hint, ajuda, faq, children }) {
  const t = useT();
  return (
    // min-w-0 é inofensivo em qualquer contexto normal — só importa quando Campo está
    // dentro de um grid/flex (como o card de Perfil do negócio), onde por padrão um item
    // se recusa a encolher além do conteúdo. Foi exatamente isso que aconteceu com o
    // <select> de "Modelo de operação" (a opção "Equipe / cadeiras comissionadas ou
    // alugadas" é longa) — o mesmo bug de antes (barra de baixo, resumo das seções),
    // só que num terceiro lugar. Corrigindo aqui uma vez só, em vez de campo por campo.
    // biome-ignore lint/a11y/noLabelWithoutControl: o campo vem em children (input, select ou CampoMoeda), dentro do label
    <label className="block min-w-0">
      {/* block + leading-snug: como span em linha, o rótulo pequeno herdava a altura de linha */}
      {/* do texto base (24px) e, ao quebrar em duas linhas, ficava com um vão entre elas.    */}
      <span className="block text-xs font-medium leading-snug" style={{ color: t.textMuted }}>
        {label}
        {ajuda && <Ajuda texto={ajuda} faq={faq} />}
      </span>
      <div className="mt-1">{children}</div>
      {hint && (
        <p className="text-[11px] mt-1" style={{ color: t.textMuted }}>
          {hint}
        </p>
      )}
    </label>
  );
}

export function CampoNumero({ value, onChange, placeholder, prefixo, max }) {
  const t = useT();
  const campoStyle = { background: t.surface, border: `1px solid ${t.border}`, color: t.text };
  return (
    <div className="flex items-center gap-1">
      {prefixo && (
        <span className="text-sm" style={{ color: t.textMuted }}>
          {prefixo}
        </span>
      )}
      <input
        className={`${CAMPO} font-num`}
        style={campoStyle}
        type="number"
        min="0"
        max={max}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function CampoMoeda({ value, onChange }) {
  const t = useT();
  const campoStyle = { background: t.surface, border: `1px solid ${t.border}`, color: t.text };
  const [focado, setFocado] = useState(false);
  const raw = value === undefined || value === null ? "" : String(value);
  const display = focado ? raw : N(raw).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <input
      className={`${CAMPO} font-num`}
      style={campoStyle}
      type="text"
      inputMode="decimal"
      value={display}
      onFocus={() => setFocado(true)}
      onBlur={() => setFocado(false)}
      onChange={(e) => onChange(normalizarValorBR(e.target.value))}
    />
  );
}

export function CampoPct({ label, value, onChange, ajuda, faq }) {
  const t = useT();
  const campoStyle = { background: t.surface, border: `1px solid ${t.border}`, color: t.text };
  return (
    <Campo label={label} ajuda={ajuda} faq={faq}>
      <div className="flex items-center gap-1">
        <input
          className={`${CAMPO} font-num`}
          style={campoStyle}
          type="number"
          min="0"
          max="99"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="text-sm" style={{ color: t.textMuted }}>
          %
        </span>
      </div>
    </Campo>
  );
}

// Mesma receita já usada em Fechamento Mensal, Evolução e Insumos internos (Estoque) —
// aberto/fechado + ChevronDown que gira + pop-in na entrada. resumo aparece só quando
// fechado, pra dar pra escanear sem precisar abrir.
export function SecaoColapsavel({ titulo, icon: Icon, ajuda, faq, resumo, abertoInicial = false, children }) {
  const t = useT();
  const [aberto, setAberto] = useState(abertoInicial);
  // Bloco 20: o botão cobre o cabeçalho inteiro e o "?" fica por cima dele, como
  // irmão. Antes o "?" ficava dentro do botão (controle dentro de controle), o que
  // confunde leitores de tela. O visual continua igual: o "?" acompanha a última
  // palavra do título quando ele quebra em duas linhas.
  const rotulo = !aberto && typeof resumo === "string" && resumo ? `${titulo} — ${resumo}` : titulo;
  return (
    <div className="rounded-xl" style={{ border: `1px solid ${t.border}`, overflow: "hidden" }}>
      <div className="btn-press relative flex items-center justify-between w-full px-3 py-2.5">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          aria-label={rotulo}
          className="absolute inset-0 w-full"
        />
        <span className="pointer-events-none flex items-center gap-1.5 min-w-0">
          {Icon && <Icon size={14} style={{ color: t.primaryText, flexShrink: 0 }} aria-hidden="true" />}
          <span className="text-sm font-semibold text-left leading-snug min-w-0" style={{ color: t.text }}>
            <span aria-hidden="true">{titulo}</span>
            {ajuda && (
              <span className="pointer-events-auto relative">
                <Ajuda texto={ajuda} faq={faq} />
              </span>
            )}
          </span>
        </span>
        <span className="pointer-events-none flex items-center gap-2 min-w-0" aria-hidden="true">
          {!aberto && resumo && (
            <span className="text-[11px] truncate max-w-[42vw] min-w-0" style={{ color: t.textMuted }}>
              {resumo}
            </span>
          )}
          <ChevronDown
            size={15}
            style={{ color: t.textMuted, flexShrink: 0, transform: aberto ? "rotate(180deg)" : "none", transition: "transform .2s ease" }}
          />
        </span>
      </div>
      {aberto && <div className="pop-in px-3 pb-3">{children}</div>}
    </div>
  );
}
