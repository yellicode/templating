export default {
  input: 'dist/es6/templating.js', // rollup requires ES input
  output: {
    format: 'umd',
    name: '@yellicode/templating',
    file: 'dist/bundles/templating.umd.js'
  },
  external: ['@yellicode/core', '@yellicode/elements'] // https://github.com/rollup/rollup/wiki/Troubleshooting#treating-module-as-external-dependency
}
