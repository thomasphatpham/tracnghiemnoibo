# Design Spec: DEPT_MANAGER Role & Permissions System

**Date:** 2026-10-14  
**Status:** Approved — ready for implementation  
**Author:** Brainstorming session (AI + user)

---

## 1. Overview

Hệ thống hiện tại có 2 role: `ADMIN` và `EMPLOYEE`. Spec này mô tả việc thêm role mới `DEPT_MANAGER` (Quản lý phòng ban) với các đặc điểm:

- Mỗi `DEPT_MANAGER` gắn với **đúng 1 phòng ban** (dùng `departmentId` có sẵn trong `User`)
- Admin cấu hình quyền cho `DEPT_MANAGER` qua UI (dynamic, lưu DB)
- `DEPT_MANAGER` chỉ thấy/thao tác dữ liệu của phòng ban mình (data isolation chặt)
- Giao diện riêng tại `/manager/*`, menu ẩn theo permission
- Đồng thời sửa 2 bug trong Audit Log: IP không chính xác + log ẩn danh

**Constraints:**
- Không ảnh hưởng luồng `ADMIN` và `EMPLOYEE` hiện có
- Additive only — không xóa/thay đổi bảng hiện có
- Minimize code mới, tái dùng pattern hiện có

---

## 2. Database Schema Changes

### 2.1 Role Enum

```prisma
enum Role {
  ADMIN
  DEPT_MANAGER   // NEW
  EMPLOYEE
}
```

### 2.2 Bảng `permissions` (danh sách quyền có thể grant)

```prisma
model Permission {
  id        String   @id @default(uuid())
  resource  String   // "questions", "exams", "reports"
  action    String   // "read", "create", "update", "delete", "import", "export", "publish"
  label     String   // Nhãn hiển thị trên UI admin
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())

  rolePermissions RolePermission[]

  @@unique([resource, action])
  @@map("permissions")
}
```

### 2.3 Bảng `role_permissions` (quyền được admin grant)

```prisma
model RolePermission {
  id           String     @id @default(uuid())
  role         Role
  permissionId String
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  createdAt    DateTime   @default(now())
  grantedBy    String?    // userId của admin đã grant

  @@unique([role, permissionId])
  @@map("role_permissions")
}
```

### 2.4 Seed Data — Danh sách `permissions`

| resource  | action  | label                     | sortOrder |
|-----------|---------|---------------------------|-----------|
| questions | read    | Xem câu hỏi               | 10        |
| questions | create  | Tạo câu hỏi               | 11        |
| questions | update  | Sửa câu hỏi               | 12        |
| questions | delete  | Xóa câu hỏi               | 13        |
| questions | import  | Import câu hỏi từ Excel   | 14        |
| exams     | read    | Xem đề thi                | 20        |
| exams     | create  | Tạo đề thi                | 21        |
| exams     | update  | Sửa đề thi                | 22        |
| exams     | publish | Xuất bản/Thu hồi đề thi   | 23        |
| exams     | delete  | Xóa đề thi                | 24        |
| reports   | read    | Xem thống kê kết quả      | 30        |
| reports   | export  | Xuất báo cáo Excel        | 31        |

---

## 3. Backend Architecture

### 3.1 Permission System Flow

```
HTTP Request
    │
    ▼
JwtAuthGuard ──── valid token ──► extract user (id, role, departmentId, permissions[])
    │
    ▼
PermissionsGuard
    ├── role === ADMIN → PASS (full access, no check)
    ├── role === DEPT_MANAGER → check @RequirePermission metadata vs user.permissions[]
    │       └── permission not found → 403 ForbiddenException
    └── role === EMPLOYEE → check @Roles metadata (existing behavior)
```

### 3.2 Decorator mới `@RequirePermission`

File: `backend/src/common/decorators/require-permission.decorator.ts`

```ts
export const PERMISSION_KEY = 'permission';
export const RequirePermission = (resource: string, action: string) =>
  SetMetadata(PERMISSION_KEY, `${resource}:${action}`);
```

### 3.3 `PermissionsGuard` (upgrade từ `RolesGuard`)

File: `backend/src/common/guards/permissions.guard.ts`

Logic:
1. Đọc `@Roles` metadata → nếu có `ADMIN` only → block `DEPT_MANAGER`
2. Đọc `@RequirePermission` metadata → check `user.permissions.includes(resource:action)`
3. Nếu không có decorator nào → pass (backward compat)
4. `ADMIN` luôn pass qua toàn bộ checks

`RolesGuard` hiện tại vẫn giữ nguyên — `PermissionsGuard` là class mới thay thế vai trò của nó ở module-level.

### 3.4 JWT Payload mở rộng

```ts
interface JwtPayload {
  sub: string;
  role: Role;
  departmentId: string | null;
  permissions: string[]; // ["questions:read", "questions:create", ...]
}
```

Permissions load từ DB khi login (`AuthService.login()`), cache trong JWT token. Không cần DB lookup mỗi request.

