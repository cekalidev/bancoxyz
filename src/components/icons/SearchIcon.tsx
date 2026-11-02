import Svg, { Circle, Path } from 'react-native-svg';

import { hiddenFromReader } from '@/components/hiddenFromReader';
import { borders, layout } from '@/theme';

type SearchIconProps = { color: string; size?: number };

export function SearchIcon({ color, size = layout.iconSize }: SearchIconProps) {
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
      <Circle cx={11} cy={11} r={7} />
      <Path d="M16 16L21 21" />
    </Svg>
  );
}
