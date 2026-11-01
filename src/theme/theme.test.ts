import {
  borders,
  colors,
  elevation,
  fonts,
  gradients,
  layout,
  motion,
  palette,
  radii,
  spacing,
  typography,
} from '@/theme';

const expectedPalette = {
  navy: '#092B6A',
  indigo: '#21006F',
  violet: '#360084',
  blue: '#0092FF',
  blueDeep: '#0067C8',
  violetBright: '#9F41FF',
  aquaGreen: '#92FE9D',
  aquaBlue: '#00C9FF',
  mint: '#2EE68A',
  sky: '#4BBDF7',
  white: '#FFFFFF',
  surface: '#F6F9FC',
  surface2: '#E7EDF2',
  slate: '#546B81',
  slateLine: '#8A93AB',
  linkBlue: '#0A72A8',
  chipText: '#3C444C',
};

const expectedColors = {
  background: '#FFFFFF',
  surface: '#F6F9FC',
  surfaceMuted: '#E7EDF2',
  text: '#092B6A',
  textStrong: '#21006F',
  textSecondary: '#546B81',
  textOnBrand: '#FFFFFF',
  textOnAccent: '#21006F',
  link: '#0A72A8',
  stat: '#9F41FF',
  border: '#8A93AB',
  borderSubtle: '#E7EDF2',
  focus: '#21006F',
  success: '#0F7B4A',
  successBg: '#E7F6EE',
  error: '#B3261E',
  errorBg: '#FDECEA',
  warning: '#8A5300',
  warningBg: '#FFF4E0',
  info: '#0A72A8',
  infoBg: '#E6F3FA',
  disabledBg: '#E7EDF2',
  disabledText: '#546B81',
  placeholder: '#546B81',
  skeletonBase: '#E7EDF2',
  skeletonHighlight: '#F6F9FC',
  skeletonOnBrand: 'rgba(255, 255, 255, 0.2)',
  scrim: 'rgba(9, 43, 106, 0.48)',
  ripple: 'rgba(33, 0, 111, 0.12)',
};

const expectedGradients = {
  cta: {
    colors: ['#2EE68A', '#4BBDF7'],
    start: { x: 0, y: 0.5 },
    end: { x: 1, y: 0.5 },
  },
  accentSoft: {
    colors: ['#92FE9D', '#00C9FF'],
    start: { x: 0, y: 0.53 },
    end: { x: 1, y: 0.47 },
  },
  brand: {
    colors: ['#360084', '#0067C8'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  brandHero: {
    colors: ['#360084', '#0067C8', '#0067C8'],
    locations: [0.14, 0.56, 1],
    start: { x: 0.04, y: 0.7 },
    end: { x: 0.96, y: 0.3 },
  },
};

const expectedFonts = {
  display: 'Montserrat_400Regular',
  displaySemiBold: 'Montserrat_600SemiBold',
  displayBold: 'Montserrat_700Bold',
  body: 'Cabin_400Regular',
  bodyMedium: 'Cabin_500Medium',
  bodyBold: 'Cabin_700Bold',
};

const expectedTypography = {
  stat: { fontFamily: 'Montserrat_400Regular', fontSize: 40, lineHeight: 48 },
  display: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  h1: { fontFamily: 'Montserrat_700Bold', fontSize: 28, lineHeight: 36 },
  h2: { fontFamily: 'Montserrat_700Bold', fontSize: 22, lineHeight: 28 },
  amount: { fontFamily: 'Montserrat_600SemiBold', fontSize: 18, lineHeight: 24 },
  bodyLg: { fontFamily: 'Cabin_400Regular', fontSize: 18, lineHeight: 28 },
  body: { fontFamily: 'Cabin_400Regular', fontSize: 16, lineHeight: 24 },
  label: { fontFamily: 'Cabin_500Medium', fontSize: 16, lineHeight: 20 },
  button: { fontFamily: 'Cabin_700Bold', fontSize: 16, lineHeight: 20 },
  caption: { fontFamily: 'Cabin_400Regular', fontSize: 14, lineHeight: 20 },
};

const expectedSpacing = {
  none: 0,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  giant: 64,
};

const expectedLayout = {
  screenPadding: 20,
  sectionGap: 32,
  minTouch: 48,
  appBarHeight: 56,
  inputHeight: 52,
  buttonHeight: 52,
  chipHeight: 40,
  iconSize: 20,
  loginLogoSize: 48,
  headerLogoSize: 40,
  resultIconSize: 48,
};

const expectedBorders = { regular: 1, strong: 2 };

const expectedRadii = { input: 8, md: 12, lg: 16, card: 22, pill: 999, skeleton: 4 };

const expectedElevation = {
  none: {},
  raised: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  overlay: {
    shadowColor: '#18005A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 6,
  },
};

const expectedMotion = {
  fast: 160,
  base: 240,
  easing: [0.25, 0.1, 0.25, 1],
  pressedOpacity: 0.85,
  pressedScale: 0.98,
  skeletonPulse: 1200,
  skeletonMinOpacity: 0.6,
};

const expectedFamilyByStyle: Record<string, string> = {
  stat: 'Montserrat_400Regular',
  display: 'Montserrat_700Bold',
  h1: 'Montserrat_700Bold',
  h2: 'Montserrat_700Bold',
  amount: 'Montserrat_600SemiBold',
  bodyLg: 'Cabin_400Regular',
  body: 'Cabin_400Regular',
  label: 'Cabin_500Medium',
  button: 'Cabin_700Bold',
  caption: 'Cabin_400Regular',
};

describe('colores de marca', () => {
  it('expone los colores de marca con sus valores exactos', () => {
    expect(palette).toStrictEqual(expectedPalette);
  });
});

describe('tokens del diseño', () => {
  it('expone todos los grupos de tokens del diseño con sus valores exactos', () => {
    expect(colors).toStrictEqual(expectedColors);
    expect(gradients).toStrictEqual(expectedGradients);
    expect(fonts).toStrictEqual(expectedFonts);
    expect(typography).toStrictEqual(expectedTypography);
    expect(spacing).toStrictEqual(expectedSpacing);
    expect(layout).toStrictEqual(expectedLayout);
    expect(radii).toStrictEqual(expectedRadii);
    expect(borders).toStrictEqual(expectedBorders);
    expect(elevation).toStrictEqual(expectedElevation);
    expect(motion).toStrictEqual(expectedMotion);
  });
});

describe('tipografía', () => {
  it('cada estilo tipográfico usa la familia de su peso y ningún fontWeight', () => {
    expect(Object.keys(typography).sort()).toStrictEqual(
      Object.keys(expectedFamilyByStyle).sort(),
    );

    for (const [name, style] of Object.entries(typography)) {
      expect(style.fontFamily).toBe(expectedFamilyByStyle[name]);
      expect(style.fontFamily).toMatch(/^(Montserrat|Cabin)_\d{3}[A-Za-z]+$/);
      expect(style).not.toHaveProperty('fontWeight');
    }
  });
});
