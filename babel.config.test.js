module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
  ],
  // Remove next/babel and commonjs transform for test environment only
  env: {
    test: {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript',
        'next/babel',
      ],
      plugins: ['@babel/plugin-transform-modules-commonjs'],
    },
  },
};
