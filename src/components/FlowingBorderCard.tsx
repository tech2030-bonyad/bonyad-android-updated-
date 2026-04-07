/**
 * FlowingBorderCard – animated shimmer border wrapping home-page sections.
 * Port of iOS FlowingBorderModifier: a single travelling shimmer highlight
 * that glides along the border, like light reflecting on water.
 *
 * Technique: "gradient border" – a rotating LinearGradient (scaled 2×) fills
 * the outer container, while inner content covers everything except a thin
 * border gap. overflow:'hidden' clips the gradient to a rounded rect, so the
 * bright arc appears to orbit the card edge.
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  Easing,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface FlowingBorderCardProps {
  children: React.ReactNode;
  /** Accent tint colour (hex). Default Bonyad blue. */
  accent?: string;
  /** Border corner radius. Default 20. */
  cornerRadius?: number;
  /** Border stroke width. Default 1.5. */
  lineWidth?: number;
  /** Seconds for one full shimmer revolution. Default 5. */
  speed?: number;
  /** Background colour of the inner content area (needed to mask the gradient). */
  cardBackground: string;
  style?: ViewStyle;
}

export default function FlowingBorderCard({
  children,
  accent = '#00A5F4',
  cornerRadius = 20,
  lineWidth = 1.5,
  speed = 5,
  cardBackground,
  style,
}: FlowingBorderCardProps) {
  const phase = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(phase, {
        toValue: 1,
        duration: speed * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [phase, speed]);

  const rotate = phase.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[{ borderRadius: cornerRadius, overflow: 'hidden' }, style]}>
      {/* Layer 1 – static tinted border fill (always visible) */}
      <View
        style={[StyleSheet.absoluteFillObject, { backgroundColor: `${accent}2E` }]}
        pointerEvents="none"
      />

      {/* Layer 2 – rotating shimmer gradient (scaled 2× so diagonal is covered) */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { transform: [{ rotate }, { scale: 2 }] },
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={[
            'transparent',
            'transparent',
            `${accent}26`, // ~0.15
            `${accent}8C`, // ~0.55
            `${accent}B3`, // ~0.70
            `${accent}8C`, // ~0.55
            `${accent}26`, // ~0.15
            'transparent',
            'transparent',
          ]}
          locations={[0, 0.35, 0.42, 0.48, 0.50, 0.52, 0.58, 0.65, 1.0]}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* Layer 3 – softer glow behind shimmer point */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { transform: [{ rotate }, { scale: 2 }], opacity: 0.4 },
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={[
            'transparent',
            'transparent',
            `${accent}40`, // ~0.25
            `${accent}80`, // ~0.50
            `${accent}40`, // ~0.25
            'transparent',
            'transparent',
          ]}
          locations={[0, 0.40, 0.47, 0.50, 0.53, 0.60, 1.0]}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* Inner content – covers gradient, leaving only the border visible */}
      <View
        style={{
          margin: lineWidth,
          borderRadius: cornerRadius - lineWidth,
          backgroundColor: cardBackground,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}
