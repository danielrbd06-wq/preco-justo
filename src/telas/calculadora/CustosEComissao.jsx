/* Calculadora: custos variáveis do serviço, comissão e taxa da maquininha. */
import { AlertTriangle, CheckCircle2, Info, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { uid } from "../../armazenamento.js";
import { calcularValorItemVariavel, fmtBRL, fmtPct, N, precoUnitarioItem } from "../../calculos.js";
import { Ajuda, CAMPO, Campo, CampoMoeda, CampoPct } from "../../componentes/campos.jsx";
import { useT } from "../../tema.js";

/* Escolha entre um valor médio do negócio e um valor próprio do serviço:     */
/* a comissão média da equipe (Bloco 4) e a taxa média de recebimento        */
/* (Bloco 5) usam o mesmo seletor e a mesma caixa de composição.             */
function SeletorOrigem({ rotulo, ajuda, faq, ariaLabel, opcoes, valor, onChange }) {
  const t = useT();
  return (
    <div>
      <span className="block text-xs font-medium leading-snug" style={{ color: t.textMuted }}>
        {rotulo}
        {ajuda && <Ajuda faq={faq} texto={ajuda} />}
      </span>
      <div className="flex gap-1 p-1 rounded-lg mt-1" role="radiogroup" aria-label={ariaLabel} style={{ background: t.surfaceAlt }}>
        {opcoes.map((o) => (
          // biome-ignore lint/a11y/useSemanticElements: seletor segmentado; botão com role="radio" mantém o visual e o teclado
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={valor === o.id}
            onClick={() => onChange(o.id)}
            className="btn-press flex-1 rounded-md px-2 py-1.5 text-xs font-medium leading-snug"
            style={{
              background: valor === o.id ? t.surface : "transparent",
              color: valor === o.id ? t.text : t.textMuted,
              boxShadow: valor === o.id ? t.shadow : "none",
              border: `1px solid ${valor === o.id ? t.border : "transparent"}`,
              transition: "background .18s ease, color .18s ease, box-shadow .18s ease",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* Mostra de onde uma média saiu. A lista tem largura máxima para o valor    */
/* não ficar longe do nome em telas largas.                                  */
function ComposicaoMedia({ titulo, linhas, total }) {
  const t = useT();
  return (
    <div className="pop-in rounded-xl p-3 text-xs" style={{ background: t.primarySoft }}>
      <p style={{ color: t.text }}>{titulo}</p>
      <ul className="mt-1.5 space-y-0.5 max-w-sm">
        {linhas.map((l) => (
          <li key={l.id} className="flex justify-between gap-3" style={{ color: t.textMuted }}>
            <span className="min-w-0 truncate">{l.nome}</span>
            <span className="font-num shrink-0">{l.valor}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 font-semibold" style={{ color: t.primaryText }}>
        {total}
      </p>
    </div>
  );
}

function AvisoMediaIndisponivel({ children }) {
  const t = useT();
  return (
    <p className="text-[11px] flex items-start gap-1" style={{ color: t.warningText }}>
      <AlertTriangle size={12} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/* Comissão + taxa de cartão do serviço. Com a comissão média da equipe      */
/* (Bloco 4) ou a taxa média de recebimento (Bloco 5) disponível, o usuário  */
/* escolhe entre a média e um valor próprio do serviço, e vê de onde a média */
/* saiu. Usado nos dois modos da Calculadora.                                */
export function BlocoComissaoETaxa({
  nd,
  comissaoPct,
  setComissaoPct,
  comissaoModo,
  setComissaoModo,
  taxaCartaoPct,
  setTaxaCartaoPct,
  taxaModo,
  setTaxaModo,
  comissaoEhCotaParte = false,
  setComissaoEhCotaParte,
  parcelaAtual = 0,
}) {
  const t = useT();
  const equipe = nd?.comissaoEquipe;
  const media = nd?.taxaRecebimento;
  const locatario = nd?.perfil?.modeloOperacao === "locatario";

  const campoTaxa = (
    <CampoPct
      label="Taxa de cartão/Pix"
      value={taxaCartaoPct}
      onChange={setTaxaCartaoPct}
      ajuda="A taxa que a maquininha ou o banco cobra em cima da venda. Confira no seu extrato — deixar em 0 faz o preço vir mais barato do que deveria."
      faq="taxa-media-recebimento"
    />
  );
  // Bloco 11: comissão própria que é cota-parte de profissional-parceiro.
  const opcaoCotaParte = !locatario && nd?.temParceriaValida && setComissaoEhCotaParte && (
    <label className="flex items-start gap-2 text-xs" style={{ color: t.text }}>
      <input
        type="checkbox"
        className="mt-0.5"
        checked={!!comissaoEhCotaParte}
        onChange={(e) => setComissaoEhCotaParte(e.target.checked)}
      />
      <span>Esta comissão é a cota-parte de um profissional-parceiro (Lei do Salão-Parceiro) e fica fora da receita do salão.</span>
    </label>
  );
  const notaParceria = parcelaAtual > 0 && (
    <p className="pop-in text-[11px] flex items-start gap-1" style={{ color: t.successText }}>
      <CheckCircle2 size={12} className="mt-0.5 shrink-0" />
      <span>
        Parceria: {fmtPct(parcelaAtual)} do preço é cota-parte de parceiro e fica fora da receita do salão. O imposto e a taxa da maquininha
        entram no preço só sobre o resto.
      </span>
    </p>
  );
  const campoPropria = locatario ? (
    <CampoPct
      label="% que fica com o salão"
      value={comissaoPct}
      onChange={setComissaoPct}
      ajuda="Se o dono do salão fica com uma porcentagem de cada serviço seu, informe aqui. Se você paga um aluguel fixo por mês, deixe 0: o aluguel entra nas Contas Fixas."
    />
  ) : (
    <CampoPct
      label="Comissão do profissional"
      value={comissaoPct}
      onChange={setComissaoPct}
      ajuda="Quanto do preço desse serviço vai pro profissional que atende, em %. Se você é sozinho(a), geralmente é 0 — o que sobra é seu pró-labore."
      faq="comissao-parceiros"
    />
  );

  const avisoComissao = !equipe && comissaoModo === "equipe" && (
    <AvisoMediaIndisponivel>
      Este serviço usava a comissão média da equipe, mas ela não está mais disponível (precisa de duas ou mais pessoas atendendo no cadastro
      de Profissionais). Usando a comissão abaixo.
    </AvisoMediaIndisponivel>
  );
  const avisoTaxa = !media && taxaModo === "negocio" && (
    <AvisoMediaIndisponivel>
      Este serviço usava a taxa média do negócio, mas ela não está disponível (as formas de pagamento, na aba Negócio, precisam somar 100%
      das vendas). Usando a taxa abaixo.
    </AvisoMediaIndisponivel>
  );
  // Só quando a taxa digitada no serviço é a que vale: com a média do negócio,
  // um 0% é o que o usuário informou (ex.: recebe tudo em dinheiro).
  const avisoTaxaZero = N(taxaCartaoPct) === 0 && (
    <p className="text-[11px] flex items-start gap-1" style={{ color: t.warningText }}>
      <Info size={12} className="mt-0.5 shrink-0" />
      <span>Taxa de cartão em 0% — se você recebe por maquininha, dá uma olhada no extrato antes de finalizar.</span>
    </p>
  );
  const dicaMedia = !media && (
    <p className="text-[11px]" style={{ color: t.textMuted }}>
      Recebe por várias formas (Pix, débito, crédito)? Na aba Negócio, em "Formas de pagamento", o app calcula a taxa média para você.
    </p>
  );

  // Sem nenhuma média disponível: os dois campos lado a lado.
  if (!equipe && !media) {
    return (
      <div className="space-y-2">
        {avisoComissao}
        {avisoTaxa}
        <div className="grid grid-cols-2 gap-2">
          {campoPropria}
          {campoTaxa}
        </div>
        {opcaoCotaParte}
        {avisoTaxaZero}
        {dicaMedia}
        {notaParceria}
      </div>
    );
  }

  // Com alguma média: cada bloco ocupa a linha inteira, como a margem logo abaixo.
  const blocoComissao = equipe ? (
    <div className="space-y-2">
      <SeletorOrigem
        rotulo="Comissão do profissional"
        ariaLabel="Origem da comissão"
        faq="comissao-parceiros"
        ajuda="Use a média da equipe quando qualquer pessoa pode fazer este serviço: o preço fica um só, e a comissão média é ponderada pelos atendimentos de cada uma. Escolha uma comissão própria se este serviço tem regra diferente."
        valor={comissaoModo}
        onChange={setComissaoModo}
        opcoes={[
          { id: "equipe", label: `Média da equipe · ${fmtPct(equipe.pct)}` },
          { id: "propria", label: "Própria deste serviço" },
        ]}
      />
      {comissaoModo === "equipe" ? (
        <ComposicaoMedia
          titulo={
            equipe.ponderada
              ? "Média ponderada pelos atendimentos de cada pessoa:"
              : "Média simples (falta o número de atendimentos de alguém no cadastro):"
          }
          linhas={equipe.participantes.map((pp) => ({
            id: pp.id,
            nome: `${pp.nome}${pp.vinculo === "dono" ? " (dono/a)" : pp.vinculo === "parceiro" ? (pp.cotaForaDaReceita ? " (parceiro)" : " (parceiro, conta como comissão)") : ""}`,
            valor: `${fmtPct(pp.pct)}${equipe.ponderada ? ` · ${pp.atendimentos} atend.` : ""}`,
          }))}
          total={`Comissão usada no preço: ${fmtPct(equipe.pct)}`}
        />
      ) : (
        <>
          {campoPropria}
          {opcaoCotaParte}
        </>
      )}
    </div>
  ) : (
    <div className="space-y-2">
      {avisoComissao}
      {campoPropria}
      {opcaoCotaParte}
    </div>
  );

  const blocoTaxa = media ? (
    <div className="space-y-2">
      <SeletorOrigem
        rotulo="Taxa de cartão/Pix"
        ariaLabel="Origem da taxa de cartão"
        faq="taxa-media-recebimento"
        ajuda="A média do negócio vem das formas de pagamento informadas na aba Negócio, pesadas pela parte das vendas de cada uma. Use uma taxa própria se este serviço é pago de um jeito diferente do resto (ex.: pacotes sempre parcelados)."
        valor={taxaModo}
        onChange={setTaxaModo}
        opcoes={[
          { id: "negocio", label: `Média do negócio · ${fmtPct(media.pct, 2)}` },
          { id: "propria", label: "Própria deste serviço" },
        ]}
      />
      {taxaModo === "negocio" ? (
        <ComposicaoMedia
          titulo="Média ponderada pela parte das vendas de cada forma de pagamento:"
          linhas={media.itens.map((i) => ({
            id: i.id,
            nome: i.label,
            valor: `${fmtPct(i.taxa, 2)} · ${fmtPct(i.participacao, 0)} das vendas`,
          }))}
          total={`Taxa usada no preço: ${fmtPct(media.pct, 2)}`}
        />
      ) : (
        <>
          {campoTaxa}
          {avisoTaxaZero}
        </>
      )}
    </div>
  ) : (
    <div className="space-y-2">
      {avisoTaxa}
      {campoTaxa}
      {avisoTaxaZero}
      {dicaMedia}
    </div>
  );

  return (
    <div className="space-y-4">
      {blocoComissao}
      {blocoTaxa}
      {notaParceria}
    </div>
  );
}

/* Card de UM item de custo variável, com os três modos de preenchimento. */
function ItemCustoVariavel({ item, onChange, onRemove, contexto }) {
  const t = useT();
  const [caixaAberta, setCaixaAberta] = useState(!!(item.embalagens || item.unidadesPorEmbalagem));
  const modo = item.modo || "direto";
  const valorCalculado = calcularValorItemVariavel(item, contexto);
  const setCampo = (campo, valor) => onChange({ ...item, [campo]: valor });
  const inputEst = { background: t.surface, border: `1px solid ${t.border}`, color: t.text };

  const modos = [
    { id: "direto", label: "Direto" },
    { id: "duracao", label: "Duração" },
    { id: "unidade", label: "Unidade" },
    { id: "compartilhado", label: "Compartilhado" },
  ];
  const insumosDisponiveis = contexto?.insumosCompartilhados || [];
  const insumoRef = insumosDisponiveis.find((i) => i.id === item.insumoId) || null;

  return (
    <div className="rounded-xl p-2.5" style={{ background: t.surfaceAlt }}>
      <div className="flex gap-2 items-center">
        <input
          className={CAMPO}
          style={inputEst}
          placeholder="ex: shampoo"
          value={item.nome}
          onChange={(e) => setCampo("nome", e.target.value)}
        />
        <button
          type="button"
          onClick={onRemove}
          className="btn-press touch-target-48 shrink-0"
          style={{ color: t.danger }}
          aria-label="Remover item"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="flex gap-1 mt-2 p-0.5 rounded-lg" style={{ background: t.surface, border: `1px solid ${t.border}` }} role="tablist">
        {modos.map((m) => (
          <button
            type="button"
            key={m.id}
            role="tab"
            aria-selected={modo === m.id}
            onClick={() => setCampo("modo", m.id)}
            className="btn-press flex-1 rounded-md py-1 text-[10.5px] font-medium"
            style={{ background: modo === m.id ? t.primaryText : "transparent", color: modo === m.id ? t.onPrimary : t.textMuted }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {modo === "direto" && (
        <div className="mt-2" style={{ width: 130 }}>
          <CampoMoeda value={item.valor} onChange={(v) => setCampo("valor", v)} />
        </div>
      )}

      {modo === "duracao" && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Campo label="Valor da compra">
            <CampoMoeda value={item.valorCompra} onChange={(v) => setCampo("valorCompra", v)} />
          </Campo>
          <Campo label="Dura quanto tempo?">
            <div className="flex gap-1">
              <input
                className={`${CAMPO} font-num`}
                style={{ ...inputEst, width: 54 }}
                type="number"
                min="0"
                value={item.duracaoValor || ""}
                onChange={(e) => setCampo("duracaoValor", e.target.value)}
              />
              <select
                value={item.duracaoUnidade || "dias"}
                onChange={(e) => setCampo("duracaoUnidade", e.target.value)}
                className="rounded-xl px-1.5 text-xs"
                style={inputEst}
              >
                <option value="dias">dias</option>
                <option value="semanas">semanas</option>
                <option value="meses">meses</option>
              </select>
            </div>
          </Campo>
        </div>
      )}

      {modo === "unidade" && (
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-1.5 text-[11px]" style={{ color: t.textMuted }}>
            <input type="checkbox" checked={caixaAberta} onChange={(e) => setCaixaAberta(e.target.checked)} />
            comprei em caixa/pacote fechado
          </label>
          {caixaAberta ? (
            <div className="grid grid-cols-3 gap-2">
              <Campo label="Valor pago">
                <CampoMoeda value={item.valorCompra} onChange={(v) => setCampo("valorCompra", v)} />
              </Campo>
              <Campo label="Nº de embalagens">
                <input
                  className={`${CAMPO} font-num`}
                  style={inputEst}
                  type="number"
                  min="0"
                  value={item.embalagens || ""}
                  onChange={(e) =>
                    onChange({ ...item, embalagens: e.target.value, quantidadeComprada: N(e.target.value) * N(item.unidadesPorEmbalagem) })
                  }
                />
              </Campo>
              <Campo label="Unid. por embalagem">
                <input
                  className={`${CAMPO} font-num`}
                  style={inputEst}
                  type="number"
                  min="0"
                  value={item.unidadesPorEmbalagem || ""}
                  onChange={(e) =>
                    onChange({ ...item, unidadesPorEmbalagem: e.target.value, quantidadeComprada: N(item.embalagens) * N(e.target.value) })
                  }
                />
              </Campo>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Valor pago">
                <CampoMoeda value={item.valorCompra} onChange={(v) => setCampo("valorCompra", v)} />
              </Campo>
              <Campo label="Quantidade comprada">
                <input
                  className={`${CAMPO} font-num`}
                  style={inputEst}
                  type="number"
                  min="0"
                  value={item.quantidadeComprada || ""}
                  onChange={(e) => setCampo("quantidadeComprada", e.target.value)}
                />
              </Campo>
            </div>
          )}
          <Campo label="Quanto usa por atendimento" hint="ex: 1 touca, ou 0,5 (meia unidade)">
            <input
              className={`${CAMPO} font-num`}
              style={{ ...inputEst, width: 100 }}
              type="number"
              min="0"
              step="0.1"
              value={item.usoPorAtendimento || ""}
              onChange={(e) => setCampo("usoPorAtendimento", e.target.value)}
            />
          </Campo>
          {N(item.quantidadeComprada) > 0 && (
            <p className="text-[11px]" style={{ color: t.textMuted }}>
              preço unitário calculado:{" "}
              <b className="font-num" style={{ color: t.text }}>
                {fmtBRL(precoUnitarioItem(item))}
              </b>
            </p>
          )}
        </div>
      )}

      {modo === "compartilhado" && (
        <div className="mt-2 space-y-2">
          {insumosDisponiveis.length === 0 ? (
            <p className="text-[11px]" style={{ color: t.warningText }}>
              Nenhum insumo compartilhado cadastrado ainda — crie um na aba Negócio, seção "Insumos compartilhados".
            </p>
          ) : (
            <>
              <Campo label="Qual insumo?">
                <select
                  value={item.insumoId || ""}
                  onChange={(e) => setCampo("insumoId", e.target.value)}
                  className={CAMPO}
                  style={inputEst}
                >
                  <option value="">selecione...</option>
                  {insumosDisponiveis.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nome || "(sem nome)"}
                    </option>
                  ))}
                </select>
              </Campo>
              {insumoRef && insumoRef.modo === "unidade" && (
                <Campo label="Quanto usa por atendimento" hint="ex: 1 touca, ou 0,5 (meia unidade)">
                  <input
                    className={`${CAMPO} font-num`}
                    style={{ ...inputEst, width: 100 }}
                    type="number"
                    min="0"
                    step="0.1"
                    value={item.usoPorAtendimento || ""}
                    onChange={(e) => setCampo("usoPorAtendimento", e.target.value)}
                  />
                </Campo>
              )}
              {insumoRef &&
                insumoRef.modo === "duracao" &&
                (() => {
                  const jaAlocado = N(contexto?.alocacaoPorInsumoOutrosServicos?.[item.insumoId]);
                  const total = jaAlocado + N(item.percentualAlocado);
                  return (
                    <Campo
                      label="% deste insumo alocado a este serviço"
                      hint="some entre os serviços que usam o mesmo insumo — não passe de 100% no total"
                    >
                      <div className="flex items-center gap-1">
                        <input
                          className={`${CAMPO} font-num`}
                          style={{ ...inputEst, width: 70 }}
                          type="number"
                          min="0"
                          max="100"
                          value={item.percentualAlocado || ""}
                          onChange={(e) => setCampo("percentualAlocado", e.target.value)}
                        />
                        <span className="text-sm" style={{ color: t.textMuted }}>
                          %
                        </span>
                      </div>
                      {jaAlocado > 0 && (
                        <p className="text-[11px] mt-1" style={{ color: total > 100 ? t.danger : t.textMuted }}>
                          outros serviços já usam {fmtPct(jaAlocado)} desse insumo — com este, dá {fmtPct(total)}
                          {total > 100 ? " (passou de 100%)" : ""}
                        </p>
                      )}
                    </Campo>
                  );
                })()}
              {!insumoRef && item.insumoId && (
                <p className="text-[11px]" style={{ color: t.danger }}>
                  Esse insumo não existe mais — escolha outro.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {modo !== "direto" && (
        <div className="mt-2 flex items-center justify-between rounded-lg px-2 py-1.5" style={{ background: t.primarySoft }}>
          <span className="text-[11px] inline-flex items-center gap-1" style={{ color: t.primaryText }}>
            <Sparkles size={11} /> estimativa por atendimento
          </span>
          <span className="font-num text-xs font-semibold" style={{ color: t.primaryText }}>
            {fmtBRL(valorCalculado)}
          </span>
        </div>
      )}
    </div>
  );
}

export function ListaCustosVariaveis({ itens, setItens, contexto }) {
  const t = useT();
  const add = () => setItens([...itens, { id: uid(), nome: "", modo: "duracao", valor: "" }]);
  const remove = (id) => setItens(itens.filter((i) => i.id !== id));
  const updateItem = (novoItem) => setItens(itens.map((i) => (i.id === novoItem.id ? novoItem : i)));
  const total = itens.reduce((s, i) => s + calcularValorItemVariavel(i, contexto), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold" style={{ color: t.text }}>
          Produtos e Materiais Usados no Serviço
          <Ajuda texto="O que você gasta especificamente nesse atendimento — produto, luva, touca. Em contabilidade isso se chama 'custo variável'." />
        </span>
        <span className="font-num text-xs" style={{ color: t.textMuted }}>
          {fmtBRL(total)}
        </span>
      </div>
      <p className="text-[11px] mb-2" style={{ color: t.textMuted }}>
        Não sabe quanto gasta por atendimento? Escolha <b>"por duração"</b> (quanto tempo uma compra dura) ou
        <b> "por unidade"</b> (quanto usa de cada vez) — o valor por atendimento é calculado sozinho.
      </p>
      <div className="space-y-2">
        {itens.map((item) => (
          <ItemCustoVariavel key={item.id} item={item} onChange={updateItem} onRemove={() => remove(item.id)} contexto={contexto} />
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="btn-press mt-2 inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1.5"
        style={{ color: t.primaryText, background: t.primarySoft }}
      >
        <Plus size={13} /> adicionar item
      </button>
    </div>
  );
}
