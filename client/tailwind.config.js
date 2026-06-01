export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#2F63E6',
          sky: '#5D84F4',
          cream: '#F7F8FB',
          card: '#FFFFFF',
          text: '#080B18',
          muted: '#6B7280',
          yellow: '#FFD54A',
          green: '#68C9A8',
          amber: '#F4B860',
          coral: '#E67C73'
        }
      },
      boxShadow: {
        soft: '0 18px 45px rgba(16, 24, 40, 0.10)'
      }
    }
  },
  plugins: []
};
