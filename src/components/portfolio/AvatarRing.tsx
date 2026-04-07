import React, { useId } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';

interface AvatarRingProps {
  children: React.ReactNode;
  avatarUrl?: string | null;
}

export const AvatarRing = ({ children, avatarUrl }: AvatarRingProps) => {
  const { colors } = useTheme();
  const gradId = `ringGrad_${useId().replace(/[^a-zA-Z0-9_]/g, '_')}`;

  return (
    <View style={styles.container}>
      <View style={styles.ringWrapper}>
        <Svg width={96} height={96} viewBox="0 0 96 96" style={StyleSheet.absoluteFillObject}>
          <Defs>
            <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#00549B" />
              <Stop offset="33%" stopColor="#0099ff" />
              <Stop offset="66%" stopColor="#00c8ff" />
              <Stop offset="100%" stopColor="#00549B" />
            </LinearGradient>
          </Defs>
          <Circle cx="48" cy="48" r="46" stroke={`url(#${gradId})`} strokeWidth="3" fill="none" />
        </Svg>
        <View style={[styles.innerAvatar, { backgroundColor: colors.primaryDark, borderColor: colors.background }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            children
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringWrapper: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
});
