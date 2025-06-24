# Patrol Monitoring System API Documentation

## Base URL
```
http://localhost:5001/api
```

## Authentication
Most endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## User Roles
- `admin`: Full access to all endpoints
- `manager`: Access to most endpoints except user deletion
- `officer`: Limited access to patrol and incident endpoints
- `supervisor`: Access to patrol management and reporting

---

## 🔐 Authentication Routes (`/auth`)

### Register User
- **POST** `/auth/register`
- **Access**: Public
- **Body**:
  ```json
  {
    "name": "string",
    "email": "string",
    "password": "string",
    "role": "admin|manager|officer|supervisor",
    "phone": "string",
    "badgeNumber": "string",
    "department": "string"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "token": "jwt-token",
    "user": {
      "id": "user-id",
      "name": "string",
      "email": "string",
      "role": "string"
    }
  }
  ```

### Login User
- **POST** `/auth/login`
- **Access**: Public
- **Body**:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "token": "jwt-token",
    "user": {
      "id": "user-id",
      "name": "string",
      "email": "string",
      "role": "string"
    }
  }
  ```

### Get Current User
- **GET** `/auth/me`
- **Access**: Private
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "success": true,
    "user": {
      "id": "user-id",
      "name": "string",
      "email": "string",
      "role": "string",
      "phone": "string",
      "badgeNumber": "string",
      "department": "string"
    }
  }
  ```

### Logout User
- **GET** `/auth/logout`
- **Access**: Private
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "success": true,
    "message": "User logged out successfully"
  }
  ```

---

## 👥 User Management Routes (`/users`)

### Get All Users
- **GET** `/users`
- **Access**: Admin, Manager
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `select`: Fields to select (comma-separated)
  - `sort`: Sort fields (comma-separated)
  - `page`: Page number
  - `limit`: Items per page
- **Response**:
  ```json
  {
    "success": true,
    "count": 10,
    "pagination": {
      "totalPages": 5,
      "currentPage": 1,
      "next": { "page": 2, "limit": 10 },
      "prev": null
    },
    "data": [
      {
        "id": "user-id",
        "name": "string",
        "email": "string",
        "role": "string",
        "phone": "string",
        "badgeNumber": "string",
        "department": "string",
        "status": "active|inactive"
      }
    ]
  }
  ```

### Get Officers Only
- **GET** `/users/officers`
- **Access**: Admin, Manager
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Same as Get All Users but filtered for officers

### Get Specific User
- **GET** `/users/:id`
- **Access**: Private (own profile or admin/manager)
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "user-id",
      "name": "string",
      "email": "string",
      "role": "string",
      "phone": "string",
      "badgeNumber": "string",
      "department": "string",
      "status": "string"
    }
  }
  ```

### Update User
- **PUT** `/users/:id`
- **Access**: Private (own profile or admin/manager)
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "name": "string",
    "email": "string",
    "phone": "string",
    "badgeNumber": "string",
    "department": "string"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "user-id",
      "name": "string",
      "email": "string",
      "role": "string",
      "phone": "string",
      "badgeNumber": "string",
      "department": "string"
    }
  }
  ```

### Delete User
- **DELETE** `/users/:id`
- **Access**: Admin only
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "success": true,
    "data": {}
  }
  ```

