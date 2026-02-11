# Small Tasks & Services Architecture

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         BONYAD PLATFORM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐              ┌──────────────────┐        │
│  │   USER SIDE      │              │  TECHNICIAN SIDE │        │
│  │                  │              │                  │        │
│  │  ✅ Create Task  │◄────────────►│  ❌ View Tasks   │        │
│  │  ✅ View Tasks   │              │  ❌ Submit Bids  │        │
│  │  ❌ View Bids    │              │  ❌ View My Bids │        │
│  │  ❌ Accept Bid   │              │  ❌ Withdraw Bid │        │
│  │  ❌ Reject Bid   │              │  ❌ Update Status│        │
│  └──────────────────┘              └──────────────────┘        │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              BACKEND API (COMPLETE ✅)                │      │
│  │                                                        │      │
│  │  • Small Tasks APIs                                   │      │
│  │  • Service Suggestions APIs                           │      │
│  │  • Task Type Request APIs                             │      │
│  │  • Technician Services APIs                           │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Legend:
✅ = Implemented
❌ = Missing
```

---

## 📱 User Flow Diagrams

### Current Implementation (User Side)

```
USER JOURNEY - SMALL TASKS (CURRENT)
═══════════════════════════════════════

1. User Opens App
   │
   ├─► Home Screen
   │   │
   │   └─► "New Project" Button
   │       │
   │       └─► Project Type Selection
   │           │
   │           ├─► Regular Project ✅
   │           │
   │           └─► Small Task ✅
   │               │
   │               └─► Small Task Type Selection ✅
   │                   │
   │                   └─► Small Task Request Form ✅
   │                       │
   │                       └─► Submit Request ✅
   │
   └─► My Projects
       │
       └─► Small Tasks List ✅
           │
           └─► Task Detail ✅
               │
               ├─► View Description ✅
               ├─► View Budget ✅
               ├─► View Location ✅
               │
               └─► View Bids ❌ MISSING!
                   │
                   ├─► Accept Bid ❌ MISSING!
                   └─► Reject Bid ❌ MISSING!
```

### Missing Implementation (Technician Side)

```
TECHNICIAN JOURNEY - SMALL TASKS (MISSING)
═══════════════════════════════════════════

1. Technician Opens App
   │
   ├─► Home Screen
   │   │
   │   └─► "Small Tasks" Section ❌ MISSING!
   │       │
   │       ├─► Available Tasks ❌ MISSING!
   │       │   │
   │       │   └─► Browse Tasks
   │       │       │
   │       │       └─► Task Detail
   │       │           │
   │       │           └─► Submit Bid ❌ MISSING!
   │       │
   │       ├─► My Bids ❌ MISSING!
   │       │   │
   │       │   └─► View All Bids
   │       │       │
   │       │       ├─► Withdraw Bid ❌ MISSING!
   │       │       └─► View Task Detail
   │       │
   │       └─► My Tasks (Assigned)
   │           │
   │           └─► Update Status ❌ MISSING!
   │               │
   │               ├─► Mark In Progress
   │               └─► Mark Completed
   │
   └─► Services Management ✅
       │
       ├─► My Services ✅
       ├─► Add Services ✅
       ├─► Remove Services ✅
       │
       └─► Suggest New Service ❌ MISSING!
           │
           └─► View My Suggestions ❌ MISSING!
```

---

## 🔄 Complete Small Task Lifecycle

```
SMALL TASK LIFECYCLE
════════════════════

┌─────────────┐
│    USER     │
│  Creates    │
│  Request    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  PENDING - Waiting for Bids             │
│  • Visible to all technicians           │
│  • Technicians can submit bids          │
└──────┬──────────────────────────────────┘
       │
       │  Multiple technicians submit bids
       │  ❌ MISSING: Bid submission UI
       │
       ▼
┌─────────────────────────────────────────┐
│  PENDING - Bids Received                │
│  • User can view bids                   │
│  • User can accept/reject bids          │
│  ❌ MISSING: Bid management UI          │
└──────┬──────────────────────────────────┘
       │
       │  User accepts a bid
       │  ❌ MISSING: Accept bid functionality
       │
       ▼
┌─────────────────────────────────────────┐
│  ASSIGNED - Technician Assigned         │
│  • Task assigned to winning technician  │
│  • Other bids automatically rejected    │
│  • Technician notified                  │
└──────┬──────────────────────────────────┘
       │
       │  Technician starts work
       │  ❌ MISSING: Update status UI
       │
       ▼
