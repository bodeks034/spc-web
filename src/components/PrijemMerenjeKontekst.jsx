import { useEffect, useMemo, useState } from "react";
import {
  aktivirajPrijemZaMerenje,
  fetchDobavljaci,
  syncPrijemnaIzMerenja,
} from "../lib/dobavljaciApi.js";
import { BarkodSkenirajPolje } from "./BarkodKameraSken.jsx";

const storageKey = (modul) => `spc_prijem_kontekst_${modul || "unos"}`;
const minKey = (modul) => `spc_prijem_baner_min_${modul || "unos"}`;

export function ucitajPrijemKontekst(modul) {
  try {
    return JSON.parse(sessionStorage.getItem(storageKey(modul)) || "null");
  } catch {
    return null;
  }
}

export function sacuvajPrijemKontekst(modul, kontekst) {
  if (kontekst) sessionStorage.setItem(storageKey(modul), JSON.stringify(kontekst));
  else sessionStorage.removeItem(storageKey(modul));
}

function sifraIzBarkoda(raw) {
  const tekst = String(raw || "").trim();
  if (!tekst) return "";
  if (tekst.startsWith("{")) {
    try {
      const j = JSON.parse(tekst);
      return String(
        j.sifra_dobavljaca || j.dobavljac || j.supplier || j.vendor
        || j.supplier_code || j.vendor_code || "",
      ).trim().toUpperCase();
    } catch { /* običan tekst */ }
  }
  return (tekst.includes("|") ? tekst.split("|")[0] : tekst).trim().toUpperCase();
}

