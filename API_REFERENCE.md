# Backend API Reference

## Overview
Complete API reference for Vape Hero backend. All endpoints are implemented and tested.

---

## Authentication

### Headers Required (for protected endpoints)
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Auth Endpoints

#### Send OTP
```
POST /api/auth/send-otp
Body: { "phone": "09XXXXXXXXX" }
Response: { "message": "کد تایید ارسال شد", "code": "12345" (dev only) }
```

#### Verify OTP
```
POST /api/auth/verify-otp
Body: { "phone": "09XXXXXXXXX", "code": "12345" }
Response: { 
  "token": "jwt_token",
  "user": { id, phone, name, role, status, vip_level, ... },
  "status": "active|pending|rejected"
}
```

#### Register
```
POST /api/auth/register
Body: { 
  "phone": "09XXXXXXXXX", 
  "name": "Store Name",
  "store_name": "Business Name"
}
Response: { "message": "درخواست ثبت نام ارسال شد", "status": "pending" }
```

---

## Public Endpoints (No Auth)

### Categories

#### Get Category Tree
```
GET /api/categories
Query: ?page=1&limit=50&parent_id=null&search=keyword

Response:
[
  {
    "id": "uuid",
    "name": "دسته بندی",
    "slug": "category-slug",
    "description": "توضیحات",
    "image": "image_url",
    "order": 1,
    "parent_id": null,
    "children": [
      { ... }
    ],
    "_count": {
      "products": 5
    }
  }
]
```

#### Get Category by Slug
```
GET /api/categories/:slug

Response:
{
  "id": "uuid",
  "name": "دسته بندی",
  "slug": "category-slug",
  "description": "توضیحات",
  "image": "image_url",
  "order": 1,
  "children": [ ... ],
  "products": [ ... ]
}
```

#### Get VIP Tiers
```
GET /api/categories/vip-tiers

Response:
{
  "tiers": [
    {
      "id": "Bronze",
      "name": "همکار برنزی",
      "minSpent": 0,
      "discount": 0,
      "benefits": [ "benefit1", "benefit2" ]
    },
    ...
  ]
}
```

### Products

#### Get Products List
```
GET /api/products

Query Parameters:
- category: Category ID
- search: Search term
- minPrice: Minimum price
- maxPrice: Maximum price
- inStock: true|false
- page: Page number (default 1)
- limit: Items per page (default 20)
- sort: Field to sort by (default "created_at")
- order: "asc"|"desc" (default "desc")

Response:
{
  "products": [
    {
      "id": "uuid",
      "name": "Product Name",
      "slug": "product-slug",
      "description": "Description",
      "price": "100000",
      "image_main": "image_url",
      "stock_count": 50,
      "min_order": 1,
      "in_stock": true,
      "is_active": true,
      "properties": "JSON",
      "colors": "JSON",
      "category": {
        "id": "uuid",
        "name": "دسته بندی",
        "slug": "category-slug"
      }
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "pages": 5
}

Note: Prices shown only if user is active. Use Authorization header to show prices.
```

#### Get Product by Slug
```
GET /api/products/:slug

Response:
{
  "id": "uuid",
  "name": "Product Name",
  "slug": "product-slug",
  "price": "100000",
  "description": "Detailed description",
  "image_main": "main_image_url",
  "images": [ "image1", "image2", ... ],
  "stock_count": 50,
  "min_order": 1,
  "in_stock": true,
  "is_active": true,
  "properties": { ... },
  "colors": [ ... ],
  "category": { ... },
  "rating": 4.5,
  "reviews_count": 10
}
```

---

## Authenticated User Endpoints (Requires Auth)

### Profile

#### Get User Profile
```
GET /api/profile
Headers: Authorization: Bearer <token>

Response:
{
  "id": "uuid",
  "phone": "09XXXXXXXXX",
  "name": "User Name",
  "store_name": "Store Name",
  "role": "user|admin",
  "status": "active|pending|rejected",
  "vip_level": "Bronze|Silver|Gold|Diamond",
  "total_spent": "5000000",
  "wallet_balance": "0",
  "created_at": "2026-01-27T12:00:00Z"
}
```

#### Update Profile
```
PUT /api/profile
Headers: Authorization: Bearer <token>
Body: {
  "name": "New Name",
  "store_name": "New Store Name"
}

Response: { ...updated user data... }
```

