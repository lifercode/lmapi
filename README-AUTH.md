# JWT Authentication System

This API now includes a complete JWT-based authentication system with user registration, login, and route protection.

## Features

- ✅ User registration with password hashing
- ✅ User login with JWT token generation
- ✅ JWT middleware for protecting routes
- ✅ Password encryption using bcrypt
- ✅ Token verification and user authentication
- ✅ Current user endpoint

## Environment Variables

Add the following to your `.env` file:

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

## API Endpoints

### Authentication Routes

#### Register User
```
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "..."
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Login User
```
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "..."
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Get Current User
```
GET /auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

Response:
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "user": {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

## Protected Routes

To protect any route, import and use the `authenticateToken` middleware:

```typescript
import { authenticateToken } from '@/middleware/auth';
import { Router } from 'express';

const router = Router();

// Protected route
router.get('/protected', authenticateToken, (req: AuthenticatedRequest, res) => {
  // Access user info via req.user
  const userId = req.user?.id;
  const userEmail = req.user?.email;
  const userName = req.user?.name;
  
  res.json({ message: 'Access granted', user: req.user });
});
```

## Using JWT Tokens

### Frontend Integration

1. **Store the token** after login/register:
```javascript
const response = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const data = await response.json();
if (data.success) {
  localStorage.setItem('token', data.data.token);
}
```

2. **Include token in requests**:
```javascript
const token = localStorage.getItem('token');
const response = await fetch('/protected-endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### cURL Examples

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'

# Access protected route
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

## Security Features

- **Password Hashing**: Uses bcrypt with salt rounds of 12
- **JWT Expiration**: Tokens expire after 7 days
- **Token Verification**: All protected routes verify token validity
- **User Validation**: Checks if user still exists on each request
- **Input Validation**: Zod schemas validate all inputs
- **Password Field Security**: Password field excluded from queries by default

## Error Responses

### Authentication Errors

```json
{
  "success": false,
  "message": "Access token is required"
}
```

```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

### Validation Errors

```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "password",
      "message": "Password must be at least 6 characters long"
    }
  ]
}
```

## Implementation Details

### User Model Updates
- Added `password` field with validation
- Implemented `comparePassword` method
- Added pre-save hook for password hashing
- Password field excluded from queries by default

### Middleware
- `authenticateToken`: Requires valid JWT token
- `optionalAuth`: Provides user info if token present, continues if not

### JWT Utilities
- `generateToken`: Creates signed JWT tokens
- `verifyToken`: Verifies and decodes tokens
- `decodeToken`: Safely decodes tokens without verification

## Company Ownership

The API now enforces company ownership based on JWT authentication:

### Protected Company Endpoints

All company endpoints now require authentication and automatically filter by owner:

- `GET /companies` - Returns only companies owned by the authenticated user
- `GET /companies/:id` - Returns company only if owned by the authenticated user  
- `POST /companies` - Creates company automatically assigned to authenticated user
- `PUT /companies/:id` - Updates company only if owned by authenticated user
- `DELETE /companies/:id` - Deletes company only if owned by authenticated user

### Example Usage

```bash
# Create a company (userId automatically set from JWT)
curl -X POST http://localhost:3000/companies \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Company",
    "brandLogoUrl": "https://example.com/logo.png",
    "brandColor": "#FF5733",
    "notifications": [
      {
        "provider": "email",
        "value": "admin@mycompany.com",
        "enabled": true
      }
    ]
  }'

# Get all companies owned by authenticated user
curl -X GET http://localhost:3000/companies \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get specific company (only if owned by user)
curl -X GET http://localhost:3000/companies/COMPANY_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Security Features

- **Automatic Ownership**: Companies are automatically assigned to the authenticated user
- **Access Control**: Users can only view, edit, and delete their own companies
- **No User ID Required**: The `userId` field is automatically populated from the JWT token
- **Access Denied Protection**: Returns 404 "Company not found or access denied" for unauthorized access attempts

## Migration Notes

If you have existing users in your database, you'll need to add passwords to them or handle the migration appropriately. The password field is required for new user creation.

### Existing Companies

If you have existing companies in your database without proper `userId` associations, you'll need to migrate them to associate each company with a valid user ID. 