/* Aba Negócio: custos fixos, equipe, impostos, formas de pagamento,
   insumos compartilhados e cópia de segurança. */

import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  Download,
  HelpCircle,
  Info,
  Landmark,
  PiggyBank,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { excluirComFallback, lerComFallback, listarComFallback, salvarComFallback, uid } from "../../armazenamento.js";
import {
  ANEXO_III,
  aliquotaEfetiva,
  calcularTaxaRecebimento,
  computeNegocioDerivado,
  FORMAS_PAGAMENTO,
  fmtBRL,
  fmtPct,
  N,
  parceiroValido,
  precoUnitarioItem,
  VINCULOS_PROFISSIONAL,
  vinculoDe,
} from "../../calculos.js";
import { CaixaSemaforo, Selo, useToast } from "../../componentes/base.jsx";
import { Ajuda, CAMPO, Campo, CampoMoeda, CampoNumero, CampoPct, SecaoColapsavel } from "../../componentes/campos.jsx";
import { baixarCopiaSeguranca, IndicadorAutoSalvar, useAutoSalvar, useAvisoNaoSalvo } from "../../componentes/salvamento.jsx";
import { lerCopia } from "../../copiaSeguranca.js";
import { REFERENCIA_SALARIAL } from "../../dados/referencias.js";
import { MODELOS_OPERACAO, SEGMENTOS, termoEstabelecimento } from "../../dados/segmentos.js";
import { GRADIENTE, useT } from "../../tema.js";
import { OnboardingPerfil } from "./Onboarding.jsx";

/* Enquadramento no Simples Nacional em linguagem natural: em que anexo o   */
/* negócio está, por quê, quanto paga sobre cada venda e, no Anexo V, o que */
/* faltaria para chegar ao Fator R de 28%. Só usa números que o próprio     */
/* usuário informou e as tabelas da LC 123/2006 — nenhuma estimativa.       */
function DiagnosticoSimples({ n, nd }) {
  const t = useT();
  const rbt12 = N(n.rbt12);
  const folha12 = N(n.folha12);
  const efetiva = fmtPct(nd.impostoPct, 2);
  const fatorR = fmtPct((nd.fatorR || 0) * 100);

  if (rbt12 <= 0) {
    return (
      <CaixaSemaforo tom="atencao" titulo="Falta o faturamento dos últimos 12 meses">
        <p>
          Sem ele, o app usa a alíquota da 1ª faixa do Anexo {nd.anexoUsado} ({efetiva}). Informe a receita bruta dos últimos 12 meses para
          o imposto sair exato.
        </p>
      </CaixaSemaforo>
    );
  }
  if (!nd.aliqInfo) {
    return (
      <CaixaSemaforo tom="perigo" titulo="Acima do limite do Simples Nacional">
        <p>
          {fmtBRL(rbt12)} em 12 meses passa do limite de R$ 4.800.000,00 do Simples Nacional. Por isso nenhum imposto está entrando nos
          preços. Converse com seu contador sobre o regime certo para esse faturamento.
        </p>
      </CaixaSemaforo>
    );
  }
  if (nd.anexoUsado === "III" && nd.fatorR >= 0.28) {
    return (
      <CaixaSemaforo tom="ok" titulo="Anexo III, o de imposto menor">
        <p>
          Seu Fator R é {fatorR}, acima dos 28% exigidos, então você fica no Anexo III. Você paga {efetiva} de imposto sobre cada venda, e é
          esse percentual que entra no preço dos serviços.
        </p>
      </CaixaSemaforo>
    );
  }
  if (nd.anexoUsado === "III") {
    return (
      <CaixaSemaforo tom="ok" titulo="Anexo III, pela sua atividade">
        <p>
          Seu Fator R é {fatorR}, abaixo de 28%. Mesmo assim, como sua atividade principal é de beleza, a Receita Federal entende que ela
          fica no Anexo III (Solução de Consulta Cosit nº 127/2021). Você paga {efetiva} de imposto sobre cada venda.
        </p>
        <p className="text-xs" style={{ color: t.textMuted }}>
          Confirme esse enquadramento com seu contador.
        </p>
      </CaixaSemaforo>
    );
  }
  // Anexo V: mostra o caminho até o Anexo III com os números do próprio negócio.
  const infoIII = aliquotaEfetiva(rbt12, ANEXO_III);
  const efetivaIII = infoIII ? infoIII.aliqEfetiva * 100 : null;
  const folhaNecessaria = rbt12 * 0.28;
  const faltaFolha = Math.max(0, folhaNecessaria - folha12);
  const diferencaMes = efetivaIII !== null ? ((nd.impostoPct - efetivaIII) / 100) * (rbt12 / 12) : null;
  return (
    <CaixaSemaforo tom="atencao" titulo="Anexo V, o de imposto maior">
      <p>
        Seu Fator R é {fatorR}, abaixo de 28%, então você fica no Anexo V e paga {efetiva} de imposto sobre cada venda.
        {efetivaIII !== null && (
          <>
            {" "}
            No Anexo III, com o mesmo faturamento, seriam {fmtPct(efetivaIII, 2)}
            {diferencaMes > 0 && <>, cerca de {fmtBRL(diferencaMes)} a menos de imposto por mês</>}.
          </>
        )}
      </p>
      <p>
        Para chegar aos 28%, a folha de 12 meses (salários, pró-labore e encargos) precisaria somar {fmtBRL(folhaNecessaria)}:{" "}
        {fmtBRL(faltaFolha)} a mais do que hoje.
      </p>
      <p className="text-xs" style={{ color: t.textMuted }}>
        Aumentar a folha também aumenta outros custos, como o INSS sobre o pró-labore. Simule com seu contador antes de decidir.
      </p>
    </CaixaSemaforo>
  );
}

