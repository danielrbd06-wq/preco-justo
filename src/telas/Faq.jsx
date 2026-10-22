/* Aba FAQ (carregada sob demanda, Bloco 21): perguntas, privacidade e termos. */
import { CheckCircle2, ChevronDown, Download, FileText, HelpCircle, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apagarTodosOsDados } from "../armazenamento.js";
import { Girando } from "../componentes/base.jsx";
import { CAMPO } from "../componentes/campos.jsx";
import { BlocoResposta } from "../componentes/folhas.jsx";
import { baixarCopiaSeguranca } from "../componentes/salvamento.jsx";
import { FAQ_DADOS } from "../dados/faq.js";
import { useT } from "../tema.js";

function CartaoPrivacidade({ aceite, onAbrirDocumento }) {
  const t = useT();
  const [confirmando, setConfirmando] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [copiaBaixada, setCopiaBaixada] = useState(false);
  const [apagando, setApagando] = useState(false);
  const dataAceite = aceite ? new Date(aceite.aceitoEm).toLocaleDateString("pt-BR") : null;

  const baixar = async () => {
    setBaixando(true);
    await baixarCopiaSeguranca();
    setBaixando(false);
    setCopiaBaixada(true);
  };
  const apagar = async () => {
    setApagando(true);
    await apagarTodosOsDados();
    window.location.reload();
  };
  const botaoClaro = "btn-press inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold";

  return (
    <section
      id="privacidade-e-termos"
      aria-labelledby="privacidade-titulo"
      className="fade-up rounded-2xl p-4 sm:p-5 space-y-3"
      style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow, scrollMarginTop: 80 }}
    >
      <div className="flex items-center gap-1.5">
        <ShieldCheck size={14} style={{ color: t.primaryText }} />
        <h2 id="privacidade-titulo" className="text-sm font-semibold" style={{ color: t.text }}>
          Privacidade e termos
        </h2>
      </div>
      <p className="text-sm" style={{ color: t.text }}>
        Seus dados ficam só neste aparelho. O Preço Justo não recebe nada do que você digita.
      </p>
      {dataAceite && (
        <p className="text-xs" style={{ color: t.textMuted }}>
          Você aceitou a versão {aceite.versao} (preliminar) em {dataAceite}.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {[
          ["termos", "Termos de Uso"],
          ["privacidade", "Aviso de Privacidade"],
        ].map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            onClick={() => onAbrirDocumento(id)}
            className={botaoClaro}
            style={{ background: t.surfaceAlt, color: t.text, border: `1px solid ${t.border}` }}
          >
            <FileText size={14} /> {rotulo}
          </button>
        ))}
      </div>
      <div className="pt-3" style={{ borderTop: `1px solid ${t.border}` }}>
        {!confirmando ? (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className="btn-press touch-target inline-flex items-center gap-1.5 text-xs font-medium"
            style={{ color: t.danger }}
          >
            <Trash2 size={14} /> Apagar todos os dados deste aparelho
          </button>
        ) : (
          <div className="pop-in rounded-xl p-3 space-y-2.5 text-xs" role="alert" style={{ background: t.dangerSoft, color: t.danger }}>
            <p className="font-semibold">Apagar tudo o que o app guardou neste aparelho?</p>
            <p>
              Negócio, serviços, fechamentos, estoque e Observatório serão apagados. Não dá para desfazer. Se quiser guardar, baixe antes a
              cópia de segurança.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={baixar}
                disabled={baixando || apagando}
                className={botaoClaro}
                style={{ background: t.surface, color: t.text, border: `1px solid ${t.border}` }}
              >
                {baixando ? <Girando /> : copiaBaixada ? <CheckCircle2 size={14} className="pop-in" /> : <Download size={14} />}
                {baixando ? "Baixando…" : copiaBaixada ? "Cópia baixada" : "Baixar cópia antes"}
              </button>
              <button
                type="button"
                onClick={apagar}
                disabled={apagando}
                className={botaoClaro}
                style={{ background: t.danger, color: t.onDanger }}
              >
                {apagando ? <Girando /> : <Trash2 size={14} />}
                {apagando ? "Apagando…" : "Sim, apagar tudo"}
              </button>
              {!apagando && (
                <button
                  type="button"
                  onClick={() => setConfirmando(false)}
                  className="btn-press rounded-xl px-3 py-2 text-xs font-medium"
                  style={{ color: t.danger }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function FaqItem({ id, pergunta, blocos, aberto, onToggle, destaque }) {
  const t = useT();
  return (
    <div
      id={id ? `faq-${id}` : undefined}
      className="fade-up rounded-xl"
      style={{
        background: t.surface,
        border: `1px solid ${destaque ? t.primary : t.border}`,
        boxShadow: t.shadow,
        overflow: "hidden",
        transition: "border-color .6s ease",
        scrollMarginTop: 80,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={aberto}
        className="btn-press touch-target flex items-center justify-between w-full text-left px-4 py-3.5 gap-3"
      >
        <span className="text-sm font-medium" style={{ color: t.text }}>
          {pergunta}
        </span>
        <ChevronDown
          size={16}
          style={{ color: t.textMuted, flexShrink: 0, transform: aberto ? "rotate(180deg)" : "none", transition: "transform .2s ease" }}
        />
      </button>
      {aberto && (
        <div className="pop-in px-4 pb-4" style={{ borderTop: `1px solid ${t.border}`, paddingTop: 12 }}>
          {blocos.map((bloco, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: texto fixo do FAQ, que nunca é reordenado nem editado
            <BlocoResposta key={i} bloco={bloco} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Faq({ alvo, aceite, onAbrirDocumento } = {}) {
  const t = useT();
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("Todos");
  const [abertos, setAbertos] = useState(() => (alvo?.id ? { [alvo.id]: true } : {}));
  const [destaque, setDestaque] = useState(alvo?.id || null);

  // Chegou aqui por "Ver todas as perguntas" de uma explicação: a pergunta
  // já vem aberta, a tela rola até ela e a borda fica destacada por instantes.
  useEffect(() => {
    if (!alvo?.id) return undefined;
    setAbertos((prev) => ({ ...prev, [alvo.id]: true }));
    setDestaque(alvo.id);
    const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const rolar = setTimeout(() => {
      document.getElementById(`faq-${alvo.id}`)?.scrollIntoView({ behavior: reduzido ? "auto" : "smooth", block: "start" });
    }, 60);
    const apagar = setTimeout(() => setDestaque(null), 2200);
    return () => {
      clearTimeout(rolar);
      clearTimeout(apagar);
    };
  }, [alvo]);

  const toggle = (id) => setAbertos((prev) => ({ ...prev, [id]: !prev[id] }));

  const categorias = ["Todos", ...FAQ_DADOS.map((c) => c.categoria)];
  const buscaLower = busca.trim().toLowerCase();

  const textoDosBlocos = (blocos) =>
    blocos
      .map((b) => (b.tipo === "lista" ? b.itens.map((i) => `${i.titulo} ${i.texto}`).join(" ") : b.texto))
      .join(" ")
      .toLowerCase();

  const grupos = FAQ_DADOS.filter((c) => categoriaAtiva === "Todos" || c.categoria === categoriaAtiva)
    .map((c) => ({
      ...c,
      perguntas: c.perguntas.filter(
        (p) => !buscaLower || p.pergunta.toLowerCase().includes(buscaLower) || textoDosBlocos(p.blocos).includes(buscaLower),
      ),
    }))
    .filter((c) => c.perguntas.length > 0);

  const totalPerguntas = useMemo(() => FAQ_DADOS.reduce((s, c) => s + c.perguntas.length, 0), []);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: t.surfaceAlt, border: `1px dashed ${t.border}` }}>
        <HelpCircle size={16} className="mt-0.5 shrink-0" style={{ color: t.textMuted }} />
        <p className="text-sm" style={{ color: t.text }}>
          Cada pergunta explica por que o app pede aquele dado e como o número calculado ajuda a decidir algo real no seu negócio.
        </p>
      </div>

      <input
        className={CAMPO}
        style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
        placeholder="Buscar por palavra-chave (ex: pró-labore, ponto de equilíbrio)"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        aria-label="Buscar no FAQ"
      />

      <div className="flex gap-1 p-1 rounded-lg w-fit overflow-x-auto" style={{ background: t.surfaceAlt, maxWidth: "100%" }}>
        {categorias.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => setCategoriaAtiva(c)}
            className="btn-press rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap"
            style={{
              background: categoriaAtiva === c ? t.surface : "transparent",
              color: categoriaAtiva === c ? t.text : t.textMuted,
              boxShadow: categoriaAtiva === c ? t.shadow : "none",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {grupos.length === 0 ? (
        <div className="rounded-2xl p-6 text-center fade-up" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <p className="text-sm" style={{ color: t.textMuted }}>
            Nenhuma pergunta encontrada para "{busca}".
          </p>
        </div>
      ) : (
        grupos.map((grupo) => {
          const GrupoIcon = grupo.icon;
          return (
            <div key={grupo.categoria} className="space-y-2">
              <div className="flex items-center gap-1.5 mt-2">
                <GrupoIcon size={14} style={{ color: t.primaryText }} />
                <span className="text-sm font-semibold" style={{ color: t.text }}>
                  {grupo.categoria}
                </span>
              </div>
              <div className="space-y-2">
                {grupo.perguntas.map((p) => (
                  <FaqItem
                    key={p.id}
                    id={p.id}
                    pergunta={p.pergunta}
                    blocos={p.blocos}
                    aberto={!!abertos[p.id]}
                    onToggle={() => toggle(p.id)}
                    destaque={destaque === p.id}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}

      <CartaoPrivacidade aceite={aceite} onAbrirDocumento={onAbrirDocumento} />

      <p className="text-[11px] text-center pt-2" style={{ color: t.textMuted }}>
        {totalPerguntas} perguntas · baseado em princípios de contabilidade gerencial consolidados e na legislação vigente do Simples
        Nacional (LC 123/2006).
      </p>
    </div>
  );
}
