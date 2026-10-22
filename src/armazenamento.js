/* Onde o app guarda os dados no aparelho: armazenamento do navegador com
   cópia local, fila de pendentes, rascunhos e o apagar tudo (Bloco 12). */
import { CHAVE_ACEITE, chavesDoApp } from "./termos.js";

/* ======================================================================= */
/* Utilitários                                                             */
/* ======================================================================= */
export const uid = () => Math.random().toString(36).slice(2, 10);

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
  try {
    window.localStorage.setItem(PREFIXO_CACHE_LOCAL + key, value);
  } catch {
    /* sem localStorage disponível — nada a fazer, silencioso */
  }
}
export function lerAceiteGuardado() {
  try {
    return window.localStorage.getItem(CHAVE_ACEITE);
  } catch {
    return null;
  }
}
function lerCacheLocal(key) {
  try {
    return window.localStorage.getItem(PREFIXO_CACHE_LOCAL + key);
  } catch {
    return null;
  }
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
export function salvarComFallback(key, value) {
  salvarCacheLocal(key, value);
  comRetry(() => window.storage.set(key, value)).catch(() => {
    filaPendente = [...filaPendente.filter((f) => f.key !== key), { key, value, tipo: "set" }];
  });
}

/* Exclui com o mesmo espírito: some do cache local na hora, e se o storage */
/* oficial não confirmar agora, tenta de novo sozinho depois.               */
export function excluirComFallback(key) {
  try {
    window.localStorage.removeItem(PREFIXO_CACHE_LOCAL + key);
  } catch {}
  comRetry(() => window.storage.delete(key, false)).catch(() => {
    filaPendente = [...filaPendente.filter((f) => f.key !== key), { key, tipo: "delete" }];
  });
}

/* Lê com fallback: tenta o storage oficial; se falhar, usa o cache local   */
/* mais recente em vez de propagar o erro pra quem chamou.                  */
export async function lerComFallback(key) {
  try {
    const r = await comRetry(() => window.storage.get(key, false));
    if (r?.value !== undefined) {
      salvarCacheLocal(key, r.value);
      return r.value;
    }
  } catch {
    /* cai pro cache local abaixo */
  }
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
export async function listarComFallback(prefixo) {
  const chaves = new Set();
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const chaveArmazenada = window.localStorage.key(i);
      if (chaveArmazenada?.startsWith(PREFIXO_CACHE_LOCAL + prefixo)) {
        chaves.add(chaveArmazenada.slice(PREFIXO_CACHE_LOCAL.length));
      }
    }
  } catch {
    /* localStorage indisponível — segue só com o que window.storage.list trouxer, se trouxer */
  }
  try {
    const r = await comRetry(() => window.storage.list(prefixo, false));
    (r?.keys || []).forEach((k) => {
      chaves.add(k);
    });
  } catch {
    /* window.storage só existe dentro do Claude — fora dele, o cache local acima já resolve */
  }
  return Array.from(chaves);
}

/* Bloco 9: evento disparado antes de o app recarregar para a versão nova e  */
/* antes de baixar a cópia de segurança. Quem tem algo esperando para ser    */
/* salvo escuta e salva na hora.                                             */
export const EVENTO_SALVAR_PENDENTES = "preco-justo:salvar-pendentes";

/* Rascunhos (Bloco 9): o que está sendo digitado num formulário que ainda   */
/* não foi salvo (serviço novo, fechamento do mês) fica guardado no          */
/* aparelho, para sobreviver à troca de aba, ao recarregar e à atualização. */
export const CHAVE_RASCUNHO_SERVICO = "rascunho:servico-novo";
export const chaveRascunhoFechamento = (mes) => `rascunho:fechamento:${mes}`;
export async function lerRascunho(chave) {
  const texto = await lerComFallback(chave);
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

/* Remove tudo o que o app guardou neste aparelho, inclusive o aceite. */
export async function apagarTodosOsDados() {
  filaPendente = [];
  if (window.storage?.delete) {
    for (const chave of await listarComFallback("")) {
      try {
        await window.storage.delete(chave, false);
      } catch {
        /* segue apagando o resto */
      }
    }
  }
  try {
    const todas = [];
    for (let i = 0; i < window.localStorage.length; i++) todas.push(window.localStorage.key(i));
    chavesDoApp(todas).forEach((chave) => {
      window.localStorage.removeItem(chave);
    });
  } catch {
    /* localStorage indisponível: não há o que apagar */
  }
}
