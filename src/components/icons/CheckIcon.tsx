import Svg, { Path } from 'react-native-svg';

import { hiddenFromReader } from '@/components/hiddenFromReader';
import { borders, layout } from '@/theme';

type CheckIconProps = { color: string; size?: number };

export function CheckIcon({ color, size = layout.iconSize }: CheckIconProps) {
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
      <Path d="M6 12.5L10.5 17L18 7.5" />
    </Svg>
  );
}
