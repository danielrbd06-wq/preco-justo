/* Dados de referência do mercado: estabelecimentos reais coletados (Observatório)
   e a referência salarial da categoria (Negócio), com a fonte de cada um. */

/* ======================================================================= */
/* Dados reais — Google Places, coletados nesta sessão (Feira de Santana)  */
/* ======================================================================= */
/* A data exata da coleta não foi registrada no código. O que dá pra       */
/* comprovar é o limite: os dados já estavam no build de 16/08/2026. Por    */
/* isso a tela mostra "até agosto de 2026" e não uma data inventada. Ao     */
/* fazer uma nova coleta, preencha `data` (AAAA-MM-DD) e a tela passa a     */
/* mostrar a data exata.                                                    */
export const COLETA_ESTABELECIMENTOS = {
  fonte: "Google Maps (perfis públicos via Google Places)",
  data: null,
  limiteComprovado: "agosto de 2026",
};
export const ESTABELECIMENTOS_REAIS = [
  { nome: "Glamour Beauty Studio", tipo: "Salão", bairro: "Papagaio", cidade: "Feira de Santana", avaliacao: 4.9, avaliacoes: 75 },
  {
    nome: "Espaço de Beleza Loy Ramos",
    tipo: "Salão",
    bairro: "Santa Mônica",
    cidade: "Feira de Santana",
    avaliacao: 4.9,
    avaliacoes: 282,
  },
  {
    nome: "Salão Casal 20 - Centro de Estética",
    tipo: "Salão",
    bairro: "Centro",
    cidade: "Feira de Santana",
    avaliacao: 4.7,
    avaliacoes: 568,
  },
  {
    nome: "Studio de Beleza Fernanda Freitas",
    tipo: "Salão",
    bairro: "Santa Mônica",
    cidade: "Feira de Santana",
    avaliacao: 4.6,
    avaliacoes: 76,
  },
  { nome: "Maison Laine Coiffeur", tipo: "Salão", bairro: "Capuchinhos", cidade: "Feira de Santana", avaliacao: 4.6, avaliacoes: 153 },
  { nome: "Your Passion Beauty Space", tipo: "Salão", bairro: "Brasília", cidade: "Feira de Santana", avaliacao: 4.5, avaliacoes: 266 },
  {
    nome: "Instituto de Beleza Korpo & Rosto",
    tipo: "Salão",
    bairro: "Centro",
    cidade: "Feira de Santana",
    avaliacao: 4.9,
    avaliacoes: 60,
  },
  { nome: "Mirian Centro de Beleza", tipo: "Salão", bairro: "Centro", cidade: "Feira de Santana", avaliacao: 4.6, avaliacoes: 23 },
  { nome: "Barbearia Titans", tipo: "Barbearia", bairro: "Capuchinhos", cidade: "Feira de Santana", avaliacao: 5.0, avaliacoes: 112 },
  {
    nome: "Dom Mustache Barbearia",
    tipo: "Barbearia",
    bairro: "Santa Mônica",
    cidade: "Feira de Santana",
    avaliacao: 4.9,
    avaliacoes: 460,
  },
  { nome: "Barbearia Renildo Barber", tipo: "Barbearia", bairro: "Centro", cidade: "Feira de Santana", avaliacao: 5.0, avaliacoes: 233 },
  { nome: "Os Boleiros Barber Shop", tipo: "Barbearia", bairro: "Caseb", cidade: "Feira de Santana", avaliacao: 4.8, avaliacoes: 70 },
  { nome: "Valmir Barber", tipo: "Barbearia", bairro: "São João", cidade: "Feira de Santana", avaliacao: 4.9, avaliacoes: 29 },
  { nome: "Will Barber Barbearia (Sim)", tipo: "Barbearia", bairro: "Sim", cidade: "Feira de Santana", avaliacao: 5.0, avaliacoes: 865 },
  { nome: "Alphazone Barbearia", tipo: "Barbearia", bairro: "Calumbi", cidade: "Feira de Santana", avaliacao: 5.0, avaliacoes: 113 },
  {
    nome: "Will Barber Barbearia (Parque Ipê)",
    tipo: "Barbearia",
    bairro: "Parque Ipê",
    cidade: "Feira de Santana",
    avaliacao: 5.0,
    avaliacoes: 410,
  },
  { nome: "Studio Que Beleza", tipo: "Salão", bairro: "Garcia", cidade: "Salvador", avaliacao: 5.0, avaliacoes: 232 },
  { nome: "Cesar Beauty Studio", tipo: "Salão", bairro: "Caminho das Árvores", cidade: "Salvador", avaliacao: 5.0, avaliacoes: 93 },
  { nome: "Espaço Performance", tipo: "Salão", bairro: "Pituba", cidade: "Salvador", avaliacao: 4.5, avaliacoes: 259 },
  { nome: "Studio Baroni", tipo: "Salão", bairro: "Pituba", cidade: "Salvador", avaliacao: 4.9, avaliacoes: 263 },
  { nome: "Instituto de Beleza de Brotas", tipo: "Salão", bairro: "Brotas", cidade: "Salvador", avaliacao: 5.0, avaliacoes: 136 },
  { nome: "Helena Correia Salão de Beleza", tipo: "Salão", bairro: "Brotas", cidade: "Salvador", avaliacao: 5.0, avaliacoes: 150 },
  {
    nome: "Escritório da Beleza Hair Spa",
    tipo: "Salão",
    bairro: "Caminho das Árvores",
    cidade: "Salvador",
    avaliacao: 5.0,
    avaliacoes: 79,
  },
  { nome: "Jacques Janine", tipo: "Salão", bairro: "Caminho das Árvores", cidade: "Salvador", avaliacao: 4.4, avaliacoes: 340 },
  {
    nome: "Barbearia Dom Barbudo Barber Club",
    tipo: "Barbearia",
    bairro: "Caminho das Árvores",
    cidade: "Salvador",
    avaliacao: 5.0,
    avaliacoes: 1470,
  },
  { nome: "Don Felix Barbershop", tipo: "Barbearia", bairro: "Barra", cidade: "Salvador", avaliacao: 5.0, avaliacoes: 1011 },
  { nome: "Barbearia Salve Jorge", tipo: "Barbearia", bairro: "Brotas", cidade: "Salvador", avaliacao: 5.0, avaliacoes: 1590 },
  { nome: "Berna Barbearia", tipo: "Barbearia", bairro: "Itaigara", cidade: "Salvador", avaliacao: 5.0, avaliacoes: 185 },
  { nome: "Farol Beach BarberShop", tipo: "Barbearia", bairro: "Barra", cidade: "Salvador", avaliacao: 5.0, avaliacoes: 550 },
  { nome: "A (Bar)bearia", tipo: "Barbearia", bairro: "Pituba", cidade: "Salvador", avaliacao: 4.8, avaliacoes: 380 },
  { nome: "Barber House Salvador", tipo: "Barbearia", bairro: "Amaralina", cidade: "Salvador", avaliacao: 5.0, avaliacoes: 196 },
  { nome: "Barbearia Gentleman", tipo: "Barbearia", bairro: "Caminho das Árvores", cidade: "Salvador", avaliacao: 4.5, avaliacoes: 216 },
];

