import { useState, useEffect } from "react";
import { smenaPoSatu } from "../lib/smena.js";

const SYNC_KEY = "spc_smena";
const INTERVAL_MS = 30_000;

/** Automatska smena po satu — sinhronizuje localStorage/sessionStorage. */
export function useAutoSmena(asString = false) {
  const [smena, setSmena] = useState(() => {
    const s = smenaPoSatu();
    return asString ? String(s) : s;
  });

  useEffect(() => {
    const sync = () => {
      const nova = smenaPoSatu();
      const next = asString ? String(nova) : nova;
      setSmena((prev) => {
        if (asString ? prev === next : Number(prev) === nova) return prev;
        return next;
      });
      localStorage.setItem(SYNC_KEY, String(nova));
      sessionStorage.setItem(SYNC_KEY, String(nova));
    };
    sync();
    const id = setInterval(sync, INTERVAL_MS);
    return () => clearInterval(id);
  }, [asString]);

  return smena;
}
