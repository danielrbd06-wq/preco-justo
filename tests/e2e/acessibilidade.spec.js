// Bloco 20: acessibilidade automática (axe-core, regras WCAG 2.1 A e AA) nas telas
// principais, nos temas claro e escuro. Qualquer violação nova derruba o teste.
// Fora da verificação, com motivo:
//  - [data-logotipo]: o logotipo usa as cores da marca; logotipos são exceção da
//    regra de contraste (WCAG 1.4.3);
//  - .leaflet-container: o mapa e seus controles vêm do Leaflet/OpenStreetMap.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { aceitarTermos, primeiroAcesso } from "./ajuda.js";

const irPara = (page, aba) => page.getByRole("button", { name: aba }).first().click();

async function semViolacoes(page, tela) {
  await page.waitForTimeout(500); // animações de entrada terminam
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude("[data-logotipo]")
    .exclude(".leaflet-container")
    .analyze();
  const resumo = r.violations.map((v) => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  expect(resumo, `violações de acessibilidade em "${tela}"`).toEqual([]);
}

for (const tema of ["light", "dark"]) {
  test.describe(`tema ${tema === "light" ? "claro" : "escuro"}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: tema });
    });

    test("aceite, termos e primeiro acesso", async ({ page }) => {
      await page.goto("/");
      await semViolacoes(page, "tela de aceite");
      await page.getByRole("button", { name: "Ler o Aviso de Privacidade" }).click();
      await semViolacoes(page, "aviso de privacidade");
      await page.keyboard.press("Escape");
      await aceitarTermos(page);
      await semViolacoes(page, "assistente do primeiro acesso");
    });

    test("todas as abas com o exemplo carregado", async ({ page }) => {
      await primeiroAcesso(page);
      for (const aba of ["Negócio", "Calculadora", "Painel", "Estoque", /Observat/, "FAQ"]) {
        await irPara(page, aba);
        await page.waitForTimeout(500);
        await semViolacoes(page, `aba ${aba}`);
      }
    });

    test("formulários e seções abertas", async ({ page }) => {
      await primeiroAcesso(page);
      await irPara(page, "Calculadora");
      await page.getByRole("button", { name: "Novo serviço" }).first().click();
      await semViolacoes(page, "serviço novo");
      await irPara(page, "Painel");
      await page.getByRole("button", { name: "Evolução e comparativos" }).click();
      await semViolacoes(page, "Painel com Evolução aberta");
      await irPara(page, "Negócio");
      for (const secao of ["Profissionais", "Regime tributário", "Cópia de segurança"]) {
        // Clique no começo do cabeçalho: no meio pode estar o "?" da seção.
        await page
          .getByRole("button", { name: new RegExp(`^${secao}`) })
          .first()
          .click({ position: { x: 16, y: 12 } });
      }
      await semViolacoes(page, "Negócio com seções abertas");
      await irPara(page, "FAQ");
      await page.getByRole("button", { name: "Apagar todos os dados deste aparelho" }).click();
      await semViolacoes(page, "FAQ com confirmação de apagar");
    });
  });
}
