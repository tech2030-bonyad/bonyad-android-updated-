import AsyncStorage from '@react-native-async-storage/async-storage';

const COACH_MARKS_KEYS = {
  HAS_SEEN_HOME_COACH_MARKS: '@bonyad_has_seen_home_coach_marks',
};

export const coachMarksStorage = {
  // Check if user has seen home screen coach marks
  async hasSeenHomeCoachMarks(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(COACH_MARKS_KEYS.HAS_SEEN_HOME_COACH_MARKS);
      return value === 'true';
    } catch (error) {
      console.error('❌ Error checking coach marks status:', error);
      return false;
    }
  },

  // Mark home screen coach marks as completed
  async setHomeCoachMarksCompleted() {
    try {
      await AsyncStorage.setItem(COACH_MARKS_KEYS.HAS_SEEN_HOME_COACH_MARKS, 'true');
      console.log('✅ Home coach marks marked as completed');
    } catch (error) {
      console.error('❌ Error saving coach marks status:', error);
    }
  },

  // Clear coach marks status (for testing)
  async clearHomeCoachMarksStatus() {
    try {
      await AsyncStorage.removeItem(COACH_MARKS_KEYS.HAS_SEEN_HOME_COACH_MARKS);
      console.log('✅ Home coach marks status cleared');
    } catch (error) {
      console.error('❌ Error clearing coach marks status:', error);
    }
  },
};
