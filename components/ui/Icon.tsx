import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { StyleProp, ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

// The line-icon set. Ported from the prototypes' `IC` map
// (docs/prototypes/src/find-flow.bak.html and the Object.assign block at the
// top of app_b.js), which is the visual spec for these screens.
//
// Every icon is drawn on a 24x24 grid as strokes, not fills, so one path set
// works at any size and takes its colour from the caller. That is the whole
// reason this exists: the app shipped 22 emoji, which cannot be recoloured,
// cannot be sized reliably across platforms, and do not look like Choner.
//
// Shapes are described as data rather than JSX so a new icon is one line here
// and nothing else. Only the primitives the set actually uses are supported.

type Shape =
  | { d: string; join?: 'round' }
  | { cx: number; cy: number; r: number; solid?: true }
  | { x: number; y: number; w: number; h: number; rx: number };

const ICONS: Record<string, Shape[]> = {
  // activities
  run: [
    { cx: 14.5, cy: 4.5, r: 1.6, solid: true },
    { d: 'M10 21l1.6-5.4L9 14l1.2-4.4c.3-1 1.1-1.6 2-1.5l3 .4 2.6 2.6M14.5 9.1l-1.6 4 2.4 1.8L14.5 19' }
  ],
  walk: [
    { cx: 13, cy: 4.5, r: 1.6 },
    { d: 'M11 21l1.5-6-2.5-2 1-5 3 1 2 3M8 12l-1 3M15 11l3 2' }
  ],
  bike: [
    { cx: 6, cy: 16, r: 3.5 },
    { cx: 18, cy: 16, r: 3.5 },
    { d: 'M6 16l4-7h5l3 7M10 9l-1.5-3H6M15 9l-2 7' }
  ],
  dumb: [{ d: 'M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12' }],
  leaf: [{ d: 'M5 19c0-8 5-13 14-14 0 9-5 14-14 14zM5 19l8-8' }],

  // states and feelings
  sleep: [{ d: 'M20 14.5A8 8 0 119.5 4a6.3 6.3 0 1010.5 10.5z' }],
  bolt: [{ d: 'M13 2L4 14h6l-1 8 9-12h-6l1-8z', join: 'round' }],
  redo: [
    { d: 'M4 9a8 8 0 0114-4.9M20 15a8 8 0 01-14 4.9' },
    { d: 'M18 3v5h-5M6 21v-5h5' }
  ],
  clock: [
    { cx: 12, cy: 12, r: 9 },
    { d: 'M12 7v5l3.5 2' }
  ],
  cloud: [{ d: 'M7 15a4 4 0 01.6-7.9A5 5 0 0117 9a3 3 0 010 6H7zM9 18l-1 2M13 18l-1 2M17 18l-1 2' }],
  fire: [
    { d: 'M12 3s4 3.5 4 8a4 4 0 01-8 0c0-1.2.6-2 1.2-2.8C10 9.8 11 11 11 11s.3-3.4 1-5c.3.8 0-2 0-3z' },
    { d: 'M9.5 14.5a2.5 2.5 0 005 0c0-1.2-.8-2-1.3-2.9' }
  ],

  // people and tone
  community: [
    { cx: 9, cy: 8, r: 3.2 },
    { cx: 17, cy: 8, r: 2.6 },
    { d: 'M2.5 19c0-3.3 2.9-5.6 6.5-5.6s6.5 2.3 6.5 5.6' },
    { d: 'M17 13.4c2.6 0 4.5 1.9 4.5 4.4' }
  ],
  together: [
    { cx: 8, cy: 8, r: 2.6 },
    { cx: 16, cy: 8, r: 2.6 },
    { d: 'M4 20c0-3.3 2-5.6 4-5.6M20 20c0-3.3-2-5.6-4-5.6' },
    { d: 'M9.5 12.5l2.5 2 2.5-2' }
  ],
  chat: [{ d: 'M4 5.5A1.5 1.5 0 015.5 4h13A1.5 1.5 0 0120 5.5v9a1.5 1.5 0 01-1.5 1.5H9l-5 4V5.5z' }],
  trophy: [{ d: 'M8 4h8v5a4 4 0 01-8 0zM8 6H4v1a3 3 0 003 3M16 6h4v1a3 3 0 01-3 3M12 13v4M8.5 20h7M10 17h4' }],
  user: [
    { cx: 12, cy: 8, r: 3.6 },
    { d: 'M4.5 20c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5' }
  ],

  // progress
  target: [
    { cx: 12, cy: 12, r: 9 },
    { cx: 12, cy: 12, r: 4.5 },
    { cx: 12, cy: 12, r: 1, solid: true }
  ],
  trend: [{ d: 'M3 17l6-6 4 4 8-8M15 7h6v6' }],

  // navigation (the bottom bar, from the prototype's navBar())
  home: [{ d: 'M3 11l9-7 9 7' }, { d: 'M5 10v9a1 1 0 001 1h3v-5h6v5h3a1 1 0 001-1v-9' }],
  find: [
    { cx: 12, cy: 8, r: 3.2 },
    { d: 'M4 20c0-3.6 3.6-6 8-6' },
    { cx: 17, cy: 17, r: 3 },
    { d: 'M19.2 19.2L21 21' }
  ],

  // chrome
  camera: [
    { d: 'M4 8h3l1.5-2h7L17 8h3v11H4z' },
    { cx: 12, cy: 13, r: 3.2 }
  ],
  check: [{ d: 'M5 12.5l4.5 4.5L19 7.5' }],
  share: [{ d: 'M12 15V4M8 8l4-4 4 4M5 13v6a1 1 0 001 1h12a1 1 0 001-1v-6' }],
  back: [{ d: 'M15 5l-7 7 7 7' }],
  chev: [{ d: 'M9 5l7 7-7 7' }],
  x: [{ d: 'M6 6l12 12M18 6L6 18' }],
  mail: [
    { x: 3, y: 5, w: 18, h: 14, rx: 2 },
    { d: 'M3.5 7l8.5 6 8.5-6' }
  ]
};

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as IconName[];

// Lets a component accept either an icon key or arbitrary content in one prop.
// Screens outside this slice still pass emoji strings, and they must keep
// rendering as text until they are converted.
export function isIconName(value: unknown): value is IconName {
  return typeof value === 'string' && value in ICONS;
}

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  // Stroke weight on the 24-grid. The prototypes draw most icons at 1.8 and
  // thin them slightly as the icon grows, so small icons stay legible.
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
  // Decorative by default: these sit beside a label that already says the same
  // thing, so announcing them twice is noise. Pass a label when the icon is
  // the only thing carrying the meaning.
  label?: string;
}

