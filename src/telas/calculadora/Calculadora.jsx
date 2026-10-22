/* Aba Calculadora: passo a passo do preço de um serviço. */
import { AlertTriangle, Building2, CheckCircle2, Plus, Save, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { CHAVE_RASCUNHO_SERVICO, uid } from "../../armazenamento.js";
import {
  calcularParaExibicao,
  calcularReverso,
  calcularServico,
  comissaoEfetiva,
  fmtPct,
  N,
  normalizarValorBR,
  parcelaParceiro,
  taxaEfetiva,
} from "../../calculos.js";
import { useToast } from "../../componentes/base.jsx";
import { CAMPO, Campo, CampoNumero, CampoPct } from "../../componentes/campos.jsx";
import { BannerNaoSalvo, IndicadorAutoSalvar, useAutoSalvar, useRascunho } from "../../componentes/salvamento.jsx";
import { custosVariaveisIniciaisPorSegmento, TEMPLATES_SERVICO, TEMPLATES_SERVICO_POR_SEGMENTO } from "../../dados/segmentos.js";
import { useT } from "../../tema.js";
import { BibliotecaServicos, ComparativoPacote, ComparativoPreco, MontadorPacote } from "./Biblioteca.jsx";
import { BlocoComissaoETaxa, ListaCustosVariaveis } from "./CustosEComissao.jsx";
import { DecomposicaoCard, ResultadoCard, ResultadoReversoCard, SimuladorSensibilidade } from "./Resultados.jsx";

/* Abas de acesso rápido — mesma ação de clicar num card da biblioteca, só  */
/* que sempre visíveis e mais rápidas pra alternar entre serviços que já    */
/* existem, sem precisar rolar/buscar na lista abaixo. Rolagem horizontal   */
/* cuida do catálogo crescer.                                               */
function AbasServicos({ servicos, servicoAtivoId, onSelecionar, onNovo }) {
  const t = useT();
  if (!servicos || servicos.length === 0) return null;
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="flex gap-1.5" role="tablist" aria-label="Serviços cadastrados">
        {servicos.map((s) => {
          const ativo = servicoAtivoId === s.id;
          return (
            <button
              type="button"
              key={s.id}
              role="tab"
              aria-selected={ativo}
              onClick={() => onSelecionar(s)}
              className="btn-press shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap"
              style={{
                background: ativo ? t.primaryText : t.surfaceAlt,
                color: ativo ? t.onPrimary : t.textMuted,
                border: `1px solid ${ativo ? t.primaryText : t.border}`,
              }}
            >
              {s.nome}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onNovo}
        className="btn-press shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
        style={{ background: "transparent", color: t.primaryText, border: `1px dashed ${t.primaryText}88` }}
      >
        <Plus size={12} className="inline -mt-0.5 mr-0.5" />
        Novo
      </button>
    </div>
  );
}

/* Barra de progresso do wizard de criação — 5 passos clicáveis (não     */
/* trava avanço, só orienta; navegação livre pra frente/trás a qualquer  */
/* momento, consistente com o app nunca bloquear o usuário).             */
const PASSOS_WIZARD = [
  { id: 1, label: "Serviço" },
  { id: 2, label: "Materiais" },
  { id: 3, label: "Volume" },
  { id: 4, label: "Taxas" },
  { id: 5, label: "Resultado" },
];
function BarraProgressoWizard({ passo, onIr }) {
  const t = useT();
  return (
    <div className="flex items-center mb-4" role="tablist" aria-label="Etapas do novo serviço">
      {PASSOS_WIZARD.map((p, i) => (
        <React.Fragment key={p.id}>
          <button
            type="button"
            role="tab"
            aria-selected={passo === p.id}
            onClick={() => onIr(p.id)}
            className="btn-press touch-target flex flex-col items-center gap-1"
            style={{ flexShrink: 0 }}
            aria-label={`Ir pro passo ${p.id}: ${p.label}`}
          >
            <span
              className="flex items-center justify-center rounded-full font-num text-[11px] font-bold"
              style={{
                width: 24,
                height: 24,
                background: passo >= p.id ? t.primaryText : t.surfaceAlt,
                color: passo >= p.id ? t.onPrimary : t.textMuted,
                border: passo === p.id ? `2px solid ${t.primaryText}` : "1px solid transparent",
              }}
            >
              {passo > p.id ? "✓" : p.id}
            </span>
            <span className="text-[9px] font-medium" style={{ color: passo === p.id ? t.text : t.textMuted, whiteSpace: "nowrap" }}>
              {p.label}
            </span>
          </button>
          {i < PASSOS_WIZARD.length - 1 && (
            <div style={{ flex: 1, height: 2, background: passo > p.id ? t.primary : t.border, marginBottom: 14 }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export function Calculadora({
  nd,
  negocioConfigurado,
  irParaNegocio,
  servicos,
  onSalvarServico,
  onRemoverServico,
  servicoEmEdicao,
  setServicoEmEdicao,
  onTerminarEdicao,
}) {
  const t = useT();
  // Valores de um serviço novo; dependem do negócio (segmento, comissão e taxa médias).
  const segmentoNegocio = nd?.perfil?.segmento;
  const temComissaoEquipe = !!nd?.comissaoEquipe;
  const temTaxaNegocio = !!nd?.taxaRecebimento;
  const vazio = useMemo(
    () => ({
      nome: "",
      categoria: "",
      tipo: "servico",
      custosVariaveis: custosVariaveisIniciaisPorSegmento(segmentoNegocio),
      comissaoPct: "0",
      taxaCartaoPct: "0",
      margemPct: "20",
      atendimentosMes: "",
      horasAtendimento: "1",
      precoCobrado: "",
      // Serviço novo usa a comissão média da equipe quando ela existe (Bloco 4).
      comissaoModo: temComissaoEquipe ? "equipe" : "propria",
      // ...e a taxa média de recebimento do negócio, quando ela existe (Bloco 5).
      taxaModo: temTaxaNegocio ? "negocio" : "propria",
      comissaoEhCotaParte: false, // Bloco 11: comissão própria que é cota-parte de parceiro
    }),
    [segmentoNegocio, temComissaoEquipe, temTaxaNegocio],
  );

  const [modo, setModo] = useState("descobrir"); // 'descobrir' | 'ja-tenho'
  const [mostrarFormulario, setMostrarFormulario] = useState(() => !!servicoEmEdicao);
  const [passoWizard, setPassoWizard] = useState(1); // 1-5, só usado criando serviço novo
  const [nomeServico, setNomeServico] = useState(vazio.nome);
  const [categoria, setCategoria] = useState(vazio.categoria);
  const [tipo, setTipo] = useState(vazio.tipo);
  const [custosVariaveis, setCustosVariaveis] = useState(vazio.custosVariaveis);
  const [comissaoPct, setComissaoPct] = useState(vazio.comissaoPct);
  const [comissaoModo, setComissaoModo] = useState(vazio.comissaoModo);
  const [taxaCartaoPct, setTaxaCartaoPct] = useState(vazio.taxaCartaoPct);
  const [taxaModo, setTaxaModo] = useState(vazio.taxaModo);
  const [comissaoEhCotaParte, setComissaoEhCotaParte] = useState(vazio.comissaoEhCotaParte);
  const [margemPct, setMargemPct] = useState(vazio.margemPct);
  const [atendimentosMes, setAtendimentosMes] = useState(vazio.atendimentosMes);
  const [horasAtendimento, setHorasAtendimento] = useState(vazio.horasAtendimento);
  const [precoCobrado, setPrecoCobrado] = useState(vazio.precoCobrado);
  const [precoSeparadoReferencia, setPrecoSeparadoReferencia] = useState(null); // se != null, este serviço é um "pacote" combinando outros
  const [precoCobradoDebounced, setPrecoCobradoDebounced] = useState(vazio.precoCobrado);
  const [precoFocado, setPrecoFocado] = useState(false);
  const [confirmandoExclusaoForm, setConfirmandoExclusaoForm] = useState(false);
  const { show, node: toastNode } = useToast();
  const precoInputRef = useRef(null);

  // "sujo" = tem algo digitado que ainda não foi salvo neste serviço.
  const rascunhoAtual = useMemo(
    () => ({
      nome: nomeServico,
      categoria,
      tipo,
      custosVariaveis,
      comissaoPct,
      comissaoModo,
      comissaoEhCotaParte,
      taxaCartaoPct,
      taxaModo,
      margemPct,
      atendimentosMes,
      horasAtendimento,
      modo,
      precoCobrado,
    }),
    [
      nomeServico,
      categoria,
      tipo,
      custosVariaveis,
      comissaoPct,
      comissaoModo,
      comissaoEhCotaParte,
      taxaCartaoPct,
      taxaModo,
      margemPct,
      atendimentosMes,
      horasAtendimento,
      modo,
      precoCobrado,
    ],
  );
  const rascunhoBase = useMemo(
    () =>
      servicoEmEdicao
        ? {
            nome: servicoEmEdicao.nome,
            categoria: servicoEmEdicao.categoria || "",
            tipo: servicoEmEdicao.tipo || "servico",
            custosVariaveis: servicoEmEdicao.custosVariaveis,
            comissaoPct: String(servicoEmEdicao.comissaoPct),
            comissaoModo: servicoEmEdicao.comissaoModo || "propria",
            comissaoEhCotaParte: !!servicoEmEdicao.comissaoEhCotaParte,
            taxaCartaoPct: String(servicoEmEdicao.taxaCartaoPct),
            taxaModo: servicoEmEdicao.taxaModo || "propria",
            margemPct: String(servicoEmEdicao.margemPct),
            atendimentosMes: String(servicoEmEdicao.atendimentosMes),
            horasAtendimento: String(servicoEmEdicao.horasPorAtendimento),
            modo: servicoEmEdicao.modo === "ja-tenho" ? "ja-tenho" : "descobrir",
            precoCobrado:
              servicoEmEdicao.precoCobrado !== undefined && servicoEmEdicao.precoCobrado !== null
                ? String(servicoEmEdicao.precoCobrado)
                : "",
          }
        : vazio,
    [servicoEmEdicao, vazio],
  );
  const sujo = mostrarFormulario && JSON.stringify(rascunhoAtual) !== JSON.stringify(rascunhoBase);

  // Rascunho do serviço novo (Bloco 9; com useRascunho desde o Bloco 17): o que foi
  // digitado no assistente fica guardado no aparelho e volta ao reabrir a Calculadora,
  // depois de trocar de aba, recarregar a página ou atualizar o app. Só guarda quando
  // há algo preenchido, e nunca enquanto um serviço já salvo está sendo editado.
  const temConteudo = !!(
    nomeServico.trim() ||
    N(atendimentosMes) > 0 ||
    N(precoCobrado) > 0 ||
    custosVariaveis.some((c) => N(c.valor) > 0 || N(c.valorCompra) > 0)
  );
  const {
    recuperado: rascunhoRecuperado,
    descartar: descartarRascunho,
    dispensarAviso: dispensarAvisoRascunho,
  } = useRascunho(
    CHAVE_RASCUNHO_SERVICO,
    mostrarFormulario && temConteudo ? { ...rascunhoAtual, passoWizard, precoSeparadoReferencia } : null,
    {
      ativo: !servicoEmEdicao,
      aoRecuperar: (d) => {
        if (servicoEmEdicao) return false;
        setModo(d.modo === "ja-tenho" ? "ja-tenho" : "descobrir");
        setNomeServico(d.nome || "");
        setCategoria(d.categoria || "");
        setTipo(d.tipo || "servico");
        if (Array.isArray(d.custosVariaveis)) setCustosVariaveis(d.custosVariaveis);
        setComissaoPct(d.comissaoPct ?? vazio.comissaoPct);
        setComissaoModo(d.comissaoModo || "propria");
        setComissaoEhCotaParte(!!d.comissaoEhCotaParte);
        setTaxaCartaoPct(d.taxaCartaoPct ?? vazio.taxaCartaoPct);
        setTaxaModo(d.taxaModo || "propria");
        setMargemPct(d.margemPct ?? vazio.margemPct);
        setAtendimentosMes(d.atendimentosMes ?? "");
        setHorasAtendimento(d.horasAtendimento ?? vazio.horasAtendimento);
        setPrecoCobrado(d.precoCobrado ?? "");
        setPrecoCobradoDebounced(d.precoCobrado ?? "");
        setPrecoSeparadoReferencia(d.precoSeparadoReferencia ?? null);
        setPassoWizard(Math.min(5, Math.max(1, N(d.passoWizard) || 1)));
        setMostrarFormulario(true);
        return true;
      },
    },
  );

  // debounce ~300ms no preço informado, pra não recalcular tudo a cada tecla
  useEffect(() => {
    const tm = setTimeout(() => setPrecoCobradoDebounced(precoCobrado), 300);
    return () => clearTimeout(tm);
  }, [precoCobrado]);

  // foco automático ao entrar no Modo B
  useEffect(() => {
    if (modo === "ja-tenho" && mostrarFormulario) precoInputRef.current?.focus();
  }, [modo, mostrarFormulario]);

  useEffect(() => {
    if (servicoEmEdicao) {
      setMostrarFormulario(true);
      setModo(servicoEmEdicao.modo === "ja-tenho" ? "ja-tenho" : "descobrir");
      setCustosVariaveis(servicoEmEdicao.custosVariaveis);
      setComissaoPct(String(servicoEmEdicao.comissaoPct));
      setComissaoModo(servicoEmEdicao.comissaoModo || "propria");
      setComissaoEhCotaParte(!!servicoEmEdicao.comissaoEhCotaParte);
      setTaxaCartaoPct(String(servicoEmEdicao.taxaCartaoPct));
      setTaxaModo(servicoEmEdicao.taxaModo || "propria");
      setMargemPct(String(servicoEmEdicao.margemPct));
      setAtendimentosMes(String(servicoEmEdicao.atendimentosMes));
      setHorasAtendimento(String(servicoEmEdicao.horasPorAtendimento));
      setNomeServico(servicoEmEdicao.nome);
      setCategoria(servicoEmEdicao.categoria || "");
      setTipo(servicoEmEdicao.tipo || "servico");
      const pc = servicoEmEdicao.precoCobrado;
      setPrecoCobrado(pc !== undefined && pc !== null ? String(pc) : "");
      setPrecoCobradoDebounced(pc !== undefined && pc !== null ? String(pc) : "");
      setPrecoSeparadoReferencia(servicoEmEdicao.precoSeparadoReferencia ?? null);
      setConfirmandoExclusaoForm(false);
    }
  }, [servicoEmEdicao]);

  const resetarFormulario = () => {
    setModo("descobrir");
    setPassoWizard(1);
    setCustosVariaveis(vazio.custosVariaveis.map((i) => ({ ...i, id: uid() })));
    setComissaoPct(vazio.comissaoPct);
    setComissaoModo(vazio.comissaoModo);
    setComissaoEhCotaParte(false);
    setTaxaCartaoPct(vazio.taxaCartaoPct);
    setTaxaModo(vazio.taxaModo);
    setMargemPct(vazio.margemPct);
    setAtendimentosMes(vazio.atendimentosMes);
    setHorasAtendimento(vazio.horasAtendimento);
    setNomeServico(vazio.nome);
    setCategoria(vazio.categoria);
    setTipo(vazio.tipo);
    setConfirmandoExclusaoForm(false);
    setPrecoCobrado(vazio.precoCobrado);
    setPrecoCobradoDebounced(vazio.precoCobrado);
    setPrecoSeparadoReferencia(null);
    // Começar de novo, salvar ou fechar descarta o rascunho guardado.
    descartarRascunho();
  };

  const abrirNovo = () => {
    onTerminarEdicao();
    resetarFormulario();
    setMostrarFormulario(true);
  };
  const fecharFormulario = () => {
    onTerminarEdicao();
    resetarFormulario();
    setMostrarFormulario(false);
  };

  // Monta um "pacote": pré-preenche nome/categoria/custos/tempo a partir de 2+ serviços já
  // salvos escolhidos pelo usuário. NÃO inventa desconto — soma os custos variáveis e as
  // horas dos serviços selecionados (o usuário reduz manualmente se houver economia real de
  // tempo/material fazendo junto); guarda a soma dos preços separados só de referência, pra
  // comparar depois com o preço que o pacote realmente fechar.
  const montarPacote = (itensSelecionados, somaPrecoSeparado, somaHoras) => {
    onTerminarEdicao();
    resetarFormulario();
    setNomeServico(itensSelecionados.map((s) => s.nome).join(" + "));
    setCategoria("Combo");
    const custosMesclados = itensSelecionados.flatMap((s) => (s.custosVariaveis || []).map((item) => ({ ...item, id: uid() })));
    if (custosMesclados.length > 0) setCustosVariaveis(custosMesclados);
    setHorasAtendimento(String(somaHoras));
    setPrecoSeparadoReferencia(somaPrecoSeparado);
    setPassoWizard(1);
    setMostrarFormulario(true);
  };

  const servicosCalc = useMemo(() => (servicos || []).map((s) => ({ ...s, calc: calcularParaExibicao(s, nd) })), [servicos, nd]);

  // Soma quanto de cada insumo compartilhado já está alocado em OUTROS serviços salvos
  // (exclui o próprio serviço em edição) — pra avisar antes de passar de 100%.
  const alocacaoPorInsumoOutrosServicos = useMemo(() => {
    const mapa = {};
    (servicos || []).forEach((s) => {
      if (servicoEmEdicao && s.id === servicoEmEdicao.id) return;
      (s.custosVariaveis || []).forEach((item) => {
        if (item.modo === "compartilhado" && item.insumoId) {
          mapa[item.insumoId] = (mapa[item.insumoId] || 0) + N(item.percentualAlocado);
        }
      });
    });
    return mapa;
  }, [servicos, servicoEmEdicao]);

  const horasComprometidas = useMemo(
    () =>
      (servicos || [])
        .filter((x) => !servicoEmEdicao || x.id !== servicoEmEdicao.id)
        .reduce((s, x) => s + N(x.horasPorAtendimento) * N(x.atendimentosMes), 0),
    [servicos, servicoEmEdicao],
  );

  const horasEsteServico = N(horasAtendimento) * N(atendimentosMes);
  const capacidadeRestante = (nd?.horasTotais || 0) - horasComprometidas;
  const jornadaIrreal = nd?.horasTotais > 0 && horasEsteServico > capacidadeRestante;

  const resultadoA = useMemo(
    () =>
      calcularServico(
        {
          custosVariaveis,
          comissaoPct,
          comissaoModo,
          comissaoEhCotaParte,
          taxaCartaoPct,
          taxaModo,
          margemPct,
          horasPorAtendimento: horasAtendimento,
          atendimentosMes: N(atendimentosMes),
        },
        nd,
      ),
    [
      custosVariaveis,
      comissaoPct,
      comissaoModo,
      comissaoEhCotaParte,
      taxaCartaoPct,
      taxaModo,
      margemPct,
      horasAtendimento,
      atendimentosMes,
      nd,
    ],
  );

  const resultadoB = useMemo(
    () =>
      calcularReverso(
        {
          custosVariaveis,
          comissaoPct,
          comissaoModo,
          comissaoEhCotaParte,
          taxaCartaoPct,
          taxaModo,
          precoCobrado: precoCobradoDebounced,
          horasPorAtendimento: horasAtendimento,
          atendimentosMes: N(atendimentosMes),
          margemMetaPct: margemPct,
        },
        nd,
      ),
    [
      custosVariaveis,
      comissaoPct,
      comissaoModo,
      comissaoEhCotaParte,
      taxaCartaoPct,
      taxaModo,
      precoCobradoDebounced,
      horasAtendimento,
      atendimentosMes,
      margemPct,
      nd,
    ],
  );

  const resultadoAtivo = modo === "ja-tenho" ? resultadoB : resultadoA;
  // Comissão que de fato entra no preço (média da equipe ou a própria do serviço).
  const comissaoUsada = comissaoEfetiva({ comissaoPct, comissaoModo }, nd);
  // Idem para a taxa de cartão (média do negócio ou a própria do serviço).
  const taxaUsada = taxaEfetiva({ taxaCartaoPct, taxaModo }, nd);
  // Bloco 11: parte do preço que é cota-parte de parceiro (imposto e taxa caem na proporção).
  const parcelaAtual = parcelaParceiro({ comissaoPct, comissaoModo, comissaoEhCotaParte }, nd);

  // "Preço salvo" recalculado ao vivo com os parâmetros ORIGINAIS (sem as edições em
  // andamento), no MODO em que o serviço foi salvo, contra a config. atual do negócio.
  const precoOriginalAgora = useMemo(() => {
    if (!servicoEmEdicao) return null;
    const r = calcularParaExibicao(servicoEmEdicao, nd);
    return r.status === "ok" ? r.preco : null;
  }, [servicoEmEdicao, nd]);

  const montarRegistro = (idNovo) => ({
    id: idNovo || (servicoEmEdicao ? servicoEmEdicao.id : uid()),
    nome: nomeServico.trim() || "Serviço sem nome",
    categoria: categoria.trim(),
    tipo,
    criadoEm: !idNovo && servicoEmEdicao ? servicoEmEdicao.criadoEm : Date.now(),
    editadoEm: Date.now(),
    modo,
    custosVariaveis,
    comissaoPct: N(comissaoPct),
    comissaoModo,
    comissaoEhCotaParte: comissaoModo === "propria" && comissaoEhCotaParte,
    taxaCartaoPct: N(taxaCartaoPct),
    taxaModo,
    margemPct: N(margemPct),
    horasPorAtendimento: N(horasAtendimento),
    atendimentosMes: N(atendimentosMes),
    precoCobrado: modo === "ja-tenho" ? N(precoCobradoDebounced) : null,
    precoConfirmado: resultadoAtivo.status === "ok" ? resultadoAtivo.preco : null,
    precoSeparadoReferencia,
  });

  const salvar = () => {
    if (resultadoAtivo.status !== "ok" || jornadaIrreal) return;
    const registro = montarRegistro();
    onSalvarServico(registro);
    show(servicoEmEdicao ? `"${registro.nome}" atualizado` : `"${registro.nome}" salvo`);
    fecharFormulario();
  };

  const salvarComoNovo = () => {
    if (resultadoAtivo.status !== "ok" || jornadaIrreal) return;
    const registro = montarRegistro(uid());
    onSalvarServico(registro);
    show(`"${registro.nome}" duplicado como novo serviço`);
    fecharFormulario();
  };

  // Auto-save silencioso SÓ pra edição de serviço já existente — sem toast, sem fechar o
  // formulário, sem redirecionar. Criar serviço novo continua exigindo o botão explícito:
  // no meio do wizard (nome ainda vazio, materiais pela metade) não faz sentido já existir
  // um registro persistido, e cada passo tem sua própria validação de "está pronto pra ir
  // pro próximo" que não combina bem com "salvar a cada pausa de digitação".
  const autoSalvarServicoExistente = () => {
    if (resultadoAtivo.status !== "ok" || jornadaIrreal) return;
    onSalvarServico(montarRegistro());
  };
  const statusSalvarServico = useAutoSalvar(rascunhoAtual, rascunhoBase, autoSalvarServicoExistente, {
    ativo: !!servicoEmEdicao && mostrarFormulario,
  });

  const excluirDoFormulario = () => {
    if (!servicoEmEdicao) return;
    const nome = servicoEmEdicao.nome;
    onRemoverServico(servicoEmEdicao.id);
    show(`"${nome}" excluído`);
    fecharFormulario();
  };

  const editarDaLista = (s) => {
    const { calc, ...resto } = s;
    setServicoEmEdicao(resto);
  };
  const excluirDaLista = (id) => {
    const alvo = (servicos || []).find((s) => s.id === id);
    onRemoverServico(id);
    show(alvo ? `"${alvo.nome}" excluído` : "Serviço excluído");
    if (servicoEmEdicao && servicoEmEdicao.id === id) fecharFormulario();
  };
  const aceitarNovoPreco = (s) => {
    const { calc, ...resto } = s;
    onSalvarServico({
      ...resto,
      precoConfirmado: calc.status === "ok" ? calc.preco : (resto.precoConfirmado ?? null),
      editadoEm: Date.now(),
    });
    show(`Preço de "${s.nome}" atualizado`);
  };

  const cardStyle = { background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow };

  if (!negocioConfigurado) {
    return (
      <div className="rounded-2xl p-10 text-center" style={{ background: t.surfaceAlt, border: `1px dashed ${t.border}` }}>
        <Building2 size={22} className="mx-auto mb-3" style={{ color: t.textMuted }} />
        <p className="text-sm font-medium" style={{ color: t.text }}>
          Configure seu negócio primeiro
        </p>
        <p className="text-xs mt-1 mb-4" style={{ color: t.textMuted }}>
          Custos fixos, capacidade e regime tributário ficam configurados uma vez só, na aba Negócio.
        </p>
        <button
          type="button"
          onClick={irParaNegocio}
          className="btn-press rounded-xl px-4 py-2 text-sm font-semibold"
          style={{ background: t.success, color: t.onSuccess }}
        >
          Ir para Negócio
        </button>
      </div>
    );
  }

  return (
    <div>
      {nd?.regime === "indefinido" && (
        <div className="flex gap-2 items-start rounded-xl p-3 mb-4 text-sm" style={{ background: t.warningSoft, color: t.warningText }}>
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            Regime tributário ainda não definido — nenhum imposto está entrando nos preços abaixo, então eles podem estar subestimados.{" "}
            <button type="button" onClick={irParaNegocio} className="btn-press font-semibold underline underline-offset-2">
              Definir agora
            </button>
          </span>
        </div>
      )}
      <AbasServicos servicos={servicos} servicoAtivoId={servicoEmEdicao?.id} onSelecionar={editarDaLista} onNovo={abrirNovo} />
      <BibliotecaServicos
        servicosCalc={servicosCalc}
        onEditar={editarDaLista}
        onExcluir={excluirDaLista}
        onAceitarNovoPreco={aceitarNovoPreco}
        onNovo={abrirNovo}
        diasMesNegocio={nd?.diasMes}
      />
      {!mostrarFormulario && <MontadorPacote servicosCalc={servicosCalc} onMontar={montarPacote} nd={nd} />}

      {mostrarFormulario && servicoEmEdicao && (
        <div className="grid lg:grid-cols-[1.1fr,1fr] gap-5 pop-in">
          <div className="rounded-2xl p-5 space-y-5" style={cardStyle}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: t.text }}>
                {servicoEmEdicao ? `Editando: ${servicoEmEdicao.nome}` : "Novo serviço"}
              </p>
              <button
                type="button"
                onClick={fecharFormulario}
                className="btn-press touch-target p-1 rounded-lg"
                style={{ color: t.textMuted }}
                aria-label="Fechar formulário"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex gap-1 p-1 rounded-xl" style={{ background: t.surfaceAlt }} role="tablist" aria-label="Modo de cálculo">
              <button
                type="button"
                role="tab"
                aria-selected={modo === "descobrir"}
                onClick={() => setModo("descobrir")}
                className="btn-press flex-1 rounded-lg px-2 py-2 text-xs font-semibold"
                style={{
                  background: modo === "descobrir" ? t.surface : "transparent",
                  color: modo === "descobrir" ? t.text : t.textMuted,
                  boxShadow: modo === "descobrir" ? t.shadow : "none",
                }}
              >
                Quero descobrir o preço
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={modo === "ja-tenho"}
                onClick={() => setModo("ja-tenho")}
                className="btn-press flex-1 rounded-lg px-2 py-2 text-xs font-semibold"
                style={{
                  background: modo === "ja-tenho" ? t.surface : "transparent",
                  color: modo === "ja-tenho" ? t.text : t.textMuted,
                  boxShadow: modo === "ja-tenho" ? t.shadow : "none",
                }}
              >
                Já tenho um preço
              </button>
            </div>
            <p className="text-[11px] -mt-3" style={{ color: t.textMuted }}>
              {modo === "descobrir"
                ? "Você informa os custos e a margem que quer — o app calcula o preço."
                : "Você informa o preço que já cobra (ou pretende cobrar) — o app calcula o resto."}
            </p>

            <div className="grid grid-cols-2 gap-2">
              <Campo label="Nome do serviço">
                <input
                  className={CAMPO}
                  style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                  placeholder="ex: Corte masculino"
                  value={nomeServico}
                  onChange={(e) => setNomeServico(e.target.value)}
                />
              </Campo>
              <Campo label="Categoria (opcional)">
                <input
                  className={CAMPO}
                  style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                  placeholder="ex: Cabelo, Barba, Unha"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                />
              </Campo>
            </div>
            <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: t.surfaceAlt }}>
              <button
                type="button"
                onClick={() => setTipo("servico")}
                className="btn-press rounded-md px-3 py-1.5 text-xs font-semibold"
                style={{
                  background: tipo === "servico" ? t.surface : "transparent",
                  color: tipo === "servico" ? t.text : t.textMuted,
                  boxShadow: tipo === "servico" ? t.shadow : "none",
                }}
              >
                Serviço
              </button>
              <button
                type="button"
                onClick={() => setTipo("produto")}
                className="btn-press rounded-md px-3 py-1.5 text-xs font-semibold"
                style={{
                  background: tipo === "produto" ? t.surface : "transparent",
                  color: tipo === "produto" ? t.text : t.textMuted,
                  boxShadow: tipo === "produto" ? t.shadow : "none",
                }}
              >
                Produto
              </button>
            </div>
            <ListaCustosVariaveis
              itens={custosVariaveis}
              setItens={setCustosVariaveis}
              contexto={{
                atendimentosMes: N(atendimentosMes),
                diasMesNegocio: nd?.diasMes,
                insumosCompartilhados: nd?.insumosCompartilhados || [],
                alocacaoPorInsumoOutrosServicos,
              }}
            />
            <div style={{ height: 1, background: t.border }} />

            <BlocoComissaoETaxa
              nd={nd}
              comissaoPct={comissaoPct}
              setComissaoPct={setComissaoPct}
              comissaoModo={comissaoModo}
              setComissaoModo={setComissaoModo}
              taxaCartaoPct={taxaCartaoPct}
              setTaxaCartaoPct={setTaxaCartaoPct}
              taxaModo={taxaModo}
              setTaxaModo={setTaxaModo}
              comissaoEhCotaParte={comissaoEhCotaParte}
              setComissaoEhCotaParte={setComissaoEhCotaParte}
              parcelaAtual={parcelaAtual}
            />
            <CampoPct
              label="Margem de lucro desejada (meta)"
              value={margemPct}
              onChange={setMargemPct}
              ajuda="Quanto você quer que sobre de lucro de verdade, depois de pagar tudo — não é o preço final, é a fatia que fica com você."
              faq="margem-contribuicao"
            />

            {modo === "ja-tenho" && (
              <Campo label="Preço cobrado pelo serviço (R$)" hint="O que você já cobra hoje, ou pretende cobrar.">
                <input
                  ref={precoInputRef}
                  className={`${CAMPO} font-num`}
                  style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                  type="text"
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                  value={
                    precoFocado
                      ? precoCobrado
                      : N(precoCobrado) > 0
                        ? N(precoCobrado).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                        : ""
                  }
                  onFocus={() => setPrecoFocado(true)}
                  onBlur={() => setPrecoFocado(false)}
                  onChange={(e) => setPrecoCobrado(normalizarValorBR(e.target.value))}
                  aria-label="Preço cobrado pelo serviço, em reais"
                />
              </Campo>
            )}

            <div
              className="rounded-xl p-2.5 text-xs flex items-center justify-between"
              style={{ background: t.surfaceAlt, color: t.textMuted }}
            >
              <span>Imposto sobre este preço (do regime configurado){parcelaAtual > 0 ? ", só sobre a parte do salão" : ""}</span>
              <span className="font-num font-medium">{fmtPct(nd.impostoPct * (1 - parcelaAtual / 100), 2)}</span>
            </div>

            <div>
              <span className="text-sm font-semibold" style={{ color: t.text }}>
                Volume e tempo
              </span>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Campo label="Atendimentos estimados/mês">
                  <CampoNumero value={atendimentosMes} onChange={setAtendimentosMes} />
                </Campo>
                <Campo label="Horas por atendimento">
                  <input
                    className={`${CAMPO} font-num`}
                    style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                    type="number"
                    min="0"
                    step="0.25"
                    value={horasAtendimento}
                    onChange={(e) => setHorasAtendimento(e.target.value)}
                  />
                </Campo>
              </div>
              <p className="text-xs mt-2" style={{ color: t.textMuted }}>
                Capacidade livre no negócio: <span className="font-num font-medium">{Math.max(0, capacidadeRestante)}h/mês</span>
              </p>
            </div>

            {jornadaIrreal && (
              <div className="pop-in flex gap-2 items-start rounded-xl p-3" style={{ background: t.dangerSoft, color: t.danger }}>
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <p className="text-sm">
                  Trava de jornada: este serviço pediria {horasEsteServico}h/mês, mas só sobram {Math.max(0, capacidadeRestante)}h depois do
                  que já está comprometido com outros serviços salvos.
                </p>
              </div>
            )}

            <div className="pt-1" style={{ borderTop: `1px solid ${t.border}` }}>
              {!confirmandoExclusaoForm ? (
                <button
                  type="button"
                  onClick={() => setConfirmandoExclusaoForm(true)}
                  className="btn-press text-xs font-medium mt-3"
                  style={{ color: t.danger }}
                >
                  Excluir este serviço
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs mt-3" style={{ color: t.danger }}>
                  <span>Tem certeza?</span>
                  <button type="button" onClick={excluirDoFormulario} className="btn-press font-semibold underline">
                    Sim, excluir
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmandoExclusaoForm(false)}
                    className="btn-press underline"
                    style={{ color: t.textMuted }}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {precoOriginalAgora !== null && resultadoAtivo.status === "ok" && (
              <ComparativoPreco original={precoOriginalAgora} novo={resultadoAtivo.preco} />
            )}
            {resultadoAtivo.status === "ok" && (
              <ComparativoPacote somaSeparado={precoSeparadoReferencia} precoPacote={resultadoAtivo.preco} />
            )}

            {modo === "descobrir" ? (
              <>
                <ResultadoCard resultado={resultadoA} diasMesNegocio={nd?.diasMes} />
                {resultadoA.status === "ok" && (
                  <DecomposicaoCard
                    materiais={resultadoA.totalVariaveis}
                    custoFixo={resultadoA.custoFixoRateado}
                    taxas={resultadoA.valorComissao + resultadoA.valorTaxaCartao + resultadoA.valorImposto}
                    lucro={resultadoA.valorMargem}
                    preco={resultadoA.preco}
                  />
                )}
              </>
            ) : (
              <>
                <ResultadoReversoCard r={resultadoB} margemMetaPct={margemPct} horas={horasAtendimento} diasMesNegocio={nd?.diasMes} />
                {resultadoB.status === "ok" && (
                  <DecomposicaoCard
                    materiais={resultadoB.totalVariaveis}
                    custoFixo={resultadoB.custoFixoRateado}
                    taxas={resultadoB.valorComissao + resultadoB.valorTaxaCartao + resultadoB.valorImposto}
                    lucro={resultadoB.lucroLiquido}
                    preco={resultadoB.preco}
                  />
                )}
                {resultadoB.status === "ok" && (
                  <SimuladorSensibilidade
                    precoBase={resultadoB.preco}
                    custosVariaveis={custosVariaveis}
                    comissaoPct={comissaoUsada}
                    taxaCartaoPct={taxaUsada}
                    parcelaParceiroPct={parcelaAtual}
                    horasPorAtendimento={horasAtendimento}
                    atendimentosMes={N(atendimentosMes)}
                    nd={nd}
                  />
                )}
              </>
            )}

            {resultadoAtivo.status === "ok" && !jornadaIrreal && (
              <div className="rounded-2xl p-5 space-y-2" style={cardStyle}>
                <div className="flex items-center justify-center pb-1">
                  <IndicadorAutoSalvar status={statusSalvarServico} />
                </div>
                <button
                  type="button"
                  onClick={salvar}
                  className="btn-press w-full inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold"
                  style={{ background: t.success, color: t.onSuccess }}
                >
                  <Save size={14} /> Salvar alterações
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={salvarComoNovo}
                    className="btn-press flex-1 rounded-xl px-3 py-2 text-xs font-semibold"
                    style={{ background: t.primarySoft, color: t.primaryText }}
                  >
                    Salvar como novo
                  </button>
                  <button
                    type="button"
                    onClick={fecharFormulario}
                    className="btn-press flex-1 rounded-xl px-3 py-2 text-xs font-semibold"
                    style={{ background: t.surfaceAlt, color: t.textMuted }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {mostrarFormulario && !servicoEmEdicao && (
        <div className="rounded-2xl p-5 pop-in" style={cardStyle}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold" style={{ color: t.text }}>
              Novo serviço
            </p>
            <button
              type="button"
              onClick={fecharFormulario}
              className="btn-press touch-target p-1 rounded-lg"
              style={{ color: t.textMuted }}
              aria-label="Fechar formulário"
            >
              <X size={16} />
            </button>
          </div>

          {rascunhoRecuperado && (
            <div
              className="pop-in flex items-start justify-between gap-2 rounded-xl p-2.5 mb-2 text-xs"
              role="status"
              style={{ background: t.successSoft, color: t.successText }}
            >
              <span className="flex items-start gap-1.5">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                <span>Recuperamos o serviço que você estava criando. Continue de onde parou.</span>
              </span>
              <span className="flex gap-3 shrink-0">
                <button type="button" onClick={dispensarAvisoRascunho} className="btn-press touch-target font-semibold underline">
                  Ok
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetarFormulario();
                    setMostrarFormulario(true);
                  }}
                  className="btn-press touch-target underline"
                  style={{ color: t.textMuted }}
                >
                  Começar de novo
                </button>
              </span>
            </div>
          )}
          <BarraProgressoWizard passo={passoWizard} onIr={setPassoWizard} />

          {passoWizard === 1 && (
            <div className="space-y-4 fade-up">
              <div>
                <div className="flex gap-1 p-1 rounded-xl" style={{ background: t.surfaceAlt }} role="tablist" aria-label="Modo de cálculo">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={modo === "descobrir"}
                    onClick={() => setModo("descobrir")}
                    className="btn-press flex-1 rounded-lg px-2 py-2 text-xs font-semibold"
                    style={{
                      background: modo === "descobrir" ? t.surface : "transparent",
                      color: modo === "descobrir" ? t.text : t.textMuted,
                      boxShadow: modo === "descobrir" ? t.shadow : "none",
                    }}
                  >
                    Quero descobrir o preço
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={modo === "ja-tenho"}
                    onClick={() => setModo("ja-tenho")}
                    className="btn-press flex-1 rounded-lg px-2 py-2 text-xs font-semibold"
                    style={{
                      background: modo === "ja-tenho" ? t.surface : "transparent",
                      color: modo === "ja-tenho" ? t.text : t.textMuted,
                      boxShadow: modo === "ja-tenho" ? t.shadow : "none",
                    }}
                  >
                    Já tenho um preço
                  </button>
                </div>
                <p className="text-[11px] mt-1.5" style={{ color: t.textMuted }}>
                  {modo === "descobrir"
                    ? "Você informa os custos e a margem que quer — o app calcula o preço."
                    : "Você informa o preço que já cobra (ou pretende cobrar) — o app calcula o resto."}
                </p>
              </div>

              <div>
                <p className="text-[11px] mb-1.5" style={{ color: t.textMuted }}>
                  Preenchimento rápido (só o nome — os valores são todos seus):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(TEMPLATES_SERVICO_POR_SEGMENTO[nd?.perfil?.segmento] || TEMPLATES_SERVICO).map((tpl) => (
                    <button
                      key={tpl.nome}
                      type="button"
                      onClick={() => {
                        setNomeServico(tpl.nome);
                        setCategoria(tpl.categoria);
                      }}
                      className="btn-press rounded-lg px-2.5 py-1 text-xs font-medium"
                      style={{ background: t.primarySoft, color: t.primaryText, border: `1px solid ${t.primaryText}33` }}
                    >
                      {tpl.nome}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Campo label="Nome do serviço">
                  <input
                    className={CAMPO}
                    style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                    placeholder="ex: Corte masculino"
                    value={nomeServico}
                    onChange={(e) => setNomeServico(e.target.value)}
                  />
                </Campo>
                <Campo label="Categoria (opcional)">
                  <input
                    className={CAMPO}
                    style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                    placeholder="ex: Cabelo, Barba, Unha"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                  />
                </Campo>
              </div>
              <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: t.surfaceAlt }}>
                <button
                  type="button"
                  onClick={() => setTipo("servico")}
                  className="btn-press rounded-md px-3 py-1.5 text-xs font-semibold"
                  style={{
                    background: tipo === "servico" ? t.surface : "transparent",
                    color: tipo === "servico" ? t.text : t.textMuted,
                    boxShadow: tipo === "servico" ? t.shadow : "none",
                  }}
                >
                  Serviço
                </button>
                <button
                  type="button"
                  onClick={() => setTipo("produto")}
                  className="btn-press rounded-md px-3 py-1.5 text-xs font-semibold"
                  style={{
                    background: tipo === "produto" ? t.surface : "transparent",
                    color: tipo === "produto" ? t.text : t.textMuted,
                    boxShadow: tipo === "produto" ? t.shadow : "none",
                  }}
                >
                  Produto
                </button>
              </div>
            </div>
          )}

          {passoWizard === 2 && (
            <div className="fade-up">
              <ListaCustosVariaveis
                itens={custosVariaveis}
                setItens={setCustosVariaveis}
                contexto={{
                  atendimentosMes: N(atendimentosMes),
                  diasMesNegocio: nd?.diasMes,
                  insumosCompartilhados: nd?.insumosCompartilhados || [],
                  alocacaoPorInsumoOutrosServicos,
                }}
              />
            </div>
          )}

          {passoWizard === 3 && (
            <div className="space-y-2 fade-up">
              <span className="text-sm font-semibold" style={{ color: t.text }}>
                Quanto tempo e quantos atendimentos
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Campo label="Atendimentos estimados/mês">
                  <CampoNumero value={atendimentosMes} onChange={setAtendimentosMes} />
                </Campo>
                <Campo label="Horas por atendimento">
                  <input
                    className={`${CAMPO} font-num`}
                    style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                    type="number"
                    min="0"
                    step="0.25"
                    value={horasAtendimento}
                    onChange={(e) => setHorasAtendimento(e.target.value)}
                  />
                </Campo>
              </div>
              <p className="text-xs" style={{ color: t.textMuted }}>
                Capacidade livre no negócio: <span className="font-num font-medium">{Math.max(0, capacidadeRestante)}h/mês</span>
              </p>
              {jornadaIrreal && (
                <div className="pop-in flex gap-2 items-start rounded-xl p-3" style={{ background: t.dangerSoft, color: t.danger }}>
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <p className="text-sm">
                    Trava de jornada: este serviço pediria {horasEsteServico}h/mês, mas só sobram {Math.max(0, capacidadeRestante)}h depois
                    do que já está comprometido com outros serviços salvos.
                  </p>
                </div>
              )}
            </div>
          )}

          {passoWizard === 4 && (
            <div className="space-y-4 fade-up">
              <BlocoComissaoETaxa
                nd={nd}
                comissaoPct={comissaoPct}
                setComissaoPct={setComissaoPct}
                comissaoModo={comissaoModo}
                setComissaoModo={setComissaoModo}
                taxaCartaoPct={taxaCartaoPct}
                setTaxaCartaoPct={setTaxaCartaoPct}
                taxaModo={taxaModo}
                setTaxaModo={setTaxaModo}
                comissaoEhCotaParte={comissaoEhCotaParte}
                setComissaoEhCotaParte={setComissaoEhCotaParte}
                parcelaAtual={parcelaAtual}
              />
              {modo === "descobrir" ? (
                <CampoPct
                  label="Margem de lucro desejada (meta)"
                  value={margemPct}
                  onChange={setMargemPct}
                  ajuda="Quanto você quer que sobre de lucro de verdade, depois de pagar tudo — não é o preço final, é a fatia que fica com você."
                  faq="margem-contribuicao"
                />
              ) : (
                <>
                  <Campo label="Preço cobrado pelo serviço (R$)" hint="O que você já cobra hoje, ou pretende cobrar.">
                    <input
                      ref={precoInputRef}
                      className={`${CAMPO} font-num`}
                      style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                      type="text"
                      inputMode="decimal"
                      placeholder="R$ 0,00"
                      value={
                        precoFocado
                          ? precoCobrado
                          : N(precoCobrado) > 0
                            ? N(precoCobrado).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                            : ""
                      }
                      onFocus={() => setPrecoFocado(true)}
                      onBlur={() => setPrecoFocado(false)}
                      onChange={(e) => setPrecoCobrado(normalizarValorBR(e.target.value))}
                      aria-label="Preço cobrado pelo serviço, em reais"
                    />
                  </Campo>
                  <CampoPct
                    label="Margem de lucro desejada (meta, referência)"
                    value={margemPct}
                    onChange={setMargemPct}
                    ajuda="Serve de meta de comparação — o preço acima é o que manda no Modo B."
                  />
                </>
              )}
              <div
                className="rounded-xl p-2.5 text-xs flex items-center justify-between"
                style={{ background: t.surfaceAlt, color: t.textMuted }}
              >
                <span>Imposto sobre este preço (do regime configurado){parcelaAtual > 0 ? ", só sobre a parte do salão" : ""}</span>
                <span className="font-num font-medium">{fmtPct(nd.impostoPct * (1 - parcelaAtual / 100), 2)}</span>
              </div>
            </div>
          )}

          {passoWizard === 5 && (
            <div className="space-y-4 fade-up">
              {resultadoAtivo.status === "ok" && (
                <ComparativoPacote somaSeparado={precoSeparadoReferencia} precoPacote={resultadoAtivo.preco} />
              )}
              {modo === "descobrir" ? (
                <>
                  <ResultadoCard resultado={resultadoA} diasMesNegocio={nd?.diasMes} />
                  {resultadoA.status === "ok" && (
                    <DecomposicaoCard
                      materiais={resultadoA.totalVariaveis}
                      custoFixo={resultadoA.custoFixoRateado}
                      taxas={resultadoA.valorComissao + resultadoA.valorTaxaCartao + resultadoA.valorImposto}
                      lucro={resultadoA.valorMargem}
                      preco={resultadoA.preco}
                    />
                  )}
                </>
              ) : (
                <>
                  <ResultadoReversoCard r={resultadoB} margemMetaPct={margemPct} horas={horasAtendimento} diasMesNegocio={nd?.diasMes} />
                  {resultadoB.status === "ok" && (
                    <DecomposicaoCard
                      materiais={resultadoB.totalVariaveis}
                      custoFixo={resultadoB.custoFixoRateado}
                      taxas={resultadoB.valorComissao + resultadoB.valorTaxaCartao + resultadoB.valorImposto}
                      lucro={resultadoB.lucroLiquido}
                      preco={resultadoB.preco}
                    />
                  )}
                  {resultadoB.status === "ok" && (
                    <SimuladorSensibilidade
                      precoBase={resultadoB.preco}
                      custosVariaveis={custosVariaveis}
                      comissaoPct={comissaoUsada}
                      taxaCartaoPct={taxaUsada}
                      parcelaParceiroPct={parcelaAtual}
                      horasPorAtendimento={horasAtendimento}
                      atendimentosMes={N(atendimentosMes)}
                      nd={nd}
                    />
                  )}
                </>
              )}

              {resultadoAtivo.status === "ok" && !jornadaIrreal ? (
                <div className="rounded-2xl p-4 space-y-2" style={{ background: t.surfaceAlt }}>
                  <BannerNaoSalvo sujo={sujo} aoSalvarLabel="Salvar como serviço" />
                  <button
                    type="button"
                    onClick={salvar}
                    className="btn-press w-full inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold"
                    style={{ background: t.success, color: t.onSuccess }}
                  >
                    <Save size={14} /> Salvar como serviço
                  </button>
                </div>
              ) : (
                <p className="text-xs text-center" style={{ color: t.textMuted }}>
                  {jornadaIrreal
                    ? "Ajusta o volume no passo 3 antes de salvar."
                    : "Preenche os passos anteriores pra ver o resultado aqui."}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-5 pt-4" style={{ borderTop: `1px solid ${t.border}` }}>
            {passoWizard > 1 && (
              <button
                type="button"
                onClick={() => setPassoWizard((p) => p - 1)}
                className="btn-press flex-1 rounded-xl px-3 py-2 text-sm font-semibold"
                style={{ background: t.surfaceAlt, color: t.text }}
              >
                Voltar
              </button>
            )}
            {passoWizard < 5 && (
              <button
                type="button"
                onClick={() => setPassoWizard((p) => p + 1)}
                className="btn-press flex-1 rounded-xl px-3 py-2 text-sm font-semibold"
                style={{ background: t.primaryText, color: t.onPrimary }}
              >
                Próximo
              </button>
            )}
          </div>
        </div>
      )}
      {toastNode}
    </div>
  );
}
