import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

// The intro's ground: the one dark screen in a light app. A title card, not
// the start of a dark theme.
//
// Three layers, all decoration and all behind the content: the navy radial
// ground, a warm bleed rising from the bottom, and a softer one top right.
// There is deliberately nothing behind the logo. The mark is orange line art,
// and a halo behind line art reads as a rendering fault.
export function IntroBackdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          {/* radial-gradient(140% 90% at 15% 0%, ...) from the prototype. SVG
              on the web has one radius, not two, so the ellipse is a circle
              of the wide radius squashed vertically. Each one is anchored on
              an edge, which keeps the squash from moving its centre. */}
          <RadialGradient id="ground" cx="0.15" cy="0" r="1.4" fx="0.15" fy="0" gradientTransform="scale(1 0.643)">
            <Stop offset="0" stopColor="#0a3550" />
            <Stop offset="0.4" stopColor="#001827" />
            <Stop offset="0.55" stopColor="#001827" />
            <Stop offset="0.92" stopColor="#2a1206" />
            <Stop offset="1" stopColor="#1a0c05" />
          </RadialGradient>
          <RadialGradient
            id="bleedBottom"
            cx="0.5"
            cy="1"
            r="0.9"
            fx="0.5"
            fy="1"
            gradientTransform="translate(0 1) scale(1 0.42) translate(0 -1)"
          >
            <Stop offset="0" stopColor="#FD8302" stopOpacity="0.3" />
            <Stop offset="1" stopColor="#FD8302" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="bleedTop" cx="1" cy="0" r="0.6" fx="1" fy="0" gradientTransform="scale(1 0.467)">
            <Stop offset="0" stopColor="#FDA340" stopOpacity="0.14" />
            <Stop offset="1" stopColor="#FDA340" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#ground)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bleedBottom)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bleedTop)" />
      </Svg>
    </View>
  );
}
