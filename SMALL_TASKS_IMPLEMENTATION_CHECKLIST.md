# Small Tasks & Services Implementation Checklist

## Quick Reference: What's Missing

### 🔴 CRITICAL - Technician Cannot Use Small Tasks System

#### Technician Side - Small Tasks Bidding
- [ ] **AvailableSmallTasksScreen.tsx** - Browse available small tasks
  - API: `GET /api/small-tasks/requests/available`
  - Show: task type, budget, location, description, bid count
  - Filter by: status, location, task type
  - Action: Tap to view details and bid

- [ ] **SmallTaskBidFormModal.tsx** - Submit bid on small task
  - API: `POST /api/small-tasks/requests/:id/bids`
  - Fields: amount (SAR), description, estimatedHours
  - Validation: amount > 0, description required, hours > 0
  - Success: Navigate to My Bids

- [ ] **MySmallTaskBidsScreen.tsx** - View all my bids
  - API: `GET /api/small-tasks/bids/my-bids`
  - Show: bid amount, status, task details, submission date
  - Filter by: PENDING, ACCEPTED, REJECTED
  - Actions: Withdraw (if PENDING), View task details

- [ ] **Withdraw Bid Functionality**
  - API: `PATCH /api/small-tasks/bids/:id/withdraw`
  - Confirmation dialog before withdrawal
  - Only for PENDING bids

- [ ] **Update Task Status** (for assigned tasks)
  - API: `PATCH /api/small-tasks/requests/:id/status`
  - Status options: IN_PROGRESS, COMPLETED
  - Show in task detail screen

- [ ] **Navigation Integration**
  - Add "Small Tasks" section in TechnicianHomeScreen
  - Tab/button for "Available Tasks"
  - Tab/button for "My Bids"
  - Tab/button for "My Tasks" (assigned to me)

---

### 🟡 IMPORTANT - Service Management Enhancements

#### Technician Side - Service Suggestions
- [ ] **ServiceSuggestionFormScreen.tsx** - Request new service
  - API: `POST /api/suggestions/services`
  - Fields: nameAr, nameEn, description, category, reason
  - Categories: HOME_MAINTENANCE, HOME_INSTALLATION, etc.
  - Success: Show confirmation, navigate to My Suggestions

- [ ] **MyServiceSuggestionsScreen.tsx** - View my suggestions
  - API: `GET /api/suggestions/services/my-requests`
  - Show: service name, status, admin notes, submission date
  - Status badges: PENDING (yellow), APPROVED (green), REJECTED (red)
  - Stats: Total, Approved, Pending, Rejected counts

- [ ] **Integration with ServiceManagementScreen**
  - Add "Suggest New Service" button
  - Add "My Suggestions" tab/section
  - Show count of pending suggestions

#### Technician Side - Task Type Requests
- [ ] **TaskTypeRequestFormScreen.tsx** - Request new task type
  - API: `POST /api/small-tasks/request-type`
  - Fields: nameAr, nameEn, description, estimatedDuration (minutes), suggestedBasePrice, category
  - Success: Show confirmation, navigate to My Requests

- [ ] **MyTaskTypeRequestsScreen.tsx** - View my task type requests
  - API: `GET /api/small-tasks/request-type/my-requests`
  - Show: task type name, status, submission date
  - Status badges: PENDING, APPROVED, REJECTED

- [ ] **Integration with Small Tasks Section**
  - Add "Suggest Task Type" button
  - Add "My Task Type Requests" view

---

### 🟢 NICE TO HAVE - User Side Enhancements

#### User Side - Small Tasks Bid Management
- [ ] **Enhanced SmallTaskDetailScreen** (for users)
  - Show received bids list
  - Bid cards with: technician name, amount, description, date
  - Actions: Accept bid, Reject bid
  - Show accepted bid prominently

- [ ] **Accept/Reject Bid Functionality**
  - API: Need endpoint from backend team
  - Confirmation dialog before accepting
  - Show technician profile before accepting
  - Notify technician on acceptance/rejection

- [ ] **Cancel Small Task Request**
  - API: Need endpoint from backend team
  - Only if no bids accepted
  - Confirmation dialog

---

## 📊 Implementation Status by Feature

