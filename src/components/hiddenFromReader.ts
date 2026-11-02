// Oculta un elemento y sus descendientes a TalkBack (Android) y a VoiceOver (iOS).
export const hiddenFromReader = {
  accessible: false,
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;
