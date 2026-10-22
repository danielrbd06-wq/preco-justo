import { lazy, Suspense } from "react";
import { fmtPct } from "../calculos.js";
import { useT } from "../tema.js";

/* Decomposição visual do preço em gráfico de rosca — 4 fatias grandes e     */
/* legíveis (não as 6 categorias detalhadas do motor de cálculo) porque num  */
/* gráfico pequeno de celular, mais fatia fina só atrapalha a leitura.       */
/* O desenho chega sob demanda (Bloco 21); até lá, um anel de carregamento   */
/* do mesmo tamanho ocupa o lugar, sem a tela pular.                         */
const RoscaPizza = lazy(() => import("./RoscaPizza.jsx"));

function AnelCarregando() {
  const furo = "radial-gradient(circle, transparent 29px, #000 30px)";
  return (
    <div
      className="skeleton-shimmer"
      aria-hidden="true"
      style={{ width: 104, height: 104, margin: 2, borderRadius: "50%", mask: furo, WebkitMask: furo }}
    />
  );
}

export function GraficoRoscaPreco({ materiais, custoFixo, taxas, lucro, preco }) {
  const t = useT();
  const dados = [
    { name: "Materiais", value: materiais, color: t.secondary },
    { name: "Custo fixo", value: custoFixo, color: t.textMuted },
    { name: "Taxas e impostos", value: taxas, color: t.warning },
    { name: "Lucro líquido", value: lucro, color: t.success },
  ].filter((d) => d.value > 0.005);

  if (preco <= 0 || dados.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      <div style={{ width: 108, height: 108, flexShrink: 0 }}>
        <Suspense fallback={<AnelCarregando />}>
          <RoscaPizza dados={dados} />
        </Suspense>
      </div>
      <div className="flex-1 space-y-1">
        {dados.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-[11px]">
            <span style={{ width: 8, height: 8, borderRadius: 99, background: d.color, flexShrink: 0 }} />
            <span className="flex-1" style={{ color: t.textMuted }}>
              {d.name}
            </span>
            <span className="font-num font-medium" style={{ color: t.text }}>
              {fmtPct((d.value / preco) * 100)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
