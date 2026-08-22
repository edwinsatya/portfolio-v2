import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { profile } from "@/content/profile";
import { siteUrl } from "@/lib/site";
import "./globals.css";

// Display face — a little character in the headings, still readable small.
const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

// Body face — gets out of the way.
const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const title = `${profile.name} — ${profile.role}`;
const description = profile.bio;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: `%s — ${profile.name}`,
  },
  description,
  applicationName: `${profile.firstName}'s Portfolio`,
  authors: [{ name: profile.name, url: profile.links.github }],
  creator: profile.name,
  keywords: [
    "Edwin Satya Yudistira",
    "Full-Stack Developer",
    "Web Developer Indonesia",
    "React",
    "Next.js",
    "TypeScript",
    "Node.js",
    "AI Integration",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: profile.name,
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#06070b",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} h-full antialiased`}
      // `globals.css` sets `scroll-behavior: smooth` on <html> for the nav's
      // section links. Next 16 no longer suppresses that during route
      // transitions unless asked, and warns when it finds smooth scrolling it
      // isn't managing. This is a one-page site, so there's little for the
      // override to do — but it's what the framework asks for, and it keeps a
      // route change (or a return from /not-found) starting at the top rather
      // than gliding there.
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full">
        {/* Reveal-on-scroll starts hidden and is unhidden by JS. With scripting
            off nothing would ever unhide it, so force everything visible. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <a
          href="#about"
          className="sr-only rounded-full bg-accent px-4 py-2 font-medium text-bg focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-100"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
