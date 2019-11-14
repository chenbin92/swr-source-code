const { eslint, deepmerge } = require('@ice/spec');

module.exports = deepmerge(eslint, {
  rules: {
    'semi': 0,
    'comma-dangle': 0
  }
});
