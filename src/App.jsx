/* Casca do app: tema, cabeçalho, abas e o que fica por cima da tela.
   Cada aba mora em src/telas/; Painel, Estoque, Observatório e FAQ
   chegam sob demanda (Bloco 21). Mapa dos arquivos: CONTEXTO.md. */
import { Building2, Calculator, CheckCircle2, HelpCircle, LayoutDashboard, MapPin, Monitor, Moon, Package, Sun, X } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { excluirComFallback, lerAceiteGuardado, lerComFallback, listarComFallback, salvarComFallback } from "./armazenamento.js";
import { computeNegocioDerivado } from "./calculos.js";
import { AvisoNovaVersao } from "./componentes/AvisoNovaVersao.jsx";
import { LimiteDeErro, SkeletonCard } from "./componentes/base.jsx";
import { FaqLinkContext } from "./componentes/campos.jsx";
import { PainelDocumentoLegal, PainelExplicacao, TelaAceite } from "./componentes/folhas.jsx";
import { LogoMark, LogoWordmark } from "./componentes/marca.jsx";
import { gerarDadosExemplo, NEGOCIO_PADRAO } from "./dados/negocio.js";
import { Calculadora } from "./telas/calculadora/Calculadora.jsx";
import { Negocio } from "./telas/negocio/Negocio.jsx";
import { ThemeCtx, TOKENS, useT } from "./tema.js";
import { CHAVE_ACEITE, lerAceite, montarAceite } from "./termos.js";
import { VERSAO_APP } from "./versao.js";

const CHAVE_TEMA = "preco-justo:tema";

/* Abas sob demanda (Bloco 21). Negócio e Calculadora são a primeira tela e   */
/* vêm junto com o app. As outras quatro (e os gráficos que elas usam) só     */
/* baixam quando a aba é escolhida: o carregamento começa no clique, junto    */
/* com o esqueleto da troca de aba, e o Suspense mostra o mesmo esqueleto     */
/* se a internet demorar mais que isso.                                       */
const CARREGAR_ABA = {
  painel: () => import("./telas/painel/Painel.jsx"),
  estoque: () => import("./telas/Estoque.jsx"),
  observatorio: () => import("./telas/Observatorio.jsx"),
  faq: () => import("./telas/Faq.jsx"),
};
const Painel = lazy(CARREGAR_ABA.painel);
const Estoque = lazy(CARREGAR_ABA.estoque);
const Observatorio = lazy(CARREGAR_ABA.observatorio);
const Faq = lazy(CARREGAR_ABA.faq);

function EsqueletoAba() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

