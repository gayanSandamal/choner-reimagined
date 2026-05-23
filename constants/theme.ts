export const theme = {
  colors: {
    bg: '#031A2D',
    surface: '#082743',
    surfaceHighlight: '#0A2F50', // Lighter surface for interactions or hover states
    surface2: '#0C3152',
    surface3: '#13446C',
    primary: '#FF8A1F',
    primary2: '#FF9D45',
    secondary: '#FFB566',
    accent: '#FFD2A2',
    text: '#F7FAFC',
    muted: '#A5B6C8',
    danger: '#FF6B6B',
    success: '#FF9D45', // Kept matching primary for brand alignment or could be green if preferred. Let's keep it consistent.
    warning: '#FFC46A',
    border: '#16507E',
    chip: '#10365A'
  },
  radius: {
    xs: 8,
    sm: 14, // Softer corners
    md: 20, // Softer corners for cards
    lg: 28,
    xl: 36
  },
  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2
    },
    md: {
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4
    },
    lg: {
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8
    },
    glow: {
      shadowColor: '#FF8A1F', // Primary color glow for premium
      shadowOpacity: 0.4,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 0 },
      elevation: 10
    }
  },
  spacing: (n: number) => n * 8
};
