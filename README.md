# VapeHero Backend API

بک‌اند اپلیکیشن عمده‌فروشی VapeHero با استفاده از Node.js, Express, PostgreSQL و Prisma

## ویژگی‌ها

- ✅ احراز هویت با OTP (کد 5 رقمی)
- ✅ مدیریت کاربران با سطوح VIP
- ✅ مدیریت محصولات و موجودی
- ✅ سیستم سفارش‌دهی با رزرو موجودی
- ✅ پنل مدیریت کامل
- ✅ یکپارچه‌سازی با Gemini AI برای چت‌بات
- ✅ Rate Limiting و امنیت
- ✅ پشتیبانی از Redis برای OTP و رزرو موجودی

## نصب و راه‌اندازی

### پیش‌نیازها

- Node.js 18+
- PostgreSQL 14+
- Redis (اختیاری - برای OTP و رزرو موجودی)

### مراحل نصب

1. نصب وابستگی‌ها:
```bash
cd backend
npm install
```

2. تنظیم فایل `.env`:
```bash
cp .env.example .env
```

و مقادیر را با اطلاعات خود پر کنید.

3. راه‌اندازی دیتابیس:
```bash
# تولید Prisma Client
npm run prisma:generate

# اجرای migration
npm run prisma:migrate

# (اختیاری) پر کردن دیتابیس با داده‌های نمونه
npm run prisma:seed
```

4. اجرای سرور:
```bash
# حالت توسعه
npm run dev

# حالت production
npm start
```

## ساختار API

### احراز هویت

- `POST /api/auth/send-otp` - ارسال کد تایید
- `POST /api/auth/verify-otp` - تایید کد و دریافت Token
- `POST /api/auth/register` - تکمیل اطلاعات کاربر

### محصولات

- `GET /api/products` - لیست محصولات (با فیلتر و pagination)
- `GET /api/products/:slug` - جزئیات محصول

### دسته‌بندی‌ها

- `GET /api/categories` - لیست درختی دسته‌بندی‌ها
- `GET /api/categories/:slug` - جزئیات دسته‌بندی

### پروفایل کاربر

- `GET /api/profile` - اطلاعات کاربر و سطح VIP
- `GET /api/profile/orders` - لیست سفارشات کاربر

### سفارشات

- `POST /api/orders` - ثبت سفارش جدید
- `PUT /api/orders/:id/upload-receipt` - آپلود فیش واریزی
- `GET /api/orders/:id` - جزئیات سفارش

### پنل مدیریت (نیازمند نقش admin)

- `GET /api/admin/stats` - آمار داشبورد
- `GET /api/admin/products` - لیست محصولات
- `POST /api/admin/products` - ایجاد محصول
- `PUT /api/admin/products/:id` - به‌روزرسانی محصول
- `DELETE /api/admin/products/:id` - حذف محصول
- `PATCH /api/admin/products/:id/stock` - به‌روزرسانی موجودی
- `GET /api/admin/users` - لیست کاربران
- `PATCH /api/admin/users/:id/approve` - تایید کاربر
- `GET /api/admin/orders` - لیست سفارشات
- `PATCH /api/admin/orders/:id/status` - تغییر وضعیت سفارش
- `GET /api/admin/settings` - دریافت تنظیمات
- `PUT /api/admin/settings` - به‌روزرسانی تنظیمات

### چت‌بات

- `POST /api/chat` - ارسال پیام به چت‌بات

## امنیت

- Rate Limiting برای جلوگیری از سوء استفاده
- JWT Authentication برای محافظت از route های حساس
- بررسی دقیق فایل‌های آپلودی
- مخفی نگه داشتن قیمت‌ها از کاربران غیرفعال

## Business Logic

### محاسبه تخفیف VIP

سیستم به صورت خودکار بر اساس `total_spent` کاربر و تنظیمات VIP، تخفیف را محاسبه می‌کند.

### رزرو موجودی

هنگام ثبت سفارش، موجودی به مدت 2 ساعت رزرو می‌شود. در صورت عدم آپلود فیش، موجودی آزاد می‌شود.

## توسعه

برای مشاهده و مدیریت دیتابیس:
```bash
npm run prisma:studio
```

## لایسنس

MIT


