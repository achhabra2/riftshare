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
    }
  },
};