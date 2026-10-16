import { describe, expect, it } from "vitest";
import {
  CHAVE_ACEITE,
  CONTATO_PRIVACIDADE,
  chavesDoApp,
  DOCUMENTOS_LEGAIS,
  lerAceite,
  montarAceite,
  RESUMO_ACEITE,
  VERSAO_TERMOS,
} from "./termos.js";

describe("aceite dos termos", () => {
  it("ida e volta: o aceite gravado é lido de volta", () => {
    const texto = montarAceite({ agora: new Date("2026-10-16T13:00:00Z") });
    expect(lerAceite(texto)).toEqual({ versao: VERSAO_TERMOS, aceitoEm: "2026-10-16T13:00:00.000Z" });
  });
  it("versão nova dos textos pede o aceite de novo", () => {
    const antigo = montarAceite({ versao: "0.0" });
    expect(lerAceite(antigo)).toBeNull();
    expect(lerAceite(montarAceite({ versao: "0.2" }), "0.2")).not.toBeNull();
  });
  it.each([
    [null],
    [""],
    ["texto qualquer"],
    ["[]"],
    ["null"],
    [JSON.stringify({ versao: VERSAO_TERMOS })],
    [JSON.stringify({ versao: VERSAO_TERMOS, aceitoEm: "ontem" })],
  ])("registro ausente ou corrompido conta como não aceito (%#)", (texto) => {
    expect(lerAceite(texto)).toBeNull();
  });
  it("o registro fica fora do espaço de dados que vai para a cópia de segurança", () => {
    expect(CHAVE_ACEITE.startsWith("preco-justo:cache-local:")).toBe(false);
  });
});

describe("apagar todos os dados", () => {
  it("só remove as chaves do app", () => {
    const todas = ["preco-justo:cache-local:negocio:config", "preco-justo:aceite-termos", "outro-app:x", "tema", null];
    expect(chavesDoApp(todas)).toEqual(["preco-justo:cache-local:negocio:config", "preco-justo:aceite-termos"]);
    expect(chavesDoApp(undefined)).toEqual([]);
  });
});

describe("textos legais", () => {
  const secoes = Object.values(DOCUMENTOS_LEGAIS).flatMap((d) => d.secoes);
  it("toda seção tem título e texto", () => {
    expect(secoes.length).toBeGreaterThan(10);
    for (const s of secoes) {
      expect(s.titulo).toBeTruthy();
      expect(s.paragrafos.length).toBeGreaterThan(0);
    }
  });
  it("nenhuma marcação de rascunho ([a definir], [revisão jurídica]) aparece para o usuário", () => {
    const tudo = [...RESUMO_ACEITE, ...secoes.flatMap((s) => [s.titulo, ...s.paragrafos, ...(s.itens || []), ...(s.depois || [])])].join(
      " ",
    );
    expect(tudo).not.toMatch(/[[\]]/);
  });
  it("o canal de contato aparece nos Termos e no Aviso de Privacidade", () => {
    expect(CONTATO_PRIVACIDADE).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/);
    for (const doc of Object.values(DOCUMENTOS_LEGAIS)) {
      const texto = doc.secoes.flatMap((s) => [...s.paragrafos, ...(s.depois || [])]).join(" ");
      expect(texto).toContain(CONTATO_PRIVACIDADE);
    }
  });
});

describe("serviços externos", () => {
  // O Aviso de Privacidade lista quem recebe dados técnicos de acesso. Se o código
  // passar a chamar outro endereço, este teste falha: atualize o aviso (e a versão).
  const DECLARADOS = new Set([
    "tile.openstreetmap.org", // imagens do mapa (Aviso, item 3)
    "www.openstreetmap.org", // só link de atribuição, aberto se a pessoa clicar
    "www.w3.org", // namespace de SVG, não é acessado
  ]);
  it("o código só acessa os serviços declarados no Aviso de Privacidade", async () => {
    const { readdirSync, readFileSync } = await import("node:fs");
    const arquivos = [
      ...readdirSync("src")
        .filter((f) => /\.(jsx?|css)$/.test(f) && !f.includes(".test."))
        .map((f) => `src/${f}`),
      "index.html",
    ];
    const hosts = new Set();
    for (const arq of arquivos) {
      for (const m of readFileSync(arq, "utf8").matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) hosts.add(m[1].toLowerCase());
    }
    expect([...hosts].filter((h) => !DECLARADOS.has(h))).toEqual([]);
  });
});
