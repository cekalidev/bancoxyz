import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import type { Balance } from '@/services/api/types';
import { colors, layout, spacing } from '@/theme';

import { formDateSpoken, formDateText } from '../transferText';
import { useTransferForm } from '../useTransferForm';
import { AmountField } from './AmountField';
import { DocumentField } from './DocumentField';

type TransferFormProps = { balance: Balance };

const DATE_HINT = { text: 'Elige una fecha futura para programarla.' };

type TransferFields = ReturnType<typeof useTransferForm>['fields'];

// El orden de los campos es también el orden de lectura.
function Fields({ fields, currency }: { fields: TransferFields; currency: string }) {
  const { amountRef, documentRef, dateRef } = fields.refs;

  return (
    <View style={styles.fields}>
      <AmountField
        value={fields.amountText}
        onChange={fields.changeAmount}
        error={fields.errors.amount}
        onNext={() => documentRef.current?.focus()}
        cap={{ cents: fields.capCents, currency }}
        inputRef={amountRef}
      />
      <DocumentField
        digits={fields.values.document}
        onChange={fields.changeDocument}
        error={fields.errors.document}
        inputRef={documentRef}
      />
      <DateField
        label="Fecha de la transferencia"
        text={formDateText(fields.values.date, fields.today)}
        spokenLabel={formDateSpoken(fields.values.date, fields.today)}
        hint={DATE_HINT}
        error={fields.errors.date}
        onPress={fields.openDatePicker}
        fieldRef={dateRef}
      />
    </View>
  );
}

// El botón queda al final del scroll, después de los campos. En iOS el teclado se mide desde la
// pantalla entera: el desplazamiento descuenta la barra de estado y la cabecera.
export function TransferForm({ balance }: TransferFormProps) {
  const insets = useSafeAreaInsets();
  const { fields, submit } = useTransferForm(balance);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + layout.appBarHeight : 0}
      style={styles.screen}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + layout.screenPadding }]}
      >
        <Fields fields={fields} currency={balance.currency} />
        <View style={styles.action}>
          <Button label="Continuar" onPress={submit} />
        </View>
        {fields.pickerElement}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    padding: layout.screenPadding,
  },
  fields: {
    gap: spacing.md,
  },
  action: {
    marginTop: spacing.xxl,
  },
});
