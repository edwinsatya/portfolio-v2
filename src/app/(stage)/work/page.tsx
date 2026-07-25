import type { Metadata } from "next";
import { WorkScene } from "@/components/scenes/WorkScene";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Six years of shipped work — logistics, publishing, health, farming, and the web. Ten selected projects, and the roles they came out of.",
};

export default function WorkPage() {
  return <WorkScene />;
}
