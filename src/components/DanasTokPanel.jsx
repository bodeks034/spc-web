import { useMemo, useState, useEffect } from "react";
import { useDashboardPodaci } from "../lib/useDashboardPodaci.js";
import { useOfflineQueue, zaglavljeniPoslovi } from "../lib/offlineQueue.js";
import { supabase } from "../lib/supabaseClient.js";
import {
  mozeSifrarnik, jeLinijaUloga, jeAdmin, mozeOdobrenjaQA,
} from "../lib/uloge.js";
import { modulDozvoljen } from "../lib/licenca.js";
import { izvrsiWorkflowAkciju, akcijaZaOperativniAlarm } from "../lib/workflowAkcije.js";
import { rangirajDanasKorake } from "../lib/danasTok.js";
import {
  proveriKontrolnaListaDanas,
  procitajSmenuIzStorage,
  getListaOkSession,
} from "../lib/kontrolaLista.js";

/**
 * Jedan dnevni tok na početnoj — šta uraditi sada, bez skakanja po tabovima.
 */
export default function DanasTokPanel({
  C,
  korisnik,
  licenca,
  onIzbor,
  onWorkflow,
  smena = "1",
}) {
  const { podaci, loading } = useDashboardPodaci({ period: 1, smena });
  const { online, counts, flushQueue, queue } = useOfflineQueue(supabase);
  const zaglavljeni = useMemo(() => zaglavljeniPoslovi(queue), [queue]);
  const [listaNedovrsena, setListaNedovrsena] = useState(false);

  const alarmi = (podaci?.alarmi || []).filter(
    (a) => a.nivo === "kriticno" || a.nivo === "visok",
  );
  const prviAlarm = alarmi[0] || null;
  const wf = prviAlarm ? akcijaZaOperativniAlarm(prviAlarm, { smena }) : null;

  const linija = jeLinijaUloga(korisnik?.uloga);
  const adminUloga = jeAdmin(korisnik?.uloga);
  const sifrarnik = mozeSifrarnik(korisnik?.uloga) && modulDozvoljen(licenca, "sifrarnik");
  const admin = adminUloga && modulDozvoljen(licenca, "admin");
  const qa = mozeOdobrenjaQA(korisnik?.uloga);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!linija || adminUloga) {
        if (!cancel) setListaNedovrsena(false);
        return;
      }
      const sm = Number(smena) || procitajSmenuIzStorage();
      if (getListaOkSession("atributivne", sm) || getListaOkSession("varijabilne", sm)) {
        if (!cancel) setListaNedovrsena(false);
        return;
      }
      const rez = await proveriKontrolnaListaDanas(supabase, {
        radnikId: korisnik?.radnikId,
        smena: sm,
      });
      if (!cancel) {
        // Nema stavki → gate blokira unos; i to treba da vidi na Danas.
        setListaNedovrsena(!rez.zavrsena);
      }
    })();
    return () => { cancel = true; };
  }, [linija, adminUloga, korisnik?.radnikId, smena]);

  const redosled = rangirajDanasKorake({
    online,
    offlineTotal: counts.total,
    zaglavljenih: zaglavljeni.length,
    imaKriticniAlarm: !!prviAlarm,
    listaNedovrsena,
    linija,
    sifrarnik,
    qa,
    admin,
  });

  const mapa = {
    zaglavljen: {
      id: "zaglavljen",
      naslov: `${zaglavljeni.length} paket(a) nije snimljeno`,
      opis: "Podaci su na uređaju — sinhronizuj pre nastavka unosa.",
      cta: "Pokušaj sync",
      boja: C.crvena,
      onClick: () => flushQueue(),
      testId: "danas-cta-sync-zaglavljen",
    },
    offline: {
      id: "offline",
      naslov: online
        ? `${counts.total} offline paket(a) čeka sync`
        : "Uređaj je offline",
      opis: online
        ? "Pritisni sync da pošalješ red u bazu."
        : "Unosi se čuvaju lokalno dok se mreža ne vrati.",
      cta: online ? `Sync (${counts.total})` : "Sačuvano lokalno",
      boja: C.zuta || C.narandzasta,
      onClick: online ? () => flushQueue() : undefined,
      testId: "danas-cta-sync",
    },
    alarm: prviAlarm && wf ? {
      id: "alarm",
      naslov: prviAlarm.naslov || "Kritičan alarm",
      opis: prviAlarm.opis || `${alarmi.length} alarm(a) zahteva reakciju`,
      cta: `→ ${wf.label}`,
      boja: C.crvena,
      onClick: () => izvrsiWorkflowAkciju(wf.akcija, wf.payload, onWorkflow),
      testId: "danas-cta-alarm",
    } : null,
    lista: {
      id: "lista",
      naslov: "Kontrolna lista pre smene",
      opis: "Obavezna pre unosa — potvrdi stavke pa nastavi na liniju.",
      cta: "Završi listu",
      boja: C.zuta || C.narandzasta,
      onClick: () => onIzbor?.("atributivne"),
      testId: "danas-cta-lista",
    },
    "unos-atr": {
      id: "unos-atr",
      naslov: "Unos na liniji — atributivne",
      opis: "OK/NOK kontrola za trenutnu smenu.",
      cta: "Otvori unos",
      boja: C.plava,
      onClick: () => onIzbor?.("atributivne"),
      testId: "danas-cta-atributivne",
    },
    "unos-mer": {
      id: "unos-mer",
      naslov: "Unos na liniji — merljive",
      opis: "Dimenzije / SPC merenja.",
      cta: "Otvori unos",
      boja: C.zelena,
      onClick: () => onIzbor?.("varijabilne"),
      testId: "danas-cta-varijabilne",
    },
    sifrarnik: {
      id: "sifrarnik",
      naslov: "Šifrarnik — radni režim",
      opis: "Zatvori delimične delove za danas.",
      cta: "Radni sto",
      boja: "#a78bfa",
      onClick: () => onIzbor?.("sifrarnik"),
      testId: "danas-cta-sifrarnik",
    },
    odobrenja: {
      id: "odobrenja",
      naslov: "Pregled odobrenja / alarma",
      opis: "Proveri da li ima blokada na liniji.",
      cta: "Odobrenja",
      boja: C.plava,
      onClick: () => onWorkflow?.onNavigacija?.({ tab: "odobrenja", modul: "atributivne" })
        || onIzbor?.("atributivne"),
      testId: "danas-cta-odobrenja",
    },
    admin: {
      id: "admin",
      naslov: "Go-live / šema",
      opis: "Proveri migracije 77–95 pre produkcije.",
      cta: "Admin",
      boja: C.zuta || C.narandzasta,
      onClick: () => onIzbor?.("admin"),
      testId: "danas-cta-admin",
    },
  };

  const prikaz = redosled.map((id) => mapa[id]).filter(Boolean);
  if (!prikaz.length && loading) return null;
  if (!prikaz.length) return null;

  return (
    <div
      data-testid="danas-tok-panel"
      role="region"
      aria-label="Šta uraditi danas"
      style={{
        width: "100%",
        maxWidth: 960,
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 14,
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
        <div>
          <div style={{ color: C.tekst, fontSize: 12, fontWeight: 700, letterSpacing: 0.8 }}>
            DANAS · ŠTA URADITI
          </div>
          <div style={{ color: C.sivi, fontSize: 9, marginTop: 2 }}>
            Smena {smena} · jedan tok bez skakanja po meniju
          </div>
        </div>
        <div style={{
          fontSize: 9,
          fontWeight: 700,
          color: online ? C.zelena : C.crvena,
        }}>
          {online ? "Online" : "Offline"}
          {counts.total > 0 ? ` · ${counts.total} u redu` : ""}
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {prikaz.map((k, i) => (
          <div
            key={k.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 8,
              background: C.hover,
              border: `1px solid ${i === 0 ? `${k.boja}55` : C.border}`,
            }}
          >
            <div style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: `${k.boja}22`,
              color: k.boja,
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              {i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: C.tekst, fontSize: 12, fontWeight: 700 }}>{k.naslov}</div>
              <div style={{ color: C.sivi, fontSize: 10, marginTop: 2 }}>{k.opis}</div>
            </div>
            {k.onClick && (
              <button
                type="button"
                data-testid={k.testId}
                onClick={k.onClick}
                style={{
                  background: i === 0 ? k.boja : C.panel,
                  border: `1px solid ${k.boja}`,
                  borderRadius: 6,
                  color: i === 0 ? (C.onAkcent || "#fff") : k.boja,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "8px 12px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  minHeight: 40,
                  flexShrink: 0,
                }}
              >
                {k.cta}
              </button>
            )}
            {!k.onClick && (
              <span style={{ color: C.sivi, fontSize: 10, fontWeight: 700 }}>{k.cta}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
