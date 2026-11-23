/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ps: {
          canvas: "#181818",
          panel: "#252526",
          header: "#1e1e1e",
          border: "#383838",
          hover: "#2d2d30",
          active: "#37373d",
          accent: "#3b82f6",
          accentHover: "#2563eb",
          text: "#cccccc",
          textBright: "#ffffff",
          textMuted: "#888888",
        }
      }
    },
  },
  plugins: [],
}
