import { ForwardedRef, forwardRef } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { AppText } from './text';
import { theme } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input = forwardRef(function Input({ label, error, style, ...props }: InputProps, ref: ForwardedRef<TextInput>) {
  return (
    <View style={styles.wrapper}>
      {label ? <AppText style={styles.label}>{label}</AppText> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={theme.colors.muted}
        style={[styles.input, style]}
        {...props}
      />
      {error ? <AppText variant="caption" style={styles.error}>{error}</AppText> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  label: { fontWeight: '600' },
  input: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    color: theme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  error: { color: theme.colors.danger },
});
