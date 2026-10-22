/* Painel: fechamento do mês (o que aconteceu de verdade). */
import { CalendarCheck, ChevronDown, Pencil, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { chaveRascunhoFechamento, listarComFallback } from "../../armazenamento.js";
import {
  calcularParaExibicao,
  comissaoEfetiva,
  fmtBRL,
  fmtPct,
  montarDREMensal,
  N,
  parceiroValido,
  parcelaParceiro,
  taxaEfetiva,
} from "../../calculos.js";
import { SkeletonBlock } from "../../componentes/base.jsx";
import { CAMPO, Campo, CampoMoeda, CampoNumero } from "../../componentes/campos.jsx";
import { AvisoRascunhoRecuperado, LembreteCopia, useRascunho } from "../../componentes/salvamento.jsx";
import { useT } from "../../tema.js";
import { DRECard } from "./DRECard.jsx";
import { chaveMes, gerarFechamentoExemplo, labelMes, normalizarDetalheServico, proximosMesesLivres } from "./meses.js";

function FormularioFechamento({ mes, nd, servicos, profissionais, registroExistente, onSalvar, onCancelar }) {
  const t = useT();
  // Usados só no modo SEM detalhamento (entrada manual direta). No modo COM detalhamento,
  // faturamento e atendimentos totais passam a ser 100% calculados a partir das linhas por
  // serviço — não existe mais campo pra digitar os dois de novo e ter que conferir se bate.
  const [faturamentoBrutoManual, setFaturamentoBrutoManual] = useState(registroExistente?.faturamentoBruto ?? "");
  const [atendimentosTotaisManual, setAtendimentosTotaisManual] = useState(registroExistente?.atendimentosTotais ?? "");
  const [observacoes, setObservacoes] = useState(registroExistente?.observacoes ?? "");
  const [mostrarPorServico, setMostrarPorServico] = useState(
    !!registroExistente?.atendimentosPorServico && Object.keys(registroExistente.atendimentosPorServico).length > 0,
  );
  // Divisão por profissional — óptica PARALELA e independente da divisão por serviço (ver
  // Especificacao_Profissionais_Produto_Servico.md, seção 1): não cruza profissional×serviço,
  // só "quanto cada um faturou", sem exigir que bata com nenhuma outra soma do formulário.
  const [mostrarPorProfissional, setMostrarPorProfissional] = useState(
    !!registroExistente?.divisaoPorProfissional && Object.keys(registroExistente.divisaoPorProfissional).length > 0,
  );
  const [divisaoProfissional, setDivisaoProfissional] = useState(() => registroExistente?.divisaoPorProfissional || {});
  const profissionaisAtivos = useMemo(() => (profissionais || []).filter((p) => p.ativo !== false && p.nome.trim()), [profissionais]);
  const setDivisaoCampo = (id, campo, valor) =>
    setDivisaoProfissional((prev) => ({ ...prev, [id]: { ...(prev[id] || { atendimentos: "", valorTotal: "" }), [campo]: valor } }));

  // detalhe[servicoId] = { quantidade, valorUnitarioReal }. valorUnitarioReal é o preço POR
  // ATENDIMENTO de verdade cobrado (não o total) — mais perto de como o dono do salão pensa
  // ("cobrei R$45 no corte"), e o total é sempre quantidade × esse valor, calculado aqui.
  // Ao carregar um fechamento já salvo (onde o que fica gravado é o TOTAL, não o unitário —
  // formato inalterado pro resto do app continuar lendo igual), reconstrói o unitário
  // dividindo total ÷ quantidade só pra preencher o campo de edição.
  const [detalhe, setDetalhe] = useState(() => {
    const bruto = registroExistente?.atendimentosPorServico || {};
    return Object.fromEntries(
      Object.entries(bruto).map(([id, v]) => {
        const n = normalizarDetalheServico(v);
        const valorUnitarioReal = n.valorReal != null && n.quantidade > 0 ? n.valorReal / n.quantidade : null;
        return [id, { quantidade: n.quantidade, valorUnitarioReal }];
      }),
    );
  });

  // Rascunho do fechamento (Bloco 9; com useRascunho desde o Bloco 17): o que foi
  // digitado fica guardado no aparelho e volta ao reabrir este mês, depois de trocar
  // de aba, recarregar ou atualizar.
  const { recuperado: rascunhoRecuperado, descartar: descartarRascunho } = useRascunho(
    chaveRascunhoFechamento(mes),
    {
      faturamentoBrutoManual,
      atendimentosTotaisManual,
      observacoes,
      mostrarPorServico,
      mostrarPorProfissional,
      divisaoProfissional,
      detalhe,
    },
    {
      aoRecuperar: (d) => {
        setFaturamentoBrutoManual(d.faturamentoBrutoManual ?? "");
        setAtendimentosTotaisManual(d.atendimentosTotaisManual ?? "");
        setObservacoes(d.observacoes ?? "");
        setMostrarPorServico(!!d.mostrarPorServico);
        setMostrarPorProfissional(!!d.mostrarPorProfissional);
        setDivisaoProfissional(d.divisaoProfissional || {});
        setDetalhe(d.detalhe || {});
        return true;
      },
    },
  );

  const servicosValidos = useMemo(() => (servicos || []).filter((s) => calcularParaExibicao(s, nd).status === "ok"), [servicos, nd]);

  const setQuantidade = (id, valor) =>
    setDetalhe((prev) => ({ ...prev, [id]: { ...(prev[id] || { valorUnitarioReal: null }), quantidade: valor } }));
  const setValorUnitario = (id, valor) =>
    setDetalhe((prev) => ({ ...prev, [id]: { ...(prev[id] || { quantidade: 0 }), valorUnitarioReal: valor } }));

  // Pra cada serviço com quantidade > 0: receita = quantidade × (valor unitário real
  // informado, ou o preço salvo como estimativa). Custo de material escala com quantidade;
  // comissão/taxa/imposto escalam sobre a receita REAL — se deu desconto, a comissão sobre
  // desconto é menor de verdade.
  const detalhamento = useMemo(() => {
    if (!mostrarPorServico) return [];
    return servicosValidos
      .map((s) => {
        const raw = detalhe[s.id];
        const quantidade = N(raw?.quantidade);
        if (quantidade <= 0) return null;
        const calc = calcularParaExibicao(s, nd);
        const valorUnitarioReal = raw?.valorUnitarioReal != null && raw.valorUnitarioReal !== "" ? N(raw.valorUnitarioReal) : null;
        const valorUnitarioUsado = valorUnitarioReal ?? calc.preco;
        const receita = quantidade * valorUnitarioUsado;
        const custoMaterial = quantidade * calc.totalVariaveis;
        // Bloco 11: a cota-parte de parceiro sai da comissão (vai para a dedução da
        // receita) e a taxa da maquininha fica só sobre a parte do salão.
        const parcela = parcelaParceiro(s, nd);
        const cotaParte = receita * (parcela / 100);
        const custoComissao = receita * ((comissaoEfetiva(s, nd) - parcela) / 100);
        const custoTaxaCartao = receita * (taxaEfetiva(s, nd) / 100) * (1 - parcela / 100);
        return {
          servicoId: s.id,
          nome: s.nome,
          quantidade,
          receita,
          valorUnitarioUsado,
          estimado: valorUnitarioReal == null,
          custoMaterial,
          custoComissao,
          custoTaxaCartao,
          cotaParte,
        };
      })
      .filter(Boolean);
  }, [mostrarPorServico, detalhe, servicosValidos, nd]);

  const custosVariaveisReais =
    mostrarPorServico && detalhamento.length > 0
      ? detalhamento.reduce((s, d) => s + d.custoMaterial + d.custoComissao + d.custoTaxaCartao, 0)
      : null;

  // No modo com detalhamento, os dois totais são SOMA do que foi preenchido por serviço —
  // nunca mais digitados de novo à parte, então não existe divergência possível pra avisar.
  const atendimentosTotaisAuto = detalhamento.reduce((s, d) => s + d.quantidade, 0);
  const faturamentoBrutoAuto = detalhamento.reduce((s, d) => s + d.receita, 0);
  const faturamento = mostrarPorServico ? faturamentoBrutoAuto : N(faturamentoBrutoManual);
  const atendimentosTotais = mostrarPorServico ? atendimentosTotaisAuto : N(atendimentosTotaisManual);

  const custosFixosSnapshot = nd.custoFixoTotal;
  const aluguelRecebidoSnapshot = N(nd.receitaAluguelCadeiras);
  // Bloco 11: cota-parte repassada aos parceiros no mês. Com o detalhamento por
  // serviço, vem dele; sem ele, do faturamento informado por profissional.
  const cotaParteSnapshot =
    mostrarPorServico && detalhamento.length > 0
      ? detalhamento.reduce((s, d) => s + d.cotaParte, 0)
      : mostrarPorProfissional && nd.parceriaPermitida
        ? profissionaisAtivos
            .filter((p) => parceiroValido(p))
            .reduce((s, p) => s + N(divisaoProfissional[p.id]?.valorTotal) * (N(p.comissaoPct) / 100), 0)
        : 0;
  const impostoEstimado = (faturamento - cotaParteSnapshot) * (nd.impostoPct / 100);
  const custosVariaveisUsados = custosVariaveisReais ?? 0;
  const lucroLiquidoCalculado =
    faturamento - cotaParteSnapshot - custosVariaveisUsados - custosFixosSnapshot + aluguelRecebidoSnapshot - impostoEstimado;
  const margemLiquidaPctCalculada = faturamento > 0 ? (lucroLiquidoCalculado / faturamento) * 100 : 0;
  const valido = faturamento > 0 && atendimentosTotais > 0;

  const salvar = () => {
    // Converte de volta pro formato já usado no resto do app (quantidade + TOTAL, não
    // unitário) — só a edição usa valor por atendimento, o que fica salvo não muda de forma.
    const atendimentosPorServico = mostrarPorServico
      ? Object.fromEntries(detalhamento.map((d) => [d.servicoId, { quantidade: d.quantidade, valorReal: d.estimado ? null : d.receita }]))
      : null;
    const divisaoPorProfissional = mostrarPorProfissional
      ? Object.fromEntries(
          Object.entries(divisaoProfissional)
            .filter(([, v]) => N(v?.atendimentos) > 0 || N(v?.valorTotal) > 0)
            .map(([id, v]) => [id, { atendimentos: N(v.atendimentos), valorTotal: N(v.valorTotal) }]),
        )
      : null;
    onSalvar({
      mes,
      faturamentoBruto: faturamento,
      atendimentosTotais,
      atendimentosPorServico,
      divisaoPorProfissional,
      custosVariaveisReaisInformados: custosVariaveisReais,
      custosFixosSnapshot,
      aluguelRecebidoSnapshot,
      cotaParteSnapshot,
      impostoPagoReal: impostoEstimado,
      proLaboreRealPago: nd.proLabore,
      observacoes,
      lucroLiquidoCalculado,
      margemLiquidaPctCalculada,
      fechadoEm: registroExistente?.fechadoEm ?? Date.now(),
      editadoEm: Date.now(),
    });
    descartarRascunho();
  };

  return (
    <div className="rounded-xl p-3 space-y-3 pop-in" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
      <p className="text-xs font-semibold" style={{ color: t.text }}>
        Fechamento de {labelMes(mes)}
      </p>
      {rascunhoRecuperado && (
        <AvisoRascunhoRecuperado>Recuperamos o que você tinha digitado neste fechamento. Confira e salve.</AvisoRascunhoRecuperado>
      )}

      {mostrarPorServico ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-xs font-medium block mb-1" style={{ color: t.text }}>
              Faturamento bruto do mês
            </span>
            <div className={`${CAMPO} font-num`} style={{ background: t.surfaceAlt, border: `1px dashed ${t.border}`, color: t.text }}>
              {fmtBRL(faturamentoBrutoAuto)}
            </div>
            <p className="text-[10px] mt-1" style={{ color: t.textMuted }}>
              Soma do detalhamento abaixo.
            </p>
          </div>
          <div>
            <span className="text-xs font-medium block mb-1" style={{ color: t.text }}>
              Atendimentos no mês
            </span>
            <div className={`${CAMPO} font-num`} style={{ background: t.surfaceAlt, border: `1px dashed ${t.border}`, color: t.text }}>
              {atendimentosTotaisAuto}
            </div>
            <p className="text-[10px] mt-1" style={{ color: t.textMuted }}>
              Soma do detalhamento abaixo.
            </p>
          </div>
        </div>
      ) : (
        <>
          <Campo label="Faturamento bruto do mês" ajuda="Tudo que entrou, antes de qualquer desconto de custo ou imposto.">
            <CampoMoeda value={faturamentoBrutoManual} onChange={setFaturamentoBrutoManual} />
          </Campo>
          <Campo label="Atendimentos realizados no mês" ajuda="Total de atendimentos, somando todos os serviços.">
            <CampoNumero value={atendimentosTotaisManual} onChange={setAtendimentosTotaisManual} placeholder="0" />
          </Campo>
        </>
      )}

      <button
        type="button"
        onClick={() => setMostrarPorServico((v) => !v)}
        className="text-[11px] font-medium underline btn-press"
        style={{ color: t.primaryText }}
      >
        {mostrarPorServico
          ? "ocultar detalhamento por serviço (voltar a digitar o total manualmente)"
          : "detalhar por serviço (calcula o total sozinho, e deixa o histórico mais preciso)"}
      </button>

      {mostrarPorServico && (
        <div className="space-y-2">
          {servicosValidos.map((s) => {
            const raw = detalhe[s.id];
            const quantidade = N(raw?.quantidade);
            const calc = calcularParaExibicao(s, nd);
            const valorUnitarioReal = raw?.valorUnitarioReal != null && raw.valorUnitarioReal !== "" ? N(raw.valorUnitarioReal) : null;
            return (
              <div key={s.id} className="rounded-lg p-2 space-y-1.5" style={{ background: t.surfaceAlt }}>
                <p className="text-xs font-medium" style={{ color: t.text }}>
                  {s.nome}
                </p>
                <div className="flex gap-2">
                  <label className="flex-1 block">
                    <span className="text-[10px]" style={{ color: t.textMuted }}>
                      Atendimentos
                    </span>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      className={`${CAMPO} font-num`}
                      style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                      value={raw?.quantidade ?? ""}
                      onChange={(e) => setQuantidade(s.id, e.target.value)}
                      placeholder="0"
                      aria-label={`Atendimentos de ${s.nome}`}
                    />
                  </label>
                  {/* biome-ignore lint/a11y/noLabelWithoutControl: CampoMoeda renderiza o input dentro do label */}
                  <label className="flex-1 block">
                    <span className="text-[10px]" style={{ color: t.textMuted }}>
                      Valor cobrado — real, por atendimento (opcional)
                    </span>
                    <CampoMoeda value={raw?.valorUnitarioReal ?? ""} onChange={(v) => setValorUnitario(s.id, v)} />
                  </label>
                </div>
                {quantidade > 0 && (
                  <p className="text-[10px]" style={{ color: t.textMuted }}>
                    {valorUnitarioReal != null
                      ? `${fmtBRL(valorUnitarioReal)}/atendimento × ${quantidade} = ${fmtBRL(valorUnitarioReal * quantidade)}`
                      : `Sem valor informado — estimando pelo preço salvo: ${fmtBRL(calc.preco)}/atendimento × ${quantidade} = ${fmtBRL(calc.preco * quantidade)}`}
                  </p>
                )}
              </div>
            );
          })}
          {servicosValidos.length === 0 && (
            <p className="text-[11px]" style={{ color: t.textMuted }}>
              Nenhum serviço válido salvo ainda.
            </p>
          )}
        </div>
      )}

      {profissionaisAtivos.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setMostrarPorProfissional((v) => !v)}
            className="text-[11px] font-medium underline btn-press"
            style={{ color: t.primaryText }}
          >
            {mostrarPorProfissional
              ? "ocultar divisão por profissional"
              : "dividir por profissional (opcional — independe do detalhamento por serviço)"}
          </button>

          {mostrarPorProfissional && (
            <div className="space-y-2">
              <p className="text-[11px]" style={{ color: t.textMuted }}>
                Quanto cada um faturou no mês, sem precisar bater com a soma total nem com o detalhamento por serviço — são óticas
                independentes.
              </p>
              {profissionaisAtivos.map((p) => (
                <div key={p.id} className="rounded-lg p-2 space-y-1.5" style={{ background: t.surfaceAlt }}>
                  <p className="text-xs font-medium" style={{ color: t.text }}>
                    {p.nome}
                  </p>
                  <div className="flex gap-2">
                    <label className="flex-1 block">
                      <span className="text-[10px]" style={{ color: t.textMuted }}>
                        Atendimentos
                      </span>
                      <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        className={`${CAMPO} font-num`}
                        style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                        value={divisaoProfissional[p.id]?.atendimentos ?? ""}
                        onChange={(e) => setDivisaoCampo(p.id, "atendimentos", e.target.value)}
                        placeholder="0"
                        aria-label={`Atendimentos de ${p.nome}`}
                      />
                    </label>
                    {/* biome-ignore lint/a11y/noLabelWithoutControl: CampoMoeda renderiza o input dentro do label */}
                    <label className="flex-1 block">
                      <span className="text-[10px]" style={{ color: t.textMuted }}>
                        Valor total faturado
                      </span>
                      <CampoMoeda
                        value={divisaoProfissional[p.id]?.valorTotal ?? ""}
                        onChange={(v) => setDivisaoCampo(p.id, "valorTotal", v)}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Campo label="Observações (opcional)">
        <input
          className={CAMPO}
          style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="ex: campanha de Dia das Mães"
        />
      </Campo>

      {faturamento > 0 && (
        <div className="rounded-lg p-2.5 text-xs" style={{ background: t.surfaceAlt, border: `1px solid ${t.border}` }}>
          {cotaParteSnapshot > 0 && (
            <div className="flex justify-between">
              <span style={{ color: t.textMuted }}>Cota-parte dos parceiros</span>
              <span className="font-num">−{fmtBRL(cotaParteSnapshot)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span style={{ color: t.textMuted }}>Custo fixo (config. atual)</span>
            <span className="font-num">{fmtBRL(custosFixosSnapshot)}</span>
          </div>
          {aluguelRecebidoSnapshot > 0 && (
            <div className="flex justify-between">
              <span style={{ color: t.textMuted }}>Aluguel de cadeiras recebido</span>
              <span className="font-num">+{fmtBRL(aluguelRecebidoSnapshot)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span style={{ color: t.textMuted }}>Custo variável {mostrarPorServico ? "(real)" : "(não informado)"}</span>
            <span className="font-num">{fmtBRL(custosVariaveisUsados)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: t.textMuted }}>
              Imposto estimado ({fmtPct(nd.impostoPct)}
              {cotaParteSnapshot > 0 ? " sobre a parte do salão" : ""})
            </span>
            <span className="font-num">{fmtBRL(impostoEstimado)}</span>
          </div>
          <div
            className="flex justify-between font-semibold pt-1.5 mt-1"
            style={{ borderTop: `1px solid ${t.border}`, color: lucroLiquidoCalculado >= 0 ? t.successText : t.danger }}
          >
            <span>Lucro líquido do mês</span>
            <span className="font-num">
              {fmtBRL(lucroLiquidoCalculado)} · {fmtPct(margemLiquidaPctCalculada)}
            </span>
          </div>
          {!mostrarPorServico && (
            <p className="text-[10px] mt-1.5" style={{ color: t.textMuted }}>
              Sem o detalhamento por serviço, o custo variável real do mês não entra na conta — só fixo e imposto.
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={salvar}
          disabled={!valido}
          className="btn-press flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
          style={{ background: valido ? t.success : t.surfaceAlt, color: valido ? t.onSuccess : t.textMuted, opacity: valido ? 1 : 0.6 }}
        >
          <Save size={12} /> Salvar fechamento
        </button>
        <button
          type="button"
          onClick={() => {
            descartarRascunho();
            onCancelar();
          }}
          className="btn-press rounded-lg px-3 py-2 text-xs font-semibold"
          style={{ background: t.surfaceAlt, color: t.textMuted }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function FechamentoMensal({ nd, servicos, fechamentos, onSalvar, onRemover, onCarregarExemplos, profissionais }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [verDRE, setVerDRE] = useState(null);
  const [lembrarCopia, setLembrarCopia] = useState(false);

  const chaveAtual = chaveMes(new Date());
  const fechamentoAtual = fechamentos?.find((f) => f.mes === chaveAtual);

  // Havia um fechamento sendo digitado (Bloco 9)? Reabre direto nele.
  useEffect(() => {
    let vivo = true;
    listarComFallback(chaveRascunhoFechamento("")).then((chaves) => {
      if (!vivo || chaves.length === 0) return;
      const mes = chaves.sort().pop().slice(chaveRascunhoFechamento("").length);
      if (!mes) return;
      setEditando(mes);
      setAberto(true);
    });
    return () => {
      vivo = false;
    };
  }, []);

  const salvar = (registro) => {
    onSalvar(registro);
    setEditando(null);
    setLembrarCopia(true);
  };

  const remover = (mes) => onRemover(mes);

  const carregarExemploFechamentos = () => {
    const meses = proximosMesesLivres(fechamentos, 2);
    const novos = meses.map((chave, i) => gerarFechamentoExemplo(chave, nd, servicos, i));
    onCarregarExemplos(novos);
  };

  const cardStyle = { background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow };

  if (fechamentos === null) {
    return (
      <div className="rounded-2xl p-4 no-print" style={cardStyle}>
        <SkeletonBlock h={20} w="60%" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-4 no-print" style={cardStyle}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="btn-press touch-target flex items-center justify-between w-full"
        aria-expanded={aberto}
      >
        <span className="text-sm font-semibold inline-flex items-center gap-1.5" style={{ color: t.text }}>
          <CalendarCheck size={14} style={{ color: t.primaryText }} /> Fechamento mensal
        </span>
        <ChevronDown
          size={15}
          style={{ color: t.textMuted, transform: aberto ? "rotate(180deg)" : "none", transition: "transform .2s ease" }}
        />
      </button>

      {aberto && (
        <div className="pop-in mt-3 space-y-3">
          <p className="text-[11px]" style={{ color: t.textMuted }}>
            Registre o que realmente aconteceu no mês — esse histórico é a base de dados real que vai alimentar os gráficos de evolução. Sem
            ele, não existe "real" pra mostrar, só projeção.
          </p>

          <button
            type="button"
            onClick={carregarExemploFechamentos}
            className="text-[11px] font-medium underline btn-press"
            style={{ color: t.primaryText }}
          >
            carregar 2 meses de exemplo (pra testar o gráfico de evolução)
          </button>

          {!fechamentoAtual ? (
            <div className="rounded-xl p-3 flex items-center justify-between gap-2 flex-wrap" style={{ background: t.warningSoft }}>
              <span className="text-xs" style={{ color: t.text }}>
                {labelMes(chaveAtual)} ainda não foi fechado.
              </span>
              {editando !== chaveAtual && (
                <button
                  type="button"
                  onClick={() => setEditando(chaveAtual)}
                  className="btn-press shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                  style={{ background: t.warning, color: t.onWarning }}
                >
                  Fechar agora
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl p-3" style={{ background: t.successSoft }}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs" style={{ color: t.text }}>
                  {labelMes(chaveAtual)} já fechado — lucro líquido {fmtBRL(fechamentoAtual.lucroLiquidoCalculado)}
                </span>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setVerDRE((v) => (v === chaveAtual ? null : chaveAtual))}
                    className="btn-press rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                    style={{ background: "transparent", color: t.text, border: `1px solid ${t.text}33` }}
                  >
                    {verDRE === chaveAtual ? "ocultar DRE" : "ver DRE"}
                  </button>
                  {editando !== chaveAtual && (
                    <button
                      type="button"
                      onClick={() => setEditando(chaveAtual)}
                      className="btn-press rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                      style={{ background: t.surface, color: t.primaryText, border: `1px solid ${t.border}` }}
                    >
                      Editar
                    </button>
                  )}
                </div>
              </div>
              {verDRE === chaveAtual && (
                <div className="pop-in mt-3">
                  <DRECard
                    dre={montarDREMensal(fechamentoAtual)}
                    origem={fechamentoAtual.exemplo ? "exemplo" : "real"}
                    mesLabel={labelMes(chaveAtual)}
                  />
                  {fechamentoAtual.custosVariaveisReaisInformados == null && (
                    <p className="text-[10px] mt-1.5" style={{ color: t.textMuted }}>
                      Custo variável não foi detalhado por serviço neste mês — aparece como R$ 0,00 no DRE acima.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {editando && (
            <FormularioFechamento
              mes={editando}
              nd={nd}
              servicos={servicos}
              profissionais={profissionais}
              registroExistente={fechamentos.find((f) => f.mes === editando)}
              onSalvar={salvar}
              onCancelar={() => setEditando(null)}
            />
          )}
          {lembrarCopia && !editando && <LembreteCopia onFechar={() => setLembrarCopia(false)} />}

          {fechamentos.filter((f) => f.mes !== chaveAtual).length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: t.textMuted }}>
                Meses anteriores
              </p>
              <div className="space-y-1.5">
                {fechamentos
                  .filter((f) => f.mes !== chaveAtual)
                  .map((f) => (
                    <div key={f.mes} className="rounded-lg px-3 py-2" style={{ background: t.surfaceAlt }}>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span style={{ color: t.text }}>
                          {labelMes(f.mes)}
                          {f.exemplo && (
                            <span
                              className="ml-1.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full align-middle"
                              style={{ background: t.warningSoft, color: t.warningText }}
                            >
                              exemplo
                            </span>
                          )}
                        </span>
                        <span className="font-num" style={{ color: f.lucroLiquidoCalculado >= 0 ? t.successText : t.danger }}>
                          {fmtBRL(f.lucroLiquidoCalculado)} · {fmtPct(f.margemLiquidaPctCalculada)}
                        </span>
                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setVerDRE((v) => (v === f.mes ? null : f.mes))}
                            className="btn-press touch-target px-1.5 py-0.5 rounded text-[10px] font-semibold"
                            style={{ color: t.primaryText, border: `1px solid ${t.primaryText}44` }}
                          >
                            {verDRE === f.mes ? "ocultar" : "DRE"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditando(f.mes)}
                            className="btn-press touch-target p-1"
                            style={{ color: t.primaryText }}
                            aria-label={`Editar fechamento de ${labelMes(f.mes)}`}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => remover(f.mes)}
                            className="btn-press touch-target p-1"
                            style={{ color: t.danger }}
                            aria-label={`Excluir fechamento de ${labelMes(f.mes)}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      {verDRE === f.mes && (
                        <div className="pop-in mt-2">
                          <DRECard dre={montarDREMensal(f)} origem={f.exemplo ? "exemplo" : "real"} mesLabel={labelMes(f.mes)} />
                          {f.custosVariaveisReaisInformados == null && (
                            <p className="text-[10px] mt-1.5" style={{ color: t.textMuted }}>
                              Custo variável não foi detalhado por serviço neste mês — aparece como R$ 0,00 no DRE acima.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
