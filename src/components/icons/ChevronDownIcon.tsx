import Svg, { Path } from 'react-native-svg';

import { hiddenFromReader } from '@/components/hiddenFromReader';
import { borders, layout } from '@/theme';

type ChevronDownIconProps = { color: string; size?: number };

export function ChevronDownIcon({ color, size = layout.iconSize }: ChevronDownIconProps) {
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
      <Path d="M6 9L12 15L18 9" />
    </Svg>
  );
}
