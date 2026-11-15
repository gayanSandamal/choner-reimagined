import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

// The pair mark: two circles, you and your partner (decided 14 Nov 2026).
//
// It replaced the heart on Home, which read as romance or dating. One symbol
// that goes from incomplete to complete:
//
//   alone      your orange circle, and an empty dashed circle beside it
//   searching  the same, with a faint grey person in the empty circle
//   paired     your partner's circle filled in dark navy, yours on top where
//              the two cross, so the shared part shows in your orange
//
// Still, by decision: no animation.
//
// Drawn to the reference's proportions on a 300 x 160 box: circles r 62 with
// centres 100 apart, so they overlap by about a fifth of their width, and a
// person icon about a quarter of a circle's width. Orange for you and navy
// for others is how faces are drawn across the app (Avatar's `self`).

export type PairMarkState = 'alone' | 'searching' | 'paired';

const R = 62;
const ME = 100;
const THEM = 200;
const CY = 80;

function Person({ cx, color }: { cx: number; color: string }) {
  return (
    <G fill="none" stroke={color} strokeWidth={4.2} strokeLinecap="round">
      <Circle cx={cx} cy={70} r={8.5} />
      <Path d={`M${cx - 17} 104c0-9.5 7.6-15.5 17-15.5s17 6 17 15.5`} />
    </G>
  );
}

export function PairMark({ state, width = 260 }: { state: PairMarkState; width?: number }) {
  const paired = state === 'paired';
  return (
    <Svg width={width} height={(width * 160) / 300} viewBox="0 0 300 160">
      <Defs>
        <LinearGradient id="pmMe" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFA83D" />
          <Stop offset="0.45" stopColor="#FD8302" />
          <Stop offset="1" stopColor="#FD5B01" />
        </LinearGradient>
        <LinearGradient id="pmThem" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#2B6098" />
          <Stop offset="1" stopColor="#0B2231" />
        </LinearGradient>
        <RadialGradient id="pmSheen" cx="0.3" cy="0.25" r="0.6">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.28} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="pmShadow" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#001827" stopOpacity={0.16} />
          <Stop offset="1" stopColor="#001827" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* Your partner first, so your circle sits on top where they cross. */}
      {paired ? (
        <G>
          <Ellipse cx={THEM} cy={150} rx={52} ry={7} fill="url(#pmShadow)" />
          <Circle cx={THEM} cy={CY} r={R} fill="url(#pmThem)" />
          <Circle cx={THEM} cy={CY} r={R} fill="url(#pmSheen)" />
          <Person cx={THEM} color="#FFFFFF" />
        </G>
      ) : (
        <G>
          <Circle cx={THEM} cy={CY} r={R} fill="#F6F3EF" />
          <Circle cx={THEM} cy={CY} r={R} fill="none" stroke="#C9C2B9" strokeWidth={2.2} strokeDasharray="6 8" />
          {state === 'searching' ? <Person cx={THEM} color="#B4BCC2" /> : null}
        </G>
      )}

      <Ellipse cx={ME} cy={150} rx={52} ry={7} fill="url(#pmShadow)" />
      <Circle cx={ME} cy={CY} r={R} fill="url(#pmMe)" />
      <Circle cx={ME} cy={CY} r={R} fill="url(#pmSheen)" />
      {/* A thin white edge keeps your circle crisp against the navy. */}
      {paired ? <Circle cx={ME} cy={CY} r={R} fill="none" stroke="#FFFFFF" strokeWidth={2.5} /> : null}
      <Person cx={ME} color="#FFFFFF" />
    </Svg>
  );
}

// Which picture a partner state shows. Waiting on an invite reads the same as
// searching: someone is on the way, not yet here.
export function pairMarkState(partnered: boolean, partnerState: string): PairMarkState {
  if (partnered) return 'paired';
  return partnerState === 'finding' || partnerState === 'invited' ? 'searching' : 'alone';
}
