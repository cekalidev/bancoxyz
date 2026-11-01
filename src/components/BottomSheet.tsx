import { useRef, type ReactNode, type RefObject } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import type { TextInstance } from 'react-native';

import { SheetHeader } from '@/components/SheetHeader';
import { SheetPanel } from '@/components/SheetPanel';
import { useFocusOnNextFrame } from '@/components/useFocusOnNextFrame';
import { useReducedMotionSetting } from '@/components/useReducedMotion';
import { colors } from '@/theme';

export type BottomSheetProps = {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  titleRef?: RefObject<TextInstance | null>;
};

// Se monta solo mientras la hoja está abierta: quien la usa decide cuándo pintarla.
// El Modal espera a conocer la preferencia de movimiento para no deslizarse si está reducido.
export function BottomSheet({ title, closeLabel, onClose, children, titleRef }: BottomSheetProps) {
  const ownTitleRef = useRef<TextInstance>(null);
  const resolvedTitleRef = titleRef ?? ownTitleRef;
  const focusLater = useFocusOnNextFrame();
  const motionSetting = useReducedMotionSetting();

  return (
    <Modal
      transparent
      visible={motionSetting !== null}
      animationType={motionSetting ? 'none' : 'slide'}
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
      onShow={() => focusLater(resolvedTitleRef)}
    >
      <Pressable
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        onPress={onClose}
        style={styles.backdrop}
      />
      <SheetPanel>
        <SheetHeader title={title} closeLabel={closeLabel} onClose={onClose} titleRef={resolvedTitleRef} />
        {children}
      </SheetPanel>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.scrim,
  },
});
