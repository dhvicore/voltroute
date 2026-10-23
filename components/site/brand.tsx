import Link from "next/link";
import { Zap } from "lucide-react";

export function Brand({ light = false }: { light?: boolean }) {
  return <Link href="/" aria-label="VoltRoute home" className={`site-brand ${light ? "site-brand-light" : ""}`}><span className="site-brand-mark"><Zap size={21} fill="currentColor" strokeWidth={1.6} /></span><span>VoltRoute<span className="site-brand-dot">.</span></span></Link>;
}
