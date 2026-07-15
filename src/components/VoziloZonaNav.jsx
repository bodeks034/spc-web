import { VOZILO_ZONE, VOZILO_DIAGRAM_SRC } from "../lib/voziloZoneConfig.js";

const VB_W = 682;
const VB_H = 520;

/** Civilni hamer (HUMMER-stil) — ugrađena silueta; ne zavisi od učitavanja fajla. */
function HamBodyDetailed() {
  return (
    <g aria-hidden="true" shapeRendering="geometricPrecision">
      <rect x="95" y="248" width="470" height="88" rx="6" fill="#cfcbc2" stroke="#5a5854" strokeWidth="1.5" />
      <path d="M175 248 L195 155 L420 155 L465 248 Z" fill="#e4e1d8" stroke="#5a5854" strokeWidth="1.5" />
      <path d="M205 245 L220 168 L285 168 L295 245 Z" fill="#b9d4e4" stroke="#6a8fa8" strokeWidth="1" opacity="0.85" />
      <path d="M305 245 L315 168 L400 168 L420 245 Z" fill="#b9d4e4" stroke="#6a8fa8" strokeWidth="1" opacity="0.75" />
      <path d="M95 248 L110 210 L175 205 L175 248 Z" fill="#d8d4cb" stroke="#5a5854" strokeWidth="1.3" />
      <rect x="88" y="255" width="22" height="52" rx="3" fill="#b8b4ab" stroke="#5a5854" strokeWidth="1.1" />
      <line x1="93" y1="268" x2="105" y2="268" stroke="#5a5854" strokeWidth="1.2" />
      <line x1="93" y1="280" x2="105" y2="280" stroke="#5a5854" strokeWidth="1.2" />
      <line x1="93" y1="292" x2="105" y2="292" stroke="#5a5854" strokeWidth="1.2" />
      <path d="M465 248 L490 215 L550 220 L565 248 Z" fill="#d8d4cb" stroke="#5a5854" strokeWidth="1.3" />
      <rect x="552" y="255" width="20" height="50" rx="3" fill="#b8b4ab" stroke="#5a5854" strokeWidth="1.1" />
      <circle cx="540" cy="232" r="16" fill="#e8e6df" stroke="#5a5854" strokeWidth="1.2" />
      <circle cx="540" cy="232" r="8" fill="#cfcbc2" stroke="#5a5854" strokeWidth="0.8" />
      <rect x="210" y="142" width="200" height="10" rx="2" fill="#b8b4ab" stroke="#5a5854" strokeWidth="1" />
      <line x1="230" y1="142" x2="230" y2="155" stroke="#5a5854" strokeWidth="1.2" />
      <line x1="390" y1="142" x2="390" y2="155" stroke="#5a5854" strokeWidth="1.2" />
      <circle cx="195" cy="355" r="52" fill="#f0eee6" stroke="#5a5854" strokeWidth="1.7" />
      <circle cx="195" cy="355" r="34" fill="#d8d4cb" stroke="#6a6864" strokeWidth="1.1" />
      <circle cx="195" cy="355" r="12" fill="#8a8780" />
      <circle cx="470" cy="355" r="52" fill="#f0eee6" stroke="#5a5854" strokeWidth="1.7" />
      <circle cx="470" cy="355" r="34" fill="#d8d4cb" stroke="#6a6864" strokeWidth="1.1" />
      <circle cx="470" cy="355" r="12" fill="#8a8780" />
      <line x1="60" y1="408" x2="620" y2="408" stroke="rgba(31,30,29,0.15)" strokeWidth="0.8" />
      <text x="341" y="490" textAnchor="middle" fill="#8a8780" fontSize="11" fontFamily="system-ui, sans-serif">
        HAM — civilni hamer
      </text>
    </g>
  );
}

/** Kutijasta silueta samo za staro ham.svg; PNG ide kao prava foto. */
function jeHamVektorskiFallback(src) {
  const s = String(src || "").toLowerCase().replace(/\\/g, "/");
  return s.includes("ham.svg");
}

