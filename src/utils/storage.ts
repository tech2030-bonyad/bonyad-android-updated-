import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  AUTH_TOKEN: '@bonyad_auth_token',
  USER_ROLE: '@bonyad_user_role',
  DEVICE_TOKEN: '@bonyad_device_token',
  USER_ID: '@bonyad_user_id',
  FONT_SIZE: '@bonyad_font_size',
  LANGUAGE: '@bonyad_language',
  HAS_SEEN_ONBOARDING: '@bonyad_has_seen_onboarding',
  LOGIN_COUNT: '@bonyad_login_count',
};

export const storage = {
  // Save auth data
  async saveAuthData(token: string, role: string, userId: number, deviceToken?: string) {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token),
        AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, role),
        AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId.toString()),
      ]);
      
      if (deviceToken) {
        await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_TOKEN, deviceToken);
      }
      
      console.log('✅ Auth data saved to storage');
    } catch (error) {
      console.error('❌ Error saving auth data:', error);
    }
  },

  // Get auth token
  async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    } catch (error) {
      console.error('❌ Error getting auth token:', error);
      return null;
    }
  },

  // Get user role
  async getUserRole(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.USER_ROLE);
    } catch (error) {
      console.error('❌ Error getting user role:', error);
      return null;
    }
  },

  // Get device token
  async getDeviceToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_TOKEN);
    } catch (error) {
      console.error('❌ Error getting device token:', error);
      return null;
    }
  },

  // Get user ID
  async getUserId(): Promise<number | null> {
    try {
      const userId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      return userId ? parseInt(userId, 10) : null;
    } catch (error) {
      console.error('❌ Error getting user ID:', error);
      return null;
    }
  },

  // Clear all auth data (also resets onboarding/login counters so next signup shows onboarding)
  async clearAuthData() {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_ROLE),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_ID),
        AsyncStorage.removeItem(STORAGE_KEYS.DEVICE_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.LOGIN_COUNT),
        AsyncStorage.removeItem(STORAGE_KEYS.HAS_SEEN_ONBOARDING),
      ]);
      console.log('✅ Auth data cleared');
    } catch (error) {
      console.error('❌ Error clearing auth data:', error);
    }
  },

  // Get font size preference
  async getFontSize(): Promise<'small' | 'medium' | 'large'> {
    try {
      const fontSize = await AsyncStorage.getItem(STORAGE_KEYS.FONT_SIZE);
      if (fontSize === 'small' || fontSize === 'medium' || fontSize === 'large') {
        return fontSize;
      }
      return 'medium'; // Default
    } catch (error) {
      console.error('❌ Error getting font size:', error);
      return 'medium';
    }
  },

  // Save font size preference
  async saveFontSize(fontSize: 'small' | 'medium' | 'large') {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FONT_SIZE, fontSize);
      console.log('✅ Font size saved:', fontSize);
    } catch (error) {
      console.error('❌ Error saving font size:', error);
    }
  },

  // Get saved language ('en' | 'ar' or null)
  async getLanguage(): Promise<'en' | 'ar' | null> {
    try {
      const lang = await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE);
      if (lang === 'en' || lang === 'ar') return lang;
      return null;
    } catch (error) {
      console.error('❌ Error getting language:', error);
      return null;
    }
  },

  // Save language preference
  async saveLanguage(language: 'en' | 'ar') {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
      console.log('✅ Language saved:', language);
    } catch (error) {
      console.error('❌ Error saving language:', error);
    }
  },

  // Check if user has seen onboarding
  async hasSeenOnboarding(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.HAS_SEEN_ONBOARDING);
      return value === 'true';
    } catch (error) {
      console.error('❌ Error checking onboarding status:', error);
      return false;
    }
  },

  // Mark onboarding as completed
  async setOnboardingCompleted() {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HAS_SEEN_ONBOARDING, 'true');
      console.log('✅ Onboarding marked as completed');
    } catch (error) {
      console.error('❌ Error saving onboarding status:', error);
    }
  },

  // Clear onboarding status (for testing)
  async clearOnboardingStatus() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.HAS_SEEN_ONBOARDING);
      console.log('✅ Onboarding status cleared');
    } catch (error) {
      console.error('❌ Error clearing onboarding status:', error);
    }
  },

  // Get login count (for onboarding logic - show onboarding only if count is 0)
  async getLoginCount(): Promise<number> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.LOGIN_COUNT);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      console.error('❌ Error getting login count:', error);
      return 0;
    }
  },

  // Increment login count (called on every successful login or signup)
  async incrementLoginCount() {
    try {
      const currentCount = await this.getLoginCount();
      const newCount = currentCount + 1;
      await AsyncStorage.setItem(STORAGE_KEYS.LOGIN_COUNT, newCount.toString());
      console.log('✅ Login count incremented to:', newCount);
    } catch (error) {
      console.error('❌ Error incrementing login count:', error);
    }
  },

  // Clear login count (for testing)
  async clearLoginCount() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.LOGIN_COUNT);
      console.log('✅ Login count cleared');
    } catch (error) {
      console.error('❌ Error clearing login count:', error);
    }
  },
};