**Trade-off:** Khi admin thay đổi quyền → user `DEPT_MANAGER` cần logout/login lại để nhận token mới. Đây là hành vi chấp nhận được (admin notify manager).

### 3.5 Data Isolation — Service Layer

Mỗi service method nhận thêm `currentUser: AuthUser` parameter. Khi `role === DEPT_MANAGER`, tự động filter/scope theo `departmentId`:

**QuestionsService:**
- `findAll(query, user)` → thêm `WHERE departmentId = user.departmentId`
- `create(dto, user)` → force `dto.departmentId = user.departmentId`
- `update(id, dto, user)` → verify `question.departmentId === user.departmentId` trước khi update
- `delete(id, user)` → verify ownership trước khi delete

**ExamsService:**
- Exam không có `departmentId` trực tiếp. Khi `DEPT_MANAGER`:
  - `findAll` → chỉ trả exam mà `ExamDepartmentRule.departmentId = user.departmentId`
  - `create` → tự động tạo `ExamDepartmentRule` với 100% cho phòng mình
  - `update/delete` → verify exam thuộc phòng mình

**ReportsService (module mới):**
- `getMyDepartmentStats(user)` → filter `ExamAttempt` theo `user.departmentId`

### 3.6 Modules Backend mới/sửa

| Module | Thay đổi |
|--------|----------|
| `prisma/schema.prisma` | Thêm enum value, 2 model mới |
| `prisma/seed.ts` | Seed 12 permissions mặc định |
| `auth/auth.service.ts` | Load permissions khi login, embed vào JWT |
| `auth/jwt.strategy.ts` | Validate + return `permissions[]` trong user object |
| `common/decorators/require-permission.decorator.ts` | **MỚI** |
| `common/guards/permissions.guard.ts` | **MỚI** (không xóa roles.guard.ts) |
| `common/decorators/auth-user.interface.ts` | **MỚI** — type AuthUser |
| `questions/questions.controller.ts` | Thêm `@RequirePermission`, inject `@CurrentUser` |
| `questions/questions.service.ts` | Thêm user param, data isolation logic |
| `exams/exams.controller.ts` | Thêm `@RequirePermission`, inject `@CurrentUser` |
| `exams/exams.service.ts` | Thêm user param, data isolation logic |
| `reports/reports.controller.ts` | **MỚI endpoint** `/reports/my-department` |
| `reports/reports.service.ts` | **MỚI method** `getMyDepartmentStats()` |
| `permissions/permissions.module.ts` | **MỚI** — CRUD API cho permissions |
| `permissions/permissions.controller.ts` | **MỚI** — Admin-only endpoints |
| `permissions/permissions.service.ts` | **MỚI** — grant/revoke logic |

---

## 4. Frontend Architecture

### 4.1 Route Structure

```
/                     → redirect theo role (hiện có)
/admin/*              → ADMIN only (hiện có)
/employee/*           → EMPLOYEE only (hiện có)
/manager/*            → DEPT_MANAGER only (MỚI)
  /manager/dashboard
  /manager/questions
  /manager/questions/new
  /manager/questions/[id]/edit
  /manager/exams
  /manager/exams/new
  /manager/exams/[id]/edit
  /manager/reports
```

**Login flow:** Cùng `/login`. Sau khi login, redirect:
- `ADMIN` → `/admin/dashboard`
- `DEPT_MANAGER` → `/manager/dashboard`
- `EMPLOYEE` → `/employee/dashboard`

### 4.2 Auth Context mở rộng

```ts
interface AuthUser {
  id: string;
  role: 'ADMIN' | 'DEPT_MANAGER' | 'EMPLOYEE';
  departmentId: string | null;
  permissions: string[]; // ["questions:read", ...]
}
```

Hook `usePermissions()`:
```ts
function usePermissions() {
  const { user } = useAuth();
  const can = (resource: string, action: string) => {
    if (user?.role === 'ADMIN') return true;
    return user?.permissions.includes(`${resource}:${action}`) ?? false;
  };
  return { can };
}
```

### 4.3 Component `<PermissionGate>`

```tsx
<PermissionGate resource="exams" action="delete">
  <Button danger>Xóa đề thi</Button>
</PermissionGate>
```
→ Render `null` nếu không có quyền.

### 4.4 Manager Layout

File: `frontend/src/app/(manager)/manager/layout.tsx`  
- Sidebar tương tự admin nhưng chỉ hiển thị menu items mà user có permission
- Guard middleware: redirect về `/login` nếu role không phải `DEPT_MANAGER`

### 4.5 Admin — Trang quản lý Permissions

**Route:** `/admin/permissions`

UI gồm:
- Danh sách permissions nhóm theo resource (Câu hỏi, Đề thi, Báo cáo)
- Toggle switch cho từng permission
- Nút "Lưu thay đổi" → gọi API PATCH `/api/permissions/role/DEPT_MANAGER`
- Note: "Thay đổi có hiệu lực sau khi Quản lý phòng ban đăng xuất/đăng nhập lại"

