module.exports = {
  extends: ['stylelint-config-standard', 'stylelint-config-css-modules'],
  rules: {
    'selector-class-pattern': [
      '^[a-z][a-z0-9]*(?:[-_]{1,2}[a-z0-9]+)*$',
      {
        message: 'Expected class selector to be kebab-case or BEM style',
      },
    ],
    'color-function-notation': 'modern',
  },
};
