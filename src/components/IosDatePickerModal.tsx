import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, elevation, layout, radii, spacing } from '@/theme';
import { calendarDateFromLocal, toLocalDate } from '@/utils/date';
import type { CalendarDate } from '@/utils/date';

export type IosDatePickerModalProps = {
  value: CalendarDate;
  min: CalendarDate;
  max: CalendarDate;
  onAccept: (date: CalendarDate) => void;
  onCancel: () => void;
};

type ActionsProps = { onAccept: () => void; onCancel: () => void };

function Actions({ onAccept, onCancel }: ActionsProps) {
  return (
    <View style={styles.actions}>
      <Button label="Cancelar" variant="secondary" onPress={onCancel} />
      <Button label="Aceptar" onPress={onAccept} />
    </View>
  );
}

export function IosDatePickerModal({ value, min, max, onAccept, onCancel }: IosDatePickerModalProps) {
  const [chosen, setChosen] = useState(value);

  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.dialog} accessibilityViewIsModal>
          <DateTimePicker
            mode="date"
            display="inline"
            themeVariant="light"
            locale="es-ES"
            accentColor={colors.focus}
            value={toLocalDate(chosen)}
            minimumDate={toLocalDate(min)}
            maximumDate={toLocalDate(max)}
            onValueChange={(_event, date) => setChosen(calendarDateFromLocal(date))}
          />
          <Actions onAccept={() => onAccept(chosen)} onCancel={onCancel} />
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
});
