// Passos comuns dos testes de navegador.
import { expect } from "@playwright/test";

// Tela de aceite dos termos (Bloco 12): aparece antes de tudo na primeira abertura.
export async function aceitarTermos(page) {
  await expect(page.getByRole("dialog", { name: "Antes de começar" })).toBeVisible();
  await page.getByLabel("Li e aceito os Termos de Uso e estou ciente do Aviso de Privacidade.").check();
  await page.getByRole("button", { name: "Aceitar e continuar" }).click();
  await expect(page.getByRole("dialog", { name: "Antes de começar" })).toBeHidden();
}

// Primeiro acesso: perfil de um salão em Feira de Santana e "Carregar exemplo".
export async function primeiroAcesso(page) {
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
  await page.getByRole("button", { name: "Carregar exemplo" }).click();
}
