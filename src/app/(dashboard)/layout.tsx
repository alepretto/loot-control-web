"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { marketDataApi, usersApi } from "@/lib/api";
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";

// ─── Navigation config ────────────────────────────────────────────────────────

const MAIN_NAV = [
  {
    href: "/painel",
    label: "Painel",
    icon: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  },
  {
    href: "/transactions",
    label: "Lançamentos",
    icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  },
  {
    href: "/patrimonio",
    label: "Patrimônio",
    icon: 'M3 3v18h18 M7 16l4-4 4 4 5-7',
  },
  {
    href: "/investments",
    label: "Investimentos",
    icon: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
  },
  {
    href: "/orcamentos",
    label: "Orçamentos",
    icon: 'M12 12m-9 0a9 9 0 1018 0 9 9 0 10-18 0 M12 12m-5 0a5 5 0 1010 0 5 5 0 10-10 0 M12 12m-1 0a1 1 0 102 0 1 1 0 10-2 0',
  },
  {
    href: "/summary",
    label: "Resumo",
    icon: 'M4 20V10M10 20V4M16 20V14M22 20v-8',
  },
];

const MANAGE_NAV = [
  {
    href: "/contas",
    label: "Contas",
    icon: 'M20 12V8H6a2 2 0 010-4h12v4 M20 12v8H6a2 2 0 01-2-2V6 M18 12h4v4h-4a2 2 0 010-4z',
  },
  {
    href: "/faturas",
    label: "Faturas",
    icon: 'M21 4H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V6a2 2 0 00-2-2zM1 10h22',
  },
  {
    href: "/passivos",
    label: "Passivos",
    icon: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h1M9 13h1M9 17h1M14 9h1M14 13h1M14 17h1',
  },
  {
    href: "/recorrencias",
    label: "Recorrências",
    icon: 'M12 12m-9 0a9 9 0 1018 0 9 9 0 10-18 0 M12 7v5l3 2',
  },
  {
    href: "/tags",
    label: "Taxonomia",
    icon: 'M12 2l-10 6 10 6 10-6-10-6zM2 17l10 6 10-6M2 12l10 6 10-6',
  },
];

// ─── Nav icon component ───────────────────────────────────────────────────────

function NavIcon({ d, size = 14 }: { d: string; size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round"
      className="shrink-0"
    >
      <path d={d} />
    </svg>
  );
}

// ─── Collapse icon ────────────────────────────────────────────────────────────