┌─────────────────────────────────────────┐
│  IN_PROGRESS - Work Started             │
│  • Technician working on task           │
│  • User can track progress              │
│  ❌ MISSING: Status update functionality│
└──────┬──────────────────────────────────┘
       │
       │  Technician completes work
       │  ❌ MISSING: Complete task UI
       │
       ▼
┌─────────────────────────────────────────┐
│  COMPLETED - Task Finished              │
│  • User can review technician           │
│  • Payment processed                    │
│  • Task archived                        │
└─────────────────────────────────────────┘
```

---

## 🗂️ Data Flow Architecture

### Small Task Bidding Flow

```
┌──────────────┐
│ TECHNICIAN   │
│   DEVICE     │
└──────┬───────┘
       │
       │ 1. GET /api/small-tasks/requests/available
       │    ❌ MISSING UI
       │
       ▼
┌──────────────────────────────────────┐
│  BACKEND API                         │
│  Returns: Available small tasks      │
│  • Task type, budget, location       │
│  • Description, bid count            │
│  • Status, created date              │
└──────┬───────────────────────────────┘
       │
       │ 2. Display tasks in list
       │    ❌ MISSING: AvailableSmallTasksScreen
       │
       ▼
┌──────────────┐
│ TECHNICIAN   │
│ Selects Task │
└──────┬───────┘
       │
       │ 3. POST /api/small-tasks/requests/:id/bids
       │    Body: { amount, description, estimatedHours }
       │    ❌ MISSING: SmallTaskBidFormModal
       │
       ▼
┌──────────────────────────────────────┐
│  BACKEND API                         │
│  Creates bid record                  │
│  • Associates with technician        │
│  • Validates bid amount              │
│  • Notifies user                     │
└──────┬───────────────────────────────┘
       │
       │ 4. Success response
       │
       ▼
┌──────────────┐
│ TECHNICIAN   │
│ Views Bid    │
│ in My Bids   │
│ ❌ MISSING   │
└──────────────┘
```

### Service Suggestion Flow

```
┌──────────────┐
│ TECHNICIAN   │
│   DEVICE     │
└──────┬───────┘
       │
       │ 1. POST /api/suggestions/services
       │    Body: { nameAr, nameEn, description, category, reason }
       │    ❌ MISSING: ServiceSuggestionFormScreen
       │
       ▼
┌──────────────────────────────────────┐
│  BACKEND API                         │
│  Creates suggestion record           │
│  • Status: PENDING                   │
│  • Awaits admin review               │
└──────┬───────────────────────────────┘
       │
       │ 2. Admin reviews (backend/admin panel)
       │    • Approves or rejects
       │    • Adds admin notes
       │
       ▼
┌──────────────────────────────────────┐
│  BACKEND API                         │
│  Updates suggestion status           │
│  • Status: APPROVED or REJECTED      │
│  • Admin notes added                 │
└──────┬───────────────────────────────┘
       │
       │ 3. GET /api/suggestions/services/my-requests
       │    ❌ MISSING: MyServiceSuggestionsScreen
       │
       ▼
