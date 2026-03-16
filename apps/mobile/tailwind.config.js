/* eslint-disable @typescript-eslint/no-require-imports */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#0C5FA8",
        "primary-dark": "#08467D",
        "primary-light": "#3B82C4",
        background: "#F7F1E8",
        surface: "#FFFDFC",
        "text-primary": "#1F2933",
        "text-secondary": "#5F5A52",
        border: "#E7D8C8",
        notification: "#DC3545",
        "accent-teal": "#247C72",
        "warm-ivory": "#F7F1E8",
        "warm-surface": "#FFF8F0",
        "warm-border": "#E8CCAE",
        "warm-accent": "#D89B5B",
        "warm-accent-dark": "#B7793A",
        "warm-highlight": "#F3DFC7",
      },
      fontFamily: {
        poppins: ["Poppins_400Regular"],
        "poppins-medium": ["Poppins_500Medium"],
        "poppins-semibold": ["Poppins_600SemiBold"],
        "poppins-bold": ["Poppins_700Bold"],
        roboto: ["Roboto_400Regular"],
        "roboto-medium": ["Roboto_500Medium"],
      },
    },
  },
  plugins: [],
};
