import type { Config } from "tailwindcss";
export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#22305C", soft: "#3B4C80", faint: "#E3E7F3" },
        paper: { DEFAULT: "#F5F7FB", dark: "#11162A" },
        stamp: { DEFAULT: "#1F7A55", soft: "#DDF1E7" },
        amber: { DEFAULT: "#B7791F", soft: "#FBF0DA" },
        alert: { DEFAULT: "#B3261E", soft: "#FBE3E1" },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        body: ['"Atkinson Hyperlegible"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
