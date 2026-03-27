/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#FF4D00",
        accent: "#00F5A0",
        background: "#0F0F0F",
        card: "#1A1A1A",
        text: "#FFFFFF",
        textSecondary: "#AAAAAA",
        border: "#333333",
      },
    },
  },
  plugins: [],
};