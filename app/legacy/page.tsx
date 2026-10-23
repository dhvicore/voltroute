import type { Metadata } from "next";
import Script from "next/script";
import { voltrouteMarkup } from "../../components/voltroute/markup";
import "../voltroute.css";

export const metadata: Metadata = {
  title: "VoltRoute — Charge Smarter. Drive Further.",
};

export default function Home() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
      />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"
        strategy="beforeInteractive"
      />
      <div dangerouslySetInnerHTML={{ __html: voltrouteMarkup }} />
      <Script src="/voltroute.js" strategy="afterInteractive" />
    </>
  );
}
