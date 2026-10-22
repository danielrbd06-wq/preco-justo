// Divide src/App.jsx em módulos, sem mudar o código das declarações (Bloco 21).
// Uso: node dividir.mjs <raiz do repo> <config.mjs>
// - Cada declaração de topo vai inteira (com os comentários acima dela) para o módulo do config.
// - Imports e exports são calculados pelo uso real de cada nome.
// - Falha se sobrar declaração sem destino, se houver ciclo entre módulos ou JSX em arquivo .js.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";

const [raiz, arquivoConfig] = process.argv.slice(2);
const require = createRequire(join(raiz, "package.json"));
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const { MODULOS } = await import(resolve(arquivoConfig));

const origem = join(raiz, "src/App.jsx");
const src = readFileSync(origem, "utf8");
const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
const corpo = ast.program.body;

// ---- imports originais
const importados = new Map(); // local -> {fonte, tipo, nome}
let fimImports = 0;
for (const st of corpo) {
  if (st.type !== "ImportDeclaration") continue;
  fimImports = st.end;
  for (const s of st.specifiers) {
    const tipo = s.type === "ImportDefaultSpecifier" ? "default" : s.type === "ImportNamespaceSpecifier" ? "ns" : "named";
    importados.set(s.local.name, { fonte: st.source.value, tipo, nome: tipo === "named" ? s.imported.name : null });
  }
}

// ---- declarações de topo e pedaços de texto
const fimDaLinha = (pos) => {
  const i = src.indexOf("\n", pos);
  return i === -1 ? src.length : i;
};
const decls = [];
let inicioPedaco = fimDaLinha(fimImports) + 1;
for (const st of corpo) {
  if (st.type === "ImportDeclaration") continue;
  let nomes = [];
  if (st.type === "FunctionDeclaration" || st.type === "ClassDeclaration") nomes = [st.id.name];
  else if (st.type === "VariableDeclaration") nomes = st.declarations.map((d) => d.id.name);
  const chave = nomes[0] || `@${st.loc.start.line}`;
  if (st.start < inicioPedaco) throw new Error(`duas declarações na mesma linha: ${chave}`);
  const fim = fimDaLinha(st.end);
  decls.push({ st, nomes, chave, inicio: inicioPedaco, fim, usa: new Set(), temJSX: false });
  inicioPedaco = fim + 1;
}
decls.at(-1).fim = src.length; // comentários finais vão com a última

const declDe = new Map();
for (const d of decls) for (const n of d.nomes) declDe.set(n, d);
const stParaDecl = new Map(decls.map((d) => [d.st, d]));

let escopoPrograma;
traverse(ast, {
  Program(p) {
    escopoPrograma = p.scope;
  },
  JSXElement(p) {
    let q = p;
    while (q.parentPath && !q.parentPath.isProgram()) q = q.parentPath;
    const d = stParaDecl.get(q.node);
    if (d) d.temJSX = true;
  },
  "Identifier|JSXIdentifier"(p) {
    const nome = p.node.name;
    if (p.isJSXIdentifier()) {
      if (!/^[A-Z]/.test(nome)) return;
      if (p.parentPath.isJSXMemberExpression() && p.parentPath.node.property === p.node) return;
      if (p.parentPath.isJSXAttribute()) return;
    } else {
      const atribuicao =
        (p.parentPath.isAssignmentExpression() && p.parentPath.node.left === p.node) || p.parentPath.isUpdateExpression();
      if (!p.isReferencedIdentifier() && !atribuicao) return;
    }
    const b = p.scope.getBinding(nome);
    if (!b || b.scope !== escopoPrograma) return;
    let q = p;
    while (q.parentPath && !q.parentPath.isProgram()) q = q.parentPath;
    const d = stParaDecl.get(q.node);
    if (!d || d.nomes.includes(nome)) return;
    d.usa.add(nome);
  },
});

// ---- destino de cada declaração
const moduloDe = new Map(); // chave -> módulo
for (const m of MODULOS) {
  for (const chave of m.nomes) {
    if (moduloDe.has(chave)) throw new Error(`${chave} em dois módulos`);
    if (!decls.some((d) => d.chave === chave)) throw new Error(`${chave} não existe em App.jsx`);
    moduloDe.set(chave, m);
  }
}
const semDestino = decls.filter((d) => !moduloDe.has(d.chave)).map((d) => d.chave);
if (semDestino.length) throw new Error(`sem destino: ${semDestino.join(", ")}`);
const moduloDoNome = (n) => moduloDe.get(declDe.get(n).chave);

