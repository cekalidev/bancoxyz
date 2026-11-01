import { Modal, StyleSheet, View } from 'react-native';

import { IosDatePickerPanel } from '@/components/IosDatePickerPanel';
import type { IosDatePickerPanelProps } from '@/components/IosDatePickerPanel';
import { colors, elevation, layout, radii, spacing } from '@/theme';

export type IosDatePickerModalProps = IosDatePickerPanelProps;

export function IosDatePickerModal(props: IosDatePickerModalProps) {
  return (
    <Modal transparent animationType="fade" onRequestClose={props.onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.dialog} accessibilityViewIsModal>
          <IosDatePickerPanel {...props} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: layout.screenPadding,
    backgroundColor: colors.scrim,
  },
  dialog: {
    padding: spacing.md,
    borderRadius: radii.card,
    backgroundColor: colors.background,
    ...elevation.overlay,
  },
});
