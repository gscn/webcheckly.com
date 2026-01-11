import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans SC"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        'tech-bg': '#050a14',
        'tech-cyan': '#00f0ff',
        'tech-blue': '#2d5af0',
        'tech-purple': '#bc13fe',
        'tech-border': 'rgba(0, 240, 255, 0.3)',
        'tech-surface': 'rgba(10, 20, 30, 0.6)',
      },
      boxShadow: {
        'neon-cyan': '0 0 5px #00f0ff, 0 0 15px rgba(0, 240, 255, 0.3)',
        'neon-blue': '0 0 5px #2d5af0, 0 0 15px rgba(45, 90, 240, 0.3)',
        'inner-glow': 'inset 0 0 20px rgba(0, 240, 255, 0.05)',
      },
      animation: {
        'scan': 'scan 3s linear infinite',
        'pulse-fast': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'text-glitch': 'glitch 3s infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateY(200%)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glitch: {
          '0%, 100%': { textShadow: '0 0 0 transparent' },
          '92%': { textShadow: '0 0 0 transparent' },
          '93%': { textShadow: '2px 0 #00f0ff, -2px 0 #ff0050' },
          '94%': { textShadow: '0 0 0 transparent' },
          '96%': { textShadow: '-2px 0 #00f0ff, 2px 0 #ff0050' },
          '98%': { textShadow: '0 0 0 transparent' },
        },
        'grid-move': {
          '0%': { transform: 'perspective(500px) rotateX(60deg) translateY(0) translateZ(-200px)' },
          '100%': { transform: 'perspective(500px) rotateX(60deg) translateY(50px) translateZ(-200px)' },
        },
      },
    },
  },
  plugins: [],
}
export default config

