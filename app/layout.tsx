// app/layout.tsx
import "./globals.css";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cole Masaki — Portfolio",
  description: "Designer & 3D/VFX portfolio",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="font-sans antialiased min-h-full">{children}</body>
    </html>
  );
}
