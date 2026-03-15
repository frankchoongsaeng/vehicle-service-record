import type { Config } from 'tailwindcss'

const config: Config = {
    content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
    corePlugins: {
        preflight: false
    },
    theme: {
        extend: {
            boxShadow: {
                card: '0 1px 2px rgba(15, 23, 42, 0.08), 0 1px 1px rgba(15, 23, 42, 0.04)'
            }
        }
    },
    plugins: []
}

export default config