export function Icon({
  name,
  size = 22,
  color = theme.colors.text,
  strokeWidth = 1.8,
  style,
  label
}: Props) {
  const shapes = ICONS[name];

  if (!shapes) {
    // A missing key should be caught by the IconName union, so this only fires
    // when a name arrives from untyped data. Render nothing rather than crash.
    if (__DEV__) console.warn(`Icon: no shape registered for "${String(name)}"`);
    return null;
  }

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={style}
      // Only `accessible` and its two companions: the RN-only hiding props
      // (accessibilityElementsHidden, importantForAccessibility) are passed
      // straight through to the DOM by react-native-svg on web and warn there.
      // An SVG that is not `accessible` is already skipped by screen readers.
      // `false` would reach the DOM as a string attribute and warn, so an
      // unlabelled icon passes nothing at all.
      accessible={label ? true : undefined}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
    >
      <G
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {shapes.map((shape, i) => {
          if ('d' in shape) {
            return <Path key={i} d={shape.d} strokeLinejoin={shape.join ?? 'round'} />;
          }
          if ('r' in shape) {
            return (
              <Circle
                key={i}
                cx={shape.cx}
                cy={shape.cy}
                r={shape.r}
                fill={shape.solid ? color : 'none'}
                stroke={shape.solid ? 'none' : color}
              />
            );
          }
          return (
            <Rect
              key={i}
              x={shape.x}
              y={shape.y}
              width={shape.w}
              height={shape.h}
              rx={shape.rx}
            />
          );
        })}
      </G>
    </Svg>
  );
}
