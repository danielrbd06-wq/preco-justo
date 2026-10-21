// Bloco 11: Lei do Salão-Parceiro. Com a cota-parte de um parceiro válido, o
// imposto e a taxa entram só sobre a parte do salão, e o DRE desconta a cota.
import { expect, test } from "@playwright/test";
import { primeiroAcesso } from "./ajuda.js";

test("cota-parte de parceiro baixa o preço e aparece no DRE", async ({ page }) => {
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  await primeiroAcesso(page);
  // Sem parceiros, o Painel não mostra a equivalência em valor cobrado (Bloco 16).
  await page.getByRole("button", { name: "Painel" }).first().click();
  await expect(
    page
      .getByText(/Ponto de equilíbrio: quanto faturar por mês/)
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(page.getByText("= Receita bruta do salão").filter({ visible: true })).toHaveCount(0);
  await expect(page.getByText(/≈ R\$\s[\d.,]+ cobrados/)).toHaveCount(0);
  // Parceira válida (CNPJ e contrato homologado) cadastrada direto nos dados do app.
  await page.evaluate(() => {
    const chave = Object.keys(localStorage).find((k) => k.endsWith("negocio:config"));
    const n = JSON.parse(localStorage.getItem(chave));
    n.profissionais = [
      {
        id: "ana",
        nome: "Ana",
        ativo: true,
        vinculo: "parceiro",
        comissaoPct: "40",
        atendimentosMes: "80",
        temCnpj: true,
        contratoHomologado: true,
      },
      { id: "bia", nome: "Bia", ativo: true, vinculo: "comissao", comissaoPct: "30", atendimentosMes: "60" },
    ];
    localStorage.setItem(chave, JSON.stringify(n));
  });
  await page.reload();
  await page.waitForTimeout(1000);

  await page.getByRole("button", { name: "Calculadora" }).first().click();
  await page.getByText("Corte Masculino").first().click();
  await expect(
    page
      .getByText(/R\$\s20,22/)
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await page.getByLabel(/Esta comissão é a cota-parte/).check();
  // (R$ 3,00 + 0,5 h × R$ 8,56) ÷ (1 − 30% − 3% × 70% − 6% × 70% − 25%) = R$ 18,81
  await expect(
    page
      .getByText(/R\$\s18,81/)
      .filter({ visible: true })
      .first(),
  ).toBeVisible();

  await page.waitForTimeout(1500); // salvamento automático da edição
  await page.getByRole("button", { name: "Painel" }).first().click();
  await expect(page.getByText("(–) Cota-parte repassada aos parceiros").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("= Receita bruta do salão").filter({ visible: true }).first()).toBeVisible();

  // Bloco 16 (opção C): pontos de equilíbrio na receita do salão, com o equivalente em valor cobrado.
  await expect(
    page
      .getByText(/Com parceiros, os valores são da receita do salão/)
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(page.getByText(/≈ R\$\s[\d.,]+ cobrados/).filter({ visible: true })).toHaveCount(3);
  expect(erros).toEqual([]);
});
