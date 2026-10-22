import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Build de arquivo único (app.html) — para apresentação/teste local sem servidor.
// Não registra service worker; ícones continuam referenciados como arquivos ao lado.
// O arquivo único não tem service worker: o aviso de nova versão recebe uma versão
// vazia do registro, que nunca avisa nada.
const semServiceWorker = {
  name: "sem-service-worker",
  resolveId(id) {
    return id === "virtual:pwa-register/react" ? "\0sem-sw" : null;
  },
  load(id) {
    if (id !== "\0sem-sw") return null;
    return "export function useRegisterSW() { return { needRefresh: [false, () => {}], offlineReady: [false, () => {}], updateServiceWorker: () => {} }; }";
  },
};

export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile(), semServiceWorker],
  build: {
    outDir: "dist-single",
    copyPublicDir: false,
    // Arquivo único: o Excel carregado sob demanda (Bloco 18) entra junto, sem arquivo à parte.
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
