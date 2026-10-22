/* Negócio vazio de partida e os dados de exemplo para demonstração. */
import { uid } from "../armazenamento.js";

export const NEGOCIO_PADRAO = {
  custosFixos: [
    { id: uid(), nome: "Aluguel do espaço", valor: "", semCaixa: false },
    { id: uid(), nome: "Água, luz e internet", valor: "", semCaixa: false },
    { id: uid(), nome: "Contador", valor: "", semCaixa: false },
    { id: uid(), nome: "Manutenção de equipamentos", valor: "", semCaixa: false },
    { id: uid(), nome: "Marketing e redes sociais", valor: "", semCaixa: false },
    { id: uid(), nome: "Depreciação de equipamentos (cadeiras, secadores etc.)", valor: "", semCaixa: true },
  ],
  insumosCompartilhados: [],
  profissionais: [],
  // Formas de pagamento (Bloco 5): { [id]: { participacaoPct, taxaPct } }.
  recebimento: {},
  perfil: {
    nomeResponsavel: "",
    nomeFantasia: "",
    cnpj: "",
    segmento: null,
    modeloOperacao: null,
    cidade: "",
    estado: "",
  },
  diasMes: "26",
  horasDia: "8",
  numeroProfissionais: "1",
  proLabore: "",
  regime: "indefinido",
  meiDas: "",
  rbt12: "",
  folha12: "",
  atividadeSempreAnexoIII: true,
  capitalInvestido: "",
  taxaRetorno: "0.8",
};

/* ======================================================================= */
/* Dados de exemplo — pra demonstração, NUNCA carregados sozinhos. Números  */
/* calibrados no motor de cálculo real (custo fixo/hora, Simples Nacional,  */
/* markup-divisor) pra fechar num resultado positivo e plausível pra um     */
/* salão pequeno de 2 profissionais — não são dado de mercado nem promessa  */
/* de valor real, só um cenário ilustrativo totalmente editável depois.     */
/* ======================================================================= */
export function gerarDadosExemplo() {
  const negocio = {
    ...NEGOCIO_PADRAO,
    custosFixos: [
      { id: uid(), nome: "Aluguel do espaço", valor: "900", semCaixa: false },
      { id: uid(), nome: "Água, luz e internet", valor: "280", semCaixa: false },
      { id: uid(), nome: "Contador", valor: "180", semCaixa: false },
      { id: uid(), nome: "Manutenção de equipamentos", valor: "", semCaixa: false },
      { id: uid(), nome: "Marketing e redes sociais", valor: "", semCaixa: false },
      { id: uid(), nome: "Depreciação de equipamentos (cadeiras, secadores etc.)", valor: "", semCaixa: true },
    ],
    diasMes: "26",
    horasDia: "8",
    numeroProfissionais: "2",
    proLabore: "2200",
    regime: "simples",
    rbt12: "90000",
    folha12: "22000",
    atividadeSempreAnexoIII: true,
    capitalInvestido: "8000",
    taxaRetorno: "0.8",
  };

  const agora = Date.now();
  const servicos = [
    {
      id: uid(),
      nome: "Corte Masculino",
      categoria: "Cabelo",
      criadoEm: agora,
      editadoEm: agora,
      modo: "descobrir",
      custosVariaveis: [{ id: uid(), nome: "Produtos (gel, pomada)", modo: "direto", valor: "3" }],
      comissaoPct: 30,
      taxaCartaoPct: 3,
      margemPct: 25,
      horasPorAtendimento: 0.5,
      atendimentosMes: 120,
      precoCobrado: null,
      precoConfirmado: 20.22,
      precoSeparadoReferencia: null,
    },
    {
      id: uid(),
      nome: "Escova",
      categoria: "Cabelo",
      criadoEm: agora,
      editadoEm: agora,
      modo: "descobrir",
      custosVariaveis: [{ id: uid(), nome: "Produto finalizador", modo: "direto", valor: "5" }],
      comissaoPct: 30,
      taxaCartaoPct: 3,
      margemPct: 25,
      horasPorAtendimento: 1,
      atendimentosMes: 55,
      precoCobrado: null,
      precoConfirmado: 37.66,
      precoSeparadoReferencia: null,
    },
    {
      id: uid(),
      nome: "Coloração",
      categoria: "Cabelo",
      criadoEm: agora,
      editadoEm: agora,
      modo: "descobrir",
      custosVariaveis: [
        { id: uid(), nome: "Tinta e oxidante", modo: "direto", valor: "35" },
        { id: uid(), nome: "Luvas e touca", modo: "direto", valor: "2" },
      ],
      comissaoPct: 30,
      taxaCartaoPct: 3,
      margemPct: 30,
      horasPorAtendimento: 1.5,
      atendimentosMes: 28,
      precoCobrado: null,
      precoConfirmado: 160.76,
      precoSeparadoReferencia: null,
    },
  ];

  return { negocio, servicos };
}
