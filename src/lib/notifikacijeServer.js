/** Server-side podrazumevana podešavanja (bez localStorage). */

import { AUTO_NOTIF_DEFAULTS } from "./autoObavestenja.js";

export const DEFAULTS = {
  notif_browser: "0",
  notif_teams: "0",
  teams_webhook: "",
  notif_email: "1",
  notif_email_spc: "1",
  email_webhook: "",
  smtp_host: "",
  smtp_port: "587",
  smtp_user: "",
  smtp_pass: "",
  smtp_from: "",
  smtp_to: "",
  smtp_to_spc: "",
  smtp_tls: "1",
  email_provider: "auto",
  email_resend_from: "",
  ...AUTO_NOTIF_DEFAULTS,
};
