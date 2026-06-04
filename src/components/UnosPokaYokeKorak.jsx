import { useEffect, useMemo, useState } from "react";
import { kalibracijaBlokiraUnos } from "../lib/meriloStatus.js";
import { useEkran } from "../lib/useEkran.js";
import CrtezZoomViewer from "./CrtezZoomViewer.jsx";

const STAVKE_MERLJIVE = [
  { id: "id_rn", label: "ID delo i radni nalog su tačni" },
  { id: "crtrez", label: "Pregledao sam crtež / sliku dela" },
  { id: "instrument", label: "Merni instrument odgovara planu kontrole" },
  { id: "serija", label: "Spreman sam za unos merenja u aktivnoj seriji" },
];

const STAVKE_ATRIBUTIVNE = [
  { id: "id_rn", label: "ID delo i radni nalog su tačni" },
  { id: "crtrez", label: "Pregledao sam crtež i etiketu dela" },
  { id: "lokacija", label: "Linija i mašina su ispravno prikazane" },
  { id: "unos", label: "Spreman sam za OK / NOK unos" },
];

function initChecks(stavke) {
  const o = {};
  for (const s of stavke) o[s.id] = false;
  return o;
}

export default function UnosPokaYokeKorak({
  C,
  modul = "merljive",
  akcent,
  idDeo,
  nazivDela,
  radniNalog,
  linija,
  masina,
  kontrolor,
  grupaAB,
  potrebanBroj,
  kalUpozorenja = [],
  kontrolnaListaOk = true,
  kalibracijaOdobrena = false,
  mozeAdmin = false,
  onToggleKalibracijaOdobrenje,
  urlSlike,
  onDalje,
  onNazad,
  prikaziNazad = false,
  daljeLabel = "Unos merenja →",
}) {
  const ekran = useEkran();
  const usko = ekran.mob || ekran.unosStek || ekran.w < 1100;
  const stavke = modul === "atributivne" ? STAVKE_ATRIBUTIVNE : STAVKE_MERLJIVE;
  const boja = akcent || (modul === "merljive" ? C.zelena : C.plava);
  const [checks, setChecks] = useState(() => initChecks(stavke));
  const [zoomSlika, setZoomSlika] = useState(false);

  useEffect(() => {
    setChecks(initChecks(stavke));
  }, [idDeo, grupaAB, modul]);

  const blokirajucaKal = useMemo(
    () => kalUpozorenja.filter(k => kalibracijaBlokiraUnos(k.status)),
    [kalUpozorenja],
  );

  const sviStavke = stavke.every(s => checks[s.id]);
  const kalBlok = blokirajucaKal.length > 0 && !kalibracijaOdobrena;
  const mozeDalje = sviStavke
    && kontrolnaListaOk !== false
    && (!kalBlok || mozeAdmin);

  const toggle = (id) => setChecks(p => ({ ...p, [id]: !p[id] }));

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      gap: 12,
      width: "100%",
      boxSizing: "border-box",
    }}>
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: usko ? "column" : "row",
        gap: 12,
        minHeight: 0,
        alignItems: "stretch",
        width: "100%",
      }}>
        <div style={{
          flex: urlSlike && !usko ? "1 1 52%" : "1 1 auto",
          background: `${boja}12`,
          border: `1px solid ${boja}55`,
          borderRadius: 10,
          padding: ekran.mob ? "12px 10px" : "14px 16px",
          minHeight: 0,
          minWidth: 0,
          overflowY: "auto",
        }}>
          <div style={{ color: boja, fontSize: 10, letterSpacing: 1.5, marginBottom: 10, fontWeight: 700 }}>
            POKA-YOKE · PROVERA PRE UNOSA
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: usko
              ? "repeat(2, minmax(0, 1fr))"
              : "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 8,
            marginBottom: 14,
            fontSize: 11,
          }}>
            <div><span style={{ color: C.sivi }}>ID: </span><strong style={{ color: boja }}>{idDeo}</strong></div>
            {nazivDela && <div><span style={{ color: C.sivi }}>Deo: </span>{nazivDela}</div>}
            {radniNalog && <div><span style={{ color: C.sivi }}>RN: </span>{radniNalog}</div>}
            {grupaAB && <div><span style={{ color: C.sivi }}>Serija: </span><strong>{grupaAB}</strong></div>}
            {linija && <div><span style={{ color: C.sivi }}>Linija: </span>{linija}</div>}
            {masina && <div><span style={{ color: C.sivi }}>Mašina: </span>{masina}</div>}
            {kontrolor && <div><span style={{ color: C.sivi }}>Kontrolor: </span>{kontrolor}</div>}
            {potrebanBroj && grupaAB && (
              <div><span style={{ color: C.sivi }}>Plan: </span>{potrebanBroj} merenja / kolona</div>
            )}
          </div>

          {kontrolnaListaOk === false && (
            <div style={{ color: C.zuta, fontSize: 11, marginBottom: 10 }}>
              Kontrolna lista smene nije potvrđena — završite je na početku modula.
            </div>
          )}

          {blokirajucaKal.length > 0 && !kalibracijaOdobrena && (
            <div style={{ color: C.crvena, fontSize: 11, marginBottom: 10 }}>
              {blokirajucaKal.some(k => k.status === "istekla") ? "Istekla kalibracija" : "Problem kalibracije"}
              : {blokirajucaKal.map(k => `${k.pozicija} (${k.instrument})`).join(" · ")}
            </div>
          )}

          {mozeAdmin && blokirajucaKal.length > 0 && typeof onToggleKalibracijaOdobrenje === "function" && (
            <div style={{ marginBottom: 12 }}>
              <button
                type="button"
                onClick={onToggleKalibracijaOdobrenje}
                style={{
                  background: kalibracijaOdobrena ? C.zuta : C.crvena,
                  border: "none", borderRadius: 6, color: "#000",
                  fontSize: 11, fontWeight: 700, padding: "8px 14px", cursor: "pointer",
                }}
              >
                {kalibracijaOdobrena
                  ? "✓ Merenje dozvoljeno (ukloni dozvolu)"
                  : "Admin: dozvoli merenje (kalibracija istekla)"}
              </button>
            </div>
          )}

          <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1, marginBottom: 8 }}>
            POTVRDI STAVKE
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stavke.map(s => (
              <label
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  cursor: "pointer",
                  padding: ekran.mob ? "8px 10px" : "10px 12px",
                  background: checks[s.id] ? `${boja}18` : C.input,
                  border: `1px solid ${checks[s.id] ? boja : C.border}`,
                  borderRadius: 8,
                }}
              >
                <input
                  type="checkbox"
                  checked={!!checks[s.id]}
                  onChange={() => toggle(s.id)}
                  style={{ marginTop: 2, accentColor: boja }}
                />
                <span style={{ color: C.tekst, fontSize: ekran.mob ? 11 : 12, lineHeight: 1.45 }}>{s.label}</span>
              </label>
            ))}
          </div>

          {kalUpozorenja.filter(k => k.status === "uskoro").length > 0 && (
            <div style={{ color: C.zuta, fontSize: 10, marginTop: 12 }}>
              Kalibracija uskoro: {kalUpozorenja.filter(k => k.status === "uskoro").map(k => k.instrument).join(", ")}
            </div>
          )}
        </div>

        {urlSlike && (
          <aside style={{
            flex: usko ? "0 0 auto" : "1 1 42%",
            width: usko ? "100%" : undefined,
            minWidth: usko ? 0 : 200,
            maxWidth: "100%",
            display: "flex",
            flexDirection: "column",
            minHeight: usko ? (ekran.mob ? 200 : 240) : 280,
            maxHeight: usko ? (ekran.mob ? 220 : 280) : undefined,
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: 8,
            boxSizing: "border-box",
          }}>
            <div style={{ color: C.sivi, fontSize: 9, marginBottom: 6, textAlign: "center", flexShrink: 0 }}>
              Crtež · zoom · klik = ceo ekran
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <CrtezZoomViewer
                url={urlSlike}
                C={C}
                onFullscreen={() => setZoomSlika(true)}
              />
            </div>
          </aside>
        )}
      </div>

      {zoomSlika && urlSlike && (
        <div
          role="presentation"
          onClick={() => setZoomSlika(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.88)",
            display: "flex", flexDirection: "column", padding: ekran.mob ? 8 : 16,
          }}
        >
          <div
            role="presentation"
            onClick={e => e.stopPropagation()}
            style={{
              flex: 1, background: C.panel, borderRadius: 10, border: `1px solid ${C.border}`,
              padding: 12, minHeight: 0, display: "flex", flexDirection: "column",
            }}
          >
            <CrtezZoomViewer
              url={urlSlike}
              C={C}
              onClose={() => setZoomSlika(false)}
            />
          </div>
        </div>
      )}

      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        paddingTop: 4,
        width: "100%",
      }}>
        {prikaziNazad && typeof onNazad === "function" ? (
          <button
            type="button"
            onClick={onNazad}
            style={{
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.tekst,
              fontSize: 12,
              fontWeight: 600,
              padding: "12px 16px",
              cursor: "pointer",
            }}
          >
            ← Provera
          </button>
        ) : <span />}

        <button
          type="button"
          disabled={!mozeDalje}
          onClick={() => mozeDalje && onDalje?.()}
          title={
            !sviStavke ? "Označite sve stavke"
              : kalBlok && !mozeAdmin ? "Rešite kalibraciju ili admin dozvolu"
              : kontrolnaListaOk === false ? "Završite kontrolnu listu smene"
              : "Pređi na unos merenja"
          }
          style={{
            background: mozeDalje ? boja : C.hover,
            border: "none",
            borderRadius: 8,
            color: mozeDalje ? "#000" : C.sivi,
            fontSize: ekran.mob ? 13 : 14,
            fontWeight: 800,
            padding: ekran.mob ? "12px 20px" : "14px 28px",
            cursor: mozeDalje ? "pointer" : "not-allowed",
            letterSpacing: 0.5,
            marginLeft: "auto",
            width: ekran.mob ? "100%" : undefined,
            boxSizing: "border-box",
          }}
        >
          {daljeLabel}
        </button>
      </div>

      {!mozeDalje && (
        <div style={{ color: C.sivi, fontSize: 10, textAlign: ekran.mob ? "left" : "right" }}>
          {!sviStavke && "Označite sve stavke checkliste. "}
          {kalBlok && !mozeAdmin && "Kalibracija blokira unos. "}
          {kontrolnaListaOk === false && "Potrebna kontrolna lista smene."}
        </div>
      )}
    </div>
  );
}
