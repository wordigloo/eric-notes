import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eric Pan — Writing & Photographs",
  description: "Personal writing, notes, and photographs by Eric Pan.",
  other: { "codex-preview": "development" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
