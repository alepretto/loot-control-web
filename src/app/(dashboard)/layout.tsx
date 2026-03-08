"use client";

import Link from "next/link";
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
      <nav className="h-12 bg-[#1a1d2e] border-b border-[#2d3154] flex items-center px-4 gap-6 shrink-0">
        <span className="text-sm font-bold mr-4">
          <span className="text-indigo-500">Loot</span> Control
        </span>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`text-sm font-medium transition-colors ${
              pathname.startsWith(item.href)
                ? "text-indigo-400"
                : "text-[#94a3b8] hover:text-[#f1f5f9]"
            }`}
          >
            {item.label}
          </Link>
        ))}
        <button
          onClick={handleSignOut}
          className="ml-auto text-xs text-[#6b7280] hover:text-[#94a3b8] transition-colors"
        >
          Sair
        </button>
      </nav>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
