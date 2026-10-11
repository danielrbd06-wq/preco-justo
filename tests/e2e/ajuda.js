// Passos comuns dos testes de navegador.

// Primeiro acesso: perfil de um salão em Feira de Santana e "Carregar exemplo".
export async function primeiroAcesso(page) {
  await page.goto("/");
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
