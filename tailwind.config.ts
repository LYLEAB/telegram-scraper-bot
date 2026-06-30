import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: "#E41E26",
        navy: "#2B3674",
        "horizon-secondary": "#A3AED0",
        "horizon-light": "#F4F7FE",
      },
      boxShadow: {
        horizon: "0px 18px 40px rgba(112, 144, 176, 0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