### Update User Status
- **PUT** `/users/:id/status`
- **Access**: Admin, Manager
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "status": "active|inactive"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "user-id",
      "status": "string"
    }
  }
  ```

### Get User Logs
- **GET** `/users/:userId/logs`
- **Access**: Private
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `startDate`: Start date filter
  - `endDate`: End date filter
  - `page`: Page number
  - `limit`: Items per page
- **Response**:
  ```json
  {
    "success": true,
    "count": 10,
    "data": [
      {
        "id": "log-id",
        "patrol": "patrol-id",
        "officer": "officer-id",
        "location": "location-id",
        "timestamp": "2024-01-01T00:00:00.000Z",
        "status": "string",
        "notes": "string"
      }
    ]
  }
  ```

---

## 🚔 Patrol Management Routes (`/patrol`)

### Get All Patrols
- **GET** `/patrol`
- **Access**: Private
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `status`: Filter by status
  - `assignedOfficers`: Filter by assigned officer ID
  - `officerId`: Filter by officer ID (alias for assignedOfficers)
  - `select`: Fields to select (comma-separated)
  - `sort`: Sort fields (comma-separated)
  - `page`: Page number
  - `limit`: Items per page
- **Response**:
  ```json
  {
    "success": true,
    "count": 10,
    "total": 50,
    "pagination": {
      "totalPages": 5,
      "currentPage": 1,
      "next": { "page": 2, "limit": 10 },
      "prev": null
    },
    "data": [
      {
        "id": "patrol-id",
        "name": "string",
        "description": "string",
        "status": "pending|active|completed|cancelled",
        "assignedOfficers": [
          {
            "id": "officer-id",
            "name": "string",
            "email": "string",
            "badgeNumber": "string"
          }
        ],
        "assignedBy": {
          "id": "user-id",
          "name": "string",
          "email": "string"
        },
        "locations": [
          {
            "id": "location-id",
            "name": "string",
            "coordinates": {
              "lat": 0,
              "lng": 0
            }
          }
        ],
        "startTime": "2024-01-01T00:00:00.000Z",
        "endTime": "2024-01-01T23:59:59.000Z",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

### Get Dashboard Stats
- **GET** `/patrol/dashboard-stats`
- **Access**: Private
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `userRole`: User role (auto-populated)
  - `userId`: User ID (auto-populated)
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "totalPatrols": 100,
      "activePatrols": 15,
      "completedPatrols": 80,
      "pendingPatrols": 5,
      "recentActivity": [
        {
          "id": "patrol-id",
          "name": "string",
          "status": "string",
          "updatedAt": "2024-01-01T00:00:00.000Z"
        }
      ]
    }
  }
  ```

### Get Active Patrols
- **GET** `/patrol/active`
- **Access**: Private
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `userRole`: User role (auto-populated)
  - `userId`: User ID (auto-populated)
- **Response**:
  ```json
  {
    "success": true,
    "count": 5,
    "data": [
      {
        "id": "patrol-id",
        "name": "string",
        "status": "active",
        "assignedOfficers": [],
        "locations": [],
        "startTime": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

### Get Officer Patrols
- **GET** `/patrol/officer/:officerId`
- **Access**: Private
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Same as Get All Patrols but filtered for specific officer

### Create Patrol
- **POST** `/patrol`
- **Access**: Admin, Manager
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "name": "string",
    "description": "string",
    "assignedOfficers": ["officer-id-1", "officer-id-2"],
    "locations": ["location-id-1", "location-id-2"],
    "startTime": "2024-01-01T00:00:00.000Z",
    "endTime": "2024-01-01T23:59:59.000Z"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "patrol-id",
      "name": "string",
      "description": "string",
      "status": "pending",
      "assignedOfficers": [],
      "assignedBy": "user-id",
      "locations": [],
      "startTime": "2024-01-01T00:00:00.000Z",
      "endTime": "2024-01-01T23:59:59.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

### Get Specific Patrol
- **GET** `/patrol/:id`
- **Access**: Private
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "patrol": {
        "id": "patrol-id",
        "name": "string",
        "description": "string",
        "status": "string",
        "assignedOfficers": [],
        "assignedBy": {},
        "locations": [],
        "startTime": "2024-01-01T00:00:00.000Z",
        "endTime": "2024-01-01T23:59:59.000Z"
      },
      "logs": [
        {
          "id": "log-id",
          "patrol": "patrol-id",
          "officer": {},
          "location": {},
          "timestamp": "2024-01-01T00:00:00.000Z",
          "status": "string",
          "notes": "string"
        }
      ]
    }
  }
  ```

### Update Patrol
- **PUT** `/patrol/:id`
- **Access**: Admin, Manager
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "name": "string",
    "description": "string",
    "assignedOfficers": ["officer-id-1", "officer-id-2"],
    "locations": ["location-id-1", "location-id-2"],
    "startTime": "2024-01-01T00:00:00.000Z",
    "endTime": "2024-01-01T23:59:59.000Z"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "patrol-id",
      "name": "string",
      "description": "string",
      "status": "string",
      "assignedOfficers": [],
      "locations": [],
      "startTime": "2024-01-01T00:00:00.000Z",
      "endTime": "2024-01-01T23:59:59.000Z"
    }
  }
  ```

### Delete Patrol
- **DELETE** `/patrol/:id`
- **Access**: Admin, Manager
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "success": true,
    "data": {}
  }
  ```

### Start Patrol
- **PUT** `/patrol/:id/start`
- **Access**: Private (assigned officers)
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "patrol-id",
      "status": "active",
      "startTime": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

### Get Patrol Logs
- **GET** `/patrol/:patrolId/logs`
- **Access**: Private
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "success": true,
    "count": 10,
    "data": [
      {
        "id": "log-id",
        "patrol": "patrol-id",
        "officer": {
          "id": "officer-id",
          "name": "string"
        },
        "location": {
          "id": "location-id",
          "name": "string"
        },
        "timestamp": "2024-01-01T00:00:00.000Z",
        "status": "string",
        "notes": "string"
      }
    ]
  }
  ```

### Create Patrol Log
- **POST** `/patrol/:patrolId/logs`
- **Access**: Private (assigned officers)
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "location": "location-id",
    "status": "string",
    "notes": "string"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "log-id",
      "patrol": "patrol-id",
      "officer": "officer-id",
      "location": "location-id",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "status": "string",
      "notes": "string"
    }
  }
  ```

---

## 🚨 Incident Management Routes (`/incidents`)

### Get All Incidents
- **GET** `/incidents`
- **Access**: Private
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `status`: Filter by status
  - `priority`: Filter by priority
  - `assignedTo`: Filter by assigned officer
  - `location`: Filter by location
  - `select`: Fields to select (comma-separated)
  - `sort`: Sort fields (comma-separated)
  - `page`: Page number
  - `limit`: Items per page
- **Response**:
  ```json
  {
    "success": true,
    "count": 10,
    "data": [
      {
        "id": "incident-id",
        "title": "string",
        "description": "string",
        "status": "open|in-progress|resolved|closed",
        "priority": "low|medium|high|critical",
        "location": {
          "id": "location-id",
          "name": "string",
          "coordinates": { "lat": 0, "lng": 0 }
        },
        "reportedBy": {
          "id": "user-id",
          "name": "string"
        },
        "assignedTo": {
          "id": "officer-id",
          "name": "string"
        },
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

### Get Incident Stats
- **GET** `/incidents/stats`
- **Access**: Private
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "totalIncidents": 100,
      "openIncidents": 25,
      "resolvedIncidents": 70,
      "criticalIncidents": 5,
      "recentIncidents": [
        {
          "id": "incident-id",
          "title": "string",
          "status": "string",
          "priority": "string",
          "createdAt": "2024-01-01T00:00:00.000Z"
        }
      ]
    }
  }
  ```

### Create Incident
- **POST** `/incidents`
- **Access**: Private
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "title": "string",
    "description": "string",
    "priority": "low|medium|high|critical",
    "location": "location-id",
    "assignedTo": "officer-id"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "incident-id",
      "title": "string",
      "description": "string",
      "status": "open",
      "priority": "string",
      "location": "location-id",
      "reportedBy": "user-id",
      "assignedTo": "officer-id",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

### Get Specific Incident
- **GET** `/incidents/:id`
- **Access**: Private
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "incident-id",
      "title": "string",
      "description": "string",
      "status": "string",
      "priority": "string",
      "location": {},
      "reportedBy": {},
      "assignedTo": {},
      "notes": [],
      "actions": [],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

### Update Incident
- **PATCH** `/incidents/:id`
- **Access**: Private (assigned officer or admin/manager)
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "title": "string",
    "description": "string",
    "priority": "low|medium|high|critical"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "incident-id",
      "title": "string",
      "description": "string",
      "status": "string",
      "priority": "string",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

### Delete Incident
- **DELETE** `/incidents/:id`
- **Access**: Admin, Manager
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "success": true,
    "data": {}
  }
  ```

### Add Note to Incident
- **POST** `/incidents/:id/notes`
- **Access**: Private
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "content": "string"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "note-id",
      "incident": "incident-id",
      "author": "user-id",
      "content": "string",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

### Add Action to Incident
- **POST** `/incidents/:id/actions`
- **Access**: Private (assigned officer or admin/manager)
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "action": "string",
    "description": "string"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "action-id",
      "incident": "incident-id",
      "officer": "user-id",
      "action": "string",
      "description": "string",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

### Assign Incident
- **PATCH** `/incidents/:id/assign`
- **Access**: Admin, Manager
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "assignedTo": "officer-id"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "incident-id",
      "assignedTo": "officer-id",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

### Update Incident Status
- **PATCH** `/incidents/:id/status`
- **Access**: Private (assigned officer or admin/manager)
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "status": "open|in-progress|resolved|closed"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "incident-id",
      "status": "string",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

---

## 📍 Location Management Routes (`/locations`)

### Get All Locations
- **GET** `/locations`
- **Access**: Private
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `select`: Fields to select (comma-separated)
  - `sort`: Sort fields (comma-separated)
  - `page`: Page number
  - `limit`: Items per page
- **Response**:
  ```json
  {
    "success": true,
    "count": 10,
    "data": [
      {
        "id": "location-id",
        "name": "string",
        "description": "string",
        "coordinates": {
          "lat": 0,
          "lng": 0
        },
        "address": "string",
        "type": "string",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

### Create Location
- **POST** `/locations`
- **Access**: Admin, Manager
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "name": "string",
    "description": "string",
    "coordinates": {
      "lat": 0,
      "lng": 0
    },
    "address": "string",
    "type": "string"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "location-id",
      "name": "string",
      "description": "string",
      "coordinates": { "lat": 0, "lng": 0 },
      "address": "string",
      "type": "string",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

### Get Specific Location
- **GET** `/locations/:id`
- **Access**: Private
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "location-id",
      "name": "string",
      "description": "string",
      "coordinates": { "lat": 0, "lng": 0 },
      "address": "string",
      "type": "string",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

### Update Location
- **PUT** `/locations/:id`
- **Access**: Admin, Manager
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "name": "string",
    "description": "string",
    "coordinates": {
      "lat": 0,
      "lng": 0
    },
    "address": "string",
    "type": "string"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "location-id",
      "name": "string",
      "description": "string",
      "coordinates": { "lat": 0, "lng": 0 },
      "address": "string",
      "type": "string",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

### Delete Location
- **DELETE** `/locations/:id`
- **Access**: Admin only
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "success": true,
    "data": {}
  }
  ```

---

## 📊 Reports Routes (`/reports`)

### Get Reports Data
- **GET** `/reports`
- **Access**: Private
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `startDate`: Start date filter
  - `endDate`: End date filter
  - `type`: Report type filter
  - `officer`: Officer filter
  - `location`: Location filter
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "patrolReports": [],
      "incidentReports": [],
      "officerReports": [],
      "summary": {
        "totalPatrols": 100,
        "totalIncidents": 50,
        "activeOfficers": 25
      }
    }
  }
  ```

### Get Report Stats
- **GET** `/reports/stats`
- **Access**: Private
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `startDate`: Start date filter
  - `endDate`: End date filter
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "patrolStats": {
        "total": 100,
        "completed": 80,
        "active": 15,
        "cancelled": 5
      },
      "incidentStats": {
        "total": 50,
        "open": 10,
        "resolved": 35,
        "critical": 5
      },
      "officerStats": {
        "total": 25,
        "active": 20,
        "onPatrol": 15
      }
    }
  }
  ```

