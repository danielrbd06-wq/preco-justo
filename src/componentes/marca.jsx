/* Logotipo do Preço Justo (símbolo e nome). */
import { useT } from "../tema.js";

/* ======================================================================= */
/* Logo — marca original: cérebro fundido a etiqueta de preço com check,   */
/* traço em gradiente roxo→azul→verde                                      */
/* ======================================================================= */
export function LogoMark({ size = 40 }) {
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

export function LogoWordmark({ stacked = false, size = "text-2xl" }) {
  const t = useT();
  return (
    // data-logotipo: cores da marca; logotipo é exceção da regra de contraste (WCAG 1.4.3).
    <div className={stacked ? "text-center" : ""} style={{ lineHeight: 1.05 }} data-logotipo="">
      <span className={`font-poppins font-bold ${size}`} style={{ color: t.text, display: stacked ? "block" : "inline" }}>
        Preço
      </span>
      {stacked ? <br /> : " "}
      <span className={`font-poppins font-bold ${size}`} style={{ color: t.success, display: stacked ? "block" : "inline" }}>
        Justo
      </span>
    </div>
  );
}
