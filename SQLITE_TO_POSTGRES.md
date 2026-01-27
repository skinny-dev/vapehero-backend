# Migration Guide: SQLite to PostgreSQL

این راهنما برای زمانی است که بخواهید از SQLite به PostgreSQL مهاجرت کنید.

## تغییرات Schema

برای PostgreSQL، باید فایل `prisma/schema.prisma` را به‌روزرسانی کنید:

### 1. تغییر Datasource
```prisma
datasource db {
  provider = "postgresql"  // تغییر از sqlite
  url      = env("DATABASE_URL")
}
```

### 2. تبدیل Enumها از String به Enum
SQLite از Enum پشتیبانی نمی‌کند، اما PostgreSQL دارد.

### 3. تبدیل Decimal Fields
SQLite: `String` → PostgreSQL: `Decimal @db.Decimal(12, 2)`

### 4. تبدیل JSON Fields  
SQLite: `String` → PostgreSQL: `Json`

## تغییرات کد

بعد از تغییر Schema، باید JSON.parse/JSON.stringify را حذف کنید.

## مراحل Migration

1. تغییر `.env` به PostgreSQL URL
2. به‌روزرسانی schema.prisma
3. اجرای migration
4. به‌روزرسانی کد
5. تست کامل
