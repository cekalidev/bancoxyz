import { useEffect, useRef } from 'react';
import { StyleSheet, View, type TextInstance } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { useFocusOnNextFrame } from '@/components/useFocusOnNextFrame';
import { spacing } from '@/theme';

import { hasBounds } from '../filterTransfers';
import type { DateBounds } from '../types';
import { useDateDraft } from '../useDateDraft';
import { DateBoundField } from './DateBoundField';
import { SheetActions } from './SheetActions';

type DateFilterSheetProps = {
  applied: DateBounds;
  onApply: (bounds: DateBounds) => void;
  onRemove: () => void;
  onClose: () => void;
};

type DateDraft = ReturnType<typeof useDateDraft>;
type DraftFieldsProps = { draft: DateDraft; filterApplied: boolean; onRemove: () => void };

function DraftFields({ draft, filterApplied, onRemove }: DraftFieldsProps) {
  return (
    <>
      <View style={styles.fields}>
        <DateBoundField
          label="Desde"
          date={draft.draft.from}
          onPress={() => draft.open('from')}
          onClear={() => draft.clear('from')}
          fieldRef={draft.fromRef}
        />
        <DateBoundField
          label="Hasta"
          date={draft.draft.to}
          onPress={() => draft.open('to')}
          onClear={() => draft.clear('to')}
          fieldRef={draft.toRef}
        />
      </View>
      <SheetActions filterApplied={filterApplied} onApply={draft.apply} onRemove={onRemove} />
    </>
  );
}

// En iOS, mientras se elige un día, la misma hoja muestra el calendario en lugar de los campos
// (un solo Modal); cerrar la hoja en ese paso la cierra entera sin aplicar nada. Al aceptar o
// cancelar, el borrador devuelve el foco al campo pulsado.
export function DateFilterSheet({ applied, onApply, onRemove, onClose }: DateFilterSheetProps) {
  const draft = useDateDraft(applied, onApply);
  const titleRef = useRef<TextInstance>(null);
  const focusLater = useFocusOnNextFrame();
  const calendar = draft.picker.element;
  const showsCalendar = calendar !== null;

  // El calendario nativo no expone una ref fiable: al entrar en él, el lector va al título de la hoja.
  useEffect(() => {
    if (showsCalendar) focusLater(titleRef);
  }, [showsCalendar, focusLater]);

  return (
    <BottomSheet
      title="Filtrar por fecha"
      closeLabel="Cerrar filtro de fecha"
      onClose={onClose}
      titleRef={titleRef}
    >
      {calendar ? (
        <View style={styles.calendar}>{calendar}</View>
      ) : (
        <DraftFields draft={draft} filterApplied={hasBounds(applied)} onRemove={onRemove} />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  calendar: {
    marginTop: spacing.xl,
  },
  fields: {
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
});
