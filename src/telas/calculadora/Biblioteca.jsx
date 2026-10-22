/* Calculadora: serviços salvos, comparativo de preço e montador de pacote. */
import { Calculator, ChevronDown, Pencil, Plus, Sparkles, Trash2, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { calcularPrecoMinimoPacote, fmtBRL, fmtPct, N, pontoEquilibrioSemanal } from "../../calculos.js";
import { Ajuda, CAMPO } from "../../componentes/campos.jsx";
import { GraficoRoscaPreco } from "../../componentes/GraficoRoscaPreco.jsx";
import { useT } from "../../tema.js";

/* Card compacto de um serviço salvo, na biblioteca "Meus serviços".      */
function ServicoCard({ s, onEditar, onExcluir, onAceitarNovoPreco, diasMesNegocio }) {
  const t = useT();
  const [confirmando, setConfirmando] = useState(false);
  const [expandido, setExpandido] = useState(false);
  const ok = s.calc.status === "ok";
  const statusCor = !ok ? t.danger : N(s.margemPct) < 15 ? t.warning : t.success;
  const rHora = ok && N(s.horasPorAtendimento) > 0 ? s.calc.preco / N(s.horasPorAtendimento) : null;
  const peMensal = ok && Number.isFinite(s.calc.pontoEquilibrioServico) ? Math.ceil(s.calc.pontoEquilibrioServico) : null;
  const peSemanal = peMensal !== null ? Math.ceil(pontoEquilibrioSemanal(s.calc.pontoEquilibrioServico, diasMesNegocio)) : null;
  // "precoConfirmado" é só um retrato pra detectar mudança e avisar — nunca usado em nenhum cálculo real.
  // Serviço antigo (sem esse campo) usa o próprio preço atual como base, pra não disparar aviso falso.
  const baseline = s.precoConfirmado ?? (ok ? s.calc.preco : null);
  const desatualizado = ok && baseline !== null && Math.abs(s.calc.preco - baseline) > 0.005;
  const lucroReal = ok ? (s.modo === "ja-tenho" ? s.calc.lucroLiquido : s.calc.valorMargem) : 0;

  return (
    <div
      className="fade-up rounded-2xl"
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderLeft: `4px solid ${statusCor}`,
        boxShadow: t.shadow,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="btn-press w-full text-left p-4"
        aria-label={`Ver detalhes de ${s.nome}`}
        aria-expanded={expandido}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: t.text }}>
              {s.nome}
            </p>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {s.categoria && (
                <span
                  className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded"
                  style={{ background: t.surfaceAlt, color: t.textMuted }}
                >
                  {s.categoria}
                </span>
              )}
              {s.tipo === "produto" && (
                <span
                  className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded"
                  style={{ background: t.secondarySoft, color: t.secondaryText }}
                >
                  Produto
                </span>
              )}
            </div>
          </div>
          <ChevronDown
            size={16}
            style={{
              color: t.textMuted,
              flexShrink: 0,
              marginTop: 2,
              transform: expandido ? "rotate(180deg)" : "none",
              transition: "transform .2s ease",
            }}
          />
        </div>
        {ok ? (
          <>
            <div className="grid grid-cols-3 gap-2 mt-2.5">
              <div>
                <p className="text-[10px]" style={{ color: t.textMuted }}>
                  Preço
                </p>
                <p className="font-num text-base font-bold" style={{ color: t.text }}>
                  {fmtBRL(s.calc.preco)}
                </p>
              </div>
              <div>
                <p className="text-[10px]" style={{ color: t.textMuted }}>
                  Margem/atend.
                </p>
                <p className="font-num text-sm font-medium" style={{ color: t.text }}>
                  {fmtBRL(s.calc.margemContribuicaoUnitaria)}
                </p>
              </div>
              <div>
                <p className="text-[10px]" style={{ color: t.textMuted }}>
                  R$/hora
                </p>
                <p className="font-num text-sm font-medium" style={{ color: t.text }}>
                  {rHora !== null ? fmtBRL(rHora) : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-[11px]" style={{ color: t.primaryText }}>
              <TrendingUp size={11} />
              <span>Ponto de equilíbrio: {peMensal !== null ? `${peMensal}/mês · ${peSemanal}/semana` : "—"}</span>
            </div>
            <p className="text-[11px] mt-1" style={{ color: t.textMuted }}>
              {s.horasPorAtendimento}h/atend. · editado em {new Date(s.editadoEm || s.criadoEm).toLocaleDateString("pt-BR")}
            </p>
          </>
        ) : (
          <p className="text-xs mt-2" style={{ color: t.danger }}>
            Inválido com a configuração atual — toque para ver detalhes.
          </p>
        )}
      </button>

      {expandido && (
        // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: só impede que cliques no conteúdo fechem o cartão
        <div className="px-4 pb-4 pop-in" style={{ borderTop: `1px solid ${t.border}` }} onClick={(e) => e.stopPropagation()}>
          {ok && s.precoSeparadoReferencia !== undefined && s.precoSeparadoReferencia !== null && (
            <div className="mt-3">
              <ComparativoPacote somaSeparado={s.precoSeparadoReferencia} precoPacote={s.calc.preco} />
            </div>
          )}
          <p className="text-xs font-semibold mt-3 mb-2" style={{ color: t.text }}>
            Decomposição do preço
          </p>
          {ok ? (
            <>
              <GraficoRoscaPreco
                materiais={s.calc.totalVariaveis}
                custoFixo={s.calc.custoFixoRateado}
                taxas={s.calc.valorComissao + s.calc.valorTaxaCartao + s.calc.valorImposto}
                lucro={lucroReal}
                preco={s.calc.preco}
              />
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div className="rounded-lg p-2" style={{ background: t.surfaceAlt }}>
                  <p style={{ color: t.textMuted }}>Tempo do atendimento</p>
                  <p className="font-num font-medium mt-0.5" style={{ color: t.text }}>
                    {s.horasPorAtendimento}h
                  </p>
                </div>
                <div className="rounded-lg p-2" style={{ background: t.surfaceAlt }}>
                  <p style={{ color: t.textMuted }}>Atendimentos/mês</p>
                  <p className="font-num font-medium mt-0.5" style={{ color: t.text }}>
                    {s.atendimentosMes}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs" style={{ color: t.danger }}>
              Não dá pra decompor — os dados deste serviço ficaram inválidos com a configuração atual do negócio.
            </p>
          )}

          <button
            type="button"
            onClick={() => onEditar(s)}
            className="btn-press touch-target w-full mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold"
            style={{ background: t.primaryText, color: t.onPrimary }}
          >
            <Pencil size={14} /> Editar serviço
          </button>
        </div>
      )}

      {desatualizado && !confirmando && (
        <div className="px-4 pb-3">
          <div
            className="pop-in flex items-center justify-between gap-2 rounded-lg p-2 text-[11px]"
            style={{ background: t.warningSoft, color: t.warningText }}
          >
            <span>
              Preço desatualizado — recalculado de {fmtBRL(baseline)} para {fmtBRL(s.calc.preco)}
            </span>
            <button type="button" onClick={() => onAceitarNovoPreco(s)} className="btn-press font-semibold underline shrink-0">
              Aceitar
            </button>
          </div>
        </div>
      )}
      {confirmando && (
        <div className="px-4 pb-3">
          <div className="pop-in flex items-center gap-2 text-xs" style={{ color: t.danger }}>
            <span>Excluir "{s.nome}"?</span>
            <button type="button" onClick={() => onExcluir(s.id)} className="btn-press font-semibold underline">
              Sim, excluir
            </button>
            <button type="button" onClick={() => setConfirmando(false)} className="btn-press underline" style={{ color: t.textMuted }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-1 justify-end px-3 pb-3">
        <button
          type="button"
          onClick={() => onEditar(s)}
          aria-label={`Editar ${s.nome}`}
          className="btn-press touch-target-48 p-1.5 rounded-lg"
          style={{ color: t.primaryText }}
        >
          <Pencil size={14} />
        </button>
        {!confirmando && (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            aria-label={`Excluir ${s.nome}`}
            className="btn-press touch-target-48 p-1.5 rounded-lg"
            style={{ color: t.danger }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/* Ordenações da biblioteca de serviços (fixas: não dependem do componente). */
const rHoraDe = (s) => (s.calc.status === "ok" && N(s.horasPorAtendimento) > 0 ? s.calc.preco / N(s.horasPorAtendimento) : -1);
const COMPARADORES_SERVICO = {
  nome: (a, b) => a.nome.localeCompare(b.nome, "pt-BR"),
  preco: (a, b) => (b.calc.status === "ok" ? b.calc.preco : -1) - (a.calc.status === "ok" ? a.calc.preco : -1),
  margem: (a, b) =>
    (b.calc.status === "ok" ? b.calc.margemContribuicaoUnitaria : -1) - (a.calc.status === "ok" ? a.calc.margemContribuicaoUnitaria : -1),
  rhora: (a, b) => rHoraDe(b) - rHoraDe(a),
};

/* Biblioteca "Meus serviços": busca, ordenação e a lista de cards.        */
export function BibliotecaServicos({ servicosCalc, onEditar, onExcluir, onAceitarNovoPreco, onNovo, diasMesNegocio }) {
  const t = useT();
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState("nome");

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const filtrada = servicosCalc.filter(
      (s) => !termo || s.nome.toLowerCase().includes(termo) || (s.categoria || "").toLowerCase().includes(termo),
    );
    return [...filtrada].sort(COMPARADORES_SERVICO[ordenacao]);
  }, [servicosCalc, busca, ordenacao]);

  if (servicosCalc.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center mb-6" style={{ background: t.surfaceAlt, border: `1px dashed ${t.border}` }}>
        <Calculator size={22} className="mx-auto mb-3" style={{ color: t.textMuted }} />
        <p className="text-sm font-medium" style={{ color: t.text }}>
          Nenhum serviço salvo ainda
        </p>
        <button
          type="button"
          onClick={onNovo}
          className="btn-press mt-3 rounded-xl px-4 py-2 text-sm font-semibold"
          style={{ background: t.success, color: t.onSuccess }}
        >
          Criar meu primeiro serviço
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold" style={{ color: t.text }}>
          Meus serviços
        </p>
        <button
          type="button"
          onClick={onNovo}
          className="btn-press inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
          style={{ background: t.success, color: t.onSuccess }}
        >
          <Plus size={13} /> Novo serviço
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          className={CAMPO}
          style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text, flex: 1 }}
          placeholder="Buscar por nome ou categoria"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar serviço"
        />
        <select
          value={ordenacao}
          onChange={(e) => setOrdenacao(e.target.value)}
          aria-label="Ordenar por"
          className={CAMPO}
          style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text, width: 132, flexShrink: 0 }}
        >
          <option value="nome">Nome</option>
          <option value="preco">Preço</option>
          <option value="margem">Margem</option>
          <option value="rhora">R$/hora</option>
        </select>
      </div>

      <div className="space-y-2.5">
        {lista.map((s) => (
          <ServicoCard
            key={s.id}
            s={s}
            onEditar={onEditar}
            onExcluir={onExcluir}
            onAceitarNovoPreco={onAceitarNovoPreco}
            diasMesNegocio={diasMesNegocio}
          />
        ))}
        {lista.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: t.textMuted }}>
            Nenhum serviço encontrado para "{busca}".
          </p>
        )}
      </div>
    </div>
  );
}

