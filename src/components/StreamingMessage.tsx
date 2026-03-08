// 📝 StreamingMessage Component - ChatGPT-style streaming text
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStreamingText } from '../hooks/useStreamingText';

interface StreamingMessageProps {
  text: string;
  isUser: boolean;
  timestamp: Date;
  colors: any;
  isDarkMode: boolean;
  onComplete?: () => void;
  avatar?: React.ReactNode;
}

const StreamingMessage: React.FC<StreamingMessageProps> = ({
  text,
  isUser,
  timestamp,
  colors,
  isDarkMode,
  onComplete,
  avatar,
}) => {
  const [showSkip, setShowSkip] = useState(true);
  
  const {
    displayedText,
    isComplete,
    isStreaming,
    skipStreaming,
  } = useStreamingText({
    text,
    speed: 12, // Slightly faster for better UX
    onComplete: () => {
      setShowSkip(false);
      onComplete?.();
    },
    enabled: !isUser, // Only stream bot messages
  });

  // Hide skip button after a few seconds if streaming is still going
  useEffect(() => {
    if (isStreaming && showSkip) {
      const timer = setTimeout(() => {
        setShowSkip(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isStreaming, showSkip]);

  const displayText = isUser ? text : displayedText;

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.botContainer,
      ]}
    >
      {!isUser && avatar && (
        <View style={styles.avatarContainer}>
          {avatar}
        </View>
      )}
      
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: colors.primary }]
            : [
                styles.botBubble,
                {
                  backgroundColor: isDarkMode ? colors.cardBackground : '#fff',
                  borderColor: isDarkMode ? colors.border : '#e5e7eb',
                },
              ],
        ]}
      >
        <Text
          style={[
            styles.text,
            isUser ? styles.userText : { color: colors.text },
          ]}
        >
          {displayText}
          {/* Blinking cursor effect while streaming */}
          {!isUser && isStreaming && (
            <Text style={[styles.cursor, { color: colors.primary }]}>▊</Text>
          )}
        </Text>
        
        {/* Timestamp */}
        <Text
          style={[
            styles.timestamp,
            { color: isUser ? 'rgba(255,255,255,0.7)' : colors.textTertiary },
          ]}
        >
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>

        {/* Skip streaming button */}
        {!isUser && isStreaming && showSkip && (
          <TouchableOpacity
            style={[styles.skipButton, { backgroundColor: colors.primary + '20' }]}
            onPress={skipStreaming}
            activeOpacity={0.7}
          >
            <Ionicons name="play-forward" size={12} color={colors.primary} />
            <Text style={[styles.skipText, { color: colors.primary }]}>
              Skip
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '85%',
  },
  userContainer: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  botContainer: {
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  bubble: {
    padding: 14,
    borderRadius: 18,
    maxWidth: '100%',
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  botBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  cursor: {
    fontWeight: '300',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  skipText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default StreamingMessage;