// nomes que outros módulos usam -> export
const exportar = new Set();
const dependencias = new Map(MODULOS.map((m) => [m.arquivo, new Set()]));
for (const d of decls) {
  const m = moduloDe.get(d.chave);
  for (const n of d.usa) {
    if (!declDe.has(n)) continue;
    const outro = moduloDoNome(n);
    if (outro !== m) {
      exportar.add(n);
      dependencias.get(m.arquivo).add(outro.arquivo);
    }
  }
}

// ciclos
const visitando = new Set();
const feito = new Set();
const visitar = (a, caminho) => {
  if (feito.has(a)) return;
  if (visitando.has(a)) throw new Error(`ciclo: ${[...caminho, a].join(" -> ")}`);
  visitando.add(a);
  for (const b of dependencias.get(a)) visitar(b, [...caminho, a]);
  visitando.delete(a);
  feito.add(a);
};
for (const m of MODULOS) visitar(m.arquivo, []);

// ---- gerar arquivos
const relativo = (deArquivo, paraArquivo) => {
  let r = relative(dirname(deArquivo), paraArquivo).replaceAll("\\", "/");
  if (!r.startsWith(".")) r = `./${r}`;
  return r;
};
const fonteReescrita = (arquivoNovo, fonte) =>
  fonte.startsWith(".") ? relativo(join(raiz, arquivoNovo), resolve(dirname(origem), fonte)) : fonte;

for (const m of MODULOS) {
  const minhas = decls.filter((d) => moduloDe.get(d.chave) === m);
  if (m.arquivo.endsWith(".js") && minhas.some((d) => d.temJSX)) throw new Error(`${m.arquivo} tem JSX: use .jsx`);
  const usados = new Set();
  for (const d of minhas) for (const n of d.usa) usados.add(n);

  const externos = new Map(); // fonte -> {padrao, nomes:Set}
  const internos = new Map(); // arquivo -> {padrao, nomes:Set}
  for (const n of [...usados].sort()) {
    if (importados.has(n)) {
      const imp = importados.get(n);
      const fonte = fonteReescrita(m.arquivo, imp.fonte);
      if (!externos.has(fonte)) externos.set(fonte, { padrao: null, ns: null, nomes: new Set() });
      const e = externos.get(fonte);
      if (imp.tipo === "default") e.padrao = n;
      else if (imp.tipo === "ns") e.ns = n;
      else e.nomes.add(imp.nome === n ? n : `${imp.nome} as ${n}`);
    } else if (declDe.has(n)) {
      const outro = moduloDoNome(n);
      if (outro === m) continue;
      const fonte = relativo(join(raiz, m.arquivo), join(raiz, outro.arquivo));
      if (!internos.has(fonte)) internos.set(fonte, { padrao: null, nomes: new Set() });
      if (outro.padrao === n) internos.get(fonte).padrao = n;
      else internos.get(fonte).nomes.add(n);
    }
  }
  const linhaImport = (fonte, { padrao, ns, nomes }) => {
    const partes = [];
    if (padrao) partes.push(padrao);
    if (ns) partes.push(`* as ${ns}`);
    if (nomes?.size) partes.push(`{ ${[...nomes].join(", ")} }`);
    return partes.length ? `import ${partes.join(", ")} from "${fonte}";` : `import "${fonte}";`;
  };
  const linhas = [];
  for (const [f, e] of externos) linhas.push(linhaImport(f, e));
  for (const [f, e] of internos) linhas.push(linhaImport(f, e));

  let texto = "";
  for (const d of minhas) {
    let pedaco = src.slice(d.inicio, d.fim);
    const deslocamento = d.st.start - d.inicio;
    const ehPadrao = m.padrao && d.nomes.includes(m.padrao);
    const precisaExport = d.nomes.some((n) => exportar.has(n));
    if (ehPadrao) {
      if (d.st.type !== "FunctionDeclaration") throw new Error(`padrão ${m.padrao} precisa ser function`);
      pedaco = `${pedaco.slice(0, deslocamento)}export default ${pedaco.slice(deslocamento)}`;
    } else if (precisaExport) {
      if (d.st.type === "VariableDeclaration" && d.st.kind === "let") throw new Error(`let exportado: ${d.chave}`);
      pedaco = `${pedaco.slice(0, deslocamento)}export ${pedaco.slice(deslocamento)}`;
    }
    // import() dinâmico com caminho relativo
    pedaco = pedaco.replace(/import\("(\.[^"]+)"\)/g, (_, f) => `import("${fonteReescrita(m.arquivo, f)}")`);
    texto += `${pedaco}\n`;
  }
  const saida = `${m.cabecalho ? `${m.cabecalho.trim()}\n` : ""}${linhas.join("\n")}\n${texto.replace(/^\n+/, "\n")}`;
  const destino = join(raiz, m.arquivo);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, saida);
  console.log(m.arquivo.padEnd(42), String(saida.split("\n").length).padStart(6), "linhas");
}
