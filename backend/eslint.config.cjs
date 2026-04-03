const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    {
        ignores: ['node_modules/**'],
    },
    js.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'commonjs',
            globals: {
                ...globals.node,
            },
        },
        rules: {
            'no-console': 'off',
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            camelcase: [
                'warn',
                {
                    properties: 'never',
                    ignoreDestructuring: true,
                    ignoreImports: true,
                    allow: ['^_$'],
                },
            ],
            'func-names': ['warn', 'as-needed'],
            'id-match': [
                'warn',
                '^_?(?:[a-z][a-zA-Z0-9]*|[A-Z][a-zA-Z0-9]*)$',
                {
                    onlyDeclarations: true,
                    properties: false,
                },
            ],
            'no-restricted-syntax': [
                'warn',
                {
                    selector: "FunctionDeclaration[id.name!=/^[A-Z][a-zA-Z0-9]*$/]",
                    message: 'Function names must be PascalCase like NewFont.',
                },
                {
                    selector: "VariableDeclarator[init.type='ArrowFunctionExpression'][id.type='Identifier'][id.name!=/^[A-Z][a-zA-Z0-9]*$/]",
                    message: 'Function names must be PascalCase like NewFont.',
                },
                {
                    selector: "VariableDeclarator[init.type='FunctionExpression'][id.type='Identifier'][id.name!=/^[A-Z][a-zA-Z0-9]*$/]",
                    message: 'Function names must be PascalCase like NewFont.',
                },
            ],
        },
    },
];