import type { Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import type { TextInputInstance } from 'react-native';

import { ClearButton } from '@/components/ClearButton';
import { SearchIcon } from '@/components/icons/SearchIcon';
import { TextField } from '@/components/TextField';
import { colors, spacing } from '@/theme';

export type SearchFieldProps = {
  query: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  inputRef?: Ref<TextInputInstance>;
};

export function SearchField({ query, onChangeText, onClear, inputRef }: SearchFieldProps) {
  return (
    <TextField
      label="Nombre del destinatario"
      placeholder="Buscar por nombre"
      value={query}
      onChangeText={onChangeText}
      inputRef={inputRef}
      autoCorrect={false}
      autoCapitalize="none"
      returnKeyType="search"
      submitBehavior="blurAndSubmit"
      left={
        <View style={styles.lens}>
          <SearchIcon color={colors.textSecondary} />
        </View>
      }
      right={query !== '' ? <ClearButton label="Borrar búsqueda" onPress={onClear} /> : null}
    />
  );
}

const styles = StyleSheet.create({
  lens: {
    marginRight: spacing.xs,
  },
});
