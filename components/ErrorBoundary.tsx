import { Component, PropsWithChildren, ReactNode } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { captureError } from '@/lib/observability';
import { theme } from '@/constants/theme';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    captureError(error, { componentStack: info.componentStack });
  }

  reset = () => this.setState({ error: null });

  render(): ReactNode {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing(3), backgroundColor: theme.colors.bg }}>
          <AppText variant="title" style={{ textAlign: 'center' }}>Something broke</AppText>
          <AppText muted style={{ textAlign: 'center', marginTop: theme.spacing(1) }}>
            We logged the problem. Try again, or restart the app.
          </AppText>
          <Button label="Try again" onPress={this.reset} style={{ marginTop: theme.spacing(2) }} />
        </View>
      );
    }
    return this.props.children;
  }
}
