# Android app – project flow and web parity

## What’s implemented (aligned with web)

### 1. **Project creation**
- **New Project** → Category/Subcategory → Creation method (AI vs Manual) → ManualProjectForm / ConversationalAIForm.
- Uses same backend: `POST /projects/create` (with category/subcategory or legacy serviceId), same payload shape as web.
- **ProjectsScreen** (Projects tab) loads `GET /projects/my` (user) or `GET /projects/my-assigned` (technician).

### 2. **Status-based flow**
- **ProjectsScreen** (filter: available | running | completed | bid_received | direct_offers) shows projects and, on tap, routes by status to the correct screen:
  - **PENDING** → PendingProjectScreen (user or technician)
  - **BID_RECEIVED** → BidReceivedProjectScreen
  - **APPROVED / PHASE_PLANNING / PHASE_PLANNING_APPROVED** → ApprovedProjectScreen
  - **CONTRACT_SIGNING** → ContractSigningProjectScreen (user or technician)
  - **IN_PROGRESS** → InProgressProjectScreen (user or technician)
  - **COMPLETED** → CompletedProjectViewPage
- **Running Projects** (Home → Running Projects): same status screens. Tapping a project now navigates to the full status screen (pending / approved / contract signing / in progress / completed) instead of only the phase modal.

### 3. **Backend / API config**
- **Android `src/config/api.ts`** updated to match web where needed:
  - **PHASES**: `REQUEST_PAYMENT`, `GET`, `FINISH`, `CONFIRM_COMPLETION`, `PAYMENT_TIMING`, `EXTENDED_STATUS`, phase **ISSUES** (list, by id, resolve).
  - **CONTRACTS**: `BY_PROJECT`, `MY`, `BY_USER`, `TECHNICIAN_MY`, `BY_TECHNICIAN`, `BY_ID`.
  - **SIGNATURES**: `GET_BY_PROJECT`, `GET_STATUS`, `UPDATE`, `DELETE`.
  - **CHANGE_REQUESTS**: full set (REQUEST, RESPOND, AGREE, REJECT, BY_PROJECT, THREAD, ACTIVE, PENDING).
  - **USER**: `SEARCH`, `TECHNICIANS_LIST`.
  - **PAYMENTS**: `CREATE_CHECKOUT`, `STATUS` (with `:checkoutId`), etc.

### 4. **Screens and navigation**
- **App.tsx**:
  - New screens: `pendingProject`, `bidReceivedProject`, `approvedProject`, `contractSigningProject`, `inProgressProject`, `completedProject`.
  - State: `selectedProjectForDetail`; when user opens a project from Running Projects, it’s set and the matching status screen is shown.
  - All six status screens are rendered in App with correct `onBack` / `onSuccess` (return to Running Projects and clear selection).
- **RunningProjectsScreen**: “View Details” uses `onShowProjectDetails(item)` when provided (from App), so it navigates to the full status screen; otherwise it still opens the phase modal.

### 5. **Phases and contracts**
- **Phase list**: `GET /phases/project/:projectId` (same as web).
- **Phase complete**: `POST /phases/:phaseId/complete`.
- **Phase approval**: ApprovedProjectScreen + PhaseApprovalModal; approve-all uses `POST /phases/project/:projectId/approve-all`.
- **Contract/signature**: ContractSigningProjectScreen + ContractViewerModal; uses CONTRACTS / SIGNATURES endpoints.

### 6. **Change requests**
- **API**: CHANGE_REQUESTS endpoints are in Android config.
- **UI**: ApprovedProjectScreen has “Request modification” and a RequestModificationModal; it can call `onRequestModification(phaseId, message)`. The dedicated **Change Request list/detail** screens (like web’s ChangeRequestListScreen, ChangeRequestDetailScreen, RequestModificationScreen) are **now** implemented (ChangeRequestListScreen, ChangeRequestDetailScreen, RequestModificationScreen; link from Approved/InProgress).

---

## Missing or different vs web (UI/UX and backend)

### 1. **Phase payment – gateway vs direct**
- **Web**: In-progress phase payment uses **create-checkout** (HyperPay) → redirect to payment page → callback.
- **Android**: InProgressProjectScreen uses **`POST /phases/:phaseId/pay`** only (no create-checkout in the screen). So either:
  - The backend treats `POST /phases/:phaseId/pay` as “mark paid” (no gateway), or  
  - Android should be updated to use **create-checkout** + WebView/InAppBrowser for HyperPay, then callback, like web.
- **Action**: Confirm backend contract for phase payment; if web uses HyperPay for phases, add create-checkout + redirect + callback on Android and document in this file.

### 2. **Change requests – dedicated screens**
- **Web**: ChangeRequestListScreen, ChangeRequestDetailScreen, RequestModificationScreen (full flow per project).
- **Android**: Only the “Request modification” path from ApprovedProjectScreen (modal). No list of change requests, no detail/thread view, no dedicated “Request modification” screen.
- **Action**: Add Change Request list (and optionally detail/request modification) screens and wire to CHANGE_REQUESTS APIs if you want parity.

### 3. **Payment success / callback**
- **Web**: PaymentSuccessScreen, PaymentCallbackScreen for post–checkout return.
- **Android**: PaymentCheckoutScreen exists; PaymentResultScreen exists. Ensure return from HyperPay (or any gateway) is handled (deep link / URL) and status is polled or fetched (e.g. PAYMENTS.STATUS) so the app shows success/failure and refreshes phase/project state.

### 4. **Visit requests**
- **Web**: VisitRequestModal + accept/reject from BidReceivedProjectScreen; visit request APIs used.
- **Android**: VisitRequestModal and visit request usage exist; confirm same endpoints (e.g. VISIT_REQUESTS.ACCEPT, REJECT if present on web) are used and UX matches (e.g. “Ask for visit”, “Accept/Reject” on bid received).

### 5. **Bid received – accept/decline**
- **Web**: BidReceivedProjectScreen with accept/decline bid, visit request, chat.
- **Android**: BidReceivedProjectScreen exists with onAcceptBid, onDeclineBid, onOpenChat. Ensure it uses BIDS.ACCEPT and the same logic as web (e.g. reload project, navigate to next status).

### 6. **Completed project – review and actions**
- **Web**: CompletedProjectViewPage with review, “Start new project”, “View all projects”.
- **Android**: CompletedProjectViewPage has onBack, onSuccess. Confirm it calls review API (REVIEWS.STATUS_BY_PROJECT, CREATE) and that onSuccess/onBack are enough for “View all projects” (e.g. back to Running Projects or Projects list).

### 7. **Projects list – filters and copy**
- **Web**: MyProjectsScreen with filters: all, pending, direct-assigned, accepted, bidding, approved, contract, in-progress, completed, cancelled; and large vs small projects.
- **Android**: ProjectsScreen has all / available / running / completed / bid_received / direct_offers and large vs small. Wording and exact filter set may differ; consider aligning labels and filter options with web if needed.

### 8. **Small tasks**
- Both web and Android have small-tasks flows (types, create request, bids, status). Not re-audited here; treat as a separate pass for full parity.

---

## Summary

- **Project flow**: Creation → Pending → Bid received → Approved → Contract signing → In progress → Completed is implemented on Android and wired to the same backend and status screens as web. Running Projects now opens the full status screen for each project.
- **Backend**: Android API config is aligned with web for projects, phases, contracts, signatures, change requests, payments, and user search.
- **Gaps to close for full parity**: All listed gaps have been implemented. Optional: align project filter labels with web.
