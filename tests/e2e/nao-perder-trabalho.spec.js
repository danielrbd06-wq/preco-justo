// Bloco 9: o que foi digitado não se perde ao trocar de aba ou recarregar, e a
// cópia de segurança leva os dados de volta depois de apagados.

import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { aceitarTermos, primeiroAcesso } from "./ajuda.js";

const irPara = (page, aba) => page.getByRole("button", { name: aba }).first().click();
const abrirSecao = async (page, titulo) => {
  const botao = page.getByRole("button", { name: new RegExp(`^${titulo}`) }).first();
  if ((await botao.getAttribute("aria-expanded")) === "false") await botao.click({ position: { x: 16, y: 12 } });
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
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Baixar cópia" }).click()]);
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
  await expect(
    page
      .getByText(/R\$\s8\.998,96/)
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
});

// Bloco 13: rascunho nos formulários do Estoque e do Observatório.
test("Estoque: produto novo e movimentação pela metade voltam depois de trocar de aba", async ({ page }) => {
  await primeiroAcesso(page);
  await irPara(page, "Estoque");
  await page.getByRole("button", { name: "novo produto" }).click();
  const nome = page.getByPlaceholder("ex: Pomada modeladora");
  await nome.fill("Pomada teste");
  await irPara(page, "FAQ");
  await irPara(page, "Estoque");
  await expect(page.getByText("Recuperamos o que você estava digitando")).toBeVisible();
  await expect(nome).toHaveValue("Pomada teste");
  const preco = page.locator("xpath=//*[normalize-space(text())='Preço de venda']/following::input[1]");
  await preco.click();
  await preco.press("Control+a");
  await preco.pressSequentially("30");
  await page.getByRole("button", { name: "Salvar produto" }).click();
  await expect(page.getByText("Recuperamos o que você estava digitando")).toBeHidden();

  // Movimentação
  await page
    .getByRole("button", { name: /Movimentar/ })
    .first()
    .click();
  const observacao = page.getByPlaceholder("ex: NF 1234, fornecedor X");
  await observacao.fill("NF 99");
  await page.reload();
  await page.waitForTimeout(1000); // o app termina de carregar e abre a aba inicial
  await irPara(page, "Estoque");
  await expect(observacao).toHaveValue("NF 99");
  await page.getByRole("button", { name: "Cancelar" }).click();
  await page.reload();
  await page.waitForTimeout(1000);
  await irPara(page, "Estoque");
  await page.waitForTimeout(500);
  await expect(observacao).toHaveCount(0);
});

test("Observatório: concorrente e preço pela metade voltam depois de trocar de aba", async ({ page }) => {
  await primeiroAcesso(page);
  await irPara(page, /Observat/);
  await page.getByRole("button", { name: "Adicionar concorrente sem marcar no mapa" }).click();
  const nome = page.getByPlaceholder("ex.: Barbearia do Zé");
  await nome.fill("Barbearia Rascunho");
  await irPara(page, "Painel");
  await irPara(page, /Observat/);
  await expect(page.getByText("Recuperamos o que você estava digitando")).toBeVisible();
  await expect(nome).toHaveValue("Barbearia Rascunho");
  await page.getByRole("button", { name: "Salvar concorrente" }).click();

  await page.getByRole("button", { name: "anotar preço" }).click();
  const preco = page.locator("xpath=//span[normalize-space(.)='Preço cobrado']/ancestor::label[1]//input");
  await preco.click();
  await preco.pressSequentially("27");
  await preco.blur();
  await irPara(page, "Painel");
  await irPara(page, /Observat/);
  await expect(page.getByText("Recuperamos o que você estava digitando")).toBeVisible();
  await expect(preco).toHaveValue(/27,00/);
  await page.getByRole("button", { name: "Salvar preço" }).click();
  await expect(page.getByText("Recuperamos o que você estava digitando")).toBeHidden();
});

test("Fechamento do mês: depois de salvar, lembra de baixar a cópia de segurança", async ({ page }) => {
  await primeiroAcesso(page);
  await irPara(page, "Painel");
  await abrirSecao(page, "Fechamento mensal");
  await page.getByRole("button", { name: "Fechar agora" }).click();
  const detalhar = page.getByRole("button", { name: /^detalhar por serviço/ });
  if (await detalhar.count()) {
    const faturamento = page.locator("xpath=//span[starts-with(normalize-space(.),'Faturamento bruto do mês')]/ancestor::label[1]//input");
    await faturamento.click();
    await faturamento.pressSequentially("9000");
    const atendimentos = page.locator(
      "xpath=//span[starts-with(normalize-space(.),'Atendimentos realizados no mês')]/ancestor::label[1]//input",
    );
    await atendimentos.fill("150");
  } else {
    const quantidades = page.locator("xpath=//*[normalize-space(text())='Quantidade']/following::input[1]");
    await quantidades.first().fill("100");
  }
  await page.getByRole("button", { name: "Salvar fechamento" }).click();
  await expect(page.getByText("Fechamento salvo. Que tal guardar uma cópia?")).toBeVisible();
  await expect(page.getByText("Você ainda não baixou nenhuma cópia.")).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Baixar cópia agora" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^preco-justo-copia-\d{4}-\d{2}-\d{2}\.json$/);
  await expect(page.getByRole("button", { name: "Cópia baixada" })).toBeVisible();
  await expect(page.getByText("Fechamento salvo. Que tal guardar uma cópia?")).toBeHidden({ timeout: 5000 });
});

// Bloco 17: o rascunho do fechamento usa o mesmo hook dos outros formulários.
test("Fechamento do mês: o que foi digitado volta depois de trocar de aba, e cancelar apaga", async ({ page }) => {
  await primeiroAcesso(page);
  await irPara(page, "Painel");
  await abrirSecao(page, "Fechamento mensal");
  await page.getByRole("button", { name: "Fechar agora" }).click();
  const observacoes = page.locator(
    "xpath=//span[starts-with(normalize-space(.),'Observações (opcional)')]/ancestor::label[1]//*[self::input or self::textarea]",
  );
  await observacoes.fill("Mês com feriado");
  await irPara(page, "FAQ");
  await irPara(page, "Painel");
  await expect(page.getByText("Recuperamos o que você tinha digitado neste fechamento")).toBeVisible();
  await expect(observacoes).toHaveValue("Mês com feriado");
  await page.getByRole("button", { name: "Cancelar" }).first().click();
  await page.reload();
  await page.waitForTimeout(1000);
  await irPara(page, "Painel");
  await abrirSecao(page, "Fechamento mensal");
  await expect(page.getByText("Recuperamos o que você tinha digitado neste fechamento")).toHaveCount(0);
  await expect(observacoes).toHaveCount(0);
});
