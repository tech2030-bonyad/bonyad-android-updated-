import React from 'react';
import { Text, StyleSheet } from 'react-native';
import type { HighlightPart } from '../../utils/smartSearch';

interface HighlightedTextProps {
  parts: HighlightPart[];
  style?: any;
  highlightStyle?: any;
  numberOfLines?: number;
}

export function HighlightedText({ parts, style, highlightStyle, numberOfLines }: HighlightedTextProps) {
  if (!parts || parts.length === 0) return null;
  const hasContent = parts.some((p) => p.text && p.text.length > 0);
  if (!hasContent) return null;

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, i) =>
        part.highlight ? (
          <Text key={i} style={[styles.highlight, highlightStyle]}>
            {part.text}
          </Text>
        ) : (
          <Text key={i}>{part.text}</Text>
        )
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  highlight: {
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    borderRadius: 2,
  },
});
