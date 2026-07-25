import type { Metadata } from "next";
import { profile } from "@/content/profile";
import { AboutScene } from "@/components/scenes/AboutScene";

export const metadata: Metadata = {
  title: "About",
  description: profile.bio,
};

export default function AboutPage() {
  return <AboutScene />;
}
