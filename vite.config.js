import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Build padrão (PWA multiarquivo) — é o que a Vercel publica a partir da pasta dist/.
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      // Bloco 9: "prompt" em vez de "autoUpdate". A versão nova é baixada em segundo
      // plano e o app mostra "Nova versão disponível"; quem decide a hora de trocar é
      // a pessoa (componente AvisoNovaVersao, via virtual:pwa-register/react).
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["favicon-32.png", "apple-touch-icon.png"],
      // Bloco 14: a fonte (woff2) entra no cache para o app funcionar offline com a letra certa.
      workbox: { globPatterns: ["**/*.{js,wasm,css,html,woff2}"] },
      manifest: {
        name: "Preço Justo — Precificação e Gestão",
        short_name: "Preço Justo",
        description: "Precificação e gestão gerencial para salões de beleza e barbearias.",
        lang: "pt-BR",
        start_url: "./",
        scope: "./",
        display: "standalone",
        background_color: "#F5F7FA",
        theme_color: "#7861FF",
        categories: ["business", "finance", "productivity"],
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  // Bloco 18: bibliotecas em arquivos próprios. Numa versão nova do app, quem já
  // instalou baixa só o que mudou (o código do app), não React e gráficos de novo.
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react";
          if (
            /node_modules\/(recharts|d3-[a-z-]+|victory-vendor|lodash|react-smooth|recharts-scale|decimal\.js-light|eventemitter3|internmap|fast-equals|tiny-invariant|clsx)\//.test(
              id,
            )
          )
            return "graficos";
          return undefined;
        },
      },
    },
  },
  // Testes unitários (Vitest). Os testes de navegador ficam em tests/e2e (Playwright).
  test: {
    include: ["src/**/*.test.js"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/calculos.js", "src/copiaSeguranca.js", "src/termos.js"],
      reporter: ["text", "text-summary"],
      // Piso de cobertura: uma conta nova sem teste derruba a verificação.
      thresholds: { lines: 95, functions: 90, branches: 85 }, // Bloco 15: subiu e passou a valer para ramos
    },
  },
});
