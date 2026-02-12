# Missing API Documentation - Technician Services & Small Tasks APIs

## 📋 Overview

This document identifies what's missing from the provided API documentation for Technician Services & Small Tasks APIs.

---

## 🔴 CRITICAL MISSING ENDPOINTS

### 1. User-Side Small Task Bid Management APIs

The documentation only covers **technician-side** bid management. Missing **user-side** endpoints:

#### 1.1 Get Bids on Small Task Request (For Users)

**Endpoint:** `GET /api/small-tasks/requests/{id}/bids`

**Permission:** `SMALL_TASK_BID_VIEW` (or similar)

**Description:** Get all bids received on a specific small task request (for the user who created the request).

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | Long | Small task request ID |

**Response:**
```json
{
  "bids": [
    {
      "id": 501,
      "requestId": 101,
      "technicianId": 123,
      "technicianName": "Ahmed Technician",
      "technicianPhone": "+966501234567",
      "amount": 150.00,
      "description": "I can fix this in 30 minutes",
      "estimatedHours": 1,
      "status": "PENDING",
      "createdAt": "2026-02-09T12:00:00"
    },
    {
      "id": 502,
      "requestId": 101,
      "technicianId": 124,
      "technicianName": "Mohamed Technician",
      "technicianPhone": "+966507654321",
      "amount": 175.00,
      "description": "Experienced plumber, can complete in 45 minutes",
      "estimatedHours": 1,
      "status": "PENDING",
      "createdAt": "2026-02-09T12:30:00"
    }
  ],
  "count": 2
}
```

**Note:** This endpoint is referenced in the codebase (`SmallTaskDetailScreen.tsx`) but not documented.

---

#### 1.2 Accept Small Task Bid (User)

**Endpoint:** `PATCH /api/small-tasks/bids/{id}/accept`

**Permission:** `SMALL_TASK_BID_ACCEPT` (or similar)

**Description:** Accept a bid on a small task request. This assigns the task to the technician and rejects other pending bids.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | Long | Bid ID to accept |

**Response:**
```json
{
  "message": "Bid accepted successfully",
  "bid": {
    "id": 501,
    "requestId": 101,
    "technicianId": 123,
    "status": "ACCEPTED",
    "amount": 150.00
  },
  "request": {
    "id": 101,
    "status": "ASSIGNED",
    "assignedTechnicianId": 123
  }
}
```

**What Happens:**
- ✅ Selected bid status → `ACCEPTED`
- ✅ Small task request status → `ASSIGNED`
- ✅ Other pending bids → `REJECTED` (automatically)
- ✅ Technician receives notification

**Note:** This endpoint is used in `SmallTaskDetailScreen.tsx` but not documented.

---

#### 1.3 Reject Small Task Bid (User)

**Endpoint:** `PATCH /api/small-tasks/bids/{id}/reject`

**Permission:** `SMALL_TASK_BID_REJECT` (or similar)

**Description:** Reject a specific bid on a small task request.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | Long | Bid ID to reject |

**Response:**
```json
{
  "message": "Bid rejected successfully",
  "bid": {
    "id": 501,
    "status": "REJECTED"
  }
}
```

**Note:** This endpoint is used in `SmallTaskDetailScreen.tsx` but not documented.

---

### 2. Get Small Task Request Details

**Endpoint:** `GET /api/small-tasks/requests/{id}`

**Permission:** `SMALL_TASK_REQUEST_VIEW`

**Description:** Get detailed information about a specific small task request.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | Long | Request ID |

**Response:**
```json
{
  "id": 101,
  "userId": 50,
  "userName": "Ahmed User",
  "taskType": {
    "id": 1,
    "nameAr": "تصليح حنفية",
    "nameEn": "Faucet Repair",
    "description": "Fix leaking faucets",
    "basePrice": 50.00,
    "estimatedDuration": 60
  },
  "description": "Kitchen faucet leaking badly",
  "address": "Riyadh, Al Yasmin, Building 123, Apt 45",
  "latitude": 24.7136,
  "longitude": 46.6753,
  "status": "PENDING",
  "assignedTechnicianId": null,
  "assignedTechnicianName": null,
  "createdAt": "2026-02-09T10:00:00",
  "updatedAt": "2026-02-09T10:00:00",
  "bidCount": 3,
  "acceptedBidId": null
}
```

**Note:** This endpoint may be needed for viewing task details, but it's not documented.

---

### 3. Cancel Small Task Request

**Endpoint:** `DELETE /api/small-tasks/requests/{id}`

**Permission:** `SMALL_TASK_REQUEST_DELETE` (or similar)

**Description:** Cancel/delete a small task request. Only the creator can cancel, and only if status is `PENDING`.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | Long | Request ID to cancel |

**Response:**
```json
{
  "message": "Small task request cancelled successfully"
}
```

**Rules:**
- ✅ Only the user who created the request can cancel
- ❌ Cannot cancel if status is `ASSIGNED`, `IN_PROGRESS`, or `COMPLETED`
- ✅ All pending bids are automatically cancelled

