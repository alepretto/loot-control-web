"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usersApi } from "@/lib/api";

const navItems = [
  {
    href: "/summary",
    label: "Gastos",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
        <path d="M3 3v18h18" />
        <path d="M7 16v-4M11 16V9M15 16V5M19 16v-2" />
      </svg>
    ),
  },
  {
    href: "/investments",
    label: "Investimentos",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    href: "/transactions",
    label: "Transações",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M9 7h6M9 11h6M9 15h4" />
      </svg>
    ),
  },
  {
    href: "/tags",
    label: "Tags",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
        <circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/chat",
    label: "Assistente",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
];

const TELEGRAM_BOT_URL = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
  ? `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}`
  : null;

const CollapseIcon = ({ collapsed }: { collapsed: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0 transition-transform duration-200">
    {collapsed
      ? <path d="M9 18l6-6-6-6" />
      : <path d="M15 18l-6-6 6-6" />}
  </svg>
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar-collapsed") === "true";
    }
    return false;
  });

  useEffect(() => {
    usersApi.me().then((user) => {
      if (user.role === "admin") setIsAdmin(true);
    }).catch(() => {});
  }, []);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        className={`shrink-0 sticky top-0 h-screen bg-surface border-r border-border flex flex-col transition-all duration-200 ${
          collapsed ? "w-[60px]" : "w-52"
        }`}
      >
        {/* Logo + collapse button */}
        <div className="px-3 py-5 border-b border-border flex items-center justify-between gap-2 min-w-0">
          <Link href="/summary" className="flex items-center gap-3 min-w-0">
            <Image
              src="/nav-icon.png"
              alt="Loot Control"
              width={34}
              height={34}
              className="rounded-lg shrink-0"
            />
            {!collapsed && (
              <span className="text-sm font-semibold text-text-primary leading-tight truncate">
                Loot Control
              </span>
            )}
          </Link>
          <button
            onClick={toggleCollapse}
            className="text-muted hover:text-text-primary transition-colors shrink-0"
            title={collapsed ? "Expandir" : "Recolher"}
          >
            <CollapseIcon collapsed={collapsed} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  collapsed ? "justify-center" : ""
                } ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:bg-surface-2 hover:text-text-primary"
                }`}
              >
                {item.icon}
                {!collapsed && item.label}
              </Link>
            );
          })}
          {TELEGRAM_BOT_URL && (
            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              title={collapsed ? "Bot no Telegram" : undefined}
              className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-muted hover:bg-surface-2 hover:text-text-primary ${
                collapsed ? "justify-center" : ""
              }`}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
              </svg>
              {!collapsed && "Bot Telegram"}
            </a>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              title={collapsed ? "Admin" : undefined}
              className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                collapsed ? "justify-center" : ""
              } ${
                pathname.startsWith("/admin")
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-surface-2 hover:text-text-primary"
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
                <circle cx="12" cy="8" r="4" />
                <path d="M6 20v-2a6 6 0 0112 0v2" />
              </svg>
              {!collapsed && "Admin"}
            </Link>
          )}
        </nav>

        {/* Sign out */}
        <div className="px-2 py-4 border-t border-border space-y-0.5">
          <Link
            href="/guide"
            title={collapsed ? "Guia de Uso" : undefined}
            className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              collapsed ? "justify-center" : ""
            } ${
              pathname.startsWith("/guide")
                ? "bg-primary/10 text-primary"
                : "text-muted hover:bg-surface-2 hover:text-text-primary"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
              <circle cx="12" cy="17" r=".5" fill="currentColor" stroke="none" />
            </svg>
            {!collapsed && "Guia"}
          </Link>
          <button
            onClick={handleSignOut}
            title={collapsed ? "Sair" : undefined}
            className={`flex items-center gap-3 w-full px-2.5 py-2.5 rounded-lg text-sm text-muted hover:bg-surface-2 hover:text-text-primary transition-colors ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {!collapsed && "Sair"}
          </button>
        </div>
      </aside>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto min-w-0">{children}</main>
    </div>
  );
}
