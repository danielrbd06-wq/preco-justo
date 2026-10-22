// Bloco 21: a primeira tela abre sem os gráficos e sem as abas que o usuário
// ainda não escolheu; cada aba chega no clique, e a rosca do preço aparece
// quando a biblioteca de gráficos termina de chegar.
import { expect, test } from "@playwright/test";
import { aceitarTermos } from "./ajuda.js";

// Sem service worker: ele baixaria tudo de uma vez para uso offline e
// esconderia o que a página pede de fato.
test.use({ serviceWorkers: "block" });

const irPara = (page, aba) => page.getByRole("button", { name: aba }).first().click();

function arquivosPedidos(page) {
  const lista = [];
  page.on("request", (r) => {
    const caminho = new URL(r.url()).pathname;
    if (caminho.endsWith(".js")) lista.push(caminho.split("/").pop());
  });
  return lista;
}
const pediu = (lista, nome) => lista.some((arquivo) => arquivo.startsWith(`${nome}-`));

test("primeira tela sem gráficos; cada aba chega quando é escolhida", async ({ page }) => {
  const js = arquivosPedidos(page);
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));

  await page.goto("/");
  await aceitarTermos(page);
  const campos = page.locator("input");
  await campos.nth(0).fill("Maria Teste");
  await campos.nth(1).fill("Salão da Maria");
  for (const opcao of ["Salão de Cabeleireiro", "Autônomo(a), sozinho(a)", null]) {
    await page.getByRole("button", { name: "Continuar" }).click();
    if (opcao) await page.getByText(opcao, { exact: true }).click();
  }
  await page.getByRole("button", { name: "Confirmar e ir pros custos fixos" }).click();
  await expect(page.getByRole("button", { name: "Carregar exemplo" })).toBeVisible();

  for (const nome of ["graficos", "Painel", "Estoque", "Observatorio", "Faq", "xlsx"]) {
    expect(pediu(js, nome), `${nome} não deveria vir na primeira tela`).toBe(false);
  }

  await page.getByRole("button", { name: "Carregar exemplo" }).click();
  await irPara(page, "Painel");
  await expect(
    page
      .getByText(/R\$\s8\.998,96/)
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  expect(pediu(js, "Painel")).toBe(true);

  // Rosca do preço: a legenda vem junto; o desenho, com a biblioteca de gráficos.
  await page.getByRole("button", { name: "ver decomposição do preço" }).first().click();
  await expect(page.getByText("Lucro líquido").filter({ visible: true }).first()).toBeVisible();
  await expect(page.locator(".recharts-pie").first()).toBeVisible();
  expect(pediu(js, "graficos")).toBe(true);

  for (const [aba, nome, texto] of [
    ["Estoque", "Estoque", /Produtos para revenda/],
    [/Observat/, "Observatorio", /concorr/i],
    ["FAQ", "Faq", /Privacidade e termos/],
  ]) {
    expect(pediu(js, nome), `${nome} antes do clique`).toBe(false);
    await irPara(page, aba);
    await expect(page.getByText(texto).filter({ visible: true }).first()).toBeVisible();
    expect(pediu(js, nome), `${nome} depois do clique`).toBe(true);
  }
  expect(erros, "erros de JavaScript na página").toEqual([]);
});
