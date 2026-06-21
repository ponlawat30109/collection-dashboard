import type { ThemeChoice } from "./ThemePicker";
import { ThemePicker } from "./ThemePicker";

interface HeaderProps {
  collectionCount: number;
  websiteCount: number;
  status: "loading" | "connected" | "error";
  theme: ThemeChoice;
  onThemeChange: (theme: ThemeChoice) => void;
}

export function Header({ collectionCount, websiteCount, status, theme, onThemeChange }: HeaderProps) {
  const statusLabel = {
    loading: "Connecting",
    connected: "Saved locally",
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
      </div>
    </header>
  );
}
