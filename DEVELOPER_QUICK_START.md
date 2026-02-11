# Developer Quick Start Guide - Small Tasks Implementation

## 🚀 Getting Started

This guide will help you implement the missing Small Tasks and Services features in the Bonyad Android app.

---

## 📋 Prerequisites

### What's Already Done ✅
- ✅ All API endpoints defined in `src/config/api.ts`
- ✅ Authentication system working
- ✅ Theme and localization setup
- ✅ User can create small tasks
- ✅ Technician can manage services

### What You Need
- Node.js and npm/yarn installed
- React Native development environment
- Access to backend API (staging/production)
- Test credentials for both user and technician roles

---

## 🎯 Implementation Priority

### Start Here (Week 1-2): Technician Small Tasks
1. `AvailableSmallTasksScreen.tsx` - Browse tasks
2. `SmallTaskBidFormModal.tsx` - Submit bids
3. `MySmallTaskBidsScreen.tsx` - View bids
4. Integration with `TechnicianHomeScreen.tsx`

---

## 📁 File Structure

### New Files to Create
```
src/
├── screens/
│   ├── AvailableSmallTasksScreen.tsx          ← CREATE THIS
│   ├── MySmallTaskBidsScreen.tsx              ← CREATE THIS
│   └── ServiceSuggestionFormScreen.tsx        ← CREATE THIS (later)
├── components/
│   ├── SmallTaskCard.tsx                      ← CREATE THIS
│   └── SmallTaskBidFormModal.tsx              ← CREATE THIS
└── types/
    └── smallTasks.ts                          ← CREATE THIS
```

### Files to Modify
```
src/
├── screens/
│   ├── TechnicianHomeScreen.tsx               ← ADD NAVIGATION
│   ├── SmallTaskDetailScreen.tsx              ← ENHANCE
│   └── ServiceManagementScreen.tsx            ← ADD SUGGESTIONS
└── utils/
    └── useRouter.ts                           ← ADD ROUTES
```

---

## 🔧 Step-by-Step Implementation

### Step 1: Create Type Definitions

Create `src/types/smallTasks.ts`:

```typescript
// src/types/smallTasks.ts

export interface SmallTaskType {
  id: number;
  nameAr: string;
  nameEn: string;
  description: string;
  basePrice: number;
  estimatedDuration: number;
  isActive: boolean;
}

export interface SmallTaskRequest {
  id: number;
  taskType: {
    id: number;
    nameAr: string;
    nameEn: string;
  };
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  bidCount?: number;
  budget?: number;
  estimatedDuration?: number;
}

export interface SmallTaskBid {
  id: number;
  requestId: number;
  technicianId: number;
  technicianName: string;
  amount: number;
  description: string;
  estimatedHours: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  createdAt: string;
  request?: SmallTaskRequest;
}

export interface ServiceSuggestion {
  id: number;
  nameAr: string;
  nameEn: string;
  description: string;
  category: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes?: string;
  createdAt: string;
}
```

---

### Step 2: Create SmallTaskCard Component

Create `src/components/SmallTaskCard.tsx`:

```typescript
// src/components/SmallTaskCard.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { SmallTaskRequest } from '../types/smallTasks';

interface SmallTaskCardProps {
  task: SmallTaskRequest;
  onPress: () => void;
}

export default function SmallTaskCard({ task, onPress }: SmallTaskCardProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const isRTL = i18n.language === 'ar';

  const taskName = isRTL ? task.taskType.nameAr : task.taskType.nameEn;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Task Icon & Name */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="construct" size={24} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.taskName, { color: colors.text }]} numberOfLines={1}>
            {taskName}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {task.description}
          </Text>
        </View>
      </View>

      {/* Location */}
      <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
          {task.address}
        </Text>
      </View>

      {/* Budget & Bids */}
      <View style={[styles.footer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="cash-outline" size={16} color={colors.primary} />
          <Text style={[styles.budget, { color: colors.primary }]}>
            {task.budget} {t('SAR')}
          </Text>
        </View>
        
        {task.bidCount !== undefined && (
          <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {task.bidCount} {t('bids')}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  budget: {
    fontSize: 16,
    fontWeight: '700',
  },
});
```

---

### Step 3: Create AvailableSmallTasksScreen

Create `src/screens/AvailableSmallTasksScreen.tsx`:

