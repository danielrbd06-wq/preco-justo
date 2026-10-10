import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Build de arquivo único (app.html) — para apresentação/teste local sem servidor.
// Não registra service worker; ícones continuam referenciados como arquivos ao lado.
export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: "dist-single",
    copyPublicDir: false,
  },
});
