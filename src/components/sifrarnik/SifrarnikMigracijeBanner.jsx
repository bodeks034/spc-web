import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { proveriGoLiveRpc } from "../../lib/schemaCheck.js";

/** Upozorenje u Modulu 0 kad go-live SQL migracije (77–85) nisu primenjene. */
export default function SifrarnikMigracijeBanner({ C }) {
  const [rpc, setRpc] = useState(null);
  const [auditOk, setAuditOk] = useState(true);
  const [filterOk, setFilterOk] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sakriveno, setSakriveno] = useState(false);

  const osvezi = useCallback(async () => {
    setLoading(true);
    try {
      const [rpcRes, auditRes, filterRes] = await Promise.all([
        proveriGoLiveRpc(supabase),
        supabase.from("sifrarnik_audit").select("id").limit(1),
        supabase.rpc("sifrarnik_filter_delovi", {
          p_nedostaje: null,
          p_samo_delimicni: false,
          p_samo_demo: false,
          p_tip_kontrole: null,
          p_limit: 1,
          p_offset: 0,
        }),
      ]);
      setRpc(rpcRes);
      setAuditOk(!auditRes.error || !/does not exist|could not find/i.test(auditRes.error.message || ""));
      setFilterOk(!filterRes.error || !/does not exist|could not find/i.test(filterRes.error.message || ""));
    } catch {
      setRpc(null);
      setAuditOk(false);
      setFilterOk(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { osvezi(); }, [osvezi]);

  if (loading || sakriveno || !rpc) return null;

  const stavke = [
    { key: "ocisti", label: "77 ocisti_operativu", ok: rpc.ocisti_operativu_rpc?.ok },
    { key: "obrisi", label: "78 obris i_deo", ok: rpc.obrisi_deo_rpc?.ok },
    { key: "demo", label: "79 obris i_demo", ok: rpc.obrisi_demo_delove_rpc?.ok },
    { key: "audit", label: "80–81 audit", ok: auditOk },
    { key: "filter", label: "82 filter RPC", ok: filterOk },
  ];
  const sveOk = stavke.every((s) => s.ok);
  if (sveOk) return null;

  const fali = stavke.filter((s) => !s.ok).map((s) => s.label);

  return (
    <div
      data-testid="sifrarnik-migracije-banner"
      style={{
        marginBottom: 10,
        padding: "10px 12px",
        borderRadius: 8,
        flexShrink: 0,
        border: `1px solid ${C.crvena || "#dc2626"}44`,
        background: `${C.crvena || "#dc2626"}10`,
        color: C.tekst,
        fontSize: 10,
        lineHeight: 1.45,
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div>
        <strong>Go-live SQL:</strong>{" "}
        <span style={{ color: C.crvena || "#dc2626" }}>
          Nedostaje RPC — {fali.join(", ")}
        </span>
        <span style={{ color: C.sivi, display: "block", marginTop: 4, fontSize: 9 }}>
          Pokreni u Supabase SQL Editoru: 77–87 ili <code>npm run db:migrate:go-live</code>
        </span>
      </div>
      <button
        type="button"
        onClick={() => setSakriveno(true)}
        style={{
          background: C.hover,
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          color: C.sivi,
          fontSize: 10,
          padding: "6px 10px",
          cursor: "pointer",
        }}
      >
        Sakrij
      </button>
    </div>
  );
}
