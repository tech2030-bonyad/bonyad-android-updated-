/**
 * Remembers which tutorial "screen" should be marked complete when the user
 * finishes or skips the global react-native-copilot tour.
 */
let pendingTutorialCompletionKey: string | null = null;

export function setTutorialCompletionKey(key: string | null) {
  pendingTutorialCompletionKey = key;
}

export function consumeTutorialCompletionKey(): string | null {
  const k = pendingTutorialCompletionKey;
  pendingTutorialCompletionKey = null;
  return k;
}
