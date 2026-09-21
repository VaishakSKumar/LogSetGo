import Constants from 'expo-constants';
import { Component, type ReactNode } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { logError, readErrors } from '../lib/diagnostics';
import { formatErrorReport } from '../lib/errorlog';
import { saveTextFile } from '../lib/files';
import { colors } from '../theme';

interface State {
  error: Error | null;
  note: string | null;
}

/**
 * Catches a crash anywhere below it and shows a calm recovery screen instead of a blank one.
 * Your saved data is untouched: "Try again" simply re-renders the app. The error is kept in the
 * local diagnostics log, and you can share it from here.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, note: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, note: null };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    void logError(error, `render${info.componentStack ? `: ${info.componentStack.trim().split('\n')[0]}` : ''}`);
  }

  private share = async () => {
    const r = await saveTextFile('LogSetGo-error-log.txt', formatErrorReport(await readErrors(), Constants.expoConfig?.version ?? '1.0.0', Platform.OS), 'text/plain');
    this.setState({ note: r.ok ? 'Error log ready to share.' : r.error });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: colors.base, justifyContent: 'center', padding: 24 }} accessibilityRole="alert">
        <Text style={{ color: colors.label, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 }}>Something went wrong</Text>
        <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 21, marginTop: 8 }}>
          LogSetGo hit an unexpected problem. Your workouts, weights and attendance are saved on this device and weren’t affected.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => this.setState({ error: null, note: null })}
          style={{ marginTop: 24, height: 48, borderRadius: 24, backgroundColor: colors.label, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: '#000', fontSize: 17, fontWeight: '600' }}>Try again</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={this.share}
          style={{ marginTop: 12, height: 48, borderRadius: 24, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: colors.label, fontSize: 17, fontWeight: '600' }}>Share error log</Text>
        </Pressable>
        {this.state.note ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 12 }}>{this.state.note}</Text> : null}
      </View>
    );
  }
}
