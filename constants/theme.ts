// Design tokens for the playful-warm direction.
// Keep these additive — existing keys (colors, radius, shadow, spacing)
// are consumed across many files and must not be renamed.

export const theme = {
  colors: {
    bg: '#001827',
    surface: '#082743',
    surfaceHighlight: '#0A2F50',
    surface2: '#0C3152',
    surface3: '#13446C',
    primary: '#FE8C00',
    primary2: '#FFAB45',
    secondary: '#FFB566',
    accent: '#FFD2A2',
    text: '#F7FAFC',
    muted: '#A5B6C8',
    danger: '#FF6B6B',
    success: '#3DD68C',
    warning: '#FFC46A',
    border: '#16507E',
    chip: '#10365A',
    link: '#33C2FF',
    facebook: '#1877F2',
    // Surface tints used by glass/blur and gradient backdrops.
    glassTint: 'rgba(255, 255, 255, 0.06)',
    glassBorder: 'rgba(255, 255, 255, 0.14)',
    overlayDim: 'rgba(2, 14, 26, 0.55)',
    // Campfire hero — logs, embers, smoke.
    log: '#8A5230',
    logDark: '#5C371F',
    ember: '#FE8C00',
    emberDim: '#B34A2A',
    smoke: '#5E7186'
  },
  // Tuple form so consumers can spread into expo-linear-gradient's `colors` prop.
  gradients: {
    warm: ['#FE8C00', '#FF4E81'] as const,
    glow: ['#FFB566', '#FE8C00'] as const,
    calm: ['#0A2F50', '#001827'] as const,
    success: ['#3DD68C', '#7FE3A1'] as const,
    sky: ['#1F6FFF', '#33C2FF'] as const,
    paywall: ['#FE8C00', '#FF4E81', '#7C5CFF'] as const,
    // Time-of-day backdrops for the campfire home hero. Bottom stop always
    // leans toward ember tones so the flame glow blends into the sky.
    skyDawn: ['#001827', '#123457', '#5C3A56', '#A85340'] as const,
    skyDay: ['#052238', '#0A2F50', '#123457'] as const,
    skyDusk: ['#020E1A', '#2A1F3D', '#5C2F45', '#8A4A3A'] as const,
    skyNight: ['#020610', '#020E1A', '#001827'] as const
  },
  radius: {
    xs: 8,
    sm: 14,
    md: 20,
    lg: 28,
    xl: 36,
    pill: 999
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
      shadowColor: '#FE8C00',
      shadowOpacity: 0.4,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 0 },
      elevation: 10
    }
  },
  // Centralized motion language. Use through `theme.motion.spring.bouncy`
  // etc. so the whole app feels coherent.
  motion: {
    spring: {
      bouncy: { damping: 10, stiffness: 180, mass: 0.8 },
      gentle: { damping: 18, stiffness: 140, mass: 0.9 },
      stiff: { damping: 22, stiffness: 320, mass: 0.7 }
    },
    timing: {
      quick: 160,
      base: 240,
      lazy: 380
    },
    // Press-feedback scale targets for PressableScale.
    pressScale: {
      subtle: 0.985,
      base: 0.96,
      bold: 0.93
    }
  },
  // Font families resolved by expo-font loader in app/_layout.tsx.
  fonts: {
    body: 'Nunito_400Regular',
    bodyMedium: 'Nunito_600SemiBold',
    bodyBold: 'Nunito_700Bold',
    display: 'Nunito_800ExtraBold',
    displayItalic: 'Nunito_800ExtraBold_Italic',
    displayBlack: 'Nunito_900Black'
  },
  spacing: (n: number) => n * 8
};

export type Theme = typeof theme;
export type GradientName = keyof typeof theme.gradients;
