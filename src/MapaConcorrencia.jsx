/* ======================================================================= */
/* Mapa da concorrência (Bloco 6) — carregado sob demanda (React.lazy), só  */
/* quando a aba Observatório abre, para o Leaflet não pesar no resto do app. */
/*                                                                         */
/* Base: OpenStreetMap (ruas de todo o Brasil, licença ODbL), com a         */
/* atribuição exigida pela política de uso dos tiles. Os pontos são         */
/* círculos desenhados pelo próprio Leaflet (sem imagens de marcador).      */
/* Nenhum ponto é inventado: só aparecem o local do próprio negócio e os    */
/* concorrentes que o usuário marcou tocando no mapa.                       */
/* ======================================================================= */

import L from "leaflet";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

const ATRIBUICAO = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

function prefereMenosMovimento() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export default function MapaConcorrencia({
  t,
  escuro,
  centro,
  zoom,
  concorrentes,
  meuLocal,
  raioKm,
  selecionadoId,
  marcando,
  onMarcar,
  onSelecionar,
  corDoTipo,
}) {
  const divRef = useRef(null);
  const mapaRef = useRef(null);
  const camadaRef = useRef(null);
  const onMarcarRef = useRef(onMarcar);
  const marcandoRef = useRef(marcando);
  onMarcarRef.current = onMarcar;
  marcandoRef.current = marcando;

  // Cria o mapa uma vez só.
  useEffect(() => {
    const mapa = L.map(divRef.current, { zoomControl: true, attributionControl: true }).setView(centro, zoom);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: ATRIBUICAO }).addTo(mapa);
    mapa.attributionControl.setPrefix(false);
    camadaRef.current = L.layerGroup().addTo(mapa);
    mapa.on("click", (e) => {
      if (marcandoRef.current) onMarcarRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    mapaRef.current = mapa;
    // O cartão pode mudar de largura (giro do celular, painel lateral): reajusta o mapa.
    const ro = new ResizeObserver(() => mapa.invalidateSize());
    ro.observe(divRef.current);
    return () => {
      ro.disconnect();
      mapa.remove();
      mapaRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Troca de cidade: leva o mapa até ela (voo curto; direto se o usuário pede menos movimento).
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    if (prefereMenosMovimento()) mapa.setView(centro, zoom);
    else mapa.flyTo(centro, zoom, { duration: 0.8 });
  }, [centro[0], centro[1], zoom]);

  // Cursor de mira enquanto o usuário escolhe um ponto.
  useEffect(() => {
    divRef.current?.classList.toggle("mapa-marcando", !!marcando);
  }, [marcando]);

  // Redesenha os pontos sempre que os dados mudam.
  useEffect(() => {
    const camada = camadaRef.current;
    if (!camada) return;
    camada.clearLayers();
    if (meuLocal && raioKm) {
      L.circle([meuLocal.lat, meuLocal.lng], {
        radius: raioKm * 1000,
        color: t.primary,
        weight: 1.5,
        dashArray: "6 6",
        fillColor: t.primary,
        fillOpacity: 0.06,
        interactive: false,
      }).addTo(camada);
    }
    concorrentes.forEach((c) => {
      if (c.lat == null || c.lng == null) return;
      const selecionado = c.id === selecionadoId;
      const m = L.circleMarker([c.lat, c.lng], {
        radius: selecionado ? 10 : 7,
        color: escuro ? "#0F172A" : "#FFFFFF",
        weight: 2,
        fillColor: corDoTipo(c.tipo),
        fillOpacity: c.foraDoRaio ? 0.35 : 0.95,
        opacity: c.foraDoRaio ? 0.5 : 1,
      });
      m.bindTooltip(c.nome || "Concorrente", { direction: "top", offset: [0, -6] });
      m.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        if (!marcandoRef.current) onSelecionar?.(c.id);
      });
      m.addTo(camada);
    });
    if (meuLocal) {
      const m = L.circleMarker([meuLocal.lat, meuLocal.lng], {
        radius: 9,
        color: escuro ? "#F5F7FA" : "#0F172A",
        weight: 3,
        fillColor: t.warning,
        fillOpacity: 1,
      });
      m.bindTooltip("Meu negócio", { direction: "top", offset: [0, -8] });
      m.addTo(camada);
    }
  }, [concorrentes, meuLocal, raioKm, selecionadoId, escuro, t, corDoTipo]);

  return (
    // position relative + z-index 0 cria um contexto próprio de empilhamento: os
    // painéis internos do Leaflet (z-index 400 a 1000) não passam por cima da barra
    // de navegação, dos balões de ajuda nem dos painéis do app.
    <div
      ref={divRef}
      className={`mapa-concorrencia${escuro ? " mapa-escuro" : ""}`}
      role="application"
      aria-label="Mapa da concorrência"
      style={{ position: "relative", zIndex: 0, width: "100%", height: "100%", borderRadius: 12, background: t.surfaceAlt }}
    />
  );
}
