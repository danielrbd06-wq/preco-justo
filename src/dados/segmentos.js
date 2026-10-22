/* Segmentos, formas de trabalho e o que cada segmento traz pronto
   (serviços e insumos sugeridos). */
import { Building2, Flower2, Hand, Scissors, Sparkles } from "lucide-react";
import { uid } from "../armazenamento.js";

// Taxonomia do onboarding — segmento e modelo de operação. Ícones novos (Scissors/Hand/
// Flower2) justificados pela clareza visual real que um seletor de segmento precisa.
export const SEGMENTOS = [
  { id: "barbearia", label: "Barbearia", icon: Scissors },
  { id: "salao", label: "Salão de Cabeleireiro", icon: Sparkles },
  { id: "manicure", label: "Manicure / Nail Designer", icon: Hand },
  { id: "estetica", label: "Estética Avançada", icon: Flower2 },
  { id: "misto", label: "Espaço Misto", icon: Building2 },
];
export const MODELOS_OPERACAO = [
  { id: "autonomo", label: "Autônomo(a), sozinho(a)", descricao: "Só eu atendo, sem equipe." },
  {
    id: "equipe",
    label: "Equipe / cadeiras comissionadas ou alugadas",
    descricao: "Tenho profissionais comissionados ou que alugam espaço.",
  },
  { id: "clt", label: "Empresa com funcionários CLT", descricao: "Tenho funcionário(s) registrado(s) em carteira." },
  {
    id: "locatario",
    label: "Alugo cadeira ou sala em outro salão",
    descricao: "Pago ao dono do espaço e fico com o valor dos meus serviços.",
  },
];

// Termo neutro de "o seu negócio" por segmento — evita a palavra "salão" fixa quando o
// usuário é barbearia, manicure etc. "barbearia" é feminino, os demais são masculinos —
// por isso guarda o artigo junto, pra concordância (do/da, no/na) sair certa.
const TERMO_ESTABELECIMENTO_POR_SEGMENTO = {
  barbearia: { termo: "barbearia", artigo: "a" },
  salao: { termo: "salão", artigo: "o" },
  manicure: { termo: "studio", artigo: "o" },
  estetica: { termo: "studio", artigo: "o" },
  misto: { termo: "negócio", artigo: "o" },
};
export function termoEstabelecimento(segmento) {
  return TERMO_ESTABELECIMENTO_POR_SEGMENTO[segmento] || TERMO_ESTABELECIMENTO_POR_SEGMENTO.misto;
}

/* Preenchimento rápido: SÓ nome e categoria, nenhum valor numérico —      */
/* preço, custo e tempo continuam 100% do que a pessoa informar, sempre.  */
// Templates de preenchimento rápido na Calculadora — só nome + categoria, nenhum valor
// pré-preenchido. Varia por segmento (ver Especificacao_Onboarding.md, §2).
export const TEMPLATES_SERVICO_POR_SEGMENTO = {
  barbearia: [
    { nome: "Corte Masculino", categoria: "Cabelo" },
    { nome: "Barba", categoria: "Barba" },
    { nome: "Corte + Barba", categoria: "Combo" },
    { nome: "Sobrancelha", categoria: "Barba" },
    { nome: "Pigmentação de Barba", categoria: "Barba" },
  ],
  salao: [
    { nome: "Corte e Escova", categoria: "Cabelo" },
    { nome: "Coloração", categoria: "Cabelo" },
    { nome: "Mechas", categoria: "Cabelo" },
    { nome: "Hidratação", categoria: "Cabelo" },
    { nome: "Progressiva", categoria: "Cabelo" },
  ],
  manicure: [
    { nome: "Manicure", categoria: "Unha" },
    { nome: "Pedicure", categoria: "Unha" },
    { nome: "Manicure + Pedicure", categoria: "Combo" },
    { nome: "Esmaltação em Gel", categoria: "Unha" },
    { nome: "Alongamento de Unha", categoria: "Unha" },
  ],
  estetica: [
    { nome: "Limpeza de Pele", categoria: "Estética" },
    { nome: "Design de Sobrancelha", categoria: "Estética" },
    { nome: "Depilação", categoria: "Estética" },
    { nome: "Massagem Relaxante", categoria: "Estética" },
    { nome: "Micropigmentação", categoria: "Estética" },
  ],
  misto: [
    { nome: "Corte Masculino", categoria: "Cabelo" },
    { nome: "Corte e Escova", categoria: "Cabelo" },
    { nome: "Manicure", categoria: "Unha" },
    { nome: "Limpeza de Pele", categoria: "Estética" },
    { nome: "Barba", categoria: "Barba" },
  ],
};
export const TEMPLATES_SERVICO = TEMPLATES_SERVICO_POR_SEGMENTO.misto;

// Checklist de insumos sugerido ao criar um serviço novo — mesma lógica: só nomes, sem
// valores. Varia por segmento; o genérico (salão) fica como piso pra quem ainda não
// completou o onboarding ou escolheu "Espaço Misto".
const INSUMOS_SUGERIDOS_POR_SEGMENTO = {
  barbearia: [
    { nome: "Lâmina/gilete", modo: "unidade" },
    { nome: "Espuma ou gel de barbear", modo: "duracao" },
    { nome: "Pomada modeladora", modo: "duracao" },
    { nome: "Toalha descartável", modo: "unidade" },
    { nome: "Álcool antisséptico", modo: "duracao" },
  ],
  salao: [
    { nome: "Produtos químicos (coloração, alisamento etc.)", modo: "duracao" },
    { nome: "Shampoo e condicionador", modo: "duracao" },
    { nome: "Máscara ou hidratação", modo: "duracao" },
    { nome: "Touca descartável", modo: "unidade" },
    { nome: "Luvas", modo: "unidade" },
  ],
  manicure: [
    { nome: "Esmalte", modo: "duracao" },
    { nome: "Removedor / acetona", modo: "duracao" },
    { nome: "Lixa de unha", modo: "unidade" },
    { nome: "Palito / espátula", modo: "unidade" },
    { nome: "Algodão", modo: "duracao" },
  ],
  estetica: [
    { nome: "Luvas descartáveis", modo: "unidade" },
    { nome: "Algodão", modo: "duracao" },
    { nome: "Sérum ou ácido facial", modo: "duracao" },
    { nome: "Máscara facial", modo: "unidade" },
    { nome: "Álcool antisséptico", modo: "duracao" },
  ],
};

// Converte a sugestão simples (nome + modo) do segmento na forma completa que um item de
// custo variável precisa, com todo o resto em branco pra pessoa preencher.
export function custosVariaveisIniciaisPorSegmento(segmento) {
  const lista = INSUMOS_SUGERIDOS_POR_SEGMENTO[segmento] || INSUMOS_SUGERIDOS_POR_SEGMENTO.salao;
  return lista.map((item) =>
    item.modo === "unidade"
      ? { id: uid(), nome: item.nome, modo: "unidade", valorCompra: "", quantidadeComprada: "", usoPorAtendimento: "1" }
      : { id: uid(), nome: item.nome, modo: "duracao", valorCompra: "", duracaoValor: "", duracaoUnidade: "dias" },
  );
}
