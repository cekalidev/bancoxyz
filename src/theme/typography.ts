export const fonts = {
  display: 'Montserrat_400Regular',
  displaySemiBold: 'Montserrat_600SemiBold',
  displayBold: 'Montserrat_700Bold',
  body: 'Cabin_400Regular',
  bodyMedium: 'Cabin_500Medium',
  bodyBold: 'Cabin_700Bold',
} as const;

export const typography = {
  stat: { fontFamily: fonts.display, fontSize: 40, lineHeight: 48 },
  display: {
    fontFamily: fonts.displayBold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  h1: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 36 },
  h2: { fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 28 },
  amount: { fontFamily: fonts.displaySemiBold, fontSize: 18, lineHeight: 24 },
  bodyLg: { fontFamily: fonts.body, fontSize: 18, lineHeight: 28 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 20 },
  button: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 20 },
  caption: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
} as const;