### Small Tasks (Technician)
| Feature | Status | Screen | API Endpoint | Priority |
|---------|--------|--------|--------------|----------|
| View Available Tasks | ❌ Missing | AvailableSmallTasksScreen | GET /small-tasks/requests/available | 🔴 Critical |
| Submit Bid | ❌ Missing | SmallTaskBidFormModal | POST /small-tasks/requests/:id/bids | 🔴 Critical |
| View My Bids | ❌ Missing | MySmallTaskBidsScreen | GET /small-tasks/bids/my-bids | 🔴 Critical |
| Withdraw Bid | ❌ Missing | MySmallTaskBidsScreen | PATCH /small-tasks/bids/:id/withdraw | 🔴 Critical |
| Update Task Status | ❌ Missing | SmallTaskDetailScreen | PATCH /small-tasks/requests/:id/status | 🔴 Critical |
| Navigation | ❌ Missing | TechnicianHomeScreen | N/A | 🔴 Critical |

### Service Suggestions (Technician)
| Feature | Status | Screen | API Endpoint | Priority |
|---------|--------|--------|--------------|----------|
| Suggest New Service | ❌ Missing | ServiceSuggestionFormScreen | POST /suggestions/services | 🟡 Important |
| View My Suggestions | ❌ Missing | MyServiceSuggestionsScreen | GET /suggestions/services/my-requests | 🟡 Important |
| Integration | ❌ Missing | ServiceManagementScreen | N/A | 🟡 Important |

### Task Type Requests (Technician)
| Feature | Status | Screen | API Endpoint | Priority |
|---------|--------|--------|--------------|----------|
| Request New Task Type | ❌ Missing | TaskTypeRequestFormScreen | POST /small-tasks/request-type | 🟢 Nice to Have |
| View My Requests | ❌ Missing | MyTaskTypeRequestsScreen | GET /small-tasks/request-type/my-requests | 🟢 Nice to Have |

### Small Tasks (User)
| Feature | Status | Screen | API Endpoint | Priority |
|---------|--------|--------|--------------|----------|
| Create Small Task | ✅ Implemented | SmallTaskRequestForm | POST /small-tasks/requests | ✅ Done |
| View My Tasks | ✅ Implemented | SmallTasksListScreen | GET /small-tasks/requests/my-requests | ✅ Done |
| View Task Details | ✅ Implemented | SmallTaskDetailScreen | N/A | ✅ Done |
| View Received Bids | ❌ Missing | SmallTaskDetailScreen | GET /small-tasks/requests/:id/bids | 🟡 Important |
| Accept Bid | ❌ Missing | SmallTaskDetailScreen | POST /small-tasks/requests/:id/accept-bid | 🟡 Important |
| Reject Bid | ❌ Missing | SmallTaskDetailScreen | POST /small-tasks/requests/:id/reject-bid | 🟡 Important |
| Cancel Task | ❌ Missing | SmallTaskDetailScreen | DELETE /small-tasks/requests/:id | 🟢 Nice to Have |

### Technician Services
| Feature | Status | Screen | API Endpoint | Priority |
|---------|--------|--------|--------------|----------|
| View My Services | ✅ Implemented | ServiceManagementScreen | GET /technician/services/my-services | ✅ Done |
| Add Services (Bulk) | ✅ Implemented | ServiceManagementScreen | POST /technician/services/add | ✅ Done |
| Remove Service | ✅ Implemented | ServiceManagementScreen | DELETE /technician/services/remove/:id | ✅ Done |
| Add Single Service | ❌ Missing | ServiceManagementScreen | POST /technician/services/add/:serviceId | 🟢 Nice to Have |
| Find Technicians by Service | ❌ Missing | N/A | GET /technician/services/offering/:id | 🟢 Nice to Have |

---

## 🎯 Sprint Planning

### Sprint 1: Technician Small Tasks Core (2 weeks)
**Goal:** Enable technicians to browse and bid on small tasks

**Week 1:**
- [ ] Day 1-2: Create `AvailableSmallTasksScreen.tsx`
  - List view with cards
  - Filters (status, location)
  - Pull to refresh
  - Tap to view details

- [ ] Day 3-4: Create `SmallTaskBidFormModal.tsx`
  - Form with validation
  - Amount, description, hours fields
  - Submit bid API integration
  - Success/error handling

