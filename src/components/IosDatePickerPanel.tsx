import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, spacing } from '@/theme';
import { calendarDateFromLocal, toLocalDate } from '@/utils/date';
import type { CalendarDate } from '@/utils/date';

export type IosDatePickerPanelProps = {
  value: CalendarDate;
  min?: CalendarDate;
  max?: CalendarDate;
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

export function IosDatePickerPanel({ value, min, max, onAccept, onCancel }: IosDatePickerPanelProps) {
  const [chosen, setChosen] = useState(value);

  return (
    <>
      <DateTimePicker
        mode="date"
        display="inline"
        themeVariant="light"
        locale="es-ES"
        accentColor={colors.focus}
        value={toLocalDate(chosen)}
        {...(min && { minimumDate: toLocalDate(min) })}
        {...(max && { maximumDate: toLocalDate(max) })}
        onValueChange={(_event, date) => setChosen(calendarDateFromLocal(date))}
      />
      <Actions onAccept={() => onAccept(chosen)} onCancel={onCancel} />
    </>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
});
