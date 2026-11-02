import Svg, { Path } from 'react-native-svg';

import { hiddenFromReader } from '@/components/hiddenFromReader';
import { borders, layout } from '@/theme';

type BackIconProps = { color: string; size?: number };

export function BackIcon({ color, size = layout.iconSize }: BackIconProps) {
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
      <Path d="M19 12H5" />
      <Path d="M12 19L5 12L12 5" />
    </Svg>
  );
}
