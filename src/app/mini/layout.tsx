"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Script from "next/script";

const tabs = [
  {
    href: "/mini",
    label: "Início",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: "/mini/transactions",
    label: "Transações",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M9 7h6M9 11h6M9 15h4" />
      </svg>
    ),
  },
  {
    href: "/mini/summary",
    label: "Resumo",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M3 3v18h18" />
        <path d="M7 16v-4M11 16V9M15 16V5M19 16v-2" />
      </svg>
    ),
  },
  {
    href: "/mini/investments",
    label: "Investimentos",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
];

export default function MiniLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [topInset, setTopInset] = useState(0);

  useEffect(() => {
    try {
      const tg = (window as unknown as { Telegram?: { WebApp?: { ready?: () => void; expand?: () => void; contentSafeAreaInset?: { top?: number } } } }).Telegram?.WebApp;
      tg?.ready?.();
      tg?.expand?.();
      const inset = tg?.contentSafeAreaInset?.top ?? 0;
      setTopInset(inset);
    } catch {
      // Not running inside Telegram — that's fine
    }
  }, []);

  // Don't show the tab bar on the login page
  const showTabs = pathname !== "/mini/login";

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      <div className="min-h-screen bg-background">
        <main className="min-h-screen bg-background pb-20" style={{ paddingTop: topInset > 0 ? `${topInset}px` : "var(--tg-content-safe-area-inset-top, 0px)" }}>
          {children}
        </main>

        {showTabs && (
          <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-50" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div className="flex">
              {tabs.map((tab) => {
                // Exact match for /mini, prefix match for sub-routes
                const active =
                  tab.href === "/mini"
                    ? pathname === "/mini"
                    : pathname.startsWith(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors ${
                      active ? "text-primary" : "text-muted"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
