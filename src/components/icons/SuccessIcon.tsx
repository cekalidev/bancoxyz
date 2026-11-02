import Svg, { Circle, Path } from 'react-native-svg';

import { hiddenFromReader } from '@/components/hiddenFromReader';
import { borders, layout } from '@/theme';

type SuccessIconProps = { color: string; size?: number };

export function SuccessIcon({ color, size = layout.iconSize }: SuccessIconProps) {
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
      <Circle cx={12} cy={12} r={9} />
      <Path d="M8 12.5L11 15.5L16 9.5" />
    </Svg>
  );
}
