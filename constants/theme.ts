// Design tokens for the light "paper" direction (Sept 2026 prototypes:
// choner_complete_flow_tagline_updated.html, choner_find_tab_standalone.html).
// Keep these additive — existing keys (colors, radius, shadow, spacing)
// are consumed across many files and must not be renamed.
//
// The palette inverted: the page is warm off-white paper, cards are white,
// and the deep navy survives in exactly two places — the floating top bar and
// the floating bottom nav. That contrast is the whole visual idea, so `navy`
// is deliberately a separate token from `bg` rather than an alias.

export const theme = {
  colors: {
    bg: '#FDFCFB',
    surface: '#FFFFFF',
    surfaceHighlight: '#FFFFFF',
    surface2: '#FFFFFF',
    surface3: '#F4F2EF',
    primary: '#FD8302',
    primary2: '#FD5B01',
    secondary: '#FDA340',
    accent: '#FFD2A2',
    text: '#1C2B33',
    muted: '#7C8C96',
    danger: '#E5484D',
    success: '#2E9E6B',
    warning: '#D98324',
    border: '#EFEDEA',
    chip: '#F4F2EF',
    link: '#FD5B01',
    facebook: '#1877F2',
    // The floating chrome. Only the top bar and bottom nav use these.
    navy: '#001827',
    onNavy: '#FFFFFF',
    onNavyMuted: 'rgba(255, 255, 255, 0.4)',
    // Dimmer ink for hairline separators and disabled marks.
    dim: '#D8D2CC',
    // Surface tints used by glass/blur and gradient backdrops.
    glassTint: 'rgba(28, 43, 51, 0.04)',
    glassBorder: 'rgba(28, 43, 51, 0.08)',
    overlayDim: 'rgba(10, 20, 28, 0.45)',
    // Campfire hero — logs, embers, smoke.
    log: '#8A5230',
    logDark: '#5C371F',
    ember: '#FD8302',
    emberDim: '#B34A2A',
    smoke: '#7C8C96'
  },
  // Tuple form so consumers can spread into expo-linear-gradient's `colors` prop.
  gradients: {
    warm: ['#FD8302', '#FD5B01'] as const,
    glow: ['#FDA340', '#FD7A02'] as const,
    calm: ['#FFFFFF', '#FDFCFB'] as const,
    success: ['#2E9E6B', '#54BC8A'] as const,
    sky: ['#FDA340', '#FD7A02'] as const,
    paywall: ['#FDA340', '#FD8302', '#FD5B01'] as const,
    // Time-of-day backdrops for the home hero. On paper these are gentle
    // warm washes rather than night skies — the hero sits on a light page now,
    // so a dark gradient would punch a hole in it.
    skyDawn: ['#FFF4E8', '#FFE8D2', '#FDFCFB'] as const,
    skyDay: ['#FFF8F0', '#FDFCFB', '#FFFFFF'] as const,
    skyDusk: ['#FFEEDC', '#FFE0C6', '#FDFCFB'] as const,
    skyNight: ['#F3F1FA', '#F7F5F2', '#FDFCFB'] as const
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
    // Ink-tinted and much lighter than the old dark-theme shadows — on paper,
    // a 0.25-opacity black shadow reads as dirt rather than depth.
    sm: {
      shadowColor: '#1C2B33',
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2
    },
    md: {
      shadowColor: '#1C2B33',
      shadowOpacity: 0.07,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4
    },
    lg: {
      shadowColor: '#001827',
      shadowOpacity: 0.28,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8
    },
    glow: {
      shadowColor: '#FD5B01',
      shadowOpacity: 0.32,
      shadowRadius: 26,
      shadowOffset: { width: 0, height: 10 },
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
  // Poppins per the Sept 2026 prototypes. `display` is deliberately the LIGHT
  // 300 weight: headlines are set light with a bold span for emphasis
  // ("What are you **starting with?**"), which is the prototype's signature.
  fonts: {
    body: 'Poppins_300Light',
    bodyMedium: 'Poppins_500Medium',
    bodyBold: 'Poppins_600SemiBold',
    display: 'Poppins_300Light',
    displayItalic: 'Poppins_300Light_Italic',
    displayBlack: 'Poppins_700Bold'
  },
  spacing: (n: number) => n * 8
};

export type Theme = typeof theme;
export type GradientName = keyof typeof theme.gradients;
