import Svg, { Circle, Path } from 'react-native-svg';

import { borders, layout } from '@/theme';

type EyeIconProps = { color: string; size?: number };

export function EyeIcon({ color, size = layout.iconSize }: EyeIconProps) {
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
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Path d="M2 12C6 6 18 6 22 12C18 18 6 18 2 12Z" />
      <Circle cx={12} cy={12} r={3} />
    </Svg>
  );
}
