# Missing UI/UX for Small Tasks Status Screens (Option 2)

## 📋 Overview

This document lists all missing UI/UX components needed to implement **dedicated status screens** for small tasks (similar to how regular projects work), making it a fully integrated feature matching the API documentation.

---

## 🔴 CRITICAL MISSING SCREENS

### 1. PendingSmallTaskScreen.tsx

**Purpose:** Dedicated screen for `PENDING` status small tasks

**Location:** `src/screens/PendingSmallTaskScreen.tsx`

**Features Needed:**

#### For Users (Task Creator):
- ✅ Task details card (type, description, address, budget)
- ✅ **Bids received section** with:
  - List of all bids
  - Bid comparison view
  - Accept/Reject buttons on each bid
  - Technician profile preview
  - Sort/filter options (by price, rating, time)
- ✅ **Empty state** when no bids yet:
  - Icon + message
  - "Waiting for technicians to bid"
  - Refresh button
- ✅ **Cancel Request button** (only if PENDING)
- ✅ **Edit Request button** (only if PENDING)
- ✅ Bid count badge
- ✅ Status timeline indicator

#### For Technicians:
- ✅ Task details card
- ✅ **Submit Bid button** (floating action button)
- ✅ **Bid form modal** integration
- ✅ "Already bid" indicator if bid exists
- ✅ View other bids count (if allowed)

**UI Components Needed:**
```tsx
// New components to create:
- SmallTaskBidCard.tsx (enhanced version)
- SmallTaskBidComparisonView.tsx
- SmallTaskCancelModal.tsx
- SmallTaskEditModal.tsx
- EmptyBidsState.tsx
```

**API Integration:**
- `GET /api/small-tasks/requests/{id}/bids` - Get bids
- `PATCH /api/small-tasks/bids/{id}/accept` - Accept bid
- `PATCH /api/small-tasks/bids/{id}/reject` - Reject bid
- `DELETE /api/small-tasks/requests/{id}` - Cancel request
- `PUT /api/small-tasks/requests/{id}` - Edit request (if exists)

---

### 2. AssignedSmallTaskScreen.tsx

**Purpose:** Dedicated screen for `ASSIGNED` status (bid accepted, technician assigned)

**Location:** `src/screens/AssignedSmallTaskScreen.tsx`

**Features Needed:**

#### For Users:
- ✅ **Assigned Technician Card:**
  - Technician name, photo, rating
  - "View Profile" button
  - "Chat" button
  - Contact information
- ✅ Task details
- ✅ Accepted bid details (amount, description, estimated time)
- ✅ **Status timeline** showing: PENDING → ASSIGNED → IN_PROGRESS → COMPLETED
- ✅ "Waiting for technician to start" message
- ✅ Estimated start time (if available)

#### For Technicians:
- ✅ Task details
- ✅ **"Start Work" button** (updates status to IN_PROGRESS)
- ✅ Accepted bid details
- ✅ User contact information
- ✅ "Chat with User" button
- ✅ Task location on map
- ✅ Estimated completion time

**UI Components Needed:**
```tsx
// New components:
- AssignedTechnicianCard.tsx
- SmallTaskStatusTimeline.tsx
- StartWorkButton.tsx
- TaskLocationMap.tsx (optional)
```

**API Integration:**
- `GET /api/small-tasks/requests/{id}` - Get task details
- `PATCH /api/small-tasks/requests/{id}/status` - Update to IN_PROGRESS
- `GET /api/chat/my-chats` - Get chat room
- `GET /api/technicians/{id}` - Get technician profile

---

### 3. InProgressSmallTaskScreen.tsx

**Purpose:** Dedicated screen for `IN_PROGRESS` status (work started)

**Location:** `src/screens/InProgressSmallTaskScreen.tsx`

**Features Needed:**

#### For Users:
- ✅ **Progress Indicator:**
  - Visual progress bar
  - Estimated completion time
  - Time elapsed
- ✅ **Technician Updates Section:**
  - Work updates/photos (if supported)
  - Status messages
  - Last activity timestamp
- ✅ Technician contact card
- ✅ "Chat" button
- ✅ Status timeline
- ✅ "Report Issue" button (optional)

