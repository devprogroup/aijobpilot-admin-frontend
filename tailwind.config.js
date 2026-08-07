/** @type {import('tailwindcss').Config} */
export default { content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"], theme: { extend: { fontFamily: { sans: ["Inter", "sans-serif"] }, colors: { ink: "#17211b", canvas: "#f5f7f4", moss: "#2d6a4f" }, boxShadow: { soft: "0 12px 35px rgba(24, 43, 34, .07)" } } }, plugins: [] };
