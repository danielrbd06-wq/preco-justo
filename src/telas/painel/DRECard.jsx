/* Painel: demonstração do resultado (DRE), usada no Painel e no fechamento do mês. */
import { fmtBRL, N } from "../../calculos.js";
import { Selo } from "../../componentes/base.jsx";
import { Ajuda } from "../../componentes/campos.jsx";
import { useT } from "../../tema.js";

/* `origem`: "projecao" (Painel — recalculado ao vivo com a configuração de  */
/* hoje), "real" (Fechamento — números registrados daquele mês, que não    */
/* mudam se a configuração mudar depois) ou "exemplo" (mês ilustrativo do  */
/* botão "carregar exemplo" — nunca pode aparecer como dado real).         */
export function DRECard({ dre, origem = "projecao", mesLabel }) {
  const t = useT();
  // Bloco 11: com parceiros, começa no valor cobrado e desconta a cota-parte.
  const comParceiros = N(dre.cotaParteParceiros) > 0;
  const linhas = [
    ...(comParceiros
      ? [
          { label: "Valor cobrado dos clientes", valor: dre.valorCobrado },
          { label: "(–) Cota-parte repassada aos parceiros", valor: -dre.cotaParteParceiros },
        ]
      : []),
    { label: comParceiros ? "= Receita bruta do salão" : "Receita bruta", valor: dre.receitaBruta, forte: true },
    { label: "(–) Impostos sobre vendas", valor: -dre.impostos },
    { label: "= Receita líquida", valor: dre.receitaLiquida, sub: true },
    { label: "(–) Custos variáveis totais", valor: -dre.custosVariaveisTotais },
    { label: "= Margem de contribuição", valor: dre.margemContribuicaoTotal, sub: true },
    { label: "(–) Custos fixos (incl. pró-labore)", valor: -dre.custosFixos },
    ...(N(dre.aluguelRecebido) > 0 ? [{ label: "(+) Aluguel de cadeiras recebido", valor: dre.aluguelRecebido }] : []),
    { label: "= Resultado operacional", valor: dre.resultadoOperacional, forte: true },
  ];
  return (
    <div className="rounded-2xl p-5" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
      <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
        <p className="text-sm font-semibold" style={{ color: t.text }}>
          {origem !== "projecao" && mesLabel ? `DRE de ${mesLabel}` : "DRE gerencial do mês"}
          <Ajuda
            faq="dre"
            texto="O resultado do mês em ordem: quanto entrou, quanto foi de imposto, de custo de cada atendimento e de conta fixa, e o que sobrou no fim."
          />
        </p>
        {origem === "real" && <Selo tipo="real">dado real{mesLabel ? ` de ${mesLabel}` : ""}</Selo>}
        {origem === "exemplo" && <Selo tipo="aguardando">exemplo ilustrativo, não é dado real</Selo>}
        {origem === "projecao" && <Selo tipo="calculado">projeção com a configuração de hoje</Selo>}
      </div>
      {origem === "real" && (
        <p className="text-[11px] mb-3" style={{ color: t.textMuted }}>
          Números do fechamento que você registrou. Não mudam se você alterar custos, preços ou regime depois.
        </p>
      )}
      {origem === "exemplo" && (
        <p className="text-[11px] mb-3" style={{ color: t.textMuted }}>
          Mês criado pelo botão de exemplo, só para mostrar como o gráfico e o DRE funcionam. Exclua quando registrar seus meses reais.
        </p>
      )}
      {origem === "projecao" && <div className="mb-2" />}
      <div className="space-y-1.5">
        {linhas.map((l) => (
          <div
            key={l.label}
            className="flex items-center justify-between py-1"
            style={{ borderTop: l.sub || l.forte ? `1px solid ${t.border}` : "none" }}
          >
            <span
              className={`text-sm min-w-0 ${l.forte ? "font-semibold" : ""}`}
              style={{ color: l.sub || l.forte ? t.text : t.textMuted }}
            >
              {l.label}
            </span>
            <span
              className={`font-num text-sm shrink-0 whitespace-nowrap pl-3 ${l.forte ? "font-bold" : "font-medium"}`}
              style={{ color: l.valor < 0 && !l.forte && !l.sub ? t.danger : t.text }}
            >
              {fmtBRL(l.valor)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
