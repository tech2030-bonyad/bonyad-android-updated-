import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Image, ImageStyle, StyleProp } from 'react-native';
import { SvgXml } from 'react-native-svg';

interface SvgUriImageProps {
  uri: string;
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  fallbackColor?: string;
  testID?: string;
}

// Simple in-memory SVG cache to avoid re-fetching the same SVGs
const svgCache = new Map<string, string>();

/**
 * Component to render SVG from URL using react-native-svg.
 * Falls back to Image component for non-SVG formats or if fetch fails.
 */
export const SvgUriImage = React.memo(({
  uri,
  width = 36,
  height = 36,
  style,
  resizeMode = 'contain',
  fallbackColor,
  testID,
}: SvgUriImageProps) => {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!uri) {
      setLoading(false);
      setError(true);
      return;
    }

    const isSvg = uri.toLowerCase().endsWith('.svg');
    if (!isSvg) {
      setLoading(false);
      return;
    }

    const fetchSvg = async () => {
      // Check cache first
      if (svgCache.has(uri)) {
        setSvgContent(svgCache.get(uri)!);
        setError(false);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(uri);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const text = await response.text();
        svgCache.set(uri, text);
        setSvgContent(text);
        setError(false);
      } catch (err) {
        console.warn(`Failed to fetch SVG from ${uri}:`, err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSvg();
  }, [uri]);

  const isSvg = uri?.toLowerCase().endsWith('.svg');

  // Rendering SVG
  if (isSvg) {
    if (loading) {
      return (
        <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="small" color={fallbackColor || '#999'} />
        </View>
      );
    }

    if (error || !svgContent) {
      // Fallback to a colored placeholder
      return (
        <View
          style={{
            width,
            height,
            backgroundColor: fallbackColor || '#EEE',
            borderRadius: 4,
          }}
        />
      );
    }

    return (
      <SvgXml
        xml={svgContent}
        width={width}
        height={height}
        style={style}
        testID={testID}
      />
    );
  }

  // Render non-SVG images using standard Image component
  return (
    <Image
      source={{ uri }}
      style={[
        { width, height },
        style,
      ]}
      resizeMode={resizeMode}
      testID={testID}
    />
  );
});

SvgUriImage.displayName = 'SvgUriImage';
