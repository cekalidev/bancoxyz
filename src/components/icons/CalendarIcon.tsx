import Svg, { Path, Rect } from 'react-native-svg';

import { hiddenFromReader } from '@/components/hiddenFromReader';
import { borders, layout } from '@/theme';

type CalendarIconProps = { color: string; size?: number };

export function CalendarIcon({ color, size = layout.iconSize }: CalendarIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={borders.strong}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...hiddenFromReader}
    >
      <Rect x={3} y={5} width={18} height={16} rx={2} />
      <Path d="M3 10H21" />
      <Path d="M8 3V7" />
      <Path d="M16 3V7" />
    </Svg>
  );
}
