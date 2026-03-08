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
    },
  },
  plugins: [],
};

export default config;