/** Oštar vektorski crtež limuzine — ne koristi raster, skalira se bez mutnoće. */
function CarBodyDetailed() {
  return (
    <g aria-hidden="true" shapeRendering="geometricPrecision">
      <ellipse cx="341" cy="392" rx="280" ry="14" fill="rgba(0,0,0,0.06)" />

      {/* donji deo karoserije */}
      <path
        d="M88 278 L98 268 L118 262 L540 262 L558 268 L568 278 L568 318 L88 318 Z"
        fill="#e8e6df"
        stroke="#5a5854"
        strokeWidth="1.4"
      />
      {/* blatobrani */}
      <path d="M155 318 Q155 298 200 295 Q245 292 200 318 Z" fill="#dddad2" stroke="#5a5854" strokeWidth="1" />
      <path d="M405 318 Q405 295 450 295 Q495 292 450 318 Z" fill="#dddad2" stroke="#5a5854" strokeWidth="1" />

      {/* hauba */}
      <path d="M88 278 Q105 248 155 238 L200 278 Z" fill="#eceae3" stroke="#5a5854" strokeWidth="1.2" />
      {/* gepek */}
      <path d="M460 278 L505 238 Q548 248 568 278 Z" fill="#eceae3" stroke="#5a5854" strokeWidth="1.2" />

      {/* kabina / krov */}
      <path
        d="M200 278 L215 198 Q260 168 340 162 Q420 168 465 198 L480 278 Z"
        fill="#eceae3"
        stroke="#5a5854"
        strokeWidth="1.4"
      />

      {/* vetrobransko */}
      <path
        d="M215 275 Q248 210 290 195 L395 195 Q438 210 470 275 Z"
        fill="#b8d4e8"
        stroke="#6a8fa8"
        strokeWidth="1"
        opacity="0.85"
      />
      {/* B stub */}
      <line x1="340" y1="195" x2="340" y2="275" stroke="#8a8880" strokeWidth="1.2" />
      {/* zadnje bočno staklo */}
      <path d="M350 200 Q390 188 430 205 L445 275 L350 275 Z" fill="#c5dce8" stroke="#6a8fa8" strokeWidth="0.9" opacity="0.75" />

      {/* farovi */}
      <ellipse cx="108" cy="292" rx="14" ry="10" fill="#fff8dc" stroke="#c4a035" strokeWidth="1" />
      <ellipse cx="108" cy="292" rx="8" ry="5" fill="#ffe566" opacity="0.7" />
      {/* stop svetla */}
      <rect x="548" y="282" width="16" height="22" rx="3" fill="#cc3333" stroke="#881111" strokeWidth="0.8" />
      <rect x="552" y="286" width="8" height="14" rx="2" fill="#ff5555" opacity="0.8" />

      {/* vrata — linije */}
      <line x1="248" y1="278" x2="248" y2="318" stroke="#8a8880" strokeWidth="1" />
      <line x1="340" y1="278" x2="340" y2="318" stroke="#8a8880" strokeWidth="1" />
      <line x1="430" y1="278" x2="430" y2="318" stroke="#8a8880" strokeWidth="1" />
      {/* kvake */}
      {[248, 340, 430].map(x => (
        <rect key={x} x={x + 18} y="296" width="16" height="4" rx="2" fill="#888" />
      ))}

      {/* retrovizor */}
      <ellipse cx="208" cy="248" rx="8" ry="5" fill="#555" />
      <line x1="200" y1="248" x2="215" y2="255" stroke="#555" strokeWidth="1.5" />

      {/* branici */}
      <rect x="84" y="308" width="22" height="14" rx="4" fill="#d5d2ca" stroke="#5a5854" strokeWidth="0.9" />
      <rect x="576" y="308" width="22" height="14" rx="4" fill="#d5d2ca" stroke="#5a5854" strokeWidth="0.9" />

      {/* točkovi */}
      {[[200, 335], [450, 335]].map(([cx, cy]) => (
        <g key={cx}>
          <circle cx={cx} cy={cy} r="44" fill="#2a2a2a" stroke="#111" strokeWidth="2" />
          <circle cx={cx} cy={cy} r="36" fill="#3d3d3d" stroke="#222" strokeWidth="1" />
          <circle cx={cx} cy={cy} r="22" fill="#888" stroke="#666" strokeWidth="1" />
          {[0, 60, 120, 180, 240, 300].map(deg => {
            const rad = (deg * Math.PI) / 180;
            return (
              <line
                key={deg}
                x1={cx}
                y1={cy}
                x2={cx + Math.cos(rad) * 20}
                y2={cy + Math.sin(rad) * 20}
                stroke="#aaa"
                strokeWidth="2"
              />
            );
          })}
          <circle cx={cx} cy={cy} r="6" fill="#ccc" />
        </g>
      ))}

      {/* prag / niska linija */}
      <line x1="120" y1="318" x2="530" y2="318" stroke="#9a9890" strokeWidth="0.8" />

      {/* linija tla */}
      <line x1="50" y1="382" x2="632" y2="382" stroke="rgba(40,40,38,0.2)" strokeWidth="1" />
    </g>
  );
}