function App({ onSair, nomeEstabelecimento } = {}) {
  const [temaPref, setTemaPref] = useState("automatico");
  const [, setTemaCarregado] = useState(false);
  const [sistemaEscuro, setSistemaEscuro] = useState(() =>
    typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)").matches : false,
  );

  useLayoutEffect(() => {
    (async () => {
      const valor = await lerComFallback(CHAVE_TEMA);
      if (valor) setTemaPref(valor);
      setTemaCarregado(true);
    })();
    if (window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e) => setSistemaEscuro(e.matches);
      mq.addEventListener ? mq.addEventListener("change", handler) : mq.addListener(handler);
      return () => (mq.removeEventListener ? mq.removeEventListener("change", handler) : mq.removeListener(handler));
    }
  }, []);

  const temaResolvido = temaPref === "automatico" ? (sistemaEscuro ? "escuro" : "claro") : temaPref;
  const t = TOKENS[temaResolvido];

  const mudarTema = useCallback((novo) => {
    setTemaPref(novo);
    salvarComFallback(CHAVE_TEMA, novo);
  }, []);

  const [negocio, setNegocio] = useState(null);
  const [servicos, setServicos] = useState(null);
  const [tab, setTab] = useState("negocio");
  // Pergunta do FAQ aberta por cima da tela (a partir de uma dica "?") e
  // pergunta a destacar quando o usuário escolhe ir para a aba FAQ.
  const [explicacaoFaq, setExplicacaoFaq] = useState(null);
  const [faqAlvo, setFaqAlvo] = useState(null);
  const [tabLoading, setTabLoading] = useState(true);
  const [servicoEmEdicao, setServicoEmEdicao] = useState(null);
  // Bloco 12: aceite dos termos (lido na hora, sem esperar, para não piscar a tela)
  // e documento legal aberto por cima da tela.
  const [aceite, setAceite] = useState(() => lerAceite(lerAceiteGuardado()));
  const [aceiteAnterior] = useState(() => Boolean(lerAceiteGuardado()));
  const [documentoLegal, setDocumentoLegal] = useState(null);
  const aceitarTermos = useCallback(() => {
    const texto = montarAceite();
    try {
      window.localStorage.setItem(CHAVE_ACEITE, texto);
    } catch {
      /* sem localStorage: vale só nesta sessão */
    }
    setAceite(lerAceite(texto));
  }, []);

  const editarServico = useCallback((servico) => {
    setServicoEmEdicao(servico);
    setTab("calculadora");
  }, []);

  const carregarNegocio = useCallback(async () => {
    const valor = await lerComFallback("negocio:config");
    let parsed = NEGOCIO_PADRAO;
    try {
      parsed = valor ? JSON.parse(valor) : NEGOCIO_PADRAO;
    } catch {
      parsed = NEGOCIO_PADRAO;
    }
    setNegocio(parsed);
    const nd = computeNegocioDerivado(parsed);
    setTab(nd.configurado ? "calculadora" : "negocio");
  }, []);

  const carregarServicos = useCallback(async () => {
    try {
      const chaves = await listarComFallback("servicos:");
      const resultados = await Promise.all(
        chaves.map(async (k) => {
          const valor = await lerComFallback(k);
          try {
            return valor ? JSON.parse(valor) : null;
          } catch {
            return null;
          }
        }),
      );
      setServicos(resultados.filter(Boolean).sort((a, b) => b.criadoEm - a.criadoEm));
    } catch {
      setServicos([]);
    }
  }, []);

  useEffect(() => {
    carregarNegocio();
    carregarServicos();
  }, [carregarNegocio, carregarServicos]);

  const salvarNegocio = useCallback(
    (novo) => {
      // Guia o usuário pro próximo passo só na PRIMEIRA vez que o negócio fica configurado —
      // depois disso, quem já usa o app não quer ser jogado de aba toda vez que ajusta um valor.
      const configuradoAntes = negocio ? computeNegocioDerivado(negocio).configurado : false;
      const configuradoDepois = computeNegocioDerivado(novo).configurado;
      setNegocio(novo);
      salvarComFallback("negocio:config", JSON.stringify(novo));
      if (!configuradoAntes && configuradoDepois) {
        setTimeout(() => setTab("calculadora"), 1100);
      }
    },
    [negocio],
  );

  const salvarServico = useCallback((registro) => {
    setServicos((prev) => {
      const lista = prev || [];
      const existe = lista.some((s) => s.id === registro.id);
      return existe ? lista.map((s) => (s.id === registro.id ? registro : s)) : [registro, ...lista];
    });
    salvarComFallback(`servicos:${registro.id}`, JSON.stringify(registro));
  }, []);

  const removerServico = useCallback((id) => {
    setServicos((prev) => (prev || []).filter((s) => s.id !== id));
    excluirComFallback(`servicos:${id}`);
  }, []);

  // Carrega negócio + 3 serviços de exemplo, prontos pra demonstração completa
  // (Painel, DRE, gráficos). Sobrescreve o que já existe — a confirmação de
  // "tem certeza" acontece ANTES, dentro do componente Negócio. Remove os
  // serviços antigos do storage de verdade (não só do estado local), senão
  // eles voltariam a aparecer depois de um reload.
  // O perfil (nome, segmento, modelo, cidade) é do usuário, não do exemplo: ele é
  // mantido. Sem isso o perfil voltava vazio, o segmento sumia e o assistente
  // inicial reaparecia como se nunca tivesse sido preenchido (Issue #4).
  const carregarExemplo = useCallback(() => {
    const { negocio: exemploBase, servicos: servicosExemplo } = gerarDadosExemplo();
    const negocioExemplo = negocio?.perfil?.segmento ? { ...exemploBase, perfil: negocio.perfil } : exemploBase;
    setNegocio(negocioExemplo);
    salvarComFallback("negocio:config", JSON.stringify(negocioExemplo));
    setServicos((prevServicos) => {
      (prevServicos || []).forEach((s) => {
        excluirComFallback(`servicos:${s.id}`);
      });
      return servicosExemplo;
    });
    servicosExemplo.forEach((s) => {
      salvarComFallback(`servicos:${s.id}`, JSON.stringify(s));
    });
    setTab("calculadora");
  }, [negocio]);

  // A troca de aba é o gatilho do esqueleto de carregamento; a aba sob demanda
  // começa a baixar no mesmo instante (falha aqui é tratada pelo LimiteDeErro).
  useEffect(() => {
    CARREGAR_ABA[tab]?.().catch(() => {});
    setTabLoading(true);
    const tm = setTimeout(() => setTabLoading(false), 320);
    return () => clearTimeout(tm);
  }, [tab]);

  const nd = useMemo(() => (negocio ? computeNegocioDerivado(negocio) : null), [negocio]);

  return (
    <ThemeCtx.Provider value={t}>
      <FaqLinkContext.Provider value={setExplicacaoFaq}>
        <AvisoNovaVersao />
        {/* 100dvh em vez de 100vh: no mobile, 100vh é calculado com a barra de endereço do  */}
        {/* navegador ESCONDIDA (o maior viewport possível) — não com o que está realmente  */}
        {/* visível. Como a barra de baixo é fixed;bottom:0, ela ficava posicionada relativa */}
        {/* a esse viewport maior, empurrada pra fora da área visível até a barra de         */}
        {/* endereço sumir sozinha (o que só costuma acontecer rolando a tela) — exatamente  */}
        {/* o "só aparece quando rolo pro final" relatado. 100dvh recalcula ao vivo conforme */}
        {/* a barra do navegador aparece/some, e é o jeito atual recomendado de resolver     */}
        {/* isso (suporte já é universal nos navegadores mobile modernos).                   */}
        <div style={{ background: t.bg, minHeight: "100dvh", color: t.text, transition: "background .2s ease, color .2s ease" }}>
          <style>{`
          * { font-family: 'Poppins', sans-serif; }
          .font-poppins { font-family: 'Poppins', sans-serif; }
          .font-num { font-variant-numeric: tabular-nums; }
          /* Tipografia de leitura (Bloco 7). Alinhamento sempre à esquerda — nunca        */
          /* justificado: em colunas estreitas e sem hifenização o justificado abre "rios" */
          /* de espaço entre as palavras e piora a leitura (WCAG 1.4.8).                   */
          /* pretty: evita palavra sozinha na última linha dos parágrafos.                */
          /* balance: equilibra o tamanho das linhas em títulos curtos.                    */
          p, li, label { text-wrap: pretty; }
          h1, h2, h3, .font-semibold { text-wrap: balance; }
          /* Largura máxima de linha (~75 caracteres): no computador os textos de apoio   */
          /* corriam a largura inteira dos cartões. Blocos centralizados continuam no meio. */
          main p { max-width: 75ch; }
          /* Legendas pequenas (10-12px): "ch" encolhe com a letra e 75ch viraria ~450px,  */
          /* quebrando frases curtas em duas linhas com vazio à direita. Limite fixo maior. */
          main p:where(.text-xs, .text-\\[11px\\], .text-\\[10px\\]) { max-width: 42rem; }
          main .text-center p, main p.text-center { margin-left: auto; margin-right: auto; }
          .skeleton-shimmer {
            background: linear-gradient(90deg, ${t.surfaceAlt} 25%, ${t.border} 37%, ${t.surfaceAlt} 63%);
            background-size: 400% 100%;
            animation: shimmer 1.4s ease-in-out infinite;
          }
          /* Mapa da concorrência (Bloco 6): mira ao marcar um ponto; no tema escuro, as   */
          /* ruas do OpenStreetMap invertidas para não acender a tela.                    */
          .mapa-marcando, .mapa-marcando .leaflet-interactive { cursor: crosshair !important; }
          .mapa-concorrencia .leaflet-control-attribution { font-size: 10px; }
          .mapa-escuro .leaflet-tile { filter: invert(1) hue-rotate(180deg) brightness(.92) contrast(.9); }
          .mapa-escuro .leaflet-control-attribution { background: rgba(21,27,46,.85); color: #94A3B8; }
          .mapa-escuro .leaflet-control-attribution a { color: #B7ACFF; }
          .mapa-escuro .leaflet-bar a { background: #1B2338; color: #F5F7FA; border-color: #28304A; }
          @keyframes shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
          @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
          .fade-up { animation: fadeUp .3s ease both; }
          @keyframes popIn { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
          .pop-in { animation: popIn .2s cubic-bezier(.2,.8,.2,1) both; }
          /* Painel de explicação (sheet/diálogo): entrada e saída simétricas */
          @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes sheetIn { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
          .backdrop-in { animation: backdropIn .2s ease both; }
          .backdrop-out { animation: backdropIn .18s ease reverse both; }
          .sheet-in { animation: sheetIn .26s cubic-bezier(.2,.8,.2,1) both; }
          .sheet-out { animation: sheetIn .18s ease-in reverse both; }
          .btn-press { transition: transform .2s ease, opacity .2s ease, background .2s ease, border-color .2s ease, box-shadow .2s ease; }
          .btn-press:active { transform: scale(.97); }
          .tab-btn { transition: color .2s ease, background .2s ease; white-space: nowrap; }
          /* Área de toque real de 44x44px em botões de ícone pequenos, sem mudar o        */
          /* tamanho visual — hitbox invisível centralizada, maior que o ícone em si.       */
          .touch-target { position: relative; }
          .touch-target::after {
            content: ''; position: absolute; top: 50%; left: 50%;
            width: 44px; height: 44px;
            transform: translate(-50%, -50%);
          }
          /* Variante de 48x48 (mínimo recomendado pelo Material Design) pra ações de alta       */
          /* frequência em ícone pequeno: remover/excluir item e tabs do rodapé no mobile.        */
          .touch-target-48 { position: relative; }
          .touch-target-48::after {
            content: ''; position: absolute; top: 50%; left: 50%;
            width: 48px; height: 48px;
            transform: translate(-50%, -50%);
          }
          /* iOS Safari dá zoom automático ao focar <input> com font-size abaixo de 16px —        */
          /* trava o tamanho visual só nos campos em telas pequenas pra evitar esse zoom.          */
          @media (max-width: 640px) {
            input, select, textarea { font-size: 16px !important; }
          }
          /* (Removido: "html, body { overflow-x: hidden }" que existia aqui — corrigia o    */
          /* transbordo horizontal, mas quebrava o position:fixed da barra de baixo, que    */
          /* passou a "rolar junto" com a página em vez de ficar fixa na tela. overflow no   */
          /* body muda o contexto de posicionamento de elementos fixed em navegadores        */
          /* mobile — é um problema conhecido do CSS. A correção real (min-w-0 +             */
          /* overflow-hidden nos botões da barra, alguns linhas abaixo) já resolve o         */
          /* transbordo na origem, sem precisar dessa rede de segurança que tinha esse       */
          /* efeito colateral.                                                               */
          input, button, select, textarea { transition: border-color .2s ease, box-shadow .2s ease, background .2s ease; }
          input:focus-visible, button:focus-visible, select:focus-visible {
            outline: 2px solid ${t.primary}; outline-offset: 2px;
          }
          input[type=range] { accent-color: ${t.primary}; }
          ::selection { background: ${t.primarySoft}; }
          @media print {
            body { background: #fff !important; }
            .no-print { display: none !important; }
            #area-impressao { background: #fff; }
            #memorial-calculo-wrapper { display: none; }
          }
          /* Memorial de cálculo: escondido na tela sempre; só aparece na          */
          /* impressão quando o botão específico dele foi clicado (classe no body) */
          @media print {
            body.imprimindo-memorial #area-impressao,
            body.imprimindo-memorial .no-print,
            body.imprimindo-memorial .conteudo-normal-painel { display: none !important; }
            body.imprimindo-memorial #memorial-calculo-wrapper { display: block !important; }
          }
          @media (prefers-reduced-motion: reduce) {
            .skeleton-shimmer, .fade-up, .pop-in, .btn-press, input, button,
            .backdrop-in, .backdrop-out, .sheet-in, .sheet-out { animation: none !important; transition: none !important; }
          }
        `}</style>

          <Header
            temaPref={temaPref}
            mudarTema={mudarTema}
            onSair={onSair}
            nomeEstabelecimento={nomeEstabelecimento}
            perfil={negocio?.perfil}
          />
          <TabNav tab={tab} setTab={setTab} configurado={nd?.configurado} />

          <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-24 pt-6" style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom))" }}>
            {tabLoading || !negocio || servicos === null ? (
              <EsqueletoAba />
            ) : (
              <div className="fade-up">
                <LimiteDeErro
                  key={`${tab}-${servicoEmEdicao?.id || "novo"}`}
                  onReset={() => {
                    setServicoEmEdicao(null);
                    setTab("painel");
                  }}
                >
                  <Suspense fallback={<EsqueletoAba />}>
                    {tab === "negocio" && (
                      <Negocio negocio={negocio} onSalvar={salvarNegocio} servicos={servicos} onCarregarExemplo={carregarExemplo} />
                    )}
                    {tab === "calculadora" && (
                      <Calculadora
                        nd={nd}
                        negocioConfigurado={nd?.configurado}
                        irParaNegocio={() => setTab("negocio")}
                        servicos={servicos}
                        onSalvarServico={salvarServico}
                        onRemoverServico={removerServico}
                        servicoEmEdicao={servicoEmEdicao}
                        setServicoEmEdicao={setServicoEmEdicao}
                        onTerminarEdicao={() => setServicoEmEdicao(null)}
                      />
                    )}
                    {tab === "painel" && (
                      <Painel
                        nd={nd}
                        negocio={negocio}
                        servicos={servicos}
                        onRemoverServico={removerServico}
                        onEditarServico={editarServico}
                      />
                    )}
                    {tab === "estoque" && <Estoque negocio={negocio} onSalvarNegocio={salvarNegocio} />}
                    {tab === "observatorio" && <Observatorio servicos={servicos} nd={nd} cidadePerfil={negocio?.perfil?.cidade} />}
                    {tab === "faq" && <Faq alvo={faqAlvo} aceite={aceite} onAbrirDocumento={setDocumentoLegal} />}
                  </Suspense>
                </LimiteDeErro>
              </div>
            )}
          </main>
        </div>
        {explicacaoFaq && (
          <PainelExplicacao
            faqId={explicacaoFaq}
            onFechar={() => setExplicacaoFaq(null)}
            onVerFaq={() => {
              setFaqAlvo({ id: explicacaoFaq, em: Date.now() });
              setTab("faq");
            }}
          />
        )}
        {!aceite && <TelaAceite atualizacao={aceiteAnterior} onAceitar={aceitarTermos} onLer={setDocumentoLegal} />}
        {documentoLegal && <PainelDocumentoLegal documento={documentoLegal} onFechar={() => setDocumentoLegal(null)} />}
      </FaqLinkContext.Provider>
    </ThemeCtx.Provider>
  );
}

