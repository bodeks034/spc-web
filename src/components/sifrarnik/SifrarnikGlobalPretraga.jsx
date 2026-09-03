import { useState } from "react";
import { navigacijaZaIdDeo, STATUS_DEO_LABEL } from "../../lib/sifrarnikOdrzavanje.js";
import { deoPripadaLiniji } from "../../lib/linijaProizvoda.js";
import SifrarnikIdDeoPicker, { zapamtiRecentIdDeo } from "./SifrarnikIdDeoPicker.jsx";

/** Globalna pretraga dela (typeahead) u Modulu 0. */
export default function SifrarnikGlobalPretraga({
  C,
  onNavigate,
  addToast,
  radnaLinija = "",
  kompakt = false,
}) {
  const [upit, setUpit] = useState("");
  const [trazi, setTrazi] = useState(false);

  const idiNaDeo = async (idRaw) => {
    const id = String(idRaw || upit).trim().toUpperCase();
    if (!id) {
      addToast?.("Unesi ID dela", "greska");
      return;
    }
    setTrazi(true);
    try {
      const rez = await navigacijaZaIdDeo(id);
      if (!rez?.pronadjen) {
        addToast?.(`Deo ${id} nije u šifrarniku`, "greska");
        return;
      }
      zapamtiRecentIdDeo(id);
      if (radnaLinija && !deoPripadaLiniji(rez.deo, radnaLinija)) {
        const vk = rez.deo?.vozilo_katalog_id || rez.deo?.sifra_vozila || "?";
        addToast?.(
          `${id} pripada liniji ${vk}, ne ${radnaLinija}. Otvaram pregled.`,
          "info",
        );
      }
      const korak = rez.nav || rez.koraci?.[0];
      if (korak) {
        onNavigate?.(korak.tab, { ...korak.ctx, idDeo: id });
        const st = STATUS_DEO_LABEL[rez.status]?.label || rez.status;
        addToast?.(`${id} · ${st}${rez.nedostaje?.length ? ` → ${korak.label || korak.tab}` : ""}`, "uspeh");
      } else {
        onNavigate?.("delovi", { idDeo: id });
        addToast?.(`${id} — otvoren pregled delova`, "info");
      }
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setTrazi(false);
    }
  };

  return (
    <div
      data-testid="sifrarnik-global-pretraga"
      style={{
        display: "flex",
        gap: 6,
        alignItems: "center",
        marginBottom: kompakt ? 0 : 8,
        flexShrink: 0,
        flexWrap: "wrap",
        marginLeft: kompakt ? "auto" : undefined,
      }}
    >
      {!kompakt && <span style={{ color: C.sivi, fontSize: 9, fontWeight: 700 }}>ID DELO:</span>}
      <SifrarnikIdDeoPicker
        C={C}
        value={upit}
        onChange={setUpit}
        onPick={(id) => idiNaDeo(id)}
        linijaKod={radnaLinija}
        placeholder={kompakt ? "Nađi ID…" : "HAM-NM… (min 2)"}
        width={kompakt ? 130 : 160}
        testId="sifrarnik-global-pretraga-picker"
        inputTestId="sifrarnik-global-pretraga-input"
      />
      <button
        type="button"
        disabled={trazi}
        onClick={() => idiNaDeo(upit)}
        data-testid="sifrarnik-global-pretraga-go"
        style={{
          background: C.plava,
          border: "none",
          borderRadius: 6,
          color: C.onAkcent,
          fontSize: 10,
          fontWeight: 700,
          padding: kompakt ? "5px 10px" : "6px 12px",
          cursor: trazi ? "wait" : "pointer",
        }}
      >
        {trazi ? "…" : "Nađi"}
      </button>
      {!kompakt && radnaLinija && (
        <span style={{ color: C.sivi, fontSize: 9 }} title="Upozorenje ako deo nije na izabranoj liniji">
          fokus: {radnaLinija}
        </span>
      )}
    </div>
  );
}
