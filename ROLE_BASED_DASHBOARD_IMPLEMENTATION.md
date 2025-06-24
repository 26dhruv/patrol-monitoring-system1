# Role-Based Dashboard Implementation

## Overview
This implementation provides role-specific dashboard statistics for the Patrol Monitoring System. Different user roles (Admin, Manager, Officer) now see different data based on their permissions and responsibilities.

## Backend Changes

### 1. Updated Dashboard Stats API (`/api/patrol/dashboard-stats`)

**File**: `server/controllers/patrol.js`

The `getDashboardStats` function now provides role-specific data:

#### For Officers:
- **Active Patrols**: Only patrols assigned to them
- **Officers on Duty**: Their own duty status (1 if on-duty, 0 if off-duty)
- **Patrols Today**: Only their patrols started today
- **Completed Patrols**: Only their completed patrols
- **Recent Patrols**: Only their recent patrols
- **Officers List**: Just their own information
- **Total Patrols**: Only their total patrols

#### For Managers:
- **Active Patrols**: Patrols assigned by them or all patrols (since no assignedBy field for officers yet)
- **Officers on Duty**: All officers on duty (since no assignedBy field for officers yet)
- **Patrols Today**: Patrols assigned by them or all patrols today
- **Completed Patrols**: Patrols assigned by them or all completed patrols
- **Recent Patrols**: Patrols assigned by them or all recent patrols
- **Officers List**: All officers (since no assignedBy field for officers yet)
- **Total Patrols**: Patrols assigned by them or all patrols

#### For Admins:
- **Active Patrols**: All active patrols
- **Officers on Duty**: All officers on duty
- **Patrols Today**: All patrols started today
- **Completed Patrols**: All completed patrols
- **Recent Patrols**: All recent patrols
- **Officers List**: All officers
- **Total Patrols**: All patrols

### 2. Updated Incident Stats API (`/api/incidents/stats`)

**File**: `server/controllers/incidentController.js`

The `getIncidentStats` function now provides role-specific incident data:

#### For Officers:
- **Total Incidents**: Only incidents assigned to them
- **Status Counts**: Only their incidents by status
- **Severity Counts**: Only their incidents by severity
- **Category Counts**: Only their incidents by category
- **Recent Incidents**: Only their recent incidents

#### For Managers and Admins:
- **Total Incidents**: All incidents
- **Status Counts**: All incidents by status
- **Severity Counts**: All incidents by severity
- **Category Counts**: All incidents by category
- **Recent Incidents**: All recent incidents

### 3. Updated API Routes

**Files**: 
- `server/routes/patrol.js`
- `server/routes/incident.js`

Both routes now pass user information (role and ID) as query parameters to the controller functions.

## Frontend Changes

### 1. Updated Dashboard Page

**File**: `client/src/pages/DashboardPage.jsx`

The dashboard now:
- Uses role information from the API response instead of local role checks
- Shows appropriate titles and navigation based on user role
- Displays role-specific statistics
- Shows different sections based on user role (officers see upcoming patrols, admins/managers see officers list)

### 2. Updated Incident Stats Component

**File**: `client/src/components/incidents/IncidentStats.jsx`

The component now:
- Uses role information from the API response
- Shows appropriate titles based on user role:
  - Officers: "My Incident Statistics", "My Total Incidents", "My Recent Incidents"
  - Managers: "Team Incident Statistics", "Team Total Incidents", "Team Recent Incidents"
  - Admins: "Incident Statistics", "Total Incidents", "Recent Incidents"
- Only shows distribution charts for admins and managers (not officers)

## Key Features

### 1. Dynamic Titles
All dashboard elements now show appropriate titles based on the user's role:
- Officers see "My..." prefixed titles
- Managers see "Team..." prefixed titles  
- Admins see general titles

### 2. Role-Specific Navigation
Navigation buttons and links are adjusted based on user role:
- Officers see "View My Patrols" and navigate to `/my-patrols`
- Admins/Managers see "View All Patrols" and navigate to `/patrols`
- Only admins/managers see the "Assign New Patrol" button

### 3. Conditional Sections
- Officers see "My Upcoming Patrols" instead of the officers list
- Admins/Managers see the officers list
- Only admins see "Total Locations" stat (managers and officers see "Completed Patrols")

### 4. Data Filtering
All statistics are automatically filtered based on user role:
- Officers only see their own data
- Managers see team data (currently all data since no assignedBy field exists)
- Admins see all data

## Future Enhancements

### 1. Manager-Officer Assignment
To properly implement manager-specific data, the User model should be extended with an `assignedBy` field to track which manager is assigned to which officer.

### 2. Incident Assignment Tracking
The Incident model could be extended with an `assignedBy` field to track which manager assigned which incidents.

### 3. Department-Based Filtering
For larger organizations, department-based filtering could be added to show only data relevant to the user's department.

## Testing

To test the implementation:

1. **Start the servers**:
   ```bash
   # Terminal 1 - Backend
   cd server && npm start
   
   # Terminal 2 - Frontend  
   cd client && npm run dev
   ```

2. **Login with different roles**:
   - Admin: `admin@example.com` / `password123`
   - Manager: `manager@example.com` / `password123`
   - Officer: `officer1@example.com` / `password123`

3. **Verify role-specific data**:
   - Officers should only see their own patrols and incidents
   - Managers should see team data
   - Admins should see all data

## API Response Structure

The dashboard stats API now returns:
```json
{
  "success": true,
  "data": {
    "activePatrols": 5,
    "officersOnDuty": 3,
    "patrolsToday": 12,
    "totalLocations": 25,
    "completedPatrols": 45,
    "totalPatrols": 67,
    "recentPatrols": [...],
    "officers": [...],
    "userRole": "officer"
  }
}
```

The incident stats API now returns:
```json
{
  "data": {
    "total": 15,
    "statusCounts": {...},
    "severityCounts": {...},
    "categoryCounts": {...},
    "recentIncidents": [...],
    "userRole": "officer"
  }
}
``` 