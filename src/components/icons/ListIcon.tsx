import Svg, { Path } from 'react-native-svg';

import { hiddenFromReader } from '@/components/hiddenFromReader';
import { borders, layout } from '@/theme';

type ListIconProps = { color: string; size?: number };

export function ListIcon({ color, size = layout.iconSize }: ListIconProps) {
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
      <Path d="M9 6H20" />
      <Path d="M9 12H20" />
      <Path d="M9 18H20" />
      <Path d="M4 6V6.5" />
      <Path d="M4 12V12.5" />
      <Path d="M4 18V18.5" />
    </Svg>
  );
}
