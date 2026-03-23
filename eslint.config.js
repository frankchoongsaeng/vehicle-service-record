import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
    globalIgnores(['dist', 'build', 'server/dist']),
    {
        files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}', 'entry.*.tsx'],
        extends: [
            js.configs.recommended,
            tseslint.configs.recommended,
            reactHooks.configs.flat.recommended,
            reactRefresh.configs.vite
        ],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser
        }
    },
    {
        files: ['app/routes/**/*.{ts,tsx}', 'src/ui/root.tsx', 'src/ui/routes/**/*.{ts,tsx}'],
        rules: {
            'react-refresh/only-export-components': [
                'error',
                {
                    allowExportNames: [
                        'action',
                        'clientAction',
                        'clientLoader',
                        'headers',
                        'links',
                        'loader',
                        'meta',
                        'shouldRevalidate'
                    ]
                }
            ]
        }
    },
    {
        files: ['server/**/*.ts'],
        extends: [js.configs.recommended, tseslint.configs.recommended],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.node
        }
    }
])
