"use client";

import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "digitalin.theme";

// "light" | "dark" | "system" — pilihan asli pengguna, disimpan.
// "system" diresolve ke terang/gelap lewat matchMedia di bawah.
function readStoredTheme() {
  if (typeof window === "undefined") return "system";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" || v === "system" ? v : "system";
  } catch {
    return "system";
  }
}

function systemPrefersDark() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

const ThemeContext = createContext(null);

// Inline script di app/layout.js sudah memasang data-theme SEBELUM paint
// (hindari kedip terang->gelap), jadi provider ini cuma perlu menyamakan
// state React-nya dan menjaganya tetap sinkron (termasuk saat OS berganti
// tema, kalau pilihannya "system").
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("system"); // pilihan yang disimpan
  const [resolved, setResolved] = useState("light"); // "light" | "dark" yang benar-benar dipakai

  useEffect(() => {
    const stored = readStoredTheme();
    setThemeState(stored);
    setResolved(stored === "system" ? (systemPrefersDark() ? "dark" : "light") : stored);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolved);
  }, [resolved]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(mq.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  function setTheme(next) {
    setThemeState(next);
    setResolved(next === "system" ? (systemPrefersDark() ? "dark" : "light") : next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage nggak tersedia (mis. private mode) — tema tetap
      // kepakai selama sesi ini, cuma nggak nempel lintas refresh.
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme harus dipakai di dalam <ThemeProvider>");
  return ctx;
}
