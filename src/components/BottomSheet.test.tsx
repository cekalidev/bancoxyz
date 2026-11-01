import { act, fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { createRef, type RefObject } from 'react';
import { AccessibilityInfo, StyleSheet, Text, type TextInstance } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import {
  CLOSE_LABEL,
  expectBackdropHiddenOutside,
  expectCloseAfterTitle,
  expectPanelHoldsTheSheet,
  getBackdrop,
  getHeaderRow,
  getModal,
  getModalPanel,
  isTitleNode,
  TITLE,
  type HostNode,
} from '@/components/BottomSheet.cases';
import { mockReducedMotion } from '@/test/reducedMotion';
import { colors, elevation, layout, radii, spacing, typography } from '@/theme';

async function renderSheet(titleRef?: RefObject<TextInstance | null>) {
  const onClose = jest.fn();
  await render(
    <BottomSheet title={TITLE} closeLabel={CLOSE_LABEL} onClose={onClose} titleRef={titleRef}>
      <Text>Contenido</Text>
    </BottomSheet>,
  );
  return onClose;
}

// Monta la hoja cuando el sistema aún no ha respondido si reduce el movimiento; devuelve cómo responder.
async function renderWithPendingPreference() {
  let answer: (enabled: boolean) => void = () => {};
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValue(
    new Promise<boolean>((resolve) => {
      answer = resolve;
    }),
  );
  await renderSheet();
  return answer;
}

// La hoja cuenta como visible mientras el Modal esté montado y no se le pida ocultarse.
function isShownSliding() {
  const modal = getModal();
  return modal !== undefined && modal.props.visible !== false && modal.props.animationType === 'slide';
}

async function showSheet(titleRef?: RefObject<TextInstance | null>) {
  await renderSheet(titleRef);
  await fireEvent(getModal(), 'show');
}

describe('BottomSheet', () => {
  it('el botón de cerrar, tocar fuera y atrás de Android llaman a cerrar', async () => {
    const user = userEvent.setup();

    const onCloseByButton = await renderSheet();
    expect(getModal()?.props.transparent).toBe(true);
    await user.press(screen.getByRole('button', { name: CLOSE_LABEL }));
    expect(onCloseByButton).toHaveBeenCalledTimes(1);
    await screen.unmount();

    const onCloseByBackdrop = await renderSheet();
    const backdrop = getBackdrop();
    expect(backdrop).toBeDefined();
    await user.press(backdrop);
    expect(onCloseByBackdrop).toHaveBeenCalledTimes(1);
    await screen.unmount();

    const onCloseByBack = await renderSheet();
    fireEvent(getModal(), 'requestClose');
    expect(onCloseByBack).toHaveBeenCalledTimes(1);
  });
});

describe('BottomSheet con lector de pantalla', () => {
  it('el panel es modal para el lector y el fondo está oculto', async () => {
    await renderSheet();

    const panel = getModalPanel();

    expectPanelHoldsTheSheet(panel);
    expectBackdropHiddenOutside(panel);
  });

  it('el título es encabezado y cerrar es un botón con su etiqueta', async () => {
    await renderSheet();

    expect(screen.getAllByRole('header').length).toBe(1);
    expect(screen.container.queryAll(isTitleNode).length).toBe(1);
    expect(screen.getByRole('header', { name: TITLE })).toHaveStyle({
      ...typography.h2,
      color: colors.textStrong,
    });
    expect(screen.getByRole('button', { name: CLOSE_LABEL })).toHaveAccessibleName(CLOSE_LABEL);
    expectCloseAfterTitle();
    expect(getHeaderRow()).toHaveStyle({ alignItems: 'center', gap: spacing.md });
  });

  it('cerrar mide 48 × 48', async () => {
    await renderSheet();

    expect(screen.getByRole('button', { name: CLOSE_LABEL })).toHaveStyle({
      width: layout.minTouch,
      height: layout.minTouch,
    });
  });
});

describe('BottomSheet al mostrarse', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('al mostrarse el título recibe el foco del lector', async () => {
    const sendEvent = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation();

    await showSheet();
    expect(sendEvent).not.toHaveBeenCalled();
    jest.runOnlyPendingTimers();
    expect(sendEvent).toHaveBeenCalledTimes(1);
    const [ownNode, ownType] = sendEvent.mock.calls[0];
    expect(ownType).toBe('focus');
    expect(isTitleNode(ownNode)).toBe(true);
    await screen.unmount();
    sendEvent.mockClear();

    const callerRef = createRef<TextInstance>();
    await showSheet(callerRef);
    jest.runOnlyPendingTimers();
    expect(sendEvent).toHaveBeenCalledTimes(1);
    const [callerNode, callerType] = sendEvent.mock.calls[0];
    expect(callerType).toBe('focus');
    expect(callerNode === callerRef.current).toBe(true);
    expect(isTitleNode(callerRef.current)).toBe(true);
  });
});

function hasShadow(node: HostNode) {
  const style = StyleSheet.flatten(node.props.style);
  return style?.shadowColor !== undefined || style?.elevation !== undefined;
}

describe('BottomSheet con el aspecto del tema', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('la hoja usa el radio de tarjeta arriba y la sombra de superposición como única sombra', async () => {
    await renderSheet();

    const shadowed = screen.container.queryAll(hasShadow);
    expect(shadowed.length).toBe(1);
    const [surface] = shadowed;
    expect(surface).toHaveStyle({
      ...elevation.overlay,
      backgroundColor: colors.background,
      borderTopLeftRadius: radii.card,
      borderTopRightRadius: radii.card,
      padding: layout.screenPadding,
    });
    const style = StyleSheet.flatten(surface.props.style);
    expect([style.borderRadius, style.borderBottomLeftRadius, style.borderBottomRightRadius]).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('con reducción de movimiento aparece sin animación', async () => {
    const answerPreference = await renderWithPendingPreference();
    expect(isShownSliding()).toBe(false);
    await act(async () => answerPreference(true));
    await waitFor(() => expect(getModal().props.animationType).toBe('none'));
    expect(getModal().props.visible).not.toBe(false);
    await screen.unmount();

    mockReducedMotion(false);
    await renderSheet();
    expect(getModal().props.animationType).toBe('slide');
  });
});
