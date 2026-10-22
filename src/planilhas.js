/* Excel carregado só quando o usuário pede (Bloco 18) e as abas do Observatório
   que entram nas planilhas do Painel e do Observatório. */
import { lerComFallback } from "./armazenamento.js";

/* Bloco 18: a biblioteca do Excel (a maior do app) só é baixada quando a pessoa */
/* pede uma planilha. O service worker do PWA a guarda depois, para uso offline. */
/* A desestruturação direta deixa o build levar só as partes usadas da biblioteca. */
export async function carregarXLSX() {
  const { utils, writeFile } = await import("xlsx");
  return { utils, writeFile };
}

export function lerJSON(texto, padrao) {
  try {
    const v = JSON.parse(texto);
    return v ?? padrao;
  } catch {
    return padrao;
  }
}

/* Planilha do Observatório (Bloco 10): concorrentes, preços anotados e a     */
/* comparação, em abas próprias. Usada pelo botão do Observatório e pelo     */
/* relatório completo do Painel. As linhas vêm de linhasPlanilhaObservatorio */
/* (calculos.js, testada), com as mesmas regras da tela.                     */
export async function lerDadosObservatorio() {
  const [c, l] = await Promise.all([lerComFallback("observatorio:concorrentes"), lerComFallback("observatorio:meus-locais")]);
  const concorrentes = lerJSON(c, []);
  const meusLocais = lerJSON(l, {});
  return {
    concorrentes: Array.isArray(concorrentes) ? concorrentes : [],
    meusLocais: meusLocais && typeof meusLocais === "object" ? meusLocais : {},
  };
}
export function anexarAbasObservatorio(XLSX, wb, linhas) {
  const abas = [
    ["concorrentes", "Concorrentes", [18, 30, 11, 18, 14, 10, 11, 11]],
    ["precos", "Preços anotados", [18, 30, 24, 12, 11, 12, 20, 12]],
    ["comparacao", "Comparação de preços", [18, 24, 13, 15, 12, 11, 12, 11, 14, 22, 14]],
  ];
  abas.forEach(([chave, nome, larguras]) => {
    const ws = XLSX.utils.aoa_to_sheet(linhas[chave]);
    ws["!cols"] = larguras.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, nome);
  });
}
