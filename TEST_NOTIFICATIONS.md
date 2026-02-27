# راهنمای تست Notification ها

این فایل راهنمای استفاده از script های تست برای notification ها است.

## روش 1: استفاده از Script Node.js

### نصب و استفاده

```bash
cd backend

# تست notification ثبت‌نام کاربر
npm run test:notifications:user

# تست notification سفارش جدید
npm run test:notifications:order

# تست همه notification ها
npm run test:notifications:all
```

یا مستقیماً:

```bash
node test-notifications.js user
node test-notifications.js order
node test-notifications.js all
```

### نکات مهم

1. **Backend باید در حال اجرا باشد** - Script از Socket.io استفاده می‌کند
2. **Admin Panel باید باز باشد** - برای دیدن notification ها
3. **Browser Notification Permission** - باید permission داده باشید

### خروجی

Script یک کاربر یا سفارش تست ایجاد می‌کند و notification را emit می‌کند. باید:
- در Console backend لاگ ببینید
- در Console frontend (admin panel) لاگ ببینید
- Browser notification نمایش داده شود
- Notification در پنل مدیریت ظاهر شود

## روش 2: استفاده از API Endpoint (پیشنهادی)

### استفاده

```bash
# تست notification ثبت‌نام کاربر
curl -X POST http://localhost:3001/api/admin/test-notification \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "user_reg"}'

# تست notification سفارش جدید
curl -X POST http://localhost:3001/api/admin/test-notification \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "order_new"}'
```

یا از Postman/Thunder Client استفاده کنید.

### مزایا

- استفاده از همان Socket.io instance که server استفاده می‌کند
- نیاز به اجرای script جداگانه ندارد
- می‌تواند از UI استفاده شود

## روش 3: اضافه کردن دکمه تست در Admin Panel (اختیاری)

می‌توانید یک دکمه در Admin Panel اضافه کنید که این endpoint را صدا بزند.

## Troubleshooting

### Notification نمی‌آید؟

1. بررسی کنید که backend در حال اجرا است
2. بررسی کنید که admin panel باز است و WebSocket متصل است
3. Console را چک کنید برای error ها
4. Browser notification permission را چک کنید

### Socket.io not initialized

- مطمئن شوید که backend در حال اجرا است
- بررسی کنید که `setAdminIO(io)` در `server.js` فراخوانی شده

### No pending user/order found

- برای تست user_reg: یک کاربر pending ایجاد کنید
- برای تست order_new: یک سفارش pending_payment ایجاد کنید


