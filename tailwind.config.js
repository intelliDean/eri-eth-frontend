/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx}',
        './components/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                blue: {
                    100: '#EBF8FF',
                    500: '#3B82F6',
                    600: '#2563EB',
                    800: '#1E40AF',
                },
                teal: {
                    100: '#CCFBF1',
                    500: '#14B8A6',
                    600: '#0D9488',
                },
            },
        },
    },
    plugins: [],
}