# Fire Permit Management API

## Overview

This REST API provides secure access to the Umpiluzi Fire Protection Association's permit management system. The API uses Firebase authentication and connects to the existing Firebase Firestore database.

## Authentication

All API endpoints (except health check) require authentication using Firebase ID tokens.

### Headers Required
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

### Getting an ID Token
To get a Firebase ID token, authenticate through the frontend application or use Firebase Auth SDK:

```javascript
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const user = auth.currentUser;
if (user) {
  const idToken = await user.getIdToken();
  // Use this token in API requests
}
```

## Base URL
```
http://localhost:5000/api
```

## Endpoints

### Authentication

#### Verify Token
```
POST /api/auth/verify
```
Verify a Firebase ID token and get user profile.

**Request Body:**
```json
{
  "idToken": "your_firebase_id_token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "uid": "user123",
      "email": "user@example.com",
      "displayName": "John Doe",
      "role": "user",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": {
      "uid": "user123",
      "email": "user@example.com"
    }
  },
  "message": "Authentication successful"
}
```

#### Get User Profile
```
GET /api/user/profile
```
Get the current authenticated user's profile.

### Permits

#### Get Permits
```
GET /api/permits
```
Get permits based on user role and query parameters.

**Query Parameters:**
- `userId` (string, optional) - Filter by user ID (admin/manager only)
- `areaId` (string, optional) - Filter by area ID
- `compartment` (string, optional) - **Filter by compartment number or section identifier**
- `status` (string, optional) - Filter by status: pending, approved, rejected, completed, cancelled
- `startDate` (string, optional) - Filter permits starting from this date (ISO format)
- `endDate` (string, optional) - Filter permits ending before this date (ISO format)
- `limit` (number, optional) - Maximum number of permits to return (1-100)
- `offset` (number, optional) - Number of permits to skip

**Examples:**
```
GET /api/permits?status=approved&limit=10&offset=0
GET /api/permits?compartment=C-14B&status=approved
GET /api/permits?areaId=umpiluzi_section_a&compartment=C-*
```

**Response Structure:**
Each permit object contains the following fields:
- `id` - Unique permit identifier
- `userId` - ID of the user who applied for the permit
- `burnTypeId` - Type of burn being requested
- `areaId` - Geographic area where burn will take place
- `farmId` - Farm identification
- `compartment` - **Compartment number or section within the farm/area where the burn will occur**
- `startDate` - Planned start date for the burn (ISO format)
- `endDate` - Planned end date for the burn (ISO format)
- `status` - Current permit status (pending, approved, rejected, completed, cancelled)
- `location` - Optional GPS coordinates object with latitude, longitude, and address
- `details` - Additional details or notes about the burn
- `approvedBy` - User ID who approved the permit (if approved)
- `approvedAt` - Date when permit was approved (ISO format)
- `rejectionReason` - Reason for rejection (if rejected)
- `createdAt` - Date when permit was created (ISO format)
- `updatedAt` - Date when permit was last modified (ISO format)

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "permit_12345",
      "userId": "user_67890",
      "burnTypeId": "controlled_burn",
      "areaId": "umpiluzi_section_a",
      "farmId": "farm_001",
      "compartment": "C-14B",
      "startDate": "2024-07-15T06:00:00.000Z",
      "endDate": "2024-07-15T18:00:00.000Z",
      "status": "approved",
      "location": {
        "latitude": -26.2041,
        "longitude": 28.0473,
        "address": "Umpiluzi FMU, Section A"
      },
      "details": "Controlled burn of grass areas",
      "approvedBy": "manager_001",
      "approvedAt": "2024-07-14T10:30:00.000Z",
      "createdAt": "2024-07-13T14:20:00.000Z",
      "updatedAt": "2024-07-14T10:30:00.000Z"
    }
  ],
  "message": "Retrieved 1 permits"
}
```

#### Get Permit by ID
```
GET /api/permits/:id
```
Get a specific permit by its ID.

#### Get User's Permits (Admin/Manager only)
```
GET /api/users/:userId/permits
```
Get all permits for a specific user.

#### Get Area Permits (Admin/Manager only)
```
GET /api/areas/:areaId/permits
```
Get all permits for a specific area.

### Areas

#### Get All Areas
```
GET /api/areas
```
Get all available areas.

#### Get Area by ID
```
GET /api/areas/:id
```
Get a specific area by its ID.

### Burn Types

#### Get All Burn Types
```
GET /api/burn-types
```
Get all available burn types.

#### Get Burn Type by ID
```
GET /api/burn-types/:id
```
Get a specific burn type by its ID.

### Health Check

#### Health Check
```
GET /api/health
```
Check if the API is running (no authentication required).

## User Roles and Permissions

### User (`user`)
- Can view their own permits only
- Can view areas and burn types

### Area Manager (`area-manager`)
- Can view permits for their managed areas
- Can view all areas and burn types
- Can view permits by user ID

### Admin (`admin`)
- Can view all permits
- Can view permits by user ID or area ID
- Full access to all endpoints

## Response Format

All API responses follow this format:

```json
{
  "success": boolean,
  "data": any,           // Response data (optional)
  "error": string,       // Error message (optional)
  "message": string      // Success message (optional)
}
```

## Error Handling

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

### Error Response Example
```json
{
  "success": false,
  "error": "Invalid authentication token"
}
```

## Example Usage

### JavaScript/Node.js
```javascript
// Get permits for authenticated user
const response = await fetch('http://localhost:5000/api/permits', {
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
if (data.success) {
  console.log('Permits:', data.data);
} else {
  console.error('Error:', data.error);
}
```

### cURL
```bash
# Get user profile
curl -H "Authorization: Bearer YOUR_ID_TOKEN" \
     -H "Content-Type: application/json" \
     http://localhost:5000/api/user/profile

# Get approved permits
curl -H "Authorization: Bearer YOUR_ID_TOKEN" \
     -H "Content-Type: application/json" \
     "http://localhost:5000/api/permits?status=approved&limit=5"
```

## Firebase Setup Requirements

To use this API, you need:

1. A Firebase project with Authentication enabled
2. Firestore database with the following collections:
   - `users` - User profiles
   - `burnPermits` - Burn permits
   - `areas` - Geographic areas
   - `burnTypes` - Types of burns

3. Firebase Admin SDK configured on the server

For production deployment, you'll need to provide Firebase service account credentials.