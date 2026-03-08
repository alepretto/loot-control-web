"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/transactions", label: "Transações" },
  { href: "/tags", label: "Tags" },
  { href: "/summary", label: "Resumo" },
  { href: "/investments", label: "Investimentos" },
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
          <Image src="/logo.png" alt="Loot Control" width={56} height={56} className="rounded-lg" />
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
