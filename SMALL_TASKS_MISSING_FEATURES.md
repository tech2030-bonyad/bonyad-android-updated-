# Missing Features Analysis: Small Tasks & Services APIs

## Overview
This document outlines the missing features in the Android app based on the backend API documentation for Small Tasks, Technician Services, Service Suggestions, and Task Type Requests.

---

## ✅ IMPLEMENTED FEATURES

### User Side (Implemented)
- ✅ Small task type selection (`SmallTaskTypeSelectionScreen.tsx`)
- ✅ Create small task request (`SmallTaskRequestForm.tsx`)
- ✅ View my small task requests (`API_ENDPOINTS.SMALL_TASKS.MY_REQUESTS`)
- ✅ View small task details (`SmallTaskDetailScreen.tsx`)

### Technician Side (Partially Implemented)
- ✅ API endpoints defined in `src/config/api.ts`
- ✅ Service management screen exists (`ServiceManagementScreen.tsx`)
- ✅ Add/remove services functionality

---

## ❌ MISSING FEATURES

### 1. TECHNICIAN: Small Tasks Bidding System (HIGH PRIORITY)

#### Missing Screens:
- ❌ **Available Small Tasks List Screen** (for technicians)
  - Should show all available small task requests
  - API: `GET /api/small-tasks/requests/available`
  - Similar to `ProjectsScreen` but for small tasks
  - Should be accessible from Technician Home Screen

- ❌ **Small Task Bid Form Screen**
  - Form to submit bid on a small task
  - API: `POST /api/small-tasks/requests/:id/bids`
  - Fields: amount, description, estimatedHours
  - Similar to `BidFormModal.tsx` but for small tasks

- ❌ **My Small Task Bids Screen**
  - View all bids submitted by technician
  - API: `GET /api/small-tasks/bids/my-bids`
  - Show bid status (PENDING, ACCEPTED, REJECTED)
  - Allow withdrawing bids

- ❌ **Small Task Detail Screen for Technicians**
  - View full details of a small task before bidding
  - Show task type, budget, location, description
  - Button to submit bid

#### Missing Functionality:
- ❌ Withdraw bid functionality
  - API: `PATCH /api/small-tasks/bids/:id/withdraw`
  
- ❌ Update small task status (IN_PROGRESS, COMPLETED)
  - API: `PATCH /api/small-tasks/requests/:id/status`
  - For tasks assigned to technician

#### Navigation Integration:
- ❌ Add "Small Tasks" tab/section in `TechnicianHomeScreen`
- ❌ Add navigation to available small tasks
- ❌ Add navigation to my bids

---

### 2. TECHNICIAN: Service Suggestions (MEDIUM PRIORITY)

#### Missing Screens:
- ❌ **Request New Service Screen**
  - Form to suggest a new service
  - API: `POST /api/suggestions/services`
  - Fields: nameAr, nameEn, description, category, reason

- ❌ **My Service Suggestions Screen**
  - View all service suggestions submitted
  - API: `GET /api/suggestions/services/my-requests`
  - Show status: PENDING, APPROVED, REJECTED
  - Show admin notes

#### Navigation Integration:
- ❌ Add "Suggest Service" option in Services Management screen
- ❌ Add "My Suggestions" view in Services Management screen

---

### 3. TECHNICIAN: Task Type Requests (MEDIUM PRIORITY)

#### Missing Screens:
- ❌ **Request New Task Type Screen**
  - Form to suggest a new small task type
  - API: `POST /api/small-tasks/request-type`
  - Fields: nameAr, nameEn, description, estimatedDuration, suggestedBasePrice, category

- ❌ **My Task Type Requests Screen**
  - View all task type requests submitted
  - API: `GET /api/small-tasks/request-type/my-requests`
  - Show status: PENDING, APPROVED, REJECTED

#### Navigation Integration:
- ❌ Add "Suggest Task Type" option in Small Tasks section
- ❌ Add "My Task Type Requests" view

---

### 4. USER: Small Tasks Management (MEDIUM PRIORITY)

#### Missing Screens:
- ❌ **My Small Tasks Screen with Bids**
  - Enhanced view of user's small task requests
  - Show received bids for each task
  - Accept/reject bids functionality
  - Currently exists but may need enhancement for bid management

- ❌ **Accept/Reject Bid for Small Tasks**
  - Similar to project bids but for small tasks
  - Need API endpoint documentation for this

#### Missing Functionality:
- ❌ View bids received on small tasks
- ❌ Accept a bid on small task
- ❌ Reject a bid on small task
- ❌ Cancel small task request

---

### 5. TECHNICIAN: Single Service Management (LOW PRIORITY)

#### Missing Functionality:
- ❌ Add single service by ID
  - API: `POST /api/technician/services/add/:serviceId`
  - Currently only bulk add is implemented

- ❌ Get technicians offering specific service
  - API: `GET /api/technician/services/offering/:serviceId`
  - Public endpoint to find technicians by service

---

## 📋 IMPLEMENTATION PRIORITY

### Phase 1: Critical Features (Implement First)
1. **Available Small Tasks List** (Technician)
2. **Small Task Bid Form** (Technician)
3. **My Small Task Bids** (Technician)
4. **Update Task Status** (Technician - IN_PROGRESS, COMPLETED)
5. **Withdraw Bid** (Technician)