#### Get User Orders
```
GET /api/profile/orders
Headers: Authorization: Bearer <token>
Query: ?page=1&limit=20&status=pending_payment

Response:
{
  "orders": [
    {
      "id": "ORD-123456",
      "status": "pending_payment|paid|processing|shipped",
      "total_amount": "500000",
      "final_amount": "485000",
      "created_at": "2026-01-27T12:00:00Z",
      "orderItems": [
        {
          "id": "uuid",
          "quantity": 2,
          "price": "100000",
          "product": {
            "id": "uuid",
            "name": "Product",
            "slug": "product-slug",
            "image_main": "image_url"
          }
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

### Orders

#### Get All Orders
```
GET /api/orders
Headers: Authorization: Bearer <token>
Query: ?page=1&limit=20&status=pending_payment

Response: { orders: [...], pagination: {...} }
```

#### Get Order Detail
```
GET /api/orders/:id
Headers: Authorization: Bearer <token>

Response:
{
  "id": "ORD-123456",
  "user_id": "uuid",
  "status": "pending_payment",
  "total_amount": "500000",
  "discount_amount": "0",
  "final_amount": "500000",
  "items": "[json array]",
  "shipping_address": "Address",
  "receipt_url": "url",
  "tracking_code": "1234567890",
  "created_at": "2026-01-27T12:00:00Z",
  "orderItems": [ ... ]
}
```

#### Create Order
```
POST /api/orders
Headers: Authorization: Bearer <token>
Body: {
  "items": [
    {
      "product_id": "uuid",
      "quantity": 2
    }
  ],
  "shipping_address": "Full Address"
}

Response: { 
  "id": "ORD-123456",
  "status": "pending_payment",
  "total_amount": "500000",
  "final_amount": "500000",
  "created_at": "2026-01-27T12:00:00Z"
}
```

#### Upload Receipt
```
PUT /api/orders/:id/upload-receipt
Headers: Authorization: Bearer <token>, Content-Type: multipart/form-data
Body: FormData with "receipt" file

Response: {
  "id": "ORD-123456",
  "receipt_url": "url",
  "status": "pending_payment"
}
```

---

## Admin Endpoints (Requires Admin Role)

All admin endpoints require:
- Authentication (Authorization header)
- Admin role

### Dashboard

#### Get Statistics
```
GET /api/admin/stats

Response:
{
  "users": {
    "total": 100,
    "pending": 5
  },
  "orders": {
    "total": 500,
    "pending": 20
  },
  "revenue": {
    "total": "50000000",
    "monthly": "5000000"
  }
}
```

---

### Categories Management

#### List Categories
```
GET /api/admin/categories
Query: ?page=1&limit=50&parent_id=null&search=keyword

Response:
{
  "categories": [ ... ],
  "pagination": { page, limit, total, pages }
}
```

#### Get Category
```
GET /api/admin/categories/:id

Response: { ...category with children... }
```

#### Create Category
```
POST /api/admin/categories
Body: {
  "name": "Category Name",
  "slug": "category-slug",
  "description": "Description",
  "parent_id": null,
  "image": "image_url",
  "order": 1
}

Response: { id, name, slug, ... }
```

#### Update Category
```
PUT /api/admin/categories/:id
Body: { name, slug, description, ... }

Response: { ...updated category... }
```

#### Delete Category
```
DELETE /api/admin/categories/:id

Response: { success: true }
```

---

### Products Management

#### List Products
```
GET /api/admin/products
Query: ?page=1&limit=50&category_id=uuid&search=keyword&is_active=true

Response:
{
  "products": [ ... ],
  "pagination": { page, limit, total, pages }
}
```

#### Get Product
```
GET /api/admin/products/:id

Response: { ...full product data... }
```

#### Create Product
```
POST /api/admin/products
Body: {
  "name": "Product Name",
  "slug": "product-slug",
  "description": "Description",
  "price": "100000",
  "category_id": "uuid",
  "image_main": "image_url",
  "stock_count": 50,
  "min_order": 1,
  "in_stock": true,
  "is_active": true,
  "properties": "JSON",
  "colors": "JSON"
}

Response: { id, name, ... }
```

#### Update Product
```
PUT /api/admin/products/:id
Body: { name, description, price, ... }

Response: { ...updated product... }
```

#### Delete Product
```
DELETE /api/admin/products/:id

Response: { success: true }
```

#### Update Stock
```
PUT /api/admin/products/:id/stock
Body: { stock: 100 }

Response: { id, stock_count: 100 }
```

#### Update Status
```
PUT /api/admin/products/:id/status
Body: { is_active: true|false }

Response: { id, is_active: true|false }
```

---

### Users Management

#### List Users
```
GET /api/admin/users
Query: ?page=1&limit=50&status=pending&search=keyword

