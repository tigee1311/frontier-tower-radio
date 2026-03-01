/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        tower: {
          dark: '#0a0a0f',
          darker: '#06060a',
          panel: '#12121c',
          border: '#1e1e2e',
          accent: '#ff6b35',
          glow: '#ff8c5a',
          blue: '#4a9eff',
          green: '#00ff88',
          muted: '#6b7280',
          text: '#e2e8f0',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Orbitron"', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'announcement': 'announcement 3s ease-in-out',
        'equalizer': 'equalizer 0.5s ease-in-out infinite alternate',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        announcement: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '15%': { opacity: '1', transform: 'scale(1.05)' },
          '25%': { opacity: '1', transform: 'scale(1)' },
          '85%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.95)' },
        },
        equalizer: {
          '0%': { height: '4px' },
          '100%': { height: '24px' },
        },
      },
    },
  },
  plugins: [],
};
