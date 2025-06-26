# Patrol Tracking API Documentation

## Overview

The patrol tracking system allows officers to send their GPS coordinates every 5 minutes during a patrol. The system automatically detects when the officer reaches the destination and completes the patrol.

## API Endpoint

### GET `/api/patrol/:id/track`

Tracks the officer's location and checks if they are near the destination.

#### Parameters

- **id** (path parameter): The patrol ID
- **latitude** (query parameter): Current latitude coordinate
- **longitude** (query parameter): Current longitude coordinate

#### Headers

- **Authorization**: Bearer token for authentication

#### Example Request

```bash
GET /api/patrol/685d8a364383bc576fdde981/track?latitude=40.7128&longitude=-74.0060
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Response Format

**When not near destination:**
```json
{
  "success": true,
  "message": "Location tracked. Continue to destination.",
  "data": {
    "isNearDestination": false,
    "distance": 150,
    "geofenceRadius": 50,
    "shouldStopTracking": false,
    "patrolCompleted": false
  }
}
```

**When near destination:**
```json
{
  "success": true,
  "message": "Destination reached. Patrol completed.",
  "data": {
    "isNearDestination": true,
    "distance": 25,
    "geofenceRadius": 50,
    "shouldStopTracking": true,
    "patrolCompleted": true
  }
}
```

## How It Works

1. **User sends coordinates**: Every 5 minutes, the mobile app sends the current GPS coordinates to the tracking endpoint.

2. **Server calculates distance**: The server calculates the distance between the current location and the destination (last checkpoint in the patrol route).

3. **Geofence check**: If the distance is within the geofence radius (default 50 meters), the officer is considered to have reached the destination.

4. **Response**: The server responds with:
   - `shouldStopTracking: false` - Continue sending coordinates
   - `shouldStopTracking: true` - Stop tracking, patrol completed

5. **Patrol completion**: When the destination is reached, the patrol status is automatically set to "completed" and the end time is recorded.

## Implementation Details

### Distance Calculation

The system uses the Haversine formula to calculate the distance between two GPS coordinates:

```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
```

### Geofence Radius

Each checkpoint in a patrol route has a configurable geofence radius (default: 50 meters). This determines how close the officer needs to be to complete that checkpoint.

### Patrol Path Tracking

Every coordinate sent is stored in the patrol's `patrolPath` array for later analysis and reporting.

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Latitude and longitude are required as query parameters."
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Patrol not found."
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "You are not assigned to this patrol."
}
```

## Mobile App Integration

The mobile app should:

1. Start tracking when a patrol begins
2. Send coordinates every 5 minutes using the tracking endpoint
3. Check the `shouldStopTracking` field in the response
4. Stop tracking when `shouldStopTracking` is `true`
5. Show the distance to destination to the user

## Example Usage Flow

1. Officer starts patrol (patrol ID: `685d8a364383bc576fdde981`)
2. Mobile app begins sending coordinates every 5 minutes:
   ```
   GET /api/patrol/685d8a364383bc576fdde981/track?latitude=40.7128&longitude=-74.0060
   ```
3. Server responds: `shouldStopTracking: false` (continue tracking)
4. After several updates, officer approaches destination
5. Server responds: `shouldStopTracking: true` (stop tracking)
6. Patrol is automatically completed
7. Mobile app stops sending coordinates 