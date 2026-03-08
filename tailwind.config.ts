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
        background: "#0f1117",
        surface: "#1a1d2e",
        "surface-2": "#252840",
        border: "#2d3154",
        primary: "#6366f1",
        "primary-hover": "#4f52d4",
        accent: "#10b981",
        danger: "#ef4444",
        muted: "#6b7280",
        "text-primary": "#f1f5f9",
        "text-secondary": "#94a3b8",
      },
    },
  },
  plugins: [],
};

export default config;
