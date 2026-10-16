import { describe, it, expect } from "vitest";
import { montarCopia, lerCopia, nomeArquivoCopia, resumirCopia, textoUltimaCopia } from "./copiaSeguranca.js";

const dados = {
  "negocio:config": JSON.stringify({ proLabore: "2200" }),
  "servicos:a1": JSON.stringify({ nome: "Corte" }),
  "servicos:b2": JSON.stringify({ nome: "Escova" }),
  "fechamento:2026-09": JSON.stringify({ mes: "2026-09" }),
  "observatorio:concorrentes": JSON.stringify([{ id: "x" }, { id: "y" }]),
  "rascunho:servico-novo": JSON.stringify({ nome: "Hidratação" }),
};

describe("cópia de segurança", () => {
  it("ida e volta: o que sai na cópia volta igual", () => {
    const texto = JSON.stringify(montarCopia(dados, { versaoApp: "v7.16", agora: new Date("2026-10-10T12:00:00Z") }));
    const r = lerCopia(texto);
    expect(r.ok).toBe(true);
    expect(r.dados).toEqual(dados);
    expect(r.versaoApp).toBe("v7.16");
    expect(r.criadaEm).toBe("2026-10-10T12:00:00.000Z");
  });
  it("resumo para a confirmação", () => {
    expect(resumirCopia(dados)).toEqual({ temNegocio: true, servicos: 2, fechamentos: 1, produtos: 0, concorrentes: 2 });
  });
  it("nome do arquivo com a data", () => {
    expect(nomeArquivoCopia(new Date(2026, 9, 5))).toBe("preco-justo-copia-2026-10-05.json");
  });
  it.each([
    ["texto qualquer", "Não foi possível ler"],
    [JSON.stringify({ app: "outro-app", dados: {} }), "não é uma cópia"],
    [JSON.stringify({ app: "preco-justo", dados: [] }), "não é uma cópia"],
    [JSON.stringify({ app: "preco-justo", formato: 99, dados: { "negocio:config": "{}" } }), "versão mais nova"],
    [JSON.stringify({ app: "preco-justo", formato: 1, dados: {} }), "nenhum dado"],
    ["", "vazio"],
  ])("recusa arquivo inválido (%#)", (texto, trecho) => {
    const r = lerCopia(texto);
    expect(r.ok).toBe(false);
    expect(r.erro).toContain(trecho);
  });
  it("ignora chaves e valores fora do formato do app", () => {
    const texto = JSON.stringify(montarCopia({
      ...dados, "__proto__x": "a", "chave com espaço": "b", "servicos:c3": 123, "Negocio:config": "c",
    }));
    const r = lerCopia(texto);
    expect(r.ok).toBe(true);
    expect(Object.keys(r.dados).sort()).toEqual(Object.keys(dados).sort());
  });
});

describe("lembrete de cópia depois do fechamento", () => {
  const agora = new Date(2026, 9, 16, 18, 30);
  it.each([
    [null, "Você ainda não baixou nenhuma cópia."],
    ["", "Você ainda não baixou nenhuma cópia."],
    ["não é data", "Você ainda não baixou nenhuma cópia."],
    [new Date(2026, 9, 16, 8, 0).toISOString(), "Sua última cópia é de hoje, mas não tem este fechamento."],
    [new Date(2026, 9, 15, 23, 50).toISOString(), "Sua última cópia é de ontem (15/10/2026)."],
    [new Date(2026, 8, 30, 12, 0).toISOString(), "Sua última cópia é de 30/09/2026, há 16 dias."],
  ])("última cópia %s", (iso, texto) => {
    expect(textoUltimaCopia(iso, agora)).toBe(texto);
  });
});
