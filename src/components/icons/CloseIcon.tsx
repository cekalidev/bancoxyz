import Svg, { Path } from 'react-native-svg';

import { borders, layout } from '@/theme';

type CloseIconProps = { color: string; size?: number };

export function CloseIcon({ color, size = layout.iconSize }: CloseIconProps) {
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
      <Path d="M6 6L18 18" />
      <Path d="M18 6L6 18" />
    </Svg>
  );
}
