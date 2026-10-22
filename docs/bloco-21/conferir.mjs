// Confere que cada declaração do App.jsx original existe igual (código gerado, sem
// comentários nem formatação) em algum arquivo novo. Lista só o que mudou.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
const [raiz, original] = process.argv.slice(2);
const require = createRequire(join(raiz, "package.json"));
const { parse } = require("@babel/parser");
const gerar = require("@babel/generator").default;
const codigo = (n) => gerar(n, { comments: false, compact: true }).code;
const nomeDe = (st) =>
  st.id?.name || (st.declarations ? st.declarations.map((d) => d.id.name).join(",") : `${st.type}`);
const declaracoes = (texto) => {
  const ast = parse(texto, { sourceType: "module", plugins: ["jsx"] });
  const out = new Map();
  for (let st of ast.program.body) {
    if (st.type === "ImportDeclaration") continue;
    if ((st.type === "ExportNamedDeclaration" || st.type === "ExportDefaultDeclaration") && st.declaration?.type !== "Identifier" && st.declaration)
      st = st.declaration;
    out.set(nomeDe(st) + (out.has(nomeDe(st)) ? "#2" : ""), codigo(st));
  }
  return out;
};
const antes = declaracoes(readFileSync(original, "utf8"));
const depois = new Map();
const andar = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) andar(p);
    else if (/\.(jsx?)$/.test(f) && !/\.test\.js$/.test(f) && !/(calculos|copiaSeguranca|termos|main|MapaConcorrencia)\.jsx?$/.test(f))
      for (const [k, v] of declaracoes(readFileSync(p, "utf8"))) depois.set(`${k}`, { v, p: p.replace(raiz, "") });
  }
};
andar(join(raiz, "src"));
let iguais = 0;
for (const [k, v] of antes) {
  const d = depois.get(k);
  if (!d) console.log("SUMIU   ", k);
  else if (d.v !== v) console.log("MUDOU   ", k, "em", d.p);
  else iguais++;
}
for (const [k, d] of depois) if (!antes.has(k)) console.log("NOVO    ", k, "em", d.p);
console.log(`iguais: ${iguais} de ${antes.size}`);
