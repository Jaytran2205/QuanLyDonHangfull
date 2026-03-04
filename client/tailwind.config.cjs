/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 12px 30px -18px rgba(15, 23, 42, 0.4)"
      }
    }
  },
  plugins: []
};
