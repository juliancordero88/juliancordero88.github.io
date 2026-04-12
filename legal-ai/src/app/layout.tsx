import type { Metadata } from "next";
import "./globals.css";

// This app requires auth — never pre-render any route at build time
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "LexOS — AI Law Firm Platform",
  description: "AI-powered multi-agent platform for legal practice management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
