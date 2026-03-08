"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/summary", label: "Resumo" },
  { href: "/investments", label: "Investimentos" },
  { href: "/transactions", label: "Transações" },
  { href: "/tags", label: "Tags" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="h-16 bg-background border-b border-border flex items-center px-4 gap-6 shrink-0">
        <Link href="/transactions" className="flex items-center gap-2 mr-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nav-icon.png" alt="Loot Control" style={{ width: 52, height: 52, objectFit: "contain" }} />
        </Link>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`text-sm font-medium transition-colors ${
              pathname.startsWith(item.href)
                ? "text-primary"
                : "text-muted hover:text-text-primary"
            }`}
          >
            {item.label}
          </Link>
        ))}
        <button
          onClick={handleSignOut}
          className="ml-auto text-xs text-text-secondary hover:text-muted transition-colors"
        >
          Sair
        </button>
      </nav>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
