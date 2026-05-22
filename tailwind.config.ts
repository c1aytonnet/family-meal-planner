import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        panel: "var(--panel)",
        ink: "var(--ink)",
        mist: "var(--mist)",
        primary: "var(--primary)",
        accent: "var(--accent)",
        soft: "var(--soft)",
        warm: "var(--warm)",
      },
      boxShadow: {
        soft: "0 20px 60px rgba(19, 34, 23, 0.09)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      fontFamily: {
        body: ["var(--font-body)"],
        display: ["var(--font-display)"],
      },
    },
  },
  plugins: [],
};

export default config;
