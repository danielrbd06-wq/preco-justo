/* Cores do app (claro e escuro) e o acesso a elas pelos componentes (useT). */
import { createContext, useContext } from "react";

/* ======================================================================= */
/* TOKENS — claro e escuro. Hex exatos do brandbook em backgrounds, marca  */
/* e gráficos; duas variantes adicionadas de forma deliberada (ver aviso   */
/* no chat): "danger" (não existia na paleta) e as "*Text" (mesma cor,     */
/* escurecida só o suficiente para passar 4.5:1 como texto pequeno).      */
/* ======================================================================= */
export const TOKENS = {
  claro: {
    bg: "#F5F7FA",
    surface: "#FFFFFF",
    surfaceAlt: "#EEF1F7",
    text: "#0F172A",
    textMuted: "#5B6472",
    border: "#E2E8F0",
    borderStrong: "#CBD5E1",
    shadow: "0 1px 2px rgba(15,23,42,.06), 0 8px 24px rgba(15,23,42,.06)",
    primary: "#7861FF",
    primaryText: "#6247E0",
    primarySoft: "#EFEBFF",
    onPrimary: "#FFFFFF",
    secondary: "#4A90FF",
    secondaryText: "#2E6FE0",
    secondarySoft: "#E8F1FF",
    onSecondary: "#FFFFFF",
    // successText escurecido de #049379 p/ #037A65 (mesmo matiz): o tom original não passava
    // em AA (3.44:1 sobre successSoft, 3.85:1 sobre surface) — medido via fórmula de luminância
    // relativa do WCAG 2.1. Este novo tom passa em ambos (4.73:1 / 5.28:1). Ajuste de token —
    // avisar quem cuida da identidade visual antes de propagar pra outras telas.
    success: "#00CBA7",
    successText: "#037A65",
    successSoft: "#E1F7F2",
    onSuccess: "#0F172A",
    warning: "#FFC857",
    warningText: "#8A6416",
    warningSoft: "#FFF6E2",
    onWarning: "#0F172A",
    danger: "#C23652",
    dangerSoft: "#FCE7EA",
    onDanger: "#FFFFFF",
  },
  escuro: {
    bg: "#0F172A",
    surface: "#151B2E",
    surfaceAlt: "#1B2338",
    text: "#F5F7FA",
    textMuted: "#94A3B8",
    border: "#28304A",
    borderStrong: "#384267",
    shadow: "none",
    primary: "#8F7CFF",
    primaryText: "#B7ACFF",
    primarySoft: "rgba(143,124,255,.16)",
    onPrimary: "#0F172A",
    secondary: "#5FA0FF",
    secondaryText: "#8FBBFF",
    secondarySoft: "rgba(95,160,255,.16)",
    onSecondary: "#0F172A",
    success: "#00E0B8",
    successText: "#00E0B8",
    successSoft: "rgba(0,224,184,.16)",
    onSuccess: "#0F172A",
    warning: "#FFD27A",
    warningText: "#FFD27A",
    warningSoft: "rgba(255,210,122,.16)",
    onWarning: "#0F172A",
    danger: "#FF8FA0",
    dangerSoft: "rgba(255,143,160,.16)",
    onDanger: "#0F172A",
  },
};
export const GRADIENTE = "linear-gradient(135deg, #7861FF, #4A90FF, #00CBA7)";

export const ThemeCtx = createContext(null);
export const useT = () => useContext(ThemeCtx);
