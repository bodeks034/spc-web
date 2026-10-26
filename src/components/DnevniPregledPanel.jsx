import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { fetchSefSmenaPregled, bojaFpyKpi } from "../lib/sefSmenaDashboard.js";
import { objasniAutoUzrokNcr } from "../lib/ncrWorkflowVeza.js";
import { statusNcrZaPrikaz } from "../lib/ncrObrazacPolja.js";
import { NCR_CAPA_TOOLTIP, PFMEA_TOOLTIP } from "../lib/analitikaOpisi.js";
import SmenaPogonaPanel from "./SmenaPogonaPanel.jsx";

/** Kompaktan dnevni pregled za kvalitet / šef (isti sažetak kao smenski digest, bez čekanja emaila). */
export default function DnevniPregledPanel({
  C, korisnik, onOtvoriModul, onOtvoriTab, onOtvoriNcr, onKpiDorada,
  pocetnaSmena = "1", addToast,
}) {
  const [pod, setPod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [greska, setGreska] = useState(null);

  const osvezi = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSefSmenaPregled(supabase, { period: 1 });
      setPod(data);
      setGreska(null);
    } catch (e) {
      setGreska(e?.message || "Greška pri učitavanju dnevnog pregleda");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { osvezi(); }, [osvezi]);

  const otvoriTab = (tab, modul = "atributivne") => {
    if (onOtvoriTab) onOtvoriTab(tab, { modul });
    else onOtvoriModul?.(modul === "atributivne" ? "atributivne" : "varijabilne");
  };

  const metrika = (label, v, boja = C.tekst, onClick = null, title = null, testId = null) => (
    <button
      type="button"
      data-testid={testId || `dnevni-metrika-${label.toLowerCase().replace(/\s+/g, "-")}`}
      title={title || undefined}
      onClick={onClick || undefined}
      disabled={!onClick}
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "10px 12px",
        textAlign: "left",
        cursor: onClick ? "pointer" : "default",
        minWidth: 88,
      }}
    >
      <div style={{ color: C.sivi, fontSize: 8, letterSpacing: 0.8 }}>{label}</div>
      <div style={{ color: boja, fontSize: 18, fontWeight: 700, marginTop: 4 }}>{v ?? "—"}</div>
    </button>
  );

  const imaKpi = (pod?.ukupnoKpi || 0) > 0 || (pod?.skart || 0) > 0 || (pod?.dorada || 0) > 0;
  const imaKal = (pod?.kalUpozorenja || 0) > 0 || (pod?.merilaIstekla || 0) > 0;

  return (
    <div
      data-testid="dnevni-pregled-panel"
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 14,
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 }}>
        <div>
          <div style={{ color: C.tekst, fontSize: 12, fontWeight: 700 }}>PREDAJA SMENE · DANAS</div>
          <div style={{ color: C.sivi, fontSize: 9, marginTop: 2 }}>
            Smena, pogoni, PDF · kvalitet i alarmi (klik otvara modul)
          </div>
        </div>
        <button
          type="button"
          onClick={osvezi}
          disabled={loading}
          style={{
            background: C.hover, border: `1px solid ${C.border}`, borderRadius: 6,
            color: C.sivi, fontSize: 10, padding: "4px 10px", cursor: "pointer",
          }}
        >
          {loading ? "…" : "↻"}
        </button>
      </div>

      {greska && (
        <div role="alert" style={{
          marginBottom: 10, padding: "6px 10px", borderRadius: 8, fontSize: 10,
          display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between",
          background: C.crvena + "18", color: C.crvena, border: `1px solid ${C.crvena}40`,
        }}>
          <span>{pod ? `Osvežavanje nije uspelo: ${greska}` : greska}</span>
          <button type="button" onClick={osvezi} disabled={loading}
            style={{
              background: "transparent", border: `1px solid ${C.crvena}60`, borderRadius: 6,
              color: C.crvena, fontSize: 9, padding: "2px 8px", cursor: "pointer", whiteSpace: "nowrap",
            }}>
            Pokušaj ponovo
          </button>
        </div>
      )}

      <SmenaPogonaPanel
        C={C}
        korisnik={korisnik}
        addToast={addToast}
        smena={Number(pocetnaSmena) || 1}
        kompaktan
      />

      <div style={{ color: C.sivi, fontSize: 8, letterSpacing: 0.8, marginTop: 10, marginBottom: 4 }}>
        KVALITET · KPI
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {metrika(
          "FPY danas",
          pod?.fpy != null ? `${pod.fpy}%` : "—",
          bojaFpyKpi(pod?.fpy, C),
          onOtvoriTab || onOtvoriModul ? () => otvoriTab("pregled", "atributivne") : null,
          null,
          "dnevni-kpi-fpy-danas",
        )}
        {metrika(
          "RTY",
          pod?.rty != null ? `${pod.rty}%` : "—",
          C.narandzasta || C.tekst,
          onOtvoriTab || onOtvoriModul ? () => otvoriTab("pregled", "atributivne") : null,
          null,
          "dnevni-kpi-rty",
        )}
        {metrika(
          "Škart KPI",
          pod?.skart ?? 0,
          (pod?.skart || 0) > 0 ? C.crvena : C.tekst,
          imaKpi && onKpiDorada
            ? () => onKpiDorada({ modul: "merljive", datum: pod?.danas })
            : imaKpi && (onOtvoriTab || onOtvoriModul)
              ? () => otvoriTab("pregled", "varijabilne")
              : null,
          null,
          "dnevni-kpi-skart-kpi",
        )}
        {metrika(
          "Dorada KPI",
          pod?.dorada ?? 0,
          (pod?.dorada || 0) > 0 ? C.narandzasta || C.zuta : C.tekst,
          imaKpi && onKpiDorada
            ? () => onKpiDorada({ modul: "merljive", datum: pod?.danas })
            : imaKpi && (onOtvoriTab || onOtvoriModul)
              ? () => otvoriTab("pregled", "varijabilne")
              : null,
          null,
          "dnevni-kpi-dorada-kpi",
        )}
      </div>

      <div style={{ color: C.sivi, fontSize: 8, letterSpacing: 0.8, marginTop: 10, marginBottom: 4 }}>
        ALARMI · MERILA
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {metrika(
          "SPC alarmi",
          pod?.spcAlarmi?.length ?? 0,
          (pod?.spcAlarmi?.length || 0) > 0 ? C.crvena : C.zelena,
          (pod?.spcAlarmi?.length || 0) > 0 && (onOtvoriTab || onOtvoriModul)
            ? () => otvoriTab("odobrenja", "atributivne")
            : null,
        )}
        {metrika(
          "NCR otvoreni",
          pod?.ncrOtvoreni?.length ?? 0,
          (pod?.ncrOtvoreni?.length || 0) > 0 ? C.narandzasta || C.zuta : C.tekst,
          (pod?.ncrOtvoreni?.length || 0) > 0 && (onOtvoriTab || onOtvoriModul)
            ? () => otvoriTab("ncr", "atributivne")
            : null,
          NCR_CAPA_TOOLTIP,
        )}
        {metrika(
          "Eskalacije",
          pod?.eskOtvorene ?? 0,
          (pod?.eskOtvorene || 0) > 0 ? C.crvena : C.tekst,
          (pod?.eskOtvorene || 0) > 0 && (onOtvoriTab || onOtvoriModul)
            ? () => otvoriTab("eskalacije", "atributivne")
            : null,
        )}
        {metrika(
          "Kal / MSA",
          imaKal ? `${pod.merilaIstekla || 0} / ${pod.kalUpozorenja || 0}` : "OK",
          imaKal ? C.zuta : C.zelena,
          imaKal && (onOtvoriTab || onOtvoriModul)
            ? () => otvoriTab("msa", "varijabilne")
            : null,
        )}
      </div>

      {pod?.ncrOtvoreni?.length > 0 && (
        <div
          data-testid="dnevni-ncr-lista"
          style={{ marginTop: 10, fontSize: 9, color: C.sivi, lineHeight: 1.55 }}
        >
          <div style={{ fontWeight: 700, color: C.tekst, marginBottom: 4 }} title={NCR_CAPA_TOOLTIP}>Otvoreni NCR</div>
          {pod.ncrOtvoreni.slice(0, 5).map((n) => {
            const auto = objasniAutoUzrokNcr(n);
            return (
              <div key={n.id} style={{ marginBottom: 4 }}>
                <button
                  type="button"
                  data-testid={`dnevni-ncr-${n.broj_ncr}`}
                  onClick={() => {
                    if (onOtvoriNcr) {
                      onOtvoriNcr({
                        _otvoriDetaljId: n.id,
                        ncr_id: n.id,
                        id_deo: n.id_deo,
                        opis: n.opis,
                      });
                      return;
                    }
                    otvoriTab("ncr", "atributivne");
                  }}
                  style={{
                    background: "none", border: "none", padding: 0, cursor: "pointer",
                    color: C.plava, fontSize: "inherit", fontFamily: "inherit", fontWeight: 700,
                  }}
                >
                  {n.broj_ncr}
                </button>
                {" "}{n.id_deo} · {statusNcrZaPrikaz(n.status)}
                {auto && (
                  <span style={{ color: C.zuta }} title={auto.razlog || undefined}> · {auto.naslov}: {auto.razlog}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pod?.topNok?.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 9, color: C.sivi, lineHeight: 1.5 }}>
          TOP NOK:{" "}
          {pod.topNok.slice(0, 3).map((t, i) => (
            <span key={t.id_deo || i}>
              {i > 0 ? " · " : ""}
              <button
                type="button"
                data-testid={`dnevni-top-nok-${i}`}
                onClick={() => {
                  if (onOtvoriNcr) {
                    onOtvoriNcr({ id_deo: t.id_deo || t.naziv, opis: `TOP NOK: ${t.nok} kom` });
                  } else {
                    otvoriTab("pregled", "atributivne");
                  }
                }}
                style={{
                  background: "none", border: "none", padding: 0, cursor: "pointer",
                  color: C.plava, fontSize: "inherit", fontFamily: "inherit",
                }}
              >
                {t.naziv || t.id_deo} ({t.nok})
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {(onOtvoriTab || onOtvoriModul) && (
          <button
            type="button"
            data-testid="dnevni-link-pfmea"
            title={PFMEA_TOOLTIP}
            onClick={() => otvoriTab("pfmea-cp", "atributivne")}
            style={{
              background: `${C.ljubicasta || C.plava}15`,
              border: `1px solid ${C.border}`,
              borderRadius: 5,
              color: C.ljubicasta || C.plava,
              fontSize: 9,
              fontWeight: 700,
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            PfMEA / Control Plan
          </button>
        )}
      </div>

      <div style={{ marginTop: 8, fontSize: 9, color: C.sivi }}>
        Klik otvara odgovarajući modul/tab · osvežava se na zahtev.
        {korisnik?.uloga && ` · ${korisnik.uloga}`}
      </div>
    </div>
  );
}
