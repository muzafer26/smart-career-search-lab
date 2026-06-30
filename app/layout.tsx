import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Career Search Engine | Next.js, TypeScript & Fuse.js",
  description: "A tutorial-ready standalone search engine demonstrating alias expansion, fuzzy logic, skill matching, and weighted ranking with Fuse.js.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-surface text-on-surface">
        {children}
      </body>
    </html>
  );
}