#### For Technicians:
- ✅ **Work Progress Section:**
  - Progress input/indicator
  - Photo upload (if supported)
  - Update notes field
- ✅ **"Mark Complete" button**
- ✅ Task details reminder
- ✅ User contact card
- ✅ "Chat" button
- ✅ Estimated time remaining

**UI Components Needed:**
```tsx
// New components:
- SmallTaskProgressBar.tsx
- WorkUpdateCard.tsx
- PhotoUploadButton.tsx (if supported)
- MarkCompleteButton.tsx
- TimeElapsedIndicator.tsx
```

**API Integration:**
- `PATCH /api/small-tasks/requests/{id}/status` - Update to COMPLETED
- `POST /api/small-tasks/requests/{id}/updates` - Post work updates (if exists)
- `POST /api/small-tasks/requests/{id}/photos` - Upload photos (if exists)

---

### 4. CompletedSmallTaskScreen.tsx

**Purpose:** Dedicated screen for `COMPLETED` status

**Location:** `src/screens/CompletedSmallTaskScreen.tsx`

**Features Needed:**

#### For Users:
- ✅ **Completion Confirmation:**
  - Success animation/icon
  - Completion date/time
  - Final amount paid
- ✅ **Review/Rating Section:**
  - Star rating input
  - Review text field
  - "Submit Review" button
  - "Skip" option
- ✅ Technician details card
- ✅ Task summary
- ✅ **"Request Similar Task" button** (optional)
- ✅ **"View All Tasks" button**

#### For Technicians:
- ✅ **Completion Summary:**
  - Task completed confirmation
  - Amount earned
  - Completion date
- ✅ User details card
- ✅ **"Request Payment" button** (if payment pending)
- ✅ **"View All Tasks" button**
- ✅ Rating received (if user rated)

**UI Components Needed:**
```tsx
// New components:
- CompletionConfirmationCard.tsx
- SmallTaskReviewForm.tsx
- RatingStarsInput.tsx
- TaskSummaryCard.tsx
- SuccessAnimation.tsx (optional)
```

**API Integration:**
- `POST /api/reviews` - Submit review
- `GET /api/reviews/project/{projectId}/status` - Check review status
- `GET /api/small-tasks/requests/{id}` - Get final task details

---

## 🟡 IMPORTANT MISSING COMPONENTS

### 5. Enhanced SmallTaskBidCard Component

**Current:** Basic bid display in `SmallTaskDetailScreen.tsx`

**Needed:** Full-featured bid card component

**Location:** `src/components/SmallTaskBidCard.tsx`

**Features:**
- ✅ Technician profile picture/avatar
- ✅ Technician name and rating
- ✅ Bid amount (prominent)
- ✅ Estimated hours
- ✅ Bid description
- ✅ Bid status badge (PENDING, ACCEPTED, REJECTED)
- ✅ Created date
- ✅ **"View Technician Profile" button**
- ✅ **"Accept" button** (for users)
- ✅ **"Reject" button** (for users)
- ✅ **"Withdraw" button** (for technicians, if PENDING)
- ✅ Technician stats (projects count, response time)
- ✅ Distance from task location (if available)

**Design:** Similar to `BidCard` in `BidReceivedProjectScreen.tsx` but adapted for small tasks

---

### 6. SmallTaskBidComparisonView Component

**Purpose:** Side-by-side comparison of bids

**Location:** `src/components/SmallTaskBidComparisonView.tsx`

**Features:**
- ✅ Table/list view of all bids
- ✅ Sortable columns (Price, Rating, Time, Date)
- ✅ Filter options
- ✅ Highlight "Best Value" bid
- ✅ Select bid to accept
- ✅ Expandable bid details

---

### 7. SmallTaskStatusTimeline Component

**Purpose:** Visual timeline showing status progression

**Location:** `src/components/SmallTaskStatusTimeline.tsx`

**Features:**
- ✅ Horizontal timeline with statuses:
  - PENDING (with bids count)
  - ASSIGNED (with technician name)
  - IN_PROGRESS (with progress %)
  - COMPLETED (with completion date)
- ✅ Active status highlighted
- ✅ Past statuses shown as completed
- ✅ Future statuses shown as upcoming
- ✅ Clickable to view status details
- ✅ Status change timestamps

