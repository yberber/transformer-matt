// Light and dark themes follow the system setting until the user picks one.
// A pick that matches the system setting goes back to following it. The inline
// script in index.html applies a stored pick before the first paint.
export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";
const systemDark = matchMedia("(prefers-color-scheme: dark)");

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  return systemDark.matches ? "dark" : "light";
}

export function currentTheme(): Theme {
  return storedTheme() ?? systemTheme();
}

export function setTheme(theme: Theme): void {
  const followSystem = theme === systemTheme();
  if (followSystem) delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  try {
    if (followSystem) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage blocked: the pick lasts for this page only.
  }
}

/** Calls back when the system setting changes; returns the unsubscribe function. */
export function onSystemThemeChange(callback: () => void): () => void {
  systemDark.addEventListener("change", callback);
  return () => systemDark.removeEventListener("change", callback);
}
