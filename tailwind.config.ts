import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#070B11",
        surface: "#0E1218",
        "surface-2": "#141A22",
        "surface-3": "#1C2330",
        border: "#20282F",
        primary: "#2563eb",
        "primary-hover": "#1d4ed8",
        accent: "#22c55e",
        danger: "#ef4444",
        muted: "#8b949e",
        "text-primary": "#e6edf3",
        "text-secondary": "#7d8590",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        "glow-primary": "0 0 28px rgba(37, 99, 235, 0.22), 0 0 8px rgba(37, 99, 235, 0.1)",
        "glow-accent": "0 0 28px rgba(34, 197, 94, 0.18)",
        "glow-danger": "0 0 28px rgba(239, 68, 68, 0.18)",
        "glow-sm": "0 0 12px rgba(37, 99, 235, 0.12)",
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out forwards",
        "fade-in": "fade-in 0.4s ease-out forwards",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
