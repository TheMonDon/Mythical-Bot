/** @type {import('prettier').Config} */
const config = {
  printWidth: 120,
  useTabs: false,
  tabWidth: 2,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'all',
  endOfLine: 'lf',

  plugins: ['prettier-plugin-embed', 'prettier-plugin-sql'],

  embeddedSqlTags: ['sql'],
  language: 'postgresql',
  keywordCase: 'upper',
};

export default config;
