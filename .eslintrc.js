const { eslint, deepmerge } = require('@ice/spec');

module.exports = deepmerge(eslint, {
  rules: {
    'semi': 0,
    'comma-dangle': 0,
    'camelcase': 0,
    'no-unused-expressions': 0,
    'no-underscore-dangle': 0,
    'no-multi-assign': 0,
    'dot-notation': 0
  }
});
