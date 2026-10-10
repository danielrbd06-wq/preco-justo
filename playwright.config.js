// Testes de navegador (Playwright): abrem o app de verdade, já compilado,
// e passam pelas telas como um usuário. Rodam no GitHub a cada Pull Request.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: "http://localhost:4173",
    locale: "pt-BR",
    timezoneId: "America/Bahia",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "celular", use: { ...devices["Pixel 5"], viewport: { width: 375, height: 812 } } },
    { name: "computador", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
  ],
  // Serve o build de produção (dist/). Rode "npm run build" antes.
  webServer: {
    command: "npx vite preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
});
