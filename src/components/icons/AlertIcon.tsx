import Svg, { Circle, Path } from 'react-native-svg';

import { hiddenFromReader } from '@/components/hiddenFromReader';
import { borders, layout } from '@/theme';

type AlertIconProps = { color: string; size?: number };

export function AlertIcon({ color, size = layout.iconSize }: AlertIconProps) {
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
      <Path d="M12 7V13" />
      <Path d="M12 16.5V17" />
    </Svg>
  );
}
