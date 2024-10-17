// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylisticTs from '@stylistic/eslint-plugin-ts';

export default tseslint.config(
  {
    ignores: ['**/dist/**', 'node_modules', 'eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ['**/*.ts', '**/*.mts', '**/*.cts', '**/*.tsx'],
    plugins: {
      '@stylistic/ts': stylisticTs,
      '@typescript-eslint': tseslint.plugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@stylistic/ts/semi': ['error', 'never'],
      '@stylistic/ts/quotes': ['error', 'single'],
      '@stylistic/ts/indent': ['error', 4],
      '@stylistic/ts/member-delimiter-style': ['error', {
        multiline: {
          delimiter: 'none',
          requireLast: false
        },
        singleline: {
          delimiter: 'comma',
          requireLast: false
        }
      }],
      '@typescript-eslint/consistent-indexed-object-style': 'off',  // Don't need to enforce types be Record
      '@typescript-eslint/explicit-function-return-type': ['warn'], // Warn if no return type is set
      '@typescript-eslint/no-unsafe-call': 'off',                   // There are instances where internal types are ambigious but it doesnt matter                  
      '@typescript-eslint/no-unsafe-member-access': 'off',          // Method calls, above reason
      "@typescript-eslint/no-unused-vars": ["error", {              // Allow unused caught errors
        "caughtErrors": "none"
      }],
      '@typescript-eslint/prefer-nullish-coalescing': 'off',        // Logical OR is fine depending on the circumstance
      '@typescript-eslint/prefer-promise-reject-errors': 'off',     // We reject with errors passed through event listeners that are untyped
      '@typescript-eslint/require-await': 'off',                    // This is literally broken
      '@typescript-eslint/restrict-template-expressions': 'off'     // We make use of template expressions on objects
    },
  }
);