// Fluxo principal do app no navegador: primeiro acesso, dados de exemplo e
// cada aba abrindo sem erro e sem rolagem para o lado.
import { test, expect } from "@playwright/test";
import { primeiroAcesso } from "./ajuda.js";
import * as XLSX from "xlsx";
import { readFileSync } from "node:fs";


// Valores em reais saem com espaço não separável (R$ 1,00); \s cobre os dois.
const reais = (valor) => new RegExp(`R\\$\\s${valor.replace(/\./g, "\\.")}`);
const visivel = (page, texto) => page.getByText(texto).filter({ visible: true }).first();

const irPara = (page, aba) => page.getByRole("button", { name: aba }).first().click();

async function semRolagemLateral(page) {
  const sobra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(sobra).toBeLessThanOrEqual(0);
}

test.beforeEach(async ({ page }) => {
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  page.erros = erros;
});

test.afterEach(async ({ page }) => {
  expect(page.erros, "erros de JavaScript na página").toEqual([]);
});

test("exemplo carregado: Painel mostra o DRE e os pontos de equilíbrio certos", async ({ page }) => {
  await primeiroAcesso(page);
  await irPara(page, "Painel");
  await expect(visivel(page, reais("8.998,96"))).toBeVisible(); // receita bruta
  await expect(visivel(page, reais("258,37"))).toBeVisible(); // resultado operacional
  await expect(visivel(page, reais("8.390,05"))).toBeVisible(); // ponto de equilíbrio contábil
  await semRolagemLateral(page);
});

test("todas as abas abrem sem erro e sem rolagem lateral", async ({ page }) => {
  await primeiroAcesso(page);
  for (const aba of ["Negócio", "Calculadora", "Painel", "Estoque", /Observat/, "FAQ"]) {
    await irPara(page, aba);
    await page.waitForTimeout(600);
    await semRolagemLateral(page);
  }
});

test("Calculadora: serviço salvo do exemplo mantém o preço", async ({ page }) => {
  await primeiroAcesso(page);
  await irPara(page, "Calculadora");
  await expect(page.getByText("Corte Masculino").first()).toBeVisible();
  await expect(visivel(page, reais("20,22"))).toBeVisible();
});

test("Observatório: o mapa carrega e a comparação aparece com um preço anotado", async ({ page }) => {
  await primeiroAcesso(page);
  await irPara(page, /Observat/);
  const mapa = page.locator(".mapa-concorrencia.leaflet-container");
  await expect(mapa).toBeVisible();
  await expect(page.locator(".leaflet-control-attribution")).toContainText("OpenStreetMap");
  await page.getByRole("button", { name: "Adicionar concorrente sem marcar no mapa" }).click();
  await page.getByPlaceholder("ex.: Barbearia do Zé").fill("Barbearia Teste");
  await page.getByRole("button", { name: "Salvar concorrente" }).click();
  await page.getByRole("button", { name: "anotar preço" }).click();
  await page.getByRole("combobox").filter({ hasText: "Corte Masculino" }).first().selectOption({ label: "Corte Masculino" });
  const preco = page.locator("xpath=//span[normalize-space(.)='Preço cobrado']/ancestor::label[1]//input");
  await preco.fill("25");
  await page.getByRole("button", { name: "Salvar preço" }).click();
  await expect(visivel(page, /abaixo da mediana de 1 concorrente: R\$\s25,00/)).toBeVisible();
  await expect(visivel(page, /Seu piso, sem lucro, é R\$\s11,93/)).toBeVisible();

  // Bloco 10: planilha do Observatório
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Baixar planilha (Excel)" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^preco-justo-observatorio-\d{4}-\d{2}-\d{2}\.xlsx$/);
  const wb = XLSX.read(readFileSync(await download.path()));
  expect(wb.SheetNames).toEqual(["Sobre", "Concorrentes", "Preços anotados", "Comparação de preços"]);
  const comparacao = XLSX.utils.sheet_to_json(wb.Sheets["Comparação de preços"], { header: 1 });
  expect(comparacao[1].slice(0, 2)).toEqual(["Feira de Santana", "Corte Masculino"]);
  expect(comparacao[1][6]).toBe(25); // mediana
  expect(comparacao[1][9]).toBe("abaixo do concorrente");
});