---

## 5. Statistics Module (Dept Manager)

### 5.1 Backend Endpoint

`GET /reports/my-department?page=1&limit=20&examId=...&search=...`

Response:
```json
{
  "department": { "id": "...", "name": "Phòng Kỹ Thuật" },
  "summary": {
    "totalEmployees": 25,
    "totalAttempts": 120,
    "passRate": 75.5,
    "avgScore": 7.2
  },
  "employees": [
    {
      "userId": "...",
      "fullName": "Nguyễn Văn A",
      "attempts": [
        { "examName": "...", "score": 8.5, "isPassed": true, "submittedAt": "..." }
      ]
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 25 }
}
```

`GET /reports/my-department/export` → file Excel

### 5.2 Frontend `/manager/reports`

- Bảng danh sách nhân sự phòng ban
- Filter theo: tên, đề thi, trạng thái (đậu/rớt), khoảng thời gian
- Card tổng quan: tổng nhân sự, tổng lượt thi, tỉ lệ đậu, điểm TB
- Button Export Excel

---

## 6. Audit Log Fixes

### 6.1 Fix IP Address

Thêm helper function vào `audit-logs.service.ts` (hoặc common util):

```ts
export function getRealIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'] as string;
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress ?? req.ip ?? 'unknown';
}
```

Tất cả nơi gọi `auditLogsService.log()` đang dùng `request.ip` → thay bằng `getRealIp(request)`.

### 6.2 Fix Anonymous Logs

Các action hệ thống tự động (auto-submit khi hết giờ, expire) phải log rõ ràng:

```ts
await auditLogsService.log({
  userId: null,
  action: 'SYSTEM_AUTO_SUBMIT',   // thay vì SUBMIT_EXAM
  entity: 'ExamAttempt',
  entityId: attempt.id,
  details: { reason: 'Timer expired', examId: attempt.examId },
  ipAddress: 'SYSTEM',            // thay vì null
});
```

Frontend hiển thị:
- `userId === null && ipAddress === 'SYSTEM'` → "Hệ thống (tự động)"
- `userId === null && ipAddress !== 'SYSTEM'` → "Vô danh"

---

## 7. API Endpoints Summary

### Permissions Module (mới)

| Method | Endpoint | Guard | Mô tả |
|--------|----------|-------|-------|
| GET | `/permissions` | ADMIN | Danh sách tất cả permissions |
| GET | `/permissions/role/DEPT_MANAGER` | ADMIN | Permissions hiện tại của DEPT_MANAGER |
| PUT | `/permissions/role/DEPT_MANAGER` | ADMIN | Update danh sách permissions (bulk) |

### Reports (mở rộng)

| Method | Endpoint | Guard | Mô tả |
|--------|----------|-------|-------|
| GET | `/reports/my-department` | DEPT_MANAGER + `reports:read` | Thống kê phòng ban |
| GET | `/reports/my-department/export` | DEPT_MANAGER + `reports:export` | Export Excel |

---

## 8. Test Cases

### 8.1 Backend Unit Tests

**PermissionsGuard:**
- ADMIN → luôn pass, không check permissions
- DEPT_MANAGER có quyền `questions:read` → pass GET /questions
- DEPT_MANAGER không có quyền `questions:delete` → 403
- EMPLOYEE → không bị check permission (dùng RolesGuard cũ)

**Data Isolation:**
- DEPT_MANAGER phòng A tạo question → question.departmentId = A
- DEPT_MANAGER phòng A gọi GET /questions → chỉ thấy question của phòng A
- DEPT_MANAGER phòng A cố update question của phòng B → 403

**AuthService:**
- Login với DEPT_MANAGER → JWT chứa `permissions[]`
- Login với ADMIN → JWT không có permissions (không cần)
- Login với EMPLOYEE → JWT không có permissions

### 8.2 Backend E2E Tests

- Full flow: login DEPT_MANAGER → tạo question → verify departmentId scope
- Full flow: admin grant `exams:create` → DEPT_MANAGER login lại → tạo được exam
- Full flow: admin revoke `exams:create` → DEPT_MANAGER login lại → 403 khi tạo exam

### 8.3 Frontend Tests

- `usePermissions().can('questions', 'create')` trả `true` khi user có quyền
- `<PermissionGate>` render children khi có quyền, render null khi không
- Manager layout redirect về `/login` nếu role là ADMIN hoặc EMPLOYEE

---

## 9. Migration & Deployment

1. `prisma migrate dev` — tạo 2 bảng mới, thêm enum value
2. `prisma db seed` — seed 12 permissions mặc định
3. Deploy backend
4. Deploy frontend
5. Admin đăng nhập → `/admin/permissions` → cấu hình quyền cho DEPT_MANAGER
6. Tạo user với role `DEPT_MANAGER` gắn `departmentId`
7. DEPT_MANAGER login và dùng

**Không cần rollback kế hoạch** — thay đổi hoàn toàn additive, không ảnh hưởng ADMIN/EMPLOYEE.