### Phase 2: Important Features
6. **My Small Tasks with Bids** (User - enhanced)
7. **Accept/Reject Small Task Bids** (User)
8. **Service Suggestions** (Technician)
9. **My Service Suggestions** (Technician)

### Phase 3: Nice to Have
10. **Task Type Requests** (Technician)
11. **My Task Type Requests** (Technician)
12. **Single Service Add** (Technician)
13. **Find Technicians by Service** (Public)

---

## 🔧 TECHNICAL NOTES

### Existing Components to Reuse:
- `BidFormModal.tsx` - Can be adapted for small task bids
- `ProjectsScreen.tsx` - Can be used as template for small tasks list
- `ServiceManagementScreen.tsx` - Can be enhanced with suggestions
- `SmallTaskDetailScreen.tsx` - Already exists, needs enhancement

### API Endpoints Already Defined:
All endpoints are properly defined in `src/config/api.ts`:
- `API_ENDPOINTS.SMALL_TASKS.*`
- `API_ENDPOINTS.TECHNICIAN_SERVICES.*`
- `API_ENDPOINTS.SERVICE_SUGGESTIONS.*`
- `API_ENDPOINTS.TASK_TYPE_REQUESTS.*`

### Navigation Structure Needed:
```
TechnicianHomeScreen
├── Small Tasks (NEW TAB)
│   ├── Available Tasks (NEW)
│   ├── My Bids (NEW)
│   └── My Assigned Tasks (NEW)
├── Services Management (ENHANCE)
│   ├── My Services (EXISTS)
│   ├── Add Services (EXISTS)
│   ├── Suggest New Service (NEW)
│   └── My Service Suggestions (NEW)
└── Profile
    └── (existing features)

UserHomeScreen
├── New Project
│   ├── Regular Project (EXISTS)
│   └── Small Task (EXISTS)
└── My Projects
    ├── Regular Projects (EXISTS)
    └── Small Tasks (ENHANCE - add bid management)
```

---

## 📝 RECOMMENDED IMPLEMENTATION ORDER

### Week 1: Technician Small Tasks Core
1. Create `AvailableSmallTasksScreen.tsx`
2. Create `SmallTaskBidFormModal.tsx`
3. Create `MySmallTaskBidsScreen.tsx`
4. Integrate into `TechnicianHomeScreen.tsx`

### Week 2: Technician Small Tasks Management
5. Add withdraw bid functionality
6. Add update task status functionality
7. Enhance `SmallTaskDetailScreen.tsx` for technicians

### Week 3: User Small Tasks Enhancement
8. Enhance user's small tasks view with bids
9. Add accept/reject bid functionality
10. Add cancel task functionality

### Week 4: Service & Task Type Suggestions
11. Create `ServiceSuggestionScreen.tsx`
12. Create `MyServiceSuggestionsScreen.tsx`
13. Create `TaskTypeRequestScreen.tsx`
14. Create `MyTaskTypeRequestsScreen.tsx`

---

## 🎯 KEY DIFFERENCES FROM REGULAR PROJECTS

| Feature | Regular Projects | Small Tasks |
|---------|-----------------|-------------|
| Complexity | High (phases, milestones) | Low (single task) |
| Duration | Days to weeks | Hours |
| Budget | Higher | Lower |
| Bidding | Multiple bids, complex | Simple bids |
| Status | Many states | Simple states |
| Assignment | Can be direct or bid | Primarily bidding |

---

## 🔐 PERMISSIONS REQUIRED

All APIs require `TECHNICIAN` role and specific permissions:
- `SMALL_TASK_AVAILABLE_LIST` - View available tasks
- `SMALL_TASK_BID_CREATE` - Create bids
- `SMALL_TASK_BID_MY_LIST` - View my bids
- `TECHNICIAN_SERVICE_MANAGE` - Manage services
- `SERVICE_SUGGESTION_CREATE` - Suggest services
- `SERVICE_SUGGESTION_VIEW` - View my suggestions
- `TASK_TYPE_REQUEST_CREATE` - Request task types
- `TASK_TYPE_REQUEST_VIEW` - View my requests

---

## 📱 UI/UX CONSIDERATIONS

### Design Consistency:
- Follow existing design patterns from `ProjectsScreen`
- Use same card layouts and styling
- Maintain RTL support
- Use existing theme colors and components

### User Experience:
- Clear distinction between regular projects and small tasks
- Easy navigation between available tasks and my bids
- Quick bid submission process
- Real-time status updates
- Push notifications for bid acceptance/rejection

### Performance:
- Implement pagination for large lists
- Add pull-to-refresh
- Cache frequently accessed data
- Optimize API calls

---

## 🚀 NEXT STEPS

1. **Review this document** with the development team
2. **Prioritize features** based on business needs
3. **Create detailed UI mockups** for new screens
4. **Set up project tracking** (Jira/Trello tickets)
5. **Begin Phase 1 implementation**
6. **Test with real users** after each phase
7. **Iterate based on feedback**

---

## 📞 QUESTIONS FOR BACKEND TEAM

1. What are the API endpoints for accepting/rejecting small task bids (user side)?
2. Are there any rate limits on bid submissions?
3. What are the notification triggers for small tasks?
4. Can users cancel small task requests after bids are received?
5. What happens to pending bids when a task is assigned?
6. Are there any restrictions on which services can submit bids?
7. What's the approval process for service/task type suggestions?

---

**Last Updated:** February 11, 2026
**Document Version:** 1.0
