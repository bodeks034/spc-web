import { useState, useEffect, useRef, useId } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useEkran } from "../lib/useEkran.js";
import { izaberiKameru, konfigSkeniranja, jeLaptopKamera } from "../lib/barkodKamera.js";

function skenerOpcije() {
  return { verbose: false, useBarCodeDetectorIfSupported: true };
}

function BarkodKameraModal({ open, onClose, onSken, C, akcent = C?.plava }) {
  const ekran = useEkran();
  const laptop = jeLaptopKamera(ekran);
  const uid = useId().replace(/:/g, "");
  const regionId = `barkod-kamera-${uid}`;
  const skenerRef = useRef(null);
  const fajlRef = useRef(null);
  const skeniranoRef = useRef(false);

  const [greska, setGreska] = useState("");
  const [pokrecem, setPokrecem] = useState(false);
  const [skeniramFajl, setSkeniramFajl] = useState(false);

  const uspesanSken = (tekst) => {
    if (skeniranoRef.current || !tekst?.trim()) return;
    skeniranoRef.current = true;
    onSken(tekst.trim());
    onClose();
  };

  useEffect(() => {
    if (!open) return undefined;

    skeniranoRef.current = false;
    setGreska("");
    setPokrecem(true);

    let ok = true;
    const skener = new Html5Qrcode(regionId, skenerOpcije());
    skenerRef.current = skener;

    const zaustavi = async () => {
      try {
        if (skener.isScanning) await skener.stop();
      } catch { /* */ }
      try {
        skener.clear();
      } catch { /* */ }
    };

    (async () => {
      try {
        const kamere = await Html5Qrcode.getCameras();
        if (!ok) return;

        const mobilni = ekran.mob || ekran.tablet;
        const deviceId = izaberiKameru(kamere, { mobilni, laptop });
        const config = konfigSkeniranja({ laptop, deviceId });
        const kamera = deviceId || { facingMode: mobilni ? "environment" : "user" };

        await skener.start(
          kamera,
          config,
          (tekst) => uspesanSken(tekst),
          () => {},
        );
        if (ok) setPokrecem(false);
      } catch (err) {
        if (!ok) return;
        const msg = String(err?.message || err || "");
        if (/not allowed|permission|denied/i.test(msg)) {
          setGreska("Dozvoli pristup kameri u pregledaču (ikonica katanca u adresnoj traci). Na laptopu mora biti HTTPS ili localhost.");
        } else if (/not found|no camera|devices/i.test(msg)) {
          setGreska("Kamera nije pronađena. Probaj „Učitaj sliku etikete“ ispod.");
        } else {
          setGreska(msg || "Ne mogu da pokrenem kameru.");
        }
        setPokrecem(false);
      }
    })();

    return () => {
      ok = false;
      zaustavi();
      skenerRef.current = null;
    };
  }, [open, onClose, onSken, ekran.mob, ekran.tablet, laptop, regionId]);

  const skenirajSliku = async (file) => {
    if (!file) return;
    setGreska("");
    setSkeniramFajl(true);
    try {
      const skener = skenerRef.current || new Html5Qrcode(regionId, skenerOpcije());
      if (skener.isScanning) {
        try { await skener.stop(); } catch { /* */ }
      }
      const tekst = await skener.scanFile(file, false);
      uspesanSken(tekst);
    } catch {
      setGreska(
        laptop
          ? "Barkod nije prepoznat. Na laptopu najbolje radi QR strana etikete — fotografiši izbliza, ravno, dovoljno svetla."
          : "Barkod nije prepoznat na slici. Probaj bolje osvetljenje ili QR kod.",
      );
    } finally {
      setSkeniramFajl(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 4000,
        background: "rgba(0,0,0,0.92)",
        display: "flex",
        flexDirection: "column",
        padding: ekran.mob ? 12 : 20,
        boxSizing: "border-box",
      }}
    >
      <div
        role="presentation"
        onClick={(e) => e.stopPropagation()}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          maxWidth: laptop ? 640 : 520,
          width: "100%",
          margin: "0 auto",
          minHeight: 0,
        }}
      >
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
          flexShrink: 0,
        }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: ekran.mob ? 14 : 16 }}>
            Skeniraj barkod / QR
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontSize: 18,
              width: 36,
              height: 36,
              cursor: "pointer",
            }}
            aria-label="Zatvori"
          >
            ✕
          </button>
        </div>

        <div style={{
          color: C.sivi,
          fontSize: 11,
          marginBottom: 8,
          lineHeight: 1.45,
          flexShrink: 0,
        }}>
          {laptop ? (
            <>
              <strong style={{ color: "#fff" }}>Laptop:</strong> drži etiketu 15–25 cm od kamere, ravno, dovoljno svetla.
              {" "}Na štampanoj etiketi koristi <strong style={{ color: akcent }}>QR kod</strong> (pouzdanije od Code 128).
              {" "}Alternativa: USB čitač — fokus u polje ID pa skeniraj.
            </>
          ) : (
            <>Usmeri kameru ka etiketi (QR ili Code 128).</>
          )}
        </div>

        <div style={{
          flex: 1,
          minHeight: 0,
          background: C.panel,
          borderRadius: 12,
          border: `1px solid ${akcent}55`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}>
          <div
            id={regionId}
            style={{ flex: 1, minHeight: laptop ? 360 : (ekran.mob ? 260 : 320), width: "100%" }}
          />
          {pokrecem && (
            <div style={{ textAlign: "center", color: C.sivi, fontSize: 12, padding: 12 }}>
              Pokrećem kameru…
            </div>
          )}
          {greska && (
            <div style={{
              margin: 12,
              padding: 12,
              background: C.nok,
              border: `1px solid ${C.crvena}`,
              borderRadius: 8,
              color: C.crvena,
              fontSize: 12,
              lineHeight: 1.4,
            }}>
              {greska}
            </div>
          )}
        </div>

        <div style={{ marginTop: 10, flexShrink: 0, display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => fajlRef.current?.click()}
            disabled={skeniramFajl}
            style={{
              flex: 1,
              background: `${akcent}22`,
              border: `1px solid ${akcent}66`,
              borderRadius: 10,
              color: akcent,
              fontSize: 13,
              fontWeight: 700,
              padding: "12px 14px",
              cursor: skeniramFajl ? "wait" : "pointer",
            }}
          >
            {skeniramFajl ? "Čitam sliku…" : "📁 Učitaj sliku etikete"}
          </button>
          <input
            ref={fajlRef}
            type="file"
            accept="image/*"
            capture={laptop ? undefined : "environment"}
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              skenirajSliku(f);
            }}
          />
        </div>
      </div>
    </div>
  );
}