**Design:** Similar to `SmallTaskPhaseBar` but more detailed

---

### 8. SmallTaskCancelModal Component

**Purpose:** Confirmation modal for canceling task

**Location:** `src/components/SmallTaskCancelModal.tsx`

**Features:**
- ✅ Confirmation message
- ✅ Warning about canceling with bids
- ✅ Reason selection (optional)
- ✅ "Cancel" and "Confirm" buttons
- ✅ Error handling if cancel fails

---

### 9. SmallTaskEditModal Component

**Purpose:** Edit task details (if allowed)

**Location:** `src/components/SmallTaskEditModal.tsx`

**Features:**
- ✅ Edit description
- ✅ Edit address/location
- ✅ Edit task type (if allowed)
- ✅ Save/Cancel buttons
- ✅ Validation

**Note:** May need API endpoint `PUT /api/small-tasks/requests/{id}`

---

### 10. Empty States Components

**Location:** `src/components/EmptyStates/`

**Components Needed:**
- `EmptyBidsState.tsx` - No bids received
- `EmptySmallTasksState.tsx` - No tasks found
- `EmptyMyBidsState.tsx` - No bids submitted
- `EmptyCompletedTasksState.tsx` - No completed tasks

**Features:**
- ✅ Icon
- ✅ Title message
- ✅ Subtitle/description
- ✅ Action button (if applicable)
- ✅ Consistent styling

---

## 🟢 NICE TO HAVE COMPONENTS

### 11. SmallTaskProgressBar Component

**Purpose:** Visual progress indicator for IN_PROGRESS tasks

**Location:** `src/components/SmallTaskProgressBar.tsx`

**Features:**
- ✅ Progress percentage
- ✅ Visual bar
- ✅ Time elapsed vs estimated
- ✅ Status text

---

### 12. SmallTaskReviewForm Component

**Purpose:** Review form for completed tasks

**Location:** `src/components/SmallTaskReviewForm.tsx`

**Features:**
- ✅ Star rating (1-5)
- ✅ Review text input
- ✅ Photo upload (optional)
- ✅ Submit/Skip buttons
- ✅ Validation

---

### 13. TaskLocationMap Component

**Purpose:** Show task location on map

**Location:** `src/components/TaskLocationMap.tsx`

**Features:**
- ✅ Map view with marker
- ✅ Address display
- ✅ "Get Directions" button
- ✅ Distance calculation (if user location available)

---

### 14. WorkUpdateCard Component

**Purpose:** Display work updates from technician

**Location:** `src/components/WorkUpdateCard.tsx`

**Features:**
- ✅ Update message
- ✅ Photos (if any)
- ✅ Timestamp
- ✅ Status indicator

---

## 📊 Navigation & Routing Updates

### Updates Needed in ProjectsScreen.tsx

**Current:** Small tasks use `SmallTaskDetailScreen` for all statuses

**Needed:** Route to appropriate status screen based on task status

```tsx
// In ProjectsScreen.tsx, update navigation logic:

const handleSmallTaskPress = (task: SmallTaskRequest) => {
  const status = task.status?.toUpperCase();
  
  switch (status) {
    case 'PENDING':
      setCurrentPage('pending-small-task');
      setSelectedSmallTask(task);
      break;
    case 'ASSIGNED':
      setCurrentPage('assigned-small-task');
      setSelectedSmallTask(task);
      break;
    case 'IN_PROGRESS':
      setCurrentPage('in-progress-small-task');
      setSelectedSmallTask(task);
      break;
    case 'COMPLETED':
      setCurrentPage('completed-small-task');
      setSelectedSmallTask(task);
      break;
    default:
      setCurrentPage('small-task-detail');
      setSelectedSmallTask(task);
  }
};
```

---

## 🎨 Design System Consistency

### Missing Design Tokens

Ensure all new components use the same design tokens as project screens:

- ✅ Color palette (COLORS from Figma)
- ✅ Typography (fontFamily, scaledSize)
- ✅ Spacing (consistent padding/margins)
- ✅ Border radius
- ✅ Shadow styles
- ✅ Animation timing

### Missing Shared Styles

Create shared style utilities:
- `src/styles/smallTaskStyles.ts` - Shared styles for small task screens
- `src/styles/bidCardStyles.ts` - Shared bid card styles
- `src/styles/statusBadgeStyles.ts` - Status badge styles