- [ ] Day 5: Enhance `SmallTaskDetailScreen.tsx`
  - Add "Submit Bid" button for technicians
  - Show existing bids count
  - Show task status

**Week 2:**
- [ ] Day 1-2: Create `MySmallTaskBidsScreen.tsx`
  - List of all bids
  - Filter by status
  - Show bid details
  - Tap to view task

- [ ] Day 3: Add withdraw bid functionality
  - Confirmation dialog
  - API integration
  - Update UI after withdrawal

- [ ] Day 4: Add update task status functionality
  - Status picker (IN_PROGRESS, COMPLETED)
  - Only for assigned tasks
  - API integration

- [ ] Day 5: Navigation integration
  - Add Small Tasks section to TechnicianHomeScreen
  - Add tabs/buttons
  - Test navigation flow

**Testing & QA:**
- [ ] Test all screens on iOS and Android
- [ ] Test RTL layout (Arabic)
- [ ] Test error scenarios
- [ ] Test with real API

---

### Sprint 2: Service & Task Type Suggestions (1 week)
**Goal:** Allow technicians to suggest new services and task types

**Week 1:**
- [ ] Day 1-2: Create `ServiceSuggestionFormScreen.tsx`
  - Form with all fields
  - Category picker
  - Submit API integration
  - Success handling

- [ ] Day 2-3: Create `MyServiceSuggestionsScreen.tsx`
  - List view with status badges
  - Show admin notes
  - Stats summary

- [ ] Day 3-4: Create `TaskTypeRequestFormScreen.tsx`
  - Form with all fields
  - Duration and price inputs
  - Submit API integration

- [ ] Day 4-5: Create `MyTaskTypeRequestsScreen.tsx`
  - List view with status
  - Filter options

- [ ] Day 5: Integration
  - Add to ServiceManagementScreen
  - Add to Small Tasks section
  - Navigation setup

**Testing & QA:**
- [ ] Test form validations
- [ ] Test API integrations
- [ ] Test navigation
- [ ] Test on both platforms

---

### Sprint 3: User Small Tasks Enhancement (1 week)
**Goal:** Enable users to manage bids on their small tasks

**Week 1:**
- [ ] Day 1-2: Enhance `SmallTaskDetailScreen.tsx` for users
  - Fetch and display received bids
  - Bid cards with technician info
  - Accept/Reject buttons

- [ ] Day 3: Implement accept bid functionality
  - Confirmation dialog
  - API integration (need endpoint)
  - Success handling

- [ ] Day 4: Implement reject bid functionality
  - Confirmation dialog
  - API integration (need endpoint)
  - Success handling

- [ ] Day 5: Add cancel task functionality
  - Validation (no accepted bids)
  - Confirmation dialog
  - API integration (need endpoint)

**Testing & QA:**
- [ ] Test bid management flow
- [ ] Test with multiple bids
- [ ] Test edge cases
- [ ] Full regression testing

---

## 🔧 Technical Implementation Details

### File Structure
```
src/
├── screens/
│   ├── AvailableSmallTasksScreen.tsx          (NEW)
│   ├── SmallTaskBidFormModal.tsx              (NEW)
│   ├── MySmallTaskBidsScreen.tsx              (NEW)
│   ├── ServiceSuggestionFormScreen.tsx        (NEW)
│   ├── MyServiceSuggestionsScreen.tsx         (NEW)
│   ├── TaskTypeRequestFormScreen.tsx          (NEW)
│   ├── MyTaskTypeRequestsScreen.tsx           (NEW)
│   ├── SmallTaskDetailScreen.tsx              (ENHANCE)
│   ├── TechnicianHomeScreen.tsx               (ENHANCE)
│   └── UserHomeScreen.tsx                     (ENHANCE)
├── components/
│   ├── SmallTaskCard.tsx                      (NEW)
│   ├── SmallTaskBidCard.tsx                   (NEW)
│   └── ServiceSuggestionCard.tsx              (NEW)
└── config/
    └── api.ts                                 (ALREADY DONE ✅)
```

### API Integration Examples

#### 1. Get Available Small Tasks
```typescript
const fetchAvailableTasks = async () => {
  const token = await storage.getAuthToken();
  const url = buildApiUrl(API_ENDPOINTS.SMALL_TASKS.REQUESTS_AVAILABLE);
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  const data = await response.json();
  return data.requests; // Array of small task requests
};
```

