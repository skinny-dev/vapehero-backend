# مستندات API پنل مدیریت

این فایل شامل تمام endpoint های پنل مدیریت است.

## احراز هویت

همه route های زیر نیازمند:
- Header: `Authorization: Bearer <token>`
- نقش کاربر: `admin`

---

## 1. آمار و داشبورد

### GET /api/admin/stats
دریافت آمار کلی سیستم

**Response:**
```json
{
  "users": {
    "total": 150,
    "pending": 5
  },
  "orders": {
    "total": 500,
    "pending": 12
  },
  "revenue": {
    "total": "500000000",
    "monthly": "50000000"
  }
}
```

---

## 2. دسته‌بندی‌ها (Categories)

### GET /api/admin/categories
لیست دسته‌بندی‌ها

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 50)
- `parent_id` (optional)
- `search` (optional)

### GET /api/admin/categories/:id
جزئیات یک دسته‌بندی

### POST /api/admin/categories
ایجاد دسته‌بندی جدید

**Body:**
```json
{
  "name": "دستگاه‌های ویپ",
  "slug": "vape-devices",
  "description": "توضیحات",
  "parent_id": null,
  "image": "/images/category.jpg",
  "order": 0
}
```

### PUT /api/admin/categories/:id
به‌روزرسانی دسته‌بندی

### DELETE /api/admin/categories/:id
حذف دسته‌بندی (فقط اگر محصول یا زیرمجموعه نداشته باشد)

---

## 3. محصولات (Products)

### GET /api/admin/products
لیست محصولات

**Query Parameters:**
- `page`, `limit`
- `search`
- `category` (category_id)

### GET /api/admin/products/:id
جزئیات یک محصول

### POST /api/admin/products
ایجاد محصول جدید

**Body:**
```json
{
  "name": "ویپ پاد پرو",
  "slug": "vape-pod-pro",
  "description": "توضیحات",
  "price": "2500000",
  "category_id": "uuid",
  "image_main": "/images/product.jpg",
  "stock_count": 100,
  "min_order": 5,
  "in_stock": true,
  "properties": {
    "battery": "2000mAh",
    "power": "40W"
  },
  "colors": [
    {
      "name": "مشکی",
      "code": "#000000",
      "images": ["/images/black.jpg"]
    }
  ]
}
```

### PUT /api/admin/products/:id
به‌روزرسانی محصول

### DELETE /api/admin/products/:id
حذف محصول

### PATCH /api/admin/products/:id/stock
به‌روزرسانی موجودی

**Body:**
```json
{
  "stock_count": 150,
  "in_stock": true
}
```

---

## 4. کاربران (Users)

### GET /api/admin/users
لیست کاربران

**Query Parameters:**
- `page`, `limit`
- `status` (active, pending, rejected)
- `search`

### GET /api/admin/users/:id
جزئیات یک کاربر

### PUT /api/admin/users/:id
به‌روزرسانی کاربر

**Body:**
```json
{
  "name": "نام",
  "store_name": "نام فروشگاه",
  "role": "user",
  "status": "active",
  "vip_level": "Gold",
  "wallet_balance": "100000"
}
```

### DELETE /api/admin/users/:id
حذف کاربر (فقط اگر سفارش نداشته باشد)

### PATCH /api/admin/users/:id/approve
تایید کاربر (وضعیت → active)

### PATCH /api/admin/users/:id/reject
رد کاربر (وضعیت → rejected)

---

## 5. سفارشات (Orders)

### GET /api/admin/orders
لیست سفارشات

**Query Parameters:**
- `page`, `limit`
- `status`

### PATCH /api/admin/orders/:id/status
تغییر وضعیت سفارش

**Body:**
```json
{
  "status": "paid",
  "tracking_code": "TRACK123"
}
```

---

## 6. مارکتینگ و تخفیفات (Discounts)

### GET /api/admin/discounts
لیست تخفیف‌ها

**Query Parameters:**
- `page`, `limit`
- `is_active` (true/false)
- `search`

### GET /api/admin/discounts/:id
جزئیات یک تخفیف

### POST /api/admin/discounts
ایجاد تخفیف جدید

**Body:**
```json
{
  "name": "تخفیف ویژه",
  "code": "SPECIAL20",
  "type": "percentage",
  "value": "20",
  "min_purchase": "100000",
  "max_discount": "50000",
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-12-31T23:59:59Z",
  "is_active": true,
  "usage_limit": 100,
  "description": "توضیحات"
}
```

### PUT /api/admin/discounts/:id
به‌روزرسانی تخفیف

### DELETE /api/admin/discounts/:id
حذف تخفیف

---

## 7. سئو و محتوا (Posts)

### GET /api/admin/posts
لیست مقالات

**Query Parameters:**
- `page`, `limit`
- `status` (draft, published)
- `search`
- `author_id`

### GET /api/admin/posts/:id
جزئیات یک مقاله

### POST /api/admin/posts
ایجاد مقاله جدید

**Body:**
```json
{
  "title": "عنوان مقاله",
  "slug": "article-slug",
  "content": "محتوای مقاله",
  "author_id": "user-uuid",
  "meta_description": "توضیحات متا",
  "focus_keyword": "کلمه کلیدی",
  "seo_score": 85,
  "status": "published"
}
```

### PUT /api/admin/posts/:id
به‌روزرسانی مقاله

### DELETE /api/admin/posts/:id
حذف مقاله

---

## 8. رسانه و فایل‌ها (Media)

### GET /api/admin/media
لیست فایل‌ها

**Query Parameters:**
- `page`, `limit`
- `category` (product, blog, general)
- `search`

### GET /api/admin/media/:id
جزئیات یک فایل

### POST /api/admin/media/upload
آپلود فایل جدید

**Form Data:**
- `file` (file) - فایل برای آپلود
- `category` (optional) - دسته‌بندی
- `alt_text` (optional) - متن جایگزین

**Response:**
```json
{
  "id": "uuid",
  "filename": "1234567890-123456789.jpg",
  "original_name": "image.jpg",
  "mime_type": "image/jpeg",
  "size": 123456,
  "url": "/uploads/media/1234567890-123456789.jpg",
  "category": "product",
  "alt_text": "توضیحات تصویر",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### DELETE /api/admin/media/:id
حذف فایل

---

## 9. تنظیمات (Settings)

### GET /api/admin/settings
دریافت تنظیمات

### PUT /api/admin/settings
به‌روزرسانی تنظیمات

**Body:**
```json
{
  "vip_rules": {
    "Bronze": { "discount": 0, "minSpent": 0 },
    "Silver": { "discount": 5, "minSpent": 10000000 }
  },
  "min_order_amount": "50000"
}
```

---

## نکات مهم

1. همه route های admin نیازمند احراز هویت با نقش `admin` هستند
2. فیلدهای Decimal در SQLite به صورت String ذخیره می‌شوند
3. فیلدهای JSON باید stringify شوند (Prisma خودش handle می‌کند در PostgreSQL)
4. برای آپلود فایل از `multipart/form-data` استفاده کنید
5. Pagination در همه endpoint های لیست پشتیبانی می‌شود


