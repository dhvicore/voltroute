"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";

export interface DriverUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  is_operator?: boolean;
}
interface Session {
  user: DriverUser | null;
  loading: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<DriverUser>;
  register: (
    name: string,
    email: string,
    password: string,
    stationId?: string,
    vehicle?: Record<string, unknown>,
  ) => Promise<DriverUser>;
  enterDemo: () => void;
  signOut: () => Promise<void>;
  updateUser: (user: DriverUser) => void;
}
const Context = createContext<Session | null>(null);
export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const token =
    typeof window !== "undefined" ? localStorage.getItem("vr_token") : null;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Retry once on a network blip (for example while the server restarts).
  let response: Response;
  try {
    response = await fetch(path, { ...options, headers });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    await new Promise((r) => setTimeout(r, 800));
    try {
      response = await fetch(path, { ...options, headers });
    } catch (retryError) {
      if ((retryError as Error)?.name === "AbortError") throw retryError;
      throw new Error("Couldn’t reach VoltRoute. Check your connection and try again.");
    }
  }
  const data = await response
    .json()
    .catch(() => ({
      error: "The service is temporarily unavailable. Please try again.",
    }));
  if (response.status === 401 && !path.startsWith("/api/auth/")) {
    // The login has expired: drop any stale token and send the user to log in again.
    if (typeof window !== "undefined") {
      localStorage.removeItem("vr_token");
      if (!/^\/(login|register)/.test(window.location.pathname) && !path.startsWith("/api/auth/"))
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    }
    throw new Error("Your login has expired. Please log in again.");
  }
  if (!response.ok)
    throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DriverUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        if (localStorage.getItem("vr_demo") === "1") {
          if (active) {
            setIsDemo(true);
            setUser({
              id: "demo",
              name: "Demo Driver",
              email: "driver@preview.local",
              role: "user",
            });
          }
          return;
        }
        {
          const data = await apiRequest<{ user: DriverUser }>("/api/auth/me");
          if (active) setUser(data.user);
        }
      } catch {
        localStorage.removeItem("vr_token");
      } finally {
        if (active) setLoading(false);
      }
    }
    restore();
    return () => {
      active = false;
    };
  }, []);
  const accept = (data: { token: string; user: DriverUser }) => {
    localStorage.removeItem("vr_token");
    localStorage.removeItem("vr_demo");
    setIsDemo(false);
    setUser(data.user);
    return data.user;
  };
  const signIn = async (email: string, password: string) =>
    accept(
      await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      }),
    );
  const register = async (
    name: string,
    email: string,
    password: string,
    stationId?: string,
    vehicle?: Record<string, unknown>,
  ) =>
    accept(
      await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          ...(stationId
            ? { account_type: "operator", station_id: stationId }
            : { vehicle }),
        }),
      }),
    );
  const enterDemo = () => {
    localStorage.removeItem("vr_token");
    localStorage.setItem("vr_demo", "1");
    setIsDemo(true);
    setUser({
      id: "demo",
      name: "Demo Driver",
      email: "driver@preview.local",
      role: "user",
    });
  };
  const signOut = async () => {
    await apiRequest("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("vr_token");
    localStorage.removeItem("vr_demo");
    setUser(null);
    setIsDemo(false);
  };
  return (
    <Context.Provider
      value={{
        user,
        loading,
        isDemo,
        signIn,
        register,
        enterDemo,
        signOut,
        updateUser: setUser,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error("SessionProvider is missing");
  return value;
}