/* Uma pessoa no cadastro de Profissionais (Bloco 4). O vínculo decide o que */
/* ela informa: comissionado(a) → comissão e atendimentos; dono(a) → só os   */
/* atendimentos (pesa na média com 0%); aluga cadeira → valor do aluguel.     */
function LinhaProfissional({ p, onChange, onRemove, salaoMei = false }) {
  const t = useT();
  const vinculo = vinculoDe(p);
  const campoStyle = { background: t.surface, border: `1px solid ${t.border}`, color: t.text };
  return (
    <div className="rounded-xl p-2.5 space-y-2 fade-up" style={{ background: t.surfaceAlt }}>
      <div className="flex gap-2 items-center">
        <input
          className={`${CAMPO} min-w-0`}
          style={campoStyle}
          placeholder="Nome do profissional"
          value={p.nome}
          onChange={(e) => onChange("nome", e.target.value)}
          aria-label="Nome do profissional"
        />
        <label className="flex items-center gap-1.5 text-[11px] shrink-0" style={{ color: t.textMuted }}>
          <input type="checkbox" checked={p.ativo !== false} onChange={(e) => onChange("ativo", e.target.checked)} />
          ativo
        </label>
        <button
          type="button"
          onClick={onRemove}
          className="btn-press touch-target shrink-0"
          style={{ color: t.danger }}
          aria-label={`Remover ${p.nome || "profissional"}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
      {/* "Como trabalha" em linha própria: dividindo a linha, o texto da opção era */}
      {/* cortado no celular ("Comissior", "Aluga cac").                          */}
      <Campo label="Como trabalha">
        <select className={CAMPO} style={campoStyle} value={vinculo} onChange={(e) => onChange("vinculo", e.target.value)}>
          {VINCULOS_PROFISSIONAL.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </Campo>
      <div className="grid grid-cols-2 gap-2">
        {vinculo === "comissao" && (
          <CampoPct
            label="Comissão"
            value={p.comissaoPct ?? ""}
            onChange={(v) => onChange("comissaoPct", v)}
            ajuda="O percentual do preço de cada serviço que vai para essa pessoa."
            faq="comissao-parceiros"
          />
        )}
        {vinculo === "parceiro" && (
          <CampoPct
            label="Cota-parte do parceiro"
            value={p.comissaoPct ?? ""}
            onChange={(v) => onChange("comissaoPct", v)}
            ajuda="O percentual de cada serviço que fica com o profissional-parceiro, como está no contrato de parceria. Essa parte não entra na receita do salão."
            faq="salao-parceiro"
          />
        )}
        {vinculo === "aluguel" ? (
          <Campo
            label="Aluguel por mês"
            ajuda="Quanto essa pessoa paga por mês para usar a cadeira. Entra como receita do salão e reduz o custo fixo que os seus serviços precisam cobrir."
          >
            <CampoMoeda value={p.aluguelMes} onChange={(v) => onChange("aluguelMes", v)} />
          </Campo>
        ) : (
          <Campo
            label="Atendimentos/mês"
            ajuda="Mais ou menos quantos atendimentos essa pessoa faz por mês. Serve de peso na comissão média: quem atende mais pesa mais."
          >
            <CampoNumero value={p.atendimentosMes ?? ""} placeholder="aprox." onChange={(v) => onChange("atendimentosMes", v)} />
          </Campo>
        )}
      </div>
      {vinculo === "aluguel" && (
        <p className="text-[11px]" style={{ color: t.textMuted }}>
          Quem aluga cadeira fica com o valor dos próprios serviços: não entra na comissão média nem deve ser contado no número de
          profissionais da Capacidade produtiva.
        </p>
      )}
      {/* Bloco 11: requisitos para a cota-parte sair da receita do salão. */}
      {vinculo === "parceiro" && (
        <div className="space-y-1.5">
          <label className="flex items-start gap-2 text-xs" style={{ color: t.text }}>
            <input type="checkbox" className="mt-0.5" checked={!!p.temCnpj} onChange={(e) => onChange("temCnpj", e.target.checked)} />
            <span>Tem CNPJ (MEI ou microempresa)</span>
          </label>
          <label className="flex items-start gap-2 text-xs" style={{ color: t.text }}>
            <input
              type="checkbox"
              className="mt-0.5"
              checked={!!p.contratoHomologado}
              onChange={(e) => onChange("contratoHomologado", e.target.checked)}
            />
            <span>Contrato de parceria escrito e homologado no sindicato (ou, sem sindicato, no Ministério do Trabalho)</span>
          </label>
          {salaoMei ? (
            <p className="text-[11px] flex items-start gap-1" style={{ color: t.danger }}>
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span>Salão MEI não pode ser salão-parceiro. A cota-parte entra nas contas como comissão comum.</span>
            </p>
          ) : parceiroValido(p) ? (
            <p className="text-[11px] flex items-start gap-1" style={{ color: t.successText }}>
              <CheckCircle2 size={12} className="mt-0.5 shrink-0" />
              <span>A cota-parte fica fora da receita do salão: o imposto e a taxa da maquininha caem na proporção.</span>
            </p>
          ) : (
            <p className="text-[11px] flex items-start gap-1" style={{ color: t.warningText }}>
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span>Sem CNPJ e contrato homologado, a cota-parte entra nas contas como comissão comum.</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* Formas de pagamento do negócio (Bloco 5): que parte das vendas entra por  */
/* cada forma e a taxa cobrada em cada uma. Em tabela, para dar para ler as  */
/* cinco formas de uma vez e conferir se a soma fecha 100%.                  */
function FormasPagamento({ recebimento, onChange }) {
  const t = useT();
  const calc = useMemo(() => calcularTaxaRecebimento(recebimento), [recebimento]);
  const campoStyle = { background: t.surface, border: `1px solid ${t.border}`, color: t.text };
  const entrada = (forma, campo, rotulo) => (
    <div className="flex items-center gap-1">
      <input
        className="w-full min-w-0 rounded-lg px-2 py-2 text-sm outline-none font-num text-right"
        style={campoStyle}
        type="number"
        min="0"
        max={campo === "participacaoPct" ? "100" : "99"}
        step="any"
        inputMode="decimal"
        value={recebimento?.[forma.id]?.[campo] ?? ""}
        placeholder="0"
        aria-label={`${forma.label}: ${rotulo}`}
        onChange={(e) => onChange(forma.id, campo, e.target.value)}
      />
      <span className="text-xs" style={{ color: t.textMuted }}>
        %
      </span>
    </div>
  );
  const falta = calc ? 100 - calc.soma : 100;
  return (
    <div className="space-y-3">
      <div className="grid gap-x-2 gap-y-1.5 items-center" style={{ gridTemplateColumns: "minmax(0,1fr) 4.75rem 4.75rem" }}>
        <span className="text-[11px] font-medium leading-snug self-end" style={{ color: t.textMuted }}>
          Forma
        </span>
        <span className="text-[11px] font-medium leading-snug self-end" style={{ color: t.textMuted }}>
          % das vendas
        </span>
        <span className="text-[11px] font-medium leading-snug self-end" style={{ color: t.textMuted }}>
          Taxa cobrada
        </span>
        {FORMAS_PAGAMENTO.map((f) => (
          <React.Fragment key={f.id}>
            <span className="text-xs leading-snug" style={{ color: t.text }}>
              {f.label}
            </span>
            {entrada(f, "participacaoPct", "% das vendas")}
            {f.semTaxa ? (
              <span className="text-[11px] pl-1" style={{ color: t.textMuted }}>
                sem taxa
              </span>
            ) : (
              entrada(f, "taxaPct", "taxa cobrada")
            )}
          </React.Fragment>
        ))}
        {/* Uma linha só, de ponta a ponta: com a borda em cada célula, o espaço entre */}
        {/* as colunas partia o traço em três pedaços.                                */}
        <div className="col-span-3 mt-0.5" style={{ height: 1, background: t.border }} />
        <span className="text-xs font-semibold" style={{ color: t.text }}>
          Total
        </span>
        <span className="text-xs font-semibold font-num text-right pr-4" style={{ color: calc && !calc.completo ? t.warningText : t.text }}>
          {fmtPct(calc ? calc.soma : 0, 0)}
        </span>
        <span />
      </div>

      {calc && !calc.completo && (
        <div className="pop-in flex gap-2 items-start rounded-xl p-2.5 text-xs" style={{ background: t.warningSoft, color: t.warningText }}>
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            As formas de pagamento somam {fmtPct(calc.soma, 0)} das vendas.{" "}
            {falta > 0 ? `Faltam ${fmtPct(falta, 0)} para fechar 100%.` : `Passou ${fmtPct(-falta, 0)} de 100%.`} Até fechar, a Calculadora
            usa a taxa informada em cada serviço.
          </span>
        </div>
      )}
      {calc?.completo && (
        <div className="pop-in rounded-xl p-3 text-xs space-y-1" style={{ background: t.primarySoft, color: t.primaryText }}>
          <p className="font-semibold">Taxa média de recebimento: {fmtPct(calc.pct, 2)}</p>
          <p style={{ color: t.text }}>
            De cada {fmtBRL(100)} vendidos, cerca de {fmtBRL(calc.pct)} ficam com a maquininha e o banco. Na Calculadora, cada serviço pode
            usar essa média no lugar de uma taxa própria.
          </p>
        </div>
      )}
      <ul className="text-[11px] space-y-1 list-disc pl-4" style={{ color: t.textMuted }}>
        <li>
          As taxas estão no extrato ou no contrato da maquininha e do banco. O Pix pode ter taxa ou não, conforme o banco e a forma de
          receber: confira.
        </li>
        <li>Crédito parcelado: se você antecipa o recebimento, use a taxa já somada à da antecipação.</li>
        <li>Mensalidade ou aluguel da maquininha é um valor fixo por mês: lance nas Contas Fixas, não aqui.</li>
      </ul>
    </div>
  );
}

function CopiaSeguranca({ soRestaurar = false }) {
  const t = useT();
  const { show, node: toastNode } = useToast();
  const [ultima, setUltima] = useState(null);
  const [baixando, setBaixando] = useState(false);
  const [lida, setLida] = useState(null); // resultado de lerCopia, aguardando confirmação
  const [erro, setErro] = useState(null);
  const [restaurando, setRestaurando] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    lerComFallback("app:ultima-copia").then((v) => setUltima(v || null));
  }, []);

  const baixar = async () => {
    setBaixando(true);
    setErro(null);
    const agora = await baixarCopiaSeguranca();
    setUltima(agora.toISOString());
    setBaixando(false);
    show("Cópia baixada. Guarde o arquivo num lugar seguro.");
  };

  const escolherArquivo = async (e) => {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setErro(null);
    const r = lerCopia(await arquivo.text());
    if (!r.ok) {
      setErro(r.erro);
      setLida(null);
      return;
    }
    setLida(r);
  };

  const restaurar = async () => {
    setRestaurando(true);
    // Apaga só o que não está na cópia; o resto é sobrescrito logo abaixo.
    const atuais = await listarComFallback("");
    atuais
      .filter((chave) => !(chave in lida.dados))
      .forEach((chave) => {
        excluirComFallback(chave);
      });
    Object.entries(lida.dados).forEach(([chave, valor]) => {
      salvarComFallback(chave, valor);
    });
    setTimeout(() => window.location.reload(), 400);
  };

  const fmtData = (iso) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "");
  const resumo = lida?.resumo;
  const partes = resumo
    ? [
        resumo.temNegocio && "negócio configurado",
        resumo.servicos > 0 && `${resumo.servicos} serviço${resumo.servicos > 1 ? "s" : ""}`,
        resumo.fechamentos > 0 && `${resumo.fechamentos} fechamento${resumo.fechamentos > 1 ? "s" : ""} do mês`,
        resumo.produtos > 0 && `${resumo.produtos} produto${resumo.produtos > 1 ? "s" : ""}`,
        resumo.concorrentes > 0 && `${resumo.concorrentes} concorrente${resumo.concorrentes > 1 ? "s" : ""}`,
      ].filter(Boolean)
    : [];

  const inputArquivo = (
    <input
      ref={inputRef}
      type="file"
      accept="application/json,.json"
      className="hidden"
      onChange={escolherArquivo}
      aria-label="Arquivo da cópia de segurança"
    />
  );
  const avisoErro = erro && (
    <div
      className="pop-in flex gap-2 items-start rounded-xl p-2.5 mt-2 text-xs"
      role="alert"
      style={{ background: t.dangerSoft, color: t.danger }}
    >
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <span>{erro}</span>
    </div>
  );
  const confirmacao = lida && (
    <div className="pop-in rounded-xl p-3 mt-2 text-xs space-y-2 text-left" style={{ background: t.warningSoft, color: t.warningText }}>
      <p className="font-semibold">
        Cópia de {fmtData(lida.criadaEm) || "data desconhecida"}
        {lida.versaoApp ? ` (versão ${lida.versaoApp})` : ""}
      </p>
      <p style={{ color: t.text }}>Contém: {partes.length > 0 ? partes.join(", ") : "dados do app"}.</p>
      <p>
        Restaurar <b>substitui todos os dados atuais deste aparelho</b> pelos da cópia. Se quiser guardar os atuais, baixe uma cópia antes.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={restaurar}
          disabled={restaurando}
          className="btn-press touch-target inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-semibold"
          style={{ background: t.danger, color: t.onDanger }}
        >
          {restaurando && (
            <span
              className="inline-block w-3 h-3 rounded-full border-2 border-current border-r-transparent animate-spin"
              aria-hidden="true"
            />
          )}
          {restaurando ? "Restaurando…" : "Sim, restaurar"}
        </button>
        {!restaurando && (
          <button type="button" onClick={() => setLida(null)} className="btn-press touch-target underline" style={{ color: t.textMuted }}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  );

  // No primeiro acesso (aparelho novo ou dados apagados): só restaurar.
  if (soRestaurar) {
    return (
      <div className="mt-3 text-center">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={restaurando}
          className="btn-press touch-target text-xs underline underline-offset-2"
          style={{ color: t.textMuted }}
        >
          Já usa o app em outro aparelho? Restaure uma cópia de segurança
        </button>
        {inputArquivo}
        {avisoErro}
        {confirmacao}
      </div>
    );
  }

  return (
    <SecaoColapsavel
      titulo="Cópia de segurança"
      icon={ShieldCheck}
      resumo={ultima ? `última: ${fmtData(ultima)}` : "nenhuma ainda"}
      ajuda="Seus dados ficam guardados só neste aparelho. A cópia é um arquivo com tudo: dá para guardar e restaurar aqui ou em outro celular ou computador."
    >
      <p className="text-[11px] mb-2" style={{ color: t.textMuted }}>
        Baixe uma cópia de vez em quando, por exemplo depois de cada fechamento do mês, e guarde num lugar seguro (seu e-mail ou Google
        Drive). O arquivo tem os números do seu negócio: não compartilhe.
      </p>
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={baixar}
          disabled={baixando}
          className="btn-press touch-target inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
          style={{ background: t.primaryText, color: t.onPrimary, opacity: baixando ? 0.8 : 1 }}
        >
          {baixando ? (
            <span
              className="inline-block w-3 h-3 rounded-full border-2 border-current border-r-transparent animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Download size={14} />
          )}
          {baixando ? "Preparando…" : "Baixar cópia"}
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={restaurando}
          className="btn-press touch-target inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
          style={{ background: t.surfaceAlt, color: t.text, border: `1px solid ${t.border}` }}
        >
          Restaurar de uma cópia
        </button>
        {inputArquivo}
      </div>
      {avisoErro}
      {confirmacao}
      {toastNode}
    </SecaoColapsavel>
  );
}

export function Negocio({ negocio, onSalvar, servicos, onCarregarExemplo }) {
  const t = useT();
  const [n, setN] = useState(negocio);
  const { show, node: toastNode } = useToast();
  const nd = useMemo(() => computeNegocioDerivado(n), [n]);
  const [confirmandoExemplo, setConfirmandoExemplo] = useState(false);
  // Baseado no que está SALVO (prop), não no rascunho ao vivo — senão o aviso de "não
  // configurado" sumiria assim que a pessoa digitasse qualquer coisa, antes de auto-salvar.
  const configuradoSalvo = useMemo(() => computeNegocioDerivado(negocio).configurado, [negocio]);

  const salvarComToast = (novo) => {
    const configuradoAntes = computeNegocioDerivado(negocio).configurado;
    onSalvar(novo);
    const configuradoDepois = computeNegocioDerivado(novo).configurado;
    if (!configuradoAntes && configuradoDepois) show("Tudo pronto! Indo pra Calculadora...");
  };
  const statusSalvar = useAutoSalvar(n, negocio, salvarComToast);
  useAvisoNaoSalvo(statusSalvar !== "salvo");
  const [perfilAberto, setPerfilAberto] = useState(!configuradoSalvo);

  const temDadoRealPreenchido =
    n.custosFixos.some((c) => N(c.valor) > 0) || N(n.proLabore) > 0 || n.regime !== "indefinido" || (servicos || []).length > 0;

  const clicouCarregarExemplo = () => {
    if (temDadoRealPreenchido) setConfirmandoExemplo(true);
    else onCarregarExemplo();
  };

  const addCusto = () => setN({ ...n, custosFixos: [...n.custosFixos, { id: uid(), nome: "", valor: "", semCaixa: false }] });
  const removeCusto = (id) => setN({ ...n, custosFixos: n.custosFixos.filter((i) => i.id !== id) });
  const updateCusto = (id, field, value) =>
    setN({ ...n, custosFixos: n.custosFixos.map((i) => (i.id === id ? { ...i, [field]: value } : i)) });

  const addProfissional = () => setN({ ...n, profissionais: [...(n.profissionais || []), { id: uid(), nome: "", ativo: true }] });
  const removeProfissional = (id) => setN({ ...n, profissionais: (n.profissionais || []).filter((p) => p.id !== id) });
  const updateProfissional = (id, field, value) =>
    setN({ ...n, profissionais: (n.profissionais || []).map((p) => (p.id === id ? { ...p, [field]: value } : p)) });

  const updateRecebimento = (forma, campo, valor) =>
    setN({ ...n, recebimento: { ...(n.recebimento || {}), [forma]: { ...(n.recebimento?.[forma] || {}), [campo]: valor } } });
  const recebimentoCalc = useMemo(() => calcularTaxaRecebimento(n.recebimento), [n.recebimento]);

  const cardStyle = { background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow };

  // Onboarding aparece só até existir um segmento salvo — depois disso vira um card
  // recolhido e editável no topo, não um passo obrigatório repetido toda vez.
  if (!negocio.perfil?.segmento) {
    const concluirOnboarding = (perfil) => {
      const atualizado = { ...n, perfil };
      setN(atualizado);
      onSalvar(atualizado); // confirmação explícita — não espera o debounce do auto-save
      show(`Perfeito, ${perfil.nomeResponsavel.split(" ")[0] || ""}! Vamos aos custos fixos.`);
    };
    return (
      <div className="max-w-lg mx-auto">
        {toastNode}
        <OnboardingPerfil onConcluir={concluirOnboarding} />
        <CopiaSeguranca soRestaurar />
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[1.15fr,1fr] gap-5">
      {!configuradoSalvo && (
        <div
          className="lg:col-span-2 rounded-2xl p-4 min-w-0"
          style={{ background: t.primarySoft, border: `1px dashed ${t.primaryText}55` }}
        >
          {!confirmandoExemplo ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex-1 basis-full sm:basis-auto min-w-0">
                <p className="text-sm font-semibold inline-flex items-center gap-1.5" style={{ color: t.text }}>
                  <Sparkles size={14} style={{ color: t.primaryText }} /> Quer ver o app funcionando antes de configurar o seu?
                </p>
                <p className="text-[11px] mt-1" style={{ color: t.textMuted }}>
                  Preenche negócio e 3 serviços de exemplo (números ilustrativos, editáveis) — deixa o Painel e o DRE prontos pra explorar.
                </p>
              </div>
              <button
                type="button"
                onClick={clicouCarregarExemplo}
                className="btn-press touch-target rounded-xl px-3 py-2 text-xs font-semibold w-full sm:w-auto"
                style={{ background: t.primaryText, color: t.onPrimary }}
              >
                Carregar exemplo
              </button>
            </div>
          ) : (
            <div className="pop-in flex items-center gap-2 flex-wrap text-sm" style={{ color: t.danger }}>
              <AlertTriangle size={16} className="shrink-0" />
              <span className="flex-1 basis-full sm:basis-auto min-w-0">
                Isso substitui custos, configurações e serviços que você já preencheu. Seu perfil (nome, segmento e cidade) é mantido. Tem
                certeza?
              </span>
              <button
                type="button"
                onClick={() => {
                  onCarregarExemplo();
                  setConfirmandoExemplo(false);
                }}
                className="btn-press font-semibold underline shrink-0"
              >
                Sim, carregar exemplo
              </button>
              <button
                type="button"
                onClick={() => setConfirmandoExemplo(false)}
                className="btn-press underline shrink-0"
                style={{ color: t.textMuted }}
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Já configurado: o banner grande some (era só pra quem tá começando), mas       */}
      {/* deixa um jeito discreto de recarregar o exemplo mesmo assim — a mesma            */}
      {/* confirmação continua valendo, só não fica ocupando espaço em quem já usa o app. */}
      {configuradoSalvo && (
        <div className="lg:col-span-2 min-w-0">
          {!confirmandoExemplo ? (
            <button
              type="button"
              onClick={clicouCarregarExemplo}
              className="btn-press touch-target text-[11px] font-medium inline-flex items-start gap-1 text-left"
              style={{ color: t.textMuted }}
            >
              <Sparkles size={11} className="shrink-0 mt-[2px]" /> recarregar dados de exemplo (substitui o que está preenchido)
            </button>
          ) : (
            <div
              className="pop-in flex items-center gap-2 flex-wrap text-xs rounded-xl p-2.5"
              style={{ background: t.dangerSoft, color: t.danger }}
            >
              <AlertTriangle size={14} className="shrink-0" />
              <span className="flex-1 basis-full sm:basis-auto min-w-0">
                Isso substitui custos, configurações e serviços que você já preencheu. Seu perfil (nome, segmento e cidade) é mantido. Tem
                certeza?
              </span>
              <button
                type="button"
                onClick={() => {
                  onCarregarExemplo();
                  setConfirmandoExemplo(false);
                }}
                className="btn-press font-semibold underline shrink-0"
              >
                Sim, carregar exemplo
              </button>
              <button
                type="button"
                onClick={() => setConfirmandoExemplo(false)}
                className="btn-press underline shrink-0"
                style={{ color: t.textMuted }}
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      <div className="lg:col-span-2 rounded-2xl p-4 min-w-0" style={cardStyle}>
        <button
          type="button"
          onClick={() => setPerfilAberto((v) => !v)}
          className="btn-press touch-target flex items-center justify-between w-full"
          aria-expanded={perfilAberto}
        >
          <span className="flex items-center gap-2 min-w-0">
            {(() => {
              const Icon = SEGMENTOS.find((s) => s.id === n.perfil?.segmento)?.icon || Building2;
              return <Icon size={16} style={{ color: t.primaryText, flexShrink: 0 }} />;
            })()}
            <span className="text-sm font-semibold truncate min-w-0" style={{ color: t.text }}>
              Perfil do negócio
            </span>
          </span>
          <ChevronDown
            size={15}
            style={{
              color: t.textMuted,
              flexShrink: 0,
              transform: perfilAberto ? "rotate(180deg)" : "none",
              transition: "transform .2s ease",
            }}
          />
        </button>
        {perfilAberto && (
          <div className="pop-in mt-3">
            <div className="grid sm:grid-cols-2 gap-2">
              <Campo label="Nome do responsável">
                <input
                  className={CAMPO}
                  style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
                  value={n.perfil?.nomeResponsavel || ""}
                  onChange={(e) => setN({ ...n, perfil: { ...n.perfil, nomeResponsavel: e.target.value } })}
                />
              </Campo>
              <Campo label="Nome fantasia">
                <input
                  className={CAMPO}
                  style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
                  value={n.perfil?.nomeFantasia || ""}
                  onChange={(e) => setN({ ...n, perfil: { ...n.perfil, nomeFantasia: e.target.value } })}
                />
              </Campo>
              <Campo label="Segmento">
                <select
                  className={CAMPO}
                  style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
                  value={n.perfil?.segmento || ""}
                  onChange={(e) => setN({ ...n, perfil: { ...n.perfil, segmento: e.target.value } })}
                >
                  {SEGMENTOS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Modelo de operação">
                <select
                  className={CAMPO}
                  style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
                  value={n.perfil?.modeloOperacao || ""}
                  onChange={(e) => setN({ ...n, perfil: { ...n.perfil, modeloOperacao: e.target.value } })}
                >
                  {MODELOS_OPERACAO.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Cidade">
                <input
                  className={CAMPO}
                  style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
                  value={n.perfil?.cidade || ""}
                  onChange={(e) => setN({ ...n, perfil: { ...n.perfil, cidade: e.target.value } })}
                />
              </Campo>
              <Campo label="Estado">
                <input
                  className={CAMPO}
                  style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
                  value={n.perfil?.estado || ""}
                  onChange={(e) => setN({ ...n, perfil: { ...n.perfil, estado: e.target.value.toUpperCase().slice(0, 2) } })}
                />
              </Campo>
            </div>
            <p className="text-[10px] mt-2" style={{ color: t.textMuted }}>
              Mudar o segmento aqui não altera serviços já salvos — só passa a sugerir templates e insumos diferentes pros próximos.
            </p>
          </div>
        )}
      </div>

      {/* space-y-3 e sem linhas divisórias: cada seção já é um cartão com borda; a linha  */}
      {/* entre eles somava ~50px de vão, contra 12px entre os cartões do Painel.         */}
      <div className="rounded-2xl p-5 space-y-3 min-w-0" style={cardStyle}>
        <SecaoColapsavel
          resumo={`${n.custosFixos.length} conta${n.custosFixos.length === 1 ? "" : "s"} · ${fmtBRL(n.custosFixos.reduce((s, c) => s + N(c.valor), 0))}/mês`}
          abertoInicial={!configuradoSalvo}
          titulo={`Contas Fixas d${termoEstabelecimento(n.perfil?.segmento).artigo} ${termoEstabelecimento(n.perfil?.segmento).termo.charAt(0).toUpperCase()}${termoEstabelecimento(n.perfil?.segmento).termo.slice(1)}`}
          icon={Building2}
          ajuda="Despesas que você paga todo mês, atendendo ou não — aluguel, água, luz, contador. Em contabilidade isso se chama 'custo fixo'."
          faq="custo-fixo-variavel"
        >
          <p className="text-[11px] mb-2" style={{ color: t.textMuted }}>
            Comecei com as categorias mais comuns do setor, valores em branco — apague o que não se aplica a você e some o que estiver
            faltando.
          </p>
          {n.perfil?.modeloOperacao === "locatario" && (
            <div className="flex gap-2 items-start rounded-xl p-3 mb-2 text-xs" style={{ background: t.primarySoft, color: t.text }}>
              <Info size={14} className="mt-0.5 shrink-0" style={{ color: t.primaryText }} />
              <p>
                <strong>Você aluga cadeira ou sala.</strong> Se paga um valor fixo por mês, lance em "Aluguel do espaço": ele é um custo
                fixo seu. Se o dono do salão fica com uma porcentagem de cada serviço, deixe o aluguel em branco e informe essa porcentagem
                na Calculadora, no campo "% que fica com o salão".
              </p>
            </div>
          )}
          <div className="space-y-2">
            {n.custosFixos.map((item) => (
              <div key={item.id} className="flex flex-col gap-1.5 rounded-xl p-2" style={{ background: t.surfaceAlt }}>
                <div className="flex gap-2 items-center">
                  <input
                    className={`${CAMPO} min-w-0`}
                    style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                    placeholder="ex: aluguel"
                    value={item.nome}
                    onChange={(e) => updateCusto(item.id, "nome", e.target.value)}
                  />
                  <div style={{ width: 110, flexShrink: 0 }}>
                    <CampoMoeda value={item.valor} onChange={(v) => updateCusto(item.id, "valor", v)} />
                  </div>
                  <button type="button" onClick={() => removeCusto(item.id)} className="btn-press shrink-0" style={{ color: t.danger }}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <label className="flex items-center gap-1.5 text-[11px] pl-1" style={{ color: t.textMuted }}>
                  <input type="checkbox" checked={!!item.semCaixa} onChange={(e) => updateCusto(item.id, "semCaixa", e.target.checked)} />
                  não representa saída de caixa (ex: depreciação de equipamento)
                </label>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addCusto}
            className="btn-press mt-2 inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1.5"
            style={{ color: t.primaryText, background: t.primarySoft }}
          >
            <Plus size={13} /> adicionar item
          </button>
        </SecaoColapsavel>

        <SecaoColapsavel
          resumo={`${(n.profissionais || []).filter((p) => p.ativo !== false).length} ativo(s)${nd.comissaoEquipe ? ` · comissão média ${fmtPct(nd.comissaoEquipe.pct)}` : ""}`}
          titulo="Profissionais"
          icon={Building2}
          faq="comissao-parceiros"
          ajuda={`Cadastre quem atende n${termoEstabelecimento(n.perfil?.segmento).artigo} ${termoEstabelecimento(n.perfil?.segmento).termo}. Serve para dividir o faturamento por pessoa no Fechamento Mensal, calcular a comissão média da equipe e lançar o aluguel de quem aluga cadeira.`}
        >
          <p className="text-[11px] mb-2" style={{ color: t.textMuted }}>
            Opcional. Com duas ou mais pessoas atendendo, a Calculadora pode usar a comissão média da equipe. Desmarcar "ativo" tira a
            pessoa das contas e do Fechamento Mensal sem apagar o histórico de meses anteriores.
          </p>
          <div className="space-y-2">
            {(n.profissionais || []).map((p) => (
              <LinhaProfissional
                key={p.id}
                p={p}
                salaoMei={n.regime === "mei"}
                onChange={(campo, valor) => updateProfissional(p.id, campo, valor)}
                onRemove={() => removeProfissional(p.id)}
              />
            ))}
            {(n.profissionais || []).length === 0 && (
              <p className="text-[11px]" style={{ color: t.textMuted }}>
                Nenhum profissional cadastrado ainda.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={addProfissional}
            className="btn-press mt-2 inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1.5"
            style={{ color: t.primaryText, background: t.primarySoft }}
          >
            <Plus size={13} /> adicionar profissional
          </button>
          {nd.comissaoEquipe && (
            <div className="pop-in rounded-xl p-3 mt-3 text-xs space-y-1" style={{ background: t.primarySoft, color: t.primaryText }}>
              <p className="font-semibold">Comissão média da equipe: {fmtPct(nd.comissaoEquipe.pct)}</p>
              <p style={{ color: t.text }}>
                {nd.comissaoEquipe.ponderada
                  ? `Ponderada pelos atendimentos de ${nd.comissaoEquipe.participantes.length} pessoas. Quem atende mais pesa mais.`
                  : `Média simples de ${nd.comissaoEquipe.participantes.length} pessoas, porque falta o número de atendimentos de alguém. Preencha para a média ficar ponderada.`}
              </p>
            </div>
          )}
          {nd.temParceriaValida && (
            <div className="pop-in rounded-xl p-3 mt-3 text-xs space-y-1" style={{ background: t.successSoft, color: t.successText }}>
              <p className="font-semibold">Parceria (Lei do Salão-Parceiro)</p>
              <p style={{ color: t.text }}>
                A cota-parte dos parceiros com CNPJ e contrato homologado fica fora da receita bruta do salão. Na Calculadora, o imposto e a
                taxa da maquininha entram só sobre a parte do salão. No Regime tributário, informe o faturamento de 12 meses já sem as cotas
                repassadas.
                <Ajuda
                  faq="salao-parceiro"
                  texto="A Lei 13.352/2016 permite que o salão repasse ao profissional-parceiro uma cota-parte que não conta como receita do salão. Toque em Entender melhor para os requisitos."
                />
              </p>
            </div>
          )}
          {nd.receitaAluguelCadeiras > 0 && (
            <div className="pop-in rounded-xl p-3 mt-3 text-xs" style={{ background: t.successSoft, color: t.successText }}>
              <p className="font-semibold">Aluguel de cadeiras: {fmtBRL(nd.receitaAluguelCadeiras)}/mês</p>
              <p style={{ color: t.text }}>
                Entra como receita no DRE e reduz o custo fixo que os seus serviços precisam cobrir, de {fmtBRL(nd.custoFixoTotal)} para{" "}
                {fmtBRL(nd.custoFixoLiquido)}.
              </p>
            </div>
          )}
        </SecaoColapsavel>

        <SecaoColapsavel
          resumo={
            !recebimentoCalc
              ? "não informado"
              : recebimentoCalc.completo
                ? `taxa média ${fmtPct(recebimentoCalc.pct, 2)}`
                : `soma ${fmtPct(recebimentoCalc.soma, 0)} — incompleto`
          }
          titulo="Formas de pagamento"
          icon={CreditCard}
          faq="taxa-media-recebimento"
          ajuda="Quanto das suas vendas entra em dinheiro, Pix, débito e crédito, e quanto a maquininha ou o banco cobra em cada um. Com isso, o app calcula uma taxa média para usar no preço dos serviços."
        >
          <p className="text-[11px] mb-2" style={{ color: t.textMuted }}>
            Opcional. Informe que parte das vendas entra por cada forma de pagamento e a taxa cobrada em cada uma. O app calcula a taxa
            média, pesando cada taxa pela parte das vendas. Uma estimativa já ajuda: dá para ajustar depois com o extrato do mês.
          </p>
          <FormasPagamento recebimento={n.recebimento || {}} onChange={updateRecebimento} />
        </SecaoColapsavel>

        <SecaoColapsavel
          resumo={`${(n.insumosCompartilhados || []).length} cadastrado(s)`}
          titulo="Insumos compartilhados entre serviços"
          icon={Sparkles}
        >
          <p className="text-[11px] mb-2" style={{ color: t.textMuted }}>
            Coisas como shampoo, touca ou luva costumam ser usadas em vários serviços. Cadastre aqui uma vez só — depois, em cada serviço na
            Calculadora, você escolhe "Compartilhado" e diz o quanto aquele serviço específico usa.
          </p>
          <div className="space-y-2">
            {(n.insumosCompartilhados || []).map((item) => (
              <ItemInsumoCompartilhado
                key={item.id}
                item={item}
                onChange={(novo) =>
                  setN({ ...n, insumosCompartilhados: n.insumosCompartilhados.map((i) => (i.id === novo.id ? novo : i)) })
                }
                onRemove={() => setN({ ...n, insumosCompartilhados: n.insumosCompartilhados.filter((i) => i.id !== item.id) })}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setN({ ...n, insumosCompartilhados: [...(n.insumosCompartilhados || []), { id: uid(), nome: "", modo: "duracao" }] })
            }
            className="btn-press mt-2 inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1.5"
            style={{ color: t.primaryText, background: t.primarySoft }}
          >
            <Plus size={13} /> adicionar insumo compartilhado
          </button>
          {(n.insumosCompartilhados || []).length === 0 && (
            <p className="text-[11px] mt-2" style={{ color: t.textMuted }}>
              Nenhum ainda — opcional. Sem isso, cada serviço continua com seus próprios custos, sem compartilhar nada.
            </p>
          )}
        </SecaoColapsavel>

        <SecaoColapsavel
          resumo={`${nd.horasTotais || 0}h/mês`}
          abertoInicial={!configuradoSalvo}
          titulo="Capacidade produtiva"
          icon={Clock3}
        >
          <div className="grid grid-cols-3 gap-2">
            <Campo label="Número de profissionais" hint="incluindo você, sem contar quem aluga cadeira — MEI sozinho(a) = 1">
              <CampoNumero value={n.numeroProfissionais} onChange={(v) => setN({ ...n, numeroProfissionais: v })} />
            </Campo>
            <Campo label="Dias trabalhados/mês">
              <CampoNumero value={n.diasMes} max="31" onChange={(v) => setN({ ...n, diasMes: v })} />
            </Campo>
            <Campo label="Horas por profissional/dia">
              <CampoNumero value={n.horasDia} max="24" onChange={(v) => setN({ ...n, horasDia: v })} />
            </Campo>
          </div>
          <p className="text-xs mt-2" style={{ color: t.textMuted }}>
            Capacidade total: <span className="font-num font-medium">{nd.horasTotais || 0} horas/mês</span> ({nd.numeroProfissionais}{" "}
            profissional{nd.numeroProfissionais > 1 ? "is" : ""} × {n.horasDia || 0}h × {n.diasMes || 0} dias)
          </p>
          {(N(n.diasMes) > 31 || N(n.horasDia) > 24) && (
            <div className="flex gap-2 items-start rounded-xl p-3 mt-2 text-sm" style={{ background: t.warningSoft, color: t.warningText }}>
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>
                {N(n.diasMes) > 31 ? "Um mês tem no máximo 31 dias. " : ""}
                {N(n.horasDia) > 24 ? "Um dia tem no máximo 24 horas. " : ""}
                Revise esses números — capacidade inflada faz o custo por hora, e o preço final, ficarem subestimados.
              </span>
            </div>
          )}
          {nd.numeroProfissionais === 1 && (
            <p className="text-[11px] mt-1.5" style={{ color: t.primaryText }}>
              Trabalhando sozinho(a), o campo "comissão" na Calculadora provavelmente não se aplica — o que sobra é seu pró-labore, não uma
              comissão para terceiros.
            </p>
          )}
        </SecaoColapsavel>

        <SecaoColapsavel
          resumo={N(n.proLabore) > 0 ? `${fmtBRL(N(n.proLabore))}/mês` : "não definido"}
          abertoInicial={!configuradoSalvo}
          titulo="Pró-labore do dono"
          icon={PiggyBank}
          ajuda="É o seu próprio salário. Mesmo trabalhando pra si, seu tempo tem custo — se não colocar isso aqui, o app vai achar que seu trabalho é de graça."
          faq="o-que-e-pro-labore"
        >
          <Campo
            label="Quanto você retira do negócio por mês (ou pagaria a si mesmo por essa função)"
            hint="Erro clássico de MEI/microempresa: não contar o próprio trabalho como custo."
          >
            <CampoMoeda value={n.proLabore} onChange={(v) => setN({ ...n, proLabore: v })} />
          </Campo>
          {N(n.proLabore) <= 0 && (
            <div
              className="pop-in flex gap-2 items-start rounded-xl p-2.5 mt-2 text-xs"
              style={{ background: t.dangerSoft, color: t.danger }}
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              Sem pró-labore definido, seu trabalho está sendo tratado como grátis nos cálculos.
            </div>
          )}
        </SecaoColapsavel>

        <SecaoColapsavel resumo="consulta" titulo="Referência salarial sindical (consulta)" icon={Landmark}>
          <div className="flex gap-2 items-start rounded-xl p-3 text-xs mb-3" style={{ background: t.warningSoft, color: t.warningText }}>
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              Essa convenção vale para o Estado da Bahia, <b>exceto Salvador e municípios com sindicato patronal próprio</b> — o que
              provavelmente inclui Feira de Santana (que tem o SINDBEFS). Use como referência de contexto, não como número automático — nada
              aqui entra em nenhum cálculo sozinho.
            </span>
          </div>
          <div className="space-y-1">
            {REFERENCIA_SALARIAL.pisos.map((p) => (
              <div
                key={p.funcao}
                className="flex items-center justify-between text-xs py-1"
                style={{ borderBottom: `1px solid ${t.border}` }}
              >
                <span style={{ color: t.textMuted }}>{p.funcao}</span>
                <span className="font-num font-medium" style={{ color: t.text }}>
                  {fmtBRL(p.valor)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs py-2 mt-1" style={{ color: t.textMuted }}>
            <span>{REFERENCIA_SALARIAL.beneficio.nome}</span>
            <span className="font-num font-medium shrink-0 ml-2" style={{ color: t.text }}>
              {fmtBRL(REFERENCIA_SALARIAL.beneficio.valor)}/mês
            </span>
          </div>
          <div className="text-[11px] mt-1">
            <Selo tipo="legal">
              {REFERENCIA_SALARIAL.fonte} — {REFERENCIA_SALARIAL.documento}
            </Selo>
          </div>
        </SecaoColapsavel>

        <SecaoColapsavel
          resumo={n.regime === "indefinido" ? "não definido" : n.regime === "mei" ? "MEI" : `Simples · ${fmtPct(nd.impostoPct, 1)}`}
          abertoInicial={!configuradoSalvo}
          titulo="Regime tributário"
          icon={Landmark}
        >
          <div className="flex gap-1.5 mb-3">
            {[
              { id: "indefinido", label: "Ainda não sei" },
              { id: "mei", label: "MEI" },
              { id: "simples", label: "Simples Nacional" },
            ].map((r) => (
              <button
                type="button"
                key={r.id}
                onClick={() => setN({ ...n, regime: r.id })}
                className="btn-press rounded-lg px-3 py-1.5 text-xs font-medium"
                style={{
                  background: n.regime === r.id ? t.primaryText : t.surfaceAlt,
                  color: n.regime === r.id ? t.onPrimary : t.textMuted,
                  border: `1px solid ${n.regime === r.id ? t.primaryText : t.border}`,
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          {n.regime === "indefinido" && (
            <div className="flex gap-2 items-start rounded-xl p-3 text-sm" style={{ background: t.surfaceAlt, color: t.textMuted }}>
              <Info size={15} className="mt-0.5 shrink-0" />
              Sem regime definido, nenhum imposto entra no preço calculado — o preço final ficará subestimado. Defina assim que souber.
            </div>
          )}

          {n.regime === "mei" && (
            <Campo
              label="Valor do seu DAS-MEI atual (do boleto mensal)"
              hint="O DAS-MEI é um valor fixo, não um % do faturamento — por isso ele entra como custo fixo, não como imposto sobre o preço."
            >
              <CampoMoeda value={n.meiDas} onChange={(v) => setN({ ...n, meiDas: v })} />
            </Campo>
          )}

          {n.regime === "simples" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Campo
                  label="Receita bruta últimos 12 meses (RBT12)"
                  faq="rbt12-aliquota-efetiva"
                  ajuda="Tudo o que o negócio faturou nos últimos 12 meses, somado. O Simples Nacional usa esse total pra achar sua alíquota: quanto maior o faturamento acumulado, maior o percentual de imposto. Seu contador tem esse número."
                >
                  <CampoMoeda value={n.rbt12} onChange={(v) => setN({ ...n, rbt12: v })} />
                </Campo>
                <Campo
                  label="Folha de pagamento 12 meses"
                  hint="salários + pró-labore + encargos + FGTS"
                  faq="fator-r"
                  ajuda="Quanto o negócio gastou com pessoas em 12 meses, incluindo o seu pró-labore. Dividido pelo faturamento, isso dá o Fator R: a partir de 28%, o imposto pode cair do Anexo V para o Anexo III, que é mais barato."
                >
                  <CampoMoeda value={n.folha12} onChange={(v) => setN({ ...n, folha12: v })} />
                </Campo>
              </div>
              {nd.temParceriaValida && (
                <p className="text-[11px] flex items-start gap-1" style={{ color: t.primaryText }}>
                  <Info size={12} className="mt-0.5 shrink-0" />
                  <span>
                    Com parceiros: a receita de 12 meses é a do salão, já sem as cotas-parte repassadas, e a folha não inclui os parceiros
                    (eles não são empregados).
                  </span>
                </p>
              )}
              <label className="flex items-start gap-2 text-xs rounded-xl p-2.5" style={{ background: t.surfaceAlt, color: t.textMuted }}>
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={n.atividadeSempreAnexoIII}
                  onChange={(e) => setN({ ...n, atividadeSempreAnexoIII: e.target.checked })}
                />
                <span>
                  Minha atividade principal é cabeleireiro, barbeiro, manicure, pedicure, esteticista ou depilador — pela Solução de
                  Consulta Cosit nº 127/2021, a Receita Federal entende que esses serviços vão para o Anexo III independentemente do Fator
                  R. Desmarque se quiser que eu aplique o Fator R normalmente. Confirme com seu contador antes de decidir.
                </span>
              </label>

              <DiagnosticoSimples n={n} nd={nd} />

              {nd.aliqInfo && N(n.rbt12) > 0 && (
                <div className="rounded-xl p-3" style={{ background: t.surfaceAlt }}>
                  <p className="text-[11px] font-medium mb-1" style={{ color: t.textMuted }}>
                    Detalhes do cálculo
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: t.textMuted }}>
                    <span>
                      Fator R: <b className="font-num">{fmtPct((nd.fatorR || 0) * 100)}</b>
                      <Ajuda
                        faq="fator-r"
                        texto="Folha de pagamento ÷ faturamento dos últimos 12 meses. A partir de 28%, serviços que estariam no Anexo V passam para o Anexo III, com imposto menor."
                      />
                    </span>
                    <span>
                      Anexo aplicado: <b>{nd.anexoUsado}</b>
                    </span>
                    <span>
                      Alíquota nominal: <b className="font-num">{fmtPct(nd.aliqInfo.aliqNominal * 100)}</b>
                      <Ajuda
                        faq="rbt12-aliquota-efetiva"
                        texto="O percentual de tabela da sua faixa de faturamento. Não é o que você paga de fato: a lei desconta uma parcela fixa, e o resultado é a alíquota efetiva ao lado."
                      />
                    </span>
                    <span>
                      Alíquota efetiva: <b className="font-num">{fmtPct(nd.impostoPct, 2)}</b>
                      <Ajuda
                        faq="rbt12-aliquota-efetiva"
                        texto="O percentual de imposto que você realmente paga sobre cada venda. É este número que o app embute no preço dos seus serviços."
                      />
                    </span>
                  </div>
                </div>
              )}
              <div className="text-[11px]">
                <Selo tipo="legal">tabela Simples Nacional 2026, Anexos III e V — LC 123/2006</Selo>
              </div>
            </div>
          )}
        </SecaoColapsavel>

        <SecaoColapsavel
          resumo={N(n.capitalInvestido) > 0 ? `${fmtBRL(N(n.capitalInvestido))} investido` : "não definido"}
          titulo="Para o ponto de equilíbrio econômico"
          icon={TrendingUp}
          faq="ponto-de-equilibrio"
          ajuda="Opcional. Serve pra responder: o negócio rende mais do que se esse dinheiro estivesse aplicado no banco? Se rende menos, você está trabalhando sem o retorno que o risco do negócio exige."
        >
          <div className="grid grid-cols-2 gap-2">
            <Campo label="Capital investido no negócio" hint="equipamentos, reforma, capital de giro">
              <CampoMoeda value={n.capitalInvestido} onChange={(v) => setN({ ...n, capitalInvestido: v })} />
            </Campo>
            <Campo label="Taxa de retorno alternativa ao mês" hint="ex: CDI do seu banco">
              <div className="flex items-center gap-1">
                <input
                  className={`${CAMPO} font-num`}
                  style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                  type="number"
                  min="0"
                  step="0.1"
                  value={n.taxaRetorno}
                  onChange={(e) => setN({ ...n, taxaRetorno: e.target.value })}
                />
                <span className="text-sm" style={{ color: t.textMuted }}>
                  %
                </span>
              </div>
            </Campo>
          </div>
        </SecaoColapsavel>

        <CopiaSeguranca />

        <div className="flex items-center justify-center py-1">
          <IndicadorAutoSalvar status={statusSalvar} />
        </div>
        <p className="text-[11px] text-center" style={{ color: t.textMuted }}>
          🔒 Seus dados ficam salvos neste dispositivo, sozinho — não precisa de botão.
        </p>
      </div>

      <div className="space-y-4 min-w-0">
        <div className="pop-in rounded-2xl p-5" style={{ backgroundImage: GRADIENTE, color: "#fff" }}>
          <span className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,.85)" }}>
            Resumo do negócio
          </span>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <ResumoItem label="Custo fixo total/mês" valor={fmtBRL(nd.custoFixoTotal)} />
            <ResumoItem label="Custo fixo por hora" valor={fmtBRL(nd.custoFixoPorHora)} />
            <ResumoItem label="Capacidade/mês" valor={`${nd.horasTotais || 0} h`} />
            <ResumoItem label="Imposto sobre preço" valor={fmtPct(nd.impostoPct, 2)} />
            {nd.receitaAluguelCadeiras > 0 && (
              <ResumoItem label="Aluguel de cadeiras recebido" valor={`− ${fmtBRL(nd.receitaAluguelCadeiras)}`} />
            )}
            {nd.comissaoEquipe && <ResumoItem label="Comissão média da equipe" valor={fmtPct(nd.comissaoEquipe.pct)} />}
            {nd.taxaRecebimento && <ResumoItem label="Taxa média de recebimento" valor={fmtPct(nd.taxaRecebimento.pct, 2)} />}
          </div>
          {nd.receitaAluguelCadeiras > 0 && (
            <p className="text-[11px] mt-3" style={{ color: "rgba(255,255,255,.85)" }}>
              O custo fixo por hora já desconta o aluguel recebido: {fmtBRL(nd.custoFixoLiquido)} ÷ {nd.horasTotais || 0} h.
            </p>
          )}
        </div>
        <div className="rounded-2xl p-4 flex gap-2 items-start" style={{ background: t.surfaceAlt, border: `1px dashed ${t.border}` }}>
          <HelpCircle size={16} className="mt-0.5 shrink-0" style={{ color: t.textMuted }} />
          <p className="text-xs" style={{ color: t.textMuted }}>
            Essas configurações valem para o negócio inteiro. Cada serviço que você calcular na aba Calculadora usa esse custo fixo por hora
            e essa alíquota de imposto automaticamente.
          </p>
        </div>
      </div>
      {toastNode}
    </div>
  );
}

function ResumoItem({ label, valor }) {
  return (
    <div>
      <p className="text-[11px]" style={{ color: "rgba(255,255,255,.75)" }}>
        {label}
      </p>
      <p className="font-num font-semibold text-sm mt-0.5">{valor}</p>
    </div>
  );
}

/* ======================================================================= */
/* Aba: Calculadora                                                        */
/* ======================================================================= */
/* Item do catálogo de insumos COMPARTILHADOS (nível negócio) — mesma ideia    */
/* do item de custo variável, só que sem "valor direto" (tem que ser          */
/* quantificável pra poder ser compartilhado) e sem "quanto usa por           */
/* atendimento" (isso agora é decidido em CADA serviço que referenciar).      */
function ItemInsumoCompartilhado({ item, onChange, onRemove }) {
  const t = useT();
  const [caixaAberta, setCaixaAberta] = useState(!!(item.embalagens || item.unidadesPorEmbalagem));
  const modo = item.modo || "duracao";
  const setCampo = (campo, valor) => onChange({ ...item, [campo]: valor });
  const inputEst = { background: t.surface, border: `1px solid ${t.border}`, color: t.text };

  return (
    <div className="rounded-xl p-2.5" style={{ background: t.surfaceAlt }}>
      <div className="flex gap-2 items-center">
        <input
          className={`${CAMPO} min-w-0`}
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
          aria-label="Remover insumo"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="flex gap-1 mt-2 p-0.5 rounded-lg" style={{ background: t.surface, border: `1px solid ${t.border}` }} role="tablist">
        {[
          { id: "duracao", label: "Por duração" },
          { id: "unidade", label: "Por unidade" },
        ].map((m) => (
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
          {N(item.quantidadeComprada) > 0 && (
            <p className="text-[11px]" style={{ color: t.textMuted }}>
              preço unitário:{" "}
              <b className="font-num" style={{ color: t.text }}>
                {fmtBRL(precoUnitarioItem(item))}
              </b>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
