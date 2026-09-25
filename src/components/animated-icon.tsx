import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(false), 1800);
    return () => clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <View style={styles.splashContainer}>
      <View style={styles.iconWrapper}>
        <Image
          style={styles.splashIcon}
          source={require('@/assets/images/icon.png')}
          contentFit="contain"
        />
      </View>

      <Text style={styles.madeWithLove}>
        Made with love by Divyanshu Bhoyar ❤️
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FAF7F2',
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashIcon: {
    width: 256,
    height: 256,
    borderRadius: 36,
  },
  madeWithLove: {
    fontSize: 12,
    color: '#9A8E80',
    letterSpacing: 0.3,
    marginBottom: 44,
  },
});
