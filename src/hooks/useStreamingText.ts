// 📝 useStreamingText Hook - Typewriter/Streaming effect for chat messages
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseStreamingTextOptions {
  text: string;
  speed?: number; // milliseconds per character
  onComplete?: () => void;
  enabled?: boolean;
}

export const useStreamingText = ({
  text,
  speed = 15, // Default 15ms per character for smooth typing
  onComplete,
  enabled = true,
}: UseStreamingTextOptions) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentIndexRef = useRef(0);

  const startStreaming = useCallback(() => {
    if (!enabled || !text) {
      setDisplayedText(text || '');
      setIsComplete(true);
      return;
    }

    setIsStreaming(true);
    setIsComplete(false);
    currentIndexRef.current = 0;
    setDisplayedText('');

    const streamNextChar = () => {
      if (currentIndexRef.current < text.length) {
        const nextChar = text[currentIndexRef.current];
        setDisplayedText(prev => prev + nextChar);
        currentIndexRef.current++;

        // Variable speed for more natural feel
        // Punctuation gets slightly longer pauses
        const char = text[currentIndexRef.current - 1];
        const isPunctuation = /[.!?,;:]/.test(char);
        const isNewLine = char === '\n';
        const isSpace = char === ' ';
        
        let delay = speed;
        if (isPunctuation) delay = speed * 3;
        if (isNewLine) delay = speed * 2;
        if (isSpace) delay = speed * 0.5;

        timeoutRef.current = setTimeout(streamNextChar, delay);
      } else {
        setIsComplete(true);
        setIsStreaming(false);
        onComplete?.();
      }
    };

    // Small initial delay before starting
    timeoutRef.current = setTimeout(streamNextChar, 100);
  }, [text, speed, enabled, onComplete]);

  const skipStreaming = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setDisplayedText(text);
    setIsComplete(true);
    setIsStreaming(false);
    onComplete?.();
  }, [text, onComplete]);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setDisplayedText('');
    setIsComplete(false);
    setIsStreaming(false);
    currentIndexRef.current = 0;
  }, []);

  // Auto-start when text changes
  useEffect(() => {
    reset();
    const timer = setTimeout(() => {
      startStreaming();
    }, 50);
    return () => clearTimeout(timer);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    displayedText,
    isComplete,
    isStreaming,
    skipStreaming,
    reset,
    startStreaming,
  };
};

export default useStreamingText;
