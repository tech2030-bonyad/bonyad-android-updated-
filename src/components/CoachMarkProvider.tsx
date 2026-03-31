import React, { useEffect, useState } from 'react';
import {
  CopilotProvider,
  useCopilot,
  walkthroughable,
} from 'react-native-copilot';
import {
  View,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { coachMarksStorage } from '../utils/coachMarks';

// Make components highlightable by Copilot
export const WalkableView = walkthroughable(View);
export const WalkableTouch = walkthroughable(TouchableOpacity);

interface CoachMarkProviderProps {
  children: React.ReactNode;
}

// Inner component that uses the copilot hook
function CoachMarkContent({ children }: { children: React.ReactNode }) {
  const { start, visible, copilotEvents } = useCopilot();
  const { t } = useTranslation();

  useEffect(() => {
    const handleStop = async () => {
      console.log('✅ Coach marks completed or skipped');
      await coachMarksStorage.setHomeCoachMarksCompleted();
    };

    copilotEvents?.on('stop', handleStop);
  }, [copilotEvents]);

  return <>{children}</>;
}

// Main provider component
export default function CoachMarkProvider({ children }: CoachMarkProviderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Start with 0 offset and adjust based on testing
  // If overlay is ABOVE target: increase offset (positive)
  // If overlay is BELOW target: decrease offset (negative)
  const verticalOffset = 0;

  console.log('📐 verticalOffset:', verticalOffset, 'insets:', insets);

  return (
    <CopilotProvider
      stepNumberComponent={() => null}
      backdropColor="rgba(0,0,0,0.72)"
      animationDuration={300}
      verticalOffset={verticalOffset}
      androidStatusBarVisible={true}
      labels={{
        skip: t('coachMark.skip', 'Skip'),
        previous: t('coachMark.previous', '← Back'),
        next: t('coachMark.next', 'Next →'),
        finish: t('coachMark.finish', 'Done ✓'),
      }}
    >
      <CoachMarkContent>{children}</CoachMarkContent>
    </CopilotProvider>
  );
}
