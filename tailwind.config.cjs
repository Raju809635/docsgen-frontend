/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 0 1px rgba(56,189,248,0.35), 0 10px 40px rgba(0,0,0,0.45)"
      }
    },
  },
  plugins: [],
};

