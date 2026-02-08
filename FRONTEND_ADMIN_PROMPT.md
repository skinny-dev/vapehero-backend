# Frontend Admin Panel – Implementation Prompt

Use this prompt to implement the admin panel **Users & Permissions** UI for the VapeHero B2B wholesale app.

---

## Context

- **Backend API base:** `https://api.vapehero.runflare.run` (or your backend URL)
- **Auth:** JWT in `Authorization: Bearer <token>` header
- **API docs:** See `ADMIN_API_DOCS.md` in the backend repo

---

## Required Features

### 1. Admin Users Management Page (`/admin/users`)

Build a page that lists users and supports full CRUD, role assignment, and ban/unban.

**UI Elements:**

- **Data table** with columns: Phone, Name, Store Name, Role, Status, VIP Level, Created At, Actions
- **Filters:** Status (pending, active, rejected, banned), Role (super_admin, admin, manager, writer, user), Search (phone, name, store_name)
- **Pagination**
- **Actions per row:**
  - Edit (opens edit modal)
  - Approve (if status = pending)
  - Reject (if status = pending)
  - Ban (if status = active)
  - Unban (if status = banned)
  - Manage Permissions (opens permissions modal)
  - Delete (with confirmation; only if user has no orders)
- **“Add User” button** – opens create-user modal (only for users with `users.manage` permission)
- **Role badges** with distinct colors (super_admin, admin, manager, writer, user)
- **Status badges** (pending, active, rejected, banned)

**Modals:**

- **Create User Modal:** phone (required), name, store_name, role (dropdown – roles from `GET /api/admin/roles`)
- **Edit User Modal:** name, store_name, role, status, vip_level, wallet_balance
- **Permissions Modal:** list of all permissions from `GET /api/admin/permissions` as checkboxes; current user permissions pre-checked; Save updates via `PUT /api/admin/users/:id/permissions`

**API Endpoints:**

- `GET /api/admin/users` – list (query: page, limit, status, role, search)
- `GET /api/admin/users/:id` – single user
- `POST /api/admin/users` – create (body: phone, name, store_name, role)
- `PUT /api/admin/users/:id` – update
- `DELETE /api/admin/users/:id` – delete
- `PATCH /api/admin/users/:id/approve` – approve
- `PATCH /api/admin/users/:id/reject` – reject
- `PATCH /api/admin/users/:id/ban` – ban
- `PATCH /api/admin/users/:id/unban` – unban
- `GET /api/admin/roles` – roles for dropdowns
- `GET /api/admin/statuses` – status options
- `GET /api/admin/permissions` – all permissions
- `GET /api/admin/users/:id/permissions` – user permissions
- `PUT /api/admin/users/:id/permissions` – set user permissions (body: `{ permissions: ["users.view", ...] }`)

---

### 2. Admin Permissions Management Page (`/admin/permissions`)

Build a page to manage permission definitions.

**UI Elements:**

- **Data table** with: Key, Name, Description, Actions (Edit, Delete)
- **“Add Permission”** button
- **Create/Edit modal:** key (required), name (required), description

**API Endpoints:**

- `GET /api/admin/permissions` – list
- `POST /api/admin/permissions` – create
- `PUT /api/admin/permissions/:id` – update
- `DELETE /api/admin/permissions/:id` – delete

---

### 3. Current User & Permission Checks

- On admin app load, call `GET /api/admin/me` to get:
  - `role` (super_admin, admin, manager, writer, user)
  - `permissions` (array of permission keys)
- **super_admin:** show all UI, bypass permission checks
- **admin / manager:** show/hide actions and pages based on `permissions` array
- Example: show “Add User” only if `permissions.includes('users.manage')` or `role === 'super_admin'`

---

### 4. Default Roles Reference

| Role        | Label      | Description                 |
| ----------- | ---------- | --------------------------- |
| super_admin | سوپر ادمین | Full access                 |
| admin       | ادمین      | Access based on permissions |
| manager     | مدیر       | Limited admin access        |
| writer      | نویسنده    | Content management          |
| user        | کاربر      | Regular user                |

---

### 5. Default Permissions Reference

- `users.view` – مشاهده کاربران
- `users.edit` – ویرایش کاربران
- `users.delete` – حذف کاربران
- `users.approve` – تایید کاربران
- `users.reject` – رد کاربران
- `users.manage` – مدیریت کاربران (create, assign roles)
- `orders.view` – مشاهده سفارشات
- `orders.update_status` – تغییر وضعیت سفارش
- `permissions.view` – مشاهده مجوزها
- `permissions.manage` – مدیریت مجوزها

---

### 6. UI/UX Guidelines

- RTL layout (Persian)
- Use existing design system (colors, typography, spacing)
- Toast/notification for success and error
- Loading states for tables and buttons
- Confirmation dialogs for destructive actions (delete, ban)
- Responsive design; tables usable on tablet/desktop

---

### 7. Navigation

Add sidebar/menu entries:

- **کاربران** → `/admin/users`
- **مجوزها** → `/admin/permissions`

Show these based on `role` and `permissions`:

- Users: `permissions.includes('users.view')` or super_admin
- Permissions: `permissions.includes('permissions.view')` or super_admin

---

## Testing

- Super admin (e.g. 09938883360) should see all users, permissions, and actions
- Admin with selected permissions should see only allowed sections
- Banned users should not be able to log in
