import FaiUnosTraka from "../FaiUnosTraka.jsx";
import FaiOdobrenjePanel from "../FaiOdobrenjePanel.jsx";

export default function MerljiveFaiCekaBlok({
  C,
  korisnik,
  smena,
  pogonKod,
  idDeo,
  brojFaiDimenzija,
  mozeOdobriFai,
  snima,
  odobriFaiKasnije,
  faiPoslednjiId,
  addToast,
  kpiPanelBlok,
  onOdobreno,
}) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, gap: 8, overflow: "hidden" }}>
      {kpiPanelBlok}
      <div style={{
        background: `${C.zuta}18`, border: `1px solid ${C.zuta}66`,
        borderRadius: 8, padding: "10px 12px", fontSize: 11, lineHeight: 1.45, flexShrink: 0,
      }}
      >
        <strong style={{ color: C.zuta }}>FAI sačuvan — serija je zaključana dok se ne odobri.</strong>
        <div style={{ color: C.sivi, marginTop: 4 }}>
          {mozeOdobriFai
            ? "Kliknite „Odobri FAI“ ispod da otključate unos merenja serije."
            : "Obavestite kvalitet (tab FAI) da odobre pre nastavka."}
        </div>
      </div>
      <FaiUnosTraka
        C={C}
        idDeo={idDeo}
        brojDimenzija={brojFaiDimenzija}
        kompletno={false}
        snima={snima}
        mozeOdobri={mozeOdobriFai}
        cekaOdobrenje
        onOdobri={odobriFaiKasnije}
      />
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        <FaiOdobrenjePanel
          C={C}
          korisnik={korisnik}
          smena={smena}
          pogonKod={pogonKod}
          faiId={faiPoslednjiId}
          addToast={addToast}
          kompakt
          onOdobreno={onOdobreno}
        />
      </div>
    </div>
  );
}
