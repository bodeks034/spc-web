/**
 * ERP preset + config za browser (Vite JSON import).
 */
import sapPreset from "../../config/erp/presets/sap.json" with { type: "json" };
import pantheonPreset from "../../config/erp/presets/pantheon.json" with { type: "json" };
import userConfig from "../../config/erp/erp-uvoz.config.json" with { type: "json" };
import { deepMerge } from "./erpUvozCore.js";

export const ERP_PRESETI = {
  sap: sapPreset,
  pantheon: pantheonPreset,
};

export const ERP_PRESET_LISTA = [
  { id: "sap", naziv: "SAP", opis: sapPreset.opis },
  { id: "pantheon", naziv: "Pantheon", opis: pantheonPreset.opis },
];

/** Spoji preset + korisnički config (config/erp/erp-uvoz.config.json). */
export function ucitajErpConfigBrowser(presetOverride) {
  const presetName = presetOverride || userConfig.preset || "sap";
  const preset = ERP_PRESETI[presetName];
  if (!preset) {
    throw new Error(`Nepoznat ERP preset: ${presetName}`);
  }
  const merged = deepMerge(preset, userConfig);
  merged.preset = presetName;
  return merged;
}

/** Lista uključenih entiteta za prikaz u UI. */
export function listaErpEntiteta(config) {
  const redosled = config.redosled_uvoza || Object.keys(config.entiteti || {});
  return redosled.map((id) => {
    const cfg = config.entiteti?.[id];
    return {
      id,
      ukljuceno: cfg?.ukljuceno !== false,
      opis: cfg?.opis || id,
      fajl: cfg?.fajl,
      alternativni: cfg?.fajl_alternativni || [],
      tabela: cfg?.tabela,
    };
  });
}
