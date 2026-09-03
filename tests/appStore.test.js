import { describe, it, expect, beforeEach } from "vitest";
import useAppStore, { sinhronizujAppStore } from "../src/lib/appStore.js";

describe("appStore", () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  it("pocetni state ima null korisnika i null modul", () => {
    const s = useAppStore.getState();
    expect(s.korisnik).toBeNull();
    expect(s.modul).toBeNull();
    expect(s.rezimRada).toBe("linija");
    expect(s.temaC).toBeNull();
  });

  it("setKorisnik postavlja korisnika", () => {
    useAppStore.getState().setKorisnik({ ime: "Test", uloga: "admin" });
    expect(useAppStore.getState().korisnik).toEqual({ ime: "Test", uloga: "admin" });
  });

  it("setModul postavlja modul", () => {
    useAppStore.getState().setModul("sifrarnik");
    expect(useAppStore.getState().modul).toBe("sifrarnik");
  });

  it("setRezimRada menja rezim", () => {
    useAppStore.getState().setRezimRada("analitika");
    expect(useAppStore.getState().rezimRada).toBe("analitika");
  });

  it("reset vraca sve na pocetne vrednosti", () => {
    const s = useAppStore.getState();
    s.setKorisnik({ ime: "X" });
    s.setModul("admin");
    s.setRezimRada("analitika");
    s.setTemaC({ bg: "#000" });
    s.reset();
    const r = useAppStore.getState();
    expect(r.korisnik).toBeNull();
    expect(r.modul).toBeNull();
    expect(r.rezimRada).toBe("linija");
    expect(r.temaC).toBeNull();
  });

  it("sinhronizujAppStore upisuje sve ključne vrednosti", () => {
    const tema = { bg: "#111", tekst: "#eee" };
    sinhronizujAppStore({
      korisnik: { ime: "Ana", uloga: "admin", radnikId: 7 },
      modul: "admin",
      rezimRada: "analitika",
      licenca: { ok: true },
      temaC: tema,
    });
    const s = useAppStore.getState();
    expect(s.korisnik.ime).toBe("Ana");
    expect(s.modul).toBe("admin");
    expect(s.rezimRada).toBe("analitika");
    expect(s.licenca).toEqual({ ok: true });
    expect(s.temaC).toBe(tema);
  });
});
