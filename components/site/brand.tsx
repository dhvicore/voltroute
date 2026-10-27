import Link from "next/link";

export function Brand({ light = false }: { light?: boolean }) {
  return <Link href="/" aria-label="VoltRoute home" className={`site-brand ${light ? "site-brand-light" : ""}`}><img src="/logo.png" alt="" width={40} height={40} className="site-brand-logo" /><span>VoltRoute<span className="site-brand-dot">.</span></span></Link>;
}
