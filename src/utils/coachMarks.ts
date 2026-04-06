import AsyncStorage from '@react-native-async-storage/async-storage';

const LEGACY_HOME_KEY = '@bonyad_has_seen_home_coach_marks';

export type TutorialScreenKey =
  | 'userHome'
  | 'technicianHome'
  | 'userProjectsTab'
  | 'userChatTab'
  | 'userProfileTab'
  | 'userNewTab'
  | 'userProjectTypeSelection'
  | 'userNotificationsTab'
  | 'userAppointmentsTab'
  | 'pending'
  | 'approved'
  | 'contractSigning'
  | 'inProgress'
  | 'profile'
  | 'appointments'
  | 'smallTask'
  | 'smallTaskTechnician';

const tutorialStorageKey = (screen: TutorialScreenKey) => `@bonyad_tutorial_done_${screen}`;

export const coachMarksStorage = {
  async hasSeenTutorial(screen: TutorialScreenKey): Promise<boolean> {
    try {
      if (screen === 'userHome') {
        const legacy = await AsyncStorage.getItem(LEGACY_HOME_KEY);
        if (legacy === 'true') return true;
      }
      const value = await AsyncStorage.getItem(tutorialStorageKey(screen));
      return value === 'true';
    } catch (error) {
      console.error('❌ Error checking tutorial status:', error);
      return false;
    }
  },

  async markTutorialComplete(screen: TutorialScreenKey) {
    try {
      await AsyncStorage.setItem(tutorialStorageKey(screen), 'true');
      if (screen === 'userHome') {
        await AsyncStorage.removeItem(LEGACY_HOME_KEY);
      }
      console.log('✅ Tutorial marked complete:', screen);
    } catch (error) {
      console.error('❌ Error saving tutorial status:', error);
    }
  },

  async clearTutorial(screen: TutorialScreenKey) {
    try {
      await AsyncStorage.removeItem(tutorialStorageKey(screen));
      if (screen === 'userHome') {
        await AsyncStorage.removeItem(LEGACY_HOME_KEY);
      }
      console.log('✅ Tutorial cleared:', screen);
    } catch (error) {
      console.error('❌ Error clearing tutorial:', error);
    }
  },

  /** @deprecated use hasSeenTutorial('userHome') */
  async hasSeenHomeCoachMarks(): Promise<boolean> {
    return this.hasSeenTutorial('userHome');
  },

  /** @deprecated use markTutorialComplete('userHome') */
  async setHomeCoachMarksCompleted() {
    return this.markTutorialComplete('userHome');
  },

  /** @deprecated use clearTutorial('userHome') */
  async clearHomeCoachMarksStatus() {
    return this.clearTutorial('userHome');
  },
};
