export default {
  tabWidth: 2,
  trailingComma: "all",
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  plugins: [
    "prettier-plugin-astro",
    "@msfjarvis/prettier-plugin-keep-sorted",
    "@trivago/prettier-plugin-sort-imports",
  ],
};
