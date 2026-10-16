// Bloco 9: o que foi digitado não se perde ao trocar de aba ou recarregar, e a
// cópia de segurança leva os dados de volta depois de apagados.
import { test, expect } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { primeiroAcesso, aceitarTermos } from "./ajuda.js";

const irPara = (page, aba) => page.getByRole("button", { name: aba }).first().click();
const abrirSecao = async (page, titulo) => {
  const botao = page.getByRole("button").filter({ hasText: titulo }).first();
  if ((await botao.getAttribute("aria-expanded")) === "false") await botao.click();
};

test.beforeEach(async ({ page }) => {
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  page.erros = erros;
});
test.afterEach(async ({ page }) => {
  expect(page.erros, "erros de JavaScript na página").toEqual([]);
});

test("Negócio: valor digitado é salvo mesmo trocando de aba na hora", async ({ page }) => {
  await primeiroAcesso(page);
  await irPara(page, "Negócio");
  await abrirSecao(page, "Pró-labore do dono");
  const campo = page.locator("xpath=//span[contains(.,'Quanto você retira do negócio')]/ancestor::label[1]//input");
  await campo.click();
  await campo.press("ControlOrMeta+a");
  await campo.pressSequentially("3000");
  await irPara(page, "Painel"); // antes da pausa de 1,2 s do auto-salvar
  await irPara(page, "Negócio");
  await expect(page.getByText(/R\$\s4\.360,00/).first()).toBeVisible(); // custo fixo: 1.360 de contas + 3.000 de pró-labore
});

test("Calculadora: serviço novo pela metade volta depois de trocar de aba e de recarregar", async ({ page }) => {
  await primeiroAcesso(page);
  await irPara(page, "Calculadora");
  await page.getByRole("button", { name: "Novo serviço" }).first().click();
  const nome = page.locator("xpath=//*[normalize-space(text())='Nome do serviço']/following::input[1]");
  await nome.fill("Hidratação teste");
  await irPara(page, "Painel");
  await irPara(page, "Calculadora");
  await expect(page.getByText("Recuperamos o serviço que você estava criando")).toBeVisible();
  await expect(nome).toHaveValue("Hidratação teste");
  await page.reload();
  await irPara(page, "Calculadora");
  await expect(nome).toHaveValue("Hidratação teste");
  // "Começar de novo" descarta o rascunho
  await page.getByRole("button", { name: "Começar de novo" }).click();
  await expect(nome).toHaveValue("");
});

test("Cópia de segurança: baixar, apagar tudo e restaurar no primeiro acesso", async ({ page }, info) => {
  await primeiroAcesso(page);
  await irPara(page, "Negócio");
  await abrirSecao(page, "Cópia de segurança");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Baixar cópia" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^preco-justo-copia-\d{4}-\d{2}-\d{2}\.json$/);
  // Caminho só com letras sem acento (o nome do teste tem "ó").
  const arquivo = join(tmpdir(), `preco-justo-copia-${info.project.name}-${Date.now()}.json`);
  await download.saveAs(arquivo);

  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await aceitarTermos(page);
  await expect(page.getByText("Vamos te conhecer rapidinho")).toBeVisible();
  await page.waitForTimeout(1000); // o app termina de carregar (troca o esqueleto pela tela)

  await page.getByLabel("Arquivo da cópia de segurança").setInputFiles(arquivo);
  await expect(page.getByText(/Contém: negócio configurado, 3 serviços/)).toBeVisible();
  // Restaurar recarrega a página sozinho.
  await Promise.all([page.waitForEvent("load"), page.getByRole("button", { name: "Sim, restaurar" }).click()]);
  await page.waitForTimeout(1000);
  await irPara(page, "Painel");
  await expect(page.getByText(/R\$\s8\.998,96/).filter({ visible: true }).first()).toBeVisible();
});