export default function PrijemMerenjeKontekst({
  C,
  addToast,
  modul,
  idDeo,
  kontekst,
  onKontekst,
  onAktiviran,
  onZatvori,
  kompakt = false,
  rezim = "inline",
  pogonKod = "",
}) {
  const jePanel = rezim === "panel";
  const jeBanner = rezim === "banner";
  const [otvoren, setOtvoren] = useState(() => jePanel && !kontekst);
  const [minimizovan, setMinimizovan] = useState(
    () => sessionStorage.getItem(minKey(modul)) === "1",
  );
  const postaviMinimizovan = (v) => {
    setMinimizovan(v);
    try {
      if (v) sessionStorage.setItem(minKey(modul), "1");
      else sessionStorage.removeItem(minKey(modul));
    } catch { /* sessionStorage nedostupan */ }
  };
  const [dobavljaci, setDobavljaci] = useState([]);
  const [sifraDobavljaca, setSifraDobavljaca] = useState("");
  const [brojLota, setBrojLota] = useState("");
  const [brojDokumenta, setBrojDokumenta] = useState("");
  const [primljeno, setPrimljeno] = useState("");
  const [radi, setRadi] = useState(false);

  useEffect(() => {
    fetchDobavljaci({ samoAktivni: true })
      .then(setDobavljaci)
      .catch((e) => addToast?.(e.message, "greska"));
  }, [addToast]);

  useEffect(() => {
    if (!kontekst) return;
    setSifraDobavljaca(kontekst.sifra_dobavljaca || "");
    setBrojLota(kontekst.broj_lota || "");
    setBrojDokumenta(kontekst.broj_dokumenta || "");
    setPrimljeno(String(kontekst.primljeno ?? ""));
  }, [kontekst]);

  const dobavljacMapa = useMemo(
    () => new Map(dobavljaci.map((d) => [d.sifra_dobavljaca, d.naziv_dobavljaca])),
    [dobavljaci],
  );
  const idSePoklapa = !idDeo || !kontekst?.id_deo
    || String(idDeo).trim().toUpperCase() === String(kontekst.id_deo).trim().toUpperCase();
  const ulaznaKontrola = String(pogonKod || "").toUpperCase() === "A";

  const skeniraj = (raw) => {
    const sifra = sifraIzBarkoda(raw);
    const d = dobavljaci.find(
      (x) => String(x.sifra_dobavljaca || "").toUpperCase() === sifra,
    );
    if (!d) {
      addToast?.(`Barkod dobavljača nije pronađen: ${sifra || raw}`, "greska");
      return;
    }
    setSifraDobavljaca(d.sifra_dobavljaca);
    addToast?.(`✓ Dobavljač: ${d.naziv_dobavljaca}`, "uspeh");
  };

  const aktiviraj = async () => {
    setRadi(true);
    try {
      const prijem = await aktivirajPrijemZaMerenje({
        sifraDobavljaca,
        idDeo,
        brojLota,
        brojDokumenta,
        primljeno,
      });
      const novi = {
        id: prijem.id,
        sifra_dobavljaca: prijem.sifra_dobavljaca,
        naziv_dobavljaca: dobavljacMapa.get(prijem.sifra_dobavljaca) || "",
        broj_lota: prijem.broj_lota || "",
        broj_dokumenta: prijem.broj_dokumenta || "",
        primljeno: Number(prijem.primljeno) || 0,
        id_deo: prijem.id_deo || String(idDeo || "").trim().toUpperCase(),
      };
      sacuvajPrijemKontekst(modul, novi);
      onKontekst?.(novi);
      onAktiviran?.(novi);
      postaviMinimizovan(false);
      if (jePanel) onZatvori?.();
      else setOtvoren(false);
      addToast?.(`✓ Aktiviran prijem #${novi.id} — merenja će popuniti OK/NOK`, "uspeh");
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setRadi(false);
    }
  };

  const osvezi = async () => {
    if (!kontekst?.id) return;
    setRadi(true);
    try {
      const r = await syncPrijemnaIzMerenja(kontekst.id);
      addToast?.(`✓ Prijem #${kontekst.id}: kontrolisano ${r.kontrolisano} · OK ${r.ok} · NOK ${r.nok}`, "uspeh");
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setRadi(false);
    }
  };

  const odspoji = () => {
    sacuvajPrijemKontekst(modul, null);
    onKontekst?.(null);
  };

  const INP = {
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.tekst,
    fontSize: kompakt ? 10 : 11,
    padding: kompakt ? "6px 8px" : "8px 10px",
    fontFamily: "inherit",
    minWidth: 0,
  };

  const banerKontekst = kontekst && (
    minimizovan && !jePanel ? (
      <div style={{ margin: kompakt ? "4px 8px" : "4px 12px" }}>
        <button type="button" onClick={() => postaviMinimizovan(false)}
          title={`Prijem #${kontekst.id} je i dalje povezan — klikni za detalje`}
          style={{
            background: `${C.plava}14`, border: `1px solid ${C.plava}66`, borderRadius: 6,
            color: C.plava, fontSize: kompakt ? 8 : 9, fontWeight: 700,
            padding: "3px 8px", cursor: "pointer",
          }}>
          PRIJEM #{kontekst.id} ▸
        </button>
      </div>
    ) : (
      <div style={{
        margin: jePanel ? 0 : (kompakt ? "6px 8px" : "8px 12px"),
        marginBottom: jePanel ? 10 : undefined,
        padding: kompakt ? "7px 9px" : "9px 12px",
        borderRadius: 8,
        border: `1px solid ${C.plava}`,
        background: `${C.plava}14`,
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        fontSize: kompakt ? 9 : 11,
        color: C.tekst,
      }}>
        <strong style={{ color: C.plava }}>PRIJEM #{kontekst.id}</strong>
        <span title="Dobavljač">{kontekst.sifra_dobavljaca} · {kontekst.naziv_dobavljaca || "—"}</span>
        <span title="Broj lota">Lot: {kontekst.broj_lota || "—"}</span>
        <span title="Dokument / prijemnica">Dok: {kontekst.broj_dokumenta || "—"}</span>
        <span title="Primljena količina se ne menja iz merenja">Primljeno: {kontekst.primljeno}</span>
        <span style={{ color: C.sivi }} title="OK/NOK i kontrolisano se popunjavaju iz snimljenih merenja">
          auto OK/NOK
        </span>
        {!idSePoklapa && (
          <strong style={{ color: C.crvena }} title="Merenja drugog dela neće biti vezana za ovaj prijem">
            ⚠ ID dela nije {kontekst.id_deo}
          </strong>
        )}
        {idSePoklapa && !ulaznaKontrola && (
          <strong style={{ color: C.narandzasta || C.zuta }}
            title="Merenja se vezuju za prijem samo na Ulaznoj kontroli (pogon A)">
            ⚠ Prebaci pogon na A
          </strong>
        )}
        <button type="button" onClick={osvezi} disabled={radi}
          title="Ponovo izračunaj prijem iz atributivnih i merljivih merenja"
          style={{ marginLeft: "auto", background: C.hover, border: `1px solid ${C.border}`, borderRadius: 5, color: C.tekst, fontSize: 9, padding: "4px 7px", cursor: "pointer" }}>
          {radi ? "…" : "↻ OK/NOK"}
        </button>
        {!jePanel && (
          <button type="button" onClick={() => postaviMinimizovan(true)}
            title="Skupi traku — prijem ostaje povezan"
            style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 5, color: C.sivi, fontSize: 9, padding: "4px 7px", cursor: "pointer" }}>
            —
          </button>
        )}
        <button type="button" onClick={odspoji}
          title="Odspoji prijem; naredna merenja neće menjati prijem"
          style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 5, color: C.sivi, fontSize: 9, padding: "4px 7px", cursor: "pointer" }}>
          ✕
        </button>
      </div>
    )
  );

  // „banner" (laptop, iznad forme za unos): samo traka aktivnog prijema —
  // forma za povezivanje živi na tabu „POVEŽI PRIJEM" (rezim="panel").
  if (jeBanner) return banerKontekst || null;
  // „inline" (mobilni/tablet) sa aktivnim prijemom: samo traka.
  if (!jePanel && kontekst) return banerKontekst;

  return (
    <div style={{
      margin: kompakt ? "6px 8px" : "8px 12px",
      padding: kompakt ? 8 : 12,
      borderRadius: 8,
      border: `1px solid ${C.border}`,
      background: C.panel,
    }}>
      {banerKontekst}
      {!otvoren ? (
        <button type="button" onClick={() => setOtvoren(true)}
          title="Za robu dobavljača: unesi dobavljača, lot i primljenu količinu; merenja će automatski popuniti PRIJEM"
          style={{ background: `${C.plava}18`, border: `1px solid ${C.plava}55`, borderRadius: 6, color: C.plava, fontSize: kompakt ? 9 : 10, fontWeight: 700, padding: "7px 10px", cursor: "pointer" }}>
          + Poveži {kontekst ? "drugi " : ""}prijem dobavljača
        </button>
      ) : (
        <>
          <div style={{ color: C.tekst, fontSize: kompakt ? 9 : 11, marginBottom: 8 }}>
            <strong>Ulazna kontrola dobavljača</strong> — unesi zaglavlje, zatim meri.
            Kontrolisano i OK/NOK dolaze iz merenja; primljeno i konačna odluka ostaju ručni.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 7 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ color: C.sivi, fontSize: 8 }}>DOBAVLJAČ *</span>
              <div style={{ display: "flex", gap: 5 }}>
                <select value={sifraDobavljaca} onChange={(e) => setSifraDobavljaca(e.target.value)}
                  style={{ ...INP, flex: 1 }}>
                  <option value="">— Izaberi —</option>
                  {dobavljaci.map((d) => (
                    <option key={d.sifra_dobavljaca} value={d.sifra_dobavljaca}>
                      {d.sifra_dobavljaca} — {d.naziv_dobavljaca}
                    </option>
                  ))}
                </select>
                <BarkodSkenirajPolje
                  onSken={skeniraj}
                  C={C}
                  stil={{ width: 38, minHeight: 30, borderRadius: 6 }}
                  velicinaIkone={15}
                />
              </div>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ color: C.sivi, fontSize: 8 }}>LOT *</span>
              <input value={brojLota} onChange={(e) => setBrojLota(e.target.value)} style={INP} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ color: C.sivi, fontSize: 8 }}>PRIJEMNICA / DOKUMENT</span>
              <input value={brojDokumenta} onChange={(e) => setBrojDokumenta(e.target.value)} style={INP} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ color: C.sivi, fontSize: 8 }} title="Podatak sa prijemnice; ne računa se iz merenja">PRIMLJENO *</span>
              <input type="number" min="1" step="1" value={primljeno} onChange={(e) => setPrimljeno(e.target.value)} style={INP} />
            </label>
          </div>
          <div style={{ marginTop: 7, display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={aktiviraj} disabled={radi}
              style={{ background: C.plava, border: "none", borderRadius: 6, color: C.onAkcent, fontSize: 10, fontWeight: 700, padding: "7px 11px", cursor: "pointer" }}>
              {radi ? "…" : "Aktiviraj i nastavi merenje"}
            </button>
            <button type="button"
              onClick={() => (jePanel ? onZatvori?.() : setOtvoren(false))}
              style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, color: C.sivi, fontSize: 10, padding: "7px 11px", cursor: "pointer" }}>
              {jePanel ? "Zatvori" : "Otkaži"}
            </button>
            {!idDeo && <span style={{ color: C.narandzasta, fontSize: 9 }}>Prvo unesi/skeniraj ID dela.</span>}
          </div>
        </>
      )}
    </div>
  );
}
