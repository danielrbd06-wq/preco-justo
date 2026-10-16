/* ======================================================================= */
/* Cópia de segurança (Bloco 9) — funções puras, testadas em               */
/* copiaSeguranca.test.js. Os dados do app ficam só no aparelho; a cópia é */
/* um arquivo .json com todas as chaves salvas, para guardar e restaurar   */
/* (inclusive em outro celular ou computador).                             */
/* ======================================================================= */

export const APP_COPIA = "preco-justo";
export const FORMATO_COPIA = 1;
export const TAMANHO_MAXIMO_COPIA = 5 * 1024 * 1024; // 5 MB: muito acima de um uso real

// Só chaves no formato que o próprio app usa ("negocio:config", "servicos:abc123"...).
const CHAVE_VALIDA = /^[a-z][a-z0-9-]*(:[A-Za-z0-9_.-]*)*$/;

const pad2 = (n) => String(n).padStart(2, "0");

export function montarCopia(dados, { versaoApp, agora = new Date() } = {}) {
  return { app: APP_COPIA, formato: FORMATO_COPIA, versaoApp: versaoApp || null, criadaEm: agora.toISOString(), dados };
}

export function nomeArquivoCopia(agora = new Date()) {
  return `preco-justo-copia-${agora.getFullYear()}-${pad2(agora.getMonth() + 1)}-${pad2(agora.getDate())}.json`;
}

export function resumirCopia(dados) {
  const chaves = Object.keys(dados);
  let concorrentes = 0;
  try {
    concorrentes = JSON.parse(dados["observatorio:concorrentes"] || "[]").length || 0;
  } catch {
    concorrentes = 0;
  }
  return {
    temNegocio: Boolean(dados["negocio:config"]),
    servicos: chaves.filter((k) => k.startsWith("servicos:")).length,
    fechamentos: chaves.filter((k) => k.startsWith("fechamento:")).length,
    produtos: chaves.filter((k) => k.startsWith("produto-revenda:")).length,
    concorrentes,
  };
}

/* Lê o texto de um arquivo de cópia. Nunca lança erro: devolve { ok: false, erro } */
/* com a mensagem para mostrar ao usuário, ou { ok: true, dados, resumo, ... }.   */
export function lerCopia(texto) {
  if (typeof texto !== "string" || texto.length === 0) return { ok: false, erro: "O arquivo está vazio." };
  if (texto.length > TAMANHO_MAXIMO_COPIA) return { ok: false, erro: "O arquivo é grande demais para ser uma cópia do Preço Justo." };
  let obj;
  try {
    obj = JSON.parse(texto);
  } catch {
    return { ok: false, erro: 'Não foi possível ler o arquivo. Escolha o arquivo .json baixado em "Baixar cópia".' };
  }
  if (!obj || typeof obj !== "object" || obj.app !== APP_COPIA || !obj.dados || typeof obj.dados !== "object" || Array.isArray(obj.dados)) {
    return { ok: false, erro: "Este arquivo não é uma cópia de segurança do Preço Justo." };
  }
  if (Number(obj.formato) > FORMATO_COPIA) {
    return { ok: false, erro: "Esta cópia foi feita por uma versão mais nova do app. Atualize o app e tente de novo." };
  }
  const dados = {};
  for (const [chave, valor] of Object.entries(obj.dados)) {
    if (typeof valor === "string" && chave.length <= 200 && CHAVE_VALIDA.test(chave)) dados[chave] = valor;
  }
  if (Object.keys(dados).length === 0) return { ok: false, erro: "A cópia não tem nenhum dado para restaurar." };
  return { ok: true, dados, resumo: resumirCopia(dados), criadaEm: obj.criadaEm || null, versaoApp: obj.versaoApp || null };
}

/* Lembrete depois de salvar o fechamento do mês (Bloco 13): diz quando foi a */
/* última cópia baixada. Datas comparadas pelo dia do calendário local.        */
export function textoUltimaCopia(iso, agora = new Date()) {
  const data = iso ? new Date(iso) : null;
  if (!data || Number.isNaN(data.getTime())) return "Você ainda não baixou nenhuma cópia.";
  const dia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dias = Math.round((dia(agora) - dia(data)) / 86400000);
  const dataBR = `${pad2(data.getDate())}/${pad2(data.getMonth() + 1)}/${data.getFullYear()}`;
  if (dias <= 0) return "Sua última cópia é de hoje, mas não tem este fechamento.";
  if (dias === 1) return `Sua última cópia é de ontem (${dataBR}).`;
  return `Sua última cópia é de ${dataBR}, há ${dias} dias.`;
}
