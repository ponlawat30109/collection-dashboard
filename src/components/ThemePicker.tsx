import { useEffect, useRef, useState } from "react";

export type ThemeChoice = "system" | "midnight" | "archive" | "ocean" | "forest" | "violet" | "rose" | "light";

interface ThemePickerProps {
  value: ThemeChoice;
  onChange: (theme: ThemeChoice) => void;
}

const themes: Array<{ value: ThemeChoice; label: string; swatch: string }> = [
  { value: "system", label: "System", swatch: "system" },
  { value: "midnight", label: "Midnight", swatch: "midnight" },
  { value: "archive", label: "Warm Archive", swatch: "archive" },
  { value: "ocean", label: "Deep Ocean", swatch: "ocean" },
  { value: "forest", label: "Forest Study", swatch: "forest" },
  { value: "violet", label: "Violet Night", swatch: "violet" },
  { value: "rose", label: "Rose Paper", swatch: "rose" },
  { value: "light", label: "Light Workspace", swatch: "light" },
];

export function ThemePicker({ value, onChange }: ThemePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [open]);

  return (
    <div className="theme-picker" ref={rootRef}>
      <button
        className="theme-trigger"
        type="button"
        aria-label="Choose appearance theme"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M12 3a9 9 0 1 0 9 9c0-1.1-.9-2-2-2h-1.2a2 2 0 0 1-1.6-3.2l.3-.4A2.1 2.1 0 0 0 14.8 3H12Z" />
          <circle cx="7.5" cy="11" r="1" />
          <circle cx="10" cy="7" r="1" />
          <circle cx="8.5" cy="15.5" r="1" />
        </svg>
      </button>
      {open && (
        <div className="theme-menu" role="menu" aria-label="Appearance theme">
          <span className="theme-menu-label">Appearance</span>
          {themes.map((theme) => (
            <button
              type="button"
              role="menuitemradio"
              aria-checked={value === theme.value}
              key={theme.value}
              onClick={() => {
                onChange(theme.value);
                setOpen(false);
              }}
            >
              <span className="theme-swatch" data-swatch={theme.swatch} aria-hidden="true" />
              <span>{theme.label}</span>
              {value === theme.value && <span className="theme-check" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