┌──────────────┐
│ TECHNICIAN   │
│ Views Status │
│ & Notes      │
│ ❌ MISSING   │
└──────────────┘
```

---

## 🎨 Screen Architecture

### Technician Home Screen Enhancement

```
┌────────────────────────────────────────────────────────┐
│  TECHNICIAN HOME SCREEN (ENHANCED)                     │
├────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   PROJECTS  │  │ SMALL TASKS │  │    CHAT     │   │
│  │      ✅     │  │     ❌      │  │     ✅      │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                         │
│  ┌───────────────────────────────────────────────┐    │
│  │  SMALL TASKS SECTION (NEW)                    │    │
│  │                                                │    │
│  │  ┌──────────────────┐  ┌──────────────────┐  │    │
│  │  │ Available Tasks  │  │    My Bids       │  │    │
│  │  │                  │  │                  │  │    │
│  │  │  • Browse        │  │  • View all      │  │    │
│  │  │  • Filter        │  │  • Withdraw      │  │    │
│  │  │  • Submit bid    │  │  • Track status  │  │    │
│  │  │                  │  │                  │  │    │
│  │  │  ❌ MISSING      │  │  ❌ MISSING      │  │    │
│  │  └──────────────────┘  └──────────────────┘  │    │
│  │                                                │    │
│  │  ┌──────────────────┐                         │    │
│  │  │  My Tasks        │                         │    │
│  │  │  (Assigned)      │                         │    │
│  │  │                  │                         │    │
│  │  │  • In Progress   │                         │    │
│  │  │  • Update status │                         │    │
│  │  │  • Complete      │                         │    │
│  │  │                  │                         │    │
│  │  │  ❌ MISSING      │                         │    │
│  │  └──────────────────┘                         │    │
│  └───────────────────────────────────────────────┘    │
│                                                         │
│  ┌───────────────────────────────────────────────┐    │
│  │  SERVICES MANAGEMENT (ENHANCE)                │    │
│  │                                                │    │
│  │  ┌──────────────────┐  ┌──────────────────┐  │    │
│  │  │  My Services ✅  │  │  Suggest New ❌  │  │    │
│  │  └──────────────────┘  └──────────────────┘  │    │
│  └───────────────────────────────────────────────┘    │
│                                                         │
└────────────────────────────────────────────────────────┘
```

### Available Small Tasks Screen (NEW)

```
┌────────────────────────────────────────────────────────┐
│  ← Available Small Tasks                               │
├────────────────────────────────────────────────────────┤
│                                                         │
│  🔍 Search...                    [Filter ▼]            │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  🔧 Faucet Repair                               │  │
│  │  Kitchen faucet leaking                         │  │
│  │                                                 │  │
│  │  📍 Riyadh, Al Yasmin                          │  │
│  │  💰 150 SAR (Budget)                           │  │
│  │  📊 3 bids received                            │  │
│  │  🕐 Posted 2 hours ago                         │  │
│  │                                                 │  │
│  │  [View Details]                                │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  ⚡ Electrical Outlet Installation              │  │
│  │  Need 3 outlets installed in bedroom           │  │
│  │                                                 │  │
│  │  📍 Jeddah, Al Hamra                           │  │
│  │  💰 200 SAR (Budget)                           │  │
│  │  📊 1 bid received                             │  │
│  │  🕐 Posted 5 hours ago                         │  │
│  │                                                 │  │
│  │  [View Details]                                │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  🪟 Window Screen Repair                        │  │
│  │  Torn screen needs replacement                  │  │
│  │                                                 │  │
│  │  📍 Dammam, Al Faisaliyah                      │  │
│  │  💰 100 SAR (Budget)                           │  │
│  │  📊 0 bids                                     │  │
│  │  🕐 Posted 1 day ago                           │  │
│  │                                                 │  │
│  │  [View Details]                                │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
└────────────────────────────────────────────────────────┘
```

### Small Task Bid Form (NEW)

```
┌────────────────────────────────────────────────────────┐
│  Submit Bid                                      [✕]   │
├────────────────────────────────────────────────────────┤
│                                                         │
│  Task: Faucet Repair                                   │
│  Budget: 150 SAR                                       │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Your Bid Amount (SAR) *                        │  │
│  │  ┌───────────────────────────────────────────┐  │  │
│  │  │  150                                      │  │  │
│  │  └───────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Estimated Hours *                              │  │
│  │  ┌───────────────────────────────────────────┐  │  │
│  │  │  1                                        │  │  │
│  │  └───────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Description *                                  │  │
│  │  ┌───────────────────────────────────────────┐  │  │
│  │  │  I can fix this quickly with quality     │  │  │
│  │  │  parts. I have 5 years experience in     │  │  │
│  │  │  plumbing repairs.                        │  │  │
│  │  │                                           │  │  │
│  │  └───────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  [Cancel]              [Submit Bid]             │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
└────────────────────────────────────────────────────────┘
```

### My Bids Screen (NEW)

```
┌────────────────────────────────────────────────────────┐
│  ← My Small Task Bids                                  │
├────────────────────────────────────────────────────────┤
│                                                         │
│  [All] [Pending] [Accepted] [Rejected]                │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  🔧 Faucet Repair                               │  │
│  │  Your Bid: 150 SAR                              │  │
│  │  Status: 🟡 PENDING                             │  │
│  │                                                 │  │
│  │  "I can fix this quickly..."                   │  │
│  │                                                 │  │
│  │  Submitted: 2 hours ago                        │  │
│  │                                                 │  │
│  │  [View Task]  [Withdraw Bid]                   │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  ⚡ Outlet Installation                         │  │
│  │  Your Bid: 180 SAR                              │  │
│  │  Status: 🟢 ACCEPTED                            │  │
│  │                                                 │  │
│  │  "Professional installation..."                │  │
│  │                                                 │  │
│  │  Accepted: 1 day ago                           │  │
│  │                                                 │  │
│  │  [View Task]  [Start Work]                     │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  🪟 Window Screen Repair                        │  │
│  │  Your Bid: 90 SAR                               │  │
│  │  Status: 🔴 REJECTED                            │  │
│  │                                                 │  │
│  │  "Quality work guaranteed..."                  │  │
│  │                                                 │  │
│  │  Rejected: 3 days ago                          │  │
│  │                                                 │  │
│  │  [View Task]                                   │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
└────────────────────────────────────────────────────────┘
```

---

## 🔌 API Integration Map

### Endpoints Status

| Endpoint | Method | Purpose | UI Screen | Status |
|----------|--------|---------|-----------|--------|
| `/small-tasks/types` | GET | List task types | SmallTaskTypeSelection | ✅ Used |
| `/small-tasks/requests` | POST | Create request | SmallTaskRequestForm | ✅ Used |
| `/small-tasks/requests/my-requests` | GET | User's tasks | SmallTasksList | ✅ Used |
| `/small-tasks/requests/available` | GET | Available tasks | AvailableSmallTasks | ❌ **NOT USED** |
| `/small-tasks/requests/:id/bids` | GET | Get bids | SmallTaskDetail | ❌ **NOT USED** |
| `/small-tasks/requests/:id/bids` | POST | Submit bid | SmallTaskBidForm | ❌ **NOT USED** |
| `/small-tasks/bids/my-bids` | GET | Technician bids | MySmallTaskBids | ❌ **NOT USED** |
| `/small-tasks/bids/:id/withdraw` | PATCH | Withdraw bid | MySmallTaskBids | ❌ **NOT USED** |
| `/small-tasks/requests/:id/status` | PATCH | Update status | SmallTaskDetail | ❌ **NOT USED** |
| `/technician/services/my-services` | GET | Get services | ServiceManagement | ✅ Used |
| `/technician/services/add` | POST | Add services | ServiceManagement | ✅ Used |
| `/technician/services/remove/:id` | DELETE | Remove service | ServiceManagement | ✅ Used |
| `/technician/services/add/:id` | POST | Add single | ServiceManagement | ❌ **NOT USED** |
| `/suggestions/services` | POST | Suggest service | ServiceSuggestionForm | ❌ **NOT USED** |
| `/suggestions/services/my-requests` | GET | My suggestions | MyServiceSuggestions | ❌ **NOT USED** |
| `/small-tasks/request-type` | POST | Request task type | TaskTypeRequestForm | ❌ **NOT USED** |
| `/small-tasks/request-type/my-requests` | GET | My requests | MyTaskTypeRequests | ❌ **NOT USED** |

**Summary:** 6 out of 18 endpoints are currently being used (33%)

---

## 🎯 Implementation Roadmap

### Phase 1: Core Bidding System (Week 1-2)
```
Priority: 🔴 CRITICAL
Effort: 10 days
Screens: 3 new

