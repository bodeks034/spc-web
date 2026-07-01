import { useMemo, useState } from "react";
import {
  generisiNacrt8d,
  saberiKontekst8dAtributivne,
  saberiKontekst8dInteligencija,
  saberiKontekst8dMerljive,
} from "../../lib/spcAsistent8d.js";
import { mozeInteligencijaProcesa } from "../../lib/uloge.js";

/**
 * Dugme „Generiši nacrt 8D“ — Faza 1 (šablon iz analitike).
 * @param {"dashboard"|"inteligencija"|"merljive"} izvor
 */
export default function SpcAsistent8dDugme({
  C,
  korisnik,
  izvor = "dashboard",
  disabled,
  onOtvori8D,
  addToast,
  kompakt = false,
  dashboardProps,
  inteligencijaProps,
  merljiveProps,
}) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);

  const moze = mozeInteligencijaProcesa(korisnik?.uloga);

  const kontekst = useMemo(() => {
    if (izvor === "inteligencija" && inteligencijaProps) {
      return saberiKontekst8dInteligencija(inteligencijaProps);
    }
    if (izvor === "merljive" && merljiveProps) {
      return saberiKontekst8dMerljive(merljiveProps);
    }
    if (izvor === "dashboard" && dashboardProps) {
      return saberiKontekst8dAtributivne(dashboardProps);
    }
    return null;
  }, [izvor, dashboardProps, inteligencijaProps, merljiveProps]);

  const mozeGenerisati = !!(kontekst?.idDeo && (
    kontekst.kpi?.ukN > 0
    || kontekst.inteligencija?.ukupnoStanje
    || kontekst.pareto?.length
  ));

  const generisi = async () => {
    if (!onOtvori8D) {
      addToast?.("8D modul nije dostupan.", "greska");
      return;
    }
    if (!kontekst?.idDeo) {
      addToast?.("Izaberite deo pre generisanja 8D.", "greska");
      return;
    }
    setBusy(true);
    try {
      const nacrt = await generisiNacrt8d(kontekst);
      setPreview(nacrt);
    } catch (e) {
      addToast?.(e.message || "Greška pri generisanju", "greska");
    } finally {
      setBusy(false);
    }
  };

  const otvori8d = () => {
    if (!preview) return;
    onOtvori8D(preview);
    setPreview(null);
    addToast?.("Nacrt 8D otvoren — proverite i dopunite pre snimanja.", "uspeh");
  };

  if (!moze) return null;

  const btnStyle = kompakt ? {
    background: C.plava + "18",
    border: `1px solid ${C.plava}55`,
    borderRadius: 6,
    color: C.plava,
    fontSize: 9,
    fontWeight: 700,
    padding: "4px 10px",
    cursor: disabled || !mozeGenerisati ? "not-allowed" : "pointer",
    opacity: disabled || !mozeGenerisati ? 0.5 : 1,
    fontFamily: "inherit",
  } : {
    background: disabled || !mozeGenerisati ? C.hover : "#0d9488",
    border: "none",
    borderRadius: 6,
    color: disabled || !mozeGenerisati ? C.sivi : "#fff",
    fontSize: 11,
    fontWeight: 700,
    padding: "7px 14px",
    cursor: disabled || !mozeGenerisati ? "not-allowed" : "pointer",
    fontFamily: "inherit",
  };

  return (
    <>
      <button
        type="button"
        onClick={generisi}
        disabled={disabled || busy || !mozeGenerisati}
        title={!kontekst?.idDeo ? "Izaberite deo" : "Faza 1 — šablonski nacrt iz SPC analitike"}
        style={btnStyle}
      >
        {busy ? "…" : kompakt ? "8D nacrt" : "Generiši nacrt 8D"}
      </button>

      {preview && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, padding: 16,
        }}>
          <div style={{
            background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12,
            maxWidth: 520, width: "100%", maxHeight: "85vh", overflow: "auto",
            padding: "18px 20px", boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
          }}>
            <div style={{ color: C.tekst, fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
              Nacrt 8D — pregled (Faza 1)
            </div>
            <div style={{ color: C.sivi, fontSize: 10, lineHeight: 1.5, marginBottom: 14 }}>
              Automatski generisano iz SPC podataka. D2–D8 će biti popunjeni u editoru;
              obavezno dopunite D4 (5-Why) i odgovorne u D6 pre slanja.
            </div>
            <div style={{
              background: C.bg, borderRadius: 8, padding: 12, fontSize: 10,
              color: C.tekst, lineHeight: 1.55, marginBottom: 14,
            }}>
              <div><strong>Deo:</strong> {preview.id_deo}</div>
              <div style={{ marginTop: 6 }}><strong>Rezime:</strong> {preview._asistent?.rezime || "—"}</div>
              {preview._asistent?.sablonId && (
                <div style={{ marginTop: 4, color: C.sivi, fontSize: 9 }}>
                  ID šablona: {preview._asistent.sablonId}
                  {preview._asistent.sablonIzvor?.includes("osmd_izvestaji") ? " · iz baze (snimljen 8D)" : ""}
                  {preview._asistent.izUvoznogJson && !preview._asistent.sablonIzvor?.includes("osmd_izvestaji")
                    ? " · iz Word/JSON arhive" : ""}
                </div>
              )}
              {preview._asistent?.sablon && (
                <div style={{ marginTop: 6, color: C.plava }}>
                  Troubleshooting šablon: {preview._asistent.sablon}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setPreview(null)}
                style={{
                  background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
                  color: C.sivi, fontSize: 12, padding: "10px 16px", cursor: "pointer",
                }}>
                Otkaži
              </button>
              <button type="button" onClick={otvori8d}
                style={{
                  background: C.plava, border: "none", borderRadius: 8,
                  color: "#fff", fontSize: 12, fontWeight: 700, padding: "10px 18px", cursor: "pointer",
                }}>
                Otvori u 8D editoru →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
