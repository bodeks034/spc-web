import { useState, useEffect, useCallback } from "react";
import { fetchDanasZatvorenoDetaljno } from "../../lib/sifrarnikAudit.js";
import { btnStyle } from "../sifrarnik/sifrarnikPanelStyle.js";

/** Admin: ko je danas zatvorio koje delove u šifrarniku (audit zatvoren_deo). */
export default function AdminSifrarnikDanasPanel({ C, addToast, onOtvoriSifrarnik }) {
  const [podaci, setPodaci] = useState(null);
  const [loading, setLoading] = useState(true);

  const osvezi = useCallback(async () => {
    setLoading(true);
    try {
      setPodaci(await fetchDanasZatvorenoDetaljno());
    } catch (e) {
      addToast?.(e.message || "Ne mogu da učitam dnevni audit", "greska");
      setPodaci(null);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { osvezi(); }, [osvezi]);

  return (
    <div
      data-testid="admin-sifrarnik-danas"
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 18,
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <div>
          <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700 }}>
            Šifrarnik — danas zatvoreno
          </div>
          <div style={{ color: C.sivi, fontSize: 10, marginTop: 3 }}>
            Audit akcija <code>zatvoren_deo</code> · timski ritam
          </div>
        </div>
        <button
          type="button"
          data-testid="admin-sifrarnik-danas-osvezi"
          onClick={osvezi}
          style={btnStyle(C, C.hover, { fontSize: 9 })}
        >
          ↻ Osveži
        </button>
      </div>

      {loading && !podaci ? (
        <div style={{ color: C.sivi, fontSize: 10 }}>Učitavanje…</div>
      ) : !podaci ? (
        <div style={{ color: C.sivi, fontSize: 10 }}>Nema podataka (proveri migraciju audit-a).</div>
      ) : (
        <>
          <div
            data-testid="admin-sifrarnik-danas-broj"
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: C.zelena || "#22c55e",
              marginBottom: 8,
            }}
          >
            {podaci.broj}
            <span style={{ color: C.sivi, fontSize: 11, fontWeight: 500, marginLeft: 8 }}>
              distinct delova · {podaci.dan}
            </span>
          </div>

          {podaci.poKorisniku?.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
              {podaci.poKorisniku.map((p) => (
                <div
                  key={p.korisnik}
                  data-testid={`admin-sifrarnik-danas-korisnik-${p.korisnik}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    fontSize: 10,
                    padding: "6px 8px",
                    borderRadius: 6,
                    background: C.bg || C.input,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <span style={{ color: C.tekst, fontWeight: 700 }}>{p.korisnik}</span>
                  <span style={{ color: C.plava, fontWeight: 700 }}>{p.broj}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: C.sivi, fontSize: 10, marginBottom: 10 }}>
              Još nema zatvorenih delova danas.
            </div>
          )}

          {podaci.hronologija?.length > 0 && (
            <div style={{ maxHeight: 140, overflow: "auto", fontSize: 9, color: C.sivi }}>
              {podaci.hronologija.slice(0, 20).map((h, i) => (
                <div key={`${h.idDeo}-${h.created_at}-${i}`} style={{ padding: "2px 0" }}>
                  <span style={{ color: C.plava, fontWeight: 700 }}>{h.idDeo}</span>
                  {" · "}
                  {h.korisnik}
                  {h.created_at ? ` · ${new Date(h.created_at).toLocaleTimeString("sr-RS")}` : ""}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              onClick={() => onOtvoriSifrarnik?.("odrzavanje")}
              style={btnStyle(C, C.plava, { fontSize: 9 })}
            >
              Otvori Održavanje / Alati →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