#### 2. Submit Bid
```typescript
const submitBid = async (taskId: number, amount: number, description: string, hours: number) => {
  const token = await storage.getAuthToken();
  const url = buildApiUrlWithParams(API_ENDPOINTS.SMALL_TASKS.REQUEST_BID, { id: taskId });
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      description,
      estimatedHours: hours,
    }),
  });
  
  return await response.json();
};
```

#### 3. Get My Bids
```typescript
const fetchMyBids = async () => {
  const token = await storage.getAuthToken();
  const url = buildApiUrl(API_ENDPOINTS.SMALL_TASKS.MY_BIDS);
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  const data = await response.json();
  return data.bids;
};
```

#### 4. Withdraw Bid
```typescript
const withdrawBid = async (bidId: number) => {
  const token = await storage.getAuthToken();
  const url = buildApiUrlWithParams(API_ENDPOINTS.SMALL_TASKS.WITHDRAW_BID, { id: bidId });
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  return await response.json();
};
```

#### 5. Update Task Status
```typescript
const updateTaskStatus = async (taskId: number, status: 'IN_PROGRESS' | 'COMPLETED') => {
  const token = await storage.getAuthToken();
  const url = buildApiUrlWithParams(API_ENDPOINTS.SMALL_TASKS.UPDATE_STATUS, { id: taskId });
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  
  return await response.json();
};
```

#### 6. Suggest New Service
```typescript
const suggestService = async (data: {
  nameAr: string;
  nameEn: string;
  description: string;
  category: string;
  reason: string;
}) => {
  const token = await storage.getAuthToken();
  const url = buildApiUrl(API_ENDPOINTS.SERVICE_SUGGESTIONS.CREATE);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  return await response.json();
};
```

---

## 🎨 UI Components to Reuse

### Existing Components
- `ProjectCards.tsx` → Adapt for `SmallTaskCard.tsx`
- `BidFormModal.tsx` → Adapt for `SmallTaskBidFormModal.tsx`
- `ServiceManagementScreen.tsx` → Enhance with suggestions
- `AlertPopup.tsx` → Use for confirmations
- `SmallTaskPhaseBar.tsx` → Already exists ✅

### Design System
- Use existing theme colors from `ThemeContext`
- Use existing fonts from `FontContext`
- Follow RTL patterns from existing screens
- Use existing card styles and shadows
- Use existing button styles

---

## 📱 Screenshots Needed (for reference)

### Technician Screens
1. Available Small Tasks List
2. Small Task Detail (with bid button)
3. Bid Form Modal
4. My Bids List
5. Bid Detail (with withdraw option)
6. Task Status Update

### Service Management
7. Service Suggestion Form
8. My Service Suggestions List
9. Task Type Request Form
10. My Task Type Requests List

### User Screens
11. Small Task Detail with Bids
12. Accept Bid Confirmation
13. Reject Bid Confirmation

---

## ✅ Definition of Done

### For Each Screen:
- [ ] UI matches design mockups
- [ ] All API integrations working
- [ ] Error handling implemented
- [ ] Loading states implemented
- [ ] Success/failure messages shown
- [ ] RTL layout working correctly
- [ ] Dark mode working correctly
- [ ] Tested on iOS
- [ ] Tested on Android
- [ ] Tested on Web (if applicable)
- [ ] No console errors
- [ ] No linter errors
- [ ] Code reviewed
- [ ] QA approved

---

## 🚨 Blockers & Dependencies

### Questions for Backend Team:
1. ❓ API endpoints for accepting/rejecting small task bids (user side)
2. ❓ API endpoint for canceling small task requests
3. ❓ Notification system for bid acceptance/rejection
4. ❓ Can users see technician profiles before accepting bids?
5. ❓ What happens to other bids when one is accepted?
6. ❓ Are there any limits on number of bids per technician?
7. ❓ How are service suggestion approvals communicated?

### External Dependencies:
- Backend API must be deployed and accessible
- Test data must be available in staging environment
- Push notification system must be configured
- Payment integration (if needed for small tasks)

---

**Last Updated:** February 11, 2026
**Status:** Ready for Implementation
**Estimated Total Time:** 4 weeks (3 sprints)
