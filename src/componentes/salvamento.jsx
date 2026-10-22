/* Para não perder trabalho: salvar sozinho, rascunhos, aviso de não salvo,
   cópia de segurança e o lembrete de cópia. */
import { AlertTriangle, CheckCircle2, Clock3, Download, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  EVENTO_SALVAR_PENDENTES,
  excluirComFallback,
  lerComFallback,
  lerRascunho,
  listarComFallback,
  salvarComFallback,
} from "../armazenamento.js";
import { montarCopia, nomeArquivoCopia, textoUltimaCopia } from "../copiaSeguranca.js";
import { useT } from "../tema.js";
import { VERSAO_APP } from "../versao.js";
import { Girando } from "./base.jsx";

/* Cópia de segurança (Bloco 9): baixar um arquivo com todos os dados do app */
/* e restaurar a partir dele. Os dados só existem neste aparelho; sem cópia, */
/* limpar os dados do navegador ou trocar de celular apaga tudo.             */
/* Gera e baixa o arquivo da cópia de segurança. Usada em Negócio → Cópia de */
/* segurança e antes de "Apagar todos os dados" (Bloco 12).                 */
export async function baixarCopiaSeguranca() {
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
  a.href = url;
  a.download = nomeArquivoCopia(agora);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return agora;
}

/* ======================================================================= */
/* Aba: Negócio                                                            */
/* ======================================================================= */
/* Aviso de alterações não salvas: mostra banner dentro do formulário e   */
/* avisa o navegador antes de fechar/recarregar com edição pendente — pra */
/* nunca parecer que "não salvou" quando na verdade só faltou clicar.     */
export function useAvisoNaoSalvo(sujo) {
  useEffect(() => {
    if (!sujo) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [sujo]);
}
export function BannerNaoSalvo({ sujo, aoSalvarLabel = "Salvar" }) {
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
export function useAutoSalvar(rascunho, valorSalvo, onSalvar, { ativo = true, delayMs = 1200 } = {}) {
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
    if (!ativo || rascunhoStr === salvoStr) {
      pendenteRef.current = false;
      setStatus("salvo");
      return undefined;
    }
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
    const aoEsconder = () => {
      if (document.visibilityState === "hidden") descarregar();
    };
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
export function IndicadorAutoSalvar({ status }) {
  const t = useT();
  if (status === "pendente") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: t.textMuted }}>
        <Clock3 size={12} /> alterações pendentes…
      </span>
    );
  }
  if (status === "salvando") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: t.textMuted }}>
        salvando…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: t.textMuted }}>
      <CheckCircle2 size={12} style={{ color: t.successText }} /> salvo
    </span>
  );
}

/* Rascunho de formulário com botão "Salvar" (Bloco 9; virou hook no Bloco 13). */
/* Ao montar, lê o rascunho guardado em `chave` e entrega a `aoRecuperar`, que  */
/* aplica os valores (ou devolve false se o rascunho não é deste formulário).   */
/* A cada mudança de `estado`, grava; se o estado volta ao inicial, apaga.      */
/* `ativo: false` pausa a gravação; `dispensarAviso` esconde o aviso sem apagar.*/
/* Salvar e cancelar devem chamar `descartar`.                                  */
export function useRascunho(chave, estado, { aoRecuperar, ativo = true } = {}) {
  const [recuperado, setRecuperado] = useState(false);
  const estadoStr = JSON.stringify(estado);
  const inicialRef = useRef(estadoStr);
  const lidoRef = useRef(false);
  const alteradoRef = useRef(false); // a pessoa já digitou antes de a leitura terminar
  const aoRecuperarRef = useRef(aoRecuperar);
  aoRecuperarRef.current = aoRecuperar;
  useEffect(() => {
    let vivo = true;
    lerRascunho(chave).then((d) => {
      if (!vivo) return;
      lidoRef.current = true;
      // O que foi digitado agora vale mais que um rascunho antigo.
      if (d && !alteradoRef.current && aoRecuperarRef.current?.(d) !== false) setRecuperado(true);
    });
    return () => {
      vivo = false;
    };
  }, [chave]);
  useEffect(() => {
    // ativo=false (ex.: editando um serviço já salvo): não grava nem apaga o rascunho.
    if (!ativo) return;
    if (estadoStr === inicialRef.current) {
      if (lidoRef.current) {
        excluirComFallback(chave);
        setRecuperado(false);
      }
      return;
    }
    alteradoRef.current = true;
    salvarComFallback(chave, estadoStr);
  }, [chave, estadoStr, ativo]);
  const descartar = useCallback(() => {
    excluirComFallback(chave);
    setRecuperado(false);
  }, [chave]);
  const dispensarAviso = useCallback(() => setRecuperado(false), []);
  return { recuperado, descartar, dispensarAviso };
}

export function AvisoRascunhoRecuperado({ children = "Recuperamos o que você estava digitando. Confira e salve." }) {
  const t = useT();
  return (
    <div
      className="pop-in flex items-start gap-1.5 rounded-xl p-2.5 text-xs"
      role="status"
      style={{ background: t.successSoft, color: t.successText }}
    >
      <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

/* Lembrete de cópia de segurança depois de salvar o fechamento do mês (Bloco 13). */
export function LembreteCopia({ onFechar }) {
  const t = useT();
  const [ultima, setUltima] = useState(undefined);
  const [baixando, setBaixando] = useState(false);
  const [baixada, setBaixada] = useState(false);
  useEffect(() => {
    lerComFallback("app:ultima-copia").then((v) => setUltima(v || null));
  }, []);
  const baixar = async () => {
    setBaixando(true);
    await baixarCopiaSeguranca();
    setBaixando(false);
    setBaixada(true);
    setTimeout(onFechar, 2200);
  };
  return (
    <div role="status" className="pop-in rounded-xl p-3 space-y-2 text-xs" style={{ background: t.primarySoft, color: t.text }}>
      <p className="font-semibold flex items-center gap-1.5" style={{ color: t.primaryText }}>
        <ShieldCheck size={14} className="shrink-0" /> Fechamento salvo. Que tal guardar uma cópia?
      </p>
      <p>
        Se o aparelho for limpo ou trocado, é a cópia de segurança que traz seus fechamentos de volta.
        {ultima !== undefined && ` ${textoUltimaCopia(ultima)}`}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={baixar}
          disabled={baixando || baixada}
          className="btn-press inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
          style={{ background: t.primaryText, color: t.onPrimary, opacity: baixando ? 0.85 : 1 }}
        >
          {baixando ? <Girando /> : baixada ? <CheckCircle2 size={14} className="pop-in" /> : <Download size={14} />}
          {baixando ? "Baixando…" : baixada ? "Cópia baixada" : "Baixar cópia agora"}
        </button>
        {!baixada && (
          <button
            type="button"
            onClick={onFechar}
            disabled={baixando}
            className="btn-press rounded-lg px-3 py-2 text-xs font-medium"
            style={{ color: t.textMuted }}
          >
            Agora não
          </button>
        )}
      </div>
    </div>
  );
}
