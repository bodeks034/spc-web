import { describe, it, expect } from "vitest";
import { payloadGreskeApp } from "../src/lib/errorLog.js";

describe("errorLog payload", () => {
  it("skraćuje poruku i stack", () => {
    const p = payloadGreskeApp(
      { message: "x".repeat(600), stack: "y".repeat(3000) },
      { componentStack: "z".repeat(3000) },
      { modul: "Merljive", radnikId: 3, url: "http://localhost/app", userAgent: "test" },
    );
    expect(p.poruka).toHaveLength(500);
    expect(p.stack).toHaveLength(2000);
    expect(p.component_stack).toHaveLength(2000);
    expect(p.modul).toBe("Merljive");
    expect(p.radnik_id).toBe(3);
    expect(p.url).toBe("http://localhost/app");
  });

  it("podrazumevani modul je nepoznat", () => {
    const p = payloadGreskeApp(new Error("boom"), {}, { url: "/", userAgent: "ua" });
    expect(p.modul).toBe("nepoznat");
    expect(p.poruka).toBe("boom");
  });
});
