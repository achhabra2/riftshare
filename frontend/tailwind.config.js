const colors = require('tailwindcss/colors');

const production = !process.env.ROLLUP_WATCH;
module.exports = {
  future: {
    purgeLayersByDefault: true,
    removeDeprecatedGapUtilities: true,
  },
  darkMode: "media",
  plugins: [
    require('@tailwindcss/forms'),
  ],
  purge: {
    content: [
      "./src/**/*.svelte",
    ],
    enabled: production // disable purge in dev
  },
  variants: {
    extend: {
      opacity: ['disabled'],
      backgroundColor: ['active'],
    }
  },
  theme: {
    cursor: {
      text: 'default',
    },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: colors.black,
      white: colors.white,
      gray: colors.blueGray,
      green: colors.teal,
      red: colors.red,
      blue: colors.sky,
      yellow: colors.amber,
      pink: colors.rose,
      purple: colors.violet,
      indigo: colors.indigo,
    }
  }
};