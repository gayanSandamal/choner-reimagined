import { View, ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { Button } from './button';
import { theme } from '@/constants/theme';

const container: StyleProp<ViewStyle> = {
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: theme.spacing(4),
  gap: theme.spacing(1),
};

export function LoadingState({ label }: { label?: string }) {
  return (
    <View style={container}>
      <ActivityIndicator color={theme.colors.primary} />
      {label ? <AppText muted variant="caption">{label}</AppText> : null}
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={container}>
      <AppText variant="subtitle">Something went wrong</AppText>
      <AppText muted variant="caption" style={{ textAlign: 'center' }}>
        {message ?? 'Please try again in a moment.'}
      </AppText>
      {onRetry ? <Button label="Try again" variant="secondary" onPress={onRetry} style={{ marginTop: theme.spacing(1) }} /> : null}
    </View>
  );
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={container}>
      <AppText variant="subtitle" style={{ textAlign: 'center' }}>{title}</AppText>
      {body ? (
        <AppText muted variant="caption" style={{ textAlign: 'center', maxWidth: 280 }}>
          {body}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={{ marginTop: theme.spacing(1) }} />
      ) : null}
    </View>
  );
}
