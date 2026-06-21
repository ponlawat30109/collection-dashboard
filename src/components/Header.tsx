import { useRef, useState } from "react";
import type { ThemeChoice } from "./ThemePicker";
import { ThemePicker } from "./ThemePicker";

interface HeaderProps {
  collectionCount: number;
  websiteCount: number;
  status: "loading" | "connected" | "error";
  theme: ThemeChoice;
  onThemeChange: (theme: ThemeChoice) => void;
  onSignOut: () => void;
  mode: "local" | "cloud";
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
}

export function Header({ collectionCount, websiteCount, status, theme, onThemeChange, onSignOut, mode, onExport, onImport }: HeaderProps) {
  const importInput = useRef<HTMLInputElement>(null);
  const [transferError, setTransferError] = useState("");
  const statusLabel = {
    loading: "Connecting",
    connected: mode === "local" ? "Saved locally" : "Saved to cloud",
    error: "Needs attention",
  }[status];

  return (
    <header className="hero">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>
        <div>
          <p className="eyebrow">PERSONAL WEB LIBRARY</p>
          <h1>Collections</h1>
        </div>
      </div>
      <div className="hero-copy">
        <p className="subtitle">
          Save it once. Find it anytime.
        </p>
      </div>
      <div className="header-actions">
        <div className="status" data-status={status}>
          <span aria-hidden="true" />
          {statusLabel}
          <span className="sr-only">{collectionCount} collections and {websiteCount} saved websites</span>
        </div>
        <ThemePicker value={theme} onChange={onThemeChange} />
        <button className="header-icon-button" type="button" onClick={onExport} aria-label="Export data" title="Export data">
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 19h14" /></svg>
        </button>
        <button className="header-icon-button" type="button" onClick={() => importInput.current?.click()} aria-label="Import data" title="Import data">
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></svg>
        </button>
        <input
          ref={importInput}
          className="sr-only"
          type="file"
          accept="application/json,.json"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setTransferError("");
            try {
              await onImport(file);
            } catch (error) {
              setTransferError(error instanceof Error ? error.message : "Could not import data.");
            }
            event.target.value = "";
          }}
        />
        <button className="sign-out-button" type="button" onClick={onSignOut} aria-label={mode === "local" ? "Return to sign in" : "Sign out"} title={mode === "local" ? "Return to sign in" : "Sign out"}>
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10M14 8l4 4-4 4M9 12h9" />
          </svg>
        </button>
        {transferError && <span className="transfer-error" role="alert">{transferError}</span>}
      </div>
    </header>
  );
}