/* ======================================================================= */
/* Header + seletor de tema                                                */
/* ======================================================================= */
function Header({ temaPref, mudarTema, onSair, nomeEstabelecimento, perfil }) {
  const t = useT();
  const [abertoMenu, setAbertoMenu] = useState(false);
  const opcoes = [
    { id: "claro", label: "Claro", icon: Sun },
    { id: "escuro", label: "Escuro", icon: Moon },
    { id: "automatico", label: "Automático", icon: Monitor },
  ];
  const IconeAtual = opcoes.find((o) => o.id === temaPref)?.icon || Monitor;
  const nomeExibido = nomeEstabelecimento || perfil?.nomeFantasia || "Calcule. Analise. Decida.";
  const localExibido = perfil?.cidade ? ` · ${perfil.cidade}${perfil.estado ? `, ${perfil.estado}` : ""}` : "";

  return (
    <header className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-2">
      <div className="flex items-center gap-3">
        <LogoMark size={40} />
        <div className="min-w-0">
          <LogoWordmark size="text-xl" />
          <p className="text-[11px] mt-0.5 truncate" style={{ color: t.textMuted }}>
            {nomeExibido}
            {localExibido}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2 relative">
          <span className="font-num text-[10px] px-1.5 py-0.5 rounded" style={{ color: t.textMuted, background: t.surfaceAlt }}>
            {VERSAO_APP}
          </span>
          <button
            type="button"
            onClick={() => setAbertoMenu((v) => !v)}
            aria-label="Configurações de tema"
            className="btn-press flex items-center justify-center rounded-lg"
            style={{ width: 34, height: 34, background: t.surfaceAlt, color: t.text, border: `1px solid ${t.border}` }}
          >
            <IconeAtual size={16} />
          </button>
          {abertoMenu && (
            <div
              className="pop-in absolute right-0 top-11 z-40 rounded-xl p-1.5 w-44"
              style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}
            >
              <p className="text-[10px] uppercase tracking-wide px-2 pt-1 pb-1.5" style={{ color: t.textMuted }}>
                Tema
              </p>
              {opcoes.map((o) => {
                const Icon = o.icon;
                const ativo = temaPref === o.id;
                return (
                  <button
                    type="button"
                    key={o.id}
                    onClick={() => {
                      mudarTema(o.id);
                      setAbertoMenu(false);
                    }}
                    className="btn-press w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left"
                    style={{ background: ativo ? t.primarySoft : "transparent", color: ativo ? t.primaryText : t.text }}
                  >
                    <Icon size={15} /> {o.label}
                    {ativo && <CheckCircle2 size={13} className="ml-auto" />}
                  </button>
                );
              })}
              {onSair && (
                <>
                  <div style={{ height: 1, background: t.border, margin: "4px 2px" }} />
                  <button
                    type="button"
                    onClick={() => {
                      setAbertoMenu(false);
                      onSair();
                    }}
                    className="btn-press w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left"
                    style={{ color: t.danger }}
                  >
                    <X size={15} /> Sair da conta
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const TAB_ITEMS = [
  { id: "negocio", label: "Negócio", icon: Building2 },
  { id: "calculadora", label: "Calculadora", icon: Calculator },
  { id: "painel", label: "Painel", icon: LayoutDashboard },
  { id: "estoque", label: "Estoque", icon: Package },
  { id: "observatorio", label: "Observatório", icon: MapPin },
  { id: "faq", label: "FAQ", icon: HelpCircle },
];

/* Nav de topo (pills) — tablet/desktop, >= 640px. Mesmo comportamento de sempre. */
function TabNavTopo({ tab, setTab, configurado }) {
  const t = useT();
  return (
    <nav className="hidden sm:block max-w-5xl mx-auto px-4 sm:px-6 mt-4 overflow-x-auto no-print">
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: t.surfaceAlt }}>
        {TAB_ITEMS.map((it) => {
          const Icon = it.icon;
          const active = tab === it.id;
          const precisaAtencao = it.id === "negocio" && !configurado;
          return (
            <button
              type="button"
              key={it.id}
              onClick={() => setTab(it.id)}
              className="tab-btn btn-press flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium relative"
              style={{
                background: active ? t.surface : "transparent",
                color: active ? t.primaryText : t.textMuted,
                boxShadow: active ? t.shadow : "none",
              }}
            >
              <Icon size={15} />
              {it.label}
              {precisaAtencao && (
                <span className="absolute -top-1 -right-1 rounded-full" style={{ width: 8, height: 8, background: t.danger }} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* Barra fixa no rodapé — mobile, < 640px. Alcance de polegar em vez do topo da tela.  */
/* Reaproveita o mesmo TAB_ITEMS e a mesma lógica de "precisa atenção" do nav de topo. */
function TabNavRodape({ tab, setTab, configurado }) {
  const t = useT();
  return (
    <nav
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 no-print grid grid-cols-6"
      style={{
        background: t.surface,
        borderTop: `1px solid ${t.border}`,
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: t.shadow,
      }}
    >
      {TAB_ITEMS.map((it) => {
        const Icon = it.icon;
        const active = tab === it.id;
        const precisaAtencao = it.id === "negocio" && !configurado;
        return (
          <button
            type="button"
            key={it.id}
            onClick={() => setTab(it.id)}
            className="tab-btn btn-press touch-target-48 flex flex-col items-center justify-center gap-0.5 py-2 relative min-w-0 overflow-hidden"
            style={{ color: active ? t.primaryText : t.textMuted }}
            aria-label={it.label}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={20} strokeWidth={active ? 2.4 : 2} />
            <span className="text-[10px] font-medium leading-none truncate max-w-full">{it.label}</span>
            {precisaAtencao && (
              <span className="absolute top-1 right-[26%] rounded-full" style={{ width: 6, height: 6, background: t.danger }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}

function TabNav({ tab, setTab, configurado }) {
  return (
    <>
      <TabNavTopo tab={tab} setTab={setTab} configurado={configurado} />
      <TabNavRodape tab={tab} setTab={setTab} configurado={configurado} />
    </>
  );
}

export default App;