```typescript
// src/screens/AvailableSmallTasksScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';
import SmallTaskCard from '../components/SmallTaskCard';
import { SmallTaskRequest } from '../types/smallTasks';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';

interface AvailableSmallTasksScreenProps {
  onBack: () => void;
  onTaskPress: (task: SmallTaskRequest) => void;
}

export default function AvailableSmallTasksScreen({
  onBack,
  onTaskPress,
}: AvailableSmallTasksScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isRTL = i18n.language === 'ar';

  const [tasks, setTasks] = useState<SmallTaskRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { alertState, showError, hideAlert } = useAlertPopup();

  useEffect(() => {
    fetchAvailableTasks();
  }, []);

  const fetchAvailableTasks = async () => {
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        showError(t('Please login again'), t('Error'));
        return;
      }

      const url = buildApiUrl(API_ENDPOINTS.SMALL_TASKS.REQUESTS_AVAILABLE);
      console.log('🔍 Fetching available tasks:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Loaded tasks:', data.requests?.length || 0);
        setTasks(data.requests || []);
      } else {
        console.error('❌ Failed to fetch tasks:', response.status);
        showError(t('Failed to load tasks'), t('Error'));
      }
    } catch (error) {
      console.error('❌ Error fetching tasks:', error);
      showError(t('Error loading tasks'), t('Error'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAvailableTasks();
  };

  const renderTask = ({ item }: { item: SmallTaskRequest }) => (
    <SmallTaskCard task={item} onPress={() => onTaskPress(item)} />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="briefcase-outline" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {t('No available tasks at the moment')}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 20),
            borderBottomColor: colors.border,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons
            name={isRTL ? 'arrow-forward' : 'arrow-back'}
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('Available Small Tasks')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Task List */}
      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      />

      {/* Alert Popup */}
      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});
```

---

### Step 4: Create SmallTaskBidFormModal

Create `src/components/SmallTaskBidFormModal.tsx`:

```typescript
// src/components/SmallTaskBidFormModal.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { API_ENDPOINTS, buildApiUrlWithParams } from '../config/api';
import { storage } from '../utils/storage';
import { SmallTaskRequest } from '../types/smallTasks';
import AlertPopup, { useAlertPopup } from './AlertPopup';

interface SmallTaskBidFormModalProps {
  visible: boolean;
  task: SmallTaskRequest | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SmallTaskBidFormModal({
  visible,
  task,
  onClose,
  onSuccess,
}: SmallTaskBidFormModalProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const isRTL = i18n.language === 'ar';

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();

  const handleSubmit = async () => {
    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      showError(t('Please enter a valid amount'), t('Validation Error'));
      return;
    }

    if (!description.trim()) {
      showError(t('Please enter a description'), t('Validation Error'));
      return;
    }

    if (!estimatedHours || parseFloat(estimatedHours) <= 0) {
      showError(t('Please enter valid hours'), t('Validation Error'));
      return;
    }

    if (!task) return;

    setIsSubmitting(true);

    try {
      const token = await storage.getAuthToken();
      if (!token) {
        showError(t('Please login again'), t('Error'));
        return;
      }

      const url = buildApiUrlWithParams(API_ENDPOINTS.SMALL_TASKS.REQUEST_BID, {
        id: task.id,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          description: description.trim(),
          estimatedHours: parseFloat(estimatedHours),
        }),
      });

      if (response.ok) {
        showSuccess(t('Bid submitted successfully'), t('Success'));
        setTimeout(() => {
          setAmount('');
          setDescription('');
          setEstimatedHours('');
          onClose();
          onSuccess();
        }, 1500);
      } else {
        const errorData = await response.json();
        showError(errorData.message || t('Failed to submit bid'), t('Error'));
      }
    } catch (error) {
      console.error('Error submitting bid:', error);
      showError(t('Error submitting bid'), t('Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!task) return null;

  const taskName = isRTL ? task.taskType.nameAr : task.taskType.nameEn;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.cardBackground }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('Submit Bid')}
            </Text>
            <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Task Info */}
            <View style={styles.taskInfo}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('Task')}:
              </Text>
              <Text style={[styles.taskName, { color: colors.text }]}>
                {taskName}
              </Text>
              {task.budget && (
                <Text style={[styles.budget, { color: colors.primary }]}>
                  {t('Budget')}: {task.budget} {t('SAR')}
                </Text>
              )}
            </View>

            {/* Amount Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                {t('Your Bid Amount (SAR)')} *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder={t('Enter amount')}
                placeholderTextColor={colors.textSecondary}
                editable={!isSubmitting}
              />
            </View>

            {/* Hours Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                {t('Estimated Hours')} *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={estimatedHours}
                onChangeText={setEstimatedHours}
                keyboardType="numeric"
                placeholder={t('Enter hours')}
                placeholderTextColor={colors.textSecondary}
                editable={!isSubmitting}
              />
            </View>

            {/* Description Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                {t('Description')} *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                placeholder={t('Describe your offer...')}
                placeholderTextColor={colors.textSecondary}
                editable={!isSubmitting}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>
                {t('Cancel')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.buttonText, { color: '#fff' }]}>
                  {t('Submit Bid')}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Alert Popup */}
          <AlertPopup
            visible={alertState.visible}
            title={alertState.title}
            message={alertState.message}
            type={alertState.type}
            buttons={alertState.buttons}
            onClose={hideAlert}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    padding: 20,
  },
  taskInfo: {
    marginBottom: 20,
  },
  taskName: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  budget: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  submitButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
```

---

### Step 5: Integrate with TechnicianHomeScreen

Modify `src/screens/TechnicianHomeScreen.tsx`:

