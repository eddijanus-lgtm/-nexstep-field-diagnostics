"use client";

import type { AppView } from "@/lib/types";

interface SystemHeaderProps {
  code: string;
  light?: boolean;
  online?: boolean;
}

export function SystemHeader({ code, light = false, online = true }: SystemHeaderProps) {
  return (
    <header className={`system-header${light ? " is-light" : ""}`}>
      <span className="brand-mark" aria-label="NEXSTEP">N/S</span>
      <span className="system-code">{code}</span>
      <span className={`system-status${online ? "" : " is-offline"}`}>
        <i aria-hidden="true" />
        {online ? "SYSTEM READY" : "OFFLINE"}
      </span>
    </header>
  );
}

interface CommandRailProps {
  active: AppView;
  onNavigate: (view: AppView) => void;
}

const navItems: Array<{ number: string; label: string; view: AppView }> = [
  { number: "01", label: "START", view: "home" },
  { number: "02", label: "FÄLLE", view: "cases" },
  { number: "03", label: "WISSEN", view: "knowledge" },
];

export function CommandRail({ active, onNavigate }: CommandRailProps) {
  return (
    <nav className="command-rail" aria-label="Hauptnavigation">
      {navItems.map((item) => {
        const isActive =
          item.view === active ||
          (item.view === "home" && (active === "search" || active === "runner"));
        return (
          <button
            key={item.view}
            type="button"
            className={isActive ? "is-active" : ""}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onNavigate(item.view)}
          >
            <span>{item.number}</span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

interface IndexRowProps {
  number: string;
  kicker: string;
  title: string;
  meta: string;
  tone?: "acid" | "cyan" | "orange";
  onClick: () => void;
}

export function IndexRow({
  number,
  kicker,
  title,
  meta,
  tone = "acid",
  onClick,
}: IndexRowProps) {
  return (
    <button className={`index-row tone-${tone}`} type="button" onClick={onClick}>
      <span className="index-number">{number}</span>
      <span className="index-copy">
        <small>{kicker}</small>
        <strong>{title}</strong>
        <em>{meta}</em>
      </span>
      <span className="index-arrow" aria-hidden="true">→</span>
    </button>
  );
}

export function ScreenReaderStatus({ message }: { message: string }) {
  return <p className="sr-only" role="status" aria-live="polite">{message}</p>;
}
