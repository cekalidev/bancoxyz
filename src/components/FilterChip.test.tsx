import { createRef } from 'react';
import { render, screen, userEvent, within } from '@testing-library/react-native';
import { processColor, StyleSheet } from 'react-native';
import type { PressableInstance } from 'react-native';

import { FilterChip } from '@/components/FilterChip';
import { CheckIcon } from '@/components/icons/CheckIcon';
import { ChevronDownIcon } from '@/components/icons/ChevronDownIcon';
import { pathsOf, pathsOfIcon, strokeColorsOf } from '@/test/iconPaths';
import { colors, fonts, gradients, layout, radii, spacing, typography } from '@/theme';

const IDLE_TEXT = 'Valor';
const APPLIED_TEXT = 'US$ 2.000–4.000';
const IDLE_LABEL = 'Filtro de valor: sin aplicar';
const APPLIED_LABEL = 'Filtro de valor: de 2.000 a 4.000 dólares';

type Node = ReturnType<typeof getChip>;

function getChip() {
  const chip = screen.root;

  if (!chip) {
    throw new Error('El chip no se pintó');
  }

  return chip;
}

function expectPillShape(chip: Node) {
  expect(chip).toHaveStyle({
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    gap: spacing.xxs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  });
}

function expectAccentGradient(chip: Node) {
  const gradient = within(chip).getByTestId('filter-chip-gradient');

  expect(gradient).toHaveStyle(StyleSheet.absoluteFill);
  expect(gradient.props.colors).toEqual(gradients.accentSoft.colors.map((color) => processColor(color)));
  expect(gradient.props.startPoint).toEqual([gradients.accentSoft.start.x, gradients.accentSoft.start.y]);
  expect(gradient.props.endPoint).toEqual([gradients.accentSoft.end.x, gradients.accentSoft.end.y]);
}

describe('FilterChip sin aplicar', () => {
  it('sin aplicar muestra la flecha y no está seleccionado', async () => {
    const chevronPaths = await pathsOfIcon(ChevronDownIcon, colors.text);
    const checkPaths = await pathsOfIcon(CheckIcon, colors.text);
    const onPress = jest.fn();
    const chipRef = createRef<PressableInstance>();
    const user = userEvent.setup();

    await render(
      <FilterChip text={IDLE_TEXT} spokenLabel={IDLE_LABEL} selected={false} onPress={onPress} chipRef={chipRef} />,
    );

    const text = screen.getByText(IDLE_TEXT);
    const chip = getChip();

    expectPillShape(chip);
    expect(chip).toHaveStyle({ backgroundColor: colors.surfaceMuted });
    expect(chip).not.toBeSelected();
    expect(text).toHaveStyle({ ...typography.body, color: colors.chipText });
    expect(text.props.numberOfLines).toBeUndefined();
    expect(pathsOf(chip)).toEqual(chevronPaths);
    expect(pathsOf(chip)).not.toEqual(expect.arrayContaining(checkPaths));
    expect(strokeColorsOf(chip)).toContain(processColor(colors.chipText));
    expect(within(chip).queryByTestId('filter-chip-gradient')).toBeNull();
    expect(chipRef.current).not.toBeNull();

    await user.press(chip);

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('FilterChip aplicado', () => {
  it('aplicado muestra ✓, su resumen, está seleccionado y tiene el degradado', async () => {
    const chevronPaths = await pathsOfIcon(ChevronDownIcon, colors.text);
    const checkPaths = await pathsOfIcon(CheckIcon, colors.text);
    const onPress = jest.fn();
    const user = userEvent.setup();

    await render(<FilterChip text={APPLIED_TEXT} spokenLabel={APPLIED_LABEL} selected onPress={onPress} />);

    const text = screen.getByText(APPLIED_TEXT);
    const chip = getChip();

    expectPillShape(chip);
    expectAccentGradient(chip);
    expect(chip).toBeSelected();
    expect(chip).not.toHaveStyle({ backgroundColor: colors.surfaceMuted });
    expect(text).toHaveStyle({ ...typography.body, fontFamily: fonts.bodyBold, color: colors.text });
    expect(StyleSheet.flatten(text.props.style)).not.toHaveProperty('fontWeight');
    expect(text.props.numberOfLines).toBeUndefined();
    expect(pathsOf(chip)).toEqual(checkPaths);
    expect(pathsOf(chip)).not.toEqual(expect.arrayContaining(chevronPaths));
    expect(strokeColorsOf(chip)).toContain(processColor(colors.text));

    await user.press(chip);

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('FilterChip accesible', () => {
  it('es un botón con su etiqueta y la pista Abre el filtro', async () => {
    const { rerender } = await render(
      <FilterChip text={IDLE_TEXT} spokenLabel={IDLE_LABEL} selected={false} onPress={jest.fn()} />,
    );

    const idle = screen.getByRole('button', { name: IDLE_LABEL });

    expect(idle).toBe(getChip());
    expect(idle.props.accessibilityHint).toBe('Abre el filtro');
    expect(idle.props.accessibilityState).toEqual(expect.objectContaining({ selected: false }));

    await rerender(<FilterChip text={APPLIED_TEXT} spokenLabel={APPLIED_LABEL} selected onPress={jest.fn()} />);

    const applied = screen.getByRole('button', { name: APPLIED_LABEL });

    expect(applied).toBe(getChip());
    expect(applied.props.accessibilityHint).toBe('Abre el filtro');
    expect(applied.props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
  });

  it('el chip mide 40 y su área táctil llega a 48', async () => {
    await render(<FilterChip text={IDLE_TEXT} spokenLabel={IDLE_LABEL} selected={false} onPress={jest.fn()} />);

    const chip = getChip();

    expect(chip).toHaveStyle({ minHeight: layout.chipHeight });
    expect(chip.props.hitSlop).toEqual({ top: spacing.xxs, bottom: spacing.xxs });
    expect(layout.chipHeight + spacing.xxs * 2).toBe(layout.minTouch);
  });
});