### Download Report
- **GET** `/reports/download`
- **Access**: Private
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `type`: Report type (patrols|incidents|officers)
  - `startDate`: Start date filter
  - `endDate`: End date filter
  - `format`: File format (csv|pdf)
- **Response**: File download (CSV or PDF)

---

## ⚙️ Settings Routes (`/settings`)

### Get User Settings
- **GET** `/settings`
- **Access**: Private
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "general": {
        "notifications": true,
        "language": "en",
        "timezone": "UTC"
      },
      "admin": {
        "systemName": "Patrol Monitoring System",
        "maxPatrolsPerOfficer": 5,
        "autoAssignIncidents": true
      }
    }
  }
  ```

### Update General Settings
- **PUT** `/settings/general`
- **Access**: Private
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "notifications": true,
    "language": "en",
    "timezone": "UTC"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "notifications": true,
      "language": "en",
      "timezone": "UTC"
    }
  }
  ```

### Update Admin Settings
- **PUT** `/settings/admin`
- **Access**: Admin, Manager
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "systemName": "Patrol Monitoring System",
    "maxPatrolsPerOfficer": 5,
    "autoAssignIncidents": true
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "systemName": "Patrol Monitoring System",
      "maxPatrolsPerOfficer": 5,
      "autoAssignIncidents": true
    }
  }
  ```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "success": false,
  "error": "Error message"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Access denied"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Server Error"
}
```

---

## Notes

1. **Authentication**: Most endpoints require a valid JWT token in the Authorization header
2. **Pagination**: List endpoints support pagination with `page` and `limit` query parameters
3. **Filtering**: Many endpoints support filtering with query parameters
4. **Sorting**: List endpoints support sorting with the `sort` query parameter
5. **Field Selection**: Use the `select` query parameter to specify which fields to return
6. **Role-based Access**: Different user roles have different access levels to endpoints
7. **Date Formats**: All dates are in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
8. **Object IDs**: MongoDB ObjectId format is used for all ID fields 