/* Comparativo ao vivo entre o preço salvo (recalculado com config. atual) e o preço com as edições em andamento. */
export function ComparativoPreco({ original, novo }) {
  const t = useT();
  const diff = novo - original;
  const diffPct = original > 0 ? (diff / original) * 100 : 0;
  const mudou = Math.abs(diff) > 0.005;
  return (
    <div className="rounded-2xl p-4" style={{ background: t.surfaceAlt, border: `1px solid ${t.border}` }}>
      <p className="text-xs font-semibold mb-2" style={{ color: t.text }}>
        Preço salvo × novo preço
      </p>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px]" style={{ color: t.textMuted }}>
            Salvo (config. atual)
          </p>
          <p className="font-num text-sm font-medium" style={{ color: t.text }}>
            {fmtBRL(original)}
          </p>
        </div>
        <span style={{ color: t.textMuted }}>→</span>
        <div className="text-right">
          <p className="text-[10px]" style={{ color: t.textMuted }}>
            Com suas edições
          </p>
          <p className="font-num text-sm font-bold" style={{ color: t.text }}>
            {fmtBRL(novo)}
          </p>
        </div>
      </div>
      {mudou && (
        <p className="text-[11px] mt-2 text-center font-num font-medium" style={{ color: diff > 0 ? t.successText : t.danger }}>
          {diff > 0 ? "+" : ""}
          {fmtBRL(diff)} ({diff > 0 ? "+" : ""}
          {diffPct.toFixed(1)}%)
        </p>
      )}
    </div>
  );
}

export function MontadorPacote({ servicosCalc, onMontar, nd }) {
  const t = useT();
  const [selecionados, setSelecionados] = useState([]);
  const [aberto, setAberto] = useState(false);
  const validos = servicosCalc.filter((s) => s.calc.status === "ok");
  if (validos.length < 2) return null;

  const toggle = (id) => setSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const itensSelecionados = validos.filter((s) => selecionados.includes(s.id));
  const somaPreco = itensSelecionados.reduce((s, x) => s + x.calc.preco, 0);
  const somaHoras = itensSelecionados.reduce((s, x) => s + N(x.horasPorAtendimento), 0);
  const precoMinimo = selecionados.length >= 2 ? calcularPrecoMinimoPacote(itensSelecionados, nd) : null;

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: t.surface, border: `1px dashed ${t.primaryText}66` }}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="btn-press touch-target flex items-center justify-between w-full"
        aria-expanded={aberto}
      >
        <span className="text-sm font-semibold inline-flex items-center gap-1.5" style={{ color: t.text }}>
          <Sparkles size={14} style={{ color: t.primaryText }} /> Montar pacote de serviços
        </span>
        <ChevronDown
          size={15}
          style={{ color: t.textMuted, transform: aberto ? "rotate(180deg)" : "none", transition: "transform .2s ease" }}
        />
      </button>
      {aberto && (
        <div className="pop-in mt-3">
          <p className="text-[11px] mb-2" style={{ color: t.textMuted }}>
            Escolha 2 ou mais serviços que a pessoa faria junto (ex: escova + progressiva). O combo só sai mais barato se você reduzir tempo
            ou material de verdade no próximo passo — não é um desconto automático.
          </p>
          <div className="space-y-1.5">
            {validos.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-2 text-sm rounded-lg p-2 cursor-pointer"
                style={{ background: selecionados.includes(s.id) ? t.primarySoft : t.surfaceAlt }}
              >
                <input type="checkbox" checked={selecionados.includes(s.id)} onChange={() => toggle(s.id)} />
                <span className="flex-1" style={{ color: t.text }}>
                  {s.nome}
                </span>
                <span className="font-num text-xs" style={{ color: t.textMuted }}>
                  {fmtBRL(s.calc.preco)}
                </span>
              </label>
            ))}
          </div>
          {selecionados.length >= 2 && (
            <div className="pop-in mt-3 rounded-lg p-3" style={{ background: t.surfaceAlt }}>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: t.textMuted }}>Fazendo separado, somaria:</span>
                <span className="font-num font-semibold" style={{ color: t.text }}>
                  {fmtBRL(somaPreco)}
                </span>
              </div>
              {precoMinimo?.status === "ok" && (
                <div className="flex items-center justify-between text-sm mt-1.5 pt-1.5" style={{ borderTop: `1px solid ${t.border}` }}>
                  <span className="inline-flex items-center gap-1" style={{ color: t.textMuted }}>
                    Preço mínimo recomendado
                    <Ajuda
                      texto={`Usa a margem de "${precoMinimo.servicoMargemMenor}" (${fmtPct(precoMinimo.margemUsadaPct)}) — a menor entre os serviços escolhidos — como piso pro pacote inteiro, pra nenhum deles sair "carregando" desconto dos outros escondido. Abaixo desse valor, o combo passa a corroer a margem que você definiu.`}
                    />
                  </span>
                  <span className="font-num font-semibold" style={{ color: t.primaryText }}>
                    {fmtBRL(precoMinimo.precoMinimoRecomendado)}
                  </span>
                </div>
              )}
              {precoMinimo?.status === "trava-percentual" && (
                <p className="text-[11px] mt-1.5" style={{ color: t.warningText }}>
                  Não dá pra calcular um piso pra esse combo — a soma de comissão + taxa de cartão + imposto + margem já passa de 100% mesmo
                  antes do desconto.
                </p>
              )}
              <button
                type="button"
                onClick={() => onMontar(itensSelecionados, somaPreco, somaHoras)}
                className="btn-press touch-target w-full mt-2 rounded-xl px-3 py-2 text-sm font-semibold"
                style={{ background: t.primaryText, color: t.onPrimary }}
              >
                Montar pacote com esses {selecionados.length} serviços
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* Mostra a economia real do pacote comparado a fazer os serviços separados —  */
/* só aparece número verde se o preço do combo realmente ficou menor.          */
export function ComparativoPacote({ somaSeparado, precoPacote }) {
  const t = useT();
  if (somaSeparado === null || somaSeparado === undefined || !Number.isFinite(precoPacote)) return null;
  const diferenca = somaSeparado - precoPacote;
  const diferencaPct = somaSeparado > 0 ? (diferenca / somaSeparado) * 100 : 0;
  const economizou = diferenca > 0.005;
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: economizou ? t.successSoft : t.surfaceAlt, border: `1px solid ${economizou ? `${t.success}55` : t.border}` }}
    >
      <p className="text-xs font-semibold mb-2" style={{ color: economizou ? t.successText : t.text }}>
        Pacote × serviços separados
      </p>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px]" style={{ color: t.textMuted }}>
            Separado (soma)
          </p>
          <p className="font-num text-sm font-medium" style={{ color: t.text }}>
            {fmtBRL(somaSeparado)}
          </p>
        </div>
        <span style={{ color: t.textMuted }}>→</span>
        <div className="text-right">
          <p className="text-[10px]" style={{ color: t.textMuted }}>
            Pacote
          </p>
          <p className="font-num text-sm font-bold" style={{ color: t.text }}>
            {fmtBRL(precoPacote)}
          </p>
        </div>
      </div>
      <p className="text-[11px] mt-2 text-center font-num font-medium" style={{ color: economizou ? t.successText : t.danger }}>
        {economizou
          ? `Economia real de ${fmtBRL(diferenca)} (${diferencaPct.toFixed(1)}%) fazendo o pacote`
          : diferenca < -0.005
            ? `Esse pacote está ${fmtBRL(Math.abs(diferenca))} mais caro que separado — reduz tempo ou material se quiser economia real`
            : "Sem diferença ainda — reduza tempo ou material do combo pra gerar economia de verdade"}
      </p>
    </div>
  );
}
