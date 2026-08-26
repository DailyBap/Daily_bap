import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./config/**/*.{js,ts}",
  ],
  theme: {
    extend: {
      // ----------------------------------------------------------
      // Brand Colors — Daily Bap
      // Source: Provided by client on 2026-08-18
      //
      // TODO: Verify these match the physical print branding
      // before going live.
      // ----------------------------------------------------------
      colors: {
        brand: {
          // Primary Deep Olive Green — main brand color, navbar, buttons
          primary: "#445916",
          // Lime/Yellow-Green — accent, highlights, hover states
          accent: "#9da613",
          // White — background and body text on dark backgrounds
          white: "#ffffff",
        },
      },

      // ----------------------------------------------------------
      // Typography
      // Playfair Display = headings (font-display class)
      // Inter          = body text (font-body class)
      // ----------------------------------------------------------
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },

      // ----------------------------------------------------------
      // Animations
      // ----------------------------------------------------------
      keyframes: {
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