/* ======================================================================= */
/* Negócio — modelo de dados e derivações (inalterado)                     */
/* ======================================================================= */
/* ======================================================================= */
/* Referência salarial sindical — CCT SINDECOBE 2025/2027, real, assinada  */
/* digitalmente (Clicksign), consultada nesta sessão em fecomercioba.com.br */
/* IMPORTANTE: por cláusula da própria convenção, ela NÃO vale para        */
/* Salvador nem para municípios com sindicato patronal próprio — o que     */
/* provavelmente inclui Feira de Santana (que tem o SINDBEFS). Mostrada    */
/* como referência para consulta, nunca aplicada automaticamente a nenhum  */
/* cálculo do app.                                                         */
/* ======================================================================= */
export const REFERENCIA_SALARIAL = {
  fonte: "SINDECOBE — Sindicato dos Trabalhadores do Ramo de Beleza do Estado da Bahia",
  documento: "Convenção Coletiva de Trabalho 2025/2027 (vigente desde 01/05/2025)",
  pisos: [
    { funcao: "Barbeiro e Cabeleireiro", valor: 1699.21 },
    { funcao: "Manicure e Pedicure", valor: 1530.0 },
    { funcao: "Auxiliar de cabeleireiro", valor: 1530.0 },
    { funcao: "Recepcionista", valor: 1610.45 },
    { funcao: "Gerente", valor: 2013.04 },
  ],
  beneficio: { nome: "Plano de Assistência e Cuidado Pessoal (odontológico, seguro de vida, auxílio funeral e natalidade)", valor: 31.9 },
};
