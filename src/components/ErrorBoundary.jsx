import { Component } from "react";
import { snimiGreskuApp } from "../lib/errorLog.js";
import useAppStore from "../lib/appStore.js";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
    const { korisnik } = useAppStore.getState();
    snimiGreskuApp(error, errorInfo, {
      modul: this.props.naziv || "nepoznat",
      radnikId: korisnik?.radnikId ?? null,
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const storeC = useAppStore.getState().temaC;
    const C = this.props.C || storeC || {
      bg: "#181A20",
      panel: "#23262F",
      tekst: "#E6E8EC",
      crvena: "#F6465D",
      plava: "#2D9CDB",
      sivi: "#777E90",
      border: "#353945",
      onAkcent: "#fff",
    };
    const naziv = this.props.naziv || "Modul";
    const msg = this.state.error?.message || "Nepoznata greška";

    return (
      <div style={{
        minHeight: "100vh",
        background: C.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}>
        <div style={{
          maxWidth: 480,
          background: C.panel,
          border: `1px solid ${C.crvena}`,
          borderRadius: 12,
          padding: "28px 24px",
          textAlign: "center",
          color: C.tekst,
          lineHeight: 1.6,
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
            Greška u modulu: {naziv}
          </div>
          <div style={{
            fontSize: 12,
            color: C.sivi,
            marginBottom: 16,
            fontFamily: "'IBM Plex Mono', monospace",
            wordBreak: "break-word",
          }}>
            {msg}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                background: C.plava,
                border: "none",
                borderRadius: 8,
                color: C.onAkcent,
                padding: "10px 20px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Ponovo učitaj
            </button>
            {this.props.onNazad && (
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  this.props.onNazad();
                }}
                style={{
                  background: "transparent",
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  color: C.tekst,
                  padding: "10px 20px",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                ← Početni ekran
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
