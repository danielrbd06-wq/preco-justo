import { describe, it, expect } from "vitest";
import {
  VERSAO_TERMOS, CHAVE_ACEITE, montarAceite, lerAceite, chavesDoApp,
  DOCUMENTOS_LEGAIS, RESUMO_ACEITE, CONTATO_PRIVACIDADE,
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
    [null], [""], ["texto qualquer"], ["[]"], ["null"],
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
    const tudo = [...RESUMO_ACEITE, ...secoes.flatMap((s) => [s.titulo, ...s.paragrafos, ...(s.itens || []), ...(s.depois || [])])].join(" ");
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
