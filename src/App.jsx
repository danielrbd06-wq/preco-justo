import React, { useState, useEffect, useMemo, useCallback, useRef, createContext, useContext, useLayoutEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend, PieChart, Pie,
  ComposedChart, ReferenceArea, ReferenceLine, ScatterChart, Scatter, ZAxis, Area,
} from "recharts";
import {
  Calculator, LayoutDashboard, MapPin, Plus, Trash2, Save, AlertTriangle,
  CheckCircle2, ShieldCheck, Clock3, Sparkles, Info, Building2,
  Landmark, PiggyBank, TrendingUp, TrendingDown, HelpCircle,
  Download, Printer, X, Pencil, Sun, Moon, Monitor, Settings2, Share2, ChevronDown, CalendarCheck, Package,
  Scissors, Hand, Flower2, CreditCard,
} from "lucide-react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import { useRegisterSW } from "virtual:pwa-register/react";
import { montarCopia, lerCopia, nomeArquivoCopia } from "./copiaSeguranca.js";
import {
  fmtBRL, fmtPct, N, normalizarValorBR, ANEXO_III, ANEXO_V,
  aliquotaEfetiva, VINCULOS_PROFISSIONAL, vinculoDe, calcularComissaoEquipe, comissaoEfetiva, FORMAS_PAGAMENTO,
  calcularTaxaRecebimento, taxaEfetiva, computeNegocioDerivado, converterParaDias, precoUnitarioItem, custoMensalInsumoCompartilhado,
  calcularValorItemVariavel, somaCustosVariaveis, calcularServico, SEMANAS_POR_MES_CALENDARIO, pontoEquilibrioSemanal, calcularReverso,
  calcularUnificado, calcularParaExibicao, montarDREMensal, montarDRE, calcularIndicadoresGerenciais, calcularPrecoMinimoPacote,
  distanciaKm, mediana, ultimoPrecoPorConcorrente, pisoDoServico,
  FONTES_PRECO, DIAS_PRECO_ANTIGO, diasDesde, posicaoNaConcorrencia, linhasPlanilhaObservatorio,
  parceiroValido, parcelaParceiro,
} from "./calculos.js";

/* ======================================================================= */
/* TOKENS — claro e escuro. Hex exatos do brandbook em backgrounds, marca  */
/* e gráficos; duas variantes adicionadas de forma deliberada (ver aviso   */
/* no chat): "danger" (não existia na paleta) e as "*Text" (mesma cor,     */
/* escurecida só o suficiente para passar 4.5:1 como texto pequeno).      */
/* ======================================================================= */
const TOKENS = {
  claro: {
    bg: "#F5F7FA", surface: "#FFFFFF", surfaceAlt: "#EEF1F7",
    text: "#0F172A", textMuted: "#5B6472",
    border: "#E2E8F0", borderStrong: "#CBD5E1",
    shadow: "0 1px 2px rgba(15,23,42,.06), 0 8px 24px rgba(15,23,42,.06)",
    primary: "#7861FF", primaryText: "#6247E0", primarySoft: "#EFEBFF", onPrimary: "#FFFFFF",
    secondary: "#4A90FF", secondaryText: "#2E6FE0", secondarySoft: "#E8F1FF", onSecondary: "#FFFFFF",
    // successText escurecido de #049379 p/ #037A65 (mesmo matiz): o tom original não passava
    // em AA (3.44:1 sobre successSoft, 3.85:1 sobre surface) — medido via fórmula de luminância
    // relativa do WCAG 2.1. Este novo tom passa em ambos (4.73:1 / 5.28:1). Ajuste de token —
    // avisar quem cuida da identidade visual antes de propagar pra outras telas.
    success: "#00CBA7", successText: "#037A65", successSoft: "#E1F7F2", onSuccess: "#0F172A",
    warning: "#FFC857", warningText: "#8A6416", warningSoft: "#FFF6E2", onWarning: "#0F172A",
    danger: "#C23652", dangerSoft: "#FCE7EA", onDanger: "#FFFFFF",
  },
  escuro: {
    bg: "#0F172A", surface: "#151B2E", surfaceAlt: "#1B2338",
    text: "#F5F7FA", textMuted: "#94A3B8",
    border: "#28304A", borderStrong: "#384267",
    shadow: "none",
    primary: "#8F7CFF", primaryText: "#B7ACFF", primarySoft: "rgba(143,124,255,.16)", onPrimary: "#0F172A",
    secondary: "#5FA0FF", secondaryText: "#8FBBFF", secondarySoft: "rgba(95,160,255,.16)", onSecondary: "#0F172A",
    success: "#00E0B8", successText: "#00E0B8", successSoft: "rgba(0,224,184,.16)", onSuccess: "#0F172A",
    warning: "#FFD27A", warningText: "#FFD27A", warningSoft: "rgba(255,210,122,.16)", onWarning: "#0F172A",
    danger: "#FF8FA0", dangerSoft: "rgba(255,143,160,.16)", onDanger: "#0F172A",
  },
};
const GRADIENTE = "linear-gradient(135deg, #7861FF, #4A90FF, #00CBA7)";

const ThemeCtx = createContext(null);
const useT = () => useContext(ThemeCtx);

/* ======================================================================= */
/* Utilitários                                                             */
/* ======================================================================= */
const uid = () => Math.random().toString(36).slice(2, 10);

async function comRetry(fn, tentativas = 1) {
  let ultimoErro;
  for (let i = 0; i <= tentativas; i++) {
    try {
      return await fn();
    } catch (e) {
      ultimoErro = e;
      if (i < tentativas) await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
  }
  throw ultimoErro;
}

/* ======================================================================= */
/* Fila de sincronização silenciosa — se salvar falhar (rede instável,     */
/* storage remoto fora do ar), a gravação fica pendente e o app tenta de   */
/* novo sozinho quando a conexão voltar. Nunca interrompe nem alarma quem  */
/* está usando o app com um banner de erro — importante numa demonstração  */
/* ao vivo com internet ruim. Dado real nunca é perdido: cache local puro  */
/* (localStorage direto, que não depende de rede) guarda a última versão   */
/* de cada chave imediatamente, então uma leitura sempre encontra algo,    */
/* mesmo que a sincronização "oficial" ainda não tenha confirmado.         */
/* ======================================================================= */
const PREFIXO_CACHE_LOCAL = "preco-justo:cache-local:";
function salvarCacheLocal(key, value) {
  try { window.localStorage.setItem(PREFIXO_CACHE_LOCAL + key, value); } catch { /* sem localStorage disponível — nada a fazer, silencioso */ }
}
function lerCacheLocal(key) {
  try { return window.localStorage.getItem(PREFIXO_CACHE_LOCAL + key); } catch { return null; }
}

let filaPendente = []; // [{ key, value, tipo: 'set'|'delete' }] — operações que falharam e ainda não confirmaram
let sincronizandoFila = false;

async function tentarEsvaziarFilaPendente() {
  if (sincronizandoFila || filaPendente.length === 0) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return; // nem tenta se o navegador já sabe que está offline
  sincronizandoFila = true;
  const pendentesAgora = [...filaPendente];
  for (const item of pendentesAgora) {
    try {
      if (item.tipo === "delete") await window.storage.delete(item.key, false);
      else await window.storage.set(item.key, item.value);
      filaPendente = filaPendente.filter((f) => f !== item);
    } catch {
      // continua na fila — tenta de novo na próxima janela (evento online ou intervalo)
    }
  }
  sincronizandoFila = false;
}

if (typeof window !== "undefined") {
  window.addEventListener("online", tentarEsvaziarFilaPendente);
  setInterval(tentarEsvaziarFilaPendente, 20000); // rede de segurança, caso o evento "online" não dispare no navegador
}

/* Grava com fallback: cache local primeiro (síncrono, nunca falha de       */
/* verdade), depois tenta o storage "oficial" — se falhar, entra na fila    */
/* silenciosa em vez de mostrar qualquer aviso.                             */
function salvarComFallback(key, value) {
  salvarCacheLocal(key, value);
  comRetry(() => window.storage.set(key, value)).catch(() => {
    filaPendente = [...filaPendente.filter((f) => f.key !== key), { key, value, tipo: "set" }];
  });
}

/* Exclui com o mesmo espírito: some do cache local na hora, e se o storage */
/* oficial não confirmar agora, tenta de novo sozinho depois.               */
function excluirComFallback(key) {
  try { window.localStorage.removeItem(PREFIXO_CACHE_LOCAL + key); } catch {}
  comRetry(() => window.storage.delete(key, false)).catch(() => {
    filaPendente = [...filaPendente.filter((f) => f.key !== key), { key, tipo: "delete" }];
  });
}

/* Lê com fallback: tenta o storage oficial; se falhar, usa o cache local   */
/* mais recente em vez de propagar o erro pra quem chamou.                  */
async function lerComFallback(key) {
  try {
    const r = await comRetry(() => window.storage.get(key, false));
    if (r?.value !== undefined) { salvarCacheLocal(key, r.value); return r.value; }
  } catch { /* cai pro cache local abaixo */ }
  return lerCacheLocal(key);
}

/* Lista chaves por prefixo com fallback de verdade — é aqui que estava o bug real. Antes,  */
/* código como "servicos:", "fechamento:" etc. só chamava window.storage.list(), que é uma  */
/* API que SÓ existe dentro do sandbox de artifacts do Claude. No site publicado de verdade */
/* (fora do Claude), window.storage nem existe — a chamada quebrava, caía no catch, e a     */
/* lista voltava vazia sempre, mesmo com tudo salvo corretamente no localStorage. Cada save  */
/* já grava no cache local (salvarCacheLocal) com esse mesmo prefixo — então dá pra listar   */
/* direto do localStorage, sem depender de API nenhuma. Mescla com window.storage.list()     */
/* quando ele existir, pra não perder nada que só esteja confirmado lá.                      */
async function listarComFallback(prefixo) {
  const chaves = new Set();
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const chaveArmazenada = window.localStorage.key(i);
      if (chaveArmazenada && chaveArmazenada.startsWith(PREFIXO_CACHE_LOCAL + prefixo)) {
        chaves.add(chaveArmazenada.slice(PREFIXO_CACHE_LOCAL.length));
      }
    }
  } catch { /* localStorage indisponível — segue só com o que window.storage.list trouxer, se trouxer */ }
  try {
    const r = await comRetry(() => window.storage.list(prefixo, false));
    (r?.keys || []).forEach((k) => chaves.add(k));
  } catch { /* window.storage só existe dentro do Claude — fora dele, o cache local acima já resolve */ }
  return Array.from(chaves);
}

/* Bloco 9: evento disparado antes de o app recarregar para a versão nova e  */
/* antes de baixar a cópia de segurança. Quem tem algo esperando para ser    */
/* salvo escuta e salva na hora.                                             */
const EVENTO_SALVAR_PENDENTES = "preco-justo:salvar-pendentes";

/* Rascunhos (Bloco 9): o que está sendo digitado num formulário que ainda   */
/* não foi salvo (serviço novo, fechamento do mês) fica guardado no          */
/* aparelho, para sobreviver à troca de aba, ao recarregar e à atualização. */
const CHAVE_RASCUNHO_SERVICO = "rascunho:servico-novo";
const chaveRascunhoFechamento = (mes) => `rascunho:fechamento:${mes}`;
async function lerRascunho(chave) {
  const texto = await lerComFallback(chave);
  if (!texto) return null;
  try { return JSON.parse(texto); } catch { return null; }
}

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/* ======================================================================= */
/* Dados reais — Google Places, coletados nesta sessão (Feira de Santana)  */
/* ======================================================================= */
/* A data exata da coleta não foi registrada no código. O que dá pra       */
/* comprovar é o limite: os dados já estavam no build de 16/08/2026. Por    */
/* isso a tela mostra "até agosto de 2026" e não uma data inventada. Ao     */
/* fazer uma nova coleta, preencha `data` (AAAA-MM-DD) e a tela passa a     */
/* mostrar a data exata.                                                    */
const COLETA_ESTABELECIMENTOS = {
  fonte: "Google Maps (perfis públicos via Google Places)",
  data: null,
  limiteComprovado: "agosto de 2026",
};
const ESTABELECIMENTOS_REAIS = [
  { nome: "Glamour Beauty Studio", tipo: "Salão", bairro: "Papagaio", cidade: "Feira de Santana", avaliacao: 4.9, avaliacoes: 75 },
  { nome: "Espaço de Beleza Loy Ramos", tipo: "Salão", bairro: "Santa Mônica", cidade: "Feira de Santana", avaliacao: 4.9, avaliacoes: 282 },
  { nome: "Salão Casal 20 - Centro de Estética", tipo: "Salão", bairro: "Centro", cidade: "Feira de Santana", avaliacao: 4.7, avaliacoes: 568 },
  { nome: "Studio de Beleza Fernanda Freitas", tipo: "Salão", bairro: "Santa Mônica", cidade: "Feira de Santana", avaliacao: 4.6, avaliacoes: 76 },
  { nome: "Maison Laine Coiffeur", tipo: "Salão", bairro: "Capuchinhos", cidade: "Feira de Santana", avaliacao: 4.6, avaliacoes: 153 },
  { nome: "Your Passion Beauty Space", tipo: "Salão", bairro: "Brasília", cidade: "Feira de Santana", avaliacao: 4.5, avaliacoes: 266 },
  { nome: "Instituto de Beleza Korpo & Rosto", tipo: "Salão", bairro: "Centro", cidade: "Feira de Santana", avaliacao: 4.9, avaliacoes: 60 },
  { nome: "Mirian Centro de Beleza", tipo: "Salão", bairro: "Centro", cidade: "Feira de Santana", avaliacao: 4.6, avaliacoes: 23 },
  { nome: "Barbearia Titans", tipo: "Barbearia", bairro: "Capuchinhos", cidade: "Feira de Santana", avaliacao: 5.0, avaliacoes: 112 },
  { nome: "Dom Mustache Barbearia", tipo: "Barbearia", bairro: "Santa Mônica", cidade: "Feira de Santana", avaliacao: 4.9, avaliacoes: 460 },
  { nome: "Barbearia Renildo Barber", tipo: "Barbearia", bairro: "Centro", cidade: "Feira de Santana", avaliacao: 5.0, avaliacoes: 233 },
  { nome: "Os Boleiros Barber Shop", tipo: "Barbearia", bairro: "Caseb", cidade: "Feira de Santana", avaliacao: 4.8, avaliacoes: 70 },
  { nome: "Valmir Barber", tipo: "Barbearia", bairro: "São João", cidade: "Feira de Santana", avaliacao: 4.9, avaliacoes: 29 },
  { nome: "Will Barber Barbearia (Sim)", tipo: "Barbearia", bairro: "Sim", cidade: "Feira de Santana", avaliacao: 5.0, avaliacoes: 865 },
  { nome: "Alphazone Barbearia", tipo: "Barbearia", bairro: "Calumbi", cidade: "Feira de Santana", avaliacao: 5.0, avaliacoes: 113 },
  { nome: "Will Barber Barbearia (Parque Ipê)", tipo: "Barbearia", bairro: "Parque Ipê", cidade: "Feira de Santana", avaliacao: 5.0, avaliacoes: 410 },
  { nome: "Studio Que Beleza", tipo: "Salão", bairro: "Garcia", cidade: "Salvador", avaliacao: 5.0, avaliacoes: 232 },
  { nome: "Cesar Beauty Studio", tipo: "Salão", bairro: "Caminho das Árvores", cidade: "Salvador", avaliacao: 5.0, avaliacoes: 93 },
  { nome: "Espaço Performance", tipo: "Salão", bairro: "Pituba", cidade: "Salvador", avaliacao: 4.5, avaliacoes: 259 },
  { nome: "Studio Baroni", tipo: "Salão", bairro: "Pituba", cidade: "Salvador", avaliacao: 4.9, avaliacoes: 263 },
  { nome: "Instituto de Beleza de Brotas", tipo: "Salão", bairro: "Brotas", cidade: "Salvador", avaliacao: 5.0, avaliacoes: 136 },
  { nome: "Helena Correia Salão de Beleza", tipo: "Salão", bairro: "Brotas", cidade: "Salvador", avaliacao: 5.0, avaliacoes: 150 },
  { nome: "Escritório da Beleza Hair Spa", tipo: "Salão", bairro: "Caminho das Árvores", cidade: "Salvador", avaliacao: 5.0, avaliacoes: 79 },
  { nome: "Jacques Janine", tipo: "Salão", bairro: "Caminho das Árvores", cidade: "Salvador", avaliacao: 4.4, avaliacoes: 340 },
  { nome: "Barbearia Dom Barbudo Barber Club", tipo: "Barbearia", bairro: "Caminho das Árvores", cidade: "Salvador", avaliacao: 5.0, avaliacoes: 1470 },
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
const REFERENCIA_SALARIAL = {
  fonte: "SINDECOBE — Sindicato dos Trabalhadores do Ramo de Beleza do Estado da Bahia",
  documento: "Convenção Coletiva de Trabalho 2025/2027 (vigente desde 01/05/2025)",
  pisos: [
    { funcao: "Barbeiro e Cabeleireiro", valor: 1699.21 },
    { funcao: "Manicure e Pedicure", valor: 1530.00 },
    { funcao: "Auxiliar de cabeleireiro", valor: 1530.00 },
    { funcao: "Recepcionista", valor: 1610.45 },
    { funcao: "Gerente", valor: 2013.04 },
  ],
  beneficio: { nome: "Plano de Assistência e Cuidado Pessoal (odontológico, seguro de vida, auxílio funeral e natalidade)", valor: 31.90 },
};

const NEGOCIO_PADRAO = {
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
    nomeResponsavel: "", nomeFantasia: "", cnpj: "",
    segmento: null, modeloOperacao: null,
    cidade: "", estado: "",
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
function gerarDadosExemplo() {
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
    diasMes: "26", horasDia: "8", numeroProfissionais: "2",
    proLabore: "2200",
    regime: "simples", rbt12: "90000", folha12: "22000", atividadeSempreAnexoIII: true,
    capitalInvestido: "8000", taxaRetorno: "0.8",
  };

  const agora = Date.now();
  const servicos = [
    {
      id: uid(), nome: "Corte Masculino", categoria: "Cabelo", criadoEm: agora, editadoEm: agora, modo: "descobrir",
      custosVariaveis: [{ id: uid(), nome: "Produtos (gel, pomada)", modo: "direto", valor: "3" }],
      comissaoPct: 30, taxaCartaoPct: 3, margemPct: 25, horasPorAtendimento: 0.5, atendimentosMes: 120,
      precoCobrado: null, precoConfirmado: 20.22, precoSeparadoReferencia: null,
    },
    {
      id: uid(), nome: "Escova", categoria: "Cabelo", criadoEm: agora, editadoEm: agora, modo: "descobrir",
      custosVariaveis: [{ id: uid(), nome: "Produto finalizador", modo: "direto", valor: "5" }],
      comissaoPct: 30, taxaCartaoPct: 3, margemPct: 25, horasPorAtendimento: 1, atendimentosMes: 55,
      precoCobrado: null, precoConfirmado: 37.66, precoSeparadoReferencia: null,
    },
    {
      id: uid(), nome: "Coloração", categoria: "Cabelo", criadoEm: agora, editadoEm: agora, modo: "descobrir",
      custosVariaveis: [
        { id: uid(), nome: "Tinta e oxidante", modo: "direto", valor: "35" },
        { id: uid(), nome: "Luvas e touca", modo: "direto", valor: "2" },
      ],
      comissaoPct: 30, taxaCartaoPct: 3, margemPct: 30, horasPorAtendimento: 1.5, atendimentosMes: 28,
      precoCobrado: null, precoConfirmado: 160.76, precoSeparadoReferencia: null,
    },
  ];

  return { negocio, servicos };
}

/* Escolha entre um valor médio do negócio e um valor próprio do serviço:     */
/* a comissão média da equipe (Bloco 4) e a taxa média de recebimento        */
/* (Bloco 5) usam o mesmo seletor e a mesma caixa de composição.             */
function SeletorOrigem({ rotulo, ajuda, faq, ariaLabel, opcoes, valor, onChange }) {
  const t = useT();
  return (
    <div>
      <span className="block text-xs font-medium leading-snug" style={{ color: t.textMuted }}>
        {rotulo}
        {ajuda && <Ajuda faq={faq} texto={ajuda} />}
      </span>
      <div className="flex gap-1 p-1 rounded-lg mt-1" role="radiogroup" aria-label={ariaLabel} style={{ background: t.surfaceAlt }}>
        {opcoes.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={valor === o.id} onClick={() => onChange(o.id)}
            className="btn-press flex-1 rounded-md px-2 py-1.5 text-xs font-medium leading-snug"
            style={{ background: valor === o.id ? t.surface : "transparent", color: valor === o.id ? t.text : t.textMuted, boxShadow: valor === o.id ? t.shadow : "none", border: `1px solid ${valor === o.id ? t.border : "transparent"}`, transition: "background .18s ease, color .18s ease, box-shadow .18s ease" }}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* Mostra de onde uma média saiu. A lista tem largura máxima para o valor    */
/* não ficar longe do nome em telas largas.                                  */
function ComposicaoMedia({ titulo, linhas, total }) {
  const t = useT();
  return (
    <div className="pop-in rounded-xl p-3 text-xs" style={{ background: t.primarySoft }}>
      <p style={{ color: t.text }}>{titulo}</p>
      <ul className="mt-1.5 space-y-0.5 max-w-sm">
        {linhas.map((l) => (
          <li key={l.id} className="flex justify-between gap-3" style={{ color: t.textMuted }}>
            <span className="min-w-0 truncate">{l.nome}</span>
            <span className="font-num shrink-0">{l.valor}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 font-semibold" style={{ color: t.primaryText }}>{total}</p>
    </div>
  );
}

function AvisoMediaIndisponivel({ children }) {
  const t = useT();
  return (
    <p className="text-[11px] flex items-start gap-1" style={{ color: t.warningText }}>
      <AlertTriangle size={12} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/* Comissão + taxa de cartão do serviço. Com a comissão média da equipe      */
/* (Bloco 4) ou a taxa média de recebimento (Bloco 5) disponível, o usuário  */
/* escolhe entre a média e um valor próprio do serviço, e vê de onde a média */
/* saiu. Usado nos dois modos da Calculadora.                                */
function BlocoComissaoETaxa({ nd, comissaoPct, setComissaoPct, comissaoModo, setComissaoModo, taxaCartaoPct, setTaxaCartaoPct, taxaModo, setTaxaModo,
  comissaoEhCotaParte = false, setComissaoEhCotaParte, parcelaAtual = 0 }) {
  const t = useT();
  const equipe = nd?.comissaoEquipe;
  const media = nd?.taxaRecebimento;
  const locatario = nd?.perfil?.modeloOperacao === "locatario";

  const campoTaxa = (
    <CampoPct label="Taxa de cartão/Pix" value={taxaCartaoPct} onChange={setTaxaCartaoPct}
      ajuda="A taxa que a maquininha ou o banco cobra em cima da venda. Confira no seu extrato — deixar em 0 faz o preço vir mais barato do que deveria." faq="taxa-media-recebimento" />
  );
  // Bloco 11: comissão própria que é cota-parte de profissional-parceiro.
  const opcaoCotaParte = !locatario && nd?.temParceriaValida && setComissaoEhCotaParte && (
    <label className="flex items-start gap-2 text-xs" style={{ color: t.text }}>
      <input type="checkbox" className="mt-0.5" checked={!!comissaoEhCotaParte} onChange={(e) => setComissaoEhCotaParte(e.target.checked)} />
      <span>Esta comissão é a cota-parte de um profissional-parceiro (Lei do Salão-Parceiro) e fica fora da receita do salão.</span>
    </label>
  );
  const notaParceria = parcelaAtual > 0 && (
    <p className="pop-in text-[11px] flex items-start gap-1" style={{ color: t.successText }}>
      <CheckCircle2 size={12} className="mt-0.5 shrink-0" />
      <span>
        Parceria: {fmtPct(parcelaAtual)} do preço é cota-parte de parceiro e fica fora da receita do salão. O imposto e a
        taxa da maquininha entram no preço só sobre o resto.
      </span>
    </p>
  );
  const campoPropria = locatario ? (
    <CampoPct label="% que fica com o salão" value={comissaoPct} onChange={setComissaoPct}
      ajuda="Se o dono do salão fica com uma porcentagem de cada serviço seu, informe aqui. Se você paga um aluguel fixo por mês, deixe 0: o aluguel entra nas Contas Fixas." />
  ) : (
    <CampoPct label="Comissão do profissional" value={comissaoPct} onChange={setComissaoPct}
      ajuda="Quanto do preço desse serviço vai pro profissional que atende, em %. Se você é sozinho(a), geralmente é 0 — o que sobra é seu pró-labore." faq="comissao-parceiros" />
  );

  const avisoComissao = !equipe && comissaoModo === "equipe" && (
    <AvisoMediaIndisponivel>
      Este serviço usava a comissão média da equipe, mas ela não está mais disponível (precisa de duas ou mais
      pessoas atendendo no cadastro de Profissionais). Usando a comissão abaixo.
    </AvisoMediaIndisponivel>
  );
  const avisoTaxa = !media && taxaModo === "negocio" && (
    <AvisoMediaIndisponivel>
      Este serviço usava a taxa média do negócio, mas ela não está disponível (as formas de pagamento, na aba
      Negócio, precisam somar 100% das vendas). Usando a taxa abaixo.
    </AvisoMediaIndisponivel>
  );
  // Só quando a taxa digitada no serviço é a que vale: com a média do negócio,
  // um 0% é o que o usuário informou (ex.: recebe tudo em dinheiro).
  const avisoTaxaZero = N(taxaCartaoPct) === 0 && (
    <p className="text-[11px] flex items-start gap-1" style={{ color: t.warningText }}>
      <Info size={12} className="mt-0.5 shrink-0" />
      <span>Taxa de cartão em 0% — se você recebe por maquininha, dá uma olhada no extrato antes de finalizar.</span>
    </p>
  );
  const dicaMedia = !media && (
    <p className="text-[11px]" style={{ color: t.textMuted }}>
      Recebe por várias formas (Pix, débito, crédito)? Na aba Negócio, em "Formas de pagamento", o app calcula a
      taxa média para você.
    </p>
  );

  // Sem nenhuma média disponível: os dois campos lado a lado.
  if (!equipe && !media) {
    return (
      <div className="space-y-2">
        {avisoComissao}
        {avisoTaxa}
        <div className="grid grid-cols-2 gap-2">{campoPropria}{campoTaxa}</div>
        {opcaoCotaParte}
        {avisoTaxaZero}
        {dicaMedia}
        {notaParceria}
      </div>
    );
  }

  // Com alguma média: cada bloco ocupa a linha inteira, como a margem logo abaixo.
  const blocoComissao = equipe ? (
    <div className="space-y-2">
      <SeletorOrigem rotulo="Comissão do profissional" ariaLabel="Origem da comissão" faq="comissao-parceiros"
        ajuda="Use a média da equipe quando qualquer pessoa pode fazer este serviço: o preço fica um só, e a comissão média é ponderada pelos atendimentos de cada uma. Escolha uma comissão própria se este serviço tem regra diferente."
        valor={comissaoModo} onChange={setComissaoModo}
        opcoes={[{ id: "equipe", label: `Média da equipe · ${fmtPct(equipe.pct)}` }, { id: "propria", label: "Própria deste serviço" }]} />
      {comissaoModo === "equipe" ? (
        <ComposicaoMedia
          titulo={equipe.ponderada ? "Média ponderada pelos atendimentos de cada pessoa:" : "Média simples (falta o número de atendimentos de alguém no cadastro):"}
          linhas={equipe.participantes.map((pp) => ({
            id: pp.id,
            nome: `${pp.nome}${pp.vinculo === "dono" ? " (dono/a)" : pp.vinculo === "parceiro" ? (pp.cotaForaDaReceita ? " (parceiro)" : " (parceiro, conta como comissão)") : ""}`,
            valor: `${fmtPct(pp.pct)}${equipe.ponderada ? ` · ${pp.atendimentos} atend.` : ""}`,
          }))}
          total={`Comissão usada no preço: ${fmtPct(equipe.pct)}`} />
      ) : <>{campoPropria}{opcaoCotaParte}</>}
    </div>
  ) : (
    <div className="space-y-2">{avisoComissao}{campoPropria}{opcaoCotaParte}</div>
  );

  const blocoTaxa = media ? (
    <div className="space-y-2">
      <SeletorOrigem rotulo="Taxa de cartão/Pix" ariaLabel="Origem da taxa de cartão" faq="taxa-media-recebimento"
        ajuda="A média do negócio vem das formas de pagamento informadas na aba Negócio, pesadas pela parte das vendas de cada uma. Use uma taxa própria se este serviço é pago de um jeito diferente do resto (ex.: pacotes sempre parcelados)."
        valor={taxaModo} onChange={setTaxaModo}
        opcoes={[{ id: "negocio", label: `Média do negócio · ${fmtPct(media.pct, 2)}` }, { id: "propria", label: "Própria deste serviço" }]} />
      {taxaModo === "negocio" ? (
        <ComposicaoMedia
          titulo="Média ponderada pela parte das vendas de cada forma de pagamento:"
          linhas={media.itens.map((i) => ({
            id: i.id, nome: i.label,
            valor: `${fmtPct(i.taxa, 2)} · ${fmtPct(i.participacao, 0)} das vendas`,
          }))}
          total={`Taxa usada no preço: ${fmtPct(media.pct, 2)}`} />
      ) : (
        <>{campoTaxa}{avisoTaxaZero}</>
      )}
    </div>
  ) : (
    <div className="space-y-2">{avisoTaxa}{campoTaxa}{avisoTaxaZero}{dicaMedia}</div>
  );

  return <div className="space-y-4">{blocoComissao}{blocoTaxa}{notaParceria}</div>;
}

/* ======================================================================= */
/* Logo — marca original: cérebro fundido a etiqueta de preço com check,   */
/* traço em gradiente roxo→azul→verde                                      */
/* ======================================================================= */
function LogoMark({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="pjGrad" x1="2" y1="4" x2="46" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7861FF" />
          <stop offset="0.5" stopColor="#4A90FF" />
          <stop offset="1" stopColor="#00CBA7" />
        </linearGradient>
      </defs>

      {/* Cérebro: aglomerado de círculos sobrepostos, preenchido (não mais traço fino) */}
      <g fill="url(#pjGrad)">
        <circle cx="12.5" cy="14.5" r="6.6" />
        <circle cx="7.2" cy="21.5" r="6" />
        <circle cx="9.8" cy="29.5" r="6.3" />
        <circle cx="16.8" cy="33.8" r="5.6" />
        <circle cx="18.8" cy="11.8" r="5.2" />
        <circle cx="19.8" cy="23.5" r="5.1" />
      </g>
      {/* dobrinhas do cérebro, sugeridas por cima em branco translúcido */}
      <g stroke="rgba(255,255,255,.5)" strokeWidth="1.5" strokeLinecap="round" fill="none">
        <path d="M8 15.5c2-1.8 4.6-1.8 5.8.2" />
        <path d="M6.8 23c2.3-1 5.1 0 5.7 2.3" />
        <path d="M11.6 30.4c2-1.4 4.6-.9 5.6 1" />
        <path d="M16 12.5c1.8-1.4 3.8-.9 4.7.9" />
      </g>

      {/* Etiqueta fundida ao cérebro, preenchida com o mesmo gradiente */}
      <path
        d="M24.5 15h11.7a2 2 0 012 2v10.6a2 2 0 01-.6 1.4L27.4 39.2a2 2 0 01-2.8 0l-9.6-9.6a2 2 0 010-2.8L23.4 18z"
        fill="url(#pjGrad)"
      />
      <circle cx="32.7" cy="20.3" r="2.2" fill="#fff" opacity="0.92" />
      <path d="M20.3 27.8l3.6 3.6 7.3-7.8" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function LogoWordmark({ stacked = false, size = "text-2xl" }) {
  const t = useT();
  return (
    <div className={stacked ? "text-center" : ""} style={{ lineHeight: 1.05 }}>
      <span className={`font-poppins font-bold ${size}`} style={{ color: t.text, display: stacked ? "block" : "inline" }}>Preço</span>
      {stacked ? <br /> : " "}
      <span className={`font-poppins font-bold ${size}`} style={{ color: t.success, display: stacked ? "block" : "inline" }}>Justo</span>
    </div>
  );
}

/* ======================================================================= */
/* Selo — proveniência do dado (real / calculado / aguardando / legal)     */
/* ======================================================================= */
function Selo({ tipo, children }) {
  const t = useT();
  const map = {
    real: { bg: t.successSoft, fg: t.successText, icon: ShieldCheck, label: "dado real" },
    calculado: { bg: t.primarySoft, fg: t.primaryText, icon: Sparkles, label: "calculado a partir do que você informou" },
    aguardando: { bg: t.surfaceAlt, fg: t.textMuted, icon: Clock3, label: "aguardando fonte oficial", dashed: true },
    legal: { bg: t.secondarySoft, fg: t.secondaryText, icon: Landmark, label: "conforme legislação vigente" },
  };
  const s = map[tipo];
  const Icon = s.icon;
  // Texto longo (fonte legal, documento sindical) não cabe numa "pílula": no celular
  // virava um balão de 5 linhas com o ícone solto. Acima de 45 caracteres o selo vira
  // uma nota de rodapé — mesma cor e ícone, sem fundo nem borda, alinhada à esquerda.
  const textoPlano = React.Children.toArray(children).filter((c) => typeof c === "string" || typeof c === "number").join("");
  if (textoPlano.length > 45) {
    return (
      <span className="flex items-start gap-1.5 text-[11px] leading-snug text-left" style={{ color: s.fg }}>
        <Icon size={12} strokeWidth={2.5} className="shrink-0 mt-[1px]" aria-hidden="true" />
        <span>{children}</span>
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide"
      style={{ background: s.bg, color: s.fg, border: `1px ${s.dashed ? "dashed" : "solid"} ${s.fg}55` }}
    >
      <Icon size={12} strokeWidth={2.5} />
      {children || s.label}
    </span>
  );
}

/* ======================================================================= */
/* Aviso de nova versão (Bloco 9). O app baixa a versão nova em segundo      */
/* plano e, em vez de trocar sozinho na próxima abertura (o que deixava     */
/* quem abre pelo ícone preso na versão anterior sem saber), avisa e deixa  */
/* a pessoa escolher a hora. Antes de recarregar, avisa os formulários para */
/* salvarem o que estiver pendente. Procura versão nova a cada 30 minutos e */
/* sempre que o app volta para a tela.                                      */
/* ======================================================================= */
function AvisoNovaVersao() {
  const t = useT();
  const [atualizando, setAtualizando] = useState(false);
  const [adiado, setAdiado] = useState(false);
  const { needRefresh: [precisaAtualizar], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registro) {
      if (!registro) return;
      const verificar = () => { if (navigator.onLine !== false) registro.update().catch(() => {}); };
      setInterval(verificar, 30 * 60 * 1000);
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") verificar(); });
    },
  });
  if (!precisaAtualizar || adiado) return null;
  const atualizar = () => {
    setAtualizando(true);
    window.dispatchEvent(new Event(EVENTO_SALVAR_PENDENTES));
    // Dá um instante para os salvamentos terminarem antes de recarregar.
    setTimeout(() => updateServiceWorker(true), 300);
  };
  return (
    <div role="status" aria-live="polite"
      className="pop-in no-print fixed z-[60] left-4 right-4 bottom-[88px] sm:left-auto sm:right-6 sm:bottom-6 sm:w-[380px] rounded-2xl p-4 flex items-start gap-3"
      style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: "0 12px 32px rgba(15,23,42,.18)" }}>
      <span className="shrink-0 rounded-full flex items-center justify-center" style={{ width: 32, height: 32, background: t.primarySoft, color: t.primaryText }}>
        <Sparkles size={16} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: t.text }}>Nova versão disponível</p>
        <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
          Atualize para ter as últimas melhorias. O que você digitou fica salvo.
        </p>
        <div className="flex gap-2 mt-2.5">
          <button type="button" onClick={atualizar} disabled={atualizando}
            className="btn-press touch-target inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
            style={{ background: t.primaryText, color: t.onPrimary, opacity: atualizando ? 0.8 : 1 }}>
            {atualizando && <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-r-transparent animate-spin" aria-hidden="true" />}
            {atualizando ? "Atualizando…" : "Atualizar agora"}
          </button>
          {!atualizando && (
            <button type="button" onClick={() => setAdiado(true)} className="btn-press touch-target rounded-lg px-3 py-2 text-xs font-medium" style={{ color: t.textMuted }}>
              Depois
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ======================================================================= */
/* Skeleton / Toast                                                        */
/* ======================================================================= */
function SkeletonBlock({ h = 16, w = "100%", radius = 8 }) {
  return <div className="skeleton-shimmer" style={{ height: h, width: w, borderRadius: radius }} />;
}
function SkeletonCard() {
  const t = useT();
  return (
    <div className="rounded-2xl p-5" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
      <SkeletonBlock h={14} w="40%" />
      <div className="h-3" />
      <SkeletonBlock h={28} w="70%" />
      <div className="h-4" />
      <SkeletonBlock h={10} w="90%" />
      <div className="h-2" />
      <SkeletonBlock h={10} w="60%" />
    </div>
  );
}

function useToast() {
  const t = useT();
  const [toast, setToast] = useState(null);
  const show = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }, []);
  const node = toast ? (
    <div
      className="pop-in fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full px-4 py-2.5 text-sm font-medium flex items-center gap-2"
      style={{ background: t.success, color: t.onSuccess, boxShadow: t.shadow }}
    >
      <CheckCircle2 size={15} />
      {toast}
    </div>
  ) : null;
  return { show, node };
}

/* ======================================================================= */
/* App                                                                      */
/* ======================================================================= */
const VERSAO_APP = "v7.18";
const CHAVE_TEMA = "preco-justo:tema";

/* Rede de segurança: se qualquer aba travar por um motivo que eu não       */
/* previu, mostra um jeito de voltar em vez de tela congelada/em branco.    */
class LimiteDeErro extends React.Component {
  constructor(props) { super(props); this.state = { erro: null }; }
  static getDerivedStateFromError(erro) { return { erro }; }
  componentDidCatch(erro, info) { console.error("Erro capturado pela rede de segurança:", erro, info); }
  render() {
    if (this.state.erro) {
      return (
        <div className="rounded-2xl p-8 text-center" style={{ background: "#FCE7EA", border: "1px solid #C2365255" }}>
          <AlertTriangle size={22} className="mx-auto mb-3" style={{ color: "#C23652" }} />
          <p className="font-semibold text-sm" style={{ color: "#C23652" }}>Essa tela travou</p>
          <p className="text-xs mt-1 mb-4" style={{ color: "#5B6472" }}>
            Algo deu errado ao abrir isso. Toca em voltar e tenta de novo — se acontecer sempre com o mesmo item, exclua e recrie.
          </p>
          <button
            onClick={() => { this.setState({ erro: null }); this.props.onReset && this.props.onReset(); }}
            className="btn-press rounded-xl px-4 py-2 text-sm font-semibold"
            style={{ background: "#00CBA7", color: "#0F172A" }}
          >
            Voltar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App({ onSair, nomeEstabelecimento } = {}) {
  const [temaPref, setTemaPref] = useState("automatico");
  const [temaCarregado, setTemaCarregado] = useState(false);
  const [sistemaEscuro, setSistemaEscuro] = useState(() =>
    typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)").matches : false
  );

  useLayoutEffect(() => {
    (async () => {
      const valor = await lerComFallback(CHAVE_TEMA);
      if (valor) setTemaPref(valor);
      setTemaCarregado(true);
    })();
    if (window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e) => setSistemaEscuro(e.matches);
      mq.addEventListener ? mq.addEventListener("change", handler) : mq.addListener(handler);
      return () => (mq.removeEventListener ? mq.removeEventListener("change", handler) : mq.removeListener(handler));
    }
  }, []);

  const temaResolvido = temaPref === "automatico" ? (sistemaEscuro ? "escuro" : "claro") : temaPref;
  const t = TOKENS[temaResolvido];

  const mudarTema = useCallback((novo) => {
    setTemaPref(novo);
    salvarComFallback(CHAVE_TEMA, novo);
  }, []);

  const [negocio, setNegocio] = useState(null);
  const [servicos, setServicos] = useState(null);
  const [tab, setTab] = useState("negocio");
  // Pergunta do FAQ aberta por cima da tela (a partir de uma dica "?") e
  // pergunta a destacar quando o usuário escolhe ir para a aba FAQ.
  const [explicacaoFaq, setExplicacaoFaq] = useState(null);
  const [faqAlvo, setFaqAlvo] = useState(null);
  const [tabLoading, setTabLoading] = useState(true);
  const [servicoEmEdicao, setServicoEmEdicao] = useState(null);

  const editarServico = useCallback((servico) => {
    setServicoEmEdicao(servico);
    setTab("calculadora");
  }, []);

  const carregarNegocio = useCallback(async () => {
    const valor = await lerComFallback("negocio:config");
    let parsed = NEGOCIO_PADRAO;
    try { parsed = valor ? JSON.parse(valor) : NEGOCIO_PADRAO; } catch { parsed = NEGOCIO_PADRAO; }
    setNegocio(parsed);
    const nd = computeNegocioDerivado(parsed);
    setTab(nd.configurado ? "calculadora" : "negocio");
  }, []);

  const carregarServicos = useCallback(async () => {
    try {
      const chaves = await listarComFallback("servicos:");
      const resultados = await Promise.all(
        chaves.map(async (k) => {
          const valor = await lerComFallback(k);
          try { return valor ? JSON.parse(valor) : null; } catch { return null; }
        })
      );
      setServicos(resultados.filter(Boolean).sort((a, b) => b.criadoEm - a.criadoEm));
    } catch {
      setServicos([]);
    }
  }, []);

  useEffect(() => { carregarNegocio(); carregarServicos(); }, [carregarNegocio, carregarServicos]);

  const salvarNegocio = useCallback((novo) => {
    // Guia o usuário pro próximo passo só na PRIMEIRA vez que o negócio fica configurado —
    // depois disso, quem já usa o app não quer ser jogado de aba toda vez que ajusta um valor.
    const configuradoAntes = negocio ? computeNegocioDerivado(negocio).configurado : false;
    const configuradoDepois = computeNegocioDerivado(novo).configurado;
    setNegocio(novo);
    salvarComFallback("negocio:config", JSON.stringify(novo));
    if (!configuradoAntes && configuradoDepois) {
      setTimeout(() => setTab("calculadora"), 1100);
    }
  }, [negocio]);

  const salvarServico = useCallback((registro) => {
    setServicos((prev) => {
      const lista = prev || [];
      const existe = lista.some((s) => s.id === registro.id);
      return existe ? lista.map((s) => (s.id === registro.id ? registro : s)) : [registro, ...lista];
    });
    salvarComFallback(`servicos:${registro.id}`, JSON.stringify(registro));
  }, []);

  const removerServico = useCallback((id) => {
    setServicos((prev) => (prev || []).filter((s) => s.id !== id));
    excluirComFallback(`servicos:${id}`);
  }, []);

  // Carrega negócio + 3 serviços de exemplo, prontos pra demonstração completa
  // (Painel, DRE, gráficos). Sobrescreve o que já existe — a confirmação de
  // "tem certeza" acontece ANTES, dentro do componente Negócio. Remove os
  // serviços antigos do storage de verdade (não só do estado local), senão
  // eles voltariam a aparecer depois de um reload.
  // O perfil (nome, segmento, modelo, cidade) é do usuário, não do exemplo: ele é
  // mantido. Sem isso o perfil voltava vazio, o segmento sumia e o assistente
  // inicial reaparecia como se nunca tivesse sido preenchido (Issue #4).
  const carregarExemplo = useCallback(() => {
    const { negocio: exemploBase, servicos: servicosExemplo } = gerarDadosExemplo();
    const negocioExemplo = negocio?.perfil?.segmento ? { ...exemploBase, perfil: negocio.perfil } : exemploBase;
    setNegocio(negocioExemplo);
    salvarComFallback("negocio:config", JSON.stringify(negocioExemplo));
    setServicos((prevServicos) => {
      (prevServicos || []).forEach((s) => excluirComFallback(`servicos:${s.id}`));
      return servicosExemplo;
    });
    servicosExemplo.forEach((s) => salvarComFallback(`servicos:${s.id}`, JSON.stringify(s)));
    setTab("calculadora");
  }, [negocio]);

  useEffect(() => {
    setTabLoading(true);
    const tm = setTimeout(() => setTabLoading(false), 320);
    return () => clearTimeout(tm);
  }, [tab]);

  const nd = useMemo(() => (negocio ? computeNegocioDerivado(negocio) : null), [negocio]);

  return (
    <ThemeCtx.Provider value={t}>
    <FaqLinkContext.Provider value={setExplicacaoFaq}>
      <AvisoNovaVersao />
      {/* 100dvh em vez de 100vh: no mobile, 100vh é calculado com a barra de endereço do  */}
      {/* navegador ESCONDIDA (o maior viewport possível) — não com o que está realmente  */}
      {/* visível. Como a barra de baixo é fixed;bottom:0, ela ficava posicionada relativa */}
      {/* a esse viewport maior, empurrada pra fora da área visível até a barra de         */}
      {/* endereço sumir sozinha (o que só costuma acontecer rolando a tela) — exatamente  */}
      {/* o "só aparece quando rolo pro final" relatado. 100dvh recalcula ao vivo conforme */}
      {/* a barra do navegador aparece/some, e é o jeito atual recomendado de resolver     */}
      {/* isso (suporte já é universal nos navegadores mobile modernos).                   */}
      <div style={{ background: t.bg, minHeight: "100dvh", color: t.text, transition: "background .2s ease, color .2s ease" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
          * { font-family: 'Poppins', sans-serif; }
          .font-poppins { font-family: 'Poppins', sans-serif; }
          .font-num { font-variant-numeric: tabular-nums; }
          /* Tipografia de leitura (Bloco 7). Alinhamento sempre à esquerda — nunca        */
          /* justificado: em colunas estreitas e sem hifenização o justificado abre "rios" */
          /* de espaço entre as palavras e piora a leitura (WCAG 1.4.8).                   */
          /* pretty: evita palavra sozinha na última linha dos parágrafos.                */
          /* balance: equilibra o tamanho das linhas em títulos curtos.                    */
          p, li, label { text-wrap: pretty; }
          h1, h2, h3, .font-semibold { text-wrap: balance; }
          /* Largura máxima de linha (~75 caracteres): no computador os textos de apoio   */
          /* corriam a largura inteira dos cartões. Blocos centralizados continuam no meio. */
          main p { max-width: 75ch; }
          /* Legendas pequenas (10-12px): "ch" encolhe com a letra e 75ch viraria ~450px,  */
          /* quebrando frases curtas em duas linhas com vazio à direita. Limite fixo maior. */
          main p:where(.text-xs, .text-\\[11px\\], .text-\\[10px\\]) { max-width: 42rem; }
          main .text-center p, main p.text-center { margin-left: auto; margin-right: auto; }
          .skeleton-shimmer {
            background: linear-gradient(90deg, ${t.surfaceAlt} 25%, ${t.border} 37%, ${t.surfaceAlt} 63%);
            background-size: 400% 100%;
            animation: shimmer 1.4s ease-in-out infinite;
          }
          /* Mapa da concorrência (Bloco 6): mira ao marcar um ponto; no tema escuro, as   */
          /* ruas do OpenStreetMap invertidas para não acender a tela.                    */
          .mapa-marcando, .mapa-marcando .leaflet-interactive { cursor: crosshair !important; }
          .mapa-concorrencia .leaflet-control-attribution { font-size: 10px; }
          .mapa-escuro .leaflet-tile { filter: invert(1) hue-rotate(180deg) brightness(.92) contrast(.9); }
          .mapa-escuro .leaflet-control-attribution { background: rgba(21,27,46,.85); color: #94A3B8; }
          .mapa-escuro .leaflet-control-attribution a { color: #B7ACFF; }
          .mapa-escuro .leaflet-bar a { background: #1B2338; color: #F5F7FA; border-color: #28304A; }
          @keyframes shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
          @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
          .fade-up { animation: fadeUp .3s ease both; }
          @keyframes popIn { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
          .pop-in { animation: popIn .2s cubic-bezier(.2,.8,.2,1) both; }
          /* Painel de explicação (sheet/diálogo): entrada e saída simétricas */
          @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes sheetIn { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
          .backdrop-in { animation: backdropIn .2s ease both; }
          .backdrop-out { animation: backdropIn .18s ease reverse both; }
          .sheet-in { animation: sheetIn .26s cubic-bezier(.2,.8,.2,1) both; }
          .sheet-out { animation: sheetIn .18s ease-in reverse both; }
          .btn-press { transition: transform .2s ease, opacity .2s ease, background .2s ease, border-color .2s ease, box-shadow .2s ease; }
          .btn-press:active { transform: scale(.97); }
          .tab-btn { transition: color .2s ease, background .2s ease; white-space: nowrap; }
          /* Área de toque real de 44x44px em botões de ícone pequenos, sem mudar o        */
          /* tamanho visual — hitbox invisível centralizada, maior que o ícone em si.       */
          .touch-target { position: relative; }
          .touch-target::after {
            content: ''; position: absolute; top: 50%; left: 50%;
            width: 44px; height: 44px;
            transform: translate(-50%, -50%);
          }
          /* Variante de 48x48 (mínimo recomendado pelo Material Design) pra ações de alta       */
          /* frequência em ícone pequeno: remover/excluir item e tabs do rodapé no mobile.        */
          .touch-target-48 { position: relative; }
          .touch-target-48::after {
            content: ''; position: absolute; top: 50%; left: 50%;
            width: 48px; height: 48px;
            transform: translate(-50%, -50%);
          }
          /* iOS Safari dá zoom automático ao focar <input> com font-size abaixo de 16px —        */
          /* trava o tamanho visual só nos campos em telas pequenas pra evitar esse zoom.          */
          @media (max-width: 640px) {
            input, select, textarea { font-size: 16px !important; }
          }
          /* (Removido: "html, body { overflow-x: hidden }" que existia aqui — corrigia o    */
          /* transbordo horizontal, mas quebrava o position:fixed da barra de baixo, que    */
          /* passou a "rolar junto" com a página em vez de ficar fixa na tela. overflow no   */
          /* body muda o contexto de posicionamento de elementos fixed em navegadores        */
          /* mobile — é um problema conhecido do CSS. A correção real (min-w-0 +             */
          /* overflow-hidden nos botões da barra, alguns linhas abaixo) já resolve o         */
          /* transbordo na origem, sem precisar dessa rede de segurança que tinha esse       */
          /* efeito colateral.                                                               */
          input, button, select, textarea { transition: border-color .2s ease, box-shadow .2s ease, background .2s ease; }
          input:focus-visible, button:focus-visible, select:focus-visible {
            outline: 2px solid ${t.primary}; outline-offset: 2px;
          }
          input[type=range] { accent-color: ${t.primary}; }
          ::selection { background: ${t.primarySoft}; }
          @media print {
            body { background: #fff !important; }
            .no-print { display: none !important; }
            #area-impressao { background: #fff; }
            #memorial-calculo-wrapper { display: none; }
          }
          /* Memorial de cálculo: escondido na tela sempre; só aparece na          */
          /* impressão quando o botão específico dele foi clicado (classe no body) */
          @media print {
            body.imprimindo-memorial #area-impressao,
            body.imprimindo-memorial .no-print,
            body.imprimindo-memorial .conteudo-normal-painel { display: none !important; }
            body.imprimindo-memorial #memorial-calculo-wrapper { display: block !important; }
          }
          @media (prefers-reduced-motion: reduce) {
            .skeleton-shimmer, .fade-up, .pop-in, .btn-press, input, button,
            .backdrop-in, .backdrop-out, .sheet-in, .sheet-out { animation: none !important; transition: none !important; }
          }
        `}</style>

        <Header temaPref={temaPref} mudarTema={mudarTema} onSair={onSair} nomeEstabelecimento={nomeEstabelecimento} perfil={negocio?.perfil} />
        <TabNav tab={tab} setTab={setTab} configurado={nd?.configurado} />

        <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-24 pt-6" style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom))" }}>
          {tabLoading || !negocio || servicos === null ? (
            <div className="grid gap-4 sm:grid-cols-2"><SkeletonCard /><SkeletonCard /></div>
          ) : (
            <div className="fade-up">
              <LimiteDeErro key={`${tab}-${servicoEmEdicao?.id || "novo"}`} onReset={() => { setServicoEmEdicao(null); setTab("painel"); }}>
                {tab === "negocio" && <Negocio negocio={negocio} onSalvar={salvarNegocio} servicos={servicos} onCarregarExemplo={carregarExemplo} />}
                {tab === "calculadora" && (
                  <Calculadora nd={nd} negocioConfigurado={nd?.configurado} irParaNegocio={() => setTab("negocio")}
                    servicos={servicos} onSalvarServico={salvarServico} onRemoverServico={removerServico}
                    servicoEmEdicao={servicoEmEdicao} setServicoEmEdicao={setServicoEmEdicao} onTerminarEdicao={() => setServicoEmEdicao(null)} />
                )}
                {tab === "painel" && (
                  <Painel nd={nd} negocio={negocio} servicos={servicos} onRemoverServico={removerServico} onEditarServico={editarServico} />
                )}
                {tab === "estoque" && <Estoque negocio={negocio} onSalvarNegocio={salvarNegocio} />}
                {tab === "observatorio" && <Observatorio servicos={servicos} nd={nd} cidadePerfil={negocio?.perfil?.cidade} />}
                {tab === "faq" && <Faq alvo={faqAlvo} />}
              </LimiteDeErro>
            </div>
          )}
        </main>
      </div>
      {explicacaoFaq && (
        <PainelExplicacao
          faqId={explicacaoFaq}
          onFechar={() => setExplicacaoFaq(null)}
          onVerFaq={() => { setFaqAlvo({ id: explicacaoFaq, em: Date.now() }); setTab("faq"); }}
        />
      )}
    </FaqLinkContext.Provider>
    </ThemeCtx.Provider>
  );
}

/* ======================================================================= */
/* Header + seletor de tema                                                */
/* ======================================================================= */
function Header({ temaPref, mudarTema, onSair, nomeEstabelecimento, perfil }) {
  const t = useT();
  const [abertoMenu, setAbertoMenu] = useState(false);
  const opcoes = [
    { id: "claro", label: "Claro", icon: Sun },
    { id: "escuro", label: "Escuro", icon: Moon },
    { id: "automatico", label: "Automático", icon: Monitor },
  ];
  const IconeAtual = opcoes.find((o) => o.id === temaPref)?.icon || Monitor;
  const nomeExibido = nomeEstabelecimento || perfil?.nomeFantasia || "Calcule. Analise. Decida.";
  const localExibido = perfil?.cidade ? ` · ${perfil.cidade}${perfil.estado ? `, ${perfil.estado}` : ""}` : "";

  return (
    <header className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-2">
      <div className="flex items-center gap-3">
        <LogoMark size={40} />
        <div className="min-w-0">
          <LogoWordmark size="text-xl" />
          <p className="text-[11px] mt-0.5 truncate" style={{ color: t.textMuted }}>
            {nomeExibido}{localExibido}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2 relative">
          <span className="font-num text-[10px] px-1.5 py-0.5 rounded" style={{ color: t.textMuted, background: t.surfaceAlt }}>
            {VERSAO_APP}
          </span>
          <button
            onClick={() => setAbertoMenu((v) => !v)}
            aria-label="Configurações de tema"
            className="btn-press flex items-center justify-center rounded-lg"
            style={{ width: 34, height: 34, background: t.surfaceAlt, color: t.text, border: `1px solid ${t.border}` }}
          >
            <IconeAtual size={16} />
          </button>
          {abertoMenu && (
            <div
              className="pop-in absolute right-0 top-11 z-40 rounded-xl p-1.5 w-44"
              style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}
            >
              <p className="text-[10px] uppercase tracking-wide px-2 pt-1 pb-1.5" style={{ color: t.textMuted }}>Tema</p>
              {opcoes.map((o) => {
                const Icon = o.icon;
                const ativo = temaPref === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => { mudarTema(o.id); setAbertoMenu(false); }}
                    className="btn-press w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left"
                    style={{ background: ativo ? t.primarySoft : "transparent", color: ativo ? t.primaryText : t.text }}
                  >
                    <Icon size={15} /> {o.label}
                    {ativo && <CheckCircle2 size={13} className="ml-auto" />}
                  </button>
                );
              })}
              {onSair && (
                <>
                  <div style={{ height: 1, background: t.border, margin: "4px 2px" }} />
                  <button
                    onClick={() => { setAbertoMenu(false); onSair(); }}
                    className="btn-press w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left"
                    style={{ color: t.danger }}
                  >
                    <X size={15} /> Sair da conta
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const TAB_ITEMS = [
  { id: "negocio", label: "Negócio", icon: Building2 },
  { id: "calculadora", label: "Calculadora", icon: Calculator },
  { id: "painel", label: "Painel", icon: LayoutDashboard },
  { id: "estoque", label: "Estoque", icon: Package },
  { id: "observatorio", label: "Observatório", icon: MapPin },
  { id: "faq", label: "FAQ", icon: HelpCircle },
];

/* Nav de topo (pills) — tablet/desktop, >= 640px. Mesmo comportamento de sempre. */
function TabNavTopo({ tab, setTab, configurado }) {
  const t = useT();
  return (
    <nav className="hidden sm:block max-w-5xl mx-auto px-4 sm:px-6 mt-4 overflow-x-auto no-print">
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: t.surfaceAlt }}>
        {TAB_ITEMS.map((it) => {
          const Icon = it.icon;
          const active = tab === it.id;
          const precisaAtencao = it.id === "negocio" && !configurado;
          return (
            <button
              key={it.id} onClick={() => setTab(it.id)}
              className="tab-btn btn-press flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium relative"
              style={{ background: active ? t.surface : "transparent", color: active ? t.primaryText : t.textMuted, boxShadow: active ? t.shadow : "none" }}
            >
              <Icon size={15} />
              {it.label}
              {precisaAtencao && (
                <span className="absolute -top-1 -right-1 rounded-full" style={{ width: 8, height: 8, background: t.danger }} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* Barra fixa no rodapé — mobile, < 640px. Alcance de polegar em vez do topo da tela.  */
/* Reaproveita o mesmo TAB_ITEMS e a mesma lógica de "precisa atenção" do nav de topo. */
function TabNavRodape({ tab, setTab, configurado }) {
  const t = useT();
  return (
    <nav
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 no-print grid grid-cols-6"
      style={{
        background: t.surface, borderTop: `1px solid ${t.border}`,
        paddingBottom: "env(safe-area-inset-bottom)", boxShadow: t.shadow,
      }}
    >
      {TAB_ITEMS.map((it) => {
        const Icon = it.icon;
        const active = tab === it.id;
        const precisaAtencao = it.id === "negocio" && !configurado;
        return (
          <button
            key={it.id} onClick={() => setTab(it.id)}
            className="tab-btn btn-press touch-target-48 flex flex-col items-center justify-center gap-0.5 py-2 relative min-w-0 overflow-hidden"
            style={{ color: active ? t.primaryText : t.textMuted }}
            aria-label={it.label} aria-current={active ? "page" : undefined}
          >
            <Icon size={20} strokeWidth={active ? 2.4 : 2} />
            <span className="text-[10px] font-medium leading-none truncate max-w-full">{it.label}</span>
            {precisaAtencao && (
              <span className="absolute top-1 right-[26%] rounded-full" style={{ width: 6, height: 6, background: t.danger }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}

function TabNav({ tab, setTab, configurado }) {
  return (
    <>
      <TabNavTopo tab={tab} setTab={setTab} configurado={configurado} />
      <TabNavRodape tab={tab} setTab={setTab} configurado={configurado} />
    </>
  );
}

/* ======================================================================= */
/* Campos reutilizáveis                                                    */
/* ======================================================================= */
const CAMPO = "w-full rounded-xl px-3 py-2.5 text-sm outline-none";

/* Ponte entre as dicas "?" e a aba FAQ: o App fornece uma função que abre */
/* a aba FAQ já com a pergunta certa expandida. Sem provider (ex.: em     */
/* testes ou fora do App), o link simplesmente não aparece.               */
const FaqLinkContext = createContext(null);

/* Ajuda tocável (não hover, porque é mobile) — "?" pequeno que abre uma    */
/* dica curta, pro usuário leigo não precisar adivinhar o que preencher.    */
/* `faq` (opcional) é o id de uma pergunta do FAQ_DADOS: aparece o link    */
/* "Entender melhor" que leva à explicação completa.                        */
/* Posiciona um balão (dica ou referência) junto ao botão que o abriu.      */
/* O balão vai para o fim do <body> (portal) com posição fixa: assim não é  */
/* cortado por seções com overflow: hidden e nunca sai da tela no celular.  */
/* Acompanha a rolagem, fecha se o botão sair da tela ou com toque fora.     */
function useBalaoAncorado({ aberto, setAberto, botaoRef, balaoRef, largura = 230, preferencia = "acima" }) {
  const [pos, setPos] = useState(null);
  const FOLGA = 12;
  const posicionar = useCallback(() => {
    const r = botaoRef.current?.getBoundingClientRect();
    if (!r) return;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (r.bottom < 0 || r.top > vh) { setAberto(false); return; }
    const w = Math.min(largura, vw - FOLGA * 2);
    const left = Math.min(Math.max(r.left + r.width / 2 - w / 2, FOLGA), vw - FOLGA - w);
    const altura = balaoRef.current?.offsetHeight || 0;
    const cabeAcima = r.top - 8 - altura >= FOLGA;
    const cabeAbaixo = r.bottom + 8 + altura <= vh - FOLGA;
    const acima = preferencia === "acima" ? (cabeAcima || !cabeAbaixo) : (!cabeAbaixo && cabeAcima);
    setPos(acima || !altura ? { left, largura: w, bottom: vh - r.top + 8 } : { left, largura: w, top: r.bottom + 8 });
  }, [botaoRef, balaoRef, largura, preferencia, setAberto]);

  useLayoutEffect(() => {
    if (!aberto) { setPos(null); return; }
    posicionar();
  }, [aberto, pos?.largura, posicionar]);

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => {
      if (balaoRef.current?.contains(e.target) || botaoRef.current?.contains(e.target)) return;
      setAberto(false);
    };
    document.addEventListener("pointerdown", fora);
    window.addEventListener("scroll", posicionar, true);
    window.addEventListener("resize", posicionar);
    return () => {
      document.removeEventListener("pointerdown", fora);
      window.removeEventListener("scroll", posicionar, true);
      window.removeEventListener("resize", posicionar);
    };
  }, [aberto, posicionar, balaoRef, botaoRef, setAberto]);

  const estilo = {
    position: "fixed", zIndex: 55, display: "block",
    left: pos?.left ?? 0, width: pos?.largura ?? largura,
    ...(pos?.top != null ? { top: pos.top } : { bottom: pos?.bottom ?? 0 }),
    visibility: pos ? "visible" : "hidden",
  };
  return estilo;
}

function Ajuda({ texto, faq }) {
  const t = useT();
  const abrirFaq = useContext(FaqLinkContext);
  const [aberto, setAberto] = useState(false);
  const botaoRef = useRef(null);
  const balaoRef = useRef(null);
  const posicaoBalao = useBalaoAncorado({ aberto, setAberto, botaoRef, balaoRef, largura: 230, preferencia: "acima" });

  if (!texto) return null;
  const linkFaq = faq && abrirFaq;
  return (
    <span className="relative inline-block" style={{ marginLeft: 4, verticalAlign: "middle" }}>
      <button
        ref={botaoRef}
        type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAberto((v) => !v); }} aria-label="Ajuda" aria-expanded={aberto}
        className="btn-press touch-target inline-flex items-center justify-center rounded-full"
        style={{ width: 15, height: 15, background: aberto ? t.text : t.surfaceAlt, color: aberto ? t.bg : t.textMuted, fontSize: 10, fontWeight: 700, border: `1px solid ${aberto ? t.text : t.border}`, lineHeight: 1 }}
      >
        ?
      </button>
      {aberto && createPortal(
        <span
          ref={balaoRef} role="tooltip"
          onClick={(e) => { e.stopPropagation(); setAberto(false); }}
          className="pop-in rounded-lg p-2.5 text-[11px] leading-snug text-left"
          style={{ ...posicaoBalao, background: t.text, color: t.bg, boxShadow: t.shadow, fontWeight: 400, whiteSpace: "normal" }}
        >
          {texto}
          {linkFaq && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAberto(false); abrirFaq(faq); }}
              className="btn-press block mt-2 font-semibold underline underline-offset-2"
              style={{ color: t.bg }}
            >
              Entender melhor →
            </button>
          )}
        </span>,
        document.body
      )}
    </span>
  );
}

function Campo({ label, hint, ajuda, faq, children }) {
  const t = useT();
  return (
    // min-w-0 é inofensivo em qualquer contexto normal — só importa quando Campo está
    // dentro de um grid/flex (como o card de Perfil do negócio), onde por padrão um item
    // se recusa a encolher além do conteúdo. Foi exatamente isso que aconteceu com o
    // <select> de "Modelo de operação" (a opção "Equipe / cadeiras comissionadas ou
    // alugadas" é longa) — o mesmo bug de antes (barra de baixo, resumo das seções),
    // só que num terceiro lugar. Corrigindo aqui uma vez só, em vez de campo por campo.
    <label className="block min-w-0">
      {/* block + leading-snug: como span em linha, o rótulo pequeno herdava a altura de linha */}
      {/* do texto base (24px) e, ao quebrar em duas linhas, ficava com um vão entre elas.    */}
      <span className="block text-xs font-medium leading-snug" style={{ color: t.textMuted }}>{label}{ajuda && <Ajuda texto={ajuda} faq={faq} />}</span>
      <div className="mt-1">{children}</div>
      {hint && <p className="text-[11px] mt-1" style={{ color: t.textMuted }}>{hint}</p>}
    </label>
  );
}

function CampoNumero({ value, onChange, placeholder, prefixo, max }) {
  const t = useT();
  const campoStyle = { background: t.surface, border: `1px solid ${t.border}`, color: t.text };
  return (
    <div className="flex items-center gap-1">
      {prefixo && <span className="text-sm" style={{ color: t.textMuted }}>{prefixo}</span>}
      <input className={CAMPO + " font-num"} style={campoStyle} type="number" min="0" max={max} placeholder={placeholder}
        value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function CampoMoeda({ value, onChange }) {
  const t = useT();
  const campoStyle = { background: t.surface, border: `1px solid ${t.border}`, color: t.text };
  const [focado, setFocado] = useState(false);
  const raw = value === undefined || value === null ? "" : String(value);
  const display = focado ? raw : N(raw).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <input
      className={CAMPO + " font-num"} style={campoStyle}
      type="text" inputMode="decimal"
      value={display}
      onFocus={() => setFocado(true)}
      onBlur={() => setFocado(false)}
      onChange={(e) => onChange(normalizarValorBR(e.target.value))}
    />
  );
}

function CampoPct({ label, value, onChange, ajuda, faq }) {
  const t = useT();
  const campoStyle = { background: t.surface, border: `1px solid ${t.border}`, color: t.text };
  return (
    <Campo label={label} ajuda={ajuda} faq={faq}>
      <div className="flex items-center gap-1">
        <input className={CAMPO + " font-num"} style={campoStyle} type="number" min="0" max="99" value={value}
          onChange={(e) => onChange(e.target.value)} />
        <span className="text-sm" style={{ color: t.textMuted }}>%</span>
      </div>
    </Campo>
  );
}

function Secao({ titulo, icon: Icon, ajuda, children }) {
  const t = useT();
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {Icon && <Icon size={14} style={{ color: t.primaryText }} />}
        <span className="text-sm font-semibold" style={{ color: t.text }}>{titulo}</span>
        {ajuda && <Ajuda texto={ajuda} />}
      </div>
      {children}
    </div>
  );
}

// Mesma receita já usada em Fechamento Mensal, Evolução e Insumos internos (Estoque) —
// aberto/fechado + ChevronDown que gira + pop-in na entrada. resumo aparece só quando
// fechado, pra dar pra escanear sem precisar abrir.
function SecaoColapsavel({ titulo, icon: Icon, ajuda, faq, resumo, abertoInicial = false, children }) {
  const t = useT();
  const [aberto, setAberto] = useState(abertoInicial);
  return (
    <div className="rounded-xl" style={{ border: `1px solid ${t.border}`, overflow: "hidden" }}>
      <button onClick={() => setAberto((v) => !v)} className="btn-press touch-target flex items-center justify-between w-full px-3 py-2.5" aria-expanded={aberto}>
        <span className="flex items-center gap-1.5 min-w-0">
          {Icon && <Icon size={14} style={{ color: t.primaryText, flexShrink: 0 }} />}
          {/* O "?" fica dentro do título para acompanhar a última palavra quando ele quebra */}
          {/* em duas linhas; como irmão no flex, ia parar longe do texto, junto da seta.    */}
          <span className="text-sm font-semibold text-left leading-snug min-w-0" style={{ color: t.text }}>
            {titulo}
            {ajuda && <span onClick={(e) => e.stopPropagation()}><Ajuda texto={ajuda} faq={faq} /></span>}
          </span>
        </span>
        <span className="flex items-center gap-2 min-w-0">
          {!aberto && resumo && <span className="text-[11px] truncate max-w-[42vw] min-w-0" style={{ color: t.textMuted }}>{resumo}</span>}
          <ChevronDown size={15} style={{ color: t.textMuted, flexShrink: 0, transform: aberto ? "rotate(180deg)" : "none", transition: "transform .2s ease" }} />
        </span>
      </button>
      {aberto && <div className="pop-in px-3 pb-3">{children}</div>}
    </div>
  );
}

/* Enquadramento no Simples Nacional em linguagem natural: em que anexo o   */
/* negócio está, por quê, quanto paga sobre cada venda e, no Anexo V, o que */
/* faltaria para chegar ao Fator R de 28%. Só usa números que o próprio     */
/* usuário informou e as tabelas da LC 123/2006 — nenhuma estimativa.       */
function DiagnosticoSimples({ n, nd }) {
  const t = useT();
  const rbt12 = N(n.rbt12);
  const folha12 = N(n.folha12);
  const efetiva = fmtPct(nd.impostoPct, 2);
  const fatorR = fmtPct((nd.fatorR || 0) * 100);

  if (rbt12 <= 0) {
    return (
      <CaixaSemaforo tom="atencao" titulo="Falta o faturamento dos últimos 12 meses">
        <p>
          Sem ele, o app usa a alíquota da 1ª faixa do Anexo {nd.anexoUsado} ({efetiva}). Informe a receita bruta
          dos últimos 12 meses para o imposto sair exato.
        </p>
      </CaixaSemaforo>
    );
  }
  if (!nd.aliqInfo) {
    return (
      <CaixaSemaforo tom="perigo" titulo="Acima do limite do Simples Nacional">
        <p>
          {fmtBRL(rbt12)} em 12 meses passa do limite de R$ 4.800.000,00 do Simples Nacional. Por isso nenhum
          imposto está entrando nos preços. Converse com seu contador sobre o regime certo para esse faturamento.
        </p>
      </CaixaSemaforo>
    );
  }
  if (nd.anexoUsado === "III" && nd.fatorR >= 0.28) {
    return (
      <CaixaSemaforo tom="ok" titulo="Anexo III, o de imposto menor">
        <p>
          Seu Fator R é {fatorR}, acima dos 28% exigidos, então você fica no Anexo III. Você paga {efetiva} de
          imposto sobre cada venda, e é esse percentual que entra no preço dos serviços.
        </p>
      </CaixaSemaforo>
    );
  }
  if (nd.anexoUsado === "III") {
    return (
      <CaixaSemaforo tom="ok" titulo="Anexo III, pela sua atividade">
        <p>
          Seu Fator R é {fatorR}, abaixo de 28%. Mesmo assim, como sua atividade principal é de beleza, a Receita
          Federal entende que ela fica no Anexo III (Solução de Consulta Cosit nº 127/2021). Você paga {efetiva} de
          imposto sobre cada venda.
        </p>
        <p className="text-xs" style={{ color: t.textMuted }}>Confirme esse enquadramento com seu contador.</p>
      </CaixaSemaforo>
    );
  }
  // Anexo V: mostra o caminho até o Anexo III com os números do próprio negócio.
  const infoIII = aliquotaEfetiva(rbt12, ANEXO_III);
  const efetivaIII = infoIII ? infoIII.aliqEfetiva * 100 : null;
  const folhaNecessaria = rbt12 * 0.28;
  const faltaFolha = Math.max(0, folhaNecessaria - folha12);
  const diferencaMes = efetivaIII !== null ? ((nd.impostoPct - efetivaIII) / 100) * (rbt12 / 12) : null;
  return (
    <CaixaSemaforo tom="atencao" titulo="Anexo V, o de imposto maior">
      <p>
        Seu Fator R é {fatorR}, abaixo de 28%, então você fica no Anexo V e paga {efetiva} de imposto sobre cada
        venda.{efetivaIII !== null && <> No Anexo III, com o mesmo faturamento, seriam {fmtPct(efetivaIII, 2)}
        {diferencaMes > 0 && <>, cerca de {fmtBRL(diferencaMes)} a menos de imposto por mês</>}.</>}
      </p>
      <p>
        Para chegar aos 28%, a folha de 12 meses (salários, pró-labore e encargos) precisaria somar
        {" "}{fmtBRL(folhaNecessaria)}: {fmtBRL(faltaFolha)} a mais do que hoje.
      </p>
      <p className="text-xs" style={{ color: t.textMuted }}>
        Aumentar a folha também aumenta outros custos, como o INSS sobre o pró-labore. Simule com seu contador
        antes de decidir.
      </p>
    </CaixaSemaforo>
  );
}

/* Uma pessoa no cadastro de Profissionais (Bloco 4). O vínculo decide o que */
/* ela informa: comissionado(a) → comissão e atendimentos; dono(a) → só os   */
/* atendimentos (pesa na média com 0%); aluga cadeira → valor do aluguel.     */
function LinhaProfissional({ p, onChange, onRemove, salaoMei = false }) {
  const t = useT();
  const vinculo = vinculoDe(p);
  const campoStyle = { background: t.surface, border: `1px solid ${t.border}`, color: t.text };
  return (
    <div className="rounded-xl p-2.5 space-y-2 fade-up" style={{ background: t.surfaceAlt }}>
      <div className="flex gap-2 items-center">
        <input className={CAMPO + " min-w-0"} style={campoStyle} placeholder="Nome do profissional" value={p.nome}
          onChange={(e) => onChange("nome", e.target.value)} aria-label="Nome do profissional" />
        <label className="flex items-center gap-1.5 text-[11px] shrink-0" style={{ color: t.textMuted }}>
          <input type="checkbox" checked={p.ativo !== false} onChange={(e) => onChange("ativo", e.target.checked)} />
          ativo
        </label>
        <button onClick={onRemove} className="btn-press touch-target shrink-0" style={{ color: t.danger }} aria-label={`Remover ${p.nome || "profissional"}`}>
          <Trash2 size={16} />
        </button>
      </div>
      {/* "Como trabalha" em linha própria: dividindo a linha, o texto da opção era */}
      {/* cortado no celular ("Comissior", "Aluga cac").                          */}
      <Campo label="Como trabalha">
        <select className={CAMPO} style={campoStyle} value={vinculo} onChange={(e) => onChange("vinculo", e.target.value)}>
          {VINCULOS_PROFISSIONAL.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
        </select>
      </Campo>
      <div className="grid grid-cols-2 gap-2">
        {vinculo === "comissao" && (
          <CampoPct label="Comissão" value={p.comissaoPct ?? ""} onChange={(v) => onChange("comissaoPct", v)}
            ajuda="O percentual do preço de cada serviço que vai para essa pessoa." faq="comissao-parceiros" />
        )}
        {vinculo === "parceiro" && (
          <CampoPct label="Cota-parte do parceiro" value={p.comissaoPct ?? ""} onChange={(v) => onChange("comissaoPct", v)}
            ajuda="O percentual de cada serviço que fica com o profissional-parceiro, como está no contrato de parceria. Essa parte não entra na receita do salão." faq="salao-parceiro" />
        )}
        {vinculo === "aluguel" ? (
          <Campo label="Aluguel por mês" ajuda="Quanto essa pessoa paga por mês para usar a cadeira. Entra como receita do salão e reduz o custo fixo que os seus serviços precisam cobrir.">
            <CampoMoeda value={p.aluguelMes} onChange={(v) => onChange("aluguelMes", v)} />
          </Campo>
        ) : (
          <Campo label="Atendimentos/mês" ajuda="Mais ou menos quantos atendimentos essa pessoa faz por mês. Serve de peso na comissão média: quem atende mais pesa mais.">
            <CampoNumero value={p.atendimentosMes ?? ""} placeholder="aprox." onChange={(v) => onChange("atendimentosMes", v)} />
          </Campo>
        )}
      </div>
      {vinculo === "aluguel" && (
        <p className="text-[11px]" style={{ color: t.textMuted }}>
          Quem aluga cadeira fica com o valor dos próprios serviços: não entra na comissão média nem deve ser contado no
          número de profissionais da Capacidade produtiva.
        </p>
      )}
      {/* Bloco 11: requisitos para a cota-parte sair da receita do salão. */}
      {vinculo === "parceiro" && (
        <div className="space-y-1.5">
          <label className="flex items-start gap-2 text-xs" style={{ color: t.text }}>
            <input type="checkbox" className="mt-0.5" checked={!!p.temCnpj} onChange={(e) => onChange("temCnpj", e.target.checked)} />
            <span>Tem CNPJ (MEI ou microempresa)</span>
          </label>
          <label className="flex items-start gap-2 text-xs" style={{ color: t.text }}>
            <input type="checkbox" className="mt-0.5" checked={!!p.contratoHomologado} onChange={(e) => onChange("contratoHomologado", e.target.checked)} />
            <span>Contrato de parceria escrito e homologado no sindicato (ou, sem sindicato, no Ministério do Trabalho)</span>
          </label>
          {salaoMei ? (
            <p className="text-[11px] flex items-start gap-1" style={{ color: t.danger }}>
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span>Salão MEI não pode ser salão-parceiro. A cota-parte entra nas contas como comissão comum.</span>
            </p>
          ) : parceiroValido(p) ? (
            <p className="text-[11px] flex items-start gap-1" style={{ color: t.successText }}>
              <CheckCircle2 size={12} className="mt-0.5 shrink-0" />
              <span>A cota-parte fica fora da receita do salão: o imposto e a taxa da maquininha caem na proporção.</span>
            </p>
          ) : (
            <p className="text-[11px] flex items-start gap-1" style={{ color: t.warningText }}>
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span>Sem CNPJ e contrato homologado, a cota-parte entra nas contas como comissão comum.</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* Formas de pagamento do negócio (Bloco 5): que parte das vendas entra por  */
/* cada forma e a taxa cobrada em cada uma. Em tabela, para dar para ler as  */
/* cinco formas de uma vez e conferir se a soma fecha 100%.                  */
function FormasPagamento({ recebimento, onChange }) {
  const t = useT();
  const calc = useMemo(() => calcularTaxaRecebimento(recebimento), [recebimento]);
  const campoStyle = { background: t.surface, border: `1px solid ${t.border}`, color: t.text };
  const entrada = (forma, campo, rotulo) => (
    <div className="flex items-center gap-1">
      <input className="w-full min-w-0 rounded-lg px-2 py-2 text-sm outline-none font-num text-right" style={campoStyle}
        type="number" min="0" max={campo === "participacaoPct" ? "100" : "99"} step="any" inputMode="decimal"
        value={recebimento?.[forma.id]?.[campo] ?? ""} placeholder="0"
        aria-label={`${forma.label}: ${rotulo}`}
        onChange={(e) => onChange(forma.id, campo, e.target.value)} />
      <span className="text-xs" style={{ color: t.textMuted }}>%</span>
    </div>
  );
  const falta = calc ? 100 - calc.soma : 100;
  return (
    <div className="space-y-3">
      <div className="grid gap-x-2 gap-y-1.5 items-center" style={{ gridTemplateColumns: "minmax(0,1fr) 4.75rem 4.75rem" }}>
        <span className="text-[11px] font-medium leading-snug self-end" style={{ color: t.textMuted }}>Forma</span>
        <span className="text-[11px] font-medium leading-snug self-end" style={{ color: t.textMuted }}>% das vendas</span>
        <span className="text-[11px] font-medium leading-snug self-end" style={{ color: t.textMuted }}>Taxa cobrada</span>
        {FORMAS_PAGAMENTO.map((f) => (
          <React.Fragment key={f.id}>
            <span className="text-xs leading-snug" style={{ color: t.text }}>{f.label}</span>
            {entrada(f, "participacaoPct", "% das vendas")}
            {f.semTaxa
              ? <span className="text-[11px] pl-1" style={{ color: t.textMuted }}>sem taxa</span>
              : entrada(f, "taxaPct", "taxa cobrada")}
          </React.Fragment>
        ))}
        {/* Uma linha só, de ponta a ponta: com a borda em cada célula, o espaço entre */}
        {/* as colunas partia o traço em três pedaços.                                */}
        <div className="col-span-3 mt-0.5" style={{ height: 1, background: t.border }} />
        <span className="text-xs font-semibold" style={{ color: t.text }}>Total</span>
        <span className="text-xs font-semibold font-num text-right pr-4"
          style={{ color: calc && !calc.completo ? t.warningText : t.text }}>
          {fmtPct(calc ? calc.soma : 0, 0)}
        </span>
        <span />
      </div>

      {calc && !calc.completo && (
        <div className="pop-in flex gap-2 items-start rounded-xl p-2.5 text-xs" style={{ background: t.warningSoft, color: t.warningText }}>
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            As formas de pagamento somam {fmtPct(calc.soma, 0)} das vendas.{" "}
            {falta > 0 ? `Faltam ${fmtPct(falta, 0)} para fechar 100%.` : `Passou ${fmtPct(-falta, 0)} de 100%.`}{" "}
            Até fechar, a Calculadora usa a taxa informada em cada serviço.
          </span>
        </div>
      )}
      {calc?.completo && (
        <div className="pop-in rounded-xl p-3 text-xs space-y-1" style={{ background: t.primarySoft, color: t.primaryText }}>
          <p className="font-semibold">Taxa média de recebimento: {fmtPct(calc.pct, 2)}</p>
          <p style={{ color: t.text }}>
            De cada {fmtBRL(100)} vendidos, cerca de {fmtBRL(calc.pct)} ficam com a maquininha e o banco. Na
            Calculadora, cada serviço pode usar essa média no lugar de uma taxa própria.
          </p>
        </div>
      )}
      <ul className="text-[11px] space-y-1 list-disc pl-4" style={{ color: t.textMuted }}>
        <li>As taxas estão no extrato ou no contrato da maquininha e do banco. O Pix pode ter taxa ou não, conforme o banco e a forma de receber: confira.</li>
        <li>Crédito parcelado: se você antecipa o recebimento, use a taxa já somada à da antecipação.</li>
        <li>Mensalidade ou aluguel da maquininha é um valor fixo por mês: lance nas Contas Fixas, não aqui.</li>
      </ul>
    </div>
  );
}

/* Cópia de segurança (Bloco 9): baixar um arquivo com todos os dados do app */
/* e restaurar a partir dele. Os dados só existem neste aparelho; sem cópia, */
/* limpar os dados do navegador ou trocar de celular apaga tudo.             */
function CopiaSeguranca({ soRestaurar = false }) {
  const t = useT();
  const { show, node: toastNode } = useToast();
  const [ultima, setUltima] = useState(null);
  const [baixando, setBaixando] = useState(false);
  const [lida, setLida] = useState(null); // resultado de lerCopia, aguardando confirmação
  const [erro, setErro] = useState(null);
  const [restaurando, setRestaurando] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { lerComFallback("app:ultima-copia").then((v) => setUltima(v || null)); }, []);

  const baixar = async () => {
    setBaixando(true); setErro(null);
    window.dispatchEvent(new Event(EVENTO_SALVAR_PENDENTES));
    await new Promise((r) => setTimeout(r, 150));
    const agora = new Date();
    salvarComFallback("app:ultima-copia", agora.toISOString());
    const chaves = (await listarComFallback("")).sort();
    const dados = {};
    for (const chave of chaves) {
      const valor = await lerComFallback(chave);
      if (typeof valor === "string") dados[chave] = valor;
    }
    const blob = new Blob([JSON.stringify(montarCopia(dados, { versaoApp: VERSAO_APP, agora }), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = nomeArquivoCopia(agora);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setUltima(agora.toISOString());
    setBaixando(false);
    show("Cópia baixada. Guarde o arquivo num lugar seguro.");
  };

  const escolherArquivo = async (e) => {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setErro(null);
    const r = lerCopia(await arquivo.text());
    if (!r.ok) { setErro(r.erro); setLida(null); return; }
    setLida(r);
  };

  const restaurar = async () => {
    setRestaurando(true);
    // Apaga só o que não está na cópia; o resto é sobrescrito logo abaixo.
    const atuais = await listarComFallback("");
    atuais.filter((chave) => !(chave in lida.dados)).forEach((chave) => excluirComFallback(chave));
    Object.entries(lida.dados).forEach(([chave, valor]) => salvarComFallback(chave, valor));
    setTimeout(() => window.location.reload(), 400);
  };

  const fmtData = (iso) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "");
  const resumo = lida?.resumo;
  const partes = resumo ? [
    resumo.temNegocio && "negócio configurado",
    resumo.servicos > 0 && `${resumo.servicos} serviço${resumo.servicos > 1 ? "s" : ""}`,
    resumo.fechamentos > 0 && `${resumo.fechamentos} fechamento${resumo.fechamentos > 1 ? "s" : ""} do mês`,
    resumo.produtos > 0 && `${resumo.produtos} produto${resumo.produtos > 1 ? "s" : ""}`,
    resumo.concorrentes > 0 && `${resumo.concorrentes} concorrente${resumo.concorrentes > 1 ? "s" : ""}`,
  ].filter(Boolean) : [];

  const inputArquivo = (
    <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={escolherArquivo} aria-label="Arquivo da cópia de segurança" />
  );
  const avisoErro = erro && (
    <div className="pop-in flex gap-2 items-start rounded-xl p-2.5 mt-2 text-xs" role="alert" style={{ background: t.dangerSoft, color: t.danger }}>
      <AlertTriangle size={14} className="mt-0.5 shrink-0" /><span>{erro}</span>
    </div>
  );
  const confirmacao = lida && (
    <div className="pop-in rounded-xl p-3 mt-2 text-xs space-y-2 text-left" style={{ background: t.warningSoft, color: t.warningText }}>
      <p className="font-semibold">
        Cópia de {fmtData(lida.criadaEm) || "data desconhecida"}{lida.versaoApp ? ` (versão ${lida.versaoApp})` : ""}
      </p>
      <p style={{ color: t.text }}>Contém: {partes.length > 0 ? partes.join(", ") : "dados do app"}.</p>
      <p>Restaurar <b>substitui todos os dados atuais deste aparelho</b> pelos da cópia. Se quiser guardar os atuais, baixe uma cópia antes.</p>
      <div className="flex gap-3">
        <button type="button" onClick={restaurar} disabled={restaurando}
          className="btn-press touch-target inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-semibold"
          style={{ background: t.danger, color: t.onDanger }}>
          {restaurando && <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-r-transparent animate-spin" aria-hidden="true" />}
          {restaurando ? "Restaurando…" : "Sim, restaurar"}
        </button>
        {!restaurando && (
          <button type="button" onClick={() => setLida(null)} className="btn-press touch-target underline" style={{ color: t.textMuted }}>Cancelar</button>
        )}
      </div>
    </div>
  );

  // No primeiro acesso (aparelho novo ou dados apagados): só restaurar.
  if (soRestaurar) {
    return (
      <div className="mt-3 text-center">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={restaurando}
          className="btn-press touch-target text-xs underline underline-offset-2" style={{ color: t.textMuted }}>
          Já usa o app em outro aparelho? Restaure uma cópia de segurança
        </button>
        {inputArquivo}
        {avisoErro}
        {confirmacao}
      </div>
    );
  }

  return (
    <SecaoColapsavel titulo="Cópia de segurança" icon={ShieldCheck}
      resumo={ultima ? `última: ${fmtData(ultima)}` : "nenhuma ainda"}
      ajuda="Seus dados ficam guardados só neste aparelho. A cópia é um arquivo com tudo: dá para guardar e restaurar aqui ou em outro celular ou computador.">
      <p className="text-[11px] mb-2" style={{ color: t.textMuted }}>
        Baixe uma cópia de vez em quando, por exemplo depois de cada fechamento do mês, e guarde num lugar seguro (seu
        e-mail ou Google Drive). O arquivo tem os números do seu negócio: não compartilhe.
      </p>
      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={baixar} disabled={baixando}
          className="btn-press touch-target inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
          style={{ background: t.primaryText, color: t.onPrimary, opacity: baixando ? 0.8 : 1 }}>
          {baixando ? <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-r-transparent animate-spin" aria-hidden="true" /> : <Download size={14} />}
          {baixando ? "Preparando…" : "Baixar cópia"}
        </button>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={restaurando}
          className="btn-press touch-target inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
          style={{ background: t.surfaceAlt, color: t.text, border: `1px solid ${t.border}` }}>
          Restaurar de uma cópia
        </button>
        {inputArquivo}
      </div>
      {avisoErro}
      {confirmacao}
      {toastNode}
    </SecaoColapsavel>
  );
}

/* ======================================================================= */
/* Aba: Negócio                                                            */
/* ======================================================================= */
/* Aviso de alterações não salvas: mostra banner dentro do formulário e   */
/* avisa o navegador antes de fechar/recarregar com edição pendente — pra */
/* nunca parecer que "não salvou" quando na verdade só faltou clicar.     */
function useAvisoNaoSalvo(sujo) {
  useEffect(() => {
    if (!sujo) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [sujo]);
}
function BannerNaoSalvo({ sujo, aoSalvarLabel = "Salvar" }) {
  const t = useT();
  if (!sujo) return null;
  return (
    <div className="pop-in flex gap-2 items-start rounded-xl p-2.5 text-xs" style={{ background: t.warningSoft, color: t.warningText }}>
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <span>Você tem alterações não salvas nesta tela. Toque em "{aoSalvarLabel}" antes de sair, ou elas se perdem.</span>
    </div>
  );
}

// Auto-salva um rascunho depois de ~1.2s sem mudança — mesmo padrão do Google Docs/Notion.
// Não salva a cada tecla (evitaria recalcular preço/DRE/etc. com número pela metade digitado),
// só quando parece que a pessoa pausou de verdade. status serve pro indicador visual na tela.
// Troca-troca rápida de aba dentro da janela de debounce pode perder a última mudança
// pendente — trade-off consciente em troca de não arriscar salvar estado incompleto.
function useAutoSalvar(rascunho, valorSalvo, onSalvar, { ativo = true, delayMs = 1200 } = {}) {
  const [status, setStatus] = useState("salvo");
  const rascunhoRef = useRef(rascunho);
  const onSalvarRef = useRef(onSalvar);
  rascunhoRef.current = rascunho;
  onSalvarRef.current = onSalvar;
  const pendenteRef = useRef(false);
  const ativoRef = useRef(ativo);
  ativoRef.current = ativo;
  const rascunhoStr = JSON.stringify(rascunho);
  const salvoStr = JSON.stringify(valorSalvo);

  useEffect(() => {
    if (!ativo || rascunhoStr === salvoStr) { pendenteRef.current = false; setStatus("salvo"); return undefined; }
    pendenteRef.current = true;
    setStatus("pendente");
    const timer = setTimeout(() => {
      pendenteRef.current = false;
      setStatus("salvando");
      onSalvarRef.current(rascunhoRef.current);
      setStatus("salvo");
    }, delayMs);
    return () => clearTimeout(timer);
  }, [rascunhoStr, salvoStr, ativo, delayMs]);

  // Bloco 9: o que ainda esperava a pausa da digitação é salvo na hora ao trocar
  // de aba (o componente sai da tela), ao esconder ou fechar a página e antes de
  // o app recarregar para uma versão nova. Antes, isso se perdia.
  useEffect(() => {
    const descarregar = () => {
      if (!pendenteRef.current || !ativoRef.current) return;
      pendenteRef.current = false;
      onSalvarRef.current(rascunhoRef.current);
    };
    const aoEsconder = () => { if (document.visibilityState === "hidden") descarregar(); };
    window.addEventListener("pagehide", descarregar);
    window.addEventListener(EVENTO_SALVAR_PENDENTES, descarregar);
    document.addEventListener("visibilitychange", aoEsconder);
    return () => {
      window.removeEventListener("pagehide", descarregar);
      window.removeEventListener(EVENTO_SALVAR_PENDENTES, descarregar);
      document.removeEventListener("visibilitychange", aoEsconder);
      descarregar();
    };
  }, []);

  return status;
}
function IndicadorAutoSalvar({ status }) {
  const t = useT();
  if (status === "pendente") {
    return <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: t.textMuted }}><Clock3 size={12} /> alterações pendentes…</span>;
  }
  if (status === "salvando") {
    return <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: t.textMuted }}>salvando…</span>;
  }
  return <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: t.textMuted }}><CheckCircle2 size={12} style={{ color: t.successText }} /> salvo</span>;
}

function CardSelecao({ ativo, onClick, icon: Icon, titulo, descricao }) {
  const t = useT();
  return (
    <button type="button" onClick={onClick} className="btn-press text-left rounded-xl p-3 w-full flex items-start gap-2.5"
      style={{ background: ativo ? t.primarySoft : t.surfaceAlt, border: `1.5px solid ${ativo ? t.primaryText : t.border}` }}>
      <Icon size={18} style={{ color: ativo ? t.primaryText : t.textMuted, flexShrink: 0, marginTop: 1 }} />
      <div>
        <p className="text-sm font-semibold" style={{ color: t.text }}>{titulo}</p>
        {descricao && <p className="text-[11px] mt-0.5" style={{ color: t.textMuted }}>{descricao}</p>}
      </div>
    </button>
  );
}

// Onboarding — 4 passos curtos + confirmação, antes de qualquer custo fixo. Tom
// conversacional na copy, mas é um wizard estruturado (ver Especificacao_Onboarding.md,
// §0 — por que não é um chat de IA de verdade dentro do app).
function OnboardingPerfil({ onConcluir }) {
  const t = useT();
  const [passo, setPasso] = useState(1);
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [segmento, setSegmento] = useState(null);
  const [modeloOperacao, setModeloOperacao] = useState(null);
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");

  const passos = [{ id: 1, label: "Você" }, { id: 2, label: "Segmento" }, { id: 3, label: "Modelo" }, { id: 4, label: "Local" }];
  const podeAvancarPasso1 = nomeResponsavel.trim().length > 0 && nomeFantasia.trim().length > 0;
  const podeAvancarPasso2 = !!segmento;
  const podeAvancarPasso3 = !!modeloOperacao;
  const labelSegmento = SEGMENTOS.find((s) => s.id === segmento)?.label || "";
  const labelModelo = (MODELOS_OPERACAO.find((m) => m.id === modeloOperacao)?.label || "").toLowerCase();

  const concluir = () => {
    onConcluir({
      nomeResponsavel: nomeResponsavel.trim(), nomeFantasia: nomeFantasia.trim(), cnpj: cnpj.trim(),
      segmento, modeloOperacao, cidade: cidade.trim(), estado: estado.trim(),
    });
  };

  return (
    <div className="rounded-2xl p-5" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={16} style={{ color: t.primaryText }} />
        <p className="text-sm font-semibold" style={{ color: t.text }}>Vamos te conhecer rapidinho</p>
      </div>
      <p className="text-[11px] mb-4" style={{ color: t.textMuted }}>
        4 perguntas curtas antes de levantar os custos fixos — assim o app já sugere os itens certos pro seu tipo de negócio.
      </p>

      <div className="flex items-center mb-5">
        {passos.map((p, i) => (
          <React.Fragment key={p.id}>
            <div className="flex flex-col items-center gap-1" style={{ flexShrink: 0 }}>
              <span className="flex items-center justify-center rounded-full font-num text-[11px] font-bold"
                style={{ width: 22, height: 22, background: passo >= p.id ? t.primary : t.surfaceAlt, color: passo >= p.id ? t.onPrimary : t.textMuted }}>
                {passo > p.id ? "✓" : p.id}
              </span>
              <span className="text-[9px] font-medium" style={{ color: passo === p.id ? t.text : t.textMuted }}>{p.label}</span>
            </div>
            {i < passos.length - 1 && <div style={{ flex: 1, height: 2, background: passo > p.id ? t.primary : t.border, marginBottom: 14 }} />}
          </React.Fragment>
        ))}
      </div>

      {passo === 1 && (
        <div className="space-y-3 fade-up">
          <Campo label="Seu nome completo">
            <input className={CAMPO} style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
              placeholder="ex: Maria da Silva" value={nomeResponsavel} onChange={(e) => setNomeResponsavel(e.target.value)} />
          </Campo>
          <Campo label="Nome fantasia do negócio">
            <input className={CAMPO} style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
              placeholder="ex: Barbearia do João" value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} />
          </Campo>
          <button onClick={() => setPasso(2)} disabled={!podeAvancarPasso1} className="btn-press w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
            style={{ background: podeAvancarPasso1 ? t.primaryText : t.surfaceAlt, color: podeAvancarPasso1 ? t.onPrimary : t.textMuted, opacity: podeAvancarPasso1 ? 1 : 0.6 }}>
            Continuar
          </button>
        </div>
      )}

      {passo === 2 && (
        <div className="space-y-2 fade-up">
          {SEGMENTOS.map((s) => (
            <CardSelecao key={s.id} ativo={segmento === s.id} onClick={() => setSegmento(s.id)} icon={s.icon} titulo={s.label} />
          ))}
          <div className="flex gap-2 pt-1">
            <button onClick={() => setPasso(1)} className="btn-press rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: t.surfaceAlt, color: t.textMuted }}>Voltar</button>
            <button onClick={() => setPasso(3)} disabled={!podeAvancarPasso2} className="btn-press flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{ background: podeAvancarPasso2 ? t.primaryText : t.surfaceAlt, color: podeAvancarPasso2 ? t.onPrimary : t.textMuted, opacity: podeAvancarPasso2 ? 1 : 0.6 }}>
              Continuar
            </button>
          </div>
        </div>
      )}

      {passo === 3 && (
        <div className="space-y-2 fade-up">
          {MODELOS_OPERACAO.map((m) => (
            <CardSelecao key={m.id} ativo={modeloOperacao === m.id} onClick={() => setModeloOperacao(m.id)} icon={Building2} titulo={m.label} descricao={m.descricao} />
          ))}
          <div className="flex gap-2 pt-1">
            <button onClick={() => setPasso(2)} className="btn-press rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: t.surfaceAlt, color: t.textMuted }}>Voltar</button>
            <button onClick={() => setPasso(4)} disabled={!podeAvancarPasso3} className="btn-press flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{ background: podeAvancarPasso3 ? t.primaryText : t.surfaceAlt, color: podeAvancarPasso3 ? t.onPrimary : t.textMuted, opacity: podeAvancarPasso3 ? 1 : 0.6 }}>
              Continuar
            </button>
          </div>
        </div>
      )}

      {passo === 4 && (
        <div className="space-y-3 fade-up">
          <div className="grid grid-cols-2 gap-2">
            <Campo label="Cidade (opcional)">
              <input className={CAMPO} style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
                placeholder="ex: Feira de Santana" value={cidade} onChange={(e) => setCidade(e.target.value)} />
            </Campo>
            <Campo label="Estado (opcional)">
              <input className={CAMPO} style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
                placeholder="ex: BA" value={estado} onChange={(e) => setEstado(e.target.value.toUpperCase().slice(0, 2))} />
            </Campo>
          </div>
          <Campo label="CNPJ (opcional)" ajuda="Só se você já tiver — não é obrigatório pra usar o app; MEI sem CNPJ formal pode deixar em branco.">
            <input className={CAMPO} style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
              placeholder="00.000.000/0000-00" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
          </Campo>
          <div className="rounded-xl p-3" style={{ background: t.successSoft }}>
            <p className="text-xs" style={{ color: t.text }}>
              Perfeito, {nomeResponsavel.split(" ")[0] || "tudo certo"}! Cadastrado como <strong>{labelSegmento}</strong>
              {cidade ? ` em ${cidade}${estado ? `, ${estado}` : ""}` : ""} — {labelModelo}. Agora vamos levantar os custos fixos do mês.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPasso(3)} className="btn-press rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: t.surfaceAlt, color: t.textMuted }}>Voltar</button>
            <button onClick={concluir} className="btn-press flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: t.success, color: t.onSuccess }}>
              <CheckCircle2 size={14} /> Confirmar e ir pros custos fixos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Negocio({ negocio, onSalvar, servicos, onCarregarExemplo }) {
  const t = useT();
  const [n, setN] = useState(negocio);
  const { show, node: toastNode } = useToast();
  const nd = useMemo(() => computeNegocioDerivado(n), [n]);
  const [confirmandoExemplo, setConfirmandoExemplo] = useState(false);
  // Baseado no que está SALVO (prop), não no rascunho ao vivo — senão o aviso de "não
  // configurado" sumiria assim que a pessoa digitasse qualquer coisa, antes de auto-salvar.
  const configuradoSalvo = useMemo(() => computeNegocioDerivado(negocio).configurado, [negocio]);

  const salvarComToast = (novo) => {
    const configuradoAntes = computeNegocioDerivado(negocio).configurado;
    onSalvar(novo);
    const configuradoDepois = computeNegocioDerivado(novo).configurado;
    if (!configuradoAntes && configuradoDepois) show("Tudo pronto! Indo pra Calculadora...");
  };
  const statusSalvar = useAutoSalvar(n, negocio, salvarComToast);
  useAvisoNaoSalvo(statusSalvar !== "salvo");
  const [perfilAberto, setPerfilAberto] = useState(!configuradoSalvo);

  const temDadoRealPreenchido =
    n.custosFixos.some((c) => N(c.valor) > 0) || N(n.proLabore) > 0 || n.regime !== "indefinido" || (servicos || []).length > 0;

  const clicouCarregarExemplo = () => {
    if (temDadoRealPreenchido) setConfirmandoExemplo(true);
    else onCarregarExemplo();
  };

  const addCusto = () => setN({ ...n, custosFixos: [...n.custosFixos, { id: uid(), nome: "", valor: "", semCaixa: false }] });
  const removeCusto = (id) => setN({ ...n, custosFixos: n.custosFixos.filter((i) => i.id !== id) });
  const updateCusto = (id, field, value) =>
    setN({ ...n, custosFixos: n.custosFixos.map((i) => (i.id === id ? { ...i, [field]: value } : i)) });

  const addProfissional = () => setN({ ...n, profissionais: [...(n.profissionais || []), { id: uid(), nome: "", ativo: true }] });
  const removeProfissional = (id) => setN({ ...n, profissionais: (n.profissionais || []).filter((p) => p.id !== id) });
  const updateProfissional = (id, field, value) =>
    setN({ ...n, profissionais: (n.profissionais || []).map((p) => (p.id === id ? { ...p, [field]: value } : p)) });

  const updateRecebimento = (forma, campo, valor) =>
    setN({ ...n, recebimento: { ...(n.recebimento || {}), [forma]: { ...(n.recebimento?.[forma] || {}), [campo]: valor } } });
  const recebimentoCalc = useMemo(() => calcularTaxaRecebimento(n.recebimento), [n.recebimento]);

  const cardStyle = { background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow };

  // Onboarding aparece só até existir um segmento salvo — depois disso vira um card
  // recolhido e editável no topo, não um passo obrigatório repetido toda vez.
  if (!negocio.perfil?.segmento) {
    const concluirOnboarding = (perfil) => {
      const atualizado = { ...n, perfil };
      setN(atualizado);
      onSalvar(atualizado); // confirmação explícita — não espera o debounce do auto-save
      show(`Perfeito, ${perfil.nomeResponsavel.split(" ")[0] || ""}! Vamos aos custos fixos.`);
    };
    return (
      <div className="max-w-lg mx-auto">
        {toastNode}
        <OnboardingPerfil onConcluir={concluirOnboarding} />
        <CopiaSeguranca soRestaurar />
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[1.15fr,1fr] gap-5">
      {!configuradoSalvo && (
        <div className="lg:col-span-2 rounded-2xl p-4 min-w-0" style={{ background: t.primarySoft, border: `1px dashed ${t.primaryText}55` }}>
          {!confirmandoExemplo ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex-1 basis-full sm:basis-auto min-w-0">
                <p className="text-sm font-semibold inline-flex items-center gap-1.5" style={{ color: t.text }}>
                  <Sparkles size={14} style={{ color: t.primaryText }} /> Quer ver o app funcionando antes de configurar o seu?
                </p>
                <p className="text-[11px] mt-1" style={{ color: t.textMuted }}>
                  Preenche negócio e 3 serviços de exemplo (números ilustrativos, editáveis) — deixa o Painel e o DRE prontos pra explorar.
                </p>
              </div>
              <button onClick={clicouCarregarExemplo} className="btn-press touch-target rounded-xl px-3 py-2 text-xs font-semibold w-full sm:w-auto"
                style={{ background: t.primaryText, color: t.onPrimary }}>
                Carregar exemplo
              </button>
            </div>
          ) : (
            <div className="pop-in flex items-center gap-2 flex-wrap text-sm" style={{ color: t.danger }}>
              <AlertTriangle size={16} className="shrink-0" />
              <span className="flex-1 basis-full sm:basis-auto min-w-0">Isso substitui custos, configurações e serviços que você já preencheu. Seu perfil (nome, segmento e cidade) é mantido. Tem certeza?</span>
              <button onClick={() => { onCarregarExemplo(); setConfirmandoExemplo(false); }} className="btn-press font-semibold underline shrink-0">Sim, carregar exemplo</button>
              <button onClick={() => setConfirmandoExemplo(false)} className="btn-press underline shrink-0" style={{ color: t.textMuted }}>Cancelar</button>
            </div>
          )}
        </div>
      )}

      {/* Já configurado: o banner grande some (era só pra quem tá começando), mas       */}
      {/* deixa um jeito discreto de recarregar o exemplo mesmo assim — a mesma            */}
      {/* confirmação continua valendo, só não fica ocupando espaço em quem já usa o app. */}
      {configuradoSalvo && (
        <div className="lg:col-span-2 min-w-0">
          {!confirmandoExemplo ? (
            <button onClick={clicouCarregarExemplo} className="btn-press touch-target text-[11px] font-medium inline-flex items-start gap-1 text-left"
              style={{ color: t.textMuted }}>
              <Sparkles size={11} className="shrink-0 mt-[2px]" /> recarregar dados de exemplo (substitui o que está preenchido)
            </button>
          ) : (
            <div className="pop-in flex items-center gap-2 flex-wrap text-xs rounded-xl p-2.5" style={{ background: t.dangerSoft, color: t.danger }}>
              <AlertTriangle size={14} className="shrink-0" />
              <span className="flex-1 basis-full sm:basis-auto min-w-0">Isso substitui custos, configurações e serviços que você já preencheu. Seu perfil (nome, segmento e cidade) é mantido. Tem certeza?</span>
              <button onClick={() => { onCarregarExemplo(); setConfirmandoExemplo(false); }} className="btn-press font-semibold underline shrink-0">Sim, carregar exemplo</button>
              <button onClick={() => setConfirmandoExemplo(false)} className="btn-press underline shrink-0" style={{ color: t.textMuted }}>Cancelar</button>
            </div>
          )}
        </div>
      )}

      <div className="lg:col-span-2 rounded-2xl p-4 min-w-0" style={cardStyle}>
        <button onClick={() => setPerfilAberto((v) => !v)} className="btn-press touch-target flex items-center justify-between w-full" aria-expanded={perfilAberto}>
          <span className="flex items-center gap-2 min-w-0">
            {(() => { const Icon = SEGMENTOS.find((s) => s.id === n.perfil?.segmento)?.icon || Building2; return <Icon size={16} style={{ color: t.primaryText, flexShrink: 0 }} />; })()}
            <span className="text-sm font-semibold truncate min-w-0" style={{ color: t.text }}>Perfil do negócio</span>
          </span>
          <ChevronDown size={15} style={{ color: t.textMuted, flexShrink: 0, transform: perfilAberto ? "rotate(180deg)" : "none", transition: "transform .2s ease" }} />
        </button>
        {perfilAberto && (
          <div className="pop-in mt-3">
            <div className="grid sm:grid-cols-2 gap-2">
              <Campo label="Nome do responsável">
                <input className={CAMPO} style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
                  value={n.perfil?.nomeResponsavel || ""} onChange={(e) => setN({ ...n, perfil: { ...n.perfil, nomeResponsavel: e.target.value } })} />
              </Campo>
              <Campo label="Nome fantasia">
                <input className={CAMPO} style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
                  value={n.perfil?.nomeFantasia || ""} onChange={(e) => setN({ ...n, perfil: { ...n.perfil, nomeFantasia: e.target.value } })} />
              </Campo>
              <Campo label="Segmento">
                <select className={CAMPO} style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
                  value={n.perfil?.segmento || ""} onChange={(e) => setN({ ...n, perfil: { ...n.perfil, segmento: e.target.value } })}>
                  {SEGMENTOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </Campo>
              <Campo label="Modelo de operação">
                <select className={CAMPO} style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
                  value={n.perfil?.modeloOperacao || ""} onChange={(e) => setN({ ...n, perfil: { ...n.perfil, modeloOperacao: e.target.value } })}>
                  {MODELOS_OPERACAO.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </Campo>
              <Campo label="Cidade">
                <input className={CAMPO} style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
                  value={n.perfil?.cidade || ""} onChange={(e) => setN({ ...n, perfil: { ...n.perfil, cidade: e.target.value } })} />
              </Campo>
              <Campo label="Estado">
                <input className={CAMPO} style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
                  value={n.perfil?.estado || ""} onChange={(e) => setN({ ...n, perfil: { ...n.perfil, estado: e.target.value.toUpperCase().slice(0, 2) } })} />
              </Campo>
            </div>
            <p className="text-[10px] mt-2" style={{ color: t.textMuted }}>
              Mudar o segmento aqui não altera serviços já salvos — só passa a sugerir templates e insumos diferentes pros próximos.
            </p>
          </div>
        )}
      </div>

      {/* space-y-3 e sem linhas divisórias: cada seção já é um cartão com borda; a linha  */}
      {/* entre eles somava ~50px de vão, contra 12px entre os cartões do Painel.         */}
      <div className="rounded-2xl p-5 space-y-3 min-w-0" style={cardStyle}>
        <SecaoColapsavel
          resumo={`${n.custosFixos.length} conta${n.custosFixos.length === 1 ? "" : "s"} · ${fmtBRL(n.custosFixos.reduce((s, c) => s + N(c.valor), 0))}/mês`}
          abertoInicial={!configuradoSalvo}
          titulo={`Contas Fixas d${termoEstabelecimento(n.perfil?.segmento).artigo} ${termoEstabelecimento(n.perfil?.segmento).termo.charAt(0).toUpperCase()}${termoEstabelecimento(n.perfil?.segmento).termo.slice(1)}`} icon={Building2}
          ajuda="Despesas que você paga todo mês, atendendo ou não — aluguel, água, luz, contador. Em contabilidade isso se chama 'custo fixo'." faq="custo-fixo-variavel">
          <p className="text-[11px] mb-2" style={{ color: t.textMuted }}>
            Comecei com as categorias mais comuns do setor, valores em branco — apague o que não se aplica a você e
            some o que estiver faltando.
          </p>
          {n.perfil?.modeloOperacao === "locatario" && (
            <div className="flex gap-2 items-start rounded-xl p-3 mb-2 text-xs" style={{ background: t.primarySoft, color: t.text }}>
              <Info size={14} className="mt-0.5 shrink-0" style={{ color: t.primaryText }} />
              <p>
                <strong>Você aluga cadeira ou sala.</strong> Se paga um valor fixo por mês, lance em "Aluguel do espaço":
                ele é um custo fixo seu. Se o dono do salão fica com uma porcentagem de cada serviço, deixe o aluguel em
                branco e informe essa porcentagem na Calculadora, no campo "% que fica com o salão".
              </p>
            </div>
          )}
          <div className="space-y-2">
            {n.custosFixos.map((item) => (
              <div key={item.id} className="flex flex-col gap-1.5 rounded-xl p-2" style={{ background: t.surfaceAlt }}>
                <div className="flex gap-2 items-center">
                  <input className={CAMPO + " min-w-0"} style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                    placeholder="ex: aluguel" value={item.nome}
                    onChange={(e) => updateCusto(item.id, "nome", e.target.value)} />
                  <div style={{ width: 110, flexShrink: 0 }}>
                    <CampoMoeda value={item.valor} onChange={(v) => updateCusto(item.id, "valor", v)} />
                  </div>
                  <button onClick={() => removeCusto(item.id)} className="btn-press shrink-0" style={{ color: t.danger }}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <label className="flex items-center gap-1.5 text-[11px] pl-1" style={{ color: t.textMuted }}>
                  <input type="checkbox" checked={!!item.semCaixa} onChange={(e) => updateCusto(item.id, "semCaixa", e.target.checked)} />
                  não representa saída de caixa (ex: depreciação de equipamento)
                </label>
              </div>
            ))}
          </div>
          <button onClick={addCusto} className="btn-press mt-2 inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1.5"
            style={{ color: t.primaryText, background: t.primarySoft }}>
            <Plus size={13} /> adicionar item
          </button>
        </SecaoColapsavel>

        <SecaoColapsavel
          resumo={`${(n.profissionais || []).filter((p) => p.ativo !== false).length} ativo(s)${nd.comissaoEquipe ? ` · comissão média ${fmtPct(nd.comissaoEquipe.pct)}` : ""}`}
          titulo="Profissionais" icon={Building2} faq="comissao-parceiros"
          ajuda={`Cadastre quem atende n${termoEstabelecimento(n.perfil?.segmento).artigo} ${termoEstabelecimento(n.perfil?.segmento).termo}. Serve para dividir o faturamento por pessoa no Fechamento Mensal, calcular a comissão média da equipe e lançar o aluguel de quem aluga cadeira.`}>
          <p className="text-[11px] mb-2" style={{ color: t.textMuted }}>
            Opcional. Com duas ou mais pessoas atendendo, a Calculadora pode usar a comissão média da equipe. Desmarcar
            "ativo" tira a pessoa das contas e do Fechamento Mensal sem apagar o histórico de meses anteriores.
          </p>
          <div className="space-y-2">
            {(n.profissionais || []).map((p) => (
              <LinhaProfissional key={p.id} p={p} salaoMei={n.regime === "mei"}
                onChange={(campo, valor) => updateProfissional(p.id, campo, valor)}
                onRemove={() => removeProfissional(p.id)} />
            ))}
            {(n.profissionais || []).length === 0 && (
              <p className="text-[11px]" style={{ color: t.textMuted }}>Nenhum profissional cadastrado ainda.</p>
            )}
          </div>
          <button onClick={addProfissional} className="btn-press mt-2 inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1.5"
            style={{ color: t.primaryText, background: t.primarySoft }}>
            <Plus size={13} /> adicionar profissional
          </button>
          {nd.comissaoEquipe && (
            <div className="pop-in rounded-xl p-3 mt-3 text-xs space-y-1" style={{ background: t.primarySoft, color: t.primaryText }}>
              <p className="font-semibold">Comissão média da equipe: {fmtPct(nd.comissaoEquipe.pct)}</p>
              <p style={{ color: t.text }}>
                {nd.comissaoEquipe.ponderada
                  ? `Ponderada pelos atendimentos de ${nd.comissaoEquipe.participantes.length} pessoas. Quem atende mais pesa mais.`
                  : `Média simples de ${nd.comissaoEquipe.participantes.length} pessoas, porque falta o número de atendimentos de alguém. Preencha para a média ficar ponderada.`}
              </p>
            </div>
          )}
          {nd.temParceriaValida && (
            <div className="pop-in rounded-xl p-3 mt-3 text-xs space-y-1" style={{ background: t.successSoft, color: t.successText }}>
              <p className="font-semibold">Parceria (Lei do Salão-Parceiro)</p>
              <p style={{ color: t.text }}>
                A cota-parte dos parceiros com CNPJ e contrato homologado fica fora da receita bruta do salão. Na
                Calculadora, o imposto e a taxa da maquininha entram só sobre a parte do salão. No Regime tributário,
                informe o faturamento de 12 meses já sem as cotas repassadas.
                <Ajuda faq="salao-parceiro" texto="A Lei 13.352/2016 permite que o salão repasse ao profissional-parceiro uma cota-parte que não conta como receita do salão. Toque em Entender melhor para os requisitos." />
              </p>
            </div>
          )}
          {nd.receitaAluguelCadeiras > 0 && (
            <div className="pop-in rounded-xl p-3 mt-3 text-xs" style={{ background: t.successSoft, color: t.successText }}>
              <p className="font-semibold">Aluguel de cadeiras: {fmtBRL(nd.receitaAluguelCadeiras)}/mês</p>
              <p style={{ color: t.text }}>
                Entra como receita no DRE e reduz o custo fixo que os seus serviços precisam cobrir, de
                {" "}{fmtBRL(nd.custoFixoTotal)} para {fmtBRL(nd.custoFixoLiquido)}.
              </p>
            </div>
          )}
        </SecaoColapsavel>

        <SecaoColapsavel
          resumo={!recebimentoCalc ? "não informado" : recebimentoCalc.completo ? `taxa média ${fmtPct(recebimentoCalc.pct, 2)}` : `soma ${fmtPct(recebimentoCalc.soma, 0)} — incompleto`}
          titulo="Formas de pagamento" icon={CreditCard} faq="taxa-media-recebimento"
          ajuda="Quanto das suas vendas entra em dinheiro, Pix, débito e crédito, e quanto a maquininha ou o banco cobra em cada um. Com isso, o app calcula uma taxa média para usar no preço dos serviços.">
          <p className="text-[11px] mb-2" style={{ color: t.textMuted }}>
            Opcional. Informe que parte das vendas entra por cada forma de pagamento e a taxa cobrada em cada uma. O app
            calcula a taxa média, pesando cada taxa pela parte das vendas. Uma estimativa já ajuda: dá para ajustar depois
            com o extrato do mês.
          </p>
          <FormasPagamento recebimento={n.recebimento || {}} onChange={updateRecebimento} />
        </SecaoColapsavel>

        <SecaoColapsavel resumo={`${(n.insumosCompartilhados || []).length} cadastrado(s)`} titulo="Insumos compartilhados entre serviços" icon={Sparkles}>
          <p className="text-[11px] mb-2" style={{ color: t.textMuted }}>
            Coisas como shampoo, touca ou luva costumam ser usadas em vários serviços. Cadastre aqui uma vez só — depois,
            em cada serviço na Calculadora, você escolhe "Compartilhado" e diz o quanto aquele serviço específico usa.
          </p>
          <div className="space-y-2">
            {(n.insumosCompartilhados || []).map((item) => (
              <ItemInsumoCompartilhado key={item.id} item={item}
                onChange={(novo) => setN({ ...n, insumosCompartilhados: n.insumosCompartilhados.map((i) => (i.id === novo.id ? novo : i)) })}
                onRemove={() => setN({ ...n, insumosCompartilhados: n.insumosCompartilhados.filter((i) => i.id !== item.id) })} />
            ))}
          </div>
          <button
            onClick={() => setN({ ...n, insumosCompartilhados: [...(n.insumosCompartilhados || []), { id: uid(), nome: "", modo: "duracao" }] })}
            className="btn-press mt-2 inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1.5"
            style={{ color: t.primaryText, background: t.primarySoft }}>
            <Plus size={13} /> adicionar insumo compartilhado
          </button>
          {(n.insumosCompartilhados || []).length === 0 && (
            <p className="text-[11px] mt-2" style={{ color: t.textMuted }}>Nenhum ainda — opcional. Sem isso, cada serviço continua com seus próprios custos, sem compartilhar nada.</p>
          )}
        </SecaoColapsavel>

        <SecaoColapsavel resumo={`${nd.horasTotais || 0}h/mês`} abertoInicial={!configuradoSalvo} titulo="Capacidade produtiva" icon={Clock3}>
          <div className="grid grid-cols-3 gap-2">
            <Campo label="Número de profissionais" hint="incluindo você, sem contar quem aluga cadeira — MEI sozinho(a) = 1">
              <CampoNumero value={n.numeroProfissionais} onChange={(v) => setN({ ...n, numeroProfissionais: v })} />
            </Campo>
            <Campo label="Dias trabalhados/mês">
              <CampoNumero value={n.diasMes} max="31" onChange={(v) => setN({ ...n, diasMes: v })} />
            </Campo>
            <Campo label="Horas por profissional/dia">
              <CampoNumero value={n.horasDia} max="24" onChange={(v) => setN({ ...n, horasDia: v })} />
            </Campo>
          </div>
          <p className="text-xs mt-2" style={{ color: t.textMuted }}>
            Capacidade total: <span className="font-num font-medium">{nd.horasTotais || 0} horas/mês</span> ({nd.numeroProfissionais} profissional{nd.numeroProfissionais > 1 ? "is" : ""} × {n.horasDia || 0}h × {n.diasMes || 0} dias)
          </p>
          {(N(n.diasMes) > 31 || N(n.horasDia) > 24) && (
            <div className="flex gap-2 items-start rounded-xl p-3 mt-2 text-sm" style={{ background: t.warningSoft, color: t.warningText }}>
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>
                {N(n.diasMes) > 31 ? "Um mês tem no máximo 31 dias. " : ""}
                {N(n.horasDia) > 24 ? "Um dia tem no máximo 24 horas. " : ""}
                Revise esses números — capacidade inflada faz o custo por hora, e o preço final, ficarem subestimados.
              </span>
            </div>
          )}
          {nd.numeroProfissionais === 1 && (
            <p className="text-[11px] mt-1.5" style={{ color: t.primaryText }}>
              Trabalhando sozinho(a), o campo "comissão" na Calculadora provavelmente não se aplica — o que sobra é seu pró-labore, não uma comissão para terceiros.
            </p>
          )}
        </SecaoColapsavel>

        <SecaoColapsavel resumo={N(n.proLabore) > 0 ? `${fmtBRL(N(n.proLabore))}/mês` : "não definido"} abertoInicial={!configuradoSalvo} titulo="Pró-labore do dono" icon={PiggyBank}
          ajuda="É o seu próprio salário. Mesmo trabalhando pra si, seu tempo tem custo — se não colocar isso aqui, o app vai achar que seu trabalho é de graça." faq="o-que-e-pro-labore">
          <Campo label="Quanto você retira do negócio por mês (ou pagaria a si mesmo por essa função)" hint="Erro clássico de MEI/microempresa: não contar o próprio trabalho como custo.">
            <CampoMoeda value={n.proLabore} onChange={(v) => setN({ ...n, proLabore: v })} />
          </Campo>
          {N(n.proLabore) <= 0 && (
            <div className="pop-in flex gap-2 items-start rounded-xl p-2.5 mt-2 text-xs" style={{ background: t.dangerSoft, color: t.danger }}>
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              Sem pró-labore definido, seu trabalho está sendo tratado como grátis nos cálculos.
            </div>
          )}
        </SecaoColapsavel>

        <SecaoColapsavel resumo="consulta" titulo="Referência salarial sindical (consulta)" icon={Landmark}>
          <div className="flex gap-2 items-start rounded-xl p-3 text-xs mb-3" style={{ background: t.warningSoft, color: t.warningText }}>
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              Essa convenção vale para o Estado da Bahia, <b>exceto Salvador e municípios com sindicato patronal
              próprio</b> — o que provavelmente inclui Feira de Santana (que tem o SINDBEFS). Use como referência de
              contexto, não como número automático — nada aqui entra em nenhum cálculo sozinho.
            </span>
          </div>
          <div className="space-y-1">
            {REFERENCIA_SALARIAL.pisos.map((p) => (
              <div key={p.funcao} className="flex items-center justify-between text-xs py-1" style={{ borderBottom: `1px solid ${t.border}` }}>
                <span style={{ color: t.textMuted }}>{p.funcao}</span>
                <span className="font-num font-medium" style={{ color: t.text }}>{fmtBRL(p.valor)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs py-2 mt-1" style={{ color: t.textMuted }}>
            <span>{REFERENCIA_SALARIAL.beneficio.nome}</span>
            <span className="font-num font-medium shrink-0 ml-2" style={{ color: t.text }}>{fmtBRL(REFERENCIA_SALARIAL.beneficio.valor)}/mês</span>
          </div>
          <div className="text-[11px] mt-1">
            <Selo tipo="legal">{REFERENCIA_SALARIAL.fonte} — {REFERENCIA_SALARIAL.documento}</Selo>
          </div>
        </SecaoColapsavel>

        <SecaoColapsavel resumo={n.regime === "indefinido" ? "não definido" : n.regime === "mei" ? "MEI" : `Simples · ${fmtPct(nd.impostoPct, 1)}`} abertoInicial={!configuradoSalvo} titulo="Regime tributário" icon={Landmark}>
          <div className="flex gap-1.5 mb-3">
            {[
              { id: "indefinido", label: "Ainda não sei" },
              { id: "mei", label: "MEI" },
              { id: "simples", label: "Simples Nacional" },
            ].map((r) => (
              <button key={r.id} onClick={() => setN({ ...n, regime: r.id })}
                className="btn-press rounded-lg px-3 py-1.5 text-xs font-medium"
                style={{
                  background: n.regime === r.id ? t.primary : t.surfaceAlt,
                  color: n.regime === r.id ? t.onPrimary : t.textMuted,
                  border: `1px solid ${n.regime === r.id ? t.primary : t.border}`,
                }}>
                {r.label}
              </button>
            ))}
          </div>

          {n.regime === "indefinido" && (
            <div className="flex gap-2 items-start rounded-xl p-3 text-sm" style={{ background: t.surfaceAlt, color: t.textMuted }}>
              <Info size={15} className="mt-0.5 shrink-0" />
              Sem regime definido, nenhum imposto entra no preço calculado — o preço final ficará subestimado. Defina assim que souber.
            </div>
          )}

          {n.regime === "mei" && (
            <Campo label="Valor do seu DAS-MEI atual (do boleto mensal)" hint="O DAS-MEI é um valor fixo, não um % do faturamento — por isso ele entra como custo fixo, não como imposto sobre o preço.">
              <CampoMoeda value={n.meiDas} onChange={(v) => setN({ ...n, meiDas: v })} />
            </Campo>
          )}

          {n.regime === "simples" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Campo label="Receita bruta últimos 12 meses (RBT12)" faq="rbt12-aliquota-efetiva"
                  ajuda="Tudo o que o negócio faturou nos últimos 12 meses, somado. O Simples Nacional usa esse total pra achar sua alíquota: quanto maior o faturamento acumulado, maior o percentual de imposto. Seu contador tem esse número.">
                  <CampoMoeda value={n.rbt12} onChange={(v) => setN({ ...n, rbt12: v })} />
                </Campo>
                <Campo label="Folha de pagamento 12 meses" hint="salários + pró-labore + encargos + FGTS" faq="fator-r"
                  ajuda="Quanto o negócio gastou com pessoas em 12 meses, incluindo o seu pró-labore. Dividido pelo faturamento, isso dá o Fator R: a partir de 28%, o imposto pode cair do Anexo V para o Anexo III, que é mais barato.">
                  <CampoMoeda value={n.folha12} onChange={(v) => setN({ ...n, folha12: v })} />
                </Campo>
              </div>
              {nd.temParceriaValida && (
                <p className="text-[11px] flex items-start gap-1" style={{ color: t.primaryText }}>
                  <Info size={12} className="mt-0.5 shrink-0" />
                  <span>
                    Com parceiros: a receita de 12 meses é a do salão, já sem as cotas-parte repassadas, e a folha não inclui
                    os parceiros (eles não são empregados).
                  </span>
                </p>
              )}
              <label className="flex items-start gap-2 text-xs rounded-xl p-2.5" style={{ background: t.surfaceAlt, color: t.textMuted }}>
                <input type="checkbox" className="mt-0.5" checked={n.atividadeSempreAnexoIII}
                  onChange={(e) => setN({ ...n, atividadeSempreAnexoIII: e.target.checked })} />
                <span>
                  Minha atividade principal é cabeleireiro, barbeiro, manicure, pedicure, esteticista ou depilador — pela
                  Solução de Consulta Cosit nº 127/2021, a Receita Federal entende que esses serviços vão para o Anexo III
                  independentemente do Fator R. Desmarque se quiser que eu aplique o Fator R normalmente. Confirme com
                  seu contador antes de decidir.
                </span>
              </label>

              <DiagnosticoSimples n={n} nd={nd} />

              {nd.aliqInfo && N(n.rbt12) > 0 && (
                <div className="rounded-xl p-3" style={{ background: t.surfaceAlt }}>
                  <p className="text-[11px] font-medium mb-1" style={{ color: t.textMuted }}>Detalhes do cálculo</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: t.textMuted }}>
                    <span>Fator R: <b className="font-num">{fmtPct((nd.fatorR || 0) * 100)}</b><Ajuda faq="fator-r" texto="Folha de pagamento ÷ faturamento dos últimos 12 meses. A partir de 28%, serviços que estariam no Anexo V passam para o Anexo III, com imposto menor." /></span>
                    <span>Anexo aplicado: <b>{nd.anexoUsado}</b></span>
                    <span>Alíquota nominal: <b className="font-num">{fmtPct(nd.aliqInfo.aliqNominal * 100)}</b><Ajuda faq="rbt12-aliquota-efetiva" texto="O percentual de tabela da sua faixa de faturamento. Não é o que você paga de fato: a lei desconta uma parcela fixa, e o resultado é a alíquota efetiva ao lado." /></span>
                    <span>Alíquota efetiva: <b className="font-num">{fmtPct(nd.impostoPct, 2)}</b><Ajuda faq="rbt12-aliquota-efetiva" texto="O percentual de imposto que você realmente paga sobre cada venda. É este número que o app embute no preço dos seus serviços." /></span>
                  </div>
                </div>
              )}
              <div className="text-[11px]"><Selo tipo="legal">tabela Simples Nacional 2026, Anexos III e V — LC 123/2006</Selo></div>
            </div>
          )}
        </SecaoColapsavel>

        <SecaoColapsavel resumo={N(n.capitalInvestido) > 0 ? `${fmtBRL(N(n.capitalInvestido))} investido` : "não definido"} titulo="Para o ponto de equilíbrio econômico" icon={TrendingUp}
          faq="ponto-de-equilibrio"
          ajuda="Opcional. Serve pra responder: o negócio rende mais do que se esse dinheiro estivesse aplicado no banco? Se rende menos, você está trabalhando sem o retorno que o risco do negócio exige.">
          <div className="grid grid-cols-2 gap-2">
            <Campo label="Capital investido no negócio" hint="equipamentos, reforma, capital de giro">
              <CampoMoeda value={n.capitalInvestido} onChange={(v) => setN({ ...n, capitalInvestido: v })} />
            </Campo>
            <Campo label="Taxa de retorno alternativa ao mês" hint="ex: CDI do seu banco">
              <div className="flex items-center gap-1">
                <input className={CAMPO + " font-num"} style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                  type="number" min="0" step="0.1" value={n.taxaRetorno}
                  onChange={(e) => setN({ ...n, taxaRetorno: e.target.value })} />
                <span className="text-sm" style={{ color: t.textMuted }}>%</span>
              </div>
            </Campo>
          </div>
        </SecaoColapsavel>

        <CopiaSeguranca />

        <div className="flex items-center justify-center py-1">
          <IndicadorAutoSalvar status={statusSalvar} />
        </div>
        <p className="text-[11px] text-center" style={{ color: t.textMuted }}>🔒 Seus dados ficam salvos neste dispositivo, sozinho — não precisa de botão.</p>
      </div>

      <div className="space-y-4 min-w-0">
        <div className="pop-in rounded-2xl p-5" style={{ backgroundImage: GRADIENTE, color: "#fff" }}>
          <span className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,.85)" }}>Resumo do negócio</span>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <ResumoItem label="Custo fixo total/mês" valor={fmtBRL(nd.custoFixoTotal)} />
            <ResumoItem label="Custo fixo por hora" valor={fmtBRL(nd.custoFixoPorHora)} />
            <ResumoItem label="Capacidade/mês" valor={`${nd.horasTotais || 0} h`} />
            <ResumoItem label="Imposto sobre preço" valor={fmtPct(nd.impostoPct, 2)} />
            {nd.receitaAluguelCadeiras > 0 && (
              <ResumoItem label="Aluguel de cadeiras recebido" valor={`− ${fmtBRL(nd.receitaAluguelCadeiras)}`} />
            )}
            {nd.comissaoEquipe && (
              <ResumoItem label="Comissão média da equipe" valor={fmtPct(nd.comissaoEquipe.pct)} />
            )}
            {nd.taxaRecebimento && (
              <ResumoItem label="Taxa média de recebimento" valor={fmtPct(nd.taxaRecebimento.pct, 2)} />
            )}
          </div>
          {nd.receitaAluguelCadeiras > 0 && (
            <p className="text-[11px] mt-3" style={{ color: "rgba(255,255,255,.85)" }}>
              O custo fixo por hora já desconta o aluguel recebido: {fmtBRL(nd.custoFixoLiquido)} ÷ {nd.horasTotais || 0} h.
            </p>
          )}
        </div>
        <div className="rounded-2xl p-4 flex gap-2 items-start" style={{ background: t.surfaceAlt, border: `1px dashed ${t.border}` }}>
          <HelpCircle size={16} className="mt-0.5 shrink-0" style={{ color: t.textMuted }} />
          <p className="text-xs" style={{ color: t.textMuted }}>
            Essas configurações valem para o negócio inteiro. Cada serviço que você calcular na aba Calculadora usa esse
            custo fixo por hora e essa alíquota de imposto automaticamente.
          </p>
        </div>
      </div>
      {toastNode}
    </div>
  );
}

function ResumoItem({ label, valor }) {
  return (
    <div>
      <p className="text-[11px]" style={{ color: "rgba(255,255,255,.75)" }}>{label}</p>
      <p className="font-num font-semibold text-sm mt-0.5">{valor}</p>
    </div>
  );
}

/* ======================================================================= */
/* Aba: Calculadora                                                        */
/* ======================================================================= */
/* Item do catálogo de insumos COMPARTILHADOS (nível negócio) — mesma ideia    */
/* do item de custo variável, só que sem "valor direto" (tem que ser          */
/* quantificável pra poder ser compartilhado) e sem "quanto usa por           */
/* atendimento" (isso agora é decidido em CADA serviço que referenciar).      */
function ItemInsumoCompartilhado({ item, onChange, onRemove }) {
  const t = useT();
  const [caixaAberta, setCaixaAberta] = useState(!!(item.embalagens || item.unidadesPorEmbalagem));
  const modo = item.modo || "duracao";
  const setCampo = (campo, valor) => onChange({ ...item, [campo]: valor });
  const inputEst = { background: t.surface, border: `1px solid ${t.border}`, color: t.text };

  return (
    <div className="rounded-xl p-2.5" style={{ background: t.surfaceAlt }}>
      <div className="flex gap-2 items-center">
        <input className={CAMPO + " min-w-0"} style={inputEst} placeholder="ex: shampoo" value={item.nome}
          onChange={(e) => setCampo("nome", e.target.value)} />
        <button onClick={onRemove} className="btn-press touch-target-48 shrink-0" style={{ color: t.danger }} aria-label="Remover insumo">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="flex gap-1 mt-2 p-0.5 rounded-lg" style={{ background: t.surface, border: `1px solid ${t.border}` }} role="tablist">
        {[{ id: "duracao", label: "Por duração" }, { id: "unidade", label: "Por unidade" }].map((m) => (
          <button key={m.id} role="tab" aria-selected={modo === m.id} onClick={() => setCampo("modo", m.id)}
            className="btn-press flex-1 rounded-md py-1 text-[10.5px] font-medium"
            style={{ background: modo === m.id ? t.primary : "transparent", color: modo === m.id ? t.onPrimary : t.textMuted }}>
            {m.label}
          </button>
        ))}
      </div>

      {modo === "duracao" && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Campo label="Valor da compra"><CampoMoeda value={item.valorCompra} onChange={(v) => setCampo("valorCompra", v)} /></Campo>
          <Campo label="Dura quanto tempo?">
            <div className="flex gap-1">
              <input className={CAMPO + " font-num"} style={{ ...inputEst, width: 54 }} type="number" min="0"
                value={item.duracaoValor || ""} onChange={(e) => setCampo("duracaoValor", e.target.value)} />
              <select value={item.duracaoUnidade || "dias"} onChange={(e) => setCampo("duracaoUnidade", e.target.value)}
                className="rounded-xl px-1.5 text-xs" style={inputEst}>
                <option value="dias">dias</option>
                <option value="semanas">semanas</option>
                <option value="meses">meses</option>
              </select>
            </div>
          </Campo>
        </div>
      )}

      {modo === "unidade" && (
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-1.5 text-[11px]" style={{ color: t.textMuted }}>
            <input type="checkbox" checked={caixaAberta} onChange={(e) => setCaixaAberta(e.target.checked)} />
            comprei em caixa/pacote fechado
          </label>
          {caixaAberta ? (
            <div className="grid grid-cols-3 gap-2">
              <Campo label="Valor pago"><CampoMoeda value={item.valorCompra} onChange={(v) => setCampo("valorCompra", v)} /></Campo>
              <Campo label="Nº de embalagens">
                <input className={CAMPO + " font-num"} style={inputEst} type="number" min="0" value={item.embalagens || ""}
                  onChange={(e) => onChange({ ...item, embalagens: e.target.value, quantidadeComprada: N(e.target.value) * N(item.unidadesPorEmbalagem) })} />
              </Campo>
              <Campo label="Unid. por embalagem">
                <input className={CAMPO + " font-num"} style={inputEst} type="number" min="0" value={item.unidadesPorEmbalagem || ""}
                  onChange={(e) => onChange({ ...item, unidadesPorEmbalagem: e.target.value, quantidadeComprada: N(item.embalagens) * N(e.target.value) })} />
              </Campo>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Valor pago"><CampoMoeda value={item.valorCompra} onChange={(v) => setCampo("valorCompra", v)} /></Campo>
              <Campo label="Quantidade comprada">
                <input className={CAMPO + " font-num"} style={inputEst} type="number" min="0" value={item.quantidadeComprada || ""}
                  onChange={(e) => setCampo("quantidadeComprada", e.target.value)} />
              </Campo>
            </div>
          )}
          {N(item.quantidadeComprada) > 0 && (
            <p className="text-[11px]" style={{ color: t.textMuted }}>
              preço unitário: <b className="font-num" style={{ color: t.text }}>{fmtBRL(precoUnitarioItem(item))}</b>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* Card de UM item de custo variável, com os três modos de preenchimento. */
function ItemCustoVariavel({ item, onChange, onRemove, contexto }) {
  const t = useT();
  const [caixaAberta, setCaixaAberta] = useState(!!(item.embalagens || item.unidadesPorEmbalagem));
  const modo = item.modo || "direto";
  const valorCalculado = calcularValorItemVariavel(item, contexto);
  const setCampo = (campo, valor) => onChange({ ...item, [campo]: valor });
  const inputEst = { background: t.surface, border: `1px solid ${t.border}`, color: t.text };

  const modos = [
    { id: "direto", label: "Direto" },
    { id: "duracao", label: "Duração" },
    { id: "unidade", label: "Unidade" },
    { id: "compartilhado", label: "Compartilhado" },
  ];
  const insumosDisponiveis = contexto?.insumosCompartilhados || [];
  const insumoRef = insumosDisponiveis.find((i) => i.id === item.insumoId) || null;

  return (
    <div className="rounded-xl p-2.5" style={{ background: t.surfaceAlt }}>
      <div className="flex gap-2 items-center">
        <input className={CAMPO} style={inputEst} placeholder="ex: shampoo" value={item.nome}
          onChange={(e) => setCampo("nome", e.target.value)} />
        <button onClick={onRemove} className="btn-press touch-target-48 shrink-0" style={{ color: t.danger }} aria-label="Remover item">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="flex gap-1 mt-2 p-0.5 rounded-lg" style={{ background: t.surface, border: `1px solid ${t.border}` }} role="tablist">
        {modos.map((m) => (
          <button key={m.id} role="tab" aria-selected={modo === m.id} onClick={() => setCampo("modo", m.id)}
            className="btn-press flex-1 rounded-md py-1 text-[10.5px] font-medium"
            style={{ background: modo === m.id ? t.primary : "transparent", color: modo === m.id ? t.onPrimary : t.textMuted }}>
            {m.label}
          </button>
        ))}
      </div>

      {modo === "direto" && (
        <div className="mt-2" style={{ width: 130 }}>
          <CampoMoeda value={item.valor} onChange={(v) => setCampo("valor", v)} />
        </div>
      )}

      {modo === "duracao" && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Campo label="Valor da compra"><CampoMoeda value={item.valorCompra} onChange={(v) => setCampo("valorCompra", v)} /></Campo>
          <Campo label="Dura quanto tempo?">
            <div className="flex gap-1">
              <input className={CAMPO + " font-num"} style={{ ...inputEst, width: 54 }} type="number" min="0"
                value={item.duracaoValor || ""} onChange={(e) => setCampo("duracaoValor", e.target.value)} />
              <select value={item.duracaoUnidade || "dias"} onChange={(e) => setCampo("duracaoUnidade", e.target.value)}
                className="rounded-xl px-1.5 text-xs" style={inputEst}>
                <option value="dias">dias</option>
                <option value="semanas">semanas</option>
                <option value="meses">meses</option>
              </select>
            </div>
          </Campo>
        </div>
      )}

      {modo === "unidade" && (
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-1.5 text-[11px]" style={{ color: t.textMuted }}>
            <input type="checkbox" checked={caixaAberta} onChange={(e) => setCaixaAberta(e.target.checked)} />
            comprei em caixa/pacote fechado
          </label>
          {caixaAberta ? (
            <div className="grid grid-cols-3 gap-2">
              <Campo label="Valor pago"><CampoMoeda value={item.valorCompra} onChange={(v) => setCampo("valorCompra", v)} /></Campo>
              <Campo label="Nº de embalagens">
                <input className={CAMPO + " font-num"} style={inputEst} type="number" min="0" value={item.embalagens || ""}
                  onChange={(e) => onChange({ ...item, embalagens: e.target.value, quantidadeComprada: N(e.target.value) * N(item.unidadesPorEmbalagem) })} />
              </Campo>
              <Campo label="Unid. por embalagem">
                <input className={CAMPO + " font-num"} style={inputEst} type="number" min="0" value={item.unidadesPorEmbalagem || ""}
                  onChange={(e) => onChange({ ...item, unidadesPorEmbalagem: e.target.value, quantidadeComprada: N(item.embalagens) * N(e.target.value) })} />
              </Campo>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Valor pago"><CampoMoeda value={item.valorCompra} onChange={(v) => setCampo("valorCompra", v)} /></Campo>
              <Campo label="Quantidade comprada">
                <input className={CAMPO + " font-num"} style={inputEst} type="number" min="0" value={item.quantidadeComprada || ""}
                  onChange={(e) => setCampo("quantidadeComprada", e.target.value)} />
              </Campo>
            </div>
          )}
          <Campo label="Quanto usa por atendimento" hint="ex: 1 touca, ou 0,5 (meia unidade)">
            <input className={CAMPO + " font-num"} style={{ ...inputEst, width: 100 }} type="number" min="0" step="0.1"
              value={item.usoPorAtendimento || ""} onChange={(e) => setCampo("usoPorAtendimento", e.target.value)} />
          </Campo>
          {N(item.quantidadeComprada) > 0 && (
            <p className="text-[11px]" style={{ color: t.textMuted }}>
              preço unitário calculado: <b className="font-num" style={{ color: t.text }}>{fmtBRL(precoUnitarioItem(item))}</b>
            </p>
          )}
        </div>
      )}

      {modo === "compartilhado" && (
        <div className="mt-2 space-y-2">
          {insumosDisponiveis.length === 0 ? (
            <p className="text-[11px]" style={{ color: t.warningText }}>
              Nenhum insumo compartilhado cadastrado ainda — crie um na aba Negócio, seção "Insumos compartilhados".
            </p>
          ) : (
            <>
              <Campo label="Qual insumo?">
                <select value={item.insumoId || ""} onChange={(e) => setCampo("insumoId", e.target.value)}
                  className={CAMPO} style={inputEst}>
                  <option value="">selecione...</option>
                  {insumosDisponiveis.map((i) => <option key={i.id} value={i.id}>{i.nome || "(sem nome)"}</option>)}
                </select>
              </Campo>
              {insumoRef && insumoRef.modo === "unidade" && (
                <Campo label="Quanto usa por atendimento" hint="ex: 1 touca, ou 0,5 (meia unidade)">
                  <input className={CAMPO + " font-num"} style={{ ...inputEst, width: 100 }} type="number" min="0" step="0.1"
                    value={item.usoPorAtendimento || ""} onChange={(e) => setCampo("usoPorAtendimento", e.target.value)} />
                </Campo>
              )}
              {insumoRef && insumoRef.modo === "duracao" && (() => {
                const jaAlocado = N(contexto?.alocacaoPorInsumoOutrosServicos?.[item.insumoId]);
                const total = jaAlocado + N(item.percentualAlocado);
                return (
                  <Campo label="% deste insumo alocado a este serviço" hint="some entre os serviços que usam o mesmo insumo — não passe de 100% no total">
                    <div className="flex items-center gap-1">
                      <input className={CAMPO + " font-num"} style={{ ...inputEst, width: 70 }} type="number" min="0" max="100"
                        value={item.percentualAlocado || ""} onChange={(e) => setCampo("percentualAlocado", e.target.value)} />
                      <span className="text-sm" style={{ color: t.textMuted }}>%</span>
                    </div>
                    {jaAlocado > 0 && (
                      <p className="text-[11px] mt-1" style={{ color: total > 100 ? t.danger : t.textMuted }}>
                        outros serviços já usam {fmtPct(jaAlocado)} desse insumo — com este, dá {fmtPct(total)}
                        {total > 100 ? " (passou de 100%)" : ""}
                      </p>
                    )}
                  </Campo>
                );
              })()}
              {!insumoRef && item.insumoId && (
                <p className="text-[11px]" style={{ color: t.danger }}>Esse insumo não existe mais — escolha outro.</p>
              )}
            </>
          )}
        </div>
      )}

      {modo !== "direto" && (
        <div className="mt-2 flex items-center justify-between rounded-lg px-2 py-1.5" style={{ background: t.primarySoft }}>
          <span className="text-[11px] inline-flex items-center gap-1" style={{ color: t.primaryText }}><Sparkles size={11} /> estimativa por atendimento</span>
          <span className="font-num text-xs font-semibold" style={{ color: t.primaryText }}>{fmtBRL(valorCalculado)}</span>
        </div>
      )}
    </div>
  );
}

function ListaCustosVariaveis({ itens, setItens, contexto }) {
  const t = useT();
  const add = () => setItens([...itens, { id: uid(), nome: "", modo: "duracao", valor: "" }]);
  const remove = (id) => setItens(itens.filter((i) => i.id !== id));
  const updateItem = (novoItem) => setItens(itens.map((i) => (i.id === novoItem.id ? novoItem : i)));
  const total = itens.reduce((s, i) => s + calcularValorItemVariavel(i, contexto), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold" style={{ color: t.text }}>
          Produtos e Materiais Usados no Serviço
          <Ajuda texto="O que você gasta especificamente nesse atendimento — produto, luva, touca. Em contabilidade isso se chama 'custo variável'." />
        </span>
        <span className="font-num text-xs" style={{ color: t.textMuted }}>{fmtBRL(total)}</span>
      </div>
      <p className="text-[11px] mb-2" style={{ color: t.textMuted }}>
        Não sabe quanto gasta por atendimento? Escolha <b>"por duração"</b> (quanto tempo uma compra dura) ou
        <b> "por unidade"</b> (quanto usa de cada vez) — o valor por atendimento é calculado sozinho.
      </p>
      <div className="space-y-2">
        {itens.map((item) => (
          <ItemCustoVariavel key={item.id} item={item} onChange={updateItem} onRemove={() => remove(item.id)} contexto={contexto} />
        ))}
      </div>
      <button onClick={add} className="btn-press mt-2 inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1.5"
        style={{ color: t.primaryText, background: t.primarySoft }}>
        <Plus size={13} /> adicionar item
      </button>
    </div>
  );
}

/* Card compacto de um serviço salvo, na biblioteca "Meus serviços".      */
function ServicoCard({ s, onEditar, onExcluir, onAceitarNovoPreco, diasMesNegocio }) {
  const t = useT();
  const [confirmando, setConfirmando] = useState(false);
  const [expandido, setExpandido] = useState(false);
  const ok = s.calc.status === "ok";
  const statusCor = !ok ? t.danger : (N(s.margemPct) < 15 ? t.warning : t.success);
  const rHora = ok && N(s.horasPorAtendimento) > 0 ? s.calc.preco / N(s.horasPorAtendimento) : null;
  const peMensal = ok && Number.isFinite(s.calc.pontoEquilibrioServico) ? Math.ceil(s.calc.pontoEquilibrioServico) : null;
  const peSemanal = peMensal !== null ? Math.ceil(pontoEquilibrioSemanal(s.calc.pontoEquilibrioServico, diasMesNegocio)) : null;
  // "precoConfirmado" é só um retrato pra detectar mudança e avisar — nunca usado em nenhum cálculo real.
  // Serviço antigo (sem esse campo) usa o próprio preço atual como base, pra não disparar aviso falso.
  const baseline = s.precoConfirmado ?? (ok ? s.calc.preco : null);
  const desatualizado = ok && baseline !== null && Math.abs(s.calc.preco - baseline) > 0.005;
  const lucroReal = ok ? (s.modo === "ja-tenho" ? s.calc.lucroLiquido : s.calc.valorMargem) : 0;

  return (
    <div className="fade-up rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}`, borderLeft: `4px solid ${statusCor}`, boxShadow: t.shadow, overflow: "hidden" }}>
      <button onClick={() => setExpandido((v) => !v)} className="btn-press w-full text-left p-4" aria-label={`Ver detalhes de ${s.nome}`} aria-expanded={expandido}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: t.text }}>{s.nome}</p>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {s.categoria && (
                <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: t.surfaceAlt, color: t.textMuted }}>{s.categoria}</span>
              )}
              {s.tipo === "produto" && (
                <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: t.secondarySoft, color: t.secondaryText }}>Produto</span>
              )}
            </div>
          </div>
          <ChevronDown size={16} style={{ color: t.textMuted, flexShrink: 0, marginTop: 2, transform: expandido ? "rotate(180deg)" : "none", transition: "transform .2s ease" }} />
        </div>
        {ok ? (
          <>
            <div className="grid grid-cols-3 gap-2 mt-2.5">
              <div>
                <p className="text-[10px]" style={{ color: t.textMuted }}>Preço</p>
                <p className="font-num text-base font-bold" style={{ color: t.text }}>{fmtBRL(s.calc.preco)}</p>
              </div>
              <div>
                <p className="text-[10px]" style={{ color: t.textMuted }}>Margem/atend.</p>
                <p className="font-num text-sm font-medium" style={{ color: t.text }}>{fmtBRL(s.calc.margemContribuicaoUnitaria)}</p>
              </div>
              <div>
                <p className="text-[10px]" style={{ color: t.textMuted }}>R$/hora</p>
                <p className="font-num text-sm font-medium" style={{ color: t.text }}>{rHora !== null ? fmtBRL(rHora) : "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-[11px]" style={{ color: t.primaryText }}>
              <TrendingUp size={11} />
              <span>Ponto de equilíbrio: {peMensal !== null ? `${peMensal}/mês · ${peSemanal}/semana` : "—"}</span>
            </div>
            <p className="text-[11px] mt-1" style={{ color: t.textMuted }}>
              {s.horasPorAtendimento}h/atend. · editado em {new Date(s.editadoEm || s.criadoEm).toLocaleDateString("pt-BR")}
            </p>
          </>
        ) : (
          <p className="text-xs mt-2" style={{ color: t.danger }}>Inválido com a configuração atual — toque para ver detalhes.</p>
        )}
      </button>

      {expandido && (
        <div className="px-4 pb-4 pop-in" style={{ borderTop: `1px solid ${t.border}` }} onClick={(e) => e.stopPropagation()}>
          {ok && s.precoSeparadoReferencia !== undefined && s.precoSeparadoReferencia !== null && (
            <div className="mt-3">
              <ComparativoPacote somaSeparado={s.precoSeparadoReferencia} precoPacote={s.calc.preco} />
            </div>
          )}
          <p className="text-xs font-semibold mt-3 mb-2" style={{ color: t.text }}>Decomposição do preço</p>
          {ok ? (
            <>
              <GraficoRoscaPreco materiais={s.calc.totalVariaveis} custoFixo={s.calc.custoFixoRateado}
                taxas={s.calc.valorComissao + s.calc.valorTaxaCartao + s.calc.valorImposto} lucro={lucroReal} preco={s.calc.preco} />
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div className="rounded-lg p-2" style={{ background: t.surfaceAlt }}>
                  <p style={{ color: t.textMuted }}>Tempo do atendimento</p>
                  <p className="font-num font-medium mt-0.5" style={{ color: t.text }}>{s.horasPorAtendimento}h</p>
                </div>
                <div className="rounded-lg p-2" style={{ background: t.surfaceAlt }}>
                  <p style={{ color: t.textMuted }}>Atendimentos/mês</p>
                  <p className="font-num font-medium mt-0.5" style={{ color: t.text }}>{s.atendimentosMes}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs" style={{ color: t.danger }}>Não dá pra decompor — os dados deste serviço ficaram inválidos com a configuração atual do negócio.</p>
          )}

          <button onClick={() => onEditar(s)} className="btn-press touch-target w-full mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold"
            style={{ background: t.primaryText, color: t.onPrimary }}>
            <Pencil size={14} /> Editar serviço
          </button>
        </div>
      )}

      {(desatualizado && !confirmando) && (
        <div className="px-4 pb-3">
          <div className="pop-in flex items-center justify-between gap-2 rounded-lg p-2 text-[11px]" style={{ background: t.warningSoft, color: t.warningText }}>
            <span>Preço desatualizado — recalculado de {fmtBRL(baseline)} para {fmtBRL(s.calc.preco)}</span>
            <button onClick={() => onAceitarNovoPreco(s)} className="btn-press font-semibold underline shrink-0">Aceitar</button>
          </div>
        </div>
      )}
      {confirmando && (
        <div className="px-4 pb-3">
          <div className="pop-in flex items-center gap-2 text-xs" style={{ color: t.danger }}>
            <span>Excluir "{s.nome}"?</span>
            <button onClick={() => onExcluir(s.id)} className="btn-press font-semibold underline">Sim, excluir</button>
            <button onClick={() => setConfirmando(false)} className="btn-press underline" style={{ color: t.textMuted }}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="flex gap-1 justify-end px-3 pb-3">
        <button onClick={() => onEditar(s)} aria-label={`Editar ${s.nome}`} className="btn-press touch-target-48 p-1.5 rounded-lg" style={{ color: t.primaryText }}><Pencil size={14} /></button>
        {!confirmando && (
          <button onClick={() => setConfirmando(true)} aria-label={`Excluir ${s.nome}`} className="btn-press touch-target-48 p-1.5 rounded-lg" style={{ color: t.danger }}><Trash2 size={14} /></button>
        )}
      </div>
    </div>
  );
}

/* Biblioteca "Meus serviços": busca, ordenação e a lista de cards.        */
function BibliotecaServicos({ servicosCalc, onEditar, onExcluir, onAceitarNovoPreco, onNovo, diasMesNegocio }) {
  const t = useT();
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState("nome");

  const rHoraDe = (s) => (s.calc.status === "ok" && N(s.horasPorAtendimento) > 0) ? s.calc.preco / N(s.horasPorAtendimento) : -1;
  const comparadores = {
    nome: (a, b) => a.nome.localeCompare(b.nome, "pt-BR"),
    preco: (a, b) => (b.calc.status === "ok" ? b.calc.preco : -1) - (a.calc.status === "ok" ? a.calc.preco : -1),
    margem: (a, b) => (b.calc.status === "ok" ? b.calc.margemContribuicaoUnitaria : -1) - (a.calc.status === "ok" ? a.calc.margemContribuicaoUnitaria : -1),
    rhora: (a, b) => rHoraDe(b) - rHoraDe(a),
  };

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const filtrada = servicosCalc.filter((s) => !termo || s.nome.toLowerCase().includes(termo) || (s.categoria || "").toLowerCase().includes(termo));
    return [...filtrada].sort(comparadores[ordenacao]);
  }, [servicosCalc, busca, ordenacao]);

  if (servicosCalc.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center mb-6" style={{ background: t.surfaceAlt, border: `1px dashed ${t.border}` }}>
        <Calculator size={22} className="mx-auto mb-3" style={{ color: t.textMuted }} />
        <p className="text-sm font-medium" style={{ color: t.text }}>Nenhum serviço salvo ainda</p>
        <button onClick={onNovo} className="btn-press mt-3 rounded-xl px-4 py-2 text-sm font-semibold" style={{ background: t.success, color: t.onSuccess }}>
          Criar meu primeiro serviço
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold" style={{ color: t.text }}>Meus serviços</p>
        <button onClick={onNovo} className="btn-press inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold" style={{ background: t.success, color: t.onSuccess }}>
          <Plus size={13} /> Novo serviço
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          className={CAMPO} style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text, flex: 1 }}
          placeholder="Buscar por nome ou categoria" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar serviço"
        />
        <select
          value={ordenacao} onChange={(e) => setOrdenacao(e.target.value)} aria-label="Ordenar por"
          className={CAMPO} style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text, width: 132, flexShrink: 0 }}
        >
          <option value="nome">Nome</option>
          <option value="preco">Preço</option>
          <option value="margem">Margem</option>
          <option value="rhora">R$/hora</option>
        </select>
      </div>

      <div className="space-y-2.5">
        {lista.map((s) => (
          <ServicoCard key={s.id} s={s} onEditar={onEditar} onExcluir={onExcluir} onAceitarNovoPreco={onAceitarNovoPreco} diasMesNegocio={diasMesNegocio} />
        ))}
        {lista.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: t.textMuted }}>Nenhum serviço encontrado para "{busca}".</p>
        )}
      </div>
    </div>
  );
}

/* Comparativo ao vivo entre o preço salvo (recalculado com config. atual) e o preço com as edições em andamento. */
function ComparativoPreco({ original, novo }) {
  const t = useT();
  const diff = novo - original;
  const diffPct = original > 0 ? (diff / original) * 100 : 0;
  const mudou = Math.abs(diff) > 0.005;
  return (
    <div className="rounded-2xl p-4" style={{ background: t.surfaceAlt, border: `1px solid ${t.border}` }}>
      <p className="text-xs font-semibold mb-2" style={{ color: t.text }}>Preço salvo × novo preço</p>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px]" style={{ color: t.textMuted }}>Salvo (config. atual)</p>
          <p className="font-num text-sm font-medium" style={{ color: t.text }}>{fmtBRL(original)}</p>
        </div>
        <span style={{ color: t.textMuted }}>→</span>
        <div className="text-right">
          <p className="text-[10px]" style={{ color: t.textMuted }}>Com suas edições</p>
          <p className="font-num text-sm font-bold" style={{ color: t.text }}>{fmtBRL(novo)}</p>
        </div>
      </div>
      {mudou && (
        <p className="text-[11px] mt-2 text-center font-num font-medium" style={{ color: diff > 0 ? t.successText : t.danger }}>
          {diff > 0 ? "+" : ""}{fmtBRL(diff)} ({diff > 0 ? "+" : ""}{diffPct.toFixed(1)}%)
        </p>
      )}
    </div>
  );
}

function MontadorPacote({ servicosCalc, onMontar, nd }) {
  const t = useT();
  const [selecionados, setSelecionados] = useState([]);
  const [aberto, setAberto] = useState(false);
  const validos = servicosCalc.filter((s) => s.calc.status === "ok");
  if (validos.length < 2) return null;

  const toggle = (id) => setSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const itensSelecionados = validos.filter((s) => selecionados.includes(s.id));
  const somaPreco = itensSelecionados.reduce((s, x) => s + x.calc.preco, 0);
  const somaHoras = itensSelecionados.reduce((s, x) => s + N(x.horasPorAtendimento), 0);
  const precoMinimo = selecionados.length >= 2 ? calcularPrecoMinimoPacote(itensSelecionados, nd) : null;

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: t.surface, border: `1px dashed ${t.primaryText}66` }}>
      <button onClick={() => setAberto((v) => !v)} className="btn-press touch-target flex items-center justify-between w-full" aria-expanded={aberto}>
        <span className="text-sm font-semibold inline-flex items-center gap-1.5" style={{ color: t.text }}>
          <Sparkles size={14} style={{ color: t.primaryText }} /> Montar pacote de serviços
        </span>
        <ChevronDown size={15} style={{ color: t.textMuted, transform: aberto ? "rotate(180deg)" : "none", transition: "transform .2s ease" }} />
      </button>
      {aberto && (
        <div className="pop-in mt-3">
          <p className="text-[11px] mb-2" style={{ color: t.textMuted }}>
            Escolha 2 ou mais serviços que a pessoa faria junto (ex: escova + progressiva). O combo só sai mais barato
            se você reduzir tempo ou material de verdade no próximo passo — não é um desconto automático.
          </p>
          <div className="space-y-1.5">
            {validos.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm rounded-lg p-2 cursor-pointer" style={{ background: selecionados.includes(s.id) ? t.primarySoft : t.surfaceAlt }}>
                <input type="checkbox" checked={selecionados.includes(s.id)} onChange={() => toggle(s.id)} />
                <span className="flex-1" style={{ color: t.text }}>{s.nome}</span>
                <span className="font-num text-xs" style={{ color: t.textMuted }}>{fmtBRL(s.calc.preco)}</span>
              </label>
            ))}
          </div>
          {selecionados.length >= 2 && (
            <div className="pop-in mt-3 rounded-lg p-3" style={{ background: t.surfaceAlt }}>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: t.textMuted }}>Fazendo separado, somaria:</span>
                <span className="font-num font-semibold" style={{ color: t.text }}>{fmtBRL(somaPreco)}</span>
              </div>
              {precoMinimo?.status === "ok" && (
                <div className="flex items-center justify-between text-sm mt-1.5 pt-1.5" style={{ borderTop: `1px solid ${t.border}` }}>
                  <span className="inline-flex items-center gap-1" style={{ color: t.textMuted }}>
                    Preço mínimo recomendado
                    <Ajuda texto={`Usa a margem de "${precoMinimo.servicoMargemMenor}" (${fmtPct(precoMinimo.margemUsadaPct)}) — a menor entre os serviços escolhidos — como piso pro pacote inteiro, pra nenhum deles sair "carregando" desconto dos outros escondido. Abaixo desse valor, o combo passa a corroer a margem que você definiu.`} />
                  </span>
                  <span className="font-num font-semibold" style={{ color: t.primaryText }}>{fmtBRL(precoMinimo.precoMinimoRecomendado)}</span>
                </div>
              )}
              {precoMinimo?.status === "trava-percentual" && (
                <p className="text-[11px] mt-1.5" style={{ color: t.warningText }}>
                  Não dá pra calcular um piso pra esse combo — a soma de comissão + taxa de cartão + imposto + margem já passa de 100% mesmo antes do desconto.
                </p>
              )}
              <button onClick={() => onMontar(itensSelecionados, somaPreco, somaHoras)}
                className="btn-press touch-target w-full mt-2 rounded-xl px-3 py-2 text-sm font-semibold" style={{ background: t.primaryText, color: t.onPrimary }}>
                Montar pacote com esses {selecionados.length} serviços
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* Mostra a economia real do pacote comparado a fazer os serviços separados —  */
/* só aparece número verde se o preço do combo realmente ficou menor.          */
function ComparativoPacote({ somaSeparado, precoPacote }) {
  const t = useT();
  if (somaSeparado === null || somaSeparado === undefined || !Number.isFinite(precoPacote)) return null;
  const diferenca = somaSeparado - precoPacote;
  const diferencaPct = somaSeparado > 0 ? (diferenca / somaSeparado) * 100 : 0;
  const economizou = diferenca > 0.005;
  return (
    <div className="rounded-2xl p-4" style={{ background: economizou ? t.successSoft : t.surfaceAlt, border: `1px solid ${economizou ? t.success + "55" : t.border}` }}>
      <p className="text-xs font-semibold mb-2" style={{ color: economizou ? t.successText : t.text }}>Pacote × serviços separados</p>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px]" style={{ color: t.textMuted }}>Separado (soma)</p>
          <p className="font-num text-sm font-medium" style={{ color: t.text }}>{fmtBRL(somaSeparado)}</p>
        </div>
        <span style={{ color: t.textMuted }}>→</span>
        <div className="text-right">
          <p className="text-[10px]" style={{ color: t.textMuted }}>Pacote</p>
          <p className="font-num text-sm font-bold" style={{ color: t.text }}>{fmtBRL(precoPacote)}</p>
        </div>
      </div>
      <p className="text-[11px] mt-2 text-center font-num font-medium" style={{ color: economizou ? t.successText : t.danger }}>
        {economizou
          ? `Economia real de ${fmtBRL(diferenca)} (${diferencaPct.toFixed(1)}%) fazendo o pacote`
          : diferenca < -0.005
            ? `Esse pacote está ${fmtBRL(Math.abs(diferenca))} mais caro que separado — reduz tempo ou material se quiser economia real`
            : "Sem diferença ainda — reduza tempo ou material do combo pra gerar economia de verdade"}
      </p>
    </div>
  );
}

/* Semáforo de diagnóstico do Modo B — feedback imediato, sem jargão.       */
/* Caixa no padrão "semáforo": emoji + título curto + frase com número       */
/* concreto e próximo passo. Usada no diagnóstico de cada serviço, no        */
/* enquadramento do Simples Nacional e na escada de pontos de equilíbrio.    */
/* O emoji e o título carregam o estado — a cor nunca é a única pista.      */
function CaixaSemaforo({ tom, titulo, children }) {
  const t = useT();
  const tons = {
    perigo: { emoji: "🔴", bg: t.dangerSoft, fg: t.danger },
    atencao: { emoji: "🟡", bg: t.warningSoft, fg: t.warningText },
    ok: { emoji: "🟢", bg: t.successSoft, fg: t.successText },
    neutro: { emoji: "⚪", bg: t.surfaceAlt, fg: t.textMuted },
  };
  const s = tons[tom] || tons.neutro;
  return (
    <div className="rounded-2xl p-4 pop-in" style={{ background: s.bg, color: s.fg }} role="status">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>{s.emoji}</span>
        <p className="font-semibold text-sm">{titulo}</p>
      </div>
      <div className="text-sm mt-1.5 space-y-1.5">{children}</div>
    </div>
  );
}

function SemaforoDiagnostico({ diagnostico, r, margemMetaPct }) {
  const map = {
    prejuizo: {
      tom: "perigo", label: "Prejuízo",
      frase: `Você está perdendo ${fmtBRL(Math.abs(r.lucroLiquido))} a cada atendimento. ${r.precoMinimo !== null ? `Cobre a partir de ${fmtBRL(r.precoMinimo)} para empatar.` : ""}`,
    },
    apertado: {
      tom: "atencao", label: "Apertado",
      frase: r.precoIdeal !== null
        ? `Sua margem está ${fmtPct(Math.max(0, N(margemMetaPct) - r.margemLiquidaPct))} abaixo da meta. Para chegar no ideal, cobre ${fmtBRL(r.precoIdeal)}.`
        : "Sua margem está abaixo da meta que você definiu.",
    },
    saudavel: {
      tom: "ok", label: "Saudável",
      frase: `Margem líquida de ${fmtPct(r.margemLiquidaPct)}, na meta ou acima dela (${fmtPct(N(margemMetaPct))}).`,
    },
  };
  const s = map[diagnostico];
  return (
    <CaixaSemaforo tom={s.tom} titulo={s.label}>
      <p>{s.frase}</p>
    </CaixaSemaforo>
  );
}

const fmtOuTraco = (v) => (v === null || v === undefined || !Number.isFinite(v)) ? "—" : fmtBRL(v);

/* Painel de resultados do Modo B — tudo derivado do preço informado.      */
function ResultadoReversoCard({ r, margemMetaPct, horas, diasMesNegocio }) {
  const t = useT();
  const [detalheAberto, setDetalheAberto] = useState(false);

  if (r.status === "sem-negocio") return <EstadoResultado icon={Info} text="Configure o negócio primeiro, na aba Negócio." />;
  if (r.status === "sem-preco") {
    return <EstadoResultado icon={Info} text="Informe o preço que você cobra (ou pretende cobrar) por esse serviço para ver o diagnóstico completo." />;
  }

  const peMensal = Number.isFinite(r.pontoEquilibrioServico) ? Math.ceil(r.pontoEquilibrioServico) : null;
  const peSemanal = peMensal !== null ? Math.ceil(pontoEquilibrioSemanal(r.pontoEquilibrioServico, diasMesNegocio)) : null;

  return (
    <div className="space-y-3">
      <SemaforoDiagnostico diagnostico={r.diagnostico} r={r} margemMetaPct={margemMetaPct} />

      <div className="rounded-2xl p-5" style={{ backgroundImage: GRADIENTE, color: "#fff" }}>
        <span className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,.85)" }}>Preço informado</span>
        <p className="font-num text-4xl mt-1 font-bold">{fmtBRL(r.preco)}</p>
        <div className="grid grid-cols-2 gap-3 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,.25)" }}>
          <div>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,.75)" }}>Preço mínimo (margem zero)</p>
            <p className="font-num text-sm font-medium">{fmtOuTraco(r.precoMinimo)}</p>
          </div>
          <div>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,.75)" }}>Preço ideal (meta {fmtPct(N(margemMetaPct))})</p>
            <p className="font-num text-sm font-medium">{fmtOuTraco(r.precoIdeal)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px]" style={{ color: t.textMuted }}>Lucro bruto</p>
            <p className="font-num text-base font-bold" style={{ color: t.text }}>{fmtBRL(r.lucroBruto)}</p>
          </div>
          <div>
            <p className="text-[11px]" style={{ color: t.textMuted }}>Lucro líquido</p>
            <p className="font-num text-base font-bold" style={{ color: r.lucroLiquido >= 0 ? t.successText : t.danger }}>{fmtBRL(r.lucroLiquido)}</p>
          </div>
          <div>
            <p className="text-[11px]" style={{ color: t.textMuted }}>Margem líquida</p>
            <p className="font-num text-sm font-medium" style={{ color: t.text }}>{fmtPct(r.margemLiquidaPct)}</p>
          </div>
          <div>
            <p className="text-[11px]" style={{ color: t.textMuted }}>Markup aplicado</p>
            <p className="font-num text-sm font-medium" style={{ color: t.text }}>{r.markup !== null ? `${r.markup.toFixed(2)}×` : "—"}</p>
          </div>
          <div>
            <p className="text-[11px]" style={{ color: t.textMuted }}>Lucro por hora</p>
            <p className="font-num text-sm font-medium" style={{ color: t.text }}>{r.lucroPorHora !== null ? `${fmtBRL(r.lucroPorHora)}/h` : "—"}</p>
          </div>
          <div>
            <p className="text-[11px]" style={{ color: t.textMuted }}>Ponto de equilíbrio</p>
            {peMensal !== null ? (
              <p className="font-num text-xs font-medium" style={{ color: t.text }}>{peMensal}/mês · {peSemanal}/semana</p>
            ) : (
              <p className="font-num text-sm font-medium" style={{ color: t.text }}>—</p>
            )}
          </div>
        </div>

        <button onClick={() => setDetalheAberto(!detalheAberto)} className="btn-press text-xs font-medium mt-3" style={{ color: t.primaryText }}
          aria-expanded={detalheAberto} aria-controls="detalhe-custo-reverso">
          {detalheAberto ? "ocultar detalhamento do custo" : "ver detalhamento do custo"}
        </button>
        {detalheAberto && (
          <div id="detalhe-custo-reverso" className="pop-in mt-2 space-y-1.5 text-xs" style={{ color: t.textMuted }}>
            <div className="flex justify-between"><span>Custo fixo rateado ({horas || 0}h)</span><span className="font-num">{fmtBRL(r.custoFixoRateado)}</span></div>
            <div className="flex justify-between"><span>Custo variável (insumos)</span><span className="font-num">{fmtBRL(r.totalVariaveis)}</span></div>
            <div className="flex justify-between"><span>Comissão</span><span className="font-num">{fmtBRL(r.valorComissao)}</span></div>
            <div className="flex justify-between"><span>Taxa de cartão/Pix</span><span className="font-num">{fmtBRL(r.valorTaxaCartao)}</span></div>
            <div className="flex justify-between"><span>Impostos</span><span className="font-num">{fmtBRL(r.valorImposto)}</span></div>
            <div className="flex justify-between font-semibold pt-1.5" style={{ borderTop: `1px solid ${t.border}`, color: t.text }}>
              <span>Custo total</span><span className="font-num">{fmtBRL(r.custoTotal)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* Simulador de sensibilidade — colapsado, slider ±30% do preço informado. */
function SimuladorSensibilidade({ precoBase, custosVariaveis, comissaoPct, taxaCartaoPct, parcelaParceiroPct = 0, horasPorAtendimento, atendimentosMes, nd }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [precoSimulado, setPrecoSimulado] = useState(precoBase || 0);

  useEffect(() => { setPrecoSimulado(precoBase || 0); }, [precoBase]);

  if (!precoBase || precoBase <= 0) return null;

  const min = Math.max(0, precoBase * 0.7);
  const max = precoBase * 1.3;
  const r = calcularReverso({ custosVariaveis, comissaoPct, taxaCartaoPct, parcelaParceiroPct, precoCobrado: precoSimulado, horasPorAtendimento, atendimentosMes, margemMetaPct: 0 }, nd);

  return (
    <div className="rounded-2xl p-5" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
      <button onClick={() => setAberto(!aberto)} className="btn-press flex items-center justify-between w-full" aria-expanded={aberto} aria-controls="simulador-sensibilidade">
        <span className="text-sm font-semibold" style={{ color: t.text }}>Simulador de sensibilidade</span>
        <span className="text-xs font-medium" style={{ color: t.primaryText }}>{aberto ? "ocultar" : "explorar"}</span>
      </button>
      {aberto && (
        <div id="simulador-sensibilidade" className="pop-in mt-3">
          <label className="sr-only" htmlFor="slider-preco-simulado">Simular outro preço para este serviço</label>
          <input id="slider-preco-simulado" type="range" min={min} max={max} step="0.5" value={precoSimulado}
            onChange={(e) => setPrecoSimulado(Number(e.target.value))} className="w-full" />
          <div className="flex justify-between text-[10px] mt-1" style={{ color: t.textMuted }}>
            <span>{fmtBRL(min)}</span><span>{fmtBRL(max)}</span>
          </div>
          {r.status === "ok" && (
            <div className="mt-3 rounded-xl p-3" style={{ background: t.surfaceAlt }}>
              <p className="font-num text-lg font-bold" style={{ color: t.text }}>{fmtBRL(precoSimulado)}</p>
              <p className="text-xs mt-1" style={{ color: t.textMuted }}>
                Lucro líquido: <span className="font-num font-medium" style={{ color: r.lucroLiquido >= 0 ? t.successText : t.danger }}>{fmtBRL(r.lucroLiquido)}</span>
                {" · "}Margem: <span className="font-num font-medium">{fmtPct(r.margemLiquidaPct)}</span>
              </p>
              <p className="text-xs mt-1.5" style={{ color: t.textMuted }}>
                Se cobrar {fmtBRL(precoSimulado)}, você ganha{" "}
                <b className="font-num" style={{ color: t.text }}>{fmtBRL(r.lucroProjetadoMes)}</b> por mês fazendo {N(atendimentosMes)} atendimentos.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* Abas de acesso rápido — mesma ação de clicar num card da biblioteca, só  */
/* que sempre visíveis e mais rápidas pra alternar entre serviços que já    */
/* existem, sem precisar rolar/buscar na lista abaixo. Rolagem horizontal   */
/* cuida do catálogo crescer.                                               */
/* Preenchimento rápido: SÓ nome e categoria, nenhum valor numérico —      */
/* preço, custo e tempo continuam 100% do que a pessoa informar, sempre.  */
// Taxonomia do onboarding — segmento e modelo de operação. Ícones novos (Scissors/Hand/
// Flower2) justificados pela clareza visual real que um seletor de segmento precisa.
const SEGMENTOS = [
  { id: "barbearia", label: "Barbearia", icon: Scissors },
  { id: "salao", label: "Salão de Cabeleireiro", icon: Sparkles },
  { id: "manicure", label: "Manicure / Nail Designer", icon: Hand },
  { id: "estetica", label: "Estética Avançada", icon: Flower2 },
  { id: "misto", label: "Espaço Misto", icon: Building2 },
];
const MODELOS_OPERACAO = [
  { id: "autonomo", label: "Autônomo(a), sozinho(a)", descricao: "Só eu atendo, sem equipe." },
  { id: "equipe", label: "Equipe / cadeiras comissionadas ou alugadas", descricao: "Tenho profissionais comissionados ou que alugam espaço." },
  { id: "clt", label: "Empresa com funcionários CLT", descricao: "Tenho funcionário(s) registrado(s) em carteira." },
  { id: "locatario", label: "Alugo cadeira ou sala em outro salão", descricao: "Pago ao dono do espaço e fico com o valor dos meus serviços." },
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
function termoEstabelecimento(segmento) {
  return TERMO_ESTABELECIMENTO_POR_SEGMENTO[segmento] || TERMO_ESTABELECIMENTO_POR_SEGMENTO.misto;
}

// Templates de preenchimento rápido na Calculadora — só nome + categoria, nenhum valor
// pré-preenchido. Varia por segmento (ver Especificacao_Onboarding.md, §2).
const TEMPLATES_SERVICO_POR_SEGMENTO = {
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
const TEMPLATES_SERVICO = TEMPLATES_SERVICO_POR_SEGMENTO.misto;

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
function custosVariaveisIniciaisPorSegmento(segmento) {
  const lista = INSUMOS_SUGERIDOS_POR_SEGMENTO[segmento] || INSUMOS_SUGERIDOS_POR_SEGMENTO.salao;
  return lista.map((item) =>
    item.modo === "unidade"
      ? { id: uid(), nome: item.nome, modo: "unidade", valorCompra: "", quantidadeComprada: "", usoPorAtendimento: "1" }
      : { id: uid(), nome: item.nome, modo: "duracao", valorCompra: "", duracaoValor: "", duracaoUnidade: "dias" }
  );
}

function AbasServicos({ servicos, servicoAtivoId, onSelecionar, onNovo }) {
  const t = useT();
  if (!servicos || servicos.length === 0) return null;
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3" style={{ WebkitOverflowScrolling: "touch" }} role="tablist" aria-label="Serviços cadastrados">
      {servicos.map((s) => {
        const ativo = servicoAtivoId === s.id;
        return (
          <button key={s.id} role="tab" aria-selected={ativo} onClick={() => onSelecionar(s)}
            className="btn-press shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap"
            style={{
              background: ativo ? t.primary : t.surfaceAlt,
              color: ativo ? t.onPrimary : t.textMuted,
              border: `1px solid ${ativo ? t.primary : t.border}`,
            }}>
            {s.nome}
          </button>
        );
      })}
      <button onClick={onNovo} className="btn-press shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
        style={{ background: "transparent", color: t.primaryText, border: `1px dashed ${t.primaryText}88` }}>
        <Plus size={12} className="inline -mt-0.5 mr-0.5" />Novo
      </button>
    </div>
  );
}

/* Barra de progresso do wizard de criação — 5 passos clicáveis (não     */
/* trava avanço, só orienta; navegação livre pra frente/trás a qualquer  */
/* momento, consistente com o app nunca bloquear o usuário).             */
const PASSOS_WIZARD = [
  { id: 1, label: "Serviço" },
  { id: 2, label: "Materiais" },
  { id: 3, label: "Volume" },
  { id: 4, label: "Taxas" },
  { id: 5, label: "Resultado" },
];
function BarraProgressoWizard({ passo, onIr }) {
  const t = useT();
  return (
    <div className="flex items-center mb-4" role="tablist" aria-label="Etapas do novo serviço">
      {PASSOS_WIZARD.map((p, i) => (
        <React.Fragment key={p.id}>
          <button role="tab" aria-selected={passo === p.id} onClick={() => onIr(p.id)}
            className="btn-press touch-target flex flex-col items-center gap-1" style={{ flexShrink: 0 }}
            aria-label={`Ir pro passo ${p.id}: ${p.label}`}>
            <span className="flex items-center justify-center rounded-full font-num text-[11px] font-bold"
              style={{
                width: 24, height: 24,
                background: passo >= p.id ? t.primary : t.surfaceAlt,
                color: passo >= p.id ? t.onPrimary : t.textMuted,
                border: passo === p.id ? `2px solid ${t.primaryText}` : "1px solid transparent",
              }}>
              {passo > p.id ? "✓" : p.id}
            </span>
            <span className="text-[9px] font-medium" style={{ color: passo === p.id ? t.text : t.textMuted, whiteSpace: "nowrap" }}>{p.label}</span>
          </button>
          {i < PASSOS_WIZARD.length - 1 && (
            <div style={{ flex: 1, height: 2, background: passo > p.id ? t.primary : t.border, marginBottom: 14 }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function Calculadora({ nd, negocioConfigurado, irParaNegocio, servicos, onSalvarServico, onRemoverServico, servicoEmEdicao, setServicoEmEdicao, onTerminarEdicao }) {
  const t = useT();
  const vazio = {
    nome: "", categoria: "", tipo: "servico",
    custosVariaveis: custosVariaveisIniciaisPorSegmento(nd?.perfil?.segmento),
    comissaoPct: "0", taxaCartaoPct: "0", margemPct: "20", atendimentosMes: "", horasAtendimento: "1", precoCobrado: "",
    // Serviço novo usa a comissão média da equipe quando ela existe (Bloco 4).
    comissaoModo: nd?.comissaoEquipe ? "equipe" : "propria",
    // ...e a taxa média de recebimento do negócio, quando ela existe (Bloco 5).
    taxaModo: nd?.taxaRecebimento ? "negocio" : "propria",
    comissaoEhCotaParte: false, // Bloco 11: comissão própria que é cota-parte de parceiro
  };

  const [modo, setModo] = useState("descobrir"); // 'descobrir' | 'ja-tenho'
  const [mostrarFormulario, setMostrarFormulario] = useState(() => !!servicoEmEdicao);
  const [passoWizard, setPassoWizard] = useState(1); // 1-5, só usado criando serviço novo
  const [nomeServico, setNomeServico] = useState(vazio.nome);
  const [categoria, setCategoria] = useState(vazio.categoria);
  const [tipo, setTipo] = useState(vazio.tipo);
  const [custosVariaveis, setCustosVariaveis] = useState(vazio.custosVariaveis);
  const [comissaoPct, setComissaoPct] = useState(vazio.comissaoPct);
  const [comissaoModo, setComissaoModo] = useState(vazio.comissaoModo);
  const [taxaCartaoPct, setTaxaCartaoPct] = useState(vazio.taxaCartaoPct);
  const [taxaModo, setTaxaModo] = useState(vazio.taxaModo);
  const [comissaoEhCotaParte, setComissaoEhCotaParte] = useState(vazio.comissaoEhCotaParte);
  const [margemPct, setMargemPct] = useState(vazio.margemPct);
  const [atendimentosMes, setAtendimentosMes] = useState(vazio.atendimentosMes);
  const [horasAtendimento, setHorasAtendimento] = useState(vazio.horasAtendimento);
  const [precoCobrado, setPrecoCobrado] = useState(vazio.precoCobrado);
  const [precoSeparadoReferencia, setPrecoSeparadoReferencia] = useState(null); // se != null, este serviço é um "pacote" combinando outros
  const [precoCobradoDebounced, setPrecoCobradoDebounced] = useState(vazio.precoCobrado);
  const [precoFocado, setPrecoFocado] = useState(false);
  const [confirmandoExclusaoForm, setConfirmandoExclusaoForm] = useState(false);
  const { show, node: toastNode } = useToast();
  const precoInputRef = useRef(null);

  // "sujo" = tem algo digitado que ainda não foi salvo neste serviço.
  const rascunhoAtual = useMemo(() => ({
    nome: nomeServico, categoria, tipo, custosVariaveis, comissaoPct, comissaoModo, comissaoEhCotaParte, taxaCartaoPct, taxaModo, margemPct,
    atendimentosMes, horasAtendimento, modo, precoCobrado,
  }), [nomeServico, categoria, tipo, custosVariaveis, comissaoPct, comissaoModo, comissaoEhCotaParte, taxaCartaoPct, taxaModo, margemPct, atendimentosMes, horasAtendimento, modo, precoCobrado]);
  const rascunhoBase = useMemo(() => servicoEmEdicao
    ? {
        nome: servicoEmEdicao.nome, categoria: servicoEmEdicao.categoria || "", tipo: servicoEmEdicao.tipo || "servico", custosVariaveis: servicoEmEdicao.custosVariaveis,
        comissaoPct: String(servicoEmEdicao.comissaoPct), comissaoModo: servicoEmEdicao.comissaoModo || "propria",
        comissaoEhCotaParte: !!servicoEmEdicao.comissaoEhCotaParte,
        taxaCartaoPct: String(servicoEmEdicao.taxaCartaoPct), taxaModo: servicoEmEdicao.taxaModo || "propria",
        margemPct: String(servicoEmEdicao.margemPct),
        atendimentosMes: String(servicoEmEdicao.atendimentosMes), horasAtendimento: String(servicoEmEdicao.horasPorAtendimento),
        modo: servicoEmEdicao.modo === "ja-tenho" ? "ja-tenho" : "descobrir",
        precoCobrado: servicoEmEdicao.precoCobrado !== undefined && servicoEmEdicao.precoCobrado !== null ? String(servicoEmEdicao.precoCobrado) : "",
      }
    : vazio, [servicoEmEdicao]);
  const sujo = mostrarFormulario && JSON.stringify(rascunhoAtual) !== JSON.stringify(rascunhoBase);

  // Rascunho do serviço novo (Bloco 9): o que foi digitado no assistente fica guardado
  // no aparelho a cada mudança e volta ao reabrir a Calculadora, depois de trocar de
  // aba, recarregar a página ou atualizar o app. Substitui o aviso do navegador ao sair,
  // que não protegia a troca de aba. Só guarda quando há algo de fato preenchido.
  const [rascunhoRecuperado, setRascunhoRecuperado] = useState(false);
  const rascunhoLidoRef = useRef(false);
  const temConteudo = !!(nomeServico.trim() || N(atendimentosMes) > 0 || N(precoCobrado) > 0 ||
    custosVariaveis.some((c) => N(c.valor) > 0 || N(c.valorCompra) > 0));
  useEffect(() => {
    if (servicoEmEdicao) { rascunhoLidoRef.current = true; return undefined; }
    let vivo = true;
    lerRascunho(CHAVE_RASCUNHO_SERVICO).then((d) => {
      rascunhoLidoRef.current = true;
      if (!vivo || !d) return;
      setModo(d.modo === "ja-tenho" ? "ja-tenho" : "descobrir");
      setNomeServico(d.nome || ""); setCategoria(d.categoria || ""); setTipo(d.tipo || "servico");
      if (Array.isArray(d.custosVariaveis)) setCustosVariaveis(d.custosVariaveis);
      setComissaoPct(d.comissaoPct ?? vazio.comissaoPct); setComissaoModo(d.comissaoModo || "propria"); setComissaoEhCotaParte(!!d.comissaoEhCotaParte);
      setTaxaCartaoPct(d.taxaCartaoPct ?? vazio.taxaCartaoPct); setTaxaModo(d.taxaModo || "propria");
      setMargemPct(d.margemPct ?? vazio.margemPct);
      setAtendimentosMes(d.atendimentosMes ?? ""); setHorasAtendimento(d.horasAtendimento ?? vazio.horasAtendimento);
      setPrecoCobrado(d.precoCobrado ?? ""); setPrecoCobradoDebounced(d.precoCobrado ?? "");
      setPrecoSeparadoReferencia(d.precoSeparadoReferencia ?? null);
      setPassoWizard(Math.min(5, Math.max(1, N(d.passoWizard) || 1)));
      setMostrarFormulario(true);
      setRascunhoRecuperado(true);
    });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!rascunhoLidoRef.current || servicoEmEdicao || !mostrarFormulario || !temConteudo) return;
    salvarComFallback(CHAVE_RASCUNHO_SERVICO, JSON.stringify({ ...rascunhoAtual, passoWizard, precoSeparadoReferencia, guardadoEm: Date.now() }));
  }, [rascunhoAtual, passoWizard, precoSeparadoReferencia, servicoEmEdicao, mostrarFormulario, temConteudo]);

  // debounce ~300ms no preço informado, pra não recalcular tudo a cada tecla
  useEffect(() => {
    const tm = setTimeout(() => setPrecoCobradoDebounced(precoCobrado), 300);
    return () => clearTimeout(tm);
  }, [precoCobrado]);

  // foco automático ao entrar no Modo B
  useEffect(() => {
    if (modo === "ja-tenho" && mostrarFormulario) precoInputRef.current?.focus();
  }, [modo, mostrarFormulario]);

  useEffect(() => {
    if (servicoEmEdicao) {
      setMostrarFormulario(true);
      setModo(servicoEmEdicao.modo === "ja-tenho" ? "ja-tenho" : "descobrir");
      setCustosVariaveis(servicoEmEdicao.custosVariaveis);
      setComissaoPct(String(servicoEmEdicao.comissaoPct));
      setComissaoModo(servicoEmEdicao.comissaoModo || "propria");
      setComissaoEhCotaParte(!!servicoEmEdicao.comissaoEhCotaParte);
      setTaxaCartaoPct(String(servicoEmEdicao.taxaCartaoPct));
      setTaxaModo(servicoEmEdicao.taxaModo || "propria");
      setMargemPct(String(servicoEmEdicao.margemPct));
      setAtendimentosMes(String(servicoEmEdicao.atendimentosMes));
      setHorasAtendimento(String(servicoEmEdicao.horasPorAtendimento));
      setNomeServico(servicoEmEdicao.nome);
      setCategoria(servicoEmEdicao.categoria || "");
      setTipo(servicoEmEdicao.tipo || "servico");
      const pc = servicoEmEdicao.precoCobrado;
      setPrecoCobrado(pc !== undefined && pc !== null ? String(pc) : "");
      setPrecoCobradoDebounced(pc !== undefined && pc !== null ? String(pc) : "");
      setPrecoSeparadoReferencia(servicoEmEdicao.precoSeparadoReferencia ?? null);
      setConfirmandoExclusaoForm(false);
    }
  }, [servicoEmEdicao]);

  const resetarFormulario = () => {
    setModo("descobrir");
    setPassoWizard(1);
    setCustosVariaveis(vazio.custosVariaveis.map((i) => ({ ...i, id: uid() })));
    setComissaoPct(vazio.comissaoPct); setComissaoModo(vazio.comissaoModo); setComissaoEhCotaParte(false); setTaxaCartaoPct(vazio.taxaCartaoPct); setTaxaModo(vazio.taxaModo); setMargemPct(vazio.margemPct);
    setAtendimentosMes(vazio.atendimentosMes); setHorasAtendimento(vazio.horasAtendimento);
    setNomeServico(vazio.nome); setCategoria(vazio.categoria); setTipo(vazio.tipo); setConfirmandoExclusaoForm(false);
    setPrecoCobrado(vazio.precoCobrado); setPrecoCobradoDebounced(vazio.precoCobrado);
    setPrecoSeparadoReferencia(null);
    // Começar de novo, salvar ou fechar descarta o rascunho guardado.
    excluirComFallback(CHAVE_RASCUNHO_SERVICO);
    setRascunhoRecuperado(false);
  };

  const abrirNovo = () => { onTerminarEdicao(); resetarFormulario(); setMostrarFormulario(true); };
  const fecharFormulario = () => { onTerminarEdicao(); resetarFormulario(); setMostrarFormulario(false); };

  // Monta um "pacote": pré-preenche nome/categoria/custos/tempo a partir de 2+ serviços já
  // salvos escolhidos pelo usuário. NÃO inventa desconto — soma os custos variáveis e as
  // horas dos serviços selecionados (o usuário reduz manualmente se houver economia real de
  // tempo/material fazendo junto); guarda a soma dos preços separados só de referência, pra
  // comparar depois com o preço que o pacote realmente fechar.
  const montarPacote = (itensSelecionados, somaPrecoSeparado, somaHoras) => {
    onTerminarEdicao();
    resetarFormulario();
    setNomeServico(itensSelecionados.map((s) => s.nome).join(" + "));
    setCategoria("Combo");
    const custosMesclados = itensSelecionados.flatMap((s) => (s.custosVariaveis || []).map((item) => ({ ...item, id: uid() })));
    if (custosMesclados.length > 0) setCustosVariaveis(custosMesclados);
    setHorasAtendimento(String(somaHoras));
    setPrecoSeparadoReferencia(somaPrecoSeparado);
    setPassoWizard(1);
    setMostrarFormulario(true);
  };

  const servicosCalc = useMemo(() => (servicos || []).map((s) => ({ ...s, calc: calcularParaExibicao(s, nd) })), [servicos, nd]);

  // Soma quanto de cada insumo compartilhado já está alocado em OUTROS serviços salvos
  // (exclui o próprio serviço em edição) — pra avisar antes de passar de 100%.
  const alocacaoPorInsumoOutrosServicos = useMemo(() => {
    const mapa = {};
    (servicos || []).forEach((s) => {
      if (servicoEmEdicao && s.id === servicoEmEdicao.id) return;
      (s.custosVariaveis || []).forEach((item) => {
        if (item.modo === "compartilhado" && item.insumoId) {
          mapa[item.insumoId] = (mapa[item.insumoId] || 0) + N(item.percentualAlocado);
        }
      });
    });
    return mapa;
  }, [servicos, servicoEmEdicao]);

  const horasComprometidas = useMemo(
    () => (servicos || [])
      .filter((x) => !servicoEmEdicao || x.id !== servicoEmEdicao.id)
      .reduce((s, x) => s + N(x.horasPorAtendimento) * N(x.atendimentosMes), 0),
    [servicos, servicoEmEdicao]
  );

  const horasEsteServico = N(horasAtendimento) * N(atendimentosMes);
  const capacidadeRestante = (nd?.horasTotais || 0) - horasComprometidas;
  const jornadaIrreal = nd?.horasTotais > 0 && horasEsteServico > capacidadeRestante;

  const resultadoA = useMemo(
    () => calcularServico({
      custosVariaveis, comissaoPct, comissaoModo, comissaoEhCotaParte, taxaCartaoPct, taxaModo, margemPct,
      horasPorAtendimento: horasAtendimento, atendimentosMes: N(atendimentosMes),
    }, nd),
    [custosVariaveis, comissaoPct, comissaoModo, comissaoEhCotaParte, taxaCartaoPct, taxaModo, margemPct, horasAtendimento, atendimentosMes, nd]
  );

  const resultadoB = useMemo(
    () => calcularReverso({
      custosVariaveis, comissaoPct, comissaoModo, comissaoEhCotaParte, taxaCartaoPct, taxaModo, precoCobrado: precoCobradoDebounced,
      horasPorAtendimento: horasAtendimento, atendimentosMes: N(atendimentosMes), margemMetaPct: margemPct,
    }, nd),
    [custosVariaveis, comissaoPct, comissaoModo, comissaoEhCotaParte, taxaCartaoPct, taxaModo, precoCobradoDebounced, horasAtendimento, atendimentosMes, margemPct, nd]
  );

  const resultadoAtivo = modo === "ja-tenho" ? resultadoB : resultadoA;
  // Comissão que de fato entra no preço (média da equipe ou a própria do serviço).
  const comissaoUsada = comissaoEfetiva({ comissaoPct, comissaoModo }, nd);
  // Idem para a taxa de cartão (média do negócio ou a própria do serviço).
  const taxaUsada = taxaEfetiva({ taxaCartaoPct, taxaModo }, nd);
  // Bloco 11: parte do preço que é cota-parte de parceiro (imposto e taxa caem na proporção).
  const parcelaAtual = parcelaParceiro({ comissaoPct, comissaoModo, comissaoEhCotaParte }, nd);

  // "Preço salvo" recalculado ao vivo com os parâmetros ORIGINAIS (sem as edições em
  // andamento), no MODO em que o serviço foi salvo, contra a config. atual do negócio.
  const precoOriginalAgora = useMemo(() => {
    if (!servicoEmEdicao) return null;
    const r = calcularParaExibicao(servicoEmEdicao, nd);
    return r.status === "ok" ? r.preco : null;
  }, [servicoEmEdicao, nd]);

  const montarRegistro = (idNovo) => ({
    id: idNovo || (servicoEmEdicao ? servicoEmEdicao.id : uid()),
    nome: nomeServico.trim() || "Serviço sem nome",
    categoria: categoria.trim(),
    tipo,
    criadoEm: (!idNovo && servicoEmEdicao) ? servicoEmEdicao.criadoEm : Date.now(),
    editadoEm: Date.now(),
    modo,
    custosVariaveis, comissaoPct: N(comissaoPct), comissaoModo, comissaoEhCotaParte: comissaoModo === "propria" && comissaoEhCotaParte, taxaCartaoPct: N(taxaCartaoPct), taxaModo, margemPct: N(margemPct),
    horasPorAtendimento: N(horasAtendimento), atendimentosMes: N(atendimentosMes),
    precoCobrado: modo === "ja-tenho" ? N(precoCobradoDebounced) : null,
    precoConfirmado: resultadoAtivo.status === "ok" ? resultadoAtivo.preco : null,
    precoSeparadoReferencia,
  });

  const salvar = () => {
    if (resultadoAtivo.status !== "ok" || jornadaIrreal) return;
    const registro = montarRegistro();
    onSalvarServico(registro);
    show(servicoEmEdicao ? `"${registro.nome}" atualizado` : `"${registro.nome}" salvo`);
    fecharFormulario();
  };

  const salvarComoNovo = () => {
    if (resultadoAtivo.status !== "ok" || jornadaIrreal) return;
    const registro = montarRegistro(uid());
    onSalvarServico(registro);
    show(`"${registro.nome}" duplicado como novo serviço`);
    fecharFormulario();
  };

  // Auto-save silencioso SÓ pra edição de serviço já existente — sem toast, sem fechar o
  // formulário, sem redirecionar. Criar serviço novo continua exigindo o botão explícito:
  // no meio do wizard (nome ainda vazio, materiais pela metade) não faz sentido já existir
  // um registro persistido, e cada passo tem sua própria validação de "está pronto pra ir
  // pro próximo" que não combina bem com "salvar a cada pausa de digitação".
  const autoSalvarServicoExistente = () => {
    if (resultadoAtivo.status !== "ok" || jornadaIrreal) return;
    onSalvarServico(montarRegistro());
  };
  const statusSalvarServico = useAutoSalvar(rascunhoAtual, rascunhoBase, autoSalvarServicoExistente, {
    ativo: !!servicoEmEdicao && mostrarFormulario,
  });

  const excluirDoFormulario = () => {
    if (!servicoEmEdicao) return;
    const nome = servicoEmEdicao.nome;
    onRemoverServico(servicoEmEdicao.id);
    show(`"${nome}" excluído`);
    fecharFormulario();
  };

  const editarDaLista = (s) => {
    const { calc, ...resto } = s;
    setServicoEmEdicao(resto);
  };
  const excluirDaLista = (id) => {
    const alvo = (servicos || []).find((s) => s.id === id);
    onRemoverServico(id);
    show(alvo ? `"${alvo.nome}" excluído` : "Serviço excluído");
    if (servicoEmEdicao && servicoEmEdicao.id === id) fecharFormulario();
  };
  const aceitarNovoPreco = (s) => {
    const { calc, ...resto } = s;
    onSalvarServico({ ...resto, precoConfirmado: calc.status === "ok" ? calc.preco : (resto.precoConfirmado ?? null), editadoEm: Date.now() });
    show(`Preço de "${s.nome}" atualizado`);
  };

  const cardStyle = { background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow };

  if (!negocioConfigurado) {
    return (
      <div className="rounded-2xl p-10 text-center" style={{ background: t.surfaceAlt, border: `1px dashed ${t.border}` }}>
        <Building2 size={22} className="mx-auto mb-3" style={{ color: t.textMuted }} />
        <p className="text-sm font-medium" style={{ color: t.text }}>Configure seu negócio primeiro</p>
        <p className="text-xs mt-1 mb-4" style={{ color: t.textMuted }}>
          Custos fixos, capacidade e regime tributário ficam configurados uma vez só, na aba Negócio.
        </p>
        <button onClick={irParaNegocio} className="btn-press rounded-xl px-4 py-2 text-sm font-semibold" style={{ background: t.success, color: t.onSuccess }}>
          Ir para Negócio
        </button>
      </div>
    );
  }

  return (
    <div>
      {nd?.regime === "indefinido" && (
        <div className="flex gap-2 items-start rounded-xl p-3 mb-4 text-sm" style={{ background: t.warningSoft, color: t.warningText }}>
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            Regime tributário ainda não definido — nenhum imposto está entrando nos preços abaixo, então eles podem estar subestimados.{" "}
            <button type="button" onClick={irParaNegocio} className="btn-press font-semibold underline underline-offset-2">
              Definir agora
            </button>
          </span>
        </div>
      )}
      <AbasServicos servicos={servicos} servicoAtivoId={servicoEmEdicao?.id} onSelecionar={editarDaLista} onNovo={abrirNovo} />
      <BibliotecaServicos servicosCalc={servicosCalc} onEditar={editarDaLista} onExcluir={excluirDaLista} onAceitarNovoPreco={aceitarNovoPreco} onNovo={abrirNovo} diasMesNegocio={nd?.diasMes} />
      {!mostrarFormulario && <MontadorPacote servicosCalc={servicosCalc} onMontar={montarPacote} nd={nd} />}

      {mostrarFormulario && servicoEmEdicao && (
        <div className="grid lg:grid-cols-[1.1fr,1fr] gap-5 pop-in">
          <div className="rounded-2xl p-5 space-y-5" style={cardStyle}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: t.text }}>
                {servicoEmEdicao ? `Editando: ${servicoEmEdicao.nome}` : "Novo serviço"}
              </p>
              <button onClick={fecharFormulario} className="btn-press touch-target p-1 rounded-lg" style={{ color: t.textMuted }} aria-label="Fechar formulário">
                <X size={16} />
              </button>
            </div>

            <div className="flex gap-1 p-1 rounded-xl" style={{ background: t.surfaceAlt }} role="tablist" aria-label="Modo de cálculo">
              <button role="tab" aria-selected={modo === "descobrir"} onClick={() => setModo("descobrir")}
                className="btn-press flex-1 rounded-lg px-2 py-2 text-xs font-semibold"
                style={{ background: modo === "descobrir" ? t.surface : "transparent", color: modo === "descobrir" ? t.text : t.textMuted, boxShadow: modo === "descobrir" ? t.shadow : "none" }}>
                Quero descobrir o preço
              </button>
              <button role="tab" aria-selected={modo === "ja-tenho"} onClick={() => setModo("ja-tenho")}
                className="btn-press flex-1 rounded-lg px-2 py-2 text-xs font-semibold"
                style={{ background: modo === "ja-tenho" ? t.surface : "transparent", color: modo === "ja-tenho" ? t.text : t.textMuted, boxShadow: modo === "ja-tenho" ? t.shadow : "none" }}>
                Já tenho um preço
              </button>
            </div>
            <p className="text-[11px] -mt-3" style={{ color: t.textMuted }}>
              {modo === "descobrir"
                ? "Você informa os custos e a margem que quer — o app calcula o preço."
                : "Você informa o preço que já cobra (ou pretende cobrar) — o app calcula o resto."}
            </p>

            <div className="grid grid-cols-2 gap-2">
              <Campo label="Nome do serviço">
                <input className={CAMPO} style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                  placeholder="ex: Corte masculino" value={nomeServico} onChange={(e) => setNomeServico(e.target.value)} />
              </Campo>
              <Campo label="Categoria (opcional)">
                <input className={CAMPO} style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                  placeholder="ex: Cabelo, Barba, Unha" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
              </Campo>
            </div>
            <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: t.surfaceAlt }}>
              <button type="button" onClick={() => setTipo("servico")} className="btn-press rounded-md px-3 py-1.5 text-xs font-semibold"
                style={{ background: tipo === "servico" ? t.surface : "transparent", color: tipo === "servico" ? t.text : t.textMuted, boxShadow: tipo === "servico" ? t.shadow : "none" }}>
                Serviço
              </button>
              <button type="button" onClick={() => setTipo("produto")} className="btn-press rounded-md px-3 py-1.5 text-xs font-semibold"
                style={{ background: tipo === "produto" ? t.surface : "transparent", color: tipo === "produto" ? t.text : t.textMuted, boxShadow: tipo === "produto" ? t.shadow : "none" }}>
                Produto
              </button>
            </div>
            <ListaCustosVariaveis itens={custosVariaveis} setItens={setCustosVariaveis}
              contexto={{ atendimentosMes: N(atendimentosMes), diasMesNegocio: nd?.diasMes, insumosCompartilhados: nd?.insumosCompartilhados || [], alocacaoPorInsumoOutrosServicos }} />
            <div style={{ height: 1, background: t.border }} />

            <BlocoComissaoETaxa nd={nd} comissaoPct={comissaoPct} setComissaoPct={setComissaoPct}
              comissaoModo={comissaoModo} setComissaoModo={setComissaoModo}
              taxaCartaoPct={taxaCartaoPct} setTaxaCartaoPct={setTaxaCartaoPct}
              taxaModo={taxaModo} setTaxaModo={setTaxaModo}
              comissaoEhCotaParte={comissaoEhCotaParte} setComissaoEhCotaParte={setComissaoEhCotaParte} parcelaAtual={parcelaAtual} />
            <CampoPct label="Margem de lucro desejada (meta)" value={margemPct} onChange={setMargemPct}
              ajuda="Quanto você quer que sobre de lucro de verdade, depois de pagar tudo — não é o preço final, é a fatia que fica com você." faq="margem-contribuicao" />

            {modo === "ja-tenho" && (
              <Campo label="Preço cobrado pelo serviço (R$)" hint="O que você já cobra hoje, ou pretende cobrar.">
                <input
                  ref={precoInputRef}
                  className={CAMPO + " font-num"} style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                  type="text" inputMode="decimal" placeholder="R$ 0,00"
                  value={precoFocado ? precoCobrado : (N(precoCobrado) > 0 ? N(precoCobrado).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "")}
                  onFocus={() => setPrecoFocado(true)}
                  onBlur={() => setPrecoFocado(false)}
                  onChange={(e) => setPrecoCobrado(normalizarValorBR(e.target.value))}
                  aria-label="Preço cobrado pelo serviço, em reais"
                />
              </Campo>
            )}

            <div className="rounded-xl p-2.5 text-xs flex items-center justify-between" style={{ background: t.surfaceAlt, color: t.textMuted }}>
              <span>Imposto sobre este preço (do regime configurado){parcelaAtual > 0 ? ", só sobre a parte do salão" : ""}</span>
              <span className="font-num font-medium">{fmtPct(nd.impostoPct * (1 - parcelaAtual / 100), 2)}</span>
            </div>

            <div>
              <span className="text-sm font-semibold" style={{ color: t.text }}>Volume e tempo</span>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Campo label="Atendimentos estimados/mês">
                  <CampoNumero value={atendimentosMes} onChange={setAtendimentosMes} />
                </Campo>
                <Campo label="Horas por atendimento">
                  <input className={CAMPO + " font-num"} style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                    type="number" min="0" step="0.25" value={horasAtendimento} onChange={(e) => setHorasAtendimento(e.target.value)} />
                </Campo>
              </div>
              <p className="text-xs mt-2" style={{ color: t.textMuted }}>
                Capacidade livre no negócio: <span className="font-num font-medium">{Math.max(0, capacidadeRestante)}h/mês</span>
              </p>
            </div>

            {jornadaIrreal && (
              <div className="pop-in flex gap-2 items-start rounded-xl p-3" style={{ background: t.dangerSoft, color: t.danger }}>
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <p className="text-sm">
                  Trava de jornada: este serviço pediria {horasEsteServico}h/mês, mas só sobram {Math.max(0, capacidadeRestante)}h
                  depois do que já está comprometido com outros serviços salvos.
                </p>
              </div>
            )}

            <div className="pt-1" style={{ borderTop: `1px solid ${t.border}` }}>
              {!confirmandoExclusaoForm ? (
                <button onClick={() => setConfirmandoExclusaoForm(true)} className="btn-press text-xs font-medium mt-3" style={{ color: t.danger }}>
                  Excluir este serviço
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs mt-3" style={{ color: t.danger }}>
                  <span>Tem certeza?</span>
                  <button onClick={excluirDoFormulario} className="btn-press font-semibold underline">Sim, excluir</button>
                  <button onClick={() => setConfirmandoExclusaoForm(false)} className="btn-press underline" style={{ color: t.textMuted }}>Cancelar</button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {precoOriginalAgora !== null && resultadoAtivo.status === "ok" && (
              <ComparativoPreco original={precoOriginalAgora} novo={resultadoAtivo.preco} />
            )}
            {resultadoAtivo.status === "ok" && (
              <ComparativoPacote somaSeparado={precoSeparadoReferencia} precoPacote={resultadoAtivo.preco} />
            )}

            {modo === "descobrir" ? (
              <>
                <ResultadoCard resultado={resultadoA} diasMesNegocio={nd?.diasMes} />
                {resultadoA.status === "ok" && (
                  <DecomposicaoCard
                    materiais={resultadoA.totalVariaveis} custoFixo={resultadoA.custoFixoRateado}
                    taxas={resultadoA.valorComissao + resultadoA.valorTaxaCartao + resultadoA.valorImposto}
                    lucro={resultadoA.valorMargem} preco={resultadoA.preco}
                  />
                )}
              </>
            ) : (
              <>
                <ResultadoReversoCard r={resultadoB} margemMetaPct={margemPct} horas={horasAtendimento} diasMesNegocio={nd?.diasMes} />
                {resultadoB.status === "ok" && (
                  <DecomposicaoCard
                    materiais={resultadoB.totalVariaveis} custoFixo={resultadoB.custoFixoRateado}
                    taxas={resultadoB.valorComissao + resultadoB.valorTaxaCartao + resultadoB.valorImposto}
                    lucro={resultadoB.lucroLiquido} preco={resultadoB.preco}
                  />
                )}
                {resultadoB.status === "ok" && (
                  <SimuladorSensibilidade
                    precoBase={resultadoB.preco} custosVariaveis={custosVariaveis} comissaoPct={comissaoUsada} taxaCartaoPct={taxaUsada} parcelaParceiroPct={parcelaAtual}
                    horasPorAtendimento={horasAtendimento} atendimentosMes={N(atendimentosMes)} nd={nd}
                  />
                )}
              </>
            )}

            {resultadoAtivo.status === "ok" && !jornadaIrreal && (
              <div className="rounded-2xl p-5 space-y-2" style={cardStyle}>
                <div className="flex items-center justify-center pb-1">
                  <IndicadorAutoSalvar status={statusSalvarServico} />
                </div>
                <button onClick={salvar} className="btn-press w-full inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold" style={{ background: t.success, color: t.onSuccess }}>
                  <Save size={14} /> Salvar alterações
                </button>
                <div className="flex gap-2">
                  <button onClick={salvarComoNovo} className="btn-press flex-1 rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: t.primarySoft, color: t.primaryText }}>
                    Salvar como novo
                  </button>
                  <button onClick={fecharFormulario} className="btn-press flex-1 rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: t.surfaceAlt, color: t.textMuted }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {mostrarFormulario && !servicoEmEdicao && (
        <div className="rounded-2xl p-5 pop-in" style={cardStyle}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold" style={{ color: t.text }}>Novo serviço</p>
            <button onClick={fecharFormulario} className="btn-press touch-target p-1 rounded-lg" style={{ color: t.textMuted }} aria-label="Fechar formulário">
              <X size={16} />
            </button>
          </div>

          {rascunhoRecuperado && (
            <div className="pop-in flex items-start justify-between gap-2 rounded-xl p-2.5 mb-2 text-xs" role="status"
              style={{ background: t.successSoft, color: t.successText }}>
              <span className="flex items-start gap-1.5">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                <span>Recuperamos o serviço que você estava criando. Continue de onde parou.</span>
              </span>
              <span className="flex gap-3 shrink-0">
                <button type="button" onClick={() => setRascunhoRecuperado(false)} className="btn-press touch-target font-semibold underline">Ok</button>
                <button type="button" onClick={() => { resetarFormulario(); setMostrarFormulario(true); }} className="btn-press touch-target underline" style={{ color: t.textMuted }}>
                  Começar de novo
                </button>
              </span>
            </div>
          )}
          <BarraProgressoWizard passo={passoWizard} onIr={setPassoWizard} />

          {passoWizard === 1 && (
            <div className="space-y-4 fade-up">
              <div>
                <div className="flex gap-1 p-1 rounded-xl" style={{ background: t.surfaceAlt }} role="tablist" aria-label="Modo de cálculo">
                  <button role="tab" aria-selected={modo === "descobrir"} onClick={() => setModo("descobrir")}
                    className="btn-press flex-1 rounded-lg px-2 py-2 text-xs font-semibold"
                    style={{ background: modo === "descobrir" ? t.surface : "transparent", color: modo === "descobrir" ? t.text : t.textMuted, boxShadow: modo === "descobrir" ? t.shadow : "none" }}>
                    Quero descobrir o preço
                  </button>
                  <button role="tab" aria-selected={modo === "ja-tenho"} onClick={() => setModo("ja-tenho")}
                    className="btn-press flex-1 rounded-lg px-2 py-2 text-xs font-semibold"
                    style={{ background: modo === "ja-tenho" ? t.surface : "transparent", color: modo === "ja-tenho" ? t.text : t.textMuted, boxShadow: modo === "ja-tenho" ? t.shadow : "none" }}>
                    Já tenho um preço
                  </button>
                </div>
                <p className="text-[11px] mt-1.5" style={{ color: t.textMuted }}>
                  {modo === "descobrir"
                    ? "Você informa os custos e a margem que quer — o app calcula o preço."
                    : "Você informa o preço que já cobra (ou pretende cobrar) — o app calcula o resto."}
                </p>
              </div>

              <div>
                <p className="text-[11px] mb-1.5" style={{ color: t.textMuted }}>Preenchimento rápido (só o nome — os valores são todos seus):</p>
                <div className="flex flex-wrap gap-1.5">
                  {(TEMPLATES_SERVICO_POR_SEGMENTO[nd?.perfil?.segmento] || TEMPLATES_SERVICO).map((tpl) => (
                    <button key={tpl.nome} type="button"
                      onClick={() => { setNomeServico(tpl.nome); setCategoria(tpl.categoria); }}
                      className="btn-press rounded-lg px-2.5 py-1 text-xs font-medium"
                      style={{ background: t.primarySoft, color: t.primaryText, border: `1px solid ${t.primaryText}33` }}>
                      {tpl.nome}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Campo label="Nome do serviço">
                  <input className={CAMPO} style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                    placeholder="ex: Corte masculino" value={nomeServico} onChange={(e) => setNomeServico(e.target.value)} />
                </Campo>
                <Campo label="Categoria (opcional)">
                  <input className={CAMPO} style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                    placeholder="ex: Cabelo, Barba, Unha" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
                </Campo>
              </div>
              <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: t.surfaceAlt }}>
                <button type="button" onClick={() => setTipo("servico")} className="btn-press rounded-md px-3 py-1.5 text-xs font-semibold"
                  style={{ background: tipo === "servico" ? t.surface : "transparent", color: tipo === "servico" ? t.text : t.textMuted, boxShadow: tipo === "servico" ? t.shadow : "none" }}>
                  Serviço
                </button>
                <button type="button" onClick={() => setTipo("produto")} className="btn-press rounded-md px-3 py-1.5 text-xs font-semibold"
                  style={{ background: tipo === "produto" ? t.surface : "transparent", color: tipo === "produto" ? t.text : t.textMuted, boxShadow: tipo === "produto" ? t.shadow : "none" }}>
                  Produto
                </button>
              </div>
            </div>
          )}

          {passoWizard === 2 && (
            <div className="fade-up">
              <ListaCustosVariaveis itens={custosVariaveis} setItens={setCustosVariaveis}
                contexto={{ atendimentosMes: N(atendimentosMes), diasMesNegocio: nd?.diasMes, insumosCompartilhados: nd?.insumosCompartilhados || [], alocacaoPorInsumoOutrosServicos }} />
            </div>
          )}

          {passoWizard === 3 && (
            <div className="space-y-2 fade-up">
              <span className="text-sm font-semibold" style={{ color: t.text }}>Quanto tempo e quantos atendimentos</span>
              <div className="grid grid-cols-2 gap-2">
                <Campo label="Atendimentos estimados/mês">
                  <CampoNumero value={atendimentosMes} onChange={setAtendimentosMes} />
                </Campo>
                <Campo label="Horas por atendimento">
                  <input className={CAMPO + " font-num"} style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                    type="number" min="0" step="0.25" value={horasAtendimento} onChange={(e) => setHorasAtendimento(e.target.value)} />
                </Campo>
              </div>
              <p className="text-xs" style={{ color: t.textMuted }}>
                Capacidade livre no negócio: <span className="font-num font-medium">{Math.max(0, capacidadeRestante)}h/mês</span>
              </p>
              {jornadaIrreal && (
                <div className="pop-in flex gap-2 items-start rounded-xl p-3" style={{ background: t.dangerSoft, color: t.danger }}>
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <p className="text-sm">
                    Trava de jornada: este serviço pediria {horasEsteServico}h/mês, mas só sobram {Math.max(0, capacidadeRestante)}h
                    depois do que já está comprometido com outros serviços salvos.
                  </p>
                </div>
              )}
            </div>
          )}

          {passoWizard === 4 && (
            <div className="space-y-4 fade-up">
              <BlocoComissaoETaxa nd={nd} comissaoPct={comissaoPct} setComissaoPct={setComissaoPct}
                comissaoModo={comissaoModo} setComissaoModo={setComissaoModo}
                taxaCartaoPct={taxaCartaoPct} setTaxaCartaoPct={setTaxaCartaoPct}
                taxaModo={taxaModo} setTaxaModo={setTaxaModo}
                comissaoEhCotaParte={comissaoEhCotaParte} setComissaoEhCotaParte={setComissaoEhCotaParte} parcelaAtual={parcelaAtual} />
              {modo === "descobrir" ? (
                <CampoPct label="Margem de lucro desejada (meta)" value={margemPct} onChange={setMargemPct}
                  ajuda="Quanto você quer que sobre de lucro de verdade, depois de pagar tudo — não é o preço final, é a fatia que fica com você." faq="margem-contribuicao" />
              ) : (
                <>
                  <Campo label="Preço cobrado pelo serviço (R$)" hint="O que você já cobra hoje, ou pretende cobrar.">
                    <input
                      ref={precoInputRef}
                      className={CAMPO + " font-num"} style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                      type="text" inputMode="decimal" placeholder="R$ 0,00"
                      value={precoFocado ? precoCobrado : (N(precoCobrado) > 0 ? N(precoCobrado).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "")}
                      onFocus={() => setPrecoFocado(true)}
                      onBlur={() => setPrecoFocado(false)}
                      onChange={(e) => setPrecoCobrado(normalizarValorBR(e.target.value))}
                      aria-label="Preço cobrado pelo serviço, em reais"
                    />
                  </Campo>
                  <CampoPct label="Margem de lucro desejada (meta, referência)" value={margemPct} onChange={setMargemPct}
                    ajuda="Serve de meta de comparação — o preço acima é o que manda no Modo B." />
                </>
              )}
              <div className="rounded-xl p-2.5 text-xs flex items-center justify-between" style={{ background: t.surfaceAlt, color: t.textMuted }}>
                <span>Imposto sobre este preço (do regime configurado){parcelaAtual > 0 ? ", só sobre a parte do salão" : ""}</span>
                <span className="font-num font-medium">{fmtPct(nd.impostoPct * (1 - parcelaAtual / 100), 2)}</span>
              </div>
            </div>
          )}

          {passoWizard === 5 && (
            <div className="space-y-4 fade-up">
              {resultadoAtivo.status === "ok" && (
                <ComparativoPacote somaSeparado={precoSeparadoReferencia} precoPacote={resultadoAtivo.preco} />
              )}
              {modo === "descobrir" ? (
                <>
                  <ResultadoCard resultado={resultadoA} diasMesNegocio={nd?.diasMes} />
                  {resultadoA.status === "ok" && (
                    <DecomposicaoCard
                      materiais={resultadoA.totalVariaveis} custoFixo={resultadoA.custoFixoRateado}
                      taxas={resultadoA.valorComissao + resultadoA.valorTaxaCartao + resultadoA.valorImposto}
                      lucro={resultadoA.valorMargem} preco={resultadoA.preco}
                    />
                  )}
                </>
              ) : (
                <>
                  <ResultadoReversoCard r={resultadoB} margemMetaPct={margemPct} horas={horasAtendimento} diasMesNegocio={nd?.diasMes} />
                  {resultadoB.status === "ok" && (
                    <DecomposicaoCard
                      materiais={resultadoB.totalVariaveis} custoFixo={resultadoB.custoFixoRateado}
                      taxas={resultadoB.valorComissao + resultadoB.valorTaxaCartao + resultadoB.valorImposto}
                      lucro={resultadoB.lucroLiquido} preco={resultadoB.preco}
                    />
                  )}
                  {resultadoB.status === "ok" && (
                    <SimuladorSensibilidade
                      precoBase={resultadoB.preco} custosVariaveis={custosVariaveis} comissaoPct={comissaoUsada} taxaCartaoPct={taxaUsada} parcelaParceiroPct={parcelaAtual}
                      horasPorAtendimento={horasAtendimento} atendimentosMes={N(atendimentosMes)} nd={nd}
                    />
                  )}
                </>
              )}

              {resultadoAtivo.status === "ok" && !jornadaIrreal ? (
                <div className="rounded-2xl p-4 space-y-2" style={{ background: t.surfaceAlt }}>
                  <BannerNaoSalvo sujo={sujo} aoSalvarLabel="Salvar como serviço" />
                  <button onClick={salvar} className="btn-press w-full inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold" style={{ background: t.success, color: t.onSuccess }}>
                    <Save size={14} /> Salvar como serviço
                  </button>
                </div>
              ) : (
                <p className="text-xs text-center" style={{ color: t.textMuted }}>
                  {jornadaIrreal ? "Ajusta o volume no passo 3 antes de salvar." : "Preenche os passos anteriores pra ver o resultado aqui."}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-5 pt-4" style={{ borderTop: `1px solid ${t.border}` }}>
            {passoWizard > 1 && (
              <button onClick={() => setPassoWizard((p) => p - 1)} className="btn-press flex-1 rounded-xl px-3 py-2 text-sm font-semibold" style={{ background: t.surfaceAlt, color: t.text }}>
                Voltar
              </button>
            )}
            {passoWizard < 5 && (
              <button onClick={() => setPassoWizard((p) => p + 1)} className="btn-press flex-1 rounded-xl px-3 py-2 text-sm font-semibold" style={{ background: t.primaryText, color: t.onPrimary }}>
                Próximo
              </button>
            )}
          </div>
        </div>
      )}
      {toastNode}
    </div>
  );
}

/* Decomposição visual do preço em gráfico de rosca — 4 fatias grandes e     */
/* legíveis (não as 6 categorias detalhadas do motor de cálculo) porque num  */
/* gráfico pequeno de celular, mais fatia fina só atrapalha a leitura.       */
function GraficoRoscaPreco({ materiais, custoFixo, taxas, lucro, preco }) {
  const t = useT();
  const dados = [
    { name: "Materiais", value: materiais, color: t.secondary },
    { name: "Custo fixo", value: custoFixo, color: t.textMuted },
    { name: "Taxas e impostos", value: taxas, color: t.warning },
    { name: "Lucro líquido", value: lucro, color: t.success },
  ].filter((d) => d.value > 0.005);

  if (preco <= 0 || dados.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      <div style={{ width: 108, height: 108, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={dados} dataKey="value" nameKey="name" innerRadius={30} outerRadius={52} paddingAngle={2} stroke="none">
              {dados.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-1">
        {dados.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-[11px]">
            <span style={{ width: 8, height: 8, borderRadius: 99, background: d.color, flexShrink: 0 }} />
            <span className="flex-1" style={{ color: t.textMuted }}>{d.name}</span>
            <span className="font-num font-medium" style={{ color: t.text }}>{fmtPct((d.value / preco) * 100)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultadoCard({ resultado, diasMesNegocio }) {
  const t = useT();
  if (resultado.status === "sem-volume") {
    return <EstadoResultado icon={Info} text="Informe quantos atendimentos você espera fazer por mês para eu ratear os custos fixos e calcular o preço." />;
  }
  if (resultado.status === "sem-custo") {
    return <EstadoResultado icon={Info} text="Adicione ao menos um custo variável, ou informe horas por atendimento maior que zero, para calcular." />;
  }
  if (resultado.status === "trava-percentual") {
    return (
      <div className="rounded-2xl p-5 pop-in" style={{ background: t.dangerSoft, border: `1px solid ${t.danger}55` }}>
        <div className="flex gap-2 items-start" style={{ color: t.danger }}>
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Trava matemática: cálculo impossível</p>
            <p className="text-sm mt-1">
              Comissão + taxa de cartão + imposto + margem desejada somam {fmtPct(resultado.soma)} do preço. Isso precisa
              ficar abaixo de 100%.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const dados = [
    { name: "Custo fixo rateado", value: resultado.custoFixoRateado, color: t.textMuted },
    { name: "Custo variável", value: resultado.totalVariaveis, color: t.secondary },
    { name: "Comissão", value: resultado.valorComissao, color: t.primary },
    { name: "Taxa cartão", value: resultado.valorTaxaCartao, color: t.warning },
    { name: "Imposto", value: resultado.valorImposto, color: t.danger },
    { name: "Margem/lucro", value: resultado.valorMargem, color: t.success },
  ].filter((d) => d.value > 0.005);

  return (
    <div className="pop-in rounded-2xl p-5" style={{ backgroundImage: GRADIENTE, color: "#fff" }}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,.85)" }}>Preço sugerido</span>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: "rgba(255,255,255,.2)", color: "#fff" }}>
          <Sparkles size={12} /> Preço Justo
        </span>
      </div>
      <p className="font-num text-4xl mt-1 font-bold">{fmtBRL(resultado.preco)}</p>

      <div className="mt-4 space-y-1.5">
        {dados.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <div style={{ width: 8, height: 8, borderRadius: 99, background: d.color }} />
            <span className="text-xs flex-1" style={{ color: "rgba(255,255,255,.85)" }}>{d.name}</span>
            <span className="font-num text-xs">{fmtBRL(d.value)}</span>
          </div>
        ))}
        <div className="h-2 rounded-full overflow-hidden flex mt-2" style={{ background: "rgba(0,0,0,.2)" }}>
          {dados.map((d) => <div key={d.name} style={{ width: `${(d.value / resultado.preco) * 100}%`, background: d.color }} />)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,.25)" }}>
        <div>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,.75)" }}>Margem de contribuição</p>
          <p className="font-num text-sm mt-0.5 font-medium">{fmtBRL(resultado.margemContribuicaoUnitaria)} / atend.</p>
        </div>
        <div>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,.75)" }}>Lucro projetado/mês</p>
          <p className="font-num text-sm mt-0.5 font-medium">{fmtBRL(resultado.lucroProjetadoMes)}</p>
        </div>
        <div className="col-span-2 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,.2)" }}>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,.75)" }}>Ponto de equilíbrio deste serviço</p>
          <p className="font-num text-sm mt-0.5 font-medium">
            {Number.isFinite(resultado.pontoEquilibrioServico) ? `${Math.ceil(resultado.pontoEquilibrioServico)} atend./mês` : "—"}
            {" · "}
            {Number.isFinite(resultado.pontoEquilibrioServico) ? `${Math.ceil(pontoEquilibrioSemanal(resultado.pontoEquilibrioServico, diasMesNegocio))} atend./semana` : "—"}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,.65)" }}>se só esse serviço existisse, cobriria o custo fixo do negócio inteiro</p>
        </div>
      </div>
    </div>
  );
}

function DecomposicaoCard({ materiais, custoFixo, taxas, lucro, preco }) {
  const t = useT();
  return (
    <div className="rounded-2xl p-5" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
      <p className="text-sm font-semibold mb-3" style={{ color: t.text }}>Pra onde vai cada real</p>
      <GraficoRoscaPreco materiais={materiais} custoFixo={custoFixo} taxas={taxas} lucro={lucro} preco={preco} />
    </div>
  );
}

function EstadoResultado({ icon: Icon, text }) {
  const t = useT();
  return (
    <div className="rounded-2xl p-8 text-center" style={{ background: t.surfaceAlt, border: `1px dashed ${t.border}` }}>
      <Icon size={20} className="mx-auto mb-2" style={{ color: t.textMuted }} />
      <p className="text-sm" style={{ color: t.textMuted }}>{text}</p>
    </div>
  );
}

/* ======================================================================= */
/* Aba: Painel                                                             */
/* ======================================================================= */
function Painel({ nd, negocio, servicos, onRemoverServico, onEditarServico }) {
  const t = useT();
  const [sazonalidade, setSazonalidade] = useState(Array(12).fill(100));
  const [fechamentos, setFechamentos] = useState(null);
  const { show, node: toastNode } = useToast();

  // window.print() chamado direto e de forma SÍNCRONA dentro do clique — não
  // atrás de um setTimeout/estado. Isso importa de verdade: vários navegadores
  // (principalmente mobile) só permitem abrir a caixa de impressão quando a
  // chamada acontece na MESMA pilha de execução do clique do usuário; um
  // setTimeout no meio quebra esse vínculo e o navegador ignora a chamada
  // sem avisar nada — exatamente o "não acontece nada" relatado.
  const exportarMemorial = () => {
    document.body.classList.add("imprimindo-memorial");
    window.print();
    const limpar = () => { document.body.classList.remove("imprimindo-memorial"); window.removeEventListener("afterprint", limpar); };
    window.addEventListener("afterprint", limpar);
    setTimeout(limpar, 4000); // reforço: alguns navegadores mobile não disparam "afterprint" de jeito nenhum
  };

  const carregar = useCallback(async () => {
    const valor = await lerComFallback("painel:sazonalidade");
    if (valor) { try { setSazonalidade(JSON.parse(valor)); } catch {} }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const carregarFechamentos = useCallback(async () => {
    try {
      const chaves = await listarComFallback("fechamento:");
      const resultados = await Promise.all(
        chaves.map(async (k) => {
          const valor = await lerComFallback(k);
          try { return valor ? JSON.parse(valor) : null; } catch { return null; }
        })
      );
      setFechamentos(resultados.filter(Boolean).sort((a, b) => b.mes.localeCompare(a.mes)));
    } catch { setFechamentos([]); }
  }, []);
  useEffect(() => { carregarFechamentos(); }, [carregarFechamentos]);

  // Única fonte de verdade dos fechamentos no Painel — FechamentoMensal e
  // EvolucaoComparativos recebem por prop em vez de buscar cada um pra si. Antes disso,
  // cada componente carregava sua própria cópia isolada: salvar um fechamento (ou os de
  // exemplo) atualizava a lista de um, mas o outro só saberia na próxima vez que fosse
  // desmontado/remontado — na prática nunca, e o gráfico continuava dizendo "sem dado
  // suficiente" mesmo depois de gerar os exemplos. Com estado único, os dois enxergam a
  // mesma lista sempre, e uma mudança aparece nos dois ao mesmo tempo.
  const salvarFechamento = (registro) => {
    salvarComFallback(`fechamento:${registro.mes}`, JSON.stringify(registro));
    setFechamentos((prev) => [...(prev || []).filter((f) => f.mes !== registro.mes), registro].sort((a, b) => b.mes.localeCompare(a.mes)));
  };
  const removerFechamento = (mes) => {
    excluirComFallback(`fechamento:${mes}`);
    setFechamentos((prev) => (prev || []).filter((f) => f.mes !== mes));
  };
  const salvarFechamentosEmLote = (registros) => {
    registros.forEach((f) => salvarComFallback(`fechamento:${f.mes}`, JSON.stringify(f)));
    setFechamentos((prev) => [...(prev || []), ...registros].sort((a, b) => b.mes.localeCompare(a.mes)));
  };

  const remover = (id) => { onRemoverServico(id); show("Serviço removido"); };
  const salvarSazonalidade = (novo) => {
    setSazonalidade(novo);
    salvarComFallback("painel:sazonalidade", JSON.stringify(novo));
  };

  const cardStyle = { background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow };

  // Corrigido nesta revisão: este useMemo estava depois dos dois "return" condicionais
  // abaixo (servicos===null e servicos.length===0) — bug pré-existente (não introduzido
  // nesta sessão), pego agora com eslint-plugin-react-hooks. Na prática dispara assim que
  // alguém salva o primeiro serviço: o componente pula de "não chamou o hook" pra "chamou",
  // e o React acusa "Rendered more hooks than during the previous render". Hooks sempre
  // antes de qualquer return condicional — por isso subiu pra cá, com fallback pra [].
  const servicosCalc = useMemo(
    () => (servicos || []).map((s) => ({ ...s, calc: calcularParaExibicao(s, nd) })),
    [servicos, nd]
  );

  if (servicos === null) return <div className="grid gap-4 sm:grid-cols-2"><SkeletonCard /><SkeletonCard /></div>;

  if (servicos.length === 0) {
    return (
      <div className="rounded-2xl p-10 text-center" style={{ background: t.surfaceAlt, border: `1px dashed ${t.border}` }}>
        <LayoutDashboard size={22} className="mx-auto mb-3" style={{ color: t.textMuted }} />
        <p className="text-sm font-medium" style={{ color: t.text }}>Nenhum serviço salvo ainda</p>
        <p className="text-xs mt-1" style={{ color: t.textMuted }}>
          Calcule o preço de um serviço na aba Calculadora e clique em "Salvar" para o painel ganhar vida.
        </p>
      </div>
    );
  }

  const servicosValidos = servicosCalc.filter((s) => s.calc.status === "ok");
  const dre = montarDRE(servicosCalc, nd);
  const margemMedia = servicosValidos.length > 0
    ? servicosValidos.reduce((s, x) => s + (x.modo === "ja-tenho" ? N(x.calc.margemLiquidaPct) : N(x.margemPct)), 0) / servicosValidos.length
    : null;
  const servicosEmPrejuizo = servicosValidos.filter((s) => s.calc.diagnostico === "prejuizo");

  const { margemContribuicaoPonderada, pontoEquilibrioMix, custoOportunidadeMes, peContabilRS, peFinanceiroRS, peEconomicoRS, margemSeguranca, gao } =
    calcularIndicadoresGerenciais(servicosValidos, dre, nd, negocio);

  const chartData = servicosCalc
    .filter((s) => s.calc.status === "ok")
    .map((s) => ({ name: s.nome, Preço: Math.round(s.calc.preco), Margem: Math.round(s.calc.margemContribuicaoUnitaria) }));

  const exportarExcel = async () => {
    const wb = XLSX.utils.book_new();
    const wsDRE = XLSX.utils.aoa_to_sheet([
      ["DRE gerencial do mês (recalculado com as configurações atuais)", ""],
      ...(dre.cotaParteParceiros > 0 ? [
        ["Valor cobrado dos clientes", dre.valorCobrado],
        ["(-) Cota-parte repassada aos parceiros", -dre.cotaParteParceiros],
      ] : []),
      [dre.cotaParteParceiros > 0 ? "= Receita bruta do salão" : "Receita bruta", dre.receitaBruta],
      ["(-) Impostos sobre vendas", -dre.impostos],
      ["= Receita líquida", dre.receitaLiquida],
      ["(-) Custos variáveis totais", -dre.custosVariaveisTotais],
      ["= Margem de contribuição", dre.margemContribuicaoTotal],
      ["(-) Custos fixos (incl. pró-labore)", -dre.custosFixos],
      ...(dre.aluguelRecebido > 0 ? [["(+) Aluguel de cadeiras recebido", dre.aluguelRecebido]] : []),
      ["= Resultado operacional", dre.resultadoOperacional],
    ]);
    XLSX.utils.book_append_sheet(wb, wsDRE, "DRE Gerencial");

    const wsInd = XLSX.utils.aoa_to_sheet([
      ["Indicador", "Valor"],
      ["Ponto de equilíbrio contábil (R$)", Number.isFinite(peContabilRS) ? peContabilRS : null],
      ["Ponto de equilíbrio financeiro (R$)", Number.isFinite(peFinanceiroRS) ? peFinanceiroRS : null],
      ["Ponto de equilíbrio econômico (R$)", Number.isFinite(peEconomicoRS) ? peEconomicoRS : null],
      ["Margem de segurança (%)", margemSeguranca],
      ["Grau de alavancagem operacional (x)", gao],
      ["Alíquota de imposto efetiva aplicada (%)", nd.impostoPct],
      ["Custo fixo total do negócio (R$/mês)", nd.custoFixoTotal],
      ["Aluguel de cadeiras recebido (R$/mês)", nd.receitaAluguelCadeiras],
      ["Custo fixo a cobrir pelos serviços (R$/mês)", nd.custoFixoLiquido],
      ["Custo fixo por hora (R$)", nd.custoFixoPorHora],
      ["Capacidade produtiva (horas/mês)", nd.horasTotais],
      ["Número de profissionais", nd.numeroProfissionais],
    ]);
    XLSX.utils.book_append_sheet(wb, wsInd, "Indicadores");

    const wsServ = XLSX.utils.aoa_to_sheet([
      ["Serviço", "Preço (R$)", "Custo variável (R$)", "Comissão (%)", "Taxa cartão (%)", "Imposto (%)",
        "Margem desejada (%)", "Horas/atend.", "Atendimentos/mês", "Margem contrib. unit. (R$)", "Lucro projetado/mês (R$)", "Status"],
      ...servicosCalc.map((s) => (
        s.calc.status === "ok"
          ? [s.nome, s.calc.preco, s.calc.totalVariaveis, comissaoEfetiva(s, nd), taxaEfetiva(s, nd), nd.impostoPct,
             s.margemPct, s.horasPorAtendimento, s.atendimentosMes, s.calc.margemContribuicaoUnitaria, s.calc.lucroProjetadoMes, "ok"]
          : [s.nome, null, null, comissaoEfetiva(s, nd), taxaEfetiva(s, nd), nd.impostoPct, s.margemPct, s.horasPorAtendimento,
             s.atendimentosMes, null, null, "inválido com a config. atual — revisar na Calculadora"]
      )),
    ]);
    XLSX.utils.book_append_sheet(wb, wsServ, "Serviços");

    const variavelProp = dre.receitaBruta > 0 ? dre.custosVariaveisTotais / dre.receitaBruta : 0;
    const impostoProp = dre.receitaBruta > 0 ? dre.impostos / dre.receitaBruta : 0;
    const wsFluxo = XLSX.utils.aoa_to_sheet([
      ["Mês", "Sazonalidade (%)", "Receita projetada (R$)", "Resultado projetado (R$)"],
      ...MESES.map((mes, i) => {
        const mult = N(sazonalidade[i]) / 100;
        const receita = dre.receitaBruta * mult;
        const resultado = receita - receita * impostoProp - receita * variavelProp - dre.custosFixos + dre.aluguelRecebido;
        return [mes, N(sazonalidade[i]), Math.round(receita), Math.round(resultado)];
      }),
    ]);
    XLSX.utils.book_append_sheet(wb, wsFluxo, "Fluxo de Caixa 12m");

    // Bloco 10: concorrentes e preços anotados no Observatório, quando houver.
    const obs = await lerDadosObservatorio();
    if (obs.concorrentes.length > 0) {
      anexarAbasObservatorio(wb, linhasPlanilhaObservatorio(obs.concorrentes, obs.meusLocais, servicosCalc, nd));
    }

    XLSX.writeFile(wb, `preco-justo-relatorio-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const compartilharResumo = async () => {
    const texto = [
      "📊 Preço Justo — Resumo do negócio",
      "",
      ...(dre.cotaParteParceiros > 0 ? [`Valor cobrado dos clientes: ${fmtBRL(dre.valorCobrado)}`, `Cota-parte dos parceiros: ${fmtBRL(dre.cotaParteParceiros)}`] : []),
      `Receita bruta${dre.cotaParteParceiros > 0 ? " do salão" : ""}: ${fmtBRL(dre.receitaBruta)}`,
      `Custos variáveis: ${fmtBRL(dre.custosVariaveisTotais)}`,
      `Custos fixos: ${fmtBRL(dre.custosFixos)}`,
      ...(dre.aluguelRecebido > 0 ? [`Aluguel de cadeiras recebido: ${fmtBRL(dre.aluguelRecebido)}`] : []),
      `Resultado operacional: ${fmtBRL(dre.resultadoOperacional)}`,
      "",
      "Gerado no app Preço Justo.",
    ].join("\n");
    if (navigator.share) {
      try { await navigator.share({ title: "Preço Justo — Resumo do negócio", text: texto }); }
      catch { /* usuário cancelou o compartilhamento — não faz nada */ }
    } else {
      try { await navigator.clipboard.writeText(texto); show("Resumo copiado — cole onde quiser (WhatsApp, e-mail...)"); }
      catch { show("Não consegui copiar automaticamente neste navegador"); }
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 no-print">
        <p className="text-xs" style={{ color: t.textMuted }}>Exportar este painel</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportarExcel} className="btn-press inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
            style={{ background: t.success, color: t.onSuccess }}>
            <Download size={13} /> Baixar Excel
          </button>
          <button onClick={() => window.print()} className="btn-press inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
            style={{ background: t.surfaceAlt, color: t.text, border: `1px solid ${t.border}` }}>
            <Printer size={13} /> Imprimir / PDF
          </button>
          <button onClick={compartilharResumo} className="btn-press touch-target inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
            style={{ background: t.surfaceAlt, color: t.text, border: `1px solid ${t.border}` }} aria-label="Compartilhar resumo">
            <Share2 size={13} /> Compartilhar
          </button>
          <button onClick={exportarMemorial} className="btn-press touch-target inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
            style={{ background: t.surfaceAlt, color: t.text, border: `1px solid ${t.border}` }}>
            <Printer size={13} /> Memorial de cálculo (PDF)
          </button>
        </div>
      </div>

      <div id="memorial-calculo-wrapper" style={{ display: "none" }}>
        <MemorialCalculo negocio={negocio} nd={nd} dre={dre} peContabilRS={peContabilRS} peFinanceiroRS={peFinanceiroRS}
          peEconomicoRS={peEconomicoRS} custoOportunidadeMes={custoOportunidadeMes} margemSeguranca={margemSeguranca} gao={gao}
          pontoEquilibrioMix={pontoEquilibrioMix} margemContribuicaoPonderada={margemContribuicaoPonderada} />
      </div>

      <div className="conteudo-normal-painel">
      {/* space-y-3: os cards desta área ficavam colados uns nos outros (sem espaço   */}
      {/* vertical), o mesmo gap-3 que as grades de indicadores já usam entre colunas. */}
      <div id="area-impressao" className="space-y-3">
      <p className="text-[11px]" style={{ color: t.textMuted }}>
        Recalculado com as configurações atuais do Negócio — mude um custo fixo ou o regime tributário e tudo aqui se atualiza sozinho.
      </p>
      <DRECard dre={dre} />

      {dre.qtdInvalidos > 0 && (
        <div className="pop-in flex gap-2 items-start rounded-xl p-3 text-sm" style={{ background: t.dangerSoft, color: t.danger }}>
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            {dre.qtdInvalidos} serviço{dre.qtdInvalidos > 1 ? "s" : ""} ficou{dre.qtdInvalidos > 1 ? "ram" : ""} matematicamente
            inválido{dre.qtdInvalidos > 1 ? "s" : ""} com a configuração atual — está{dre.qtdInvalidos > 1 ? "ão" : ""} fora do DRE
            até você editar e recalcular.
          </span>
        </div>
      )}

      <EscadaPontoEquilibrio
        receita={dre.receitaBruta} rcm={dre.rcm}
        financeiro={peFinanceiroRS} contabil={peContabilRS} economico={peEconomicoRS}
        capitalInvestido={N(negocio.capitalInvestido)} taxaRetorno={N(negocio.taxaRetorno)}
        custoNaoCaixa={nd.custoFixoNaoCaixa} margemSeguranca={margemSeguranca}
      />

      <div className="grid sm:grid-cols-2 gap-3">
        <IndicadorCard titulo="Ponto de Equilíbrio Ponderado (Mix de Serviços)" icon={TrendingUp}>
          {servicosValidos.length === 0 || margemContribuicaoPonderada <= 0 ? (
            <p className="text-xs" style={{ color: t.textMuted }}>—</p>
          ) : (
            <>
              <p className="font-num text-2xl font-bold" style={{ color: t.text }}>
                {Number.isFinite(pontoEquilibrioMix) ? Math.ceil(pontoEquilibrioMix) : "—"}
                <span className="text-xs font-medium" style={{ color: t.textMuted }}> atendimentos/mês</span>
              </p>
              <div className="mt-2 rounded-lg p-2" style={{ background: t.primarySoft }}>
                <p className="text-[10px]" style={{ color: t.primaryText }}>MCP — Margem de Contribuição Ponderada</p>
                <p className="font-num text-sm font-bold" style={{ color: t.primaryText }}>{fmtBRL(margemContribuicaoPonderada)} <span className="text-[10px] font-normal">/ atendimento</span></p>
              </div>
              <p className="text-[11px] mt-2" style={{ color: t.textMuted }}>
                soma de todos os serviços, na proporção real de atendimentos/mês entre eles
              </p>
            </>
          )}
          <p className="text-[10px] mt-2" style={{ color: t.textMuted }}>
            <b>Método:</b> cada serviço pesa no mix conforme sua fatia de atendimentos/mês; a MCP é a soma
            (peso × margem de contribuição unitária) de cada um. Ponto de equilíbrio = custo fixo total ÷ MCP.
            (Padoveze, Contabilidade Gerencial.)
          </p>
        </IndicadorCard>
        <IndicadorCard titulo="Alavancagem operacional (GAO)" icon={TrendingDown}
          info={{ texto: "Mostra o quanto o resultado do negócio varia, em %, pra cada 1% de variação na receita — custo fixo alto costuma deixar o GAO mais alto (mais sensível a oscilar as vendas).", referencia: "Perez Jr., Oliveira e Costa, Gestão Estratégica de Custos" }}>
          {gao === null ? (
            <p className="text-xs" style={{ color: t.textMuted }}>Operando abaixo do ponto de equilíbrio.</p>
          ) : (
            <>
              <p className="font-num text-2xl font-bold" style={{ color: t.text }}>{gao.toFixed(2)}x</p>
              <p className="text-xs mt-1" style={{ color: t.textMuted }}>cada 1% de variação na receita muda o resultado em ~{gao.toFixed(1)}%</p>
            </>
          )}
        </IndicadorCard>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <IndicadorCard titulo="Margem média entre serviços" icon={TrendingUp}>
          {margemMedia === null ? (
            <p className="text-xs" style={{ color: t.textMuted }}>—</p>
          ) : (
            <>
              <p className="font-num text-2xl font-bold" style={{ color: t.text }}>{fmtPct(margemMedia)}</p>
              <p className="text-xs mt-1" style={{ color: t.textMuted }}>média simples entre os {servicosValidos.length} serviços válidos</p>
            </>
          )}
        </IndicadorCard>
        <IndicadorCard titulo="Serviços em prejuízo" icon={AlertTriangle}>
          <p className="font-num text-2xl font-bold" style={{ color: servicosEmPrejuizo.length > 0 ? t.danger : t.successText }}>{servicosEmPrejuizo.length}</p>
          {servicosEmPrejuizo.length > 0 ? (
            <p className="text-xs mt-1" style={{ color: t.textMuted }}>{servicosEmPrejuizo.map((s) => s.nome).join(", ")}</p>
          ) : (
            <p className="text-xs mt-1" style={{ color: t.textMuted }}>nenhum serviço "Já tenho um preço" abaixo do custo</p>
          )}
        </IndicadorCard>
      </div>

      <ProjecaoCaixa dre={dre} sazonalidade={sazonalidade} onChange={salvarSazonalidade} fechamentos={fechamentos} />
      <div className="mt-4">
        <FechamentoMensal nd={nd} servicos={servicos} fechamentos={fechamentos} onSalvar={salvarFechamento} onRemover={removerFechamento} onCarregarExemplos={salvarFechamentosEmLote} profissionais={negocio.profissionais} />
      </div>
      <div className="mt-4"><EvolucaoComparativos nd={nd} servicos={servicos} fechamentos={fechamentos} sazonalidade={sazonalidade} pontoEquilibrio={peContabilRS} /></div>
      </div>

      <div className="rounded-2xl p-5 no-print" style={cardStyle}>
        <p className="text-sm font-semibold mb-3" style={{ color: t.text }}>Comparativo entre serviços</p>
        <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 46)}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} horizontal={false} />
            <XAxis type="number" tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 11, fill: t.textMuted }} />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: t.textMuted }} />
            <Tooltip formatter={(v) => fmtBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8, background: t.surface, border: `1px solid ${t.border}`, color: t.text }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Preço" fill={t.secondary} radius={[0, 4, 4, 0]} />
            <Bar dataKey="Margem" fill={t.success} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 no-print">
        {servicosCalc.map((s) => (
          <CardServicoPainel key={s.id} s={s} onEditar={onEditarServico} onExcluir={remover} diasMesNegocio={nd.diasMes} />
        ))}
      </div>
      </div>
      <div className="no-print">{toastNode}</div>
    </div>
  );
}

function CardServicoPainel({ s, onEditar, onExcluir, diasMesNegocio }) {
  const t = useT();
  const [expandido, setExpandido] = useState(false);
  const ok = s.calc.status === "ok";
  const baseline = s.precoConfirmado ?? (ok ? s.calc.preco : null);
  const desatualizado = ok && baseline !== null && Math.abs(s.calc.preco - baseline) > 0.005;
  const lucroReal = ok ? (s.modo === "ja-tenho" ? s.calc.lucroLiquido : s.calc.valorMargem) : 0;

  return (
    <div className="fade-up rounded-2xl overflow-hidden" style={{ background: t.surface, border: `1px solid ${ok ? t.border : t.danger}`, boxShadow: t.shadow }}>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-sm" style={{ color: t.text }}>{s.nome}</p>
            {s.categoria && (
              <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: t.surfaceAlt, color: t.textMuted }}>{s.categoria}</span>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => onEditar(s)} className="btn-press touch-target-48" style={{ color: t.primaryText }} aria-label={`Editar ${s.nome}`}><Pencil size={14} /></button>
            <button onClick={() => onExcluir(s.id)} className="btn-press touch-target-48" style={{ color: t.danger }} aria-label={`Excluir ${s.nome}`}><Trash2 size={14} /></button>
          </div>
        </div>
        {ok ? (
          <>
            <p className="font-num text-xl mt-1 font-bold" style={{ color: t.text }}>{fmtBRL(s.calc.preco)}</p>
            <div className="flex flex-wrap gap-2 mt-2 text-xs" style={{ color: t.textMuted }}>
              <span>margem: {fmtBRL(s.calc.margemContribuicaoUnitaria)}</span>
              <span>·</span>
              <span>{s.atendimentosMes} atend./mês</span>
            </div>
            {Number.isFinite(s.calc.pontoEquilibrioServico) && (
              <p className="text-[11px] mt-1" style={{ color: t.primaryText }}>
                equilíbrio: {Math.ceil(s.calc.pontoEquilibrioServico)}/mês · {Math.ceil(pontoEquilibrioSemanal(s.calc.pontoEquilibrioServico, diasMesNegocio))}/semana
              </p>
            )}
          </>
        ) : (
          <p className="text-xs mt-1.5" style={{ color: t.danger }}>Inválido com a config. atual — toque em editar para recalcular.</p>
        )}
        {desatualizado && (
          <p className="text-[11px] mt-2 rounded-lg p-1.5" style={{ background: t.warningSoft, color: t.warningText }}>
            Preço mudou de {fmtBRL(baseline)} para {fmtBRL(s.calc.preco)} desde a última vez que foi salvo.
          </p>
        )}
        {ok && (
          <button onClick={() => setExpandido((v) => !v)} className="btn-press touch-target mt-2.5 inline-flex items-center gap-1 text-xs font-medium" style={{ color: t.primaryText }}
            aria-expanded={expandido}>
            {expandido ? "ocultar decomposição" : "ver decomposição do preço"}
            <ChevronDown size={13} style={{ transform: expandido ? "rotate(180deg)" : "none", transition: "transform .2s ease" }} />
          </button>
        )}
      </div>

      {expandido && ok && (
        <div className="px-4 pb-4 pop-in" style={{ borderTop: `1px solid ${t.border}` }}>
          <p className="text-xs font-semibold mt-3 mb-2" style={{ color: t.text }}>Decomposição do preço</p>
          <GraficoRoscaPreco materiais={s.calc.totalVariaveis} custoFixo={s.calc.custoFixoRateado}
            taxas={s.calc.valorComissao + s.calc.valorTaxaCartao + s.calc.valorImposto} lucro={lucroReal} preco={s.calc.preco} />
          <button onClick={() => onEditar(s)} className="btn-press touch-target w-full mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold"
            style={{ background: t.primaryText, color: t.onPrimary }}>
            <Pencil size={14} /> Editar serviço
          </button>
        </div>
      )}
    </div>
  );
}

/* Memorial de cálculo — documento de impressão separado, com cores fixas    */
/* (não os tokens de tema: se alguém imprimir no modo escuro, texto claro    */
/* sobre o fundo branco forçado da impressão ficaria ilegível). Mostra       */
/* fórmula + substituição numérica + resultado de cada indicador, não só o   */
/* resultado final — é isso que faz ser "memorial", não só um resumo.        */
const COR_MEMORIAL = { texto: "#0F172A", mudo: "#5B6472", borda: "#D8DEE8", fundoAlt: "#F5F7FA" };

function LinhaFormula({ nome, formula, substituicao, resultado }) {
  const c = COR_MEMORIAL;
  return (
    <div style={{ padding: "10px 0", borderBottom: `1px solid ${c.borda}` }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: c.texto, margin: 0 }}>{nome}</p>
      <p style={{ fontSize: 11, color: c.mudo, margin: "3px 0 0", fontStyle: "italic" }}>{formula}</p>
      <p style={{ fontSize: 11, color: c.mudo, margin: "2px 0 0", fontFamily: "monospace" }}>{substituicao}</p>
      <p style={{ fontSize: 13, fontWeight: 700, color: c.texto, margin: "4px 0 0" }}>= {resultado}</p>
    </div>
  );
}

function MemorialCalculo({ negocio, nd, dre, peContabilRS, peFinanceiroRS, peEconomicoRS, custoOportunidadeMes, margemSeguranca, gao, pontoEquilibrioMix, margemContribuicaoPonderada }) {
  const c = COR_MEMORIAL;
  const agora = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const rcmPct = fmtPct(dre.rcm * 100, 2);
  // Com aluguel de cadeiras recebido, a base dos pontos de equilíbrio é o custo
  // fixo líquido desse aluguel; a fórmula e a substituição deixam isso visível.
  const temAluguel = dre.aluguelRecebido > 0;
  const nomeBaseCF = temAluguel ? "(Custos Fixos − Aluguel de Cadeiras Recebido)" : "Custos Fixos";
  const valorBaseCF = temAluguel ? `(${fmtBRL(dre.custosFixos)} − ${fmtBRL(dre.aluguelRecebido)})` : fmtBRL(dre.custosFixos);

  return (
    <div id="memorial-calculo" style={{ background: "#fff", color: c.texto, padding: 16, fontFamily: "'Poppins', sans-serif" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Memorial de Cálculo</p>
        <p style={{ fontSize: 12, color: c.mudo, margin: "2px 0 0" }}>Preço Justo — gerado em {agora}</p>
      </div>

      <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px", borderBottom: `2px solid ${c.texto}`, paddingBottom: 4 }}>1. Dados de entrada do negócio</p>
      <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", marginBottom: 16 }}>
        <tbody>
          <tr><td style={{ padding: "3px 0", color: c.mudo }}>Custos fixos mensais</td><td style={{ padding: "3px 0", textAlign: "right", fontWeight: 600 }}>{negocio.custosFixos.filter(cf => N(cf.valor) > 0).map((cf) => `${cf.nome}: ${fmtBRL(N(cf.valor))}`).join(" · ") || "—"}</td></tr>
          <tr><td style={{ padding: "3px 0", color: c.mudo }}>Pró-labore</td><td style={{ padding: "3px 0", textAlign: "right", fontWeight: 600 }}>{fmtBRL(nd.proLabore)}</td></tr>
          <tr><td style={{ padding: "3px 0", color: c.mudo }}>Custo fixo total/mês</td><td style={{ padding: "3px 0", textAlign: "right", fontWeight: 600 }}>{fmtBRL(nd.custoFixoTotal)}</td></tr>
          {nd.receitaAluguelCadeiras > 0 && (
            <tr><td style={{ padding: "3px 0", color: c.mudo }}>Aluguel de cadeiras recebido/mês</td><td style={{ padding: "3px 0", textAlign: "right", fontWeight: 600 }}>{fmtBRL(nd.receitaAluguelCadeiras)}</td></tr>
          )}
          <tr><td style={{ padding: "3px 0", color: c.mudo }}>Capacidade produtiva</td><td style={{ padding: "3px 0", textAlign: "right", fontWeight: 600 }}>{nd.numeroProfissionais} profissional(is) × {negocio.horasDia}h × {negocio.diasMes} dias = {nd.horasTotais}h/mês</td></tr>
          <tr><td style={{ padding: "3px 0", color: c.mudo }}>Regime tributário</td><td style={{ padding: "3px 0", textAlign: "right", fontWeight: 600 }}>
            {negocio.regime === "simples" ? `Simples Nacional, Anexo ${nd.anexoUsado} (alíq. efetiva ${fmtPct(nd.impostoPct, 2)})` : negocio.regime === "mei" ? "MEI" : "Não definido"}
          </td></tr>
          <tr><td style={{ padding: "3px 0", color: c.mudo }}>Capital investido / retorno alternativo</td><td style={{ padding: "3px 0", textAlign: "right", fontWeight: 600 }}>{fmtBRL(N(negocio.capitalInvestido))} a {fmtPct(N(negocio.taxaRetorno))}/mês</td></tr>
        </tbody>
      </table>

      <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px", borderBottom: `2px solid ${c.texto}`, paddingBottom: 4 }}>2. Indicadores — fórmula, substituição e resultado</p>

      {/* Com aluguel de cadeiras recebido, a base dos pontos de equilíbrio é o custo   */}
      {/* fixo líquido desse aluguel — a fórmula e a substituição mostram isso.          */}
      <LinhaFormula nome="Razão de Contribuição Margem (RCM)" formula="RCM = Margem de Contribuição Total ÷ Receita Bruta"
        substituicao={`${fmtBRL(dre.margemContribuicaoTotal)} ÷ ${fmtBRL(dre.receitaBruta)}`} resultado={rcmPct} />

      <LinhaFormula nome="Ponto de Equilíbrio Contábil" formula={`PE Contábil = ${nomeBaseCF} ÷ RCM`}
        substituicao={`${valorBaseCF} ÷ ${rcmPct}`} resultado={fmtBRL(peContabilRS)} />

      <LinhaFormula nome="Ponto de Equilíbrio Financeiro" formula={`PE Financeiro = (${nomeBaseCF} − Itens sem Saída de Caixa) ÷ RCM`}
        substituicao={`(${valorBaseCF} − ${fmtBRL(nd.custoFixoNaoCaixa)}) ÷ ${rcmPct}`} resultado={fmtBRL(peFinanceiroRS)} />

      <LinhaFormula nome="Ponto de Equilíbrio Econômico" formula={`PE Econômico = (${nomeBaseCF} + Custo de Oportunidade do Capital) ÷ RCM`}
        substituicao={`(${valorBaseCF} + ${fmtBRL(custoOportunidadeMes)}) ÷ ${rcmPct}`} resultado={fmtBRL(peEconomicoRS)} />

      <LinhaFormula nome="Margem de Segurança" formula="MS = (Receita Bruta − PE Contábil) ÷ Receita Bruta"
        substituicao={`(${fmtBRL(dre.receitaBruta)} − ${fmtBRL(peContabilRS)}) ÷ ${fmtBRL(dre.receitaBruta)}`}
        resultado={margemSeguranca === null ? "—" : fmtPct(margemSeguranca)} />

      <LinhaFormula nome="Grau de Alavancagem Operacional (GAO)" formula="GAO = Margem de Contribuição Total ÷ Resultado Operacional"
        substituicao={`${fmtBRL(dre.margemContribuicaoTotal)} ÷ ${fmtBRL(dre.resultadoOperacional)}`}
        resultado={gao === null ? "— (operando abaixo do equilíbrio)" : `${gao.toFixed(2)}×`} />

      <LinhaFormula nome="Ponto de Equilíbrio Ponderado (Mix de Serviços)" formula={`PE Mix = ${nomeBaseCF} ÷ MCP, onde MCP = Σ(peso do serviço × margem de contribuição unitária)`}
        substituicao={`${valorBaseCF} ÷ ${fmtBRL(margemContribuicaoPonderada)}/atend.`}
        resultado={Number.isFinite(pontoEquilibrioMix) ? `${Math.ceil(pontoEquilibrioMix)} atendimentos/mês` : "—"} />

      <p style={{ fontSize: 13, fontWeight: 700, margin: "16px 0 8px", borderBottom: `2px solid ${c.texto}`, paddingBottom: 4 }}>3. DRE Gerencial do Mês</p>
      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
        <tbody>
          {[
            ...(dre.cotaParteParceiros > 0 ? [
              ["Valor cobrado dos clientes", dre.valorCobrado, false],
              ["(–) Cota-parte repassada aos parceiros", -dre.cotaParteParceiros, false],
            ] : []),
            [dre.cotaParteParceiros > 0 ? "= Receita bruta do salão" : "Receita bruta", dre.receitaBruta, true],
            ["(–) Impostos sobre vendas", -dre.impostos, false],
            ["= Receita líquida", dre.receitaLiquida, true],
            ["(–) Custos variáveis totais", -dre.custosVariaveisTotais, false],
            ["= Margem de contribuição", dre.margemContribuicaoTotal, true],
            ["(–) Custos fixos (incl. pró-labore)", -dre.custosFixos, false],
            ...(dre.aluguelRecebido > 0 ? [["(+) Aluguel de cadeiras recebido", dre.aluguelRecebido, false]] : []),
            ["= Resultado operacional", dre.resultadoOperacional, true],
          ].map(([label, valor, forte]) => (
            <tr key={label} style={{ borderTop: forte ? `1px solid ${c.borda}` : "none" }}>
              <td style={{ padding: "4px 0", fontWeight: forte ? 700 : 400 }}>{label}</td>
              <td style={{ padding: "4px 0", textAlign: "right", fontWeight: forte ? 700 : 400 }}>{fmtBRL(valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ fontSize: 9, color: c.mudo, marginTop: 24, textAlign: "center" }}>
        Documento gerado automaticamente pelo Preço Justo a partir dos dados informados pelo usuário — não constitui parecer contábil ou fiscal.
      </p>
    </div>
  );
}

/* `origem`: "projecao" (Painel — recalculado ao vivo com a configuração de  */
/* hoje), "real" (Fechamento — números registrados daquele mês, que não    */
/* mudam se a configuração mudar depois) ou "exemplo" (mês ilustrativo do  */
/* botão "carregar exemplo" — nunca pode aparecer como dado real).         */
function DRECard({ dre, origem = "projecao", mesLabel }) {
  const t = useT();
  // Bloco 11: com parceiros, começa no valor cobrado e desconta a cota-parte.
  const comParceiros = N(dre.cotaParteParceiros) > 0;
  const linhas = [
    ...(comParceiros ? [
      { label: "Valor cobrado dos clientes", valor: dre.valorCobrado },
      { label: "(–) Cota-parte repassada aos parceiros", valor: -dre.cotaParteParceiros },
    ] : []),
    { label: comParceiros ? "= Receita bruta do salão" : "Receita bruta", valor: dre.receitaBruta, forte: true },
    { label: "(–) Impostos sobre vendas", valor: -dre.impostos },
    { label: "= Receita líquida", valor: dre.receitaLiquida, sub: true },
    { label: "(–) Custos variáveis totais", valor: -dre.custosVariaveisTotais },
    { label: "= Margem de contribuição", valor: dre.margemContribuicaoTotal, sub: true },
    { label: "(–) Custos fixos (incl. pró-labore)", valor: -dre.custosFixos },
    ...(N(dre.aluguelRecebido) > 0 ? [{ label: "(+) Aluguel de cadeiras recebido", valor: dre.aluguelRecebido }] : []),
    { label: "= Resultado operacional", valor: dre.resultadoOperacional, forte: true },
  ];
  return (
    <div className="rounded-2xl p-5" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
      <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
        <p className="text-sm font-semibold" style={{ color: t.text }}>
          {origem !== "projecao" && mesLabel ? `DRE de ${mesLabel}` : "DRE gerencial do mês"}
          <Ajuda faq="dre" texto="O resultado do mês em ordem: quanto entrou, quanto foi de imposto, de custo de cada atendimento e de conta fixa, e o que sobrou no fim." />
        </p>
        {origem === "real" && <Selo tipo="real">dado real{mesLabel ? ` de ${mesLabel}` : ""}</Selo>}
        {origem === "exemplo" && <Selo tipo="aguardando">exemplo ilustrativo, não é dado real</Selo>}
        {origem === "projecao" && <Selo tipo="calculado">projeção com a configuração de hoje</Selo>}
      </div>
      {origem === "real" && (
        <p className="text-[11px] mb-3" style={{ color: t.textMuted }}>
          Números do fechamento que você registrou. Não mudam se você alterar custos, preços ou regime depois.
        </p>
      )}
      {origem === "exemplo" && (
        <p className="text-[11px] mb-3" style={{ color: t.textMuted }}>
          Mês criado pelo botão de exemplo, só para mostrar como o gráfico e o DRE funcionam. Exclua quando registrar seus meses reais.
        </p>
      )}
      {origem === "projecao" && <div className="mb-2" />}
      <div className="space-y-1.5">
        {linhas.map((l) => (
          <div key={l.label} className="flex items-center justify-between py-1"
            style={{ borderTop: l.sub || l.forte ? `1px solid ${t.border}` : "none" }}>
            <span className={"text-sm min-w-0 " + (l.forte ? "font-semibold" : "")} style={{ color: l.sub || l.forte ? t.text : t.textMuted }}>{l.label}</span>
            <span className={"font-num text-sm shrink-0 whitespace-nowrap pl-3 " + (l.forte ? "font-bold" : "font-medium")}
              style={{ color: l.valor < 0 && !l.forte && !l.sub ? t.danger : t.text }}>
              {fmtBRL(l.valor)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Ícone "i" — explicação conceitual com referência acadêmica, diferente do   */
/* "?" de ajuda de preenchimento: aqui é "o que esse indicador SIGNIFICA",    */
/* não "o que eu preencho aqui". Toque abre, toque de novo fecha (mobile).    */
function InfoConceito({ texto, referencia }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const botaoRef = useRef(null);
  const balaoRef = useRef(null);
  const posicaoBalao = useBalaoAncorado({ aberto, setAberto, botaoRef, balaoRef, largura: 230, preferencia: "abaixo" });
  return (
    <span className="relative inline-block" style={{ marginLeft: 4, verticalAlign: "middle" }}>
      <button ref={botaoRef} type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAberto((v) => !v); }}
        aria-label="O que é isso" aria-expanded={aberto}
        className="btn-press touch-target inline-flex items-center justify-center rounded-full"
        style={{ width: 15, height: 15, background: t.secondarySoft, color: t.secondaryText, border: `1px solid ${t.secondaryText}44` }}>
        <Info size={10} strokeWidth={2.75} />
      </button>
      {aberto && createPortal(
        <span
          ref={balaoRef} role="tooltip"
          onClick={(e) => { e.stopPropagation(); setAberto(false); }}
          className="pop-in rounded-lg p-2.5 text-[11px] leading-snug text-left"
          style={{ ...posicaoBalao, background: t.text, color: t.bg, boxShadow: t.shadow, fontWeight: 400, whiteSpace: "normal" }}
        >
          <span style={{ display: "block" }}>{texto}</span>
          {referencia && <span style={{ display: "block", marginTop: 6, opacity: 0.72, fontStyle: "italic" }}>{referencia}</span>}
        </span>,
        document.body
      )}
    </span>
  );
}

/* Os três pontos de equilíbrio como uma escada de perguntas, na ordem em   */
/* que o dono do negócio precisa respondê-las: o caixa fecha? → cobre todos */
/* os custos? → rende mais que o dinheiro aplicado? Cada degrau mostra o    */
/* valor, um medidor de quanto a receita projetada já cobre e quanto falta. */
/* A margem de segurança fecha o card: é a folga sobre o degrau do meio.    */
function EscadaPontoEquilibrio({ receita, rcm, financeiro, contabil, economico, capitalInvestido, taxaRetorno, custoNaoCaixa, margemSeguranca }) {
  const t = useT();
  const abrirFaq = useContext(FaqLinkContext);
  const temCapital = capitalInvestido > 0;
  const semVolume = !(receita > 0);
  const semMargem = !semVolume && !(rcm > 0);

  const degraus = [
    {
      id: "financeiro", pergunta: "O caixa fecha?", nome: "Financeiro", valor: financeiro,
      explica: custoNaoCaixa > 0
        ? `Paga as contas que saem do bolso. Não inclui ${fmtBRL(custoNaoCaixa)} de depreciação, que não é saída de dinheiro.`
        : "Paga as contas que saem do bolso. Sem depreciação cadastrada, fica igual ao contábil.",
      info: { texto: "Igual ao contábil, mas tira do custo fixo o que não sai do caixa de verdade (como depreciação) — mostra o mínimo pra não faltar dinheiro no bolso.", referencia: "Padoveze, Contabilidade Gerencial" },
    },
    {
      id: "contabil", pergunta: "Cobre todos os custos?", nome: "Contábil", valor: contabil,
      explica: "O zero a zero: paga as contas do mês, o seu pró-labore e o desgaste dos equipamentos.",
      info: { texto: "Quanto você precisa faturar pra cobrir todos os custos, sem sobrar nem faltar nada — o zero a zero clássico.", referencia: "Padoveze, Contabilidade Gerencial" },
    },
    {
      id: "economico", pergunta: "Rende mais que o dinheiro aplicado?", nome: "Econômico", valor: economico,
      explica: temCapital
        ? `Além dos custos, paga o que os ${fmtBRL(capitalInvestido)} investidos renderiam aplicados (${fmtPct(taxaRetorno)} ao mês).`
        : "Informe o capital investido na aba Negócio para calcular. Sem ele, fica igual ao contábil.",
      info: { texto: "Vai além de não ter prejuízo: soma ao custo fixo o quanto seu capital investido renderia em outro lugar, então mostra o ponto onde o negócio realmente compensa mais que a alternativa.", referencia: "Padoveze, Contabilidade Gerencial" },
    },
  ];
  const alcancou = (v) => Number.isFinite(v) && receita >= v;

  let resumo;
  if (semVolume) {
    resumo = { tom: "neutro", titulo: "Falta o volume de atendimentos", frase: "Informe quantos atendimentos por mês cada serviço tem, na Calculadora, para comparar a receita com os pontos de equilíbrio." };
  } else if (semMargem) {
    resumo = { tom: "perigo", titulo: "Nenhum volume de vendas cobre os custos", frase: "Com os preços atuais, o que sobra de cada venda depois dos custos variáveis e impostos não é positivo. Vender mais só aumenta o prejuízo: revise os preços na Calculadora." };
  } else if (!alcancou(financeiro)) {
    resumo = { tom: "perigo", titulo: "O caixa não fecha", frase: `Com a receita projetada de ${fmtBRL(receita)} por mês, faltam ${fmtBRL(financeiro - receita)} só para pagar as contas que saem do caixa.` };
  } else if (!alcancou(contabil)) {
    resumo = { tom: "atencao", titulo: "O caixa fecha, mas há prejuízo", frase: `A receita projetada de ${fmtBRL(receita)} paga as contas do mês, mas não cobre o desgaste dos equipamentos. Faltam ${fmtBRL(contabil - receita)} por mês para o zero a zero.` };
  } else if (temCapital && !alcancou(economico)) {
    resumo = { tom: "atencao", titulo: "Cobre os custos, mas rende pouco", frase: `A receita projetada de ${fmtBRL(receita)} cobre todos os custos, mas o negócio ainda rende menos do que o capital investido renderia aplicado. Faltam ${fmtBRL(economico - receita)} por mês.` };
  } else if (temCapital) {
    resumo = { tom: "ok", titulo: "Os três pontos foram alcançados", frase: `A receita projetada de ${fmtBRL(receita)} fecha o caixa, cobre todos os custos e rende mais do que o capital investido renderia aplicado.` };
  } else {
    resumo = { tom: "ok", titulo: "O caixa fecha e os custos estão cobertos", frase: `A receita projetada de ${fmtBRL(receita)} passa do zero a zero com ${fmtBRL(receita - contabil)} de folga por mês.` };
  }

  return (
    <div className="rounded-2xl p-4 sm:p-5" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
      <div className="flex items-center gap-1.5">
        <TrendingUp size={14} style={{ color: t.primaryText }} />
        <span className="text-xs font-semibold" style={{ color: t.text }}>Ponto de equilíbrio: quanto faturar por mês</span>
      </div>
      <p className="text-xs mt-1.5 mb-3" style={{ color: t.textMuted }}>
        São três valores porque respondem a três perguntas diferentes, uma depois da outra.
        {abrirFaq && (
          <>
            {" "}
            <button type="button" onClick={() => abrirFaq("ponto-de-equilibrio")} className="btn-press font-semibold underline underline-offset-2" style={{ color: t.primaryText }}>
              Por que três? →
            </button>
          </>
        )}
      </p>

      <CaixaSemaforo tom={resumo.tom} titulo={resumo.titulo}>
        <p>{resumo.frase}</p>
      </CaixaSemaforo>

      <ol className="mt-4 space-y-3">
        {degraus.map((d, i) => {
          const calculavel = Number.isFinite(d.valor) && !semVolume;
          const ok = calculavel && alcancou(d.valor);
          const critico = d.id === "financeiro";
          const cor = ok ? t.success : critico ? t.danger : t.warning;
          const trilho = ok ? t.successSoft : critico ? t.dangerSoft : t.warningSoft;
          const pctCoberto = calculavel && d.valor > 0 ? Math.min(100, (receita / d.valor) * 100) : 0;
          const Icone = ok ? CheckCircle2 : AlertTriangle;
          return (
            <li key={d.id} className="fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium inline-flex items-center gap-1.5" style={{ color: t.text }}>
                    {calculavel && <Icone size={14} className="shrink-0" style={{ color: ok ? t.successText : critico ? t.danger : t.warningText }} aria-hidden="true" />}
                    {d.pergunta}
                  </p>
                  <p className="text-[11px]" style={{ color: t.textMuted }}>
                    {d.nome}
                    <InfoConceito texto={d.info.texto} referencia={d.info.referencia} />
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-num text-sm font-semibold whitespace-nowrap" style={{ color: t.text }}>{Number.isFinite(d.valor) ? fmtBRL(d.valor) : "—"}</p>
                  {calculavel && (
                    <p className="text-[11px] font-medium whitespace-nowrap" style={{ color: ok ? t.successText : critico ? t.danger : t.warningText }}>
                      {ok ? "alcançado" : `faltam ${fmtBRL(d.valor - receita)}`}
                    </p>
                  )}
                </div>
              </div>
              {calculavel && (
                <div className="mt-1.5 rounded-full overflow-hidden" style={{ height: 6, background: trilho }}
                  role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pctCoberto)}
                  aria-label={`${d.pergunta} A receita projetada cobre ${Math.round(pctCoberto)}% deste ponto.`}>
                  <div className="rounded-full" style={{ height: "100%", width: `${pctCoberto}%`, background: cor, transition: "width .5s cubic-bezier(.2,.8,.2,1)" }} />
                </div>
              )}
              <p className="text-[11px] mt-1" style={{ color: t.textMuted }}>{d.explica}</p>
            </li>
          );
        })}
      </ol>

      {margemSeguranca !== null && !semVolume && (
        <div className="mt-4 pt-3 flex items-start justify-between gap-3" style={{ borderTop: `1px solid ${t.border}` }}>
          <p className="text-xs" style={{ color: t.textMuted }}>
            <span className="inline-flex items-center gap-1 font-medium" style={{ color: t.text }}>
              <ShieldCheck size={13} style={{ color: t.primaryText }} aria-hidden="true" /> Margem de segurança
              <InfoConceito texto="Quanto sua receita atual pode cair antes de você chegar no ponto de equilíbrio — quanto maior, mais colchão de segurança o negócio tem." referencia="Perez Jr., Oliveira e Costa, Gestão Estratégica de Custos" />
            </span>
            <br />
            {margemSeguranca > 0
              ? `A receita pode cair até ${fmtPct(margemSeguranca)} antes de chegar ao zero a zero.`
              : "A receita já está abaixo do zero a zero."}
          </p>
          <p className="font-num text-lg font-bold shrink-0" style={{ color: margemSeguranca > 0 ? t.successText : t.danger }}>{fmtPct(margemSeguranca)}</p>
        </div>
      )}
    </div>
  );
}

function IndicadorCard({ titulo, icon: Icon, info, children }) {
  const t = useT();
  return (
    <div className="rounded-2xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={14} style={{ color: t.primaryText }} />
        <span className="text-xs font-semibold" style={{ color: t.text }}>{titulo}</span>
        {info && <InfoConceito texto={info.texto} referencia={info.referencia} />}
      </div>
      {children}
    </div>
  );
}
function LinhaIndicador({ label, valor, sub, info }) {
  const t = useT();
  return (
    <div className="mb-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs inline-flex items-center" style={{ color: t.textMuted }}>
          {label}
          {info && <InfoConceito texto={info.texto} referencia={info.referencia} />}
        </span>
        <span className="font-num text-sm font-medium" style={{ color: t.text }}>{valor}</span>
      </div>
      {sub && <p className="text-[10px]" style={{ color: t.textMuted }}>{sub}</p>}
    </div>
  );
}

/* ======================================================================= */
/* Fechamento Mensal — o registro do que REALMENTE aconteceu no mês.       */
/* Fase 1 do módulo de Evolução de Desempenho: sem isso, não existe        */
/* histórico real no app, só a configuração atual e a sazonalidade         */
/* projetada — nenhum gráfico de "evolução" teria dado de verdade pra      */
/* mostrar. Ver Especificacao_Analise_Avancada.md.                         */
/* ======================================================================= */
// Normaliza uma entrada de detalhe por serviço — aceita tanto o formato antigo
// (número puro = só quantidade) quanto o novo ({quantidade, valorReal}), pra não
// quebrar fechamentos que já tinham sido salvos antes desta mudança.
function normalizarDetalheServico(raw) {
  if (raw == null) return { quantidade: 0, valorReal: null };
  if (typeof raw === "number" || typeof raw === "string") return { quantidade: N(raw), valorReal: null };
  return { quantidade: N(raw.quantidade), valorReal: raw.valorReal != null && raw.valorReal !== "" ? N(raw.valorReal) : null };
}

function chaveMes(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
const NOMES_MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
function labelMes(chave) {
  const [y, m] = chave.split("-").map(Number);
  return `${NOMES_MES[m - 1]}/${String(y).slice(2)}`;
}

function mesAnterior(chave, quantos = 1) {
  const [y, m] = chave.split("-").map(Number);
  return chaveMes(new Date(y, m - 1 - quantos, 1));
}

function mesSeguinte(chave, quantos = 1) {
  const [y, m] = chave.split("-").map(Number);
  return chaveMes(new Date(y, m - 1 + quantos, 1));
}

// Janela rolante de N meses consecutivos a partir de uma chave "AAAA-MM" — usada pra fazer
// o Fluxo de Caixa Projetado começar no mês mais antigo com fechamento real (em vez de
// sempre Jan-Dez fixo), como pedido.
function janelaDeMeses(chaveInicio, quantidade) {
  return Array.from({ length: quantidade }, (_, i) => mesSeguinte(chaveInicio, i));
}

// Sazonalidade calculada a partir do histórico REAL de fechamentos — agrupa por mês-
// calendário (Jan, Fev... independente do ano) e compara a média de cada mês com a média
// geral. Só preenche os meses-calendário que de fato têm pelo menos 1 fechamento real —
// meses sem nenhum dado voltam null, pra não inventar percentual pra mês nunca observado.
function calcularSazonalidadeAutomatica(fechamentos) {
  if (!fechamentos || fechamentos.length === 0) return null;
  const porMesCalendario = Array.from({ length: 12 }, () => []);
  fechamentos.forEach((f) => {
    const mesIndex = Number(f.mes.split("-")[1]) - 1;
    porMesCalendario[mesIndex].push(f.faturamentoBruto);
  });
  const mediaGeral = fechamentos.reduce((s, f) => s + f.faturamentoBruto, 0) / fechamentos.length;
  if (mediaGeral <= 0) return null;
  return porMesCalendario.map((valores) => {
    if (valores.length === 0) return null;
    const media = valores.reduce((s, v) => s + v, 0) / valores.length;
    return Math.round((media / mediaGeral) * 100);
  });
}

// Acha os N meses mais recentes que AINDA NÃO têm fechamento salvo, andando pra trás a
// partir do mês passado — nunca sobrescreve um mês que já existe (real ou exemplo).
function proximosMesesLivres(fechamentosExistentes, quantidade) {
  const ocupados = new Set((fechamentosExistentes || []).map((f) => f.mes));
  const livres = [];
  let cursor = 1;
  while (livres.length < quantidade && cursor <= 36) {
    const chave = mesAnterior(chaveMes(new Date()), cursor);
    if (!ocupados.has(chave)) livres.push(chave);
    cursor++;
  }
  return livres.reverse(); // do mais antigo pro mais recente, pra o gráfico mostrar uma tendência
}

// Gera um Fechamento Mensal ILUSTRATIVO — mesmo espírito de gerarDadosExemplo(), sempre marcado
// com exemplo:true e uma observação explícita, nunca escondido como se fosse dado real. Se já
// existem serviços salvos de verdade, usa os IDs deles (até 3, com uma divisão de atendimento
// plausível) pra também demonstrar o ranking por serviço e a ocupação x lucro.
function gerarFechamentoExemplo(chave, nd, servicos, indice) {
  const servicosValidos = (servicos || []).filter((s) => calcularParaExibicao(s, nd).status === "ok");
  const faturamentoBruto = 6200 + indice * 1200;
  const atendimentosTotais = 160 + indice * 25;
  const proporcoes = [0.5, 0.3, 0.2];

  let atendimentosPorServico = null;
  let custosVariaveisReais = null;
  if (servicosValidos.length > 0) {
    atendimentosPorServico = {};
    let somaMateriais = 0;
    let somaComissaoTaxa = 0;
    servicosValidos.slice(0, 3).forEach((s, i) => {
      const qtd = Math.round(atendimentosTotais * (proporcoes[i] || 0));
      if (qtd <= 0) return;
      atendimentosPorServico[s.id] = { quantidade: qtd, valorReal: null };
      const calc = calcularParaExibicao(s, nd);
      somaMateriais += qtd * calc.totalVariaveis;
      const receitaEstimada = qtd * calc.preco;
      somaComissaoTaxa += receitaEstimada * ((comissaoEfetiva(s, nd) + taxaEfetiva(s, nd)) / 100);
    });
    custosVariaveisReais = somaMateriais + somaComissaoTaxa;
  }

  const custosFixosSnapshot = nd.custoFixoTotal;
  const aluguelRecebidoSnapshot = N(nd.receitaAluguelCadeiras);
  const impostoPagoReal = faturamentoBruto * (nd.impostoPct / 100);
  const custosVariaveisUsados = custosVariaveisReais ?? 0;
  const lucroLiquidoCalculado = faturamentoBruto - custosVariaveisUsados - custosFixosSnapshot + aluguelRecebidoSnapshot - impostoPagoReal;
  const margemLiquidaPctCalculada = faturamentoBruto > 0 ? (lucroLiquidoCalculado / faturamentoBruto) * 100 : 0;

  return {
    mes: chave, faturamentoBruto, atendimentosTotais, atendimentosPorServico,
    custosVariaveisReaisInformados: custosVariaveisReais, custosFixosSnapshot, aluguelRecebidoSnapshot, impostoPagoReal,
    proLaboreRealPago: nd.proLabore,
    observacoes: "Dado de exemplo — gerado só pra demonstrar o gráfico, não é real.",
    exemplo: true,
    lucroLiquidoCalculado, margemLiquidaPctCalculada,
    fechadoEm: Date.now(), editadoEm: Date.now(),
  };
}

function FormularioFechamento({ mes, nd, servicos, profissionais, registroExistente, onSalvar, onCancelar }) {
  const t = useT();
  // Usados só no modo SEM detalhamento (entrada manual direta). No modo COM detalhamento,
  // faturamento e atendimentos totais passam a ser 100% calculados a partir das linhas por
  // serviço — não existe mais campo pra digitar os dois de novo e ter que conferir se bate.
  const [faturamentoBrutoManual, setFaturamentoBrutoManual] = useState(registroExistente?.faturamentoBruto ?? "");
  const [atendimentosTotaisManual, setAtendimentosTotaisManual] = useState(registroExistente?.atendimentosTotais ?? "");
  const [observacoes, setObservacoes] = useState(registroExistente?.observacoes ?? "");
  const [mostrarPorServico, setMostrarPorServico] = useState(
    !!registroExistente?.atendimentosPorServico && Object.keys(registroExistente.atendimentosPorServico).length > 0
  );
  // Divisão por profissional — óptica PARALELA e independente da divisão por serviço (ver
  // Especificacao_Profissionais_Produto_Servico.md, seção 1): não cruza profissional×serviço,
  // só "quanto cada um faturou", sem exigir que bata com nenhuma outra soma do formulário.
  const [mostrarPorProfissional, setMostrarPorProfissional] = useState(
    !!registroExistente?.divisaoPorProfissional && Object.keys(registroExistente.divisaoPorProfissional).length > 0
  );
  const [divisaoProfissional, setDivisaoProfissional] = useState(() => registroExistente?.divisaoPorProfissional || {});
  const profissionaisAtivos = useMemo(() => (profissionais || []).filter((p) => p.ativo !== false && p.nome.trim()), [profissionais]);
  const setDivisaoCampo = (id, campo, valor) =>
    setDivisaoProfissional((prev) => ({ ...prev, [id]: { ...(prev[id] || { atendimentos: "", valorTotal: "" }), [campo]: valor } }));

  // detalhe[servicoId] = { quantidade, valorUnitarioReal }. valorUnitarioReal é o preço POR
  // ATENDIMENTO de verdade cobrado (não o total) — mais perto de como o dono do salão pensa
  // ("cobrei R$45 no corte"), e o total é sempre quantidade × esse valor, calculado aqui.
  // Ao carregar um fechamento já salvo (onde o que fica gravado é o TOTAL, não o unitário —
  // formato inalterado pro resto do app continuar lendo igual), reconstrói o unitário
  // dividindo total ÷ quantidade só pra preencher o campo de edição.
  const [detalhe, setDetalhe] = useState(() => {
    const bruto = registroExistente?.atendimentosPorServico || {};
    return Object.fromEntries(Object.entries(bruto).map(([id, v]) => {
      const n = normalizarDetalheServico(v);
      const valorUnitarioReal = n.valorReal != null && n.quantidade > 0 ? n.valorReal / n.quantidade : null;
      return [id, { quantidade: n.quantidade, valorUnitarioReal }];
    }));
  });

  // Rascunho do fechamento (Bloco 9): o que foi digitado fica guardado no aparelho
  // e volta ao reabrir este mês, depois de trocar de aba, recarregar ou atualizar.
  const chaveRascunho = chaveRascunhoFechamento(mes);
  const estadoStr = JSON.stringify({ faturamentoBrutoManual, atendimentosTotaisManual, observacoes, mostrarPorServico, mostrarPorProfissional, divisaoProfissional, detalhe });
  const estadoInicialRef = useRef(estadoStr);
  const rascunhoLidoRef = useRef(false);
  const [rascunhoRecuperado, setRascunhoRecuperado] = useState(false);
  useEffect(() => {
    let vivo = true;
    lerRascunho(chaveRascunho).then((d) => {
      rascunhoLidoRef.current = true;
      if (!vivo || !d) return;
      setFaturamentoBrutoManual(d.faturamentoBrutoManual ?? "");
      setAtendimentosTotaisManual(d.atendimentosTotaisManual ?? "");
      setObservacoes(d.observacoes ?? "");
      setMostrarPorServico(!!d.mostrarPorServico);
      setMostrarPorProfissional(!!d.mostrarPorProfissional);
      setDivisaoProfissional(d.divisaoProfissional || {});
      setDetalhe(d.detalhe || {});
      setRascunhoRecuperado(true);
    });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!rascunhoLidoRef.current || estadoStr === estadoInicialRef.current) return;
    salvarComFallback(chaveRascunho, estadoStr);
  }, [estadoStr, chaveRascunho]);
  const descartarRascunho = () => excluirComFallback(chaveRascunho);

  const servicosValidos = useMemo(
    () => (servicos || []).filter((s) => calcularParaExibicao(s, nd).status === "ok"),
    [servicos, nd]
  );

  const setQuantidade = (id, valor) => setDetalhe((prev) => ({ ...prev, [id]: { ...(prev[id] || { valorUnitarioReal: null }), quantidade: valor } }));
  const setValorUnitario = (id, valor) => setDetalhe((prev) => ({ ...prev, [id]: { ...(prev[id] || { quantidade: 0 }), valorUnitarioReal: valor } }));

  // Pra cada serviço com quantidade > 0: receita = quantidade × (valor unitário real
  // informado, ou o preço salvo como estimativa). Custo de material escala com quantidade;
  // comissão/taxa/imposto escalam sobre a receita REAL — se deu desconto, a comissão sobre
  // desconto é menor de verdade.
  const detalhamento = useMemo(() => {
    if (!mostrarPorServico) return [];
    return servicosValidos.map((s) => {
      const raw = detalhe[s.id];
      const quantidade = N(raw?.quantidade);
      if (quantidade <= 0) return null;
      const calc = calcularParaExibicao(s, nd);
      const valorUnitarioReal = raw?.valorUnitarioReal != null && raw.valorUnitarioReal !== "" ? N(raw.valorUnitarioReal) : null;
      const valorUnitarioUsado = valorUnitarioReal ?? calc.preco;
      const receita = quantidade * valorUnitarioUsado;
      const custoMaterial = quantidade * calc.totalVariaveis;
      // Bloco 11: a cota-parte de parceiro sai da comissão (vai para a dedução da
      // receita) e a taxa da maquininha fica só sobre a parte do salão.
      const parcela = parcelaParceiro(s, nd);
      const cotaParte = receita * (parcela / 100);
      const custoComissao = receita * ((comissaoEfetiva(s, nd) - parcela) / 100);
      const custoTaxaCartao = receita * (taxaEfetiva(s, nd) / 100) * (1 - parcela / 100);
      return { servicoId: s.id, nome: s.nome, quantidade, receita, valorUnitarioUsado, estimado: valorUnitarioReal == null, custoMaterial, custoComissao, custoTaxaCartao, cotaParte };
    }).filter(Boolean);
  }, [mostrarPorServico, detalhe, servicosValidos, nd]);

  const custosVariaveisReais = mostrarPorServico && detalhamento.length > 0
    ? detalhamento.reduce((s, d) => s + d.custoMaterial + d.custoComissao + d.custoTaxaCartao, 0)
    : null;

  // No modo com detalhamento, os dois totais são SOMA do que foi preenchido por serviço —
  // nunca mais digitados de novo à parte, então não existe divergência possível pra avisar.
  const atendimentosTotaisAuto = detalhamento.reduce((s, d) => s + d.quantidade, 0);
  const faturamentoBrutoAuto = detalhamento.reduce((s, d) => s + d.receita, 0);
  const faturamento = mostrarPorServico ? faturamentoBrutoAuto : N(faturamentoBrutoManual);
  const atendimentosTotais = mostrarPorServico ? atendimentosTotaisAuto : N(atendimentosTotaisManual);

  const custosFixosSnapshot = nd.custoFixoTotal;
  const aluguelRecebidoSnapshot = N(nd.receitaAluguelCadeiras);
  // Bloco 11: cota-parte repassada aos parceiros no mês. Com o detalhamento por
  // serviço, vem dele; sem ele, do faturamento informado por profissional.
  const cotaParteSnapshot = mostrarPorServico && detalhamento.length > 0
    ? detalhamento.reduce((s, d) => s + d.cotaParte, 0)
    : mostrarPorProfissional && nd.parceriaPermitida
      ? profissionaisAtivos.filter((p) => parceiroValido(p)).reduce((s, p) => s + N(divisaoProfissional[p.id]?.valorTotal) * (N(p.comissaoPct) / 100), 0)
      : 0;
  const impostoEstimado = (faturamento - cotaParteSnapshot) * (nd.impostoPct / 100);
  const custosVariaveisUsados = custosVariaveisReais ?? 0;
  const lucroLiquidoCalculado = faturamento - cotaParteSnapshot - custosVariaveisUsados - custosFixosSnapshot + aluguelRecebidoSnapshot - impostoEstimado;
  const margemLiquidaPctCalculada = faturamento > 0 ? (lucroLiquidoCalculado / faturamento) * 100 : 0;
  const valido = faturamento > 0 && atendimentosTotais > 0;

  const salvar = () => {
    // Converte de volta pro formato já usado no resto do app (quantidade + TOTAL, não
    // unitário) — só a edição usa valor por atendimento, o que fica salvo não muda de forma.
    const atendimentosPorServico = mostrarPorServico
      ? Object.fromEntries(
          detalhamento.map((d) => [d.servicoId, { quantidade: d.quantidade, valorReal: d.estimado ? null : d.receita }])
        )
      : null;
    const divisaoPorProfissional = mostrarPorProfissional
      ? Object.fromEntries(
          Object.entries(divisaoProfissional)
            .filter(([, v]) => N(v?.atendimentos) > 0 || N(v?.valorTotal) > 0)
            .map(([id, v]) => [id, { atendimentos: N(v.atendimentos), valorTotal: N(v.valorTotal) }])
        )
      : null;
    onSalvar({
      mes,
      faturamentoBruto: faturamento,
      atendimentosTotais,
      atendimentosPorServico,
      divisaoPorProfissional,
      custosVariaveisReaisInformados: custosVariaveisReais,
      custosFixosSnapshot,
      aluguelRecebidoSnapshot,
      cotaParteSnapshot,
      impostoPagoReal: impostoEstimado,
      proLaboreRealPago: nd.proLabore,
      observacoes,
      lucroLiquidoCalculado,
      margemLiquidaPctCalculada,
      fechadoEm: registroExistente?.fechadoEm ?? Date.now(),
      editadoEm: Date.now(),
    });
    descartarRascunho();
  };

  return (
    <div className="rounded-xl p-3 space-y-3 pop-in" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
      <p className="text-xs font-semibold" style={{ color: t.text }}>Fechamento de {labelMes(mes)}</p>
      {rascunhoRecuperado && (
        <div className="pop-in flex items-start gap-1.5 rounded-xl p-2.5 text-xs" role="status" style={{ background: t.successSoft, color: t.successText }}>
          <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
          <span>Recuperamos o que você tinha digitado neste fechamento. Confira e salve.</span>
        </div>
      )}

      {mostrarPorServico ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-xs font-medium block mb-1" style={{ color: t.text }}>Faturamento bruto do mês</span>
            <div className={CAMPO + " font-num"} style={{ background: t.surfaceAlt, border: `1px dashed ${t.border}`, color: t.text }}>{fmtBRL(faturamentoBrutoAuto)}</div>
            <p className="text-[10px] mt-1" style={{ color: t.textMuted }}>Soma do detalhamento abaixo.</p>
          </div>
          <div>
            <span className="text-xs font-medium block mb-1" style={{ color: t.text }}>Atendimentos no mês</span>
            <div className={CAMPO + " font-num"} style={{ background: t.surfaceAlt, border: `1px dashed ${t.border}`, color: t.text }}>{atendimentosTotaisAuto}</div>
            <p className="text-[10px] mt-1" style={{ color: t.textMuted }}>Soma do detalhamento abaixo.</p>
          </div>
        </div>
      ) : (
        <>
          <Campo label="Faturamento bruto do mês" ajuda="Tudo que entrou, antes de qualquer desconto de custo ou imposto.">
            <CampoMoeda value={faturamentoBrutoManual} onChange={setFaturamentoBrutoManual} />
          </Campo>
          <Campo label="Atendimentos realizados no mês" ajuda="Total de atendimentos, somando todos os serviços.">
            <CampoNumero value={atendimentosTotaisManual} onChange={setAtendimentosTotaisManual} placeholder="0" />
          </Campo>
        </>
      )}

      <button onClick={() => setMostrarPorServico((v) => !v)} className="text-[11px] font-medium underline btn-press" style={{ color: t.primaryText }}>
        {mostrarPorServico ? "ocultar detalhamento por serviço (voltar a digitar o total manualmente)" : "detalhar por serviço (calcula o total sozinho, e deixa o histórico mais preciso)"}
      </button>

      {mostrarPorServico && (
        <div className="space-y-2">
          {servicosValidos.map((s) => {
            const raw = detalhe[s.id];
            const quantidade = N(raw?.quantidade);
            const calc = calcularParaExibicao(s, nd);
            const valorUnitarioReal = raw?.valorUnitarioReal != null && raw.valorUnitarioReal !== "" ? N(raw.valorUnitarioReal) : null;
            return (
              <div key={s.id} className="rounded-lg p-2 space-y-1.5" style={{ background: t.surfaceAlt }}>
                <p className="text-xs font-medium" style={{ color: t.text }}>{s.nome}</p>
                <div className="flex gap-2">
                  <label className="flex-1 block">
                    <span className="text-[10px]" style={{ color: t.textMuted }}>Atendimentos</span>
                    <input
                      type="number" min="0" inputMode="numeric" className={CAMPO + " font-num"}
                      style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                      value={raw?.quantidade ?? ""} onChange={(e) => setQuantidade(s.id, e.target.value)}
                      placeholder="0" aria-label={`Atendimentos de ${s.nome}`}
                    />
                  </label>
                  <label className="flex-1 block">
                    <span className="text-[10px]" style={{ color: t.textMuted }}>Valor cobrado — real, por atendimento (opcional)</span>
                    <CampoMoeda value={raw?.valorUnitarioReal ?? ""} onChange={(v) => setValorUnitario(s.id, v)} />
                  </label>
                </div>
                {quantidade > 0 && (
                  <p className="text-[10px]" style={{ color: t.textMuted }}>
                    {valorUnitarioReal != null
                      ? `${fmtBRL(valorUnitarioReal)}/atendimento × ${quantidade} = ${fmtBRL(valorUnitarioReal * quantidade)}`
                      : `Sem valor informado — estimando pelo preço salvo: ${fmtBRL(calc.preco)}/atendimento × ${quantidade} = ${fmtBRL(calc.preco * quantidade)}`}
                  </p>
                )}
              </div>
            );
          })}
          {servicosValidos.length === 0 && <p className="text-[11px]" style={{ color: t.textMuted }}>Nenhum serviço válido salvo ainda.</p>}
        </div>
      )}

      {profissionaisAtivos.length > 0 && (
        <>
          <button onClick={() => setMostrarPorProfissional((v) => !v)} className="text-[11px] font-medium underline btn-press" style={{ color: t.primaryText }}>
            {mostrarPorProfissional ? "ocultar divisão por profissional" : "dividir por profissional (opcional — independe do detalhamento por serviço)"}
          </button>

          {mostrarPorProfissional && (
            <div className="space-y-2">
              <p className="text-[11px]" style={{ color: t.textMuted }}>
                Quanto cada um faturou no mês, sem precisar bater com a soma total nem com o detalhamento por serviço — são óticas independentes.
              </p>
              {profissionaisAtivos.map((p) => (
                <div key={p.id} className="rounded-lg p-2 space-y-1.5" style={{ background: t.surfaceAlt }}>
                  <p className="text-xs font-medium" style={{ color: t.text }}>{p.nome}</p>
                  <div className="flex gap-2">
                    <label className="flex-1 block">
                      <span className="text-[10px]" style={{ color: t.textMuted }}>Atendimentos</span>
                      <input
                        type="number" min="0" inputMode="numeric" className={CAMPO + " font-num"}
                        style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                        value={divisaoProfissional[p.id]?.atendimentos ?? ""} onChange={(e) => setDivisaoCampo(p.id, "atendimentos", e.target.value)}
                        placeholder="0" aria-label={`Atendimentos de ${p.nome}`}
                      />
                    </label>
                    <label className="flex-1 block">
                      <span className="text-[10px]" style={{ color: t.textMuted }}>Valor total faturado</span>
                      <CampoMoeda value={divisaoProfissional[p.id]?.valorTotal ?? ""} onChange={(v) => setDivisaoCampo(p.id, "valorTotal", v)} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Campo label="Observações (opcional)">
        <input
          className={CAMPO} style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
          value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="ex: campanha de Dia das Mães"
        />
      </Campo>

      {faturamento > 0 && (
        <div className="rounded-lg p-2.5 text-xs" style={{ background: t.surfaceAlt, border: `1px solid ${t.border}` }}>
          {cotaParteSnapshot > 0 && (
            <div className="flex justify-between"><span style={{ color: t.textMuted }}>Cota-parte dos parceiros</span><span className="font-num">−{fmtBRL(cotaParteSnapshot)}</span></div>
          )}
          <div className="flex justify-between"><span style={{ color: t.textMuted }}>Custo fixo (config. atual)</span><span className="font-num">{fmtBRL(custosFixosSnapshot)}</span></div>
          {aluguelRecebidoSnapshot > 0 && (
            <div className="flex justify-between"><span style={{ color: t.textMuted }}>Aluguel de cadeiras recebido</span><span className="font-num">+{fmtBRL(aluguelRecebidoSnapshot)}</span></div>
          )}
          <div className="flex justify-between">
            <span style={{ color: t.textMuted }}>Custo variável {mostrarPorServico ? "(real)" : "(não informado)"}</span>
            <span className="font-num">{fmtBRL(custosVariaveisUsados)}</span>
          </div>
          <div className="flex justify-between"><span style={{ color: t.textMuted }}>Imposto estimado ({fmtPct(nd.impostoPct)}{cotaParteSnapshot > 0 ? " sobre a parte do salão" : ""})</span><span className="font-num">{fmtBRL(impostoEstimado)}</span></div>
          <div
            className="flex justify-between font-semibold pt-1.5 mt-1"
            style={{ borderTop: `1px solid ${t.border}`, color: lucroLiquidoCalculado >= 0 ? t.successText : t.danger }}
          >
            <span>Lucro líquido do mês</span><span className="font-num">{fmtBRL(lucroLiquidoCalculado)} · {fmtPct(margemLiquidaPctCalculada)}</span>
          </div>
          {!mostrarPorServico && (
            <p className="text-[10px] mt-1.5" style={{ color: t.textMuted }}>
              Sem o detalhamento por serviço, o custo variável real do mês não entra na conta — só fixo e imposto.
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={salvar} disabled={!valido}
          className="btn-press flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
          style={{ background: valido ? t.success : t.surfaceAlt, color: valido ? t.onSuccess : t.textMuted, opacity: valido ? 1 : 0.6 }}
        >
          <Save size={12} /> Salvar fechamento
        </button>
        <button onClick={() => { descartarRascunho(); onCancelar(); }} className="btn-press rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: t.surfaceAlt, color: t.textMuted }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function FechamentoMensal({ nd, servicos, fechamentos, onSalvar, onRemover, onCarregarExemplos, profissionais }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [verDRE, setVerDRE] = useState(null);

  const chaveAtual = chaveMes(new Date());
  const fechamentoAtual = fechamentos?.find((f) => f.mes === chaveAtual);

  // Havia um fechamento sendo digitado (Bloco 9)? Reabre direto nele.
  useEffect(() => {
    let vivo = true;
    listarComFallback(chaveRascunhoFechamento("")).then((chaves) => {
      if (!vivo || chaves.length === 0) return;
      const mes = chaves.sort().pop().slice(chaveRascunhoFechamento("").length);
      if (!mes) return;
      setEditando(mes);
      setAberto(true);
    });
    return () => { vivo = false; };
  }, []);

  const salvar = (registro) => {
    onSalvar(registro);
    setEditando(null);
  };

  const remover = (mes) => onRemover(mes);

  const carregarExemploFechamentos = () => {
    const meses = proximosMesesLivres(fechamentos, 2);
    const novos = meses.map((chave, i) => gerarFechamentoExemplo(chave, nd, servicos, i));
    onCarregarExemplos(novos);
  };

  const cardStyle = { background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow };

  if (fechamentos === null) {
    return <div className="rounded-2xl p-4 no-print" style={cardStyle}><SkeletonBlock h={20} w="60%" /></div>;
  }

  return (
    <div className="rounded-2xl p-4 no-print" style={cardStyle}>
      <button onClick={() => setAberto((v) => !v)} className="btn-press touch-target flex items-center justify-between w-full" aria-expanded={aberto}>
        <span className="text-sm font-semibold inline-flex items-center gap-1.5" style={{ color: t.text }}>
          <CalendarCheck size={14} style={{ color: t.primaryText }} /> Fechamento mensal
        </span>
        <ChevronDown size={15} style={{ color: t.textMuted, transform: aberto ? "rotate(180deg)" : "none", transition: "transform .2s ease" }} />
      </button>

      {aberto && (
        <div className="pop-in mt-3 space-y-3">
          <p className="text-[11px]" style={{ color: t.textMuted }}>
            Registre o que realmente aconteceu no mês — esse histórico é a base de dados real que vai alimentar os
            gráficos de evolução. Sem ele, não existe "real" pra mostrar, só projeção.
          </p>

          <button onClick={carregarExemploFechamentos} className="text-[11px] font-medium underline btn-press" style={{ color: t.primaryText }}>
            carregar 2 meses de exemplo (pra testar o gráfico de evolução)
          </button>

          {!fechamentoAtual ? (
            <div className="rounded-xl p-3 flex items-center justify-between gap-2 flex-wrap" style={{ background: t.warningSoft }}>
              <span className="text-xs" style={{ color: t.text }}>{labelMes(chaveAtual)} ainda não foi fechado.</span>
              {editando !== chaveAtual && (
                <button onClick={() => setEditando(chaveAtual)} className="btn-press shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold" style={{ background: t.warning, color: t.onWarning }}>
                  Fechar agora
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl p-3" style={{ background: t.successSoft }}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs" style={{ color: t.text }}>
                  {labelMes(chaveAtual)} já fechado — lucro líquido {fmtBRL(fechamentoAtual.lucroLiquidoCalculado)}
                </span>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => setVerDRE((v) => (v === chaveAtual ? null : chaveAtual))} className="btn-press rounded-lg px-2.5 py-1.5 text-xs font-semibold" style={{ background: "transparent", color: t.text, border: `1px solid ${t.text}33` }}>
                    {verDRE === chaveAtual ? "ocultar DRE" : "ver DRE"}
                  </button>
                  {editando !== chaveAtual && (
                    <button onClick={() => setEditando(chaveAtual)} className="btn-press rounded-lg px-2.5 py-1.5 text-xs font-semibold" style={{ background: t.surface, color: t.primaryText, border: `1px solid ${t.border}` }}>
                      Editar
                    </button>
                  )}
                </div>
              </div>
              {verDRE === chaveAtual && (
                <div className="pop-in mt-3">
                  <DRECard dre={montarDREMensal(fechamentoAtual)} origem={fechamentoAtual.exemplo ? "exemplo" : "real"} mesLabel={labelMes(chaveAtual)} />
                  {fechamentoAtual.custosVariaveisReaisInformados == null && (
                    <p className="text-[10px] mt-1.5" style={{ color: t.textMuted }}>Custo variável não foi detalhado por serviço neste mês — aparece como R$ 0,00 no DRE acima.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {editando && (
            <FormularioFechamento
              mes={editando} nd={nd} servicos={servicos} profissionais={profissionais}
              registroExistente={fechamentos.find((f) => f.mes === editando)}
              onSalvar={salvar} onCancelar={() => setEditando(null)}
            />
          )}

          {fechamentos.filter((f) => f.mes !== chaveAtual).length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: t.textMuted }}>Meses anteriores</p>
              <div className="space-y-1.5">
                {fechamentos.filter((f) => f.mes !== chaveAtual).map((f) => (
                  <div key={f.mes} className="rounded-lg px-3 py-2" style={{ background: t.surfaceAlt }}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span style={{ color: t.text }}>
                        {labelMes(f.mes)}
                        {f.exemplo && (
                          <span className="ml-1.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full align-middle" style={{ background: t.warningSoft, color: t.warningText }}>exemplo</span>
                        )}
                      </span>
                      <span className="font-num" style={{ color: f.lucroLiquidoCalculado >= 0 ? t.successText : t.danger }}>
                        {fmtBRL(f.lucroLiquidoCalculado)} · {fmtPct(f.margemLiquidaPctCalculada)}
                      </span>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => setVerDRE((v) => (v === f.mes ? null : f.mes))} className="btn-press touch-target px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ color: t.primaryText, border: `1px solid ${t.primaryText}44` }}>
                          {verDRE === f.mes ? "ocultar" : "DRE"}
                        </button>
                        <button onClick={() => setEditando(f.mes)} className="btn-press touch-target p-1" style={{ color: t.primaryText }} aria-label={`Editar fechamento de ${labelMes(f.mes)}`}><Pencil size={12} /></button>
                        <button onClick={() => remover(f.mes)} className="btn-press touch-target p-1" style={{ color: t.danger }} aria-label={`Excluir fechamento de ${labelMes(f.mes)}`}><Trash2 size={12} /></button>
                      </div>
                    </div>
                    {verDRE === f.mes && (
                      <div className="pop-in mt-2">
                        <DRECard dre={montarDREMensal(f)} origem={f.exemplo ? "exemplo" : "real"} mesLabel={labelMes(f.mes)} />
                        {f.custosVariaveisReaisInformados == null && (
                          <p className="text-[10px] mt-1.5" style={{ color: t.textMuted }}>Custo variável não foi detalhado por serviço neste mês — aparece como R$ 0,00 no DRE acima.</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ======================================================================= */
/* Evolução e Comparativos — Fase 2 do módulo (ver Especificacao_          */
/* Analise_Avancada.md). Lê os registros de FechamentoMensal; não          */
/* recalcula nada que já não esteja salvo ali (lucroLiquidoCalculado etc), */
/* só organiza/deriva pra visualização.                                    */
/* ======================================================================= */
function computeHistoricoMensal(fechamentos, sazonalidade) {
  return [...fechamentos]
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .map((f) => {
      const mesIndex = Number(f.mes.split("-")[1]) - 1;
      return {
        mes: f.mes,
        mesLabel: labelMes(f.mes),
        faturamentoBruto: f.faturamentoBruto,
        lucroLiquido: f.lucroLiquidoCalculado,
        custosTotais: f.faturamentoBruto - f.lucroLiquidoCalculado,
        margemLiquidaPct: Number(f.margemLiquidaPctCalculada?.toFixed(1)) || 0,
        ticketMedio: f.atendimentosTotais > 0 ? f.faturamentoBruto / f.atendimentosTotais : 0,
        atendimentos: f.atendimentosTotais,
        temBreakdownServico: !!f.atendimentosPorServico && Object.values(f.atendimentosPorServico).some((v) => normalizarDetalheServico(v).quantidade > 0),
        sazonalidadeEsperadaPct: N(sazonalidade?.[mesIndex]) || 100,
      };
    });
}

// Calcula a margem de contribuição de cada serviço DENTRO de um único fechamento — usada
// tanto pelo ranking acumulado quanto pelo comparativo mensal, pra não duplicar a mesma
// fórmula em dois lugares. Usa a receita REAL quando foi informada (valorReal); só cai pra
// "quantidade × preço salvo" como estimativa quando não foi. Custo de material escala com
// quantidade; comissão/taxa de cartão/imposto escalam sobre a receita real de cada serviço
// (não sobre o preço teórico), porque é sobre o que entrou de fato que essas % incidem.
function margensPorServicoNoFechamento(fechamento, servicos, nd) {
  const resultado = {};
  if (!fechamento.atendimentosPorServico) return resultado;
  Object.entries(fechamento.atendimentosPorServico).forEach(([id, raw]) => {
    const d = normalizarDetalheServico(raw);
    if (d.quantidade <= 0) return;
    const servico = (servicos || []).find((s) => s.id === id);
    if (!servico) return;
    const calc = calcularParaExibicao(servico, nd);
    if (calc.status !== "ok") return;
    const receita = d.valorReal != null ? d.valorReal : d.quantidade * calc.preco;
    const custoMaterial = d.quantidade * calc.totalVariaveis;
    const custoComissao = receita * (comissaoEfetiva(servico, nd) / 100); // inclui a cota-parte de parceiro
    const fatorSalao = 1 - parcelaParceiro(servico, nd) / 100; // Bloco 11
    const custoTaxaCartao = receita * (taxaEfetiva(servico, nd) / 100) * fatorSalao;
    const custoImposto = receita * (nd.impostoPct / 100) * fatorSalao;
    resultado[id] = {
      nome: servico.nome, categoria: servico.categoria || "Outros", tipo: servico.tipo || "servico", quantidade: d.quantidade,
      receita, temReceitaReal: d.valorReal != null,
      margem: receita - custoMaterial - custoComissao - custoTaxaCartao - custoImposto,
      horasOcupadas: d.quantidade * N(servico.horasPorAtendimento),
    };
  });
  return resultado;
}

function computeRankingServicos(fechamentos, servicos, nd) {
  const acumulado = {};
  fechamentos.forEach((f) => {
    Object.entries(margensPorServicoNoFechamento(f, servicos, nd)).forEach(([id, d]) => {
      if (!acumulado[id]) acumulado[id] = { nome: d.nome, categoria: d.categoria, tipo: d.tipo, atendimentosNoPeriodo: 0, margemContribuicaoTotal: 0, horasTotaisOcupadas: 0, temReceitaReal: false };
      const a = acumulado[id];
      a.atendimentosNoPeriodo += d.quantidade;
      a.margemContribuicaoTotal += d.margem;
      a.horasTotaisOcupadas += d.horasOcupadas;
      if (d.temReceitaReal) a.temReceitaReal = true;
    });
  });
  return Object.entries(acumulado)
    .map(([servicoId, a]) => ({
      servicoId, ...a,
      lucroPorHoraCadeira: a.horasTotaisOcupadas > 0 ? a.margemContribuicaoTotal / a.horasTotaisOcupadas : 0,
    }))
    .sort((a, b) => b.margemContribuicaoTotal - a.margemContribuicaoTotal);
}

// Mesma fonte (margensPorServicoNoFechamento), mas preservando o mês em vez de somar tudo
// junto — é o "recorte mensal" do comparativo: um ponto por mês, uma linha por serviço.
// Limita aos 5 serviços de maior margem acumulada, pra não virar um gráfico ilegível.
function computeComparativoMensalServicos(fechamentos, servicos, nd) {
  const porMes = {};
  const totalPorServico = {};
  [...fechamentos].sort((a, b) => a.mes.localeCompare(b.mes)).forEach((f) => {
    const porServico = margensPorServicoNoFechamento(f, servicos, nd);
    if (Object.keys(porServico).length === 0) return;
    porMes[f.mes] = porMes[f.mes] || {};
    Object.values(porServico).forEach((d) => {
      porMes[f.mes][d.nome] = (porMes[f.mes][d.nome] || 0) + d.margem;
      totalPorServico[d.nome] = (totalPorServico[d.nome] || 0) + d.margem;
    });
  });
  const servicosNomes = Object.entries(totalPorServico).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nome]) => nome);
  const dados = Object.keys(porMes).sort().map((mes) => {
    const linha = { mes, mesLabel: labelMes(mes) };
    servicosNomes.forEach((nome) => { linha[nome] = Math.round(porMes[mes][nome] || 0); });
    return linha;
  });
  return { dados, servicosNomes };
}

// Regra simples de comparação de deltas reais — nenhum número inventado, só
// compara o que já está no histórico calculado a partir dos fechamentos.
function detectarAnomalia(mesAtual, mesAnterior) {
  if (!mesAtual || !mesAnterior || mesAnterior.faturamentoBruto <= 0 || mesAnterior.lucroLiquido === 0) return null;
  const deltaFaturamento = (mesAtual.faturamentoBruto - mesAnterior.faturamentoBruto) / mesAnterior.faturamentoBruto;
  const deltaLucro = (mesAtual.lucroLiquido - mesAnterior.lucroLiquido) / Math.abs(mesAnterior.lucroLiquido);
  if (deltaFaturamento > 0.1 && deltaLucro < deltaFaturamento * 0.5) {
    return `Faturamento subiu ${(deltaFaturamento * 100).toFixed(0)}% de ${mesAnterior.mesLabel} pra ${mesAtual.mesLabel}, mas o lucro só ${(deltaLucro * 100).toFixed(0)}%. Vale revisar custo de insumos ou comissão dos serviços que mais venderam nesse período.`;
  }
  if (deltaFaturamento < -0.1 && mesAtual.sazonalidadeEsperadaPct >= 110) {
    return `${mesAtual.mesLabel} é um mês de alta esperada na sua sazonalidade configurada, mas o faturamento caiu ${(Math.abs(deltaFaturamento) * 100).toFixed(0)}% em relação a ${mesAnterior.mesLabel}. Vale investigar se foi concorrência, preço ou queda de demanda.`;
  }
  return null;
}

const BANDAS_SAZONAIS_PADRAO = [
  { de: "05", ate: "05", label: "Dia das Mães" },
  { de: "06", ate: "06", label: "Dia dos Namorados" },
  { de: "11", ate: "12", label: "Black Friday + Natal" },
  { de: "01", ate: "02", label: "baixa temporada" },
];

function TooltipEvolucao({ active, payload }) {
  const t = useT();
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg p-2.5 text-xs" style={{ background: t.text, color: t.bg, boxShadow: t.shadow }}>
      <p className="font-semibold mb-1">{d.mesLabel}</p>
      <p>Faturamento: {fmtBRL(d.faturamentoBruto)}</p>
      <p>Custos totais: {fmtBRL(d.custosTotais)}</p>
      <p>Lucro líquido: {fmtBRL(d.lucroLiquido)} ({fmtPct(d.margemLiquidaPct)})</p>
      <p>Ticket médio: {fmtBRL(d.ticketMedio)} · {d.atendimentos} atendimentos</p>
    </div>
  );
}

function GraficoEvolucao({ historico, pontoEquilibrio }) {
  const t = useT();
  const [mostrarEsperado, setMostrarEsperado] = useState(true);
  const anosNoHistorico = [...new Set(historico.map((h) => h.mes.slice(0, 4)))];
  const mostrarPE = Number.isFinite(pontoEquilibrio) && pontoEquilibrio > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <p className="text-sm font-semibold" style={{ color: t.text }}>Evolução do lucro e faturamento</p>
        <label className="flex items-center gap-1.5 text-[11px] cursor-pointer" style={{ color: t.textMuted }}>
          <input type="checkbox" checked={mostrarEsperado} onChange={(e) => setMostrarEsperado(e.target.checked)} />
          comparar com o esperado
          <Ajuda texto="O esperado vem da sazonalidade que você configurou na Projeção de Caixa. Aqui a gente compara com o que de fato aconteceu." />
        </label>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={historico} margin={{ left: -10, right: 8 }}>
          <defs>
            <linearGradient id="gradienteFaturamento" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.primary} stopOpacity={0.38} />
              <stop offset="100%" stopColor={t.primary} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
          {anosNoHistorico.flatMap((ano) =>
            BANDAS_SAZONAIS_PADRAO.map((b) => (
              <ReferenceArea key={`${ano}-${b.label}`} x1={`${ano}-${b.de}`} x2={`${ano}-${b.ate}`} fill={t.warningSoft} fillOpacity={0.6} ifOverflow="hidden" />
            ))
          )}
          <XAxis dataKey="mesLabel" tick={{ fontSize: 10, fill: t.textMuted }} />
          <YAxis yAxisId="reais" tick={{ fontSize: 10, fill: t.textMuted }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <YAxis yAxisId="pct" orientation="right" tick={{ fontSize: 10, fill: t.textMuted }} tickFormatter={(v) => `${v}%`} />
          <Tooltip content={<TooltipEvolucao />} />
          {mostrarPE && (
            <ReferenceLine
              yAxisId="reais" y={pontoEquilibrio} stroke={t.danger} strokeDasharray="6 3" strokeWidth={1.5}
              label={{ value: "Ponto de equilíbrio", position: "insideTopLeft", fill: t.danger, fontSize: 10 }}
            />
          )}
          <Area
            yAxisId="reais" type="monotone" dataKey="faturamentoBruto" stroke={t.primary} strokeWidth={2.5}
            fill="url(#gradienteFaturamento)" name="Faturamento" dot={{ r: 3, fill: t.primary, strokeWidth: 0 }}
          />
          <Line yAxisId="pct" type="monotone" dataKey="margemLiquidaPct" stroke={t.success} strokeWidth={2.5} dot={{ r: 3 }} name="Margem líquida %" />
          {mostrarEsperado && (
            <Line yAxisId="pct" type="monotone" dataKey="sazonalidadeEsperadaPct" stroke={t.textMuted} strokeDasharray="4 4" dot={false} strokeWidth={1.5} name="Esperado (sazonalidade)" />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-3 mt-1 text-[10px] flex-wrap" style={{ color: t.textMuted }}>
        <span className="inline-flex items-center gap-1"><span style={{ width: 10, height: 2, background: t.primary, display: "inline-block" }} /> Faturamento</span>
        <span className="inline-flex items-center gap-1"><span style={{ width: 8, height: 8, borderRadius: 999, background: t.success, display: "inline-block" }} /> Margem líquida</span>
        {mostrarPE && <span className="inline-flex items-center gap-1"><span style={{ width: 10, height: 2, background: t.danger, display: "inline-block" }} /> Ponto de equilíbrio</span>}
        <span className="inline-flex items-center gap-1"><span style={{ width: 10, height: 2, background: t.warningSoft, display: "inline-block" }} /> período sazonal típico</span>
      </div>
    </div>
  );
}

// Tendência dos últimos até-3 meses de UM serviço específico, a partir dos mesmos dados
// mensais já usados no ComparativoMensalServicos — nenhum cálculo novo, só uma leitura
// diferente do que já existe. null quando não dá pra falar de tendência de verdade
// (menos de 2 meses no histórico, ou o primeiro ponto da janela é zero).
function calcularTendenciaServico(dadosMensais, nomeServico) {
  const valores = dadosMensais.map((d) => d[nomeServico] ?? 0);
  const janela = valores.slice(-3);
  if (janela.length < 2) return null;
  const primeiro = janela[0];
  const ultimo = janela[janela.length - 1];
  if (primeiro === 0) return null;
  return { variacaoPct: ((ultimo - primeiro) / Math.abs(primeiro)) * 100, meses: janela.length };
}

// Card de destaque: cruza o #1 do ranking (maior margem acumulada — já é a ordenação que
// computeRankingServicos entrega) com a tendência recente DESSE MESMO serviço. Não inventa
// um "score" novo nem reordena por outro critério — "melhor" aqui continua sendo definido
// por margem total, e a tendência entra como informação complementar na mesma frase.
function DestaqueMelhorServico({ ranking, dadosMensais }) {
  const t = useT();
  if (!ranking.length) return null;
  const melhor = ranking[0];
  const tendencia = calcularTendenciaServico(dadosMensais, melhor.nome);

  let frase;
  let Icone = Sparkles;
  let corIcone = t.primaryText;
  const base = `${melhor.nome} é o serviço com maior margem de contribuição no período (${fmtBRL(melhor.margemContribuicaoTotal)})`;

  if (!tendencia) {
    frase = `${base} — ainda não dá pra falar de tendência com esse histórico curto.`;
  } else if (tendencia.variacaoPct > 5) {
    frase = `${base} — e está em alta: subiu ${tendencia.variacaoPct.toFixed(0)}% nos últimos ${tendencia.meses} meses.`;
    Icone = TrendingUp; corIcone = t.successText;
  } else if (tendencia.variacaoPct < -5) {
    frase = `${base} — mas caiu ${Math.abs(tendencia.variacaoPct).toFixed(0)}% nos últimos ${tendencia.meses} meses, vale atenção.`;
    Icone = TrendingDown; corIcone = t.danger;
  } else {
    frase = `${base}, e vem se mantendo estável nos últimos ${tendencia.meses} meses.`;
  }

  return (
    <div className="rounded-xl p-3 flex gap-2 items-start" style={{ background: t.primarySoft }}>
      <Icone size={15} className="mt-0.5 shrink-0" style={{ color: corIcone }} />
      <p className="text-xs" style={{ color: t.text }}>{frase}</p>
    </div>
  );
}

function RankingServicos({ ranking }) {
  const t = useT();
  const top = ranking.slice(0, 8);
  const dados = top.map((r) => ({ nome: r.nome, valor: Math.round(r.margemContribuicaoTotal) }));
  const temEstimativa = top.some((r) => !r.temReceitaReal);
  return (
    <div>
      <p className="text-sm font-semibold mb-2" style={{ color: t.text }}>Ranking de margem por serviço</p>
      <p className="text-[11px] mb-2" style={{ color: t.textMuted }}>Margem de contribuição total gerada no período — não é só volume, é o que cada serviço realmente deixou de lucro.</p>
      <ResponsiveContainer width="100%" height={Math.max(140, dados.length * 34)}>
        <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={t.border} horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => fmtBRL(v)} tick={{ fontSize: 10, fill: t.textMuted }} />
          <YAxis type="category" dataKey="nome" width={90} tick={{ fontSize: 11, fill: t.text }} />
          <Tooltip formatter={(v) => fmtBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8, background: t.surface, border: `1px solid ${t.border}`, color: t.text }} />
          <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
            {dados.map((d, i) => <Cell key={i} fill={d.valor >= 0 ? t.success : t.danger} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {temEstimativa && (
        <p className="text-[10px] mt-1" style={{ color: t.textMuted }}>
          Serviços sem "valor ganho — real" informado em nenhum fechamento entram aqui estimados pelo preço salvo, não pelo que de fato foi cobrado.
        </p>
      )}
    </div>
  );
}

// Paleta reaproveitando tokens já existentes no design system — nenhuma cor nova, só
// rotaciona entre os tons semânticos que o app já usa em outros lugares (badges, botões).
const PALETA_LINHAS_SERVICO = (t) => [t.primary, t.success, t.warning, t.danger, t.secondary];

function ComparativoMensalServicos({ dados, servicosNomes }) {
  const t = useT();
  const paleta = PALETA_LINHAS_SERVICO(t);
  if (servicosNomes.length === 0 || dados.length < 2) {
    return (
      <div className="rounded-xl p-3" style={{ background: t.surfaceAlt }}>
        <p className="text-xs" style={{ color: t.textMuted }}>
          O recorte mensal por serviço aparece aqui a partir de 2 meses com detalhamento por serviço preenchido.
        </p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-sm font-semibold mb-2" style={{ color: t.text }}>Comparação entre serviços — mês a mês</p>
      <p className="text-[11px] mb-2" style={{ color: t.textMuted }}>Margem de contribuição por serviço em cada mês (top 5) — mostra não só quem lucra mais, mas se está subindo ou caindo.</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={dados} margin={{ left: -10, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
          <XAxis dataKey="mesLabel" tick={{ fontSize: 10, fill: t.textMuted }} />
          <YAxis tick={{ fontSize: 10, fill: t.textMuted }} tickFormatter={(v) => fmtBRL(v)} />
          <Tooltip
            formatter={(v) => fmtBRL(v)}
            contentStyle={{ fontSize: 12, borderRadius: 8, background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
          />
          {servicosNomes.map((nome, i) => (
            <Line key={nome} type="monotone" dataKey={nome} stroke={paleta[i % paleta.length]} strokeWidth={2.2} dot={{ r: 2.5 }} name={nome} />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-3 mt-1 text-[10px] flex-wrap" style={{ color: t.textMuted }}>
        {servicosNomes.map((nome, i) => (
          <span key={nome} className="inline-flex items-center gap-1">
            <span style={{ width: 10, height: 2, background: paleta[i % paleta.length], display: "inline-block" }} /> {nome}
          </span>
        ))}
      </div>
    </div>
  );
}

function OcupacaoXLucro({ ranking }) {
  const t = useT();
  const apenasServicos = ranking.filter((r) => r.tipo !== "produto");
  const dados = apenasServicos.map((r) => ({ nome: r.nome, x: Math.round(r.horasTotaisOcupadas), y: Number(r.lucroPorHoraCadeira.toFixed(2)) }));
  if (apenasServicos.length === 0) return null;
  return (
    <div>
      <p className="text-sm font-semibold mb-2" style={{ color: t.text }}>Ocupação de cadeira × lucro por hora</p>
      <p className="text-[11px] mb-2" style={{ color: t.textMuted }}>Cada ponto é um serviço. Mais pra direita = ocupa mais tempo de cadeira; mais pra cima = mais lucro por hora ocupada.</p>
      <ResponsiveContainer width="100%" height={220}>
        <ScatterChart margin={{ left: -10, right: 16, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
          <XAxis type="number" dataKey="x" name="Horas ocupadas" unit="h" tick={{ fontSize: 10, fill: t.textMuted }} />
          <YAxis type="number" dataKey="y" name="Lucro/hora" tickFormatter={(v) => fmtBRL(v)} tick={{ fontSize: 10, fill: t.textMuted }} />
          <ZAxis range={[80, 80]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            formatter={(v, nome) => (nome === "Lucro/hora" ? fmtBRL(v) : `${v}h`)}
            contentStyle={{ fontSize: 12, borderRadius: 8, background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
          />
          <Scatter data={dados} fill={t.primary}>
            {dados.map((d, i) => <Cell key={i} fill={d.y >= 0 ? t.primary : t.danger} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function EvolucaoComparativos({ nd, servicos, fechamentos, sazonalidade, pontoEquilibrio }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);

  const cardStyle = { background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow };

  // useMemo precisa rodar em toda renderização, na mesma ordem — por isso vem ANTES do
  // "return" condicional de carregamento, com fallback pra lista vazia enquanto fechamentos===null.
  // (Bug real que existiu aqui antes: os useMemo ficavam depois do early-return, o que quebra
  // as Rules of Hooks do React assim que os dados terminam de carregar — "Rendered more hooks
  // than during the previous render". Corrigido nesta revisão.)
  const historico = useMemo(() => computeHistoricoMensal(fechamentos || [], sazonalidade), [fechamentos, sazonalidade]);
  const ranking = useMemo(() => computeRankingServicos(fechamentos || [], servicos, nd), [fechamentos, servicos, nd]);
  const comparativoMensal = useMemo(() => computeComparativoMensalServicos(fechamentos || [], servicos, nd), [fechamentos, servicos, nd]);

  if (fechamentos === null) {
    return <div className="rounded-2xl p-4 no-print" style={cardStyle}><SkeletonBlock h={20} w="60%" /></div>;
  }

  const anomalia = historico.length >= 2 ? detectarAnomalia(historico[historico.length - 1], historico[historico.length - 2]) : null;
  const temBreakdown = historico.some((h) => h.temBreakdownServico);
  const temExemplo = fechamentos.some((f) => f.exemplo);

  return (
    <div className="rounded-2xl p-4 no-print" style={cardStyle}>
      <button onClick={() => setAberto((v) => !v)} className="btn-press touch-target flex items-center justify-between w-full" aria-expanded={aberto}>
        <span className="text-sm font-semibold inline-flex items-center gap-1.5" style={{ color: t.text }}>
          <TrendingUp size={14} style={{ color: t.primaryText }} /> Evolução e comparativos
        </span>
        <ChevronDown size={15} style={{ color: t.textMuted, transform: aberto ? "rotate(180deg)" : "none", transition: "transform .2s ease" }} />
      </button>

      {aberto && (
        <div className="pop-in mt-3 space-y-5">
          {historico.length < 2 ? (
            <div className="rounded-xl p-4 text-center" style={{ background: t.surfaceAlt, border: `1px dashed ${t.border}` }}>
              <p className="text-sm" style={{ color: t.text }}>Ainda não tem dado suficiente pra esse gráfico.</p>
              <p className="text-xs mt-1" style={{ color: t.textMuted }}>
                Registre o fechamento de pelo menos 2 meses (na seção "Fechamento mensal" acima) pra começar a ver a evolução.
                {historico.length === 1 && " Você já tem 1 — falta mais 1."}
              </p>
            </div>
          ) : (
            <>
              {temExemplo && (
                <div className="rounded-xl p-3 flex gap-2 items-start" style={{ background: t.surfaceAlt, border: `1px dashed ${t.border}` }}>
                  <Info size={15} className="mt-0.5 shrink-0" style={{ color: t.textMuted }} />
                  <p className="text-xs" style={{ color: t.textMuted }}>
                    Este gráfico inclui mês(es) de exemplo (não reais) — dá pra apagar em "Fechamento mensal" → "Meses anteriores" antes de mostrar dado real pra alguém.
                  </p>
                </div>
              )}

              {anomalia && (
                <div className="rounded-xl p-3 flex gap-2 items-start" style={{ background: t.warningSoft }}>
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: t.warningText }} />
                  <p className="text-xs" style={{ color: t.text }}>{anomalia}</p>
                </div>
              )}

              <GraficoEvolucao historico={historico} pontoEquilibrio={pontoEquilibrio} />

              {temBreakdown ? (
                <>
                  <div style={{ borderTop: `1px solid ${t.border}` }} />
                  <DestaqueMelhorServico ranking={ranking} dadosMensais={comparativoMensal.dados} />
                  <RankingServicos ranking={ranking} />
                  <ComparativoMensalServicos dados={comparativoMensal.dados} servicosNomes={comparativoMensal.servicosNomes} />
                  <OcupacaoXLucro ranking={ranking} />
                </>
              ) : (
                <div className="rounded-xl p-3" style={{ background: t.surfaceAlt }}>
                  <p className="text-xs" style={{ color: t.textMuted }}>
                    O ranking por serviço e o gráfico de ocupação × lucro aparecem aqui quando você preencher o
                    "detalhamento por serviço" no Fechamento Mensal de pelo menos um mês.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ProjecaoCaixa({ dre, sazonalidade, onChange, fechamentos }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [mostrarComoCalcular, setMostrarComoCalcular] = useState(false);

  const fechamentosOrdenados = [...(fechamentos || [])].sort((a, b) => a.mes.localeCompare(b.mes));
  // Começa no mês mais antigo com fechamento real salvo (em vez de sempre Jan fixo) — se não
  // houver nenhum ainda, começa no mês atual. É por isso que, com Jun/26 carregado, a janela
  // passa a abrir em Jun/26 em vez de Jan/26.
  const chaveInicio = fechamentosOrdenados.length > 0 ? fechamentosOrdenados[0].mes : chaveMes(new Date());
  const janela = janelaDeMeses(chaveInicio, 12);
  const fechamentosPorMes = Object.fromEntries((fechamentos || []).map((f) => [f.mes, f]));

  // Conexão em tempo real com o Fechamento Mensal: mês com fechamento salvo usa o valor
  // REAL registrado; mês sem fechamento continua projetando a partir do DRE atual ×
  // sazonalidade, exatamente como antes.
  const dados = janela.map((chave) => {
    const mesIndex = Number(chave.split("-")[1]) - 1;
    const real = fechamentosPorMes[chave];
    if (real) {
      return { mes: labelMes(chave), Receita: Math.round(real.faturamentoBruto), Resultado: Math.round(real.lucroLiquidoCalculado), real: true };
    }
    const mult = N(sazonalidade[mesIndex]) / 100;
    const receita = dre.receitaBruta * mult;
    const variavelProp = dre.receitaBruta > 0 ? dre.custosVariaveisTotais / dre.receitaBruta : 0;
    const impostoProp = dre.receitaBruta > 0 ? dre.impostos / dre.receitaBruta : 0;
    const custosVar = receita * variavelProp;
    const impostos = receita * impostoProp;
    const resultado = receita - impostos - custosVar - dre.custosFixos + dre.aluguelRecebido;
    return { mes: labelMes(chave), Receita: Math.round(receita), Resultado: Math.round(resultado), real: false };
  });

  const updateMes = (i, v) => {
    const novo = [...sazonalidade];
    novo[i] = v;
    onChange(novo);
  };

  const totalFechamentos = (fechamentos || []).length;
  const temHistoricoSuficiente = totalFechamentos >= 12;
  const calcularAutomatico = () => {
    const auto = calcularSazonalidadeAutomatica(fechamentos);
    if (!auto) return;
    onChange(sazonalidade.map((atual, i) => (auto[i] != null ? auto[i] : atual)));
  };

  const PontoComReal = (cor) => (props) => {
    const { cx, cy, payload } = props;
    return payload.real
      ? <circle cx={cx} cy={cy} r={4} fill={cor} stroke={t.surface} strokeWidth={1.5} />
      : <circle cx={cx} cy={cy} r={2.5} fill="none" stroke={cor} strokeWidth={1.5} />;
  };

  return (
    <div className="rounded-2xl p-5" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-semibold" style={{ color: t.text }}>Fluxo de caixa projetado (12 meses)</p>
        <button onClick={() => setAberto(!aberto)} className="btn-press text-xs font-medium" style={{ color: t.primaryText }}>
          {aberto ? "ocultar sazonalidade" : "ajustar sazonalidade"}
        </button>
      </div>
      <p className="text-[11px] mt-1 mb-3" style={{ color: t.textMuted }}>
        Mês com Fechamento Mensal salvo mostra o valor real (ponto cheio no gráfico); os demais projetam a partir
        do DRE atual × sazonalidade (ponto vazado). Sazonalidade é uma estimativa sua, não um dado de mercado.
      </p>

      {aberto && (
        <div className="pop-in mb-4">
          <button onClick={() => setMostrarComoCalcular((v) => !v)} className="text-[11px] font-medium underline btn-press mb-2 block" style={{ color: t.primaryText }}>
            {mostrarComoCalcular ? "ocultar como calcular esse percentual" : "como calcular esse percentual"}
          </button>
          {mostrarComoCalcular && (
            <div className="rounded-lg p-3 mb-3 text-[11px] space-y-1.5" style={{ background: t.surfaceAlt, color: t.textMuted }}>
              <p><strong style={{ color: t.text }}>1.</strong> Pegue o faturamento real de cada mês que você tiver (Fechamento Mensal, extrato, caderno — qualquer fonte que já exista).</p>
              <p><strong style={{ color: t.text }}>2.</strong> Calcule a média mensal desse período.</p>
              <p><strong style={{ color: t.text }}>3.</strong> Para cada mês: (faturamento daquele mês ÷ média) × 100.</p>
              <p className="pt-1" style={{ color: t.text }}>Exemplo: média de R$ 8.000/mês, dezembro fica em R$ 10.400 → dezembro = 130%. Fevereiro fica em R$ 5.600 → fevereiro = 70%.</p>
            </div>
          )}

          {temHistoricoSuficiente ? (
            <button onClick={calcularAutomatico} className="btn-press w-full rounded-lg px-3 py-2 text-xs font-semibold mb-3 inline-flex items-center justify-center gap-1.5" style={{ background: t.primarySoft, color: t.primaryText }}>
              <Sparkles size={13} /> Calcular automaticamente a partir do meu histórico real ({totalFechamentos} meses)
            </button>
          ) : (
            <p className="text-[11px] mb-3" style={{ color: t.textMuted }}>
              Com 12 ou mais meses de Fechamento Mensal salvos, o app aplica essa mesma conta sozinho a partir do
              seu histórico real. Você tem {totalFechamentos} até agora.
            </p>
          )}

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {MESES.map((mes, i) => (
              <label key={mes} className="block">
                <span className="text-[10px]" style={{ color: t.textMuted }}>{mes}</span>
                <input className={CAMPO + " font-num text-xs py-1"} style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text }}
                  type="number" min="0" value={sazonalidade[i]} onChange={(e) => updateMes(i, e.target.value)} />
              </label>
            ))}
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={dados} margin={{ left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 11, fill: t.textMuted }} />
          <YAxis tickFormatter={(v) => `R$${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: t.textMuted }} />
          <Tooltip formatter={(v) => fmtBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8, background: t.surface, border: `1px solid ${t.border}`, color: t.text }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="Receita" stroke={t.secondary} strokeWidth={2} dot={PontoComReal(t.secondary)} />
          <Line type="monotone" dataKey="Resultado" stroke={t.success} strokeWidth={2} dot={PontoComReal(t.success)} />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <Selo tipo="calculado">projeção com sazonalidade estimada por você</Selo>
        {dados.some((d) => d.real) && <Selo tipo="real">inclui meses reais do Fechamento Mensal</Selo>}
      </div>
    </div>
  );
}

/* ======================================================================= */
/* Aba: Observatório                                                       */
/* ======================================================================= */
/* ======================================================================= */
/* Observatório (Bloco 6): mapa da concorrência, preços anotados pelo       */
/* próprio usuário e comparação com os preços dele. Nada aqui é estimado:  */
/* os concorrentes, as posições e os preços são os que o usuário informou, */
/* sempre com data. Tudo fica no aparelho (chaves "observatorio:*").       */
/* ======================================================================= */
const MapaConcorrencia = React.lazy(() => import("./MapaConcorrencia.jsx"));

/* Centro inicial do mapa em cada cidade (só posiciona a vista; não é dado  */
/* exibido). Coordenadas das páginas da Wikipédia de cada município,       */
/* consultadas em 10/10/2026. Irará entra como cidade de testes do app.    */
const CIDADES_OBSERVATORIO = [
  { id: "Feira de Santana", centro: [-12.2667, -38.9667], zoom: 13 },
  { id: "Irará", centro: [-12.0458, -38.7658], zoom: 15 },
  { id: "Salvador", centro: [-12.9711, -38.5108], zoom: 12 },
];
const TIPOS_CONCORRENTE = ["Salão", "Barbearia", "Outro"];
const RAIOS_KM = [null, 1, 3, 5];

const pad2 = (n) => String(n).padStart(2, "0");
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const fmtDataBR = (iso) => (iso ? new Date(iso + "T12:00:00").toLocaleDateString("pt-BR") : "");

const fmtKm = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`);

function lerJSON(texto, padrao) {
  try { const v = JSON.parse(texto); return v ?? padrao; } catch { return padrao; }
}

/* Planilha do Observatório (Bloco 10): concorrentes, preços anotados e a     */
/* comparação, em abas próprias. Usada pelo botão do Observatório e pelo     */
/* relatório completo do Painel. As linhas vêm de linhasPlanilhaObservatorio */
/* (calculos.js, testada), com as mesmas regras da tela.                     */
async function lerDadosObservatorio() {
  const [c, l] = await Promise.all([lerComFallback("observatorio:concorrentes"), lerComFallback("observatorio:meus-locais")]);
  const concorrentes = lerJSON(c, []);
  const meusLocais = lerJSON(l, {});
  return { concorrentes: Array.isArray(concorrentes) ? concorrentes : [], meusLocais: meusLocais && typeof meusLocais === "object" ? meusLocais : {} };
}
function anexarAbasObservatorio(wb, linhas) {
  const abas = [
    ["concorrentes", "Concorrentes", [18, 30, 11, 18, 14, 10, 11, 11]],
    ["precos", "Preços anotados", [18, 30, 24, 12, 11, 12, 20, 12]],
    ["comparacao", "Comparação de preços", [18, 24, 13, 15, 12, 11, 12, 11, 14, 22, 14]],
  ];
  abas.forEach(([chave, nome, larguras]) => {
    const ws = XLSX.utils.aoa_to_sheet(linhas[chave]);
    ws["!cols"] = larguras.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, nome);
  });
}

function BotaoSegmento({ ativo, onClick, children, ...rest }) {
  const t = useT();
  return (
    <button type="button" onClick={onClick} {...rest}
      className="btn-press rounded-md px-2.5 py-1.5 text-xs font-medium leading-snug"
      style={{ background: ativo ? t.surface : "transparent", color: ativo ? t.text : t.textMuted, boxShadow: ativo ? t.shadow : "none", border: `1px solid ${ativo ? t.border : "transparent"}`, transition: "background .18s ease, color .18s ease" }}>
      {children}
    </button>
  );
}

/* Faixa de preços de um serviço: cada ponto é um concorrente; o losango é  */
/* o preço do usuário; o traço tracejado, o piso dele (sem lucro).          */
function FaixaPrecos({ seu, piso, observacoes, med }) {
  const t = useT();
  const valores = [...observacoes.map((o) => o.valor), seu, ...(piso ? [piso] : [])];
  const lo = Math.min(...valores);
  const hi = Math.max(...valores);
  const folga = (hi - lo) * 0.08 || hi * 0.1 || 1;
  const a = lo - folga;
  const b = hi + folga;
  const frac = (v) => ((v - a) / (b - a)) * 100;
  const pos = (v) => `${frac(v)}%`;
  const min = Math.min(...observacoes.map((o) => o.valor));
  const max = Math.max(...observacoes.map((o) => o.valor));
  // Rótulo embaixo do ponto, sem sair da faixa nas pontas.
  const rotulo = (v) => {
    const f = frac(v);
    return { left: `${f}%`, transform: f < 12 ? "translateX(0)" : f > 88 ? "translateX(-100%)" : "translateX(-50%)" };
  };
  return (
    <div className="mt-3 max-w-[42rem]" aria-hidden="true">
      <div className="relative h-10">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full" style={{ background: t.border }} />
        <div className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full"
          style={{ left: pos(min), width: `calc(${pos(max)} - ${pos(min)})`, background: t.secondarySoft, transition: "left .4s ease, width .4s ease" }} />
        {piso && (
          <div className="absolute top-1 bottom-1" title={`Seu piso: ${fmtBRL(piso)}`}
            style={{ left: pos(piso), borderLeft: `2px dashed ${t.danger}`, transition: "left .4s ease" }} />
        )}
        <div className="absolute top-1.5 bottom-1.5 w-0.5 rounded" title={`Mediana: ${fmtBRL(med)}`}
          style={{ left: pos(med), background: t.secondaryText, transition: "left .4s ease" }} />
        {observacoes.map((o, i) => (
          <div key={o.concorrente.id + i} className="absolute top-1/2 rounded-full pop-in" title={`${o.concorrente.nome}: ${fmtBRL(o.valor)}`}
            style={{ left: pos(o.valor), width: 10, height: 10, transform: "translate(-50%, -50%)", background: t.secondary, border: `2px solid ${t.surface}`, transition: "left .4s ease" }} />
        ))}
        <div className="absolute top-1/2 pop-in" title={`Seu preço: ${fmtBRL(seu)}`}
          style={{ left: pos(seu), width: 14, height: 14, transform: "translate(-50%, -50%) rotate(45deg)", background: t.warning, border: `2px solid ${t.text}`, borderRadius: 3, transition: "left .4s ease" }} />
      </div>
      <div className="relative h-4 text-[10px] font-num" style={{ color: t.textMuted }}>
        <span className="absolute whitespace-nowrap" style={{ ...rotulo(min), transition: "left .4s ease" }}>{fmtBRL(min)}</span>
        {max !== min && <span className="absolute whitespace-nowrap" style={{ ...rotulo(max), transition: "left .4s ease" }}>{fmtBRL(max)}</span>}
      </div>
    </div>
  );
}

function LegendaPonto({ cor, forma = "circulo", borda, children }) {
  const t = useT();
  const estilo = forma === "losango"
    ? { width: 10, height: 10, background: cor, border: `2px solid ${t.text}`, borderRadius: 2, transform: "rotate(45deg)" }
    : forma === "traco"
      ? { width: 0, height: 12, borderLeft: `2px dashed ${cor}` }
      : { width: 10, height: 10, background: cor, borderRadius: 999, border: `2px solid ${borda || t.surface}` };
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: t.textMuted }}>
      <span aria-hidden="true" style={{ display: "inline-block", flexShrink: 0, ...estilo }} />
      {children}
    </span>
  );
}

/* Comparação de um serviço do usuário com os preços anotados. */
function ComparacaoServico({ s, seu, piso, observacoes }) {
  const t = useT();
  const { chave, texto, difPct, med, min, max } = posicaoNaConcorrencia(seu, observacoes.map((o) => o.valor));
  const antigos = observacoes.filter((o) => diasDesde(o.data) > DIAS_PRECO_ANTIGO).length;
  const cores = chave === "mediana" ? { cor: t.successText, bg: t.successSoft }
    : chave.endsWith("todos") ? { cor: t.warningText, bg: t.warningSoft }
    : { cor: t.secondaryText, bg: t.secondarySoft };
  const posicao = { texto, ...cores };
  const plural = observacoes.length === 1 ? "concorrente" : "concorrentes";
  return (
    <div className="fade-up rounded-xl p-3" style={{ background: t.surfaceAlt }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold min-w-0" style={{ color: t.text }}>{s.nome}</p>
        <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: posicao.bg, color: posicao.cor }}>{posicao.texto}</span>
      </div>
      <p className="text-xs mt-1" style={{ color: t.textMuted }}>
        Seu preço, <b className="font-num" style={{ color: t.text }}>{fmtBRL(seu)}</b>
        {Math.abs(difPct) >= 2.5 && <>, está {fmtPct(Math.abs(difPct), 0)} {difPct < 0 ? "abaixo" : "acima"} da mediana</>}
        {" "}de {observacoes.length} {plural}: <b className="font-num" style={{ color: t.text }}>{fmtBRL(med)}</b>
        {observacoes.length > 1 && <> (de {fmtBRL(min)} a {fmtBRL(max)})</>}.
        {piso && <> Seu piso, sem lucro, é <b className="font-num" style={{ color: t.text }}>{fmtBRL(piso)}</b>.</>}
      </p>
      <FaixaPrecos seu={seu} piso={piso} observacoes={observacoes} med={med} />
      {piso && med < piso && (
        <p className="text-[11px] mt-2 flex items-start gap-1" style={{ color: t.danger }}>
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <span>
            A mediana da concorrência ({fmtBRL(med)}) fica abaixo do seu piso ({fmtBRL(piso)}), o preço que só cobre os
            seus custos. Baixar até ela daria prejuízo: revise custos e tempo do serviço ou mostre o que o seu tem de diferente.
          </span>
        </p>
      )}
      {piso && seu < piso && med >= piso && (
        <p className="text-[11px] mt-2 flex items-start gap-1" style={{ color: t.danger }}>
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <span>Seu preço está abaixo do seu piso ({fmtBRL(piso)}): cada atendimento dá prejuízo.</span>
        </p>
      )}
      {(observacoes.length < 3 || antigos > 0) && (
        <p className="text-[11px] mt-2" style={{ color: t.textMuted }}>
          {observacoes.length < 3 && "Poucas observações: use a comparação só como indicativo. "}
          {antigos > 0 && `${antigos} preço${antigos > 1 ? "s" : ""} anotado${antigos > 1 ? "s" : ""} há mais de 6 meses: vale conferir de novo.`}
        </p>
      )}
    </div>
  );
}

/* Formulário de um concorrente (novo ou edição). */
function FormularioConcorrente({ rascunho, setRascunho, onSalvar, onCancelar }) {
  const t = useT();
  const campoStyle = { background: t.surface, border: `1px solid ${t.border}`, color: t.text };
  const valido = (rascunho.nome || "").trim().length > 0;
  return (
    <div className="pop-in rounded-xl p-3 space-y-2.5" style={{ background: t.primarySoft }}>
      <p className="text-xs font-semibold" style={{ color: t.primaryText }}>
        {rascunho.id ? "Editar concorrente" : rascunho.lat != null ? "Novo concorrente no ponto marcado" : "Novo concorrente (sem posição no mapa)"}
      </p>
      <Campo label="Nome">
        <input className={CAMPO} style={campoStyle} value={rascunho.nome || ""} placeholder="ex.: Barbearia do Zé" autoFocus
          onChange={(e) => setRascunho({ ...rascunho, nome: e.target.value })} />
      </Campo>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Tipo">
          <select className={CAMPO} style={campoStyle} value={rascunho.tipo || "Salão"} onChange={(e) => setRascunho({ ...rascunho, tipo: e.target.value })}>
            {TIPOS_CONCORRENTE.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
          </select>
        </Campo>
        <Campo label="Bairro (opcional)">
          <input className={CAMPO + " min-w-0"} style={campoStyle} value={rascunho.bairro || ""}
            onChange={(e) => setRascunho({ ...rascunho, bairro: e.target.value })} />
        </Campo>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={onSalvar} disabled={!valido}
          className="btn-press touch-target rounded-lg px-3 py-2 text-xs font-semibold"
          style={{ background: valido ? t.primaryText : t.border, color: valido ? t.onPrimary : t.textMuted, cursor: valido ? "pointer" : "not-allowed" }}>
          Salvar concorrente
        </button>
        <button type="button" onClick={onCancelar} className="btn-press touch-target rounded-lg px-3 py-2 text-xs font-medium" style={{ color: t.textMuted }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* Formulário para anotar um preço visto num concorrente. */
function FormularioPreco({ servicos, onSalvar, onCancelar }) {
  const t = useT();
  const campoStyle = { background: t.surface, border: `1px solid ${t.border}`, color: t.text };
  const [servicoId, setServicoId] = useState(servicos[0]?.id || "outro");
  const [servicoNome, setServicoNome] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hojeISO());
  const [fonte, setFonte] = useState("local");
  const nomeFinal = servicoId === "outro" ? servicoNome.trim() : servicos.find((s) => s.id === servicoId)?.nome || "";
  const dataValida = data && data <= hojeISO();
  const valido = N(valor) > 0 && nomeFinal && dataValida;
  return (
    <div className="pop-in rounded-xl p-3 space-y-2.5 mt-2" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
      <Campo label="Serviço" hint={servicoId !== "outro" ? "Ligado ao seu serviço de mesmo nome: entra na comparação." : "Sem ligação com um serviço seu: fica anotado, mas não entra na comparação."}>
        <select className={CAMPO} style={campoStyle} value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
          {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          <option value="outro">Outro serviço…</option>
        </select>
      </Campo>
      {servicoId === "outro" && (
        <Campo label="Nome do serviço">
          <input className={CAMPO} style={campoStyle} value={servicoNome} onChange={(e) => setServicoNome(e.target.value)} />
        </Campo>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Preço cobrado">
          <CampoMoeda value={valor} onChange={setValor} />
        </Campo>
        <Campo label="Quando você viu">
          <input type="date" className={CAMPO + " min-w-0"} style={campoStyle} value={data} max={hojeISO()} onChange={(e) => setData(e.target.value)} />
        </Campo>
      </div>
      <Campo label="Onde você viu">
        <select className={CAMPO} style={campoStyle} value={fonte} onChange={(e) => setFonte(e.target.value)}>
          {FONTES_PRECO.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </Campo>
      {!dataValida && <p className="text-[11px]" style={{ color: t.danger }}>A data não pode ser no futuro.</p>}
      <div className="flex gap-2 flex-wrap">
        <button type="button" disabled={!valido}
          onClick={() => onSalvar({ id: uid(), servicoId: servicoId === "outro" ? null : servicoId, servicoNome: nomeFinal, valor: N(valor), data, fonte })}
          className="btn-press touch-target rounded-lg px-3 py-2 text-xs font-semibold"
          style={{ background: valido ? t.primaryText : t.border, color: valido ? t.onPrimary : t.textMuted, cursor: valido ? "pointer" : "not-allowed" }}>
          Salvar preço
        </button>
        <button type="button" onClick={onCancelar} className="btn-press touch-target rounded-lg px-3 py-2 text-xs font-medium" style={{ color: t.textMuted }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* Um concorrente anotado, com os preços dele. */
function ItemConcorrente({ c, distancia, servicos, selecionado, onSelecionar, onAtualizar, onExcluir, onEditar, onMover }) {
  const t = useT();
  const [anotando, setAnotando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (selecionado) ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selecionado]);
  const precos = [...(c.precos || [])].sort((a, b) => (a.data < b.data ? 1 : -1));
  const corTipo = c.tipo === "Salão" ? { bg: t.successSoft, fg: t.successText } : c.tipo === "Barbearia" ? { bg: t.primarySoft, fg: t.primaryText } : { bg: t.secondarySoft, fg: t.secondaryText };
  return (
    <div ref={ref} className="fade-up rounded-xl p-3" style={{ background: t.surfaceAlt, border: `1px solid ${selecionado ? t.primaryText : "transparent"}`, transition: "border-color .2s ease" }}>
      <button type="button" onClick={onSelecionar} className="btn-press w-full text-left" aria-expanded={selecionado}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold min-w-0" style={{ color: t.text }}>{c.nome}</p>
          <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: corTipo.bg, color: corTipo.fg }}>{c.tipo}</span>
        </div>
        <p className="text-[11px] mt-0.5" style={{ color: t.textMuted }}>
          {[c.bairro, distancia != null ? `${fmtKm(distancia)} do seu negócio` : null, c.lat == null ? "sem posição no mapa" : null].filter(Boolean).join(" · ") || "sem bairro informado"}
          {" · "}{precos.length} preço{precos.length === 1 ? "" : "s"} anotado{precos.length === 1 ? "" : "s"}
        </p>
      </button>
      {selecionado && (
        <div className="pop-in mt-2 space-y-2">
          {precos.length > 0 && (
            <ul className="space-y-1">
              {precos.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-xs rounded-lg px-2 py-1.5" style={{ background: t.surface }}>
                  <span className="min-w-0" style={{ color: t.text }}>
                    {p.servicoNome}
                    <span className="block text-[10px]" style={{ color: t.textMuted }}>
                      {fmtDataBR(p.data)} · {FONTES_PRECO.find((f) => f.id === p.fonte)?.label || "Outro"}
                      {!p.servicoId || !servicos.some((s) => s.id === p.servicoId) ? " · fora da comparação" : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    <b className="font-num" style={{ color: t.text }}>{fmtBRL(p.valor)}</b>
                    <button type="button" onClick={() => onAtualizar({ ...c, precos: c.precos.filter((x) => x.id !== p.id) })}
                      className="btn-press touch-target" style={{ color: t.danger }} aria-label={`Apagar preço de ${p.servicoNome}`}>
                      <Trash2 size={14} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {anotando ? (
            <FormularioPreco servicos={servicos}
              onCancelar={() => setAnotando(false)}
              onSalvar={(preco) => { onAtualizar({ ...c, precos: [...(c.precos || []), preco] }); setAnotando(false); }} />
          ) : (
            <div className="flex gap-1.5 flex-wrap">
              <button type="button" onClick={() => setAnotando(true)} className="btn-press inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1.5"
                style={{ color: t.primaryText, background: t.primarySoft }}>
                <Plus size={13} /> anotar preço
              </button>
              <button type="button" onClick={onMover} className="btn-press inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1.5"
                style={{ color: t.textMuted, background: t.surface }}>
                <MapPin size={13} /> {c.lat == null ? "marcar no mapa" : "mudar posição"}
              </button>
              <button type="button" onClick={onEditar} className="btn-press inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1.5"
                style={{ color: t.textMuted, background: t.surface }}>
                <Pencil size={13} /> editar
              </button>
              {!confirmando ? (
                <button type="button" onClick={() => setConfirmando(true)} className="btn-press inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1.5"
                  style={{ color: t.danger, background: t.surface }}>
                  <Trash2 size={13} /> excluir
                </button>
              ) : (
                <span className="pop-in inline-flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5" style={{ background: t.dangerSoft, color: t.danger }}>
                  Excluir com os preços?
                  <button type="button" onClick={onExcluir} className="btn-press font-semibold underline">Sim</button>
                  <button type="button" onClick={() => setConfirmando(false)} className="btn-press underline" style={{ color: t.textMuted }}>Não</button>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Observatorio({ servicos, nd, cidadePerfil }) {
  const t = useT();
  const escuro = t.bg === TOKENS.escuro.bg;
  const cidadeInicial = CIDADES_OBSERVATORIO.find((c) => c.id.toLowerCase() === (cidadePerfil || "").trim().toLowerCase())?.id || "Feira de Santana";
  const [cidade, setCidade] = useState(cidadeInicial);
  const [filtro, setFiltro] = useState("Todos");
  const [carregado, setCarregado] = useState(false);
  const [concorrentes, setConcorrentes] = useState([]);
  const [meusLocais, setMeusLocais] = useState({});
  const [raioKm, setRaioKm] = useState(null);
  const [marcando, setMarcando] = useState(null); // { tipo: 'meu-local' } | { tipo: 'novo', base } | { tipo: 'mover', id }
  const [rascunho, setRascunho] = useState(null);
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
  const { show, node: toastNode } = useToast();

  useEffect(() => {
    let vivo = true;
    Promise.all([lerComFallback("observatorio:concorrentes"), lerComFallback("observatorio:meus-locais")]).then(([c, l]) => {
      if (!vivo) return;
      const lista = lerJSON(c, []);
      const locais = lerJSON(l, {});
      setConcorrentes(Array.isArray(lista) ? lista : []);
      setMeusLocais(locais && typeof locais === "object" ? locais : {});
      setCarregado(true);
    });
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { vivo = false; window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const salvarConcorrentes = (lista) => { setConcorrentes(lista); salvarComFallback("observatorio:concorrentes", JSON.stringify(lista)); };
  const salvarMeusLocais = (locais) => { setMeusLocais(locais); salvarComFallback("observatorio:meus-locais", JSON.stringify(locais)); };

  const cfgCidade = CIDADES_OBSERVATORIO.find((c) => c.id === cidade);
  const meuLocal = meusLocais[cidade] || null;
  const raioAtivo = meuLocal ? raioKm : null;

  const daCidade = useMemo(() => concorrentes
    .filter((c) => c.cidade === cidade)
    .map((c) => {
      const distancia = meuLocal && c.lat != null ? distanciaKm(meuLocal, c) : null;
      const foraDoRaio = raioAtivo != null && (distancia == null || distancia > raioAtivo);
      return { ...c, distancia, foraDoRaio };
    })
    .sort((a, b) => (a.distancia ?? Infinity) - (b.distancia ?? Infinity) || a.nome.localeCompare(b.nome)),
  [concorrentes, cidade, meuLocal, raioAtivo]);
  const considerados = daCidade.filter((c) => !c.foraDoRaio);

  const corDoTipo = useCallback((tipo) => (tipo === "Salão" ? t.success : tipo === "Barbearia" ? t.primary : t.secondary), [t]);

  // Comparação: serviços do usuário com preço calculado e pelo menos um preço anotado.
  const comparacoes = useMemo(() => (servicos || []).map((s) => {
    const calc = nd ? calcularParaExibicao(s, nd) : { status: "sem-negocio" };
    if (calc.status !== "ok") return null;
    const observacoes = ultimoPrecoPorConcorrente(considerados, s.id);
    if (observacoes.length === 0) return null;
    return { s, seu: calc.preco, piso: pisoDoServico(s, nd), observacoes };
  }).filter(Boolean).sort((a, b) => a.s.nome.localeCompare(b.s.nome, "pt-BR")), [servicos, nd, considerados]);

  // Planilha só do Observatório, com todas as cidades (Bloco 10).
  const baixarPlanilha = () => {
    const wb = XLSX.utils.book_new();
    const hoje = new Date();
    const sobre = XLSX.utils.aoa_to_sheet([
      ["Observatório de concorrentes — Preço Justo"],
      [`Exportado em ${hoje.toLocaleDateString("pt-BR")}, versão ${VERSAO_APP}.`],
      ["Concorrentes, posições e preços foram anotados por você no app, cada preço com a data e o lugar onde foi visto."],
      ["A comparação usa o preço mais recente de cada concorrente, a mediana e o seu piso (preço com margem zero), como na tela."],
      ["Preços com mais de 6 meses podem ter mudado: confira antes de decidir."],
    ]);
    sobre["!cols"] = [{ wch: 110 }];
    XLSX.utils.book_append_sheet(wb, sobre, "Sobre");
    anexarAbasObservatorio(wb, linhasPlanilhaObservatorio(concorrentes, meusLocais, servicos || [], nd, hoje));
    XLSX.writeFile(wb, `preco-justo-observatorio-${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}.xlsx`);
    show("Planilha baixada.");
  };

  const iniciarMarcacao = (m) => { setMarcando(m); setRascunho(null); };
  const aoMarcar = ({ lat, lng }) => {
    if (!marcando) return;
    if (marcando.tipo === "meu-local") {
      salvarMeusLocais({ ...meusLocais, [cidade]: { lat, lng } });
      show("Seu negócio foi marcado no mapa.");
    } else if (marcando.tipo === "mover") {
      salvarConcorrentes(concorrentes.map((c) => (c.id === marcando.id ? { ...c, lat, lng } : c)));
      show("Posição atualizada.");
    } else {
      setRascunho({ tipo: "Salão", ...(marcando.base || {}), lat, lng });
    }
    setMarcando(null);
  };
  const salvarRascunho = () => {
    const r = { ...rascunho, nome: rascunho.nome.trim(), bairro: (rascunho.bairro || "").trim() };
    if (r.id) {
      salvarConcorrentes(concorrentes.map((c) => (c.id === r.id ? { ...c, nome: r.nome, tipo: r.tipo, bairro: r.bairro } : c)));
      show("Concorrente atualizado.");
    } else {
      const novo = { id: uid(), cidade, nome: r.nome, tipo: r.tipo || "Salão", bairro: r.bairro, lat: r.lat ?? null, lng: r.lng ?? null, precos: [], criadoEm: Date.now() };
      salvarConcorrentes([...concorrentes, novo]);
      setSelecionadoId(novo.id);
      show("Concorrente salvo. Agora anote os preços dele.");
    }
    setRascunho(null);
  };

  // Estabelecimentos da coleta de referência (Google Maps, sem posição exata).
  const referencia = ESTABELECIMENTOS_REAIS.filter((e) => e.cidade === cidade && (filtro === "Todos" || e.tipo === filtro));
  const porBairro = useMemo(() => {
    const map = {};
    ESTABELECIMENTOS_REAIS.filter((e) => e.cidade === cidade).forEach((e) => { map[e.bairro] = (map[e.bairro] || 0) + 1; });
    return Object.entries(map).map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total);
  }, [cidade]);

  const cardStyle = { background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow };
  const textoMarcacao = !marcando ? null
    : marcando.tipo === "meu-local" ? "Toque no mapa onde fica o seu negócio."
    : marcando.tipo === "mover" ? `Toque no novo ponto de ${concorrentes.find((c) => c.id === marcando.id)?.nome || "concorrente"}.`
    : `Toque no mapa onde fica ${marcando.base?.nome || "o concorrente"}.`;

  if (!carregado) {
    return (
      <div className="space-y-4" aria-busy="true">
        <SkeletonBlock h={34} w="70%" />
        <SkeletonBlock h={320} radius={16} />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex gap-1 p-1 rounded-lg w-fit max-w-full flex-wrap" role="radiogroup" aria-label="Cidade" style={{ background: t.surfaceAlt }}>
          {CIDADES_OBSERVATORIO.map((c) => (
            <BotaoSegmento key={c.id} ativo={cidade === c.id} role="radio" aria-checked={cidade === c.id}
              onClick={() => { setCidade(c.id); setMarcando(null); setRascunho(null); setSelecionadoId(null); }}>
              {c.id}
            </BotaoSegmento>
          ))}
        </div>
        <p className="text-xs" style={{ color: t.textMuted }}>
          Marque no mapa o seu negócio e os concorrentes que você conhece, e anote os preços que eles cobram (com a data
          em que você viu). O app compara com os seus preços. Tudo fica salvo só neste aparelho.
        </p>
      </div>

      {/* ---------- Mapa ---------- */}
      <div className="rounded-2xl p-4 space-y-3 min-w-0" style={cardStyle}>
        <div className="flex items-center gap-1.5">
          <MapPin size={15} style={{ color: t.primaryText }} />
          <p className="text-sm font-semibold" style={{ color: t.text }}>
            Mapa da concorrência
            <Ajuda faq="preco-concorrencia" texto="Toque em um botão abaixo e depois no ponto do mapa. Os círculos coloridos são os concorrentes que você marcou; o círculo amarelo é o seu negócio. Com o seu negócio marcado, dá para olhar só quem está perto." />
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => iniciarMarcacao({ tipo: "meu-local" })}
            className="btn-press touch-target inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
            style={{ background: t.warningSoft, color: t.warningText }}>
            <MapPin size={14} /> {meuLocal ? "Mudar meu negócio" : "Marcar meu negócio"}
          </button>
          <button type="button" onClick={() => iniciarMarcacao({ tipo: "novo" })}
            className="btn-press touch-target inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
            style={{ background: t.primaryText, color: t.onPrimary }}>
            <Plus size={14} /> Adicionar concorrente
          </button>
        </div>
        {textoMarcacao && (
          <div className="pop-in flex items-center justify-between gap-2 rounded-xl p-2.5 text-xs" role="status" style={{ background: t.primarySoft, color: t.primaryText }}>
            <span className="font-medium">{textoMarcacao}</span>
            <button type="button" onClick={() => setMarcando(null)} className="btn-press touch-target underline shrink-0">Cancelar</button>
          </div>
        )}
        {!online && (
          <div className="flex gap-2 items-start rounded-xl p-2.5 text-xs" style={{ background: t.warningSoft, color: t.warningText }}>
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>Sem internet, as ruas do mapa não carregam. Seus concorrentes e preços continuam aqui embaixo.</span>
          </div>
        )}
        <div className="h-[320px] sm:h-[400px] rounded-xl overflow-hidden" style={{ outline: marcando ? `2px solid ${t.primaryText}` : "none", outlineOffset: 2, transition: "outline-color .2s ease" }}>
          <React.Suspense fallback={<SkeletonBlock h="100%" radius={12} />}>
            <MapaConcorrencia t={t} escuro={escuro} centro={cfgCidade.centro} zoom={cfgCidade.zoom}
              concorrentes={daCidade} meuLocal={meuLocal} raioKm={raioAtivo} selecionadoId={selecionadoId}
              marcando={!!marcando} onMarcar={aoMarcar} onSelecionar={(id) => setSelecionadoId(id)} corDoTipo={corDoTipo} />
          </React.Suspense>
        </div>
        <div className="flex gap-x-3 gap-y-1 flex-wrap">
          <LegendaPonto cor={t.warning} borda={t.text}>Meu negócio</LegendaPonto>
          <LegendaPonto cor={t.success}>Salão</LegendaPonto>
          <LegendaPonto cor={t.primary}>Barbearia</LegendaPonto>
          <LegendaPonto cor={t.secondary}>Outro</LegendaPonto>
        </div>
        {meuLocal && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-medium" style={{ color: t.textMuted }}>Raio:</span>
            <div className="flex gap-1 p-1 rounded-lg flex-wrap" role="radiogroup" aria-label="Distância do seu negócio" style={{ background: t.surfaceAlt }}>
              {RAIOS_KM.map((r) => (
                <BotaoSegmento key={String(r)} ativo={raioAtivo === r} role="radio" aria-checked={raioAtivo === r} onClick={() => setRaioKm(r)}>
                  {r == null ? "cidade toda" : `${r} km`}
                </BotaoSegmento>
              ))}
            </div>
          </div>
        )}
        {rascunho && (
          <FormularioConcorrente rascunho={rascunho} setRascunho={setRascunho} onSalvar={salvarRascunho} onCancelar={() => setRascunho(null)} />
        )}
        {!rascunho && !marcando && (
          <button type="button" onClick={() => setRascunho({ tipo: "Salão" })} className="btn-press text-[11px] underline underline-offset-2" style={{ color: t.textMuted }}>
            Adicionar concorrente sem marcar no mapa
          </button>
        )}
      </div>

      {/* ---------- Comparação ---------- */}
      <div className="rounded-2xl p-4 space-y-3 min-w-0" style={cardStyle}>
        <div className="flex items-center gap-1.5">
          <TrendingUp size={15} style={{ color: t.primaryText }} />
          <p className="text-sm font-semibold" style={{ color: t.text }}>
            Seus preços × concorrência
            <Ajuda faq="preco-concorrencia" texto="Para cada serviço seu, a mediana é o preço do meio entre os concorrentes anotados: metade cobra menos, metade cobra mais. O seu piso é o preço que só cobre os seus custos, sem lucro." />
          </p>
        </div>
        {raioAtivo != null && (
          <p className="text-[11px]" style={{ color: t.textMuted }}>
            Considerando só concorrentes até {raioAtivo} km do seu negócio ({considerados.length} de {daCidade.length} em {cidade}).
          </p>
        )}
        {comparacoes.length > 0 ? (
          <>
            <div className="flex gap-x-3 gap-y-1 flex-wrap">
              <LegendaPonto cor={t.warning} forma="losango">Seu preço</LegendaPonto>
              <LegendaPonto cor={t.secondary}>Concorrente</LegendaPonto>
              <LegendaPonto cor={t.danger} forma="traco">Seu piso (sem lucro)</LegendaPonto>
            </div>
            <div className="space-y-2">
              {comparacoes.map((cmp) => <ComparacaoServico key={cmp.s.id} {...cmp} />)}
            </div>
          </>
        ) : (
          <div className="rounded-xl p-3 text-xs space-y-1.5" style={{ background: t.surfaceAlt, color: t.textMuted }}>
            <p style={{ color: t.text }} className="font-medium">A comparação aparece quando houver preços anotados.</p>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>Adicione um concorrente (no mapa ou sem marcar).</li>
              <li>Toque nele e em "anotar preço", escolhendo um dos seus serviços.</li>
              {(servicos || []).length === 0 && <li>Antes disso, salve pelo menos um serviço na Calculadora.</li>}
            </ol>
          </div>
        )}
      </div>

      {/* ---------- Concorrentes anotados ---------- */}
      <div className="rounded-2xl p-4 space-y-3 min-w-0" style={cardStyle}>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p className="text-sm font-semibold" style={{ color: t.text }}>
            Concorrentes anotados em {cidade} <span className="font-num font-normal" style={{ color: t.textMuted }}>({daCidade.length})</span>
          </p>
          {concorrentes.length > 0 && (
            <button type="button" onClick={baixarPlanilha}
              className="btn-press touch-target inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
              style={{ background: t.surfaceAlt, color: t.text, border: `1px solid ${t.border}` }}>
              <Download size={13} /> Baixar planilha (Excel)
            </button>
          )}
        </div>
        {daCidade.length === 0 ? (
          <p className="text-xs" style={{ color: t.textMuted }}>Nenhum ainda. Use "Adicionar concorrente" no mapa acima.</p>
        ) : (
          <div className="space-y-2">
            {daCidade.map((c) => (
              <ItemConcorrente key={c.id} c={c} distancia={c.distancia} servicos={servicos || []}
                selecionado={selecionadoId === c.id}
                onSelecionar={() => setSelecionadoId(selecionadoId === c.id ? null : c.id)}
                onAtualizar={(novo) => salvarConcorrentes(concorrentes.map((x) => (x.id === novo.id ? { ...x, precos: novo.precos } : x)))}
                onExcluir={() => { salvarConcorrentes(concorrentes.filter((x) => x.id !== c.id)); setSelecionadoId(null); show("Concorrente excluído."); }}
                onEditar={() => { setMarcando(null); setRascunho({ id: c.id, nome: c.nome, tipo: c.tipo, bairro: c.bairro }); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                onMover={() => { iniciarMarcacao({ tipo: "mover", id: c.id }); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
            ))}
          </div>
        )}
      </div>

      {/* ---------- Coleta de referência ---------- */}
      <div className="rounded-2xl p-4 space-y-3 min-w-0" style={cardStyle}>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p className="text-sm font-semibold" style={{ color: t.text }}>
            Coleta de referência em {cidade} <span className="font-num font-normal" style={{ color: t.textMuted }}>({referencia.length})</span> <Selo tipo="real" />
          </p>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: t.surfaceAlt }}>
            {["Todos", "Salão", "Barbearia"].map((f) => (
              <BotaoSegmento key={f} ativo={filtro === f} onClick={() => setFiltro(f)}>{f}</BotaoSegmento>
            ))}
          </div>
        </div>
        <div className="flex gap-2 items-start rounded-xl p-3 text-xs" style={{ background: t.surfaceAlt, color: t.textMuted }}>
          <CalendarCheck size={14} className="mt-0.5 shrink-0" />
          <p className="text-xs">
            <strong style={{ color: t.text }}>Retrato de uma coleta única</strong>, feita
            {COLETA_ESTABELECIMENTOS.data
              ? ` em ${new Date(COLETA_ESTABELECIMENTOS.data + "T12:00:00").toLocaleDateString("pt-BR")}`
              : ` até ${COLETA_ESTABELECIMENTOS.limiteComprovado}`}
            {" "}em {COLETA_ESTABELECIMENTOS.fonte}. Tem só nome, bairro e avaliação, sem preço nem endereço exato. Para
            colocar um deles no mapa, toque em "marcar no mapa" e depois no ponto onde ele fica.
          </p>
        </div>
        {porBairro.length > 0 ? (
          <>
            <p className="text-xs font-medium" style={{ color: t.textMuted }}>Estabelecimentos por bairro</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={porBairro} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
                <XAxis dataKey="nome" tick={{ fontSize: 10, fill: t.textMuted }} interval={0} angle={-30} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: t.textMuted }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, background: t.surface, border: `1px solid ${t.border}`, color: t.text }} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {porBairro.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? t.primary : t.secondary} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="grid sm:grid-cols-2 gap-2">
              {referencia.map((e) => {
                const jaAnotado = concorrentes.some((c) => c.cidade === cidade && c.nome.toLowerCase() === e.nome.toLowerCase());
                return (
                  <div key={e.nome} className="fade-up rounded-xl p-3" style={{ background: t.surfaceAlt }}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm" style={{ color: t.text }}>{e.nome}</p>
                      <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: e.tipo === "Salão" ? t.successSoft : t.primarySoft, color: e.tipo === "Salão" ? t.successText : t.primaryText }}>
                        {e.tipo}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: t.textMuted }}>{e.bairro} · <span className="font-num">★ {e.avaliacao} · {e.avaliacoes} avaliações</span></p>
                    {jaAnotado ? (
                      <p className="text-[11px] mt-1.5 inline-flex items-center gap-1" style={{ color: t.successText }}><CheckCircle2 size={12} /> já está nos seus concorrentes</p>
                    ) : (
                      <button type="button"
                        onClick={() => { iniciarMarcacao({ tipo: "novo", base: { nome: e.nome, tipo: e.tipo, bairro: e.bairro } }); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className="btn-press mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: t.primaryText }}>
                        <MapPin size={12} /> marcar no mapa
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-xs" style={{ color: t.textMuted }}>
            A coleta de referência não inclui {cidade}. Marque no mapa os concorrentes que você conhece.
          </p>
        )}
        <div className="flex items-start gap-2 text-[11px] pt-1" style={{ color: t.textMuted }}>
          <Info size={13} className="mt-0.5 shrink-0" />
          <p className="text-[11px]">
            <strong>SINDBEFS</strong> (Feira de Santana) e <strong>SINDBACSS</strong> (Salvador) são as entidades patronais
            da categoria. Não há tabela pública de preços de nenhuma das duas; por isso, os preços daqui são só os que você
            anota.
          </p>
        </div>
        <div className="text-[11px]"><Selo tipo="aguardando">tabela de preços dos sindicatos — aguardando fonte oficial</Selo></div>
      </div>
      {toastNode}
    </div>
  );
}

/* ======================================================================= */
/* Aba: FAQ                                                                */
/* Conteúdo fundamentado em contabilidade gerencial consolidada (custo     */
/* fixo/variável, margem de contribuição, ponto de equilíbrio, alavancagem */
/* operacional) e na legislação vigente do Simples Nacional (LC 123/2006). */
/* Cada resposta é montada em blocos tipados (texto/formula/lista/exemplo) */
/* em vez de markdown cru — mais fácil de manter e de estilizar sem        */
/* depender de parsing de texto em tempo de execução.                      */
/* ======================================================================= */
const FAQ_DADOS = [
  {
    categoria: "Custos e despesas",
    icon: Building2,
    perguntas: [
      {
        id: "custo-fixo-variavel",
        pergunta: "Qual a diferença entre custo fixo e custo variável, e por que isso importa tanto?",
        blocos: [
          { tipo: "texto", texto: `Custo fixo é o que você paga independentemente de atender 5 ou 50 clientes no mês: aluguel, energia da parte fixa (iluminação, ar-condicionado ligado o dia todo), internet, salário fixo da recepcionista, pró-labore. Custo variável é o que só existe porque um atendimento aconteceu: a tinta usada naquela coloração, o descartável, a comissão do profissional sobre aquele serviço específico.` },
          { tipo: "texto", texto: `A separação importa porque muda a pergunta que você consegue responder. Sem ela, você só sabe "gastei X esse mês". Com ela, você sabe: "esse corte específico, depois de pagar o produto e a comissão dele, sobra quanto pra ajudar a pagar meu aluguel?" — essa sobra é a margem de contribuição, e é ela que paga os custos fixos e, só depois, gera lucro.` },
          { tipo: "exemplo", texto: `Se você atende zero clientes em um mês de baixa, o aluguel e a internet continuam vencendo do mesmo jeito — isso é fixo. Já a tinta de coloração só é comprada e usada quando alguém agenda o serviço — isso é variável. Tratar tudo como "gasto do mês" misturado impede saber se um serviço específico está, na prática, dando prejuízo.` },
        ],
      },
      {
        id: "rateio-despesas-fixas",
        pergunta: "Como faço o rateio de despesas fixas (aluguel, energia, água) entre os serviços?",
        blocos: [
          { tipo: "texto", texto: `Rateio é dividir um custo fixo, que não pertence a nenhum serviço específico, entre todos os serviços de forma proporcional a algum critério razoável — geralmente tempo de uso da estrutura (tempo de cadeira) ou número de atendimentos.` },
          { tipo: "texto", texto: `O método mais simples e defensável para um negócio pequeno é: somar todos os custos fixos do mês, dividir pelo total de horas de atendimento disponíveis (ou realizadas) no mês, chegando a um "custo fixo por hora de cadeira". Cada serviço recebe a fatia proporcional ao tempo que ocupa.` },
          { tipo: "exemplo", texto: `Se aluguel + energia + água + internet somam R$ 3.000/mês e o negócio tem capacidade para 300 horas de atendimento no mês, o custo fixo por hora é R$ 10. Uma escova de 40 min carrega R$ 6,67 de custo fixo rateado; uma coloração de 2h30 carrega R$ 25,00. É por isso que o app pede a duração de cada serviço — sem ela, o rateio não tem como ser feito de forma justa.` },
        ],
      },
      {
        id: "consumo-ml-gramas",
        pergunta: "Por que o app pede o consumo de produtos em mililitros ou gramas, em vez de só \"quanto gasto de produto por mês\"?",
        blocos: [
          { tipo: "texto", texto: `Porque "gasto por mês" mistura o consumo de serviços diferentes e não diz o custo real de UM atendimento. O consumo por ml/g permite chegar ao custo variável unitário de cada serviço — o dado que entra direto na fórmula de precificação.` },
          { tipo: "exemplo", texto: `Um pote de coloração de 900 ml custa R$ 45,00, ou seja, R$ 0,05/ml. Uma coloração completa usa, em média, 60 ml de produto — isso é R$ 3,00 de custo de produto para aquele atendimento específico. Só com "gasto R$ 800 de produto por mês" não dá pra saber se esse valor está bem distribuído entre um serviço de R$ 40 e outro de R$ 150.` },
        ],
      },
      {
        id: "depreciacao-equipamentos",
        pergunta: "O que é depreciação de equipamentos, e por que ela entra na conta mesmo eu não \"gastando\" dinheiro todo mês?",
        blocos: [
          { tipo: "texto", texto: `Depreciação é a distribuição do custo de compra de um equipamento (secador, prancha, cadeira, autoclave) ao longo da sua vida útil estimada, transformando um gasto único em uma "parcela mensal" que representa o desgaste do bem em uso.` },
          { tipo: "texto", texto: `Ela entra na conta porque, mesmo não sendo saída de caixa todo mês, é um custo real: o equipamento vai quebrar ou ficar obsoleto e vai precisar ser substituído. Sem reservar esse valor no preço, quando o equipamento quebrar o dinheiro pra repor sai "do nada" — geralmente do próprio bolso.` },
          { tipo: "exemplo", texto: `Uma prancha de R$ 400 com vida útil estimada de 24 meses representa depreciação de R$ 16,67/mês. Isso entra no custo fixo mensal e é rateado como qualquer outro — e é também por isso que existe um Ponto de Equilíbrio Financeiro separado do contábil: ele mostra quanto é preciso faturar só em caixa, sem contar a depreciação.` },
        ],
      },
    ],
  },
  {
    categoria: "Precificação",
    icon: Calculator,
    perguntas: [
      {
        id: "markup-divisor",
        pergunta: "Como a Calculadora chega no preço final de um serviço?",
        blocos: [
          { tipo: "texto", texto: `O app usa o método de markup divisor, tecnicamente correto quando existem custos e margens expressos como percentual sobre o preço de venda (impostos, comissões, margem de lucro desejada) — exatamente o caso de um negócio.` },
          { tipo: "formula", texto: `Preço de Venda = Custo Variável Unitário ÷ (1 − (% despesas variáveis sobre o preço + % margem de lucro desejada + % impostos sobre a venda))` },
          { tipo: "texto", texto: `O erro comum é usar "markup multiplicador" (multiplicar o custo por um número fixo), que aplica os percentuais sobre o custo em vez de sobre o preço final — isso subprecifica sistematicamente o serviço, porque impostos e comissões incidem sobre o que o cliente paga, não sobre o que você gastou.` },
          { tipo: "exemplo", texto: `Um serviço com custo variável de R$ 20, imposto efetivo de 8% e margem de lucro desejada de 20% resulta em: R$ 20 ÷ (1 − 0,28) = R$ 27,78. Se você tivesse somado 20% sobre o custo (R$ 24), o preço não cobriria nem o imposto devido — o "lucro" apareceria na conta, mas sumiria na hora de pagar o DAS.` },
        ],
      },
      {
        id: "margem-contribuicao",
        pergunta: "O que é margem de contribuição, e por que ela é mais importante que \"lucro\" no dia a dia?",
        blocos: [
          { tipo: "texto", texto: `Margem de contribuição é o que sobra do preço de um serviço depois de descontar apenas os custos variáveis daquele serviço (produto, comissão, taxa de cartão). É esse valor que "contribui" para pagar os custos fixos do mês e, depois de pagos, vira lucro.` },
          { tipo: "texto", texto: `Ela é mais útil que "lucro" no dia a dia porque o lucro só existe no fechamento do mês inteiro, enquanto a margem de contribuição diz, serviço por serviço, se vale a pena continuar oferecendo aquilo.` },
          { tipo: "exemplo", texto: `Um serviço vendido a R$ 50, com R$ 15 de custo variável, tem margem de contribuição de R$ 35. Se o negócio tem R$ 3.500 de custos fixos no mês, são necessários 100 atendimentos desse serviço específico só para zerar o mês.` },
        ],
      },
      {
        id: "comissao-parceiros",
        pergunta: "Como entram as comissões de profissionais parceiros no cálculo do preço?",
        blocos: [
          { tipo: "texto", texto: `Comissão sobre serviço (cadeira alugada com repasse por atendimento, ou profissional comissionado) é um custo variável, porque só existe quando o atendimento acontece — diferente do aluguel de cadeira fixo mensal, que é custo fixo independente de quantos clientes o profissional atendeu.` },
          { tipo: "texto", texto: `Ela entra na fórmula de markup divisor como percentual sobre o preço de venda, junto dos impostos, já que normalmente é definida como "X% sobre o valor do serviço".` },
          { tipo: "exemplo", texto: `Se um profissional comissionado recebe 40% sobre cada serviço, esse 40% precisa estar dentro do "% despesas variáveis" da fórmula. Ignorar isso e "pagar do que sobrar no fim do mês" é o caminho mais comum para o negócio descobrir, meses depois, que trabalhava basicamente pra cobrir a comissão do parceiro, sem margem real pro próprio negócio.` },
        ],
      },
      {
        id: "taxa-media-recebimento",
        pergunta: "Como calcular a taxa de cartão quando eu recebo por várias formas de pagamento?",
        blocos: [
          { tipo: "texto", texto: `Cada forma de pagamento tem um custo diferente: dinheiro não tem taxa, e Pix, débito, crédito à vista e crédito parcelado podem ter taxas diferentes, que mudam de uma maquininha e de um banco para outro. Usar uma taxa só, "no chute", faz o preço sair errado para mais ou para menos.` },
          { tipo: "texto", texto: `O jeito correto é a média ponderada: cada taxa pesa conforme a parte das vendas que entra por aquela forma. Assim, uma taxa alta numa forma pouco usada pesa pouco, e uma taxa baixa na forma mais usada pesa muito. A taxa entra na fórmula do markup divisor como percentual sobre o preço, junto da comissão e do imposto, porque ela é cobrada sobre o valor que o cliente paga.` },
          { tipo: "formula", texto: `Taxa média = Σ (% das vendas na forma × taxa da forma) ÷ 100` },
          { tipo: "exemplo", texto: `Números só para ilustrar: se 20% das vendas entram em dinheiro (sem taxa), 40% em Pix sem taxa, 25% no débito a 1,6% e 15% no crédito a 3%, a taxa média é (20 × 0 + 40 × 0 + 25 × 1,6 + 15 × 3) ÷ 100 = 0,85%. Usar 3% em todos os serviços, "porque é a taxa do cartão", deixaria o preço mais alto do que precisa. A mensalidade da maquininha não entra aqui: ela é um custo fixo.` },
        ],
      },
      {
        id: "preco-concorrencia",
        pergunta: "Como usar os preços da concorrência sem entrar numa guerra de preço?",
        blocos: [
          { tipo: "texto", texto: `O preço da concorrência mostra o que o cliente da sua região está acostumado a pagar, mas não paga os seus custos. Por isso o app mostra, para cada serviço, três referências juntas: o seu preço, o preço do meio entre os concorrentes que você anotou (a mediana) e o seu piso, que é o preço que só cobre os seus custos, sem lucro.` },
          { tipo: "texto", texto: `A mediana é usada no lugar da média porque um concorrente muito caro ou muito barato não a puxa para um lado. E ela vale tanto quanto as anotações: com poucos concorrentes, ou com preços vistos há muitos meses, a comparação é só um indicativo.` },
          { tipo: "lista", itens: [
            { titulo: "Acima da mediana", texto: `pode estar certo, se o seu serviço entrega mais (tempo, produto, atendimento). Deixe isso claro para o cliente.` },
            { titulo: "Abaixo da mediana, mas acima do piso", texto: `há espaço para subir o preço sem sair do que a região pratica.` },
            { titulo: "Mediana abaixo do seu piso", texto: `baixar até ela daria prejuízo. O caminho é rever custos e tempo do serviço, não acompanhar o preço.` },
          ] },
          { tipo: "exemplo", texto: `Números só para ilustrar: se o seu corte custa R$ 35, o seu piso é R$ 28 e a mediana de cinco barbearias anotadas num raio de 3 km é R$ 30, você está acima da região, mas com folga sobre o custo. Descer para R$ 30 ainda daria lucro, só que menor; descer para R$ 25 daria prejuízo em cada corte.` },
        ],
      },
      {
        id: "salao-parceiro",
        pergunta: "Como funciona a Lei do Salão-Parceiro, e o que muda no preço?",
        blocos: [
          { tipo: "texto", texto: `A Lei 13.352/2016 incluiu na Lei 12.592/2012 o contrato de parceria entre salões e profissionais da beleza. O salão-parceiro recebe o pagamento do cliente, fica com a sua cota e repassa ao profissional-parceiro a cota-parte dele. Essa cota-parte não integra a receita bruta do salão, mesmo quando a nota fiscal ao cliente é uma só (art. 1º-A, §5º).` },
          { tipo: "lista", itens: [
            { titulo: "Contrato", texto: `escrito, assinado perante duas testemunhas e homologado pelo sindicato da categoria ou, na falta dele, pelo órgão local do Ministério do Trabalho (§8º). Sem contrato, ou com o profissional fazendo funções fora dele, há vínculo de emprego (art. 1º-C).` },
            { titulo: "CNPJ do parceiro", texto: `a lei permite (§7º), e as regras do Simples Nacional exigem o CNPJ do parceiro para o repasse sair da receita do salão.` },
            { titulo: "Salão", texto: `precisa ser microempresa ou empresa de pequeno porte: salão MEI não pode ser salão-parceiro.` },
          ] },
          { tipo: "texto", texto: `No app, a cota-parte dos parceiros que cumprem esses requisitos sai da receita do salão. Por isso o imposto e a taxa da maquininha (dividida pela cota) entram no preço só sobre a parte do salão, e o DRE começa no valor cobrado dos clientes, desconta a cota-parte e chega à receita bruta do salão.` },
          { tipo: "formula", texto: `Preço = (custo fixo rateado + custo variável) ÷ (1 − comissão − taxa × (1 − cota) − imposto × (1 − cota) − margem)` },
          { tipo: "exemplo", texto: `Números do exemplo do app: corte com R$ 3,00 de produto, meia hora de cadeira, parceiro com 40% de cota, Simples de 6%, maquininha de 3% e margem de 25%. Com a parceria, o imposto fica em 3,6% do preço e a taxa em 1,8%, e o preço sai R$ 24,59. Tratando os 40% como comissão comum, o preço seria R$ 28,00. Confirme com seu contador o enquadramento do contrato antes de usar.` },
        ],
      },
      {
        id: "tempo-de-cadeira",
        pergunta: "Por que o tempo de cadeira influencia tanto o preço quanto um material caro?",
        blocos: [
          { tipo: "texto", texto: `Porque o tempo de cadeira é o recurso mais escasso do negócio: você tem um número finito de horas por dia, por cadeira, por profissional. Um serviço que ocupa 2 horas impede, durante esse período, que qualquer outro serviço seja vendido naquele mesmo espaço.` },
          { tipo: "texto", texto: `É por isso que o custo fixo rateado é distribuído por tempo, e não igualmente entre todos os serviços: um serviço rápido e um longo consomem quantidades muito diferentes do recurso mais limitado, mesmo usando quantidade parecida de produto.` },
          { tipo: "exemplo", texto: `Uma escova (40 min) e uma coloração completa (2h30) podem usar valores parecidos de produto, mas a coloração "trava" a cadeira quase 4x mais tempo — sem preço proporcionalmente maior, esse mesmo tempo poderia ter atendido dois ou três clientes de serviços rápidos.` },
        ],
      },
    ],
  },
  {
    categoria: "Pró-labore",
    icon: PiggyBank,
    perguntas: [
      {
        id: "o-que-e-pro-labore",
        pergunta: "O que é pró-labore, e por que eu, dono do negócio, preciso \"me pagar um salário\"?",
        blocos: [
          { tipo: "texto", texto: `Pró-labore é a remuneração fixa mensal que o empresário se paga pelo trabalho de gestão e/ou atendimento que exerce no próprio negócio — juridicamente distinta da distribuição de lucros, e sujeita a INSS.` },
          { tipo: "texto", texto: `A razão técnica para lançar isso como custo fixo é simples: se o seu trabalho não tiver um custo dentro da precificação, o app (e você) vai calcular uma margem de contribuição e um "lucro" que, na verdade, incluem escondido o valor do seu próprio trabalho — ou seja, você estaria trabalhando de graça sem perceber.` },
          { tipo: "exemplo", texto: `Dois salões faturam o mesmo, mas um lança R$ 2.500 de pró-labore como custo fixo e o outro não lança nada. O segundo vai aparentar um "lucro" maior no papel — mas esse excedente é, na realidade, o salário não contabilizado do dono, confundido com lucro do negócio.` },
        ],
      },
      {
        id: "pro-labore-vs-retirada",
        pergunta: "Pró-labore e retirar dinheiro do caixa quando \"sobra\" são a mesma coisa?",
        blocos: [
          { tipo: "texto", texto: `Não. Pró-labore é fixo, previsível, definido antes de saber o resultado do mês, e entra na conta como custo — é o que garante que o preço dos serviços já cobre o seu trabalho. Retirar "o que sobrou" é distribuição de lucro, e só deveria acontecer depois que custos fixos (pró-labore incluso), variáveis e impostos já foram cobertos e o resultado do mês mostrou lucro de fato.` },
          { tipo: "texto", texto: `Misturar os dois é o erro clássico do pequeno negócio: retirar do caixa conforme a necessidade pessoal do mês, sem relação com o resultado real, corrói o capital de giro do negócio silenciosamente até faltar dinheiro para comprar produto ou pagar o DAS.` },
        ],
      },
    ],
  },
  {
    categoria: "Impostos e Simples Nacional",
    icon: Landmark,
    perguntas: [
      {
        id: "fator-r",
        pergunta: "O que é o Fator R, e por que ele pode reduzir o imposto que pago?",
        blocos: [
          { tipo: "texto", texto: `O Fator R é a razão entre a folha de pagamento dos últimos 12 meses (incluindo pró-labore, salários e encargos) e a receita bruta dos últimos 12 meses (RBT12). Para atividades de prestação de serviço, ele decide se você é tributado pelo Anexo III (alíquotas menores) ou pelo Anexo V (alíquotas maiores) do Simples Nacional, conforme a LC 123/2006: atingindo Fator R igual ou superior a 28%, a atividade migra para o Anexo III.` },
          { tipo: "texto", texto: `Na prática, quanto maior a proporção da sua folha de pagamento (incluindo o seu próprio pró-labore) em relação ao faturamento, menor tende a ser sua carga tributária percentual — mais um motivo pelo qual lançar corretamente o pró-labore não é só uma questão contábil, é uma alavanca tributária real.` },
        ],
      },
      {
        id: "rbt12-aliquota-efetiva",
        pergunta: "Como o app usa a Receita Bruta dos últimos 12 meses (RBT12) para calcular minha alíquota?",
        blocos: [
          { tipo: "texto", texto: `O Simples Nacional não usa uma alíquota fixa por faixa: dentro de cada tabela (Anexo III ou V), a alíquota efetiva é progressiva de fato, calculada por:` },
          { tipo: "formula", texto: `Alíquota Efetiva = [(RBT12 × Alíquota Nominal da faixa) − Parcela a Deduzir] ÷ RBT12` },
          { tipo: "texto", texto: `É por isso que o app pede o faturamento acumulado dos últimos 12 meses, e não só o do mês — a alíquota que incide sobre o seu preço hoje depende do histórico recente do negócio, não apenas do mês corrente.` },
        ],
      },
    ],
  },
  {
    categoria: "Painel Gerencial",
    icon: LayoutDashboard,
    perguntas: [
      {
        id: "dre",
        pergunta: "O que é a DRE, e o que ela mostra que o extrato do banco não mostra?",
        blocos: [
          { tipo: "texto", texto: `DRE (Demonstração do Resultado do Exercício) é o relatório que parte da receita bruta e vai descontando, em ordem, impostos, custos variáveis, custos fixos e pró-labore, até chegar no resultado líquido do período.` },
          { tipo: "texto", texto: `A diferença fundamental para o extrato bancário é que a DRE segue o regime de competência (reconhece receitas e despesas quando ocorrem, não quando o dinheiro entra ou sai) e separa cada camada de custo — enquanto o extrato só mostra entradas e saídas misturadas, sem dizer se o negócio deu lucro ou só teve mais entradas que saídas naquele mês (o que pode acontecer mesmo com prejuízo real, por exemplo recebendo um pacote pago à vista antecipadamente).` },
        ],
      },
      {
        id: "ponto-de-equilibrio",
        pergunta: "O que é ponto de equilíbrio, e por que existem três tipos diferentes no Painel?",
        blocos: [
          { tipo: "texto", texto: `Ponto de equilíbrio é o faturamento mínimo necessário para cobrir todos os custos, sem lucro nem prejuízo. Os três tipos existem porque respondem perguntas diferentes:` },
          { tipo: "lista", itens: [
            { titulo: "Ponto de Equilíbrio Contábil", texto: `custos fixos totais (incluindo depreciação) ÷ margem de contribuição — responde "quanto preciso faturar para o resultado contábil zerar".` },
            { titulo: "Ponto de Equilíbrio Financeiro", texto: `custos fixos menos a depreciação (que não é desembolso de caixa), mais eventuais parcelas de empréstimo, ÷ margem de contribuição — responde "quanto preciso faturar para o caixa não ficar negativo".` },
            { titulo: "Ponto de Equilíbrio Econômico", texto: `custos fixos mais um retorno mínimo esperado sobre o capital investido, ÷ margem de contribuição — responde "quanto preciso faturar para esse negócio valer mais a pena do que deixar o dinheiro investido em outro lugar".` },
          ] },
          { tipo: "texto", texto: `Por que os três importam juntos: é possível estar acima do ponto de equilíbrio financeiro (o caixa fecha) e ainda assim abaixo do contábil ou do econômico — ou seja, o negócio "sobrevive" no curto prazo, mas está descapitalizando o dono ou deixando de gerar o retorno que justificaria o risco do negócio.` },
        ],
      },
      {
        id: "margem-de-seguranca",
        pergunta: "O que é margem de segurança operacional?",
        blocos: [
          { tipo: "texto", texto: `É a distância percentual entre o seu faturamento atual e o ponto de equilíbrio. Ela mede o quanto o faturamento pode cair antes do negócio entrar na zona de prejuízo.` },
          { tipo: "formula", texto: `Margem de Segurança = (Receita Atual − Receita no Ponto de Equilíbrio) ÷ Receita Atual` },
          { tipo: "exemplo", texto: `Se seu ponto de equilíbrio é R$ 8.000 e você fatura R$ 10.000, sua margem de segurança é 20% — um mês de baixa temporada com queda de até 20% no faturamento ainda mantém o negócio sem prejuízo; acima disso, entra em zona de risco.` },
        ],
      },
      {
        id: "gao",
        pergunta: "O que é grau de alavancagem operacional (GAO), e por que ele é um alerta de risco?",
        blocos: [
          { tipo: "texto", texto: `O GAO mostra o quanto o seu lucro varia, percentualmente, para cada 1% de variação no faturamento. Quanto maior a proporção de custos fixos na sua estrutura, maior tende a ser o GAO — o negócio fica mais sensível a oscilações de demanda, para o bem e para o mal.` },
          { tipo: "formula", texto: `GAO = Margem de Contribuição Total ÷ Lucro Operacional` },
          { tipo: "exemplo", texto: `Um GAO de 3 significa que uma queda de 10% no faturamento pode reduzir o lucro operacional em cerca de 30%. Isso é especialmente relevante para salões com estrutura fixa pesada (aluguel maior, mais cadeiras, mais equipamentos): o potencial de ganho em alta temporada é maior, mas a exposição em baixa temporada também.` },
        ],
      },
      {
        id: "fluxo-caixa-sazonal",
        pergunta: "Por que o app projeta fluxo de caixa sazonal ao longo de 12 meses, e não só o mês atual?",
        blocos: [
          { tipo: "texto", texto: `Porque o setor de beleza tem sazonalidade real e recorrente (datas como Natal, Dia das Mães e formaturas geram picos; janeiro e fevereiro costumam ser mais fracos), e decisões como contratar um profissional, comprar um equipamento novo ou assumir um aluguel maior precisam considerar o ano inteiro — não o melhor (ou pior) mês isolado.` },
          { tipo: "texto", texto: `Ver apenas o mês atual pode levar a decisões equivocadas nas duas direções: expandir demais baseado em um mês de alta temporada, ou cortar investimento necessário baseado em um mês tradicionalmente fraco.` },
        ],
      },
    ],
  },
  {
    categoria: "Observatório de Mercado",
    icon: MapPin,
    perguntas: [
      {
        id: "copiar-concorrente",
        pergunta: "Posso simplesmente copiar o preço dos concorrentes que aparecem no Observatório?",
        blocos: [
          { tipo: "texto", texto: `Não é recomendado. O Observatório mostra preços praticados publicamente por outros estabelecimentos da região, o que é útil como referência de mercado — mas cada negócio tem uma estrutura de custos própria (aluguel, portfólio de equipamentos, nível de comissão, regime tributário) que só o seu próprio cálculo na Calculadora reflete.` },
          { tipo: "texto", texto: `Um concorrente pode praticar um preço mais baixo porque tem aluguel menor, ou porque, sem saber, está com margem de contribuição negativa naquele serviço. Copiar o preço sem saber qual dessas situações é a real significa importar o problema do concorrente para o seu negócio. O Observatório deve ser usado para entender o posicionamento do seu preço na região — não para substituir o cálculo dos seus próprios custos.` },
        ],
      },
    ],
  },
];

function BlocoResposta({ bloco }) {
  const t = useT();
  if (bloco.tipo === "formula") {
    return (
      <div className="rounded-lg px-3 py-2.5 my-2 font-num text-[13px]" style={{ background: t.primarySoft, color: t.primaryText, fontWeight: 600, lineHeight: 1.5 }}>
        {bloco.texto}
      </div>
    );
  }
  if (bloco.tipo === "exemplo") {
    return (
      <div className="rounded-lg pl-3 pr-3 py-2.5 my-2 text-[13px] leading-relaxed" style={{ background: t.successSoft, color: t.text, borderLeft: `3px solid ${t.success}` }}>
        <span className="font-semibold" style={{ color: t.successText }}>Exemplo prático: </span>
        {bloco.texto}
      </div>
    );
  }
  if (bloco.tipo === "lista") {
    return (
      <ul className="my-2 space-y-1.5 pl-0.5">
        {bloco.itens.map((item, i) => (
          <li key={i} className="text-sm leading-relaxed flex gap-2" style={{ color: t.textMuted }}>
            <span className="shrink-0" style={{ color: t.primaryText }}>•</span>
            <span><strong style={{ color: t.text }}>{item.titulo}:</strong> {item.texto}</span>
          </li>
        ))}
      </ul>
    );
  }
  return <p className="text-sm leading-relaxed mb-2 last:mb-0" style={{ color: t.textMuted }}>{bloco.texto}</p>;
}

function encontrarPerguntaFaq(id) {
  for (const c of FAQ_DADOS) {
    const p = c.perguntas.find((q) => q.id === id);
    if (p) return { ...p, categoria: c.categoria };
  }
  return null;
}

/* Explicação completa de uma pergunta do FAQ, aberta a partir de uma dica  */
/* "?" — por cima da tela atual, sem trocar de aba. Trocar de aba descarta  */
/* o que ainda não foi salvo (rascunho de serviço, últimos segundos do      */
/* Negócio), então o usuário lê e volta exatamente de onde estava.          */
/* Celular: sobe de baixo (bottom sheet). Telas maiores: centralizado.      */
function PainelExplicacao({ faqId, onFechar, onVerFaq }) {
  const t = useT();
  const pergunta = encontrarPerguntaFaq(faqId);
  const [saindo, setSaindo] = useState(false);
  const fecharRef = useRef(null);
  const focoAnteriorRef = useRef(null);

  const fechar = useCallback((depois) => {
    setSaindo(true);
    const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => {
      onFechar();
      if (typeof depois === "function") depois();
      else focoAnteriorRef.current?.focus?.();
    }, reduzido ? 0 : 180);
  }, [onFechar]);

  useEffect(() => {
    focoAnteriorRef.current = document.activeElement;
    fecharRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") fechar(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fechar]);

  if (!pergunta) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center no-print">
      <div
        className={saindo ? "backdrop-out" : "backdrop-in"} onClick={() => fechar()} aria-hidden="true"
        style={{ position: "absolute", inset: 0, background: "rgba(10, 14, 26, .45)", touchAction: "none" }}
      />
      <div
        role="dialog" aria-modal="true" aria-labelledby="painel-explicacao-titulo"
        className={(saindo ? "sheet-out" : "sheet-in") + " relative w-full sm:max-w-lg sm:mx-4 rounded-t-2xl sm:rounded-2xl flex flex-col"}
        style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow, maxHeight: "82dvh" }}
      >
        <div className="sm:hidden flex justify-center pt-2" aria-hidden="true">
          <span style={{ width: 36, height: 4, borderRadius: 4, background: t.border }} />
        </div>
        <div className="flex items-start justify-between gap-3 px-5 pt-3 sm:pt-5 pb-3" style={{ borderBottom: `1px solid ${t.border}` }}>
          <div className="min-w-0">
            <p className="text-[11px] font-medium inline-flex items-center gap-1" style={{ color: t.primaryText }}>
              <HelpCircle size={12} /> {pergunta.categoria}
            </p>
            <p id="painel-explicacao-titulo" className="text-sm font-semibold mt-1" style={{ color: t.text }}>{pergunta.pergunta}</p>
          </div>
          <button ref={fecharRef} type="button" onClick={() => fechar()} aria-label="Fechar explicação"
            className="btn-press touch-target shrink-0 rounded-full p-1.5" style={{ background: t.surfaceAlt, color: t.textMuted }}>
            <X size={14} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto" style={{ overscrollBehavior: "contain" }}>
          {pergunta.blocos.map((bloco, i) => <BlocoResposta key={i} bloco={bloco} />)}
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-3" style={{ borderTop: `1px solid ${t.border}`, paddingBottom: "calc(.75rem + env(safe-area-inset-bottom))" }}>
          <button type="button" onClick={() => fechar(onVerFaq)} className="btn-press text-xs font-medium underline underline-offset-2" style={{ color: t.textMuted }}>
            Ver todas as perguntas
          </button>
          <button type="button" onClick={() => fechar()} className="btn-press rounded-xl px-4 py-2 text-xs font-semibold" style={{ background: t.primary, color: t.onPrimary }}>
            Entendi, voltar
          </button>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ id, pergunta, blocos, aberto, onToggle, destaque }) {
  const t = useT();
  return (
    <div id={id ? `faq-${id}` : undefined} className="fade-up rounded-xl" style={{ background: t.surface, border: `1px solid ${destaque ? t.primary : t.border}`, boxShadow: t.shadow, overflow: "hidden", transition: "border-color .6s ease", scrollMarginTop: 80 }}>
      <button
        onClick={onToggle} aria-expanded={aberto}
        className="btn-press touch-target flex items-center justify-between w-full text-left px-4 py-3.5 gap-3"
      >
        <span className="text-sm font-medium" style={{ color: t.text }}>{pergunta}</span>
        <ChevronDown size={16} style={{ color: t.textMuted, flexShrink: 0, transform: aberto ? "rotate(180deg)" : "none", transition: "transform .2s ease" }} />
      </button>
      {aberto && (
        <div className="pop-in px-4 pb-4" style={{ borderTop: `1px solid ${t.border}`, paddingTop: 12 }}>
          {blocos.map((bloco, i) => <BlocoResposta key={i} bloco={bloco} />)}
        </div>
      )}
    </div>
  );
}

function Faq({ alvo } = {}) {
  const t = useT();
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("Todos");
  const [abertos, setAbertos] = useState(() => (alvo?.id ? { [alvo.id]: true } : {}));
  const [destaque, setDestaque] = useState(alvo?.id || null);

  // Chegou aqui por "Ver todas as perguntas" de uma explicação: a pergunta
  // já vem aberta, a tela rola até ela e a borda fica destacada por instantes.
  useEffect(() => {
    if (!alvo?.id) return undefined;
    setAbertos((prev) => ({ ...prev, [alvo.id]: true }));
    setDestaque(alvo.id);
    const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const rolar = setTimeout(() => {
      document.getElementById(`faq-${alvo.id}`)?.scrollIntoView({ behavior: reduzido ? "auto" : "smooth", block: "start" });
    }, 60);
    const apagar = setTimeout(() => setDestaque(null), 2200);
    return () => { clearTimeout(rolar); clearTimeout(apagar); };
  }, [alvo]);

  const toggle = (id) => setAbertos((prev) => ({ ...prev, [id]: !prev[id] }));

  const categorias = ["Todos", ...FAQ_DADOS.map((c) => c.categoria)];
  const buscaLower = busca.trim().toLowerCase();

  const textoDosBlocos = (blocos) =>
    blocos.map((b) => (b.tipo === "lista" ? b.itens.map((i) => `${i.titulo} ${i.texto}`).join(" ") : b.texto)).join(" ").toLowerCase();

  const grupos = FAQ_DADOS
    .filter((c) => categoriaAtiva === "Todos" || c.categoria === categoriaAtiva)
    .map((c) => ({
      ...c,
      perguntas: c.perguntas.filter((p) =>
        !buscaLower || p.pergunta.toLowerCase().includes(buscaLower) || textoDosBlocos(p.blocos).includes(buscaLower)
      ),
    }))
    .filter((c) => c.perguntas.length > 0);

  const totalPerguntas = useMemo(() => FAQ_DADOS.reduce((s, c) => s + c.perguntas.length, 0), []);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: t.surfaceAlt, border: `1px dashed ${t.border}` }}>
        <HelpCircle size={16} className="mt-0.5 shrink-0" style={{ color: t.textMuted }} />
        <p className="text-sm" style={{ color: t.text }}>
          Cada pergunta explica por que o app pede aquele dado e como o número calculado ajuda a decidir algo real no seu negócio.
        </p>
      </div>

      <input
        className={CAMPO} style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
        placeholder="Buscar por palavra-chave (ex: pró-labore, ponto de equilíbrio)"
        value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar no FAQ"
      />

      <div className="flex gap-1 p-1 rounded-lg w-fit overflow-x-auto" style={{ background: t.surfaceAlt, maxWidth: "100%" }}>
        {categorias.map((c) => (
          <button
            key={c} onClick={() => setCategoriaAtiva(c)}
            className="btn-press rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap"
            style={{ background: categoriaAtiva === c ? t.surface : "transparent", color: categoriaAtiva === c ? t.text : t.textMuted, boxShadow: categoriaAtiva === c ? t.shadow : "none" }}
          >
            {c}
          </button>
        ))}
      </div>

      {grupos.length === 0 ? (
        <div className="rounded-2xl p-6 text-center fade-up" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <p className="text-sm" style={{ color: t.textMuted }}>Nenhuma pergunta encontrada para "{busca}".</p>
        </div>
      ) : (
        grupos.map((grupo) => {
          const GrupoIcon = grupo.icon;
          return (
            <div key={grupo.categoria} className="space-y-2">
              <div className="flex items-center gap-1.5 mt-2">
                <GrupoIcon size={14} style={{ color: t.primaryText }} />
                <span className="text-sm font-semibold" style={{ color: t.text }}>{grupo.categoria}</span>
              </div>
              <div className="space-y-2">
                {grupo.perguntas.map((p) => (
                  <FaqItem key={p.id} id={p.id} pergunta={p.pergunta} blocos={p.blocos} aberto={!!abertos[p.id]} onToggle={() => toggle(p.id)} destaque={destaque === p.id} />
                ))}
              </div>
            </div>
          );
        })
      )}

      <p className="text-[11px] text-center pt-2" style={{ color: t.textMuted }}>
        {totalPerguntas} perguntas · baseado em princípios de contabilidade gerencial consolidados e na legislação vigente do Simples Nacional (LC 123/2006).
      </p>
    </div>
  );
}

export default App;
export { LogoMark };

/* ======================================================================= */
/* Aba: Estoque — Frente 1 (Produtos de Revenda) completa; Frente 2        */
/* (Insumos de Uso Interno) com saldo/mínimo no insumo compartilhado já    */
/* existente + registro manual de entrada/baixa. Baixa técnica automática  */
/* mensal fica para a próxima etapa — ver Especificacao_Estoque.md, §4.    */
/* ======================================================================= */
function statusEstoque(saldoAtual, estoqueMinimo) {
  const saldo = N(saldoAtual);
  const minimo = N(estoqueMinimo);
  if (minimo <= 0) return "ok"; // sem mínimo definido — não alerta, não tem contra o que comparar
  if (saldo <= minimo) return "critico";
  if (saldo <= minimo * 1.3) return "atencao";
  return "ok";
}
function corStatusEstoque(t, status) {
  return status === "critico" ? t.danger : status === "atencao" ? t.warning : t.success;
}

function CardResumoEstoque({ icon: Icon, label, valor, sub, cor }) {
  const t = useT();
  return (
    <div className="rounded-2xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
      <div className="flex items-center gap-1.5 mb-1" style={{ color: t.textMuted }}>
        <Icon size={13} />
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p className="font-num text-xl font-bold" style={{ color: cor || t.text }}>{valor}</p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: t.textMuted }}>{sub}</p>}
    </div>
  );
}

function FormularioProdutoRevenda({ produtoExistente, onSalvar, onCancelar }) {
  const t = useT();
  const [nome, setNome] = useState(produtoExistente?.nome ?? "");
  const [sku, setSku] = useState(produtoExistente?.sku ?? "");
  const [custoAquisicao, setCustoAquisicao] = useState(produtoExistente?.custoAquisicao ?? "");
  const [precoVenda, setPrecoVenda] = useState(produtoExistente?.precoVenda ?? "");
  const [estoqueMinimo, setEstoqueMinimo] = useState(produtoExistente?.estoqueMinimo ?? "");
  const [saldoInicial, setSaldoInicial] = useState(String(produtoExistente?.saldoAtual ?? "0"));

  const margemUnitaria = N(precoVenda) - N(custoAquisicao);
  const margemPct = N(precoVenda) > 0 ? (margemUnitaria / N(precoVenda)) * 100 : 0;
  const valido = nome.trim().length > 0 && N(precoVenda) > 0;

  const salvar = () => {
    onSalvar({
      id: produtoExistente?.id || uid(),
      nome: nome.trim(), sku: sku.trim(), custoAquisicao: N(custoAquisicao), precoVenda: N(precoVenda),
      estoqueMinimo: N(estoqueMinimo), saldoAtual: produtoExistente ? produtoExistente.saldoAtual : N(saldoInicial),
      criadoEm: produtoExistente?.criadoEm ?? Date.now(), editadoEm: Date.now(),
    });
  };

  return (
    <div className="rounded-xl p-3 space-y-3 pop-in" style={{ background: t.surfaceAlt }}>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Nome do produto">
          <input className={CAMPO} style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
            placeholder="ex: Pomada modeladora" value={nome} onChange={(e) => setNome(e.target.value)} />
        </Campo>
        <Campo label="SKU (opcional)">
          <input className={CAMPO} style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
            placeholder="ex: POM-001" value={sku} onChange={(e) => setSku(e.target.value)} />
        </Campo>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Custo de aquisição" ajuda="Quanto você paga pra comprar uma unidade do fornecedor.">
          <CampoMoeda value={custoAquisicao} onChange={setCustoAquisicao} />
        </Campo>
        <Campo label="Preço de venda">
          <CampoMoeda value={precoVenda} onChange={setPrecoVenda} />
        </Campo>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Estoque mínimo" ajuda="Quando o saldo chegar aqui (ou abaixo), o item entra em alerta.">
          <CampoNumero value={estoqueMinimo} onChange={setEstoqueMinimo} placeholder="0" />
        </Campo>
        {!produtoExistente && (
          <Campo label="Saldo inicial">
            <CampoNumero value={saldoInicial} onChange={setSaldoInicial} placeholder="0" />
          </Campo>
        )}
      </div>
      {N(precoVenda) > 0 && (
        <p className="text-[11px]" style={{ color: t.textMuted }}>
          Margem unitária: <strong style={{ color: t.text }}>{fmtBRL(margemUnitaria)}</strong> ({fmtPct(margemPct)})
        </p>
      )}
      <div className="flex gap-2">
        <button onClick={salvar} disabled={!valido} className="btn-press flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
          style={{ background: valido ? t.success : t.surface, color: valido ? t.onSuccess : t.textMuted, opacity: valido ? 1 : 0.6 }}>
          <Save size={12} /> Salvar produto
        </button>
        <button onClick={onCancelar} className="btn-press rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: t.surface, color: t.textMuted }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function FormularioMovimento({ produto, onSalvar, onCancelar }) {
  const t = useT();
  const [tipo, setTipoMov] = useState("entrada");
  const [quantidade, setQuantidade] = useState("");
  const [custoUnitario, setCustoUnitario] = useState(String(produto.custoAquisicao || ""));
  const [observacao, setObservacao] = useState("");

  const valido = N(quantidade) > 0;
  const excedeSaldo = tipo === "saida" && N(quantidade) > produto.saldoAtual;

  const salvar = () => {
    onSalvar({
      id: uid(), produtoId: produto.id, tipo, quantidade: N(quantidade),
      custoUnitario: tipo === "entrada" ? N(custoUnitario) : null,
      data: new Date().toISOString().slice(0, 10), observacao: observacao.trim(),
      criadoEm: Date.now(),
    });
  };

  return (
    <div className="rounded-xl p-3 space-y-3 pop-in" style={{ background: t.surfaceAlt }}>
      <p className="text-xs font-semibold" style={{ color: t.text }}>Movimentar: {produto.nome}</p>
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: t.surface }}>
        <button onClick={() => setTipoMov("entrada")} className="btn-press rounded-md px-3 py-1.5 text-xs font-semibold"
          style={{ background: tipo === "entrada" ? t.successSoft : "transparent", color: tipo === "entrada" ? t.successText : t.textMuted }}>
          Entrada
        </button>
        <button onClick={() => setTipoMov("saida")} className="btn-press rounded-md px-3 py-1.5 text-xs font-semibold"
          style={{ background: tipo === "saida" ? t.dangerSoft : "transparent", color: tipo === "saida" ? t.danger : t.textMuted }}>
          Saída
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Quantidade">
          <CampoNumero value={quantidade} onChange={setQuantidade} placeholder="0" />
        </Campo>
        {tipo === "entrada" && (
          <Campo label="Custo unitário nesta compra">
            <CampoMoeda value={custoUnitario} onChange={setCustoUnitario} />
          </Campo>
        )}
      </div>
      <Campo label="Observação (opcional)">
        <input className={CAMPO} style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
          placeholder={tipo === "entrada" ? "ex: NF 1234, fornecedor X" : "ex: venda balcão"}
          value={observacao} onChange={(e) => setObservacao(e.target.value)} />
      </Campo>
      {excedeSaldo && (
        <p className="text-[11px]" style={{ color: t.warningText }}>
          Saldo atual é {produto.saldoAtual} — essa saída deixaria negativo. Confira antes de salvar.
        </p>
      )}
      <div className="flex gap-2">
        <button onClick={salvar} disabled={!valido} className="btn-press flex-1 rounded-lg px-3 py-2 text-xs font-semibold"
          style={{ background: valido ? t.success : t.surface, color: valido ? t.onSuccess : t.textMuted, opacity: valido ? 1 : 0.6 }}>
          Confirmar {tipo === "entrada" ? "entrada" : "saída"}
        </button>
        <button onClick={onCancelar} className="btn-press rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: t.surface, color: t.textMuted }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function CardProdutoRevenda({ produto, onEditar, onExcluir, onMovimentar }) {
  const t = useT();
  const [confirmando, setConfirmando] = useState(false);
  const [movimentando, setMovimentando] = useState(false);
  const status = statusEstoque(produto.saldoAtual, produto.estoqueMinimo);
  const cor = corStatusEstoque(t, status);
  const labelStatus = status === "critico" ? "ruptura" : status === "atencao" ? "atenção" : "saudável";
  const margemUnitaria = produto.precoVenda - produto.custoAquisicao;

  return (
    <div className="fade-up rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}`, borderLeft: `4px solid ${cor}`, boxShadow: t.shadow, overflow: "hidden" }}>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: t.text }}>{produto.nome}</p>
            {produto.sku && <p className="text-[10px]" style={{ color: t.textMuted }}>SKU: {produto.sku}</p>}
          </div>
          <span className="shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: `${cor}22`, color: cor }}>{labelStatus}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2.5">
          <div>
            <p className="text-[10px]" style={{ color: t.textMuted }}>Saldo</p>
            <p className="font-num text-base font-bold" style={{ color: t.text }}>{produto.saldoAtual}</p>
          </div>
          <div>
            <p className="text-[10px]" style={{ color: t.textMuted }}>Preço venda</p>
            <p className="font-num text-sm font-medium" style={{ color: t.text }}>{fmtBRL(produto.precoVenda)}</p>
          </div>
          <div>
            <p className="text-[10px]" style={{ color: t.textMuted }}>Margem/un.</p>
            <p className="font-num text-sm font-medium" style={{ color: margemUnitaria >= 0 ? t.successText : t.danger }}>{fmtBRL(margemUnitaria)}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3 items-center">
          <button onClick={() => setMovimentando((v) => !v)} className="btn-press flex-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold" style={{ background: t.primarySoft, color: t.primaryText }}>
            Movimentar
          </button>
          <button onClick={onEditar} className="btn-press touch-target-48 p-1.5 rounded-lg" style={{ color: t.primaryText }} aria-label={`Editar ${produto.nome}`}><Pencil size={14} /></button>
          {!confirmando ? (
            <button onClick={() => setConfirmando(true)} className="btn-press touch-target-48 p-1.5 rounded-lg" style={{ color: t.danger }} aria-label={`Excluir ${produto.nome}`}><Trash2 size={14} /></button>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] shrink-0">
              <button onClick={() => { onExcluir(); setConfirmando(false); }} className="btn-press font-semibold underline" style={{ color: t.danger }}>confirmar</button>
              <button onClick={() => setConfirmando(false)} className="btn-press underline" style={{ color: t.textMuted }}>não</button>
            </div>
          )}
        </div>
      </div>
      {movimentando && (
        <div className="px-3 pb-3">
          <FormularioMovimento produto={produto}
            onSalvar={(mov) => { onMovimentar(mov); setMovimentando(false); }}
            onCancelar={() => setMovimentando(false)} />
        </div>
      )}
    </div>
  );
}

function EstoqueInsumosInternos({ negocio, onSalvarNegocio }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const insumos = negocio.insumosCompartilhados || [];
  const insumosComEstoque = insumos.filter((i) => (i.modo || "duracao") === "unidade" && N(i.quantidadeComprada) > 0);

  const updateInsumo = (id, field, value) => {
    onSalvarNegocio({ ...negocio, insumosCompartilhados: insumos.map((i) => (i.id === id ? { ...i, [field]: value } : i)) });
  };

  return (
    <div className="rounded-2xl p-4 no-print" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
      <button onClick={() => setAberto((v) => !v)} className="btn-press touch-target flex items-center justify-between w-full" aria-expanded={aberto}>
        <span className="text-sm font-semibold inline-flex items-center gap-1.5" style={{ color: t.text }}>
          <Package size={14} style={{ color: t.primaryText }} /> Insumos de uso interno
        </span>
        <ChevronDown size={15} style={{ color: t.textMuted, transform: aberto ? "rotate(180deg)" : "none", transition: "transform .2s ease" }} />
      </button>
      {aberto && (
        <div className="pop-in mt-3 space-y-3">
          <p className="text-[11px]" style={{ color: t.textMuted }}>
            Reaproveita o catálogo de "Insumos compartilhados" já cadastrado em Negócio — a quantidade comprada vem de
            lá, você só registra o quanto já foi usado. Saldo = comprada − usada, calculado aqui, sem digitar de novo.
          </p>
          {insumos.length === 0 ? (
            <p className="text-[11px]" style={{ color: t.textMuted }}>
              Nenhum insumo compartilhado cadastrado ainda — cadastre em Negócio → "Insumos compartilhados entre serviços".
            </p>
          ) : (
            <div className="space-y-2">
              {insumos.map((i) => {
                const modo = i.modo || "duracao";
                if (modo !== "unidade") {
                  return (
                    <div key={i.id} className="rounded-lg p-2.5" style={{ background: t.surfaceAlt, borderLeft: `3px solid ${t.border}` }}>
                      <p className="text-xs font-medium mb-1" style={{ color: t.text }}>{i.nome || "(sem nome)"}</p>
                      <p className="text-[11px]" style={{ color: t.textMuted }}>
                        Cadastrado "por duração" — controlado por custo/tempo, não por unidade física. Estoque em quantidade não se aplica aqui.
                      </p>
                    </div>
                  );
                }
                const comprada = N(i.quantidadeComprada);
                if (comprada <= 0) {
                  return (
                    <div key={i.id} className="rounded-lg p-2.5" style={{ background: t.surfaceAlt, borderLeft: `3px solid ${t.border}` }}>
                      <p className="text-xs font-medium mb-1" style={{ color: t.text }}>{i.nome || "(sem nome)"}</p>
                      <p className="text-[11px]" style={{ color: t.textMuted }}>
                        Preencha "Quantidade comprada" em Negócio → Insumos compartilhados pra habilitar o estoque deste item.
                      </p>
                    </div>
                  );
                }
                const usada = N(i.quantidadeUsada);
                const saldo = comprada - usada;
                const status = statusEstoque(saldo, i.estoqueMinimo);
                const cor = corStatusEstoque(t, status);
                return (
                  <div key={i.id} className="rounded-lg p-2.5" style={{ background: t.surfaceAlt, borderLeft: `3px solid ${cor}` }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium" style={{ color: t.text }}>{i.nome || "(sem nome)"}</p>
                      <span className="font-num text-xs font-semibold" style={{ color: cor }}>saldo: {saldo}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px]" style={{ color: t.textMuted }}>Comprada</span>
                        <div className={CAMPO + " font-num"} style={{ background: t.surface, border: `1px dashed ${t.border}`, color: t.textMuted }}>{comprada}</div>
                      </div>
                      <label className="block">
                        <span className="text-[10px]" style={{ color: t.textMuted }}>Usada</span>
                        <input type="number" min="0" className={CAMPO + " font-num"} style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                          value={i.quantidadeUsada ?? ""} onChange={(e) => updateInsumo(i.id, "quantidadeUsada", e.target.value === "" ? null : N(e.target.value))} placeholder="0" />
                      </label>
                      <label className="block">
                        <span className="text-[10px]" style={{ color: t.textMuted }}>Mínimo</span>
                        <input type="number" min="0" className={CAMPO + " font-num"} style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                          value={i.estoqueMinimo ?? ""} onChange={(e) => updateInsumo(i.id, "estoqueMinimo", e.target.value === "" ? null : N(e.target.value))} placeholder="não controla" />
                      </label>
                    </div>
                    <p className="text-[10px] mt-1.5" style={{ color: t.textMuted }}>
                      Comprou um lote novo? Atualize "Quantidade comprada" em Negócio e zere "Usada" aqui — ainda é manual, sem baixa automática.
                    </p>
                  </div>
                );
              })}
            </div>
          )}
          {insumosComEstoque.length > 0 && (
            <p className="text-[11px] rounded-lg p-2" style={{ background: t.surfaceAlt, color: t.textMuted }}>
              A baixa automática ao fechar o mês (calculada a partir do detalhamento por serviço do Fechamento Mensal)
              é a próxima etapa deste módulo — hoje o saldo aqui é atualizado por você, manualmente.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Estoque({ negocio, onSalvarNegocio }) {
  const t = useT();
  const [produtos, setProdutos] = useState(null);
  const [movimentos, setMovimentos] = useState([]);
  const [criandoProduto, setCriandoProduto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const { show, node: toastNode } = useToast();

  const carregar = useCallback(async () => {
    try {
      const chavesP = await listarComFallback("produto-revenda:");
      const produtosCarregados = await Promise.all(
        chavesP.map(async (k) => {
          const v = await lerComFallback(k);
          try { return v ? JSON.parse(v) : null; } catch { return null; }
        })
      );
      setProdutos(produtosCarregados.filter(Boolean).sort((a, b) => a.nome.localeCompare(b.nome)));
    } catch { setProdutos([]); }
    try {
      const chavesM = await listarComFallback("movimento-estoque:");
      const movimentosCarregados = await Promise.all(
        chavesM.map(async (k) => {
          const v = await lerComFallback(k);
          try { return v ? JSON.parse(v) : null; } catch { return null; }
        })
      );
      setMovimentos(movimentosCarregados.filter(Boolean));
    } catch { setMovimentos([]); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const salvarProduto = (produto) => {
    salvarComFallback(`produto-revenda:${produto.id}`, JSON.stringify(produto));
    setProdutos((prev) => [...(prev || []).filter((p) => p.id !== produto.id), produto].sort((a, b) => a.nome.localeCompare(b.nome)));
    setCriandoProduto(false);
    setEditandoId(null);
    show(`"${produto.nome}" salvo`);
  };

  const excluirProduto = (id, nome) => {
    excluirComFallback(`produto-revenda:${id}`);
    setProdutos((prev) => (prev || []).filter((p) => p.id !== id));
    show(`"${nome}" excluído`);
  };

  const registrarMovimento = (produto, mov) => {
    salvarComFallback(`movimento-estoque:${mov.id}`, JSON.stringify(mov));
    const delta = mov.tipo === "entrada" ? mov.quantidade : -mov.quantidade;
    const atualizado = { ...produto, saldoAtual: produto.saldoAtual + delta, editadoEm: Date.now() };
    salvarComFallback(`produto-revenda:${produto.id}`, JSON.stringify(atualizado));
    setProdutos((prev) => (prev || []).map((p) => (p.id === produto.id ? atualizado : p)));
    setMovimentos((prev) => [...prev, mov]);
    show(`${mov.tipo === "entrada" ? "Entrada" : "Saída"} registrada`);
  };

  if (produtos === null) {
    return <div className="grid gap-4 sm:grid-cols-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>;
  }

  const valorTotalInvestido = produtos.reduce((s, p) => s + p.saldoAtual * p.custoAquisicao, 0);
  const itensAbaixoMinimo = produtos.filter((p) => statusEstoque(p.saldoAtual, p.estoqueMinimo) !== "ok").length;

  // Giro estimado: saídas dos últimos 30 dias ÷ saldo total atual — quantas vezes o estoque
  // "vira" por mês, no ritmo recente. Fica mais confiável conforme mais movimentação real
  // se acumula; com pouco histórico, é só um indício, não uma média madura.
  const trintaDiasAtras = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const saidasUltimos30 = movimentos
    .filter((m) => m.tipo === "saida" && new Date(m.data).getTime() >= trintaDiasAtras)
    .reduce((s, m) => s + m.quantidade, 0);
  const saldoTotalAtual = produtos.reduce((s, p) => s + p.saldoAtual, 0);
  const giroEstimado = saldoTotalAtual > 0 ? saidasUltimos30 / saldoTotalAtual : null;

  return (
    <div className="space-y-5">
      {toastNode}
      <div className="grid gap-3 sm:grid-cols-3">
        <CardResumoEstoque icon={PiggyBank} label="Valor investido em estoque" valor={fmtBRL(valorTotalInvestido)} />
        <CardResumoEstoque icon={AlertTriangle} label="Itens abaixo do mínimo" valor={itensAbaixoMinimo}
          cor={itensAbaixoMinimo > 0 ? t.danger : t.successText} />
        <CardResumoEstoque icon={TrendingUp} label="Giro estimado"
          valor={giroEstimado !== null ? `${giroEstimado.toFixed(1)}x/mês` : "—"}
          sub="saídas dos últimos 30 dias ÷ saldo atual" />
      </div>

      <div className="rounded-2xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold" style={{ color: t.text }}>Produtos para revenda</p>
          {!criandoProduto && (
            <button onClick={() => setCriandoProduto(true)} className="btn-press inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1.5" style={{ color: t.primaryText, background: t.primarySoft }}>
              <Plus size={13} /> novo produto
            </button>
          )}
        </div>

        {criandoProduto && (
          <div className="mb-3">
            <FormularioProdutoRevenda onSalvar={salvarProduto} onCancelar={() => setCriandoProduto(false)} />
          </div>
        )}

        {produtos.length === 0 && !criandoProduto ? (
          <p className="text-xs text-center py-6" style={{ color: t.textMuted }}>Nenhum produto de revenda cadastrado ainda.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {produtos.map((p) =>
              editandoId === p.id ? (
                <FormularioProdutoRevenda key={p.id} produtoExistente={p} onSalvar={salvarProduto} onCancelar={() => setEditandoId(null)} />
              ) : (
                <CardProdutoRevenda key={p.id} produto={p}
                  onEditar={() => setEditandoId(p.id)}
                  onExcluir={() => excluirProduto(p.id, p.nome)}
                  onMovimentar={(mov) => registrarMovimento(p, mov)}
                />
              )
            )}
          </div>
        )}
      </div>

      <EstoqueInsumosInternos negocio={negocio} onSalvarNegocio={onSalvarNegocio} />
    </div>
  );
}
