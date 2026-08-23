import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { formatErpUvozVreme } from "../../lib/erpUvozLog.js";
import { proveriSemu, proveriGoLiveRpc, MIGRACIJE_LISTA } from "../../lib/schemaCheck.js";
import {
  fetchKompletnostStatistika,
  fetchDeloviBezGlavnogUnosa,
  jeDemoIdDeo,
} from "../../lib/sifrarnikOdrzavanje.js";

/** Automatski go-live pregled — šema, RPC, demo delovi, kompletnost šifrarnika. */
export default function AdminGoLiveStatusPanel({ C, addToast, onOtvoriSifrarnik, onSkrolujDo }) {
  const [podaci, setPodaci] = useState(null);
  const [loading, setLoading] = useState(true);

  const osvezi = useCallback(async () => {
    setLoading(true);
    try {
      const [stavke, rpc, komplet, bezGu, deloviRes, erpLog] = await Promise.all([
        proveriSemu(supabase),
        proveriGoLiveRpc(supabase),
        fetchKompletnostStatistika(),
        fetchDeloviBezGlavnogUnosa(),
        supabase.from("delovi").select("id_deo").limit(2000),
        supabase.from("erp_uvoz_log").select("created_at,uspeh,izvor,greska,detalj").order("created_at", { ascending: false }).limit(5),
      ]);

      const demoBroj = (deloviRes.data || []).filter((d) => jeDemoIdDeo(d.id_deo)).length;
      const goLiveMigracije = MIGRACIJE_LISTA.filter((m) =>
        /^(77|78|79|80|81|82|83|84|85)_/.test(m.fajl || ""),
      );
      const goLiveOk = goLiveMigracije.every((m) => stavke.find((s) => s.id === m.id)?.ok);
      const auditOk = !!stavke.find((s) => s.id === "sifrarnik_audit")?.ok;

      setPodaci({
        schemaOk: stavke.every((s) => s.ok),
        schemaBroj: stavke.filter((s) => s.ok).length,
        schemaUkupno: stavke.length,
        rpc,
        goLiveMigracijeOk: goLiveOk,
        auditOk,
        komplet,
        bezGu,
        demoBroj,
        erpPoslednji: erpLog.data?.[0] || null,
        erpIstorija: erpLog.data || [],
      });
    } catch (e) {
      addToast?.(e.message || "Go-live provera nije uspela", "greska");
      setPodaci(null);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { osvezi(); }, [osvezi]);

  const sveOk = podaci
    && podaci.schemaOk
    && podaci.goLiveMigracijeOk
    && podaci.auditOk
    && Object.values(podaci.rpc).every((r) => r?.ok)
    && podaci.komplet.procenat >= 80
    && podaci.bezGu.broj === 0
    && podaci.demoBroj === 0;

  const otvoriSemu = () => onSkrolujDo?.("admin-schema-status");

  return (
    <div
      data-testid="admin-go-live-status"
      style={{
      background: C.panel,
      border: `1px solid ${sveOk ? C.zelena : C.zuta}40`,
      borderRadius: 12,
      padding: 18,
      marginBottom: 16,
    }}
    >
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
        flexWrap: "wrap",
        gap: 8,
      }}
      >
        <div>
          <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
            GO-LIVE STATUS (automatski)
          </div>
          <div style={{ color: C.sivi, fontSize: 10, marginTop: 4 }}>
            {loading ? "Proveravam…" : sveOk ? "Spremno za produkciju" : "Potrebna pažnja pre go-live"}
          </div>
        </div>
        <button
          type="button"
          onClick={osvezi}
          disabled={loading}
          style={{
            background: C.hover,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            color: C.sivi,
            fontSize: 10,
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          {loading ? "…" : "↻ Proveri"}
        </button>
      </div>

      {podaci && !loading && (
        <div style={{ display: "grid", gap: 6, fontSize: 11 }}>
          <Stavka
            C={C}
            ok={podaci.schemaOk}
            label={`Šema migracije (${podaci.schemaBroj}/${podaci.schemaUkupno})`}
            akcijaLabel={!podaci.schemaOk ? "Otvori šemu" : undefined}
            onAkcija={!podaci.schemaOk ? otvoriSemu : undefined}
          />
          <Stavka
            C={C}
            ok={podaci.goLiveMigracijeOk}
            label="Go-live SQL (77–85)"
            akcijaLabel={!podaci.goLiveMigracijeOk ? "Otvori šemu" : undefined}
            onAkcija={!podaci.goLiveMigracijeOk ? otvoriSemu : undefined}
          />
          <Stavka
            C={C}
            ok={podaci.auditOk}
            label="Audit log šifrarnika (80–81)"
            akcijaLabel={!podaci.auditOk ? "Otvori šemu" : undefined}
            onAkcija={!podaci.auditOk ? otvoriSemu : undefined}
          />
          <Stavka
            C={C}
            ok={podaci.rpc.ocisti_operativu_rpc?.ok}
            label="RPC ocisti_operativu_pre_go_live"
            akcijaLabel={!podaci.rpc.ocisti_operativu_rpc?.ok ? "Otvori šemu" : undefined}
            onAkcija={!podaci.rpc.ocisti_operativu_rpc?.ok ? otvoriSemu : undefined}
          />
          <Stavka
            C={C}
            ok={podaci.rpc.obrisi_deo_rpc?.ok}
            label="RPC obrisi_deo_iz_sifrarnika"
            akcijaLabel={!podaci.rpc.obrisi_deo_rpc?.ok ? "Otvori šemu" : undefined}
            onAkcija={!podaci.rpc.obrisi_deo_rpc?.ok ? otvoriSemu : undefined}
          />
          <Stavka
            C={C}
            ok={podaci.rpc.obrisi_demo_delove_rpc?.ok}
            label="RPC obrisi_demo_delove_iz_sifrarnika"
            akcijaLabel={!podaci.rpc.obrisi_demo_delove_rpc?.ok ? "Otvori šemu" : undefined}
            onAkcija={!podaci.rpc.obrisi_demo_delove_rpc?.ok ? otvoriSemu : undefined}
          />
          <Stavka
            C={C}
            ok={podaci.komplet.procenat >= 80}
            label={`Kompletnost šifrarnika: ${podaci.komplet.kompletno}/${podaci.komplet.ukupno} (${podaci.komplet.procenat}%)`}
            akcijaLabel={podaci.komplet.procenat < 80 ? "Otvori održavanje" : undefined}
            onAkcija={podaci.komplet.procenat < 80
              ? () => onOtvoriSifrarnik?.("odrzavanje")
              : undefined}
          />
          <Stavka
            C={C}
            ok={podaci.komplet.delimicno === 0}
            label={`Delimični delovi: ${podaci.komplet.delimicno}`}
            akcijaLabel={podaci.komplet.delimicno > 0 ? "Otvori delovi" : undefined}
            onAkcija={podaci.komplet.delimicno > 0
              ? () => onOtvoriSifrarnik?.("delovi", { samoDelimicni: true })
              : undefined}
          />
          <Stavka
            C={C}
            ok={!!podaci.erpPoslednji?.uspeh}
            label={podaci.erpPoslednji
              ? `Poslednji ERP uvoz: ${formatErpUvozVreme(podaci.erpPoslednji.created_at)} · ${podaci.erpPoslednji.izvor || "—"}`
              : "ERP uvoz: nema zapisa"}
            akcijaLabel={!podaci.erpPoslednji ? "Otvori ERP" : undefined}
            onAkcija={!podaci.erpPoslednji
              ? () => onOtvoriSifrarnik?.("erp")
              : undefined}
          />
          {podaci.erpIstorija.length > 0 && (
            <div
              data-testid="admin-erp-istorija"
              style={{
                marginLeft: 24,
                padding: "6px 8px",
                borderRadius: 6,
                background: C.hover,
                fontSize: 9,
                lineHeight: 1.5,
              }}
            >
              <div style={{ color: C.sivi, fontWeight: 700, marginBottom: 4 }}>Poslednjih {podaci.erpIstorija.length} uvoza</div>
              {podaci.erpIstorija.map((r) => (
                <div key={r.created_at} style={{ color: r.uspeh ? C.zelena : C.crvena || "#dc2626" }}>
                  {r.uspeh ? "✓" : "✗"} {formatErpUvozVreme(r.created_at)} · {r.izvor || "—"}
                  {(r.greska || r.detalj) ? ` — ${String(r.greska || r.detalj).slice(0, 60)}` : ""}
                </div>
              ))}
            </div>
          )}
          <Stavka
            C={C}
            ok={true}
            label="Backup: Task SPC-Postgres-Backup (02:00) — npm run backup:db"
            hint="Proveri ručno jednom pre go-live"
          />
          <Stavka
            C={C}
            ok={podaci.bezGu.broj === 0}
            label={`Delovi bez GU redova: ${podaci.bezGu.broj}${podaci.bezGu.primer.length ? ` (${podaci.bezGu.primer.join(", ")}…)` : ""}`}
            akcijaLabel={podaci.bezGu.broj > 0 ? "Otvori delovi" : undefined}
            onAkcija={podaci.bezGu.broj > 0
              ? () => onOtvoriSifrarnik?.("delovi", { nedostajeFilter: "gu", samoDelimicni: true })
              : undefined}
          />
          <Stavka
            C={C}
            ok={podaci.demoBroj === 0}
            label={`DEMO/TEST delovi u bazi: ${podaci.demoBroj}`}
            hint={podaci.demoBroj > 0 ? "Obriši pre go-live (Modul 0 → Delovi)" : undefined}
            akcijaLabel={podaci.demoBroj > 0 ? "Otvori delovi" : undefined}
            onAkcija={podaci.demoBroj > 0
              ? () => onOtvoriSifrarnik?.("delovi", { samoDemo: true })
              : undefined}
          />
        </div>
      )}

      <div style={{ color: C.border, fontSize: 9, marginTop: 12, lineHeight: 1.45 }}>
        Ručni koraci ostaju u checklist-i ispod. SQL: <code>npm run db:migrate:go-live</code>
      </div>
    </div>
  );
}

function Stavka({ C, ok, label, hint, akcijaLabel, onAkcija }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 8,
      padding: "6px 8px",
      borderRadius: 6,
      background: ok ? `${C.zelena}10` : `${C.zuta || "#b45309"}10`,
    }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, minWidth: 0 }}>
        <span style={{ color: ok ? C.zelena : C.zuta || "#b45309", fontWeight: 700 }}>
          {ok ? "✓" : "!"}
        </span>
        <div>
          <span style={{ color: C.tekst }}>{label}</span>
          {hint && <div style={{ color: C.sivi, fontSize: 9, marginTop: 2 }}>{hint}</div>}
        </div>
      </div>
      {akcijaLabel && onAkcija && (
        <button
          type="button"
          data-testid={`go-live-otvori-${akcijaLabel.toLowerCase().replace(/\s+/g, "-")}`}
          onClick={onAkcija}
          style={{
            flexShrink: 0,
            background: C.plava,
            border: "none",
            borderRadius: 6,
            color: C.onAkcent,
            fontSize: 9,
            fontWeight: 700,
            padding: "5px 10px",
            cursor: "pointer",
          }}
        >
          {akcijaLabel}
        </button>
      )}
    </div>
  );
}