**Error Response (400 Bad Request):**
```json
{
  "message": "Cannot cancel request. Status is ASSIGNED"
}
```

**Note:** This feature is listed as missing in `MISSING_FEATURES_SUMMARY.md` but no endpoint is documented.

---

## 🟡 IMPORTANT MISSING DETAILS

### 4. Error Response Formats

The documentation doesn't include standard error response formats. Should include:

**401 Unauthorized:**
```json
{
  "message": "Unauthorized",
  "error": "Invalid or expired token"
}
```

**403 Forbidden:**
```json
{
  "message": "Forbidden",
  "error": "Insufficient permissions. Required: TECHNICIAN_SERVICE_MANAGE"
}
```

**404 Not Found:**
```json
{
  "message": "Not Found",
  "error": "Service with ID 999 not found"
}
```

**400 Bad Request:**
```json
{
  "message": "Bad Request",
  "error": "Invalid request body",
  "errors": {
    "amount": "Amount must be greater than 0",
    "estimatedHours": "Estimated hours must be between 0.5 and 24"
  }
}
```

**422 Unprocessable Entity:**
```json
{
  "message": "Validation failed",
  "errors": {
    "nameAr": "Arabic name is required",
    "nameEn": "English name is required"
  }
}
```

---

### 5. Query Parameters & Pagination

Several endpoints likely support query parameters that aren't documented:

#### 5.1 Get Available Requests (Pagination)

**Endpoint:** `GET /api/small-tasks/requests/available`

**Query Parameters:**
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| page | Integer | Page number (0-indexed) | 0 |
| size | Integer | Page size | 20 |
| sort | String | Sort field (e.g., "createdAt,desc") | "createdAt,desc" |
| status | String | Filter by status | All |
| taskTypeId | Long | Filter by task type | All |
| minPrice | Decimal | Minimum bid amount | None |
| maxPrice | Decimal | Maximum bid amount | None |

**Response with Pagination:**
```json
{
  "requests": [...],
  "count": 15,
  "page": 0,
  "size": 20,
  "totalPages": 1,
  "totalElements": 15
}
```

---

#### 5.2 Get My Bids (Pagination & Filters)

**Endpoint:** `GET /api/small-tasks/bids/my-bids`

**Query Parameters:**
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| page | Integer | Page number | 0 |
| size | Integer | Page size | 20 |
| status | String | Filter by status (PENDING, ACCEPTED, REJECTED, WITHDRAWN) | All |
| sort | String | Sort field | "createdAt,desc" |

---

#### 5.3 Get My Service Suggestions (Pagination)

**Endpoint:** `GET /api/suggestions/services/my-requests`

**Query Parameters:**
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| page | Integer | Page number | 0 |
| size | Integer | Page size | 20 |
| status | String | Filter by status (PENDING, APPROVED, REJECTED) | All |

---

### 6. Request Body Validation Rules

Missing validation rules for request bodies:

#### 6.1 Create Bid Request Body

**Required Fields:**
- `amount` (Decimal, required, min: 0.01, max: 999999.99)
- `description` (String, required, min: 10, max: 500)
- `estimatedHours` (Decimal, required, min: 0.5, max: 24)

**Example Validation Error:**
```json
{
  "message": "Validation failed",
  "errors": {
    "amount": "Amount must be between 0.01 and 999999.99",
    "description": "Description must be between 10 and 500 characters",
    "estimatedHours": "Estimated hours must be between 0.5 and 24"
  }
}
```

---

#### 6.2 Service Suggestion Request Body

**Required Fields:**
- `nameAr` (String, required, min: 2, max: 100)
- `nameEn` (String, required, min: 2, max: 100)
- `description` (String, required, min: 10, max: 1000)
- `category` (Enum, required, valid values: HOME_MAINTENANCE, CONSTRUCTION, etc.)
- `reason` (String, optional, max: 500)

---

#### 6.3 Task Type Request Body

**Required Fields:**
- `nameAr` (String, required, min: 2, max: 100)
- `nameEn` (String, required, min: 2, max: 100)
- `description` (String, required, min: 10, max: 1000)
- `estimatedDuration` (Integer, required, min: 15, max: 480) // in minutes
- `suggestedBasePrice` (Decimal, required, min: 0.01, max: 999999.99)
- `category` (String, optional)

---

### 7. Status Values & Transitions

Missing documentation for status values and valid transitions:

#### 7.1 Small Task Request Status

**Valid Statuses:**
- `PENDING` - Request created, waiting for bids
- `ASSIGNED` - Bid accepted, technician assigned
- `IN_PROGRESS` - Technician started work
- `COMPLETED` - Task completed
- `CANCELLED` - Request cancelled by user

**Status Transitions:**
```
PENDING → ASSIGNED (when bid accepted)
ASSIGNED → IN_PROGRESS (technician updates)
IN_PROGRESS → COMPLETED (technician marks complete)
PENDING → CANCELLED (user cancels)
```

