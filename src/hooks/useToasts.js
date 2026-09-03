import { useState, useCallback } from "react";

/**
 * Generički hook za in-app toast notifikacije.
 * @param {number} [trajanje=4500] - Koliko ms toast ostaje vidljiv
 * @returns {{ toasts, addToast }}
 */
export default function useToasts(trajanje = 4500) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((tekst, tip = "info") => {
    const id = Date.now();
    setToasts((p) => [...p, { tekst, tip, id }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), trajanje);
  }, [trajanje]);

  return { toasts, addToast };
}
