import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0C5FA8",
        "primary-dark": "#08467D",
        "sidebar-bg": "#0B4F86",
        background: "#F7F1E8",
        surface: "#FFFDFC",
        "text-primary": "#1F2933",
        "text-secondary": "#5F5A52",
        border: "#E7D8C8",
        notification: "#DC3545",
        "accent-teal": "#247C72",
        "accent-teal-dark": "#195E56",
        "warm-ivory": "#F7F1E8",
        "warm-surface": "#FFF8F0",
        "warm-border": "#E8CCAE",
        "warm-accent": "#D89B5B",
        "warm-accent-dark": "#B7793A",
        "warm-highlight": "#F3DFC7",
      },
      fontFamily: {
        heading: ["Poppins", "sans-serif"],
        body: ["Roboto", "sans-serif"],
      },
      boxShadow: {
        card: "0 10px 30px rgba(77, 56, 32, 0.08)",
      },
      borderRadius: {
        card: "8px",
      },
    },
  },
  plugins: [],
};

export default config;
