import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

interface LoadingStateProps {
  fullScreen?: boolean;
}

export function LoadingState({ fullScreen = true }: LoadingStateProps) {
  const theme = useTheme();

  const indicator = (
    <ActivityIndicator size="large" color={theme.accent} />
  );

  if (fullScreen) {
    return (
      <SafeAreaView style={[styles.fullScreen, { backgroundColor: theme.background }]}>
        {indicator}
      </SafeAreaView>
    );
  }

  return <View style={styles.inline}>{indicator}</View>;
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inline: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
