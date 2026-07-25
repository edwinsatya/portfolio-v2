import type { Metadata } from "next";
import { ContactScene } from "@/components/scenes/ContactScene";
import { profile } from "@/content/profile";

export const metadata: Metadata = {
  title: "Contact",
  description: `Open to full-time roles and freelance projects. Email ${profile.email} — replies within about 24 hours.`,
};

export default function ContactPage() {
  return <ContactScene />;
}