Day 1-3:  AvailableSmallTasksScreen.tsx
Day 4-6:  SmallTaskBidFormModal.tsx
Day 7-8:  MySmallTaskBidsScreen.tsx
Day 9-10: Integration & Testing
```

### Phase 2: Service Management (Week 3)
```
Priority: 🟡 IMPORTANT
Effort: 5 days
Screens: 2 new

Day 1-2: ServiceSuggestionFormScreen.tsx
Day 3-4: MyServiceSuggestionsScreen.tsx
Day 5:   Integration & Testing
```

### Phase 3: User Enhancements (Week 4)
```
Priority: 🟡 IMPORTANT
Effort: 5 days
Screens: 1 enhanced

Day 1-2: Enhance SmallTaskDetailScreen (bids list)
Day 3:   Accept/Reject bid functionality
Day 4:   Cancel task functionality
Day 5:   Integration & Testing
```

### Phase 4: Task Type Requests (Optional)
```
Priority: 🟢 NICE TO HAVE
Effort: 3 days
Screens: 2 new

Day 1:   TaskTypeRequestFormScreen.tsx
Day 2:   MyTaskTypeRequestsScreen.tsx
Day 3:   Integration & Testing
```

---

## 📊 Success Metrics

### Technical Metrics:
- [ ] All 18 API endpoints integrated and tested
- [ ] 100% screen coverage for small tasks features
- [ ] < 2 second load time for task lists
- [ ] < 1 second bid submission time
- [ ] Zero critical bugs in production

### Business Metrics:
- [ ] Technicians can browse available tasks
- [ ] Technicians can submit bids successfully
- [ ] Users can view and manage bids
- [ ] Average time to first bid < 1 hour
- [ ] Bid acceptance rate > 50%

### User Experience Metrics:
- [ ] Task creation success rate > 95%
- [ ] Bid submission success rate > 95%
- [ ] User satisfaction score > 4/5
- [ ] Feature adoption rate > 60% within 1 month

---

**Last Updated:** February 11, 2026
**Version:** 1.0
**Status:** Architecture Defined - Ready for Implementation
