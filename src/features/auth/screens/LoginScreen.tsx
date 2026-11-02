import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Banner } from '@/components/Banner';
import { ERROR_MESSAGES } from '@/services/api/errors';

import { colors, layout, spacing } from '@/theme';

import { LoginForm } from '../components/LoginForm';
import { LoginHeader } from '../components/LoginHeader';
import { useExpiredEmail } from '../sessionStore';

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const expiredNotice = useExpiredEmail() ? ERROR_MESSAGES.unauthorized : null;
  const safeArea = {
    paddingTop: insets.top + spacing.xl,
    paddingBottom: insets.bottom + layout.screenPadding,
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, safeArea]}>
        <LoginHeader />
        <View style={expiredNotice ? styles.notice : null}>
          <Banner variant="info" message={expiredNotice} />
        </View>
        <LoginForm />
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
  notice: {
    marginBottom: spacing.xl,
  },
});