const CollapseIcon = ({ collapsed }: { collapsed: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0 transition-transform duration-200">
    {collapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
  </svg>
);

const TELEGRAM_BOT_URL = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
  ? `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}`
  : null;

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  function MonthSelector() {
    const { selectedMonth, setSelectedMonth } = useSettings();

    const [year, month] = selectedMonth.split("-").map(Number);
    const label = `${MONTHS_PT[month - 1]}/${year}`;

    function prevMonth() {
      let y = year, m = month - 1;
      if (m < 1) { m = 12; y -= 1; }
      setSelectedMonth(`${y}-${String(m).padStart(2, "0")}`);
    }

    function nextMonth() {
      let y = year, m = month + 1;
      if (m > 12) { m = 1; y += 1; }
      setSelectedMonth(`${y}-${String(m).padStart(2, "0")}`);
    }

    return (
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-surface-2">
        <button onClick={prevMonth} className="p-1 text-muted hover:text-text-primary rounded transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <span className="text-[14px] md:text-[15px] font-medium min-w-[70px] text-center">{label}</span>
        <button onClick={nextMonth} className="p-1 text-muted hover:text-text-primary rounded transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>
    );
  }

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [ticker, setTicker] = useState<{ usd?: number; btc?: number; ibov?: number }>({});

  useEffect(() => {
    if (localStorage.getItem("sidebar-collapsed") === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    usersApi.me().then((user) => {
      if (user.role === "admin") setIsAdmin(true);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    marketDataApi.assetPrices().then((res) => {
      const prices: Record<string, number> = {};
      for (const p of res.prices) {
        if (p.symbol === "BTC" || p.symbol === "IBOV") {
          prices[p.symbol] = p.price;
        }
      }
      setTicker(prices);
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

  function NavItem({ href, label, icon }: { href: string; label: string; icon: string }) {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        title={collapsed ? label : undefined}
        className={`relative flex items-center gap-2.5 px-2.5 py-[7px] text-[13px] md:text-[14px] font-medium transition-all duration-150 ${
          collapsed ? "justify-center" : ""
        } ${
          active
            ? "text-text-primary font-semibold"
            : "text-muted hover:text-text-primary"
        }`}
      >
        {active && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-primary rounded-r" />
        )}
        <span className={active ? "text-text-primary" : "text-muted"}>
          <NavIcon d={icon} size={15} />
        </span>
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    );
  }

  const BOTTOM_NAV_ITEMS = [...MAIN_NAV.slice(0, 4)];

  return (
    <SettingsProvider>
      <div className="min-h-screen flex">

        {/* ── Sidebar (desktop only) ───────────────────────────────────── */}
        <aside
          className={`hidden md:flex shrink-0 sticky top-0 h-screen flex-col transition-all duration-200 border-r border-border ${
            collapsed ? "w-[52px]" : "w-[188px]"
          }`}
          style={{ background: "#0A0E15" }}
        >
          {/* Logo */}
          {collapsed ? (
            <div className="flex flex-col items-center gap-2 px-2 py-3 border-b border-border">
              <Link href="/painel" title="Loot Control">
                <Image src="/nav-icon.png" alt="Loot Control" width={36} height={36}
                  className="rounded-xl ring-1 ring-border hover:ring-primary/40 transition-all" />
              </Link>
              <button onClick={toggleCollapse} className="text-muted hover:text-text-primary transition-colors p-1 rounded hover:bg-surface-2" title="Expandir">
                <CollapseIcon collapsed={collapsed} />
              </button>
            </div>
          ) : (
            <div className="border-b border-border">
              <div className="flex items-center gap-2.5 px-3.5 pt-4 pb-3">
                <div className="shrink-0 w-6 h-6 bg-primary flex items-center justify-center"
                  style={{ clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)" }}>
                  <span className="text-white text-[11px] font-bold font-mono">L</span>
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] md:text-[14px] font-bold tracking-tight">LOOT CONTROL</div>
                  <div className="text-[10px] md:text-[11px] text-muted font-mono uppercase tracking-widest">Terminal · v2</div>
                </div>
                <button onClick={toggleCollapse} className="ml-auto text-muted hover:text-text-primary transition-colors p-0.5 rounded hover:bg-surface-2" title="Recolher">
                  <CollapseIcon collapsed={collapsed} />
                </button>
              </div>
            </div>
          )}

          {/* Nav */}
          <nav className="flex-1 px-1.5 py-2 overflow-y-auto space-y-0.5">
            {!collapsed && (
              <div className="text-[10px] md:text-[11px] font-semibold text-muted uppercase tracking-widest px-2.5 pt-1 pb-1.5">Visão</div>
            )}
            {MAIN_NAV.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}

            {!collapsed && (
              <div className="text-[10px] md:text-[11px] font-semibold text-muted uppercase tracking-widest px-2.5 pt-4 pb-1.5">Gestão</div>
            )}
            {collapsed && <div className="border-t border-border my-1.5" />}
            {MANAGE_NAV.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}

            {TELEGRAM_BOT_URL && (
              <a
                href={TELEGRAM_BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                title={collapsed ? "Bot no Telegram" : undefined}
                className={`flex items-center gap-2.5 px-2.5 py-[7px] text-[13px] md:text-[14px] font-medium text-muted hover:text-text-primary transition-all duration-150 ${collapsed ? "justify-center" : ""}`}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-[15px] h-[15px] shrink-0">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
                </svg>
                {!collapsed && <span className="truncate">Telegram</span>}
              </a>
            )}

            {isAdmin && (
              <Link
                href="/admin"
                title={collapsed ? "Admin" : undefined}
                className={`relative flex items-center gap-2.5 px-2.5 py-[7px] text-[13px] md:text-[14px] font-medium transition-all duration-150 ${collapsed ? "justify-center" : ""} ${
                  pathname.startsWith("/admin") ? "text-text-primary font-semibold" : "text-muted hover:text-text-primary"
                }`}
              >
                {pathname.startsWith("/admin") && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-primary rounded-r" />
                )}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px] shrink-0">
                  <circle cx="12" cy="8" r="4" /><path d="M6 20v-2a6 6 0 0112 0v2" />
                </svg>
                {!collapsed && <span className="truncate">Admin</span>}
              </Link>
            )}
          </nav>

          {/* Bottom */}
          <div className="px-1.5 py-2 border-t border-border space-y-0.5">
            {!collapsed && (ticker.usd || ticker.btc || ticker.ibov) && (
              <div className="flex items-center gap-3 px-2.5 py-2 text-[11px] md:text-[12px] font-mono">
                {ticker.usd && <span className="text-accent">USD&nbsp;{ticker.usd.toFixed(2)}</span>}
                {ticker.btc && <span className="text-accent">BTC&nbsp;{ticker.btc >= 1000 ? `${(ticker.btc/1000).toFixed(1)}k` : ticker.btc.toFixed(0)}</span>}
                {ticker.ibov && <span className="text-primary">IBOV&nbsp;{ticker.ibov.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>}
              </div>
            )}
            <Link
              href="/settings"
              title={collapsed ? "Configurações" : undefined}
              className={`relative flex items-center gap-2.5 px-2.5 py-[7px] text-[13px] md:text-[14px] font-medium transition-all duration-150 ${collapsed ? "justify-center" : ""} ${
                pathname.startsWith("/settings") ? "text-text-primary font-semibold" : "text-muted hover:text-text-primary"
              }`}
            >
              {pathname.startsWith("/settings") && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-primary rounded-r" />
              )}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px] shrink-0">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
              {!collapsed && <span className="truncate">Configurações</span>}
            </Link>
            <Link
              href="/guide"
              title={collapsed ? "Guia" : undefined}
              className={`relative flex items-center gap-2.5 px-2.5 py-[7px] text-[13px] md:text-[14px] font-medium transition-all duration-150 ${collapsed ? "justify-center" : ""} ${
                pathname.startsWith("/guide") ? "text-text-primary font-semibold" : "text-muted hover:text-text-primary"
              }`}
            >
              {pathname.startsWith("/guide") && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-primary rounded-r" />
              )}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px] shrink-0">
                <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><circle cx="12" cy="17" r=".5" fill="currentColor" stroke="none" />
              </svg>
              {!collapsed && <span className="truncate">Guia</span>}
            </Link>
            <button
              onClick={handleSignOut}
              title={collapsed ? "Sair" : undefined}
              className={`flex items-center gap-2.5 w-full px-2.5 py-[7px] text-[13px] md:text-[14px] font-medium text-muted hover:text-text-primary transition-all duration-150 ${collapsed ? "justify-center" : ""}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px] shrink-0">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {!collapsed && <span className="truncate">Sair</span>}
            </button>
          </div>
        </aside>

        {/* ── Content ──────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-auto min-w-0 pb-[64px] md:pb-0">
          {children}
        </main>

        {/* ── Bottom nav (mobile only) ─────────────────────────────────── */}
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border"
          style={{ background: "#0A0E15", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="flex">
            {BOTTOM_NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex-1 flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-medium transition-colors duration-150 ${active ? "text-primary" : "text-muted"}`}
                >
                  <span className={`transition-transform duration-150 ${active ? "scale-110" : ""}`}>
                    <NavIcon d={item.icon} size={22} />
                  </span>
                  <span className="leading-none">{item.label.split(" ")[0]}</span>
                </Link>
              );
            })}
            <Link
              href="/settings"
              className={`flex-1 flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-medium transition-colors duration-150 ${pathname.startsWith("/settings") ? "text-primary" : "text-muted"}`}
            >
              <span className={`transition-transform duration-150 ${pathname.startsWith("/settings") ? "scale-110" : ""}`}>
                <NavIcon d="M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51h0a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" size={22} />
              </span>
              <span className="leading-none">Config.</span>
            </Link>
          </div>
        </nav>

      </div>
    </SettingsProvider>
  );
}
