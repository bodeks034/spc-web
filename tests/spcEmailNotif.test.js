import { describe, it, expect } from "vitest";
import { buildSmtpPayload, posaljiObavestenje } from "../src/lib/notifikacije.js";
import { podesavanjaZaTip } from "../src/lib/adminZahtevNotifikacije.js";

describe("SPC email podešavanja", () => {
  it("uključuje email za spc_alarm", () => {
    const s = { notif_email: "0", notif_email_spc: "1", smtp_to_spc: "kvalitet@firma.rs" };
    const eff = podesavanjaZaTip(s, "spc_alarm");
    expect(eff.notif_email).toBe("1");
    expect(eff.smtp_to).toBe("kvalitet@firma.rs");
  });

  it("ne menja prekid zahtev", () => {
    const s = { notif_email: "0", notif_email_spc: "1", smtp_to_spc: "x@y.rs" };
    const eff = podesavanjaZaTip(s, "prekid");
    expect(eff.notif_email).toBe("0");
  });
});

describe("buildSmtpPayload", () => {
  it("šalje pun SMTP kada su sva polja u adminu", () => {
    const body = buildSmtpPayload({
      smtp_host: "smtp.firma.rs",
      smtp_port: "587",
      smtp_user: "spc@firma.rs",
      smtp_pass: "tajna",
      smtp_to: "kvalitet@firma.rs",
      smtp_tls: "1",
    }, { naslov: "Alarm", opis: "Test" });
    expect(body.smtp_host).toBe("smtp.firma.rs");
    expect(body.smtp_pass).toBe("tajna");
    expect(body.to).toBe("kvalitet@firma.rs");
    expect(body.smtp_tls).toBe(false);
  });

  it("koristi Resend kada nema pun SMTP (auto)", () => {
    const body = buildSmtpPayload({
      smtp_to: "kvalitet@firma.rs",
      email_provider: "auto",
    }, { naslov: "Alarm", opis: "Test" });
    expect(body.provider).toBe("resend");
    expect(body.smtp_host).toBeUndefined();
    expect(body.to).toBe("kvalitet@firma.rs");
  });

  it("koristi edge secrets kada nema host/user/pass", () => {
    const body = buildSmtpPayload({
      smtp_to: "kvalitet@firma.rs",
      smtp_tls: "1",
      email_provider: "smtp",
    }, { naslov: "Alarm", opis: "Test" });
    expect(body.smtp_host).toBeUndefined();
    expect(body.provider).toBe("smtp");
    expect(body.to).toBe("kvalitet@firma.rs");
    expect(body.subject).toBe("Alarm");
  });

  it("baca grešku za delimičan SMTP", () => {
    expect(() => buildSmtpPayload({
      smtp_host: "smtp.firma.rs",
      smtp_user: "u",
      smtp_to: "a@b.rs",
      email_provider: "smtp",
    }, { naslov: "X", opis: "Y" })).toThrow(/nije potpun/);
  });
});

describe("posaljiObavestenje u Node (cron)", () => {
  it("ne baca grešku kada window nije definisan", async () => {
    const supabase = {
      from: () => ({
        insert: async () => ({ error: null }),
      }),
    };
    const settings = {
      notif_email: "0",
      notif_browser: "1",
      notif_teams: "0",
    };
    const rez = await posaljiObavestenje(supabase, settings, {
      id: "auto_test",
      naslov: "Test",
      opis: "Poruka",
      nivo: "info",
    });
    expect(rez.rezultati).toEqual([]);
  });
});
