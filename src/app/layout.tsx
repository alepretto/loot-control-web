import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loot Control",
  description: "Controle financeiro sem atrito",
  icons: {
    icon: [{ url: "/nav-icon.png", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-background text-text-primary antialiased">{children}</body>
    </html>
  );
}
