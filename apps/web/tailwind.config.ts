import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0A62BF",
        "primary-dark": "#084A8A",
        "sidebar-bg": "#0C6CB1",
        background: "#F8F9FA",
        surface: "#FFFFFF",
        "text-primary": "#212529",
        "text-secondary": "#4A4A4A",
        border: "#E3E6E8",
        notification: "#DC3545",
      },
      fontFamily: {
        heading: ["Poppins", "sans-serif"],
        body: ["Roboto", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(33, 37, 41, 0.08)",
      },
      borderRadius: {
        card: "8px",
      },
    },
  },
  plugins: [],
};

export default config;
