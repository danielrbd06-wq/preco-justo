// Orçamento de tamanho (Bloco 18): roda depois de "npm run build" e falha se o
// app ficar pesado demais para abrir bem no celular com internet fraca.
// Tamanhos medidos já compactados (gzip), como o navegador recebe.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const LIMITES_KB = {
  inicial: 270, // o que a primeira tela precisa: JS de entrada, pré-carregados e CSS
  maiorArquivo: 130, // nenhum arquivo isolado acima disto
  total: 450, // tudo o que o app pode baixar, inclusive o que é carregado depois
};

const dist = "dist";
const assets = join(dist, "assets");
const kb = (arquivo) => gzipSync(readFileSync(join(assets, arquivo))).length / 1024;

const html = readFileSync(join(dist, "index.html"), "utf8");
const iniciais = new Set([...html.matchAll(/(?:src|href)="\.\/assets\/([^"]+\.(?:js|css))"/g)].map((m) => m[1]));
const arquivos = readdirSync(assets).filter((f) => /\.(js|css)$/.test(f));
const tamanhos = arquivos.map((f) => ({ arquivo: f, kb: kb(f), inicial: iniciais.has(f) })).sort((a, b) => b.kb - a.kb);

const inicial = tamanhos.filter((t) => t.inicial).reduce((s, t) => s + t.kb, 0);
const total = tamanhos.reduce((s, t) => s + t.kb, 0);
const maior = tamanhos[0];

console.log("Arquivo".padEnd(48), "KB (gzip)", " Primeira tela");
for (const t of tamanhos) console.log(t.arquivo.padEnd(48), t.kb.toFixed(1).padStart(9), t.inicial ? "  sim" : "");
console.log();

const falhas = [];
const conferir = (nome, valor, limite) => {
  const ok = valor <= limite;
  console.log(`${ok ? "OK   " : "FALHA"} ${nome}: ${valor.toFixed(1)} KB (limite ${limite} KB)`);
  if (!ok) falhas.push(nome);
};
conferir("primeira tela", inicial, LIMITES_KB.inicial);
conferir(`maior arquivo (${maior.arquivo})`, maior.kb, LIMITES_KB.maiorArquivo);
conferir("total", total, LIMITES_KB.total);

if (falhas.length) {
  console.error(
    "\nO app passou do orçamento de tamanho. Carregue sob demanda o que não é da primeira tela, ou justifique o aumento no PR e ajuste o limite.",
  );
  process.exit(1);
}
