# Authentication Testing Guide

## Default Admin Credentials

```
Username: admin
Password: admin123
```

⚠️ **Change these in `config/auth.php` before production!**

## Test Endpoints with cURL or Postman

### 1. **Login** (Get Authentication Token)

**Method:** POST  
**URL:** `http://localhost/inventory_management_api/public/login`

**Request Body (JSON):**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**cURL:**
```bash
curl -X POST http://localhost/inventory_management_api/public/login \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"admin\", \"password\": \"admin123\"}"
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzA5NDAxMjM0LCJleHAiOjE3MDk0MDQ4MzR9",
  "expires_in": 3600
}
```

### 2. **Get Profile** (Protected Endpoint)

**Method:** GET  
**URL:** `http://localhost/inventory_management_api/public/auth/profile`

**Headers:**
```
Authorization: Bearer <YOUR_TOKEN_HERE>
```

**cURL:**
```bash
curl -X GET http://localhost/inventory_management_api/public/auth/profile \
  -H "Authorization: Bearer eyJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzA5NDAxMjM0LCJleHAiOjE3MDk0MDQ4MzR9"
```

**Response:**
```json
{
  "success": true,
  "user": {
    "username": "admin",
    "role": "admin",
    "iat": 1709401234,
    "exp": 1709404834
  }
}
```

### 3. **Logout** (Client-side)

**Method:** POST  
**URL:** `http://localhost/inventory_management_api/public/logout`

**Response:**
```json
{
  "success": true,
  "message": "Logout successful. Please delete the token on client side."
}
```

## Testing in Postman

1. **Create Login Request:**
   - Method: POST
   - URL: `http://localhost/inventory_management_api/public/login`
   - Body: Raw JSON
   ```json
   {
     "username": "admin",
     "password": "admin123"
   }
   ```
   - Click Send

2. **Copy the returned token**

3. **Create Protected Request:**
   - Method: GET
   - URL: `http://localhost/inventory_management_api/public/auth/profile`
   - Headers tab:
     - Key: `Authorization`
     - Value: `Bearer YOUR_TOKEN_HERE`
   - Click Send

## How It Works

- **Login:** Returns a token valid for 1 hour
- **Token Format:** Base64-encoded JSON (not encrypted, for demo purposes)
- **Protected Endpoints:** Check for valid Authorization header with Bearer token
- **Expiration:** Tokens expire after 1 hour (configurable in `config/auth.php`)

## Next Steps

1. Replace hardcoded credentials with database lookups
2. Implement proper JWT with a library like `firebase/php-jwt`
3. Hash passwords using `password_hash()` and `password_verify()`
4. Add role-based access control (RBAC)