---

#### 7.2 Small Task Bid Status

**Valid Statuses:**
- `PENDING` - Bid submitted, waiting for response
- `ACCEPTED` - Bid accepted by user
- `REJECTED` - Bid rejected by user
- `WITHDRAWN` - Bid withdrawn by technician

**Status Transitions:**
```
PENDING → ACCEPTED (user accepts)
PENDING → REJECTED (user rejects)
PENDING → WITHDRAWN (technician withdraws)
```

---

#### 7.3 Service Suggestion Status

**Valid Statuses:**
- `PENDING` - Suggestion submitted, awaiting review
- `APPROVED` - Suggestion approved, service added
- `REJECTED` - Suggestion rejected by admin

---

#### 7.4 Task Type Request Status

**Valid Statuses:**
- `PENDING` - Request submitted, awaiting review
- `APPROVED` - Request approved, task type added
- `REJECTED` - Request rejected by admin

---

### 8. Update Request Status - Missing Details

**Endpoint:** `PATCH /api/small-tasks/requests/{id}/status`

**Missing Information:**
- Who can update status? (Only assigned technician? Only user?)
- What statuses can be updated?
- What happens when status is updated?
- Are notifications sent?

**Should Document:**
- ✅ Only the **assigned technician** can update status
- ✅ Can only update from `ASSIGNED` → `IN_PROGRESS` → `COMPLETED`
- ✅ User receives notification on status change
- ✅ Cannot update if request is `PENDING` or `CANCELLED`

---

## 🟢 NICE TO HAVE MISSING DETAILS

### 9. Response Headers

Missing documentation for response headers:
- `X-Total-Count` - Total number of items (for pagination)
- `X-Page-Number` - Current page number
- `X-Page-Size` - Page size
- `X-Total-Pages` - Total number of pages

---

### 10. Rate Limiting

Missing documentation for:
- Rate limits per endpoint
- Rate limit headers in responses
- What happens when rate limit is exceeded

**Example Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1641826800
```

---

### 11. Webhooks / Notifications

Missing documentation for:
- What events trigger notifications?
- Notification payload formats?
- How to subscribe/unsubscribe?

**Potential Events:**
- New bid received on small task
- Bid accepted/rejected
- Small task status updated
- Service suggestion approved/rejected

---

### 12. Testing Endpoints

Missing documentation for:
- Test/staging environment URLs
- Test credentials
- Sample data setup
- Postman collection link

---

## 📊 Summary Table

| Category | Missing Item | Priority | Impact |
|----------|-------------|----------|--------|
| **Endpoints** | GET /small-tasks/requests/{id}/bids | 🔴 Critical | Users can't see bids |
| **Endpoints** | PATCH /small-tasks/bids/{id}/accept | 🔴 Critical | Users can't accept bids |
| **Endpoints** | PATCH /small-tasks/bids/{id}/reject | 🔴 Critical | Users can't reject bids |
| **Endpoints** | GET /small-tasks/requests/{id} | 🟡 Important | Can't view task details |
| **Endpoints** | DELETE /small-tasks/requests/{id} | 🟡 Important | Users can't cancel requests |
| **Details** | Error response formats | 🟡 Important | Poor error handling |
| **Details** | Query parameters | 🟡 Important | No pagination/filtering |
| **Details** | Validation rules | 🟡 Important | Unclear requirements |
| **Details** | Status transitions | 🟡 Important | Unclear workflow |
| **Details** | Response headers | 🟢 Nice to Have | Limited metadata |
| **Details** | Rate limiting | 🟢 Nice to Have | Unknown limits |
| **Details** | Webhooks/Notifications | 🟢 Nice to Have | No event docs |

---

## 🎯 Recommended Actions

### Immediate (Critical):
1. ✅ Document user-side bid management endpoints
2. ✅ Add error response formats
3. ✅ Document query parameters for pagination
4. ✅ Add validation rules

### Short-term (Important):
5. ✅ Document status values and transitions
6. ✅ Add request detail endpoint documentation
7. ✅ Document cancel request endpoint

### Long-term (Nice to Have):
8. ✅ Add rate limiting documentation
9. ✅ Document webhooks/notifications
10. ✅ Create Postman collection

---

## 📝 Notes

- The codebase (`SmallTaskDetailScreen.tsx`) references endpoints that aren't documented:
  - `PATCH /small-tasks/bids/{id}/accept`
  - `PATCH /small-tasks/bids/{id}/reject`
  - `GET /small-tasks/requests/{id}/bids`

- The `MISSING_FEATURES_SUMMARY.md` lists "Cancel Small Task Request" as missing, but no endpoint is documented.

- Some endpoints may support additional features (filtering, sorting) that aren't documented.

---

**Document Created:** February 11, 2026  
**Status:** Ready for Backend Team Review  
**Next Steps:** Confirm missing endpoints with backend team and update documentation
