import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

export default function AdminPrekidiPanel({ korisnik, C, addToast }) {
  const [zahtevi, setZahtevi] = useState([]);
  const [loading, setLoading] = useState(true);

  const ucitaj = async () => {
    const { data } = await supabase.from("prekidi_zahtevi")
      .select("*,operater:radnici!prekidi_zahtevi_operater_id_fkey(ime)")
      .eq("status", "ceka")
      .order("created_at", { ascending: false });
    setZahtevi(data || []);
    setLoading(false);
  };

  useEffect(() => { ucitaj(); }, []);

  useEffect(() => {
    const ch = supabase.channel("prekidi_admin")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "prekidi_zahtevi" },
        payload => {
          addToast?.(`📤 Novi zahtev: ${payload.new.id_deo} — ${payload.new.razlog?.substring(0, 30)}...`, "greska");
          ucitaj();
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "prekidi_zahtevi" },
        () => ucitaj());
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [addToast]);

  const odluci = async (id, odluka, napomena = "") => {
    const { error } = await supabase.from("prekidi_zahtevi").update({
      status: odluka,
      admin_id: korisnik.radnikId,
      napomena,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) {
      addToast?.(error.message, "greska");
      return;
    }
    addToast?.(odluka === "odobreno" ? "✓ Prekid odobren" : "✗ Zahtev odbijen",
      odluka === "odobreno" ? "uspeh" : "greska");
    ucitaj();
  };

  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
          ZAHTEVI ZA PREKID
          {zahtevi.length > 0 && (
            <span style={{
              background: C.crvena, color: C.onAkcent, fontSize: 10,
              borderRadius: 10, padding: "1px 7px", marginLeft: 8,
            }}>
              {zahtevi.length}
            </span>
          )}
        </div>
        <button type="button" onClick={ucitaj} style={{
          background: "none", border: `1px solid ${C.border}`,
          borderRadius: 5, color: C.sivi, fontSize: 10, padding: "4px 10px", cursor: "pointer",
        }}>
          ↻ Osveži
        </button>
      </div>
      {loading ? <div style={{ color: C.sivi, fontSize: 12 }}>Učitavanje...</div>
        : zahtevi.length === 0 ? (
          <div style={{ color: C.border, fontSize: 12, textAlign: "center", padding: "20px 0" }}>
            Nema aktivnih zahteva ✓
          </div>
        ) : zahtevi.map(z => (
          <div key={z.id} style={{
            background: C.bg, border: `1px solid ${C.zuta}40`,
            borderRadius: 10, padding: 14, marginBottom: 10,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <span style={{ color: C.tekst, fontWeight: 700, fontSize: 13 }}>{z.id_deo}</span>
                <span style={{ color: C.sivi, fontSize: 11, marginLeft: 8 }}>{z.naziv_dela}</span>
              </div>
              <span style={{ color: C.sivi, fontSize: 10 }}>
                {new Date(z.created_at).toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div style={{ color: C.sivi, fontSize: 11, marginBottom: 4 }}>
              Operater: <strong style={{ color: C.tekst }}>{z.operater?.ime || "?"}</strong>
              {" · "}Preostalo: <strong style={{ color: C.crvena }}>{z.preostalo}/{z.cilj}</strong>
            </div>
            <div style={{
              color: C.zuta, fontSize: 12, marginBottom: 12,
              background: `${C.zuta}15`, padding: "6px 10px", borderRadius: 6,
            }}>
              &quot;{z.razlog}&quot;
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => odluci(z.id, "odobreno")}
                style={{
                  flex: 1, background: C.zelena, border: "none", borderRadius: 8,
                  color: C.onAkcent, fontSize: 12, fontWeight: 700, padding: "9px", cursor: "pointer",
                }}>
                ✓ Odobri prekid
              </button>
              <button type="button" onClick={() => odluci(z.id, "odbijeno", "Nastavi merenje")}
                style={{
                  flex: 1, background: C.crvena, border: "none", borderRadius: 8,
                  color: C.onAkcent, fontSize: 12, fontWeight: 700, padding: "9px", cursor: "pointer",
                }}>
                ✗ Odbij
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
