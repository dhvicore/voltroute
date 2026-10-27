"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Moon, Sun } from "lucide-react";
type Theme = "dark" | "light";
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    let saved: Theme = "dark";
    try {
      saved =
        localStorage.getItem("voltroute-theme") === "light" ? "light" : "dark";
    } catch {}
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);
  const toggle = () =>
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem("voltroute-theme", next);
      } catch {}
      return next;
    });
  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  return useContext(ThemeContext);
}
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      className={`theme-toggle ${compact ? "theme-toggle-compact" : ""}`}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      onClick={toggle}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
