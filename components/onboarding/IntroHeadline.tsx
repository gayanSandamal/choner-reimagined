import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { theme } from '@/constants/theme';

const WIDTH = 320;
const SIZE = 30;
const LINE = 40;

// Where "into" ends and "I did" begins on the second line. The two words are
// separate text runs anchored on this point from either side: "into" ends
// here, "I did" starts a space after it. Mixing two fonts inside one centred
// run is measured differently on iOS and the web, and the words collide; two
// runs anchored on a shared point cannot. The point is off centre because
// "I did" is the wider of the two (about 91 against 55 at this size).
const SPLIT = WIDTH / 2 - 22;
const SPACE = 8;

// The intro headline, over two lines, with "I did" carrying the brand
// gradient. React Native text cannot take a gradient fill, so it is drawn as
// SVG text, which keeps all three runs on exact baselines.
export function IntroHeadline() {
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="Turn I should into I did">
      <Svg width={WIDTH} height={LINE * 2 + 6}>
        <Defs>
          <LinearGradient id="brand" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FDA340" />
            <Stop offset="1" stopColor={theme.gradients.warm[1]} />
          </LinearGradient>
        </Defs>
        <SvgText
          x={WIDTH / 2}
          y={LINE - 8}
          textAnchor="middle"
          fontFamily={theme.fonts.display}
          fontSize={SIZE}
          fill="#FFFFFF"
        >
          Turn “I should”
        </SvgText>
        <SvgText
          x={SPLIT}
          y={LINE * 2 - 8}
          textAnchor="end"
          fontFamily={theme.fonts.display}
          fontSize={SIZE}
          fill="#FFFFFF"
        >
          into
        </SvgText>
        <SvgText
          x={SPLIT + SPACE}
          y={LINE * 2 - 8}
          textAnchor="start"
          fontFamily={theme.fonts.bodyBold}
          fontSize={SIZE}
          fill="url(#brand)"
        >
          “I did”
        </SvgText>
      </Svg>
    </View>
  );
}
