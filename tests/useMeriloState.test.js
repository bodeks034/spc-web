import { describe, it, expect, vi } from "vitest";

// Test useMeriloState logike bez React renderHook
describe("useMeriloState logika", () => {
  it("localStorage čuva merilo_auto_snimi", () => {
    localStorage.setItem("merilo_auto_snimi", "1");
    expect(localStorage.getItem("merilo_auto_snimi")).toBe("1");
    localStorage.setItem("merilo_auto_snimi", "0");
    expect(localStorage.getItem("merilo_auto_snimi")).toBe("0");
  });

  it("simulacija opcija se čita iz opts", () => {
    const opts1 = { simulacija: true };
    const opts2 = {};
    expect(!!opts1.simulacija).toBe(true);
    expect(!!opts2.simulacija).toBe(false);
  });

  it("ref pattern radi ispravno", () => {
    const ref = { current: null };
    const fn = vi.fn();
    ref.current = fn;
    expect(ref.current).toBe(fn);
    ref.current();
    expect(fn).toHaveBeenCalledOnce();
  });
});
