/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#16213E',
        paper: '#F4F6FB',
        line: '#DADFEC',
        brand: '#3347B0',
        brandsoft: '#E7EAFA',
        alert: '#C8372D',
        alertsoft: '#FBE9E7',
        amber: '#A86A0B',
        ambersoft: '#FCF1DC',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