/** Usko polje (ista visina kao ID input) — samo ikonica kamere. */
export function BarkodSkenirajPolje({ onSken, C, akcent = C?.plava, stil = {}, velicinaIkone }) {
  const [open, setOpen] = useState(false);
  const fiksnaSirina = stil.width != null && stil.width !== "100%";
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Skeniraj ID barkod kamerom"
        title="Skeniraj kamerom"
        style={{
          boxSizing: "border-box",
          background: `${akcent}14`,
          border: `1px solid ${akcent}55`,
          color: akcent,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          margin: 0,
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
          overflow: "hidden",
          ...(fiksnaSirina
            ? {
              width: stil.width,
              minWidth: stil.width,
              maxWidth: stil.width,
              flex: "0 0 auto",
            }
            : { width: "100%", flex: "1 1 auto" }),
          ...stil,
          ...(fiksnaSirina ? {
            width: stil.width,
            minWidth: stil.width,
            maxWidth: stil.width,
            flex: "0 0 auto",
          } : {}),
        }}
      >
        <span aria-hidden style={{ lineHeight: 1, fontSize: velicinaIkone || stil.fontSize || 14 }}>📷</span>
      </button>
      <BarkodKameraModal
        open={open}
        onClose={() => setOpen(false)}
        onSken={onSken}
        C={C}
        akcent={akcent}
      />
    </>
  );
}

/** Dugme + modal za skeniranje kamerom. */
export function BarkodSkenirajDugme({
  onSken,
  C,
  akcent = C?.plava,
  punSirina = true,
  kompakt = false,
  label = "Skeniraj kamerom",
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: punSirina ? "100%" : "auto",
          background: `${akcent}18`,
          border: `1px solid ${akcent}55`,
          borderRadius: kompakt ? 8 : 10,
          color: akcent,
          fontSize: kompakt ? 11 : 13,
          fontWeight: 700,
          padding: kompakt ? "8px 10px" : "12px 14px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <span aria-hidden>📷</span>
        {label}
      </button>
      <BarkodKameraModal
        open={open}
        onClose={() => setOpen(false)}
        onSken={onSken}
        C={C}
        akcent={akcent}
      />
    </>
  );
}

/** Klikabilna zona (placeholder) + modal. */
export function BarkodKameraZona({ onSken, C, akcent, children, style }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); }
        }}
        style={{ cursor: "pointer", ...style }}
      >
        {children}
      </div>
      <BarkodKameraModal
        open={open}
        onClose={() => setOpen(false)}
        onSken={onSken}
        C={C}
        akcent={akcent}
      />
    </>
  );
}

export default BarkodKameraModal;
