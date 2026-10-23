import type { Metadata } from "next";
import { VoltRoutePlanner } from "@/components/planner/volt-route-planner";

export const metadata: Metadata = {
  title: "VoltRoute — A little charge. A lot of possibility.",
  description:
    "Plan a charging-friendly journey, discover compatible EV stations, and reserve your next charging stop.",
};

export default function Home() {
  return <VoltRoutePlanner />;
}