Response:
{
  "users": [
    {
      "id": "uuid",
      "phone": "09XXXXXXXXX",
      "name": "Name",
      "store_name": "Store",
      "role": "user",
      "status": "pending|active|rejected",
      "vip_level": "Bronze",
      "total_spent": "0",
      "created_at": "2026-01-27T12:00:00Z"
    }
  ],
  "pagination": { page, limit, total, pages }
}
```

#### Get User
```
GET /api/admin/users/:id

Response: { ...user details... }
```

#### Approve User
```
PUT /api/admin/users/:id/approve

Response: { id, status: "active", ... }
```

#### Reject User
```
PUT /api/admin/users/:id/reject

Response: { id, status: "rejected", ... }
```

---

### Orders Management

#### List Orders
```
GET /api/admin/orders
Query: ?page=1&limit=50&status=pending_payment&user_id=uuid

Response:
{
  "orders": [ ... ],
  "pagination": { page, limit, total, pages }
}
```

#### Update Order Status
```
PUT /api/admin/orders/:id/status
Body: { 
  "status": "paid|processing|shipped|delivered|cancelled",
  "tracking_code": "1234567890" (optional)
}

Response: { id, status, tracking_code, ... }
```

#### Reject Receipt
```
PUT /api/admin/orders/:id/reject-receipt

Response: { 
  "id": "ORD-123456",
  "status": "pending_payment",
  "receipt_url": null
}
```

---

## Error Responses

### Standard Error Format
```json
{
  "error": "Error message in Persian",
  "details": "Additional details (only in development)"
}
```

### Common HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid data |
| 401 | Unauthorized - No auth token |
| 403 | Forbidden - No permission |
| 404 | Not Found |
| 422 | Validation Error |
| 429 | Too Many Requests - Rate limited |
| 500 | Server Error |

### Example Error Responses

**Validation Error:**
```json
{
  "errors": [
    {
      "value": "invalid_phone",
      "msg": "شماره موبایل معتبر نیست",
      "param": "phone",
      "location": "body"
    }
  ]
}
```

**Rate Limit Error:**
```json
{
  "error": "بیش از حد درخواست ارسال کرده‌اید. لطفا بعدا تلاش کنید."
}
```

---

## Rate Limiting

- **OTP Send**: 3 attempts per phone per 24 hours
- **OTP Verify**: 5 attempts per phone per 24 hours
- **Create Order**: 10 per minute per user
- **API General**: 100 requests per 15 minutes per IP

---

## Data Models

### User
```typescript
{
  id: string (UUID)
  phone: string (unique)
  name?: string
  store_name?: string
  role: "user" | "admin"
  status: "pending" | "active" | "rejected"
  vip_level: "Bronze" | "Silver" | "Gold" | "Diamond"
  total_spent: string
  wallet_balance: string
  created_at: Date
  updated_at: Date
}
```

### Product
```typescript
{
  id: string (UUID)
  name: string
  slug: string (unique)
  description?: string
  price: string
  category_id: string (UUID)
  image_main?: string
  stock_count: number
  min_order: number
  in_stock: boolean
  is_active: boolean
  properties?: string (JSON)
  colors?: string (JSON)
  created_at: Date
  updated_at: Date
}
```

### Order
```typescript
{
  id: string (unique)
  user_id: string (UUID)
  status: "pending_payment" | "paid" | "processing" | "shipped" | "cancelled"
  total_amount: string
  discount_amount: string
  final_amount: string
  items: string (JSON)
  shipping_address?: string
  receipt_url?: string
  tracking_code?: string
  created_at: Date
  updated_at: Date
}
```

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default 1)
- `limit`: Items per page (default 20)

**Response:**
```json
{
  "items": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

---

## Environment Variables

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your_secret_key
REDIS_URL=redis://host:6379
SMS_API_KEY=your_sms_api_key
```

---

## WebSocket Events (Chat)

### Connect
```
Event: "connection"
Returns: { message: "Connected", user: { id, name, role } }
```

### Send Message
```
Emit: "message" with { content: "message text", type: "user|admin" }
Broadcast: "message" with full message object
```

### Disconnect
```
Event: "disconnect"
Auto cleanup
```

---

## Testing

### Test Credentials

**Admin User:**
- Phone: 09990000000
- Role: admin
- Status: active

**Regular User:**
- Phone: 09121234567
- Role: user
- Status: active

### Development Mode

In development:
- OTP code is returned in response: `{ code: "12345" }`
- Mock admin token accepted: `Authorization: Bearer mock-admin-token`
- CORS enabled for localhost:3000, 5173

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- All prices are in Rials (ریال)
- Phone numbers must be valid Iranian format (0912-0999)
- All text responses are in Persian (فارسی)
- Pagination limit max is 100
