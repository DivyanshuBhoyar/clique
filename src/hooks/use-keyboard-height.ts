import { useSharedValue } from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';

export function useKeyboardHeight() {
  const height = useSharedValue(0);

  useKeyboardHandler({
    onMove: (event) => {
      'worklet';
      height.value = Math.max(event.height, 0);
    },
    onEnd: (event) => {
      'worklet';
      height.value = Math.max(event.height, 0);
    },
  }, []);

  return { height };
}
