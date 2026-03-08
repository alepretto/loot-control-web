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
        background: "#0d0f12",
        surface: "#141619",
        "surface-2": "#1c1f24",
        "surface-3": "#23272e",
        border: "#2a2d35",
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
