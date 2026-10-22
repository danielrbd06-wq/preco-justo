import { AlertTriangle, ChevronDown, Package, Pencil, PiggyBank, Plus, Save, Trash2, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { excluirComFallback, lerComFallback, listarComFallback, salvarComFallback, uid } from "../armazenamento.js";
import { fmtBRL, fmtPct, N } from "../calculos.js";
import { SkeletonCard, useToast } from "../componentes/base.jsx";
import { CAMPO, Campo, CampoMoeda, CampoNumero } from "../componentes/campos.jsx";
import { AvisoRascunhoRecuperado, useRascunho } from "../componentes/salvamento.jsx";
import { useT } from "../tema.js";

/* ======================================================================= */
/* Aba: Estoque — Frente 1 (Produtos de Revenda) completa; Frente 2        */
/* (Insumos de Uso Interno) com saldo/mínimo no insumo compartilhado já    */
/* existente + registro manual de entrada/baixa. Baixa técnica automática  */
/* mensal fica para a próxima etapa — ver Especificacao_Estoque.md, §4.    */
/* ======================================================================= */
function statusEstoque(saldoAtual, estoqueMinimo) {
  const saldo = N(saldoAtual);
  const minimo = N(estoqueMinimo);
  if (minimo <= 0) return "ok"; // sem mínimo definido — não alerta, não tem contra o que comparar
  if (saldo <= minimo) return "critico";
  if (saldo <= minimo * 1.3) return "atencao";
  return "ok";
}
function corStatusEstoque(t, status) {
  return status === "critico" ? t.danger : status === "atencao" ? t.warning : t.success;
}

function CardResumoEstoque({ icon: Icon, label, valor, sub, cor }) {
  const t = useT();
  return (
    <div className="rounded-2xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
      <div className="flex items-center gap-1.5 mb-1" style={{ color: t.textMuted }}>
        <Icon size={13} />
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p className="font-num text-xl font-bold" style={{ color: cor || t.text }}>
        {valor}
      </p>
      {sub && (
        <p className="text-[10px] mt-0.5" style={{ color: t.textMuted }}>
          {sub}
        </p>
      )}
    </div>
  );
}

const PREFIXO_RASCUNHO_PRODUTO = "rascunho:estoque:produto:";
const PREFIXO_RASCUNHO_MOVIMENTO = "rascunho:estoque:movimento:";

function FormularioProdutoRevenda({ produtoExistente, onSalvar, onCancelar }) {
  const t = useT();
  const [nome, setNome] = useState(produtoExistente?.nome ?? "");
  const [sku, setSku] = useState(produtoExistente?.sku ?? "");
  const [custoAquisicao, setCustoAquisicao] = useState(produtoExistente?.custoAquisicao ?? "");
  const [precoVenda, setPrecoVenda] = useState(produtoExistente?.precoVenda ?? "");
  const [estoqueMinimo, setEstoqueMinimo] = useState(produtoExistente?.estoqueMinimo ?? "");
  const [saldoInicial, setSaldoInicial] = useState(String(produtoExistente?.saldoAtual ?? "0"));
  // Rascunho (Bloco 13): produto novo ou edição de um produto.
  const { recuperado, descartar } = useRascunho(
    PREFIXO_RASCUNHO_PRODUTO + (produtoExistente?.id || "novo"),
    { nome, sku, custoAquisicao, precoVenda, estoqueMinimo, saldoInicial },
    {
      aoRecuperar: (d) => {
        setNome(d.nome ?? "");
        setSku(d.sku ?? "");
        setCustoAquisicao(d.custoAquisicao ?? "");
        setPrecoVenda(d.precoVenda ?? "");
        setEstoqueMinimo(d.estoqueMinimo ?? "");
        setSaldoInicial(d.saldoInicial ?? "0");
        return true;
      },
    },
  );

  const margemUnitaria = N(precoVenda) - N(custoAquisicao);
  const margemPct = N(precoVenda) > 0 ? (margemUnitaria / N(precoVenda)) * 100 : 0;
  const valido = nome.trim().length > 0 && N(precoVenda) > 0;

  const salvar = () => {
    descartar();
    onSalvar({
      id: produtoExistente?.id || uid(),
      nome: nome.trim(),
      sku: sku.trim(),
      custoAquisicao: N(custoAquisicao),
      precoVenda: N(precoVenda),
      estoqueMinimo: N(estoqueMinimo),
      saldoAtual: produtoExistente ? produtoExistente.saldoAtual : N(saldoInicial),
      criadoEm: produtoExistente?.criadoEm ?? Date.now(),
      editadoEm: Date.now(),
    });
  };

  return (
    <div className="rounded-xl p-3 space-y-3 pop-in" style={{ background: t.surfaceAlt }}>
      {recuperado && <AvisoRascunhoRecuperado />}
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Nome do produto">
          <input
            className={CAMPO}
            style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
            placeholder="ex: Pomada modeladora"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </Campo>
        <Campo label="SKU (opcional)">
          <input
            className={CAMPO}
            style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
            placeholder="ex: POM-001"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
        </Campo>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Custo de aquisição" ajuda="Quanto você paga pra comprar uma unidade do fornecedor.">
          <CampoMoeda value={custoAquisicao} onChange={setCustoAquisicao} />
        </Campo>
        <Campo label="Preço de venda">
          <CampoMoeda value={precoVenda} onChange={setPrecoVenda} />
        </Campo>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Estoque mínimo" ajuda="Quando o saldo chegar aqui (ou abaixo), o item entra em alerta.">
          <CampoNumero value={estoqueMinimo} onChange={setEstoqueMinimo} placeholder="0" />
        </Campo>
        {!produtoExistente && (
          <Campo label="Saldo inicial">
            <CampoNumero value={saldoInicial} onChange={setSaldoInicial} placeholder="0" />
          </Campo>
        )}
      </div>
      {N(precoVenda) > 0 && (
        <p className="text-[11px]" style={{ color: t.textMuted }}>
          Margem unitária: <strong style={{ color: t.text }}>{fmtBRL(margemUnitaria)}</strong> ({fmtPct(margemPct)})
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={salvar}
          disabled={!valido}
          className="btn-press flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
          style={{ background: valido ? t.success : t.surface, color: valido ? t.onSuccess : t.textMuted, opacity: valido ? 1 : 0.6 }}
        >
          <Save size={12} /> Salvar produto
        </button>
        <button
          type="button"
          onClick={() => {
            descartar();
            onCancelar();
          }}
          className="btn-press rounded-lg px-3 py-2 text-xs font-semibold"
          style={{ background: t.surface, color: t.textMuted }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function FormularioMovimento({ produto, onSalvar, onCancelar }) {
  const t = useT();
  const [tipo, setTipoMov] = useState("entrada");
  const [quantidade, setQuantidade] = useState("");
  const [custoUnitario, setCustoUnitario] = useState(String(produto.custoAquisicao || ""));
  const [observacao, setObservacao] = useState("");
  // Rascunho (Bloco 13): movimentação de um produto.
  const { recuperado, descartar } = useRascunho(
    PREFIXO_RASCUNHO_MOVIMENTO + produto.id,
    { tipo, quantidade, custoUnitario, observacao },
    {
      aoRecuperar: (d) => {
        setTipoMov(d.tipo === "saida" ? "saida" : "entrada");
        setQuantidade(d.quantidade ?? "");
        setCustoUnitario(d.custoUnitario ?? "");
        setObservacao(d.observacao ?? "");
        return true;
      },
    },
  );

  const valido = N(quantidade) > 0;
  const excedeSaldo = tipo === "saida" && N(quantidade) > produto.saldoAtual;

  const salvar = () => {
    descartar();
    onSalvar({
      id: uid(),
      produtoId: produto.id,
      tipo,
      quantidade: N(quantidade),
      custoUnitario: tipo === "entrada" ? N(custoUnitario) : null,
      data: new Date().toISOString().slice(0, 10),
      observacao: observacao.trim(),
      criadoEm: Date.now(),
    });
  };

  return (
    <div className="rounded-xl p-3 space-y-3 pop-in" style={{ background: t.surfaceAlt }}>
      <p className="text-xs font-semibold" style={{ color: t.text }}>
        Movimentar: {produto.nome}
      </p>
      {recuperado && <AvisoRascunhoRecuperado />}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: t.surface }}>
        <button
          type="button"
          onClick={() => setTipoMov("entrada")}
          className="btn-press rounded-md px-3 py-1.5 text-xs font-semibold"
          style={{
            background: tipo === "entrada" ? t.successSoft : "transparent",
            color: tipo === "entrada" ? t.successText : t.textMuted,
          }}
        >
          Entrada
        </button>
        <button
          type="button"
          onClick={() => setTipoMov("saida")}
          className="btn-press rounded-md px-3 py-1.5 text-xs font-semibold"
          style={{ background: tipo === "saida" ? t.dangerSoft : "transparent", color: tipo === "saida" ? t.danger : t.textMuted }}
        >
          Saída
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Quantidade">
          <CampoNumero value={quantidade} onChange={setQuantidade} placeholder="0" />
        </Campo>
        {tipo === "entrada" && (
          <Campo label="Custo unitário nesta compra">
            <CampoMoeda value={custoUnitario} onChange={setCustoUnitario} />
          </Campo>
        )}
      </div>
      <Campo label="Observação (opcional)">
        <input
          className={CAMPO}
          style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
          placeholder={tipo === "entrada" ? "ex: NF 1234, fornecedor X" : "ex: venda balcão"}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />
      </Campo>
      {excedeSaldo && (
        <p className="text-[11px]" style={{ color: t.warningText }}>
          Saldo atual é {produto.saldoAtual} — essa saída deixaria negativo. Confira antes de salvar.
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={salvar}
          disabled={!valido}
          className="btn-press flex-1 rounded-lg px-3 py-2 text-xs font-semibold"
          style={{ background: valido ? t.success : t.surface, color: valido ? t.onSuccess : t.textMuted, opacity: valido ? 1 : 0.6 }}
        >
          Confirmar {tipo === "entrada" ? "entrada" : "saída"}
        </button>
        <button
          type="button"
          onClick={() => {
            descartar();
            onCancelar();
          }}
          className="btn-press rounded-lg px-3 py-2 text-xs font-semibold"
          style={{ background: t.surface, color: t.textMuted }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function CardProdutoRevenda({ produto, onEditar, onExcluir, onMovimentar, movimentandoInicial = false }) {
  const t = useT();
  const [confirmando, setConfirmando] = useState(false);
  const [movimentando, setMovimentando] = useState(movimentandoInicial);
  const status = statusEstoque(produto.saldoAtual, produto.estoqueMinimo);
  const cor = corStatusEstoque(t, status);
  const labelStatus = status === "critico" ? "ruptura" : status === "atencao" ? "atenção" : "saudável";
  const margemUnitaria = produto.precoVenda - produto.custoAquisicao;

  return (
    <div
      className="fade-up rounded-2xl"
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderLeft: `4px solid ${cor}`,
        boxShadow: t.shadow,
        overflow: "hidden",
      }}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: t.text }}>
              {produto.nome}
            </p>
            {produto.sku && (
              <p className="text-[10px]" style={{ color: t.textMuted }}>
                SKU: {produto.sku}
              </p>
            )}
          </div>
          <span className="shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: `${cor}22`, color: cor }}>
            {labelStatus}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2.5">
          <div>
            <p className="text-[10px]" style={{ color: t.textMuted }}>
              Saldo
            </p>
            <p className="font-num text-base font-bold" style={{ color: t.text }}>
              {produto.saldoAtual}
            </p>
          </div>
          <div>
            <p className="text-[10px]" style={{ color: t.textMuted }}>
              Preço venda
            </p>
            <p className="font-num text-sm font-medium" style={{ color: t.text }}>
              {fmtBRL(produto.precoVenda)}
            </p>
          </div>
          <div>
            <p className="text-[10px]" style={{ color: t.textMuted }}>
              Margem/un.
            </p>
            <p className="font-num text-sm font-medium" style={{ color: margemUnitaria >= 0 ? t.successText : t.danger }}>
              {fmtBRL(margemUnitaria)}
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-3 items-center">
          <button
            type="button"
            onClick={() => setMovimentando((v) => !v)}
            className="btn-press flex-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
            style={{ background: t.primarySoft, color: t.primaryText }}
          >
            Movimentar
          </button>
          <button
            type="button"
            onClick={onEditar}
            className="btn-press touch-target-48 p-1.5 rounded-lg"
            style={{ color: t.primaryText }}
            aria-label={`Editar ${produto.nome}`}
          >
            <Pencil size={14} />
          </button>
          {!confirmando ? (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              className="btn-press touch-target-48 p-1.5 rounded-lg"
              style={{ color: t.danger }}
              aria-label={`Excluir ${produto.nome}`}
            >
              <Trash2 size={14} />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] shrink-0">
              <button
                type="button"
                onClick={() => {
                  onExcluir();
                  setConfirmando(false);
                }}
                className="btn-press font-semibold underline"
                style={{ color: t.danger }}
              >
                confirmar
              </button>
              <button type="button" onClick={() => setConfirmando(false)} className="btn-press underline" style={{ color: t.textMuted }}>
                não
              </button>
            </div>
          )}
        </div>
      </div>
      {movimentando && (
        <div className="px-3 pb-3">
          <FormularioMovimento
            produto={produto}
            onSalvar={(mov) => {
              onMovimentar(mov);
              setMovimentando(false);
            }}
            onCancelar={() => setMovimentando(false)}
          />
        </div>
      )}
    </div>
  );
}

function EstoqueInsumosInternos({ negocio, onSalvarNegocio }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const insumos = negocio.insumosCompartilhados || [];
  const insumosComEstoque = insumos.filter((i) => (i.modo || "duracao") === "unidade" && N(i.quantidadeComprada) > 0);

  const updateInsumo = (id, field, value) => {
    onSalvarNegocio({ ...negocio, insumosCompartilhados: insumos.map((i) => (i.id === id ? { ...i, [field]: value } : i)) });
  };

  return (
    <div className="rounded-2xl p-4 no-print" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="btn-press touch-target flex items-center justify-between w-full"
        aria-expanded={aberto}
      >
        <span className="text-sm font-semibold inline-flex items-center gap-1.5" style={{ color: t.text }}>
          <Package size={14} style={{ color: t.primaryText }} /> Insumos de uso interno
        </span>
        <ChevronDown
          size={15}
          style={{ color: t.textMuted, transform: aberto ? "rotate(180deg)" : "none", transition: "transform .2s ease" }}
        />
      </button>
      {aberto && (
        <div className="pop-in mt-3 space-y-3">
          <p className="text-[11px]" style={{ color: t.textMuted }}>
            Reaproveita o catálogo de "Insumos compartilhados" já cadastrado em Negócio — a quantidade comprada vem de lá, você só registra
            o quanto já foi usado. Saldo = comprada − usada, calculado aqui, sem digitar de novo.
          </p>
          {insumos.length === 0 ? (
            <p className="text-[11px]" style={{ color: t.textMuted }}>
              Nenhum insumo compartilhado cadastrado ainda — cadastre em Negócio → "Insumos compartilhados entre serviços".
            </p>
          ) : (
            <div className="space-y-2">
              {insumos.map((i) => {
                const modo = i.modo || "duracao";
                if (modo !== "unidade") {
                  return (
                    <div key={i.id} className="rounded-lg p-2.5" style={{ background: t.surfaceAlt, borderLeft: `3px solid ${t.border}` }}>
                      <p className="text-xs font-medium mb-1" style={{ color: t.text }}>
                        {i.nome || "(sem nome)"}
                      </p>
                      <p className="text-[11px]" style={{ color: t.textMuted }}>
                        Cadastrado "por duração" — controlado por custo/tempo, não por unidade física. Estoque em quantidade não se aplica
                        aqui.
                      </p>
                    </div>
                  );
                }
                const comprada = N(i.quantidadeComprada);
                if (comprada <= 0) {
                  return (
                    <div key={i.id} className="rounded-lg p-2.5" style={{ background: t.surfaceAlt, borderLeft: `3px solid ${t.border}` }}>
                      <p className="text-xs font-medium mb-1" style={{ color: t.text }}>
                        {i.nome || "(sem nome)"}
                      </p>
                      <p className="text-[11px]" style={{ color: t.textMuted }}>
                        Preencha "Quantidade comprada" em Negócio → Insumos compartilhados pra habilitar o estoque deste item.
                      </p>
                    </div>
                  );
                }
                const usada = N(i.quantidadeUsada);
                const saldo = comprada - usada;
                const status = statusEstoque(saldo, i.estoqueMinimo);
                const cor = corStatusEstoque(t, status);
                return (
                  <div key={i.id} className="rounded-lg p-2.5" style={{ background: t.surfaceAlt, borderLeft: `3px solid ${cor}` }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium" style={{ color: t.text }}>
                        {i.nome || "(sem nome)"}
                      </p>
                      <span className="font-num text-xs font-semibold" style={{ color: cor }}>
                        saldo: {saldo}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px]" style={{ color: t.textMuted }}>
                          Comprada
                        </span>
                        <div
                          className={`${CAMPO} font-num`}
                          style={{ background: t.surface, border: `1px dashed ${t.border}`, color: t.textMuted }}
                        >
                          {comprada}
                        </div>
                      </div>
                      <label className="block">
                        <span className="text-[10px]" style={{ color: t.textMuted }}>
                          Usada
                        </span>
                        <input
                          type="number"
                          min="0"
                          className={`${CAMPO} font-num`}
                          style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                          value={i.quantidadeUsada ?? ""}
                          onChange={(e) => updateInsumo(i.id, "quantidadeUsada", e.target.value === "" ? null : N(e.target.value))}
                          placeholder="0"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px]" style={{ color: t.textMuted }}>
                          Mínimo
                        </span>
                        <input
                          type="number"
                          min="0"
                          className={`${CAMPO} font-num`}
                          style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                          value={i.estoqueMinimo ?? ""}
                          onChange={(e) => updateInsumo(i.id, "estoqueMinimo", e.target.value === "" ? null : N(e.target.value))}
                          placeholder="não controla"
                        />
                      </label>
                    </div>
                    <p className="text-[10px] mt-1.5" style={{ color: t.textMuted }}>
                      Comprou um lote novo? Atualize "Quantidade comprada" em Negócio e zere "Usada" aqui — ainda é manual, sem baixa
                      automática.
                    </p>
                  </div>
                );
              })}
            </div>
          )}
          {insumosComEstoque.length > 0 && (
            <p className="text-[11px] rounded-lg p-2" style={{ background: t.surfaceAlt, color: t.textMuted }}>
              A baixa automática ao fechar o mês (calculada a partir do detalhamento por serviço do Fechamento Mensal) é a próxima etapa
              deste módulo — hoje o saldo aqui é atualizado por você, manualmente.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Estoque({ negocio, onSalvarNegocio }) {
  const t = useT();
  const [produtos, setProdutos] = useState(null);
  const [movimentos, setMovimentos] = useState([]);
  const [criandoProduto, setCriandoProduto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [movimentosEmRascunho, setMovimentosEmRascunho] = useState([]);
  const { show, node: toastNode } = useToast();

  const carregar = useCallback(async () => {
    try {
      const chavesP = await listarComFallback("produto-revenda:");
      const produtosCarregados = await Promise.all(
        chavesP.map(async (k) => {
          const v = await lerComFallback(k);
          try {
            return v ? JSON.parse(v) : null;
          } catch {
            return null;
          }
        }),
      );
      const lista = produtosCarregados.filter(Boolean).sort((a, b) => a.nome.localeCompare(b.nome));
      // Havia produto ou movimentação sendo digitados? Reabre o formulário (Bloco 13).
      const rascunhos = await listarComFallback("rascunho:estoque:");
      const produtosEmRascunho = rascunhos
        .filter((k) => k.startsWith(PREFIXO_RASCUNHO_PRODUTO))
        .map((k) => k.slice(PREFIXO_RASCUNHO_PRODUTO.length));
      if (produtosEmRascunho.includes("novo")) setCriandoProduto(true);
      const emEdicao = produtosEmRascunho.find((id) => id !== "novo" && lista.some((p) => p.id === id));
      if (emEdicao) setEditandoId(emEdicao);
      setMovimentosEmRascunho(
        rascunhos.filter((k) => k.startsWith(PREFIXO_RASCUNHO_MOVIMENTO)).map((k) => k.slice(PREFIXO_RASCUNHO_MOVIMENTO.length)),
      );
      setProdutos(lista);
    } catch {
      setProdutos([]);
    }
    try {
      const chavesM = await listarComFallback("movimento-estoque:");
      const movimentosCarregados = await Promise.all(
        chavesM.map(async (k) => {
          const v = await lerComFallback(k);
          try {
            return v ? JSON.parse(v) : null;
          } catch {
            return null;
          }
        }),
      );
      setMovimentos(movimentosCarregados.filter(Boolean));
    } catch {
      setMovimentos([]);
    }
  }, []);
  useEffect(() => {
    carregar();
  }, [carregar]);

  const salvarProduto = (produto) => {
    salvarComFallback(`produto-revenda:${produto.id}`, JSON.stringify(produto));
    setProdutos((prev) => [...(prev || []).filter((p) => p.id !== produto.id), produto].sort((a, b) => a.nome.localeCompare(b.nome)));
    setCriandoProduto(false);
    setEditandoId(null);
    show(`"${produto.nome}" salvo`);
  };

  const excluirProduto = (id, nome) => {
    excluirComFallback(`produto-revenda:${id}`);
    setProdutos((prev) => (prev || []).filter((p) => p.id !== id));
    show(`"${nome}" excluído`);
  };

  const registrarMovimento = (produto, mov) => {
    salvarComFallback(`movimento-estoque:${mov.id}`, JSON.stringify(mov));
    const delta = mov.tipo === "entrada" ? mov.quantidade : -mov.quantidade;
    const atualizado = { ...produto, saldoAtual: produto.saldoAtual + delta, editadoEm: Date.now() };
    salvarComFallback(`produto-revenda:${produto.id}`, JSON.stringify(atualizado));
    setProdutos((prev) => (prev || []).map((p) => (p.id === produto.id ? atualizado : p)));
    setMovimentos((prev) => [...prev, mov]);
    show(`${mov.tipo === "entrada" ? "Entrada" : "Saída"} registrada`);
  };

  if (produtos === null) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const valorTotalInvestido = produtos.reduce((s, p) => s + p.saldoAtual * p.custoAquisicao, 0);
  const itensAbaixoMinimo = produtos.filter((p) => statusEstoque(p.saldoAtual, p.estoqueMinimo) !== "ok").length;

  // Giro estimado: saídas dos últimos 30 dias ÷ saldo total atual — quantas vezes o estoque
  // "vira" por mês, no ritmo recente. Fica mais confiável conforme mais movimentação real
  // se acumula; com pouco histórico, é só um indício, não uma média madura.
  const trintaDiasAtras = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const saidasUltimos30 = movimentos
    .filter((m) => m.tipo === "saida" && new Date(m.data).getTime() >= trintaDiasAtras)
    .reduce((s, m) => s + m.quantidade, 0);
  const saldoTotalAtual = produtos.reduce((s, p) => s + p.saldoAtual, 0);
  const giroEstimado = saldoTotalAtual > 0 ? saidasUltimos30 / saldoTotalAtual : null;

  return (
    <div className="space-y-5">
      {toastNode}
      <div className="grid gap-3 sm:grid-cols-3">
        <CardResumoEstoque icon={PiggyBank} label="Valor investido em estoque" valor={fmtBRL(valorTotalInvestido)} />
        <CardResumoEstoque
          icon={AlertTriangle}
          label="Itens abaixo do mínimo"
          valor={itensAbaixoMinimo}
          cor={itensAbaixoMinimo > 0 ? t.danger : t.successText}
        />
        <CardResumoEstoque
          icon={TrendingUp}
          label="Giro estimado"
          valor={giroEstimado !== null ? `${giroEstimado.toFixed(1)}x/mês` : "—"}
          sub="saídas dos últimos 30 dias ÷ saldo atual"
        />
      </div>

      <div className="rounded-2xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold" style={{ color: t.text }}>
            Produtos para revenda
          </p>
          {!criandoProduto && (
            <button
              type="button"
              onClick={() => setCriandoProduto(true)}
              className="btn-press inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1.5"
              style={{ color: t.primaryText, background: t.primarySoft }}
            >
              <Plus size={13} /> novo produto
            </button>
          )}
        </div>

        {criandoProduto && (
          <div className="mb-3">
            <FormularioProdutoRevenda onSalvar={salvarProduto} onCancelar={() => setCriandoProduto(false)} />
          </div>
        )}

        {produtos.length === 0 && !criandoProduto ? (
          <p className="text-xs text-center py-6" style={{ color: t.textMuted }}>
            Nenhum produto de revenda cadastrado ainda.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {produtos.map((p) =>
              editandoId === p.id ? (
                <FormularioProdutoRevenda key={p.id} produtoExistente={p} onSalvar={salvarProduto} onCancelar={() => setEditandoId(null)} />
              ) : (
                <CardProdutoRevenda
                  key={p.id}
                  produto={p}
                  movimentandoInicial={movimentosEmRascunho.includes(p.id)}
                  onEditar={() => setEditandoId(p.id)}
                  onExcluir={() => excluirProduto(p.id, p.nome)}
                  onMovimentar={(mov) => registrarMovimento(p, mov)}
                />
              ),
            )}
          </div>
        )}
      </div>

      <EstoqueInsumosInternos negocio={negocio} onSalvarNegocio={onSalvarNegocio} />
    </div>
  );
}
