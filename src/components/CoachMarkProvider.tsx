import React, { useEffect } from 'react';
import {
  CopilotProvider,
  useCopilot,
  walkthroughable,
} from 'react-native-copilot';
import {
  View,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { coachMarksStorage, type TutorialScreenKey } from '../utils/coachMarks';
import { consumeTutorialCompletionKey } from '../utils/tutorialSession';
import CopilotTourTooltip from './CopilotTourTooltip';

export const WalkableView = walkthroughable(View);
export const WalkableTouch = walkthroughable(TouchableOpacity);

interface CoachMarkProviderProps {
  children: React.ReactNode;
}

function CoachMarkContent({ children }: { children: React.ReactNode }) {
  const { copilotEvents } = useCopilot();

  useEffect(() => {
    const handleStop = async () => {
      const key = consumeTutorialCompletionKey();
      if (key) {
        await coachMarksStorage.markTutorialComplete(key as TutorialScreenKey);
      }
    };

    copilotEvents?.on('stop', handleStop);
    return () => {
      copilotEvents?.off('stop', handleStop);
    };
  }, [copilotEvents]);

  return <>{children}</>;
}

export default function CoachMarkProvider({ children }: CoachMarkProviderProps) {
  const { t } = useTranslation();

  return (
    <CopilotProvider
      stepNumberComponent={() => null}
      tooltipComponent={CopilotTourTooltip}
      backdropColor="rgba(0,0,0,0.72)"
      animationDuration={300}
      overlay="view"
      verticalOffset={0}
      margin={12}
      androidStatusBarVisible={true}
      tooltipStyle={{ backgroundColor: 'transparent', borderRadius: 12 }}
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
