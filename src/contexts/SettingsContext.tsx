"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ExchangeRates, marketDataApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

export type DisplayCurrency = "BRL" | "USD" | "EUR";

export interface Settings {
  timezone: string;
  displayCurrency: DisplayCurrency;
  selectedMonth: string;
}

const DEFAULT_SETTINGS: Settings = {
  timezone: "America/Sao_Paulo",
  displayCurrency: "BRL",
  selectedMonth: (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  })(),
};

const DEFAULT_RATES: ExchangeRates = { USD: 5.0, EUR: 5.5 };

interface SettingsContextValue extends Settings {
  rates: ExchangeRates;
  updateSettings: (s: Partial<Settings>) => void;
  setSelectedMonth: (m: string) => void;
  convertToDisplay: (value: number, fromCurrency: string) => number;
  fmtDisplay: (value: number, fromCurrency: string) => string;
}

const SettingsContext = createContext<SettingsContextValue>({
  ...DEFAULT_SETTINGS,
  rates: DEFAULT_RATES,
  updateSettings: () => {},
  setSelectedMonth: () => {},
  convertToDisplay: (v) => v,
  fmtDisplay: (v, c) => formatCurrency(v, c as DisplayCurrency),
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("loot-settings");
        if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      } catch {}
    }
    return DEFAULT_SETTINGS;
  });

  const [rates, setRates] = useState<ExchangeRates>(DEFAULT_RATES);

  useEffect(() => {
    marketDataApi.exchangeRates().then(setRates).catch(() => {});
  }, []);

  function updateSettings(partial: Partial<Settings>) {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem("loot-settings", JSON.stringify(next));
      return next;
    });
  }

  function setSelectedMonth(month: string) {
    updateSettings({ selectedMonth: month });
  }

  function convertToDisplay(value: number, fromCurrency: string): number {
    const { displayCurrency } = settings;
    if (fromCurrency === displayCurrency) return value;
    // Step 1: convert to BRL
    let brl = value;
    if (fromCurrency === "USD") brl = value * (rates.USD ?? 5.0);
    else if (fromCurrency === "EUR") brl = value * (rates.EUR ?? 5.5);
    // Step 2: BRL → displayCurrency
    if (displayCurrency === "BRL") return brl;
    if (displayCurrency === "USD") return brl / (rates.USD ?? 5.0);
    if (displayCurrency === "EUR") return brl / (rates.EUR ?? 5.5);
    return brl;
  }

  function fmtDisplay(value: number, fromCurrency: string): string {
    return formatCurrency(convertToDisplay(value, fromCurrency), settings.displayCurrency);
  }

  return (
    <SettingsContext.Provider value={{ ...settings, rates, updateSettings, setSelectedMonth, convertToDisplay, fmtDisplay }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
