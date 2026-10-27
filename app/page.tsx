import type { Metadata } from "next";
export const dynamic = "force-dynamic";
import { LandingPage } from "@/components/site/landing-page";
export const metadata: Metadata = {
  title: "VoltRoute — A little charge. A lot of possibility.",
  description: "Plan electric journeys and discover your next charging stop.",
};
export default function Home() {
  return <LandingPage />;
}
