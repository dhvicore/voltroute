"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export interface DriverUser { id: string; name: string; email: string; phone?: string; role: string }
interface Session { user: DriverUser | null; loading: boolean; isDemo: boolean; signIn: (email: string,password: string) => Promise<void>; register: (name:string,email:string,password:string) => Promise<void>; enterDemo:()=>void; signOut:()=>void; updateUser:(user:DriverUser)=>void }
const Context = createContext<Session | null>(null);
export async function apiRequest<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type","application/json");
  const token = typeof window !== "undefined" ? localStorage.getItem("vr_token") : null;
  if (token) headers.set("Authorization",`Bearer ${token}`);
  const response = await fetch(path,{ ...options, headers });
  const data = await response.json().catch(()=>({ error:"The service is temporarily unavailable. Please try again." }));
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}
export function SessionProvider({children}:{children:ReactNode}) {
  const [user,setUser] = useState<DriverUser|null>(null);
  const [loading,setLoading] = useState(true);
  const [isDemo,setIsDemo] = useState(false);
  useEffect(()=>{
    let active=true;
    async function restore() {
      try {
        if (localStorage.getItem("vr_demo")==="1") { if(active){setIsDemo(true);setUser({id:"demo",name:"Demo Driver",email:"driver@preview.local",role:"user"});} return; }
        if(localStorage.getItem("vr_token")){ const data=await apiRequest<{user:DriverUser}>("/api/auth/me"); if(active)setUser(data.user); }
      } catch { localStorage.removeItem("vr_token"); }
      finally { if(active)setLoading(false); }
    }
    restore(); return ()=>{active=false;};
  },[]);
  const accept = (data:{token:string;user:DriverUser})=>{localStorage.setItem("vr_token",data.token);localStorage.removeItem("vr_demo");setIsDemo(false);setUser(data.user);};
  const signIn = async(email:string,password:string)=>accept(await apiRequest("/api/auth/login",{method:"POST",body:JSON.stringify({email:email.trim().toLowerCase(),password})}));
  const register = async(name:string,email:string,password:string)=>accept(await apiRequest("/api/auth/register",{method:"POST",body:JSON.stringify({name:name.trim(),email:email.trim().toLowerCase(),password})}));
  const enterDemo=()=>{localStorage.removeItem("vr_token");localStorage.setItem("vr_demo","1");setIsDemo(true);setUser({id:"demo",name:"Demo Driver",email:"driver@preview.local",role:"user"});};
  const signOut=()=>{localStorage.removeItem("vr_token");localStorage.removeItem("vr_demo");setUser(null);setIsDemo(false);};
  return <Context.Provider value={{user,loading,isDemo,signIn,register,enterDemo,signOut,updateUser:setUser}}>{children}</Context.Provider>;
}
export function useSession(){const value=useContext(Context);if(!value)throw new Error("SessionProvider is missing");return value;}