function ZonaLegenda({ zona, aktivan, onClick, jasanOverlay = false }) {
  const { legenda: lg, boja, bojaPozadina, bojaTekst, id, naziv } = zona;
  const cx = lg.x + lg.w / 2;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${naziv} (${id})`}
      aria-pressed={aktivan}
      onClick={() => onClick(zona.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(zona.id);
        }
      }}
      style={{ cursor: "pointer" }}
    >
      <rect
        x={lg.x}
        y={lg.y}
        width={lg.w}
        height={lg.h}
        rx={6}
        fill={aktivan ? bojaPozadina : (jasanOverlay ? "rgba(255,255,255,0.88)" : "#fff")}
        stroke={boja}
        strokeWidth={aktivan ? 2.2 : jasanOverlay ? 1.6 : 0.8}
      />
      <text x={cx} y={lg.y + 17} textAnchor="middle" fill={bojaTekst} fontSize={11} fontWeight={600}>
        {id}
      </text>
      <text x={cx} y={lg.y + 32} textAnchor="middle" fill={boja} fontSize={10} fontWeight={600}>
        {naziv}
      </text>
    </g>
  );
}

function ZonaHotspot({ zona, aktivan, onClick, jasanOverlay = false }) {
  const { hotspot, boja, kratko } = zona;
  const r = hotspot.r + (jasanOverlay ? 3 : 0) + (aktivan ? 3 : 0);

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={zona.naziv}
      aria-pressed={aktivan}
      onClick={() => onClick(zona.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(zona.id);
        }
      }}
      style={{ cursor: "pointer" }}
    >
      {jasanOverlay && (
        <circle
          cx={hotspot.cx}
          cy={hotspot.cy}
          r={r + 1.5}
          fill="#fff"
          opacity={0.65}
          stroke="none"
        />
      )}
      <circle
        cx={hotspot.cx}
        cy={hotspot.cy}
        r={r}
        fill={boja}
        opacity={aktivan ? 0.5 : jasanOverlay ? 0.38 : 0.18}
        stroke={jasanOverlay ? "#fff" : boja}
        strokeWidth={aktivan ? 2.2 : jasanOverlay ? 1.8 : 1.2}
      />
      <text
        x={hotspot.cx}
        y={hotspot.cy + (kratko === "F" ? 4 : 5)}
        textAnchor="middle"
        fill={jasanOverlay ? "#fff" : boja}
        fontSize={jasanOverlay ? 13 : (kratko === "F" ? 11 : 12)}
        fontWeight={700}
        stroke={jasanOverlay ? "rgba(0,0,0,0.25)" : "none"}
        strokeWidth={0.35}
        paintOrder="stroke fill"
        style={{ pointerEvents: "none" }}
      >
        {kratko}
      </text>
    </g>
  );
}

function ZonaChips({ izabranaZona, onZonaChange, C }) {
  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      padding: "10px 12px",
      borderTop: `1px solid ${C?.border || "#333"}`,
      background: C?.panel || "#1a1a2e",
    }}>
      {VOZILO_ZONE.map(z => {
        const aktivan = izabranaZona === z.id;
        return (
          <button
            key={z.id}
            type="button"
            onClick={() => onZonaChange(z.id)}
            style={{
              background: aktivan ? `${z.boja}22` : "transparent",
              border: `2px solid ${aktivan ? z.boja : (C?.border || "#444")}`,
              borderRadius: 10,
              color: aktivan ? z.boja : (C?.tekst || "#eee"),
              fontSize: 13,
              fontWeight: aktivan ? 700 : 500,
              padding: "10px 14px",
              cursor: "pointer",
            }}
          >
            {z.naziv}
          </button>
        );
      })}
    </div>
  );
}

function resolveDiagramSrc(diagramSrc) {
  const src = diagramSrc ?? VOZILO_DIAGRAM_SRC;
  if (!src) return { src: null, isPhoto: false };
  const isPhoto = /\.(png|jpe?g|webp|svg)$/i.test(src);
  return { src, isPhoto };
}

/**
 * @param {"kompakt"|"veliki"|"default"} [props.velicina]
 */
export default function VoziloZonaNav({
  izabranaZona = null,
  onZonaChange,
  diagramSrc,
  diagramLoading = false,
  kompakt = false,
  veliki = false,
  velicina,
  C,
}) {
  const size = velicina || (veliki ? "veliki" : kompakt ? "kompakt" : "default");
  const isVeliki = size === "veliki";
  const isKompakt = size === "kompakt";
  /** PNG hamera kao foto; kutijasti vektor samo ako je još vezan stari ham.svg. */
  const ugradjeniHam = jeHamVektorskiFallback(diagramSrc);
  const { src: bgSrc, isPhoto } = resolveDiagramSrc(ugradjeniHam ? null : diagramSrc);
  const jasanOverlay = isPhoto;

  const border = C?.border || "rgba(255,255,255,0.12)";
  const panel = C?.panel || "#1a1a2e";
  const sivi = C?.sivi || "#888";
  const plava = C?.plava || "#3b82f6";
  const markerId = `vzn-arrow-${size}`;

  return (
    <div style={{
      background: panel,
      border: `1px solid ${border}`,
      borderRadius: isVeliki ? 14 : isKompakt ? 10 : 12,
      overflow: "hidden",
      height: isVeliki ? "100%" : "auto",
      minHeight: isVeliki ? "min(calc(100vh - 130px), 480px)" : undefined,
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{
        padding: isVeliki ? "10px 14px" : isKompakt ? "6px 10px" : "8px 12px",
        borderBottom: `1px solid ${border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
      }}>
        <span style={{
          color: plava,
          fontSize: isVeliki ? 12 : isKompakt ? 10 : 11,
          fontWeight: 700,
          letterSpacing: 0.6,
        }}>
          {isVeliki ? "🚗 KONTROLA CELOG VOZILA — izaberi zonu" : "ZONA KONTROLE"}
        </span>
        {izabranaZona ? (
          <span style={{ color: sivi, fontSize: isVeliki ? 11 : isKompakt ? 9 : 10 }}>
            {VOZILO_ZONE.find(z => z.id === izabranaZona)?.naziv}
          </span>
        ) : (
          <span style={{ color: sivi, fontSize: isVeliki ? 11 : isKompakt ? 9 : 10 }}>
            Klikni zonu na dijagramu
          </span>
        )}
      </div>

      <div style={{
        flex: isVeliki ? "1 1 auto" : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isVeliki ? "8px 12px" : 0,
        minHeight: isVeliki ? 220 : undefined,
        overflow: "hidden",
        background: "#f4f3ee",
      }}>
        <div style={{
          position: "relative",
          width: "100%",
          maxWidth: "100%",
          aspectRatio: `${VB_W} / ${VB_H}`,
          maxHeight: isVeliki ? "min(72vh, 560px)" : undefined,
        }}>
          {isPhoto && bgSrc && (
            <img
              src={bgSrc}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
                pointerEvents: "none",
                imageRendering: "auto",
                zIndex: 0,
              }}
            />
          )}

          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            role="img"
            aria-label="Dijagram zona kvalitetne kontrole vozila"
            shapeRendering="geometricPrecision"
            textRendering="geometricPrecision"
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              display: "block",
              background: isPhoto ? "transparent" : "#f4f3ee",
              zIndex: 1,
            }}
            preserveAspectRatio="xMidYMid meet"
          >
          <defs>
            <marker
              id={markerId}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth={jasanOverlay ? 7 : 6}
              markerHeight={jasanOverlay ? 7 : 6}
              orient="auto-start-reverse"
            >
              <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" />
            </marker>
          </defs>

          {ugradjeniHam && !diagramLoading && <HamBodyDetailed />}
          {!ugradjeniHam && !isPhoto && !bgSrc && !diagramLoading && <CarBodyDetailed />}

          {diagramLoading && (
            <g aria-hidden="true">
              <rect x="0" y="0" width={VB_W} height={VB_H} fill="#f4f3ee" />
              <text
                x={VB_W / 2}
                y={VB_H / 2}
                textAnchor="middle"
                fill="#888"
                fontSize="14"
                fontFamily="system-ui, sans-serif"
              >
                Učitavam dijagram…
              </text>
            </g>
          )}

          {VOZILO_ZONE.map(z => {
            const aktivna = izabranaZona === z.id;
            const x1 = z.legenda.strana === "levo" ? z.legenda.x + z.legenda.w : z.legenda.x;
            const y1 = z.legenda.y + z.legenda.h / 2;
            const debljina = aktivna
              ? (jasanOverlay ? 2 : 1.2)
              : (jasanOverlay ? 1.4 : 0.7);
            return (
              <g key={`ln-${z.id}`}>
                {jasanOverlay && (
                  <line
                    x1={x1}
                    y1={y1}
                    x2={z.linijaDo.x}
                    y2={z.linijaDo.y}
                    stroke="#fff"
                    strokeWidth={debljina + 1.8}
                    strokeDasharray="5 4"
                    opacity={aktivna ? 0.7 : 0.5}
                    strokeLinecap="round"
                  />
                )}
                <line
                  x1={x1}
                  y1={y1}
                  x2={z.linijaDo.x}
                  y2={z.linijaDo.y}
                  stroke={z.boja}
                  strokeWidth={debljina}
                  strokeDasharray="5 4"
                  opacity={aktivna ? 0.9 : jasanOverlay ? 0.62 : 0.45}
                  strokeLinecap="round"
                  markerEnd={`url(#${markerId})`}
                />
              </g>
            );
          })}

          {VOZILO_ZONE.map(z => (
            <ZonaHotspot
              key={`hs-${z.id}`}
              zona={z}
              aktivan={izabranaZona === z.id}
              onClick={onZonaChange}
              jasanOverlay={jasanOverlay}
            />
          ))}

          {VOZILO_ZONE.map(z => (
            <ZonaLegenda
              key={`lg-${z.id}`}
              zona={z}
              aktivan={izabranaZona === z.id}
              onClick={onZonaChange}
              jasanOverlay={jasanOverlay}
            />
          ))}

          <text x={340} y={30} textAnchor="middle" fill="#3d3d3a" fontSize={isVeliki ? 15 : 13} fontWeight={500}>
            Kontrola kvaliteta — celo vozilo
          </text>
        </svg>
        </div>
      </div>

      {isVeliki && (
        <ZonaChips izabranaZona={izabranaZona} onZonaChange={onZonaChange} C={C} />
      )}
    </div>
  );
}
