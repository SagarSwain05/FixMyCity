/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // FixMyCity green (keeps the original light-green tints at 50–300)
        primary: {
          50: "#ECFAE5",
          100: "#DDF6D2",
          200: "#CAE8BD",
          300: "#B0DB9C",
          400: "#6fcf6a",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
