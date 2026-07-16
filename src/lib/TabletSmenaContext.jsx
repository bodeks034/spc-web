import { createContext, useContext } from "react";

/** Brza smena / idle lock — App postavlja, headeri pozivaju. */
export const TabletSmenaContext = createContext(null);

export function useTabletSmena() {
  return useContext(TabletSmenaContext);
}
