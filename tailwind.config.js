/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1976d2',
        secondary: '#dc004e',
      },
      spacing: {
        'sidebar': '280px',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
};
