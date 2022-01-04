const colors = require('tailwindcss/colors');

const production = !process.env.ROLLUP_WATCH;
module.exports = {
  plugins: [
    require('@tailwindcss/forms'),
  ],
  content: [
    "./src/*.svelte",
    "./src/styles.pcss"
  ],
  theme: {
    cursor: {
      text: 'default',
    },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: colors.black,
      white: colors.white,
      gray: colors.slate,
      green: colors.teal,
      red: colors.red,
      blue: colors.cyan,
      yellow: colors.amber,
      pink: colors.rose,
      purple: colors.violet,
      indigo: colors.indigo,
    }
  }
};