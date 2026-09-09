"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

// The `.dark` class on <html> lives outside React (set by the inline script
// in app/layout.tsx, before hydration) — useSyncExternalStore reads it
// safely across server/client without a mismatch, and re-renders whenever
// toggle() below fires this event.
const THEME_CHANGE_EVENT = "edumis:theme-change";

function subscribe(callback: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, callback);
}
function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}
function getServerSnapshot() {
  return false;
}

/** Toggles the `.dark` class set by the inline script in app/layout.tsx and remembers the choice. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Private browsing / storage disabled — theme just won't persist across visits.
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  return (
    <button
      onClick={toggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={className}
    >
      {isDark ? <Sun size={16} className="shrink-0" /> : <Moon size={16} className="shrink-0" />}
    </button>
  );
}
