"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usersApi } from "@/lib/api";
import { SettingsProvider } from "@/contexts/SettingsContext";

const navItems = [
  {
    href: "/summary",
    label: "Gastos",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-[20px] h-[20px] shrink-0">
        <path d="M3 3v18h18" />
        <path d="M7 16v-4M11 16V9M15 16V5M19 16v-2" />
      </svg>
    ),
  },
  {
    href: "/investments",
    label: "Investimentos",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-[20px] h-[20px] shrink-0">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    href: "/transactions",
    label: "Transações",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-[20px] h-[20px] shrink-0">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M9 7h6M9 11h6M9 15h4" />
      </svg>
    ),
  },
  {
    href: "/tags",
    label: "Tags",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-[20px] h-[20px] shrink-0">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
        <circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/chat",
    label: "Assistente",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-[20px] h-[20px] shrink-0">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
];

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] shrink-0">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

const TELEGRAM_BOT_URL = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
  ? `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}`
  : null;

const CollapseIcon = ({ collapsed }: { collapsed: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0 transition-transform duration-200">
    {collapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
  </svg>
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("sidebar-collapsed") === "true") {
      setCollapsed(true);
    }
  }, []);

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
    <SettingsProvider>
    <div className="min-h-screen flex">

      {/* ── Sidebar (desktop only) ───────────────────────────────────── */}
      <aside
        className={`hidden md:flex shrink-0 sticky top-0 h-screen flex-col transition-all duration-200 border-r border-border ${
          collapsed ? "w-[56px]" : "w-52"
        }`}
        style={{ background: "linear-gradient(180deg, #0E1218 0%, #0A0F16 100%)" }}
      >
        {/* Logo + collapse */}
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 px-2 py-3 border-b border-border">
            <Link href="/summary" title="Loot Control">
              <Image
                src="/nav-icon.png"
                alt="Loot Control"
                width={38}
                height={38}
                className="rounded-xl ring-1 ring-border hover:ring-primary/40 transition-all"
              />
            </Link>
            <button
              onClick={toggleCollapse}
              className="text-muted hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-surface-2"
              title="Expandir"
            >
              <CollapseIcon collapsed={collapsed} />
            </button>
          </div>
        ) : (
          <div className="border-b border-border">
            <Link href="/summary" className="flex flex-col items-center px-3 pt-4 pb-3 gap-1.5">
              <Image
                src="/logo.png"
                alt="Loot Control"
                width={120}
                height={120}
                className="rounded-2xl w-full"
              />
              <span className="text-xs font-semibold text-muted tracking-widest uppercase">
                Loot Control
              </span>
            </Link>
            <div className="flex justify-end px-2 pb-2">
              <button
                onClick={toggleCollapse}
                className="text-muted hover:text-text-primary transition-colors p-0.5 rounded hover:bg-surface-2"
                title="Recolher"
              >
                <CollapseIcon collapsed={collapsed} />
              </button>
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  collapsed ? "justify-center" : ""
                } ${
                  active
                    ? "bg-primary/10 text-primary nav-active-indicator"
                    : "text-muted hover:bg-surface-2 hover:text-text-primary"
                }`}
              >
                {item.icon}
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
          {TELEGRAM_BOT_URL && (
            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              title={collapsed ? "Bot no Telegram" : undefined}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 text-muted hover:bg-surface-2 hover:text-text-primary ${
                collapsed ? "justify-center" : ""
              }`}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px] shrink-0">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
              </svg>
              {!collapsed && <span className="truncate">Bot Telegram</span>}
            </a>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              title={collapsed ? "Admin" : undefined}
              className={`relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                collapsed ? "justify-center" : ""
              } ${
                pathname.startsWith("/admin")
                  ? "bg-primary/10 text-primary nav-active-indicator"
                  : "text-muted hover:bg-surface-2 hover:text-text-primary"
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] shrink-0">
                <circle cx="12" cy="8" r="4" />
                <path d="M6 20v-2a6 6 0 0112 0v2" />
              </svg>
              {!collapsed && <span className="truncate">Admin</span>}
            </Link>
          )}
        </nav>

        {/* Bottom actions */}
        <div className="px-2 py-3 border-t border-border space-y-0.5">
          <Link
            href="/settings"
            title={collapsed ? "Configurações" : undefined}
            className={`relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              collapsed ? "justify-center" : ""
            } ${
              pathname.startsWith("/settings")
                ? "bg-primary/10 text-primary nav-active-indicator"
                : "text-muted hover:bg-surface-2 hover:text-text-primary"
            }`}
          >
            <SettingsIcon />
            {!collapsed && <span className="truncate">Configurações</span>}
          </Link>
          <Link
            href="/guide"
            title={collapsed ? "Guia de Uso" : undefined}
            className={`relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              collapsed ? "justify-center" : ""
            } ${
              pathname.startsWith("/guide")
                ? "bg-primary/10 text-primary nav-active-indicator"
                : "text-muted hover:bg-surface-2 hover:text-text-primary"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] shrink-0">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
              <circle cx="12" cy="17" r=".5" fill="currentColor" stroke="none" />
            </svg>
            {!collapsed && <span className="truncate">Guia</span>}
          </Link>
          <button
            onClick={handleSignOut}
            title={collapsed ? "Sair" : undefined}
            className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm text-muted hover:bg-surface-2 hover:text-text-primary transition-all duration-150 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] shrink-0">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {!collapsed && <span className="truncate">Sair</span>}
          </button>
        </div>
      </aside>

      {/* ── Content ──────────────────────────────────────────────────── */}
      {/* pb-[calc(4rem+env(safe-area-inset-bottom))] reserva espaço pro bottom nav no mobile */}
      <main className="flex-1 overflow-auto min-w-0 pb-[64px] md:pb-0">
        {children}
      </main>

      {/* ── Bottom nav (mobile only) ─────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border"
        style={{
          background: "#0E1218",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex">
          {navItems.filter(item => item.href !== "/chat").map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center gap-1 pt-2.5 pb-2 text-[10px] font-medium transition-colors duration-150 ${
                  active ? "text-primary" : "text-muted"
                }`}
              >
                <span className={`transition-transform duration-150 ${active ? "scale-110" : ""}`}>
                  {item.icon}
                </span>
                <span className="leading-none">{item.label}</span>
              </Link>
            );
          })}
          <Link
            href="/settings"
            className={`flex-1 flex flex-col items-center gap-1 pt-2.5 pb-2 text-[10px] font-medium transition-colors duration-150 ${
              pathname.startsWith("/settings") ? "text-primary" : "text-muted"
            }`}
          >
            <span className={`transition-transform duration-150 ${pathname.startsWith("/settings") ? "scale-110" : ""}`}>
              <SettingsIcon />
            </span>
            <span className="leading-none">Config.</span>
          </Link>
        </div>
      </nav>

    </div>
    </SettingsProvider>
  );
}
