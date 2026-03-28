import { useState } from 'react';

export function useHover() {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  return {
    hovered,
    pressed,
    handlers: {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => {
        setHovered(false);
        setPressed(false);
      },
      onPressIn: () => setPressed(true),
      onPressOut: () => setPressed(false),
    },
  };
}