---

## 🔄 State Management

### Missing State Management

**Current:** Each screen manages its own state

**Needed:** Consider using context or state management for:
- Small task list state
- Bid state
- Status updates
- Real-time updates (if WebSocket support)

---

## 📱 Responsive Design

### Missing Responsive Features

- ✅ Tablet/Desktop layouts (similar to project screens)
- ✅ Large screen optimizations
- ✅ RTL support (already exists, ensure new components support it)
- ✅ Dark mode support (already exists, ensure new components support it)

---

## 🧪 Testing & Error Handling

### Missing Error States

- ✅ Network error retry buttons
- ✅ Loading skeletons (instead of spinners)
- ✅ Error boundaries
- ✅ Empty states for all scenarios
- ✅ Validation error messages

---

## 📋 Summary Table

| Component/Screen | Status | Priority | Estimated Effort |
|-----------------|--------|----------|------------------|
| **PendingSmallTaskScreen.tsx** | ❌ Missing | 🔴 Critical | 2-3 days |
| **AssignedSmallTaskScreen.tsx** | ❌ Missing | 🔴 Critical | 1-2 days |
| **InProgressSmallTaskScreen.tsx** | ❌ Missing | 🔴 Critical | 2-3 days |
| **CompletedSmallTaskScreen.tsx** | ❌ Missing | 🔴 Critical | 1-2 days |
| **SmallTaskBidCard.tsx** | ⚠️ Partial | 🔴 Critical | 1 day |
| **SmallTaskBidComparisonView.tsx** | ❌ Missing | 🟡 Important | 1 day |
| **SmallTaskStatusTimeline.tsx** | ❌ Missing | 🟡 Important | 0.5 day |
| **SmallTaskCancelModal.tsx** | ❌ Missing | 🟡 Important | 0.5 day |
| **SmallTaskEditModal.tsx** | ❌ Missing | 🟡 Important | 1 day |
| **Empty States** | ❌ Missing | 🟡 Important | 0.5 day |
| **SmallTaskProgressBar.tsx** | ❌ Missing | 🟢 Nice to Have | 0.5 day |
| **SmallTaskReviewForm.tsx** | ❌ Missing | 🟢 Nice to Have | 1 day |
| **TaskLocationMap.tsx** | ❌ Missing | 🟢 Nice to Have | 1 day |
| **WorkUpdateCard.tsx** | ❌ Missing | 🟢 Nice to Have | 0.5 day |
| **Navigation Updates** | ⚠️ Partial | 🔴 Critical | 0.5 day |
| **Design System** | ⚠️ Partial | 🟡 Important | 1 day |

**Total Estimated Effort:** ~15-20 days

---

## 🎯 Implementation Priority

### Phase 1: Critical Screens (Week 1-2)
1. ✅ PendingSmallTaskScreen.tsx
2. ✅ AssignedSmallTaskScreen.tsx
3. ✅ InProgressSmallTaskScreen.tsx
4. ✅ CompletedSmallTaskScreen.tsx
5. ✅ Enhanced SmallTaskBidCard.tsx
6. ✅ Navigation updates

### Phase 2: Important Components (Week 3)
7. ✅ SmallTaskBidComparisonView.tsx
8. ✅ SmallTaskStatusTimeline.tsx
9. ✅ SmallTaskCancelModal.tsx
10. ✅ SmallTaskEditModal.tsx
11. ✅ Empty states

### Phase 3: Nice to Have (Week 4)
12. ✅ SmallTaskProgressBar.tsx
13. ✅ SmallTaskReviewForm.tsx
14. ✅ TaskLocationMap.tsx
15. ✅ WorkUpdateCard.tsx
16. ✅ Design system polish

---

## 📝 Notes

- All new screens should follow the same pattern as project status screens
- Reuse existing components where possible (AlertPopup, ConfirmationPopup, etc.)
- Ensure RTL and dark mode support
- Add proper loading and error states
- Include accessibility features
- Test on multiple screen sizes

---

**Document Created:** February 11, 2026  
**Status:** Ready for Implementation  
**Next Steps:** Start with Phase 1 (Critical Screens)
