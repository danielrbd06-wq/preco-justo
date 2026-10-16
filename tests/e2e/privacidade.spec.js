// Termos de Uso e Aviso de Privacidade (Bloco 12): aceite obrigatório na
// primeira abertura, leitura dos textos, novo aceite quando a versão muda e
// "Apagar todos os dados deste aparelho".
import { test, expect } from "@playwright/test";
import { primeiroAcesso, aceitarTermos } from "./ajuda.js";

const dialogoAceite = (page) => page.getByRole("dialog", { name: "Antes de começar" });
const caixaAceite = (page) => page.getByLabel("Li e aceito os Termos de Uso e estou ciente do Aviso de Privacidade.");

test.beforeEach(async ({ page }) => {
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  page.erros = erros;
});

test.afterEach(async ({ page }) => {
  expect(page.erros, "erros de JavaScript na página").toEqual([]);
});

test("aceite: só libera com a caixa marcada, permite ler os textos e é lembrado", async ({ page }) => {
  await page.goto("/");
  await expect(dialogoAceite(page)).toBeVisible();
  const botao = page.getByRole("button", { name: "Aceitar e continuar" });
  await expect(botao).toBeDisabled();

  // Esc não fecha a tela de aceite.
  await page.keyboard.press("Escape");
  await expect(dialogoAceite(page)).toBeVisible();

  // Lê os dois documentos e volta.
  await page.getByRole("button", { name: "Ler os Termos de Uso" }).click();
  const termos = page.getByRole("dialog", { name: "Termos de Uso" });
  await expect(termos.getByText("5. Os cálculos são estimativas")).toBeVisible();
  await termos.getByRole("button", { name: "Voltar" }).click();
  await expect(termos).toBeHidden();
  await page.getByRole("button", { name: "Ler o Aviso de Privacidade" }).click();
  const aviso = page.getByRole("dialog", { name: "Aviso de Privacidade" });
  await expect(aviso.getByText("3. Serviços de terceiros")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(aviso).toBeHidden();
  await expect(dialogoAceite(page)).toBeVisible();

  await caixaAceite(page).check();
  await expect(botao).toBeEnabled();
  await botao.click();
  await expect(dialogoAceite(page)).toBeHidden();
  await expect(page.getByText("Vamos te conhecer rapidinho")).toBeVisible();

  // Depois de recarregar, não pede de novo.
  await page.reload();
  await expect(page.getByText("Vamos te conhecer rapidinho")).toBeVisible();
  await page.waitForTimeout(500);
  await expect(dialogoAceite(page)).toHaveCount(0);
});

test("versão nova dos termos pede o aceite de novo", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.setItem("preco-justo:aceite-termos", JSON.stringify({ versao: "0.0", aceitoEm: "2026-01-01T12:00:00.000Z" })));
  await page.reload();
  await expect(dialogoAceite(page)).toBeVisible();
  await expect(dialogoAceite(page).getByText("Os termos foram atualizados")).toBeVisible();
  await aceitarTermos(page);
});

test("FAQ: Privacidade e termos mostra o aceite e apaga todos os dados do aparelho", async ({ page }) => {
  await primeiroAcesso(page);
  await page.getByRole("button", { name: "FAQ" }).first().click();
  const cartao = page.locator("#privacidade-e-termos");
  await cartao.scrollIntoViewIfNeeded();
  await expect(cartao.getByText(/Você aceitou a versão 0\.1 \(preliminar\) em \d{2}\/\d{2}\/\d{4}\./)).toBeVisible();

  await cartao.getByRole("button", { name: "Aviso de Privacidade" }).click();
  await expect(page.getByRole("dialog", { name: "Aviso de Privacidade" })).toBeVisible();
  await page.getByRole("button", { name: "Fechar Aviso de Privacidade" }).click();
  await expect(page.getByRole("dialog", { name: "Aviso de Privacidade" })).toBeHidden();

  // Cancelar não apaga nada.
  await cartao.getByRole("button", { name: "Apagar todos os dados deste aparelho" }).click();
  await cartao.getByRole("button", { name: "Cancelar" }).click();
  await expect(cartao.getByRole("button", { name: "Apagar todos os dados deste aparelho" })).toBeVisible();

  // Baixa a cópia antes e depois apaga.
  await cartao.getByRole("button", { name: "Apagar todos os dados deste aparelho" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    cartao.getByRole("button", { name: "Baixar cópia antes" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^preco-justo-copia-\d{4}-\d{2}-\d{2}\.json$/);
  await expect(cartao.getByRole("button", { name: "Cópia baixada" })).toBeVisible();

  await Promise.all([page.waitForEvent("load"), cartao.getByRole("button", { name: "Sim, apagar tudo" }).click()]);
  await expect(dialogoAceite(page)).toBeVisible();
  const restantes = await page.evaluate(() => Object.keys(window.localStorage).filter((k) => k.startsWith("preco-justo:")));
  expect(restantes).toEqual([]);
  await aceitarTermos(page);
  await expect(page.getByText("Vamos te conhecer rapidinho")).toBeVisible();
});