```typescript
// Add to imports
import AvailableSmallTasksScreen from './AvailableSmallTasksScreen';
import SmallTaskDetailScreen from './SmallTaskDetailScreen';
import SmallTaskBidFormModal from '../components/SmallTaskBidFormModal';

// Add to state
const [showSmallTasks, setShowSmallTasks] = useState(false);
const [selectedSmallTask, setSelectedSmallTask] = useState<any>(null);
const [showBidForm, setShowBidForm] = useState(false);

// Add navigation handler
const handleSmallTaskPress = (task: any) => {
  setSelectedSmallTask(task);
};

// Add to render (in the home tab content)
{showSmallTasks ? (
  <AvailableSmallTasksScreen
    onBack={() => setShowSmallTasks(false)}
    onTaskPress={handleSmallTaskPress}
  />
) : selectedSmallTask ? (
  <SmallTaskDetailScreen
    task={selectedSmallTask}
    onBack={() => setSelectedSmallTask(null)}
    onSubmitBid={() => setShowBidForm(true)}
  />
) : (
  // ... existing home content
  <TouchableOpacity
    style={styles.smallTasksButton}
    onPress={() => setShowSmallTasks(true)}
  >
    <Text>{t('Small Tasks')}</Text>
  </TouchableOpacity>
)}

// Add bid form modal
<SmallTaskBidFormModal
  visible={showBidForm}
  task={selectedSmallTask}
  onClose={() => setShowBidForm(false)}
  onSuccess={() => {
    setShowBidForm(false);
    setSelectedSmallTask(null);
  }}
/>
```

---

## 🧪 Testing

### Test Checklist
- [ ] Can view available small tasks
- [ ] Can tap on a task to see details
- [ ] Can submit a bid with valid data
- [ ] Form validation works (empty fields, invalid numbers)
- [ ] Success message shows after bid submission
- [ ] Error handling works (network errors, API errors)
- [ ] RTL layout works correctly
- [ ] Dark mode works correctly
- [ ] Loading states show properly
- [ ] Refresh functionality works

### Test Data
```json
// Example task from API
{
  "id": 101,
  "taskType": {
    "id": 1,
    "nameAr": "تصليح حنفية",
    "nameEn": "Faucet Repair"
  },
  "description": "Kitchen faucet leaking",
  "address": "Riyadh, Al Yasmin",
  "latitude": 24.7136,
  "longitude": 46.6753,
  "status": "PENDING",
  "budget": 150,
  "bidCount": 3,
  "createdAt": "2026-02-09T10:00:00"
}
```

---

## 🐛 Common Issues & Solutions

### Issue 1: API returns 401 Unauthorized
**Solution:** Check that auth token is valid and not expired
```typescript
const token = await storage.getAuthToken();
console.log('Token:', token ? 'exists' : 'missing');
```

### Issue 2: Tasks not loading
**Solution:** Check API endpoint and response format
```typescript
console.log('API URL:', url);
console.log('Response status:', response.status);
const data = await response.json();
console.log('Response data:', data);
```

### Issue 3: Bid submission fails
**Solution:** Validate request body matches API spec
```typescript
console.log('Bid data:', {
  amount: parseFloat(amount),
  description: description.trim(),
  estimatedHours: parseFloat(estimatedHours),
});
```

---

## 📚 Additional Resources

### API Documentation
- See `SMALL_TASKS_MISSING_FEATURES.md` for complete API reference
- Backend API base URL: `https://www.bonyad-hub.com/api`

### Existing Code References
- `ProjectsScreen.tsx` - Similar list implementation
- `BidFormModal.tsx` - Similar form implementation
- `ServiceManagementScreen.tsx` - Service management patterns

### Design Patterns
- Use `useAlertPopup` hook for error/success messages
- Use `storage.getAuthToken()` for authentication
- Use `buildApiUrl` and `buildApiUrlWithParams` for API calls
- Follow RTL patterns with `isRTL` checks
- Use theme colors from `useTheme()` hook

---

## ✅ Definition of Done

Before marking a feature as complete:
- [ ] Code compiles without errors
- [ ] All TypeScript types are properly defined
- [ ] API integration tested and working
- [ ] Error handling implemented
- [ ] Loading states implemented
- [ ] Success/failure messages shown
- [ ] RTL layout tested
- [ ] Dark mode tested
- [ ] Code reviewed by team
- [ ] No console errors or warnings

---

## 🚀 Next Steps

After completing Phase 1 (Technician Small Tasks):
1. Implement `MySmallTaskBidsScreen.tsx`
2. Add withdraw bid functionality
3. Add update task status functionality
4. Move to Phase 2: Service Suggestions
5. Move to Phase 3: User enhancements

---

## 💬 Need Help?

- Check existing similar screens for patterns
- Review API documentation in detail
- Test with Postman/curl first
- Ask backend team for clarifications
- Review this guide and related documents

---

**Happy Coding! 🎉**

**Last Updated:** February 11, 2026
