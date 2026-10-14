# DEPT_MANAGER Role, Permissions & Audit Log Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `DEPT_MANAGER` role with fine-grained dynamic API permissions, strict department data isolation, dedicated manager UI, department statistics, and audit log IP/identity tracking fixes.

**Architecture:** 
- Add `DEPT_MANAGER` to Prisma `Role` enum and create `Permission` and `RolePermission` models.
- NestJS `PermissionsGuard` and `@RequirePermission()` decorator validate permissions dynamically for `DEPT_MANAGER` while `ADMIN` retains full access.
- Services enforce strict department data isolation (`user.departmentId`) when the caller has `role === 'DEPT_MANAGER'`.
- Audit logs capture real client IP via proxy headers (`x-forwarded-for`) and explicit `userId` from request contexts, tagging automated system actions with `SYSTEM`.
- Next.js frontend introduces `/manager/*` routes protected by role and permission gates, with an `/admin/permissions` management screen for administrators.

**Tech Stack:** NestJS, Prisma ORM, PostgreSQL, Passport JWT, Next.js 14 App Router, Tailwind CSS, Lucide icons, ExcelJS.

**Spec:** `docs/superpowers/specs/2026-10-14-dept-manager-role-design.md`

## Global Constraints

- System is currently in production: schema changes MUST be purely additive without dropping or mutating existing tables/columns.
- `ADMIN` role MUST always bypass permission checks and retain full system access across all APIs.
- `EMPLOYEE` role MUST continue to function identically with existing `@Roles(Role.EMPLOYEE)` checks.
- Every `DEPT_MANAGER` account MUST belong to exactly one department (`user.departmentId`).
- Automated tests MUST verify permission gating, data isolation boundaries, and audit logging accuracy.

---

### Task 1: Prisma Schema Migration & Permission Seeding

**Files:**
- Modify: `backend/prisma/schema.prisma:10-15`
- Modify: `backend/prisma/seed.ts`
- Run: Prisma migration command

**Interfaces:**
- Produces: `Role.DEPT_MANAGER`, `prisma.permission`, `prisma.rolePermission`

- [ ] **Step 1: Update Prisma Schema**

In `backend/prisma/schema.prisma`:
Add `DEPT_MANAGER` to enum `Role`, and define `Permission` and `RolePermission` models:

```prisma
enum Role {
  ADMIN
  DEPT_MANAGER
  EMPLOYEE
}

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

model RolePermission {
  id           String     @id @default(uuid())
  role         Role
  permissionId String
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  createdAt    DateTime   @default(now())
  grantedBy    String?

  @@unique([role, permissionId])
  @@map("role_permissions")
}
```

- [ ] **Step 2: Generate Prisma Client & Run Migration**

Run:
```powershell
cd C:\Users\MINHFAT\Desktop\TracNghiemNoiBo\backend
npx prisma migrate dev --name add_dept_manager_and_permissions
```
Expected: Migration created and applied successfully, Prisma Client re-generated.

- [ ] **Step 3: Update Seed Data in `prisma/seed.ts`**

Add seed entries for initial 12 permissions and default grants for `DEPT_MANAGER`:
```typescript
const DEFAULT_PERMISSIONS = [
  { resource: 'questions', action: 'read', label: 'Xem câu hỏi', sortOrder: 10 },
  { resource: 'questions', action: 'create', label: 'Tạo câu hỏi', sortOrder: 11 },
  { resource: 'questions', action: 'update', label: 'Sửa câu hỏi', sortOrder: 12 },
  { resource: 'questions', action: 'delete', label: 'Xóa câu hỏi', sortOrder: 13 },
  { resource: 'questions', action: 'import', label: 'Import câu hỏi từ Excel', sortOrder: 14 },
  { resource: 'exams', action: 'read', label: 'Xem đề thi', sortOrder: 20 },
  { resource: 'exams', action: 'create', label: 'Tạo đề thi', sortOrder: 21 },
  { resource: 'exams', action: 'update', label: 'Sửa đề thi', sortOrder: 22 },
  { resource: 'exams', action: 'publish', label: 'Xuất bản/Thu hồi đề thi', sortOrder: 23 },
  { resource: 'exams', action: 'delete', label: 'Xóa đề thi', sortOrder: 24 },
  { resource: 'reports', action: 'read', label: 'Xem thống kê kết quả phòng ban', sortOrder: 30 },
  { resource: 'reports', action: 'export', label: 'Xuất báo cáo kết quả Excel', sortOrder: 31 },
];

for (const p of DEFAULT_PERMISSIONS) {
  const perm = await prisma.permission.upsert({
    where: { resource_action: { resource: p.resource, action: p.action } },
    update: { label: p.label, sortOrder: p.sortOrder },
    create: p,
  });

  // Grant default questions:read, questions:create, exams:read to DEPT_MANAGER
  if (['questions:read', 'questions:create', 'exams:read', 'reports:read'].includes(`${p.resource}:${p.action}`)) {
    await prisma.rolePermission.upsert({
      where: { role_permissionId: { role: 'DEPT_MANAGER', permissionId: perm.id } },
      update: {},
      create: { role: 'DEPT_MANAGER', permissionId: perm.id },
    });
  }
}
```

- [ ] **Step 4: Execute Seed Script**

Run:
```powershell
cd C:\Users\MINHFAT\Desktop\TracNghiemNoiBo\backend
npx prisma db seed
```
Expected: Seed script completes without errors.

- [ ] **Step 5: Commit changes**

```powershell
git add backend/prisma/schema.prisma backend/prisma/migrations backend/prisma/seed.ts
git commit -m "feat(prisma): add DEPT_MANAGER role, Permission and RolePermission models"
```

---

### Task 2: PermissionsGuard & RequirePermission Decorator

**Files:**
- Create: `backend/src/common/decorators/require-permission.decorator.ts`
- Create: `backend/src/common/guards/permissions.guard.ts`
- Create: `backend/src/common/types/auth-user.type.ts`
- Test: `backend/src/common/guards/permissions.guard.spec.ts`

**Interfaces:**
- Produces: `@RequirePermission(resource, action)`, `PermissionsGuard`
- Consumes: `req.user` with `role: Role`, `permissions: string[]`

- [ ] **Step 1: Write Unit Test for PermissionsGuard**

Create `backend/src/common/guards/permissions.guard.spec.ts`:
```typescript
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { Role } from '@prisma/client';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  function createMockContext(user: any) {
    return {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow ADMIN unconditionally even without permissions', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('questions:delete');
    const ctx = createMockContext({ role: Role.ADMIN, permissions: [] });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow DEPT_MANAGER if permission matches', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('questions:create');
    const ctx = createMockContext({ role: Role.DEPT_MANAGER, permissions: ['questions:create'] });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should deny DEPT_MANAGER if permission missing', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('questions:delete');
    const ctx = createMockContext({ role: Role.DEPT_MANAGER, permissions: ['questions:read'] });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should allow if no permission metadata is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = createMockContext({ role: Role.DEPT_MANAGER, permissions: [] });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
cd C:\Users\MINHFAT\Desktop\TracNghiemNoiBo\backend
npm test -- src/common/guards/permissions.guard.spec.ts
```
Expected: FAIL (Cannot find module './permissions.guard').

- [ ] **Step 3: Implement AuthUser Type, Decorator & PermissionsGuard**

Create `backend/src/common/types/auth-user.type.ts`:
```typescript
import { Role, UserStatus } from '@prisma/client';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  position?: string | null;
  role: Role;
  status: UserStatus;
  departmentId?: string | null;
  department?: { id: string; code: string; name: string } | null;
  permissions?: string[];
  sessionId?: string;
}
```

Create `backend/src/common/decorators/require-permission.decorator.ts`:
```typescript
import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'required_permission';
export const RequirePermission = (resource: string, action: string) =>
  SetMetadata(PERMISSION_KEY, `${resource}:${action}`);
```

Create `backend/src/common/guards/permissions.guard.ts`:
```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      throw new ForbiddenException('Phiên làm việc không xác thực quyền.');
    }

    // 1. ADMIN bypasses all permission checks
    if (user.role === Role.ADMIN) {
      return true;
    }

    // 2. Check Role requirement if specified
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.includes(user.role);
      if (!hasRole) {
        throw new ForbiddenException(`Quyền truy cập bị từ chối: Yêu cầu vai trò [${requiredRoles.join(', ')}]`);
      }
    }

    // 3. Check Granular Permission if specified
    if (requiredPermission) {
      if (user.role === Role.DEPT_MANAGER) {
        const userPerms: string[] = user.permissions || [];
        if (!userPerms.includes(requiredPermission)) {
          throw new ForbiddenException(`Bạn không có quyền thực hiện chức năng này (${requiredPermission}).`);
        }
      } else {
        // Other non-admin roles without permissions check
        throw new ForbiddenException('Vai trò của bạn không được cấp quyền sử dụng chức năng này.');
      }
    }

    return true;
  }
}
```

- [ ] **Step 4: Run unit tests to verify they pass**

Run:
```powershell
cd C:\Users\MINHFAT\Desktop\TracNghiemNoiBo\backend
npm test -- src/common/guards/permissions.guard.spec.ts
```
Expected: PASS with 4 passed tests.

- [ ] **Step 5: Commit**

```powershell
git add backend/src/common
git commit -m "feat(auth): add AuthUser type, RequirePermission decorator and PermissionsGuard"
```

---

### Task 3: Auth & JWT Integration

**Files:**
- Modify: `backend/src/modules/auth/strategies/jwt.strategy.ts`
- Modify: `backend/src/modules/auth/auth.service.ts`
- Modify: `backend/src/modules/auth/auth.controller.ts`

**Interfaces:**
- Produces: `req.user.permissions`, `user.permissions` returned in `/auth/login` and `/me`
- Consumes: `prisma.rolePermission`, `prisma.permission`

- [ ] **Step 1: Update `jwt.strategy.ts` to attach permissions**

In `backend/src/modules/auth/strategies/jwt.strategy.ts`:
When `user.role === Role.DEPT_MANAGER`, query user permissions from `role_permissions`:
```typescript
let permissions: string[] = [];
if (user.role === Role.DEPT_MANAGER) {
  const rolePerms = await this.prisma.rolePermission.findMany({
    where: { role: Role.DEPT_MANAGER },
    include: { permission: true },
  });
  permissions = rolePerms.map((rp) => `${rp.permission.resource}:${rp.permission.action}`);
}

return {
  id: user.id,
  username: user.username,
  email: user.email,
  fullName: user.fullName,
  position: user.position,
  role: user.role,
  status: user.status,
  departmentId: user.departmentId,
  department: user.department,
  permissions,
  sessionId,
};
```

- [ ] **Step 2: Update `auth.service.ts` login method**

In `backend/src/modules/auth/auth.service.ts`:
In `login()`, also resolve `permissions` if `user.role === Role.DEPT_MANAGER` and return them inside the `user` object in the response.

- [ ] **Step 3: Update `auth.controller.ts` MeController**

In `backend/src/modules/auth/auth.controller.ts`:
In `@Get()` `getProfile()`, if user is `DEPT_MANAGER`, include `permissions` in the returned profile so client can update cached permissions on refresh.

- [ ] **Step 4: Verify Auth Build & Run**

Run:
```powershell
cd C:\Users\MINHFAT\Desktop\TracNghiemNoiBo\backend
npm run build
```
Expected: Compilation succeeds without TypeScript errors.

- [ ] **Step 5: Commit**

```powershell
git add backend/src/modules/auth
git commit -m "feat(auth): load and return DEPT_MANAGER permissions in jwt strategy and profile"
```

---

### Task 4: Permissions Management API (Backend)

**Files:**
- Create: `backend/src/modules/permissions/dto/update-role-permissions.dto.ts`
- Create: `backend/src/modules/permissions/permissions.service.ts`
- Create: `backend/src/modules/permissions/permissions.controller.ts`
- Create: `backend/src/modules/permissions/permissions.module.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Produces:
  - `GET /permissions`: list all available permissions grouped/sorted
  - `GET /permissions/role/:role`: current permissions for a role
  - `PUT /permissions/role/:role`: update granted permissions for role (ADMIN only)

- [ ] **Step 1: Create DTO**

Create `backend/src/modules/permissions/dto/update-role-permissions.dto.ts`:
```typescript
import { IsArray, IsString } from 'class-validator';

export class UpdateRolePermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissionIds: string[];
}
```

- [ ] **Step 2: Implement PermissionsService**

Create `backend/src/modules/permissions/permissions.service.ts`:
```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ sortOrder: 'asc' }, { resource: 'asc' }],
    });
  }

  async getRolePermissions(role: Role) {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { role },
      include: { permission: true },
    });
    return rolePermissions.map((rp) => rp.permission);
  }

  async updateRolePermissions(role: Role, permissionIds: string[], adminUserId: string) {
    if (role === Role.ADMIN) {
      throw new BadRequestException('Vai trò ADMIN luôn có toàn quyền và không thể giới hạn.');
    }

    // Verify all permissionIds exist
    const validCount = await this.prisma.permission.count({
      where: { id: { in: permissionIds } },
    });
    if (permissionIds.length > 0 && validCount !== permissionIds.length) {
      throw new BadRequestException('Một hoặc nhiều quyền được chọn không tồn tại.');
    }

    // Replace permissions in a transaction
    return this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { role },
      });

      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((pId) => ({
            role,
            permissionId: pId,
            grantedBy: adminUserId,
          })),
        });
      }

      return tx.rolePermission.findMany({
        where: { role },
        include: { permission: true },
      });
    });
  }
}
```

- [ ] **Step 3: Implement PermissionsController**

Create `backend/src/modules/permissions/permissions.controller.ts`:
```typescript
import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  async getAll() {
    return this.permissionsService.getAllPermissions();
  }

  @Get('role/:role')
  async getByRole(@Param('role') role: Role) {
    return this.permissionsService.getRolePermissions(role);
  }

  @Put('role/:role')
  async updateRolePermissions(
    @Param('role') role: Role,
    @Body() dto: UpdateRolePermissionsDto,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.permissionsService.updateRolePermissions(role, dto.permissionIds, adminUserId);
  }
}
```

- [ ] **Step 4: Create Module and Register in `app.module.ts`**

Create `backend/src/modules/permissions/permissions.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
```

Import `PermissionsModule` into `backend/src/app.module.ts`.

- [ ] **Step 5: Verify build & commit**

```powershell
cd C:\Users\MINHFAT\Desktop\TracNghiemNoiBo\backend
npm run build
git add backend/src/modules/permissions backend/src/app.module.ts
git commit -m "feat(permissions): add permissions module for dynamic role permission management"
```

---

### Task 5: Data Isolation in Questions Service & Controller

**Files:**
- Modify: `backend/src/modules/questions/questions.controller.ts`
- Modify: `backend/src/modules/questions/questions.service.ts`

**Interfaces:**
- Guard: `PermissionsGuard` replacing/supplementing `RolesGuard`
- Decorators: `@RequirePermission('questions', 'read')`, `@RequirePermission('questions', 'create')`, etc.
- Scoping: when `user.role === Role.DEPT_MANAGER`:
  - `findAll`: filters strictly by `departmentId = user.departmentId`
  - `create`: forces `departmentId = user.departmentId`
  - `findOne/update/delete`: verifies question belongs to `user.departmentId`

- [ ] **Step 1: Update `questions.controller.ts`**

Change class guard to `@UseGuards(JwtAuthGuard, PermissionsGuard)`.
Replace class-level `@Roles(Role.ADMIN)` with specific endpoint decorators:
- `findAll`: `@RequirePermission('questions', 'read')`
- `findOne`: `@RequirePermission('questions', 'read')`
- `downloadTemplate`: `@RequirePermission('questions', 'read')`
- `validateExcel`: `@RequirePermission('questions', 'import')`
- `confirmImport`: `@RequirePermission('questions', 'import')`
- `create`: `@RequirePermission('questions', 'create')`
- `update`: `@RequirePermission('questions', 'update')`
- `toggleStatus`: `@RequirePermission('questions', 'update')`
- `delete`: `@RequirePermission('questions', 'delete')`

Inject `@CurrentUser() user: AuthUser` and client IP into each method call.

- [ ] **Step 2: Update `questions.service.ts` with Data Scoping**

- In `findAll(query, user)`:
  ```typescript
  if (user && user.role === Role.DEPT_MANAGER) {
    if (!user.departmentId) {
      throw new ForbiddenException('Tài khoản quản lý chưa được gán phòng ban trực thuộc.');
    }
    where.departmentId = user.departmentId;
  }
  ```
- In `create(dto, user, clientIp)`:
  ```typescript
  if (user && user.role === Role.DEPT_MANAGER) {
    dto.departmentId = user.departmentId;
  }
  ```
- In `findOne(id, user)`:
  If `user.role === Role.DEPT_MANAGER && question.departmentId !== user.departmentId`, throw `ForbiddenException`.
- In `update(id, dto, user, clientIp)` and `delete(id, user, clientIp)`:
  Check question ownership before updating/deleting. Pass `user.id` and `clientIp` to audit logs!

- [ ] **Step 3: Verify build & commit**

```powershell
cd C:\Users\MINHFAT\Desktop\TracNghiemNoiBo\backend
npm run build
git add backend/src/modules/questions
git commit -m "feat(questions): enforce DEPT_MANAGER permission gating and department data isolation"
```

---

### Task 6: Data Isolation in Exams Service & Controller

**Files:**
- Modify: `backend/src/modules/exams/exams.controller.ts`
- Modify: `backend/src/modules/exams/exams.service.ts`

**Interfaces:**
- Guard: `PermissionsGuard`
- Decorators: `@RequirePermission('exams', 'read')`, `@RequirePermission('exams', 'create')`, etc.
- Scoping: when `user.role === Role.DEPT_MANAGER`:
  - `findAll`: returns only exams associated with `user.departmentId`
  - `create`: forces exam rule allocation to 100% of user's department
  - `update/delete/publish/revert`: verifies ownership

- [ ] **Step 1: Update `exams.controller.ts`**

Use `PermissionsGuard`. Gated endpoints:
- `findAll`: `@RequirePermission('exams', 'read')` (or allow candidate employees to view active exams via existing logic)
- `create`: `@RequirePermission('exams', 'create')`
- `update`: `@RequirePermission('exams', 'update')`
- `publish`: `@RequirePermission('exams', 'publish')`
- `revertToDraft`: `@RequirePermission('exams', 'publish')`
- `delete`: `@RequirePermission('exams', 'delete')`

Inject `@CurrentUser() user: AuthUser` and client IP.

- [ ] **Step 2: Update `exams.service.ts`**

Add check:
```typescript
if (user && user.role === Role.DEPT_MANAGER) {
  where.departmentRules = {
    some: { departmentId: user.departmentId },
  };
}
```
For `create`, if `DEPT_MANAGER`, enforce that questions used in rules belong to `user.departmentId`.
For `publish`, `update`, `delete`: check that exam is scoped to user's department.
Pass `user.id` and `clientIp` to all audit log writes.

- [ ] **Step 3: Verify build & commit**

```powershell
cd C:\Users\MINHFAT\Desktop\TracNghiemNoiBo\backend
npm run build
git add backend/src/modules/exams
git commit -m "feat(exams): enforce DEPT_MANAGER permission gating and department exam isolation"
```

---

### Task 7: Department Reports Endpoint & Service

**Files:**
- Modify: `backend/src/modules/reports/reports.service.ts`
- Modify: `backend/src/modules/reports/reports.controller.ts`

**Interfaces:**
- Produces:
  - `GET /reports/my-department`: summary statistics, employee list, attempt history for caller's department
  - `GET /reports/my-department/export`: Excel file download of department results

- [ ] **Step 1: Add `getMyDepartmentReport` & `exportMyDepartmentReport` in `reports.service.ts`**

```typescript
async getMyDepartmentReport(departmentId: string, query: { page?: number; limit?: number; search?: string; examId?: string; isPassed?: boolean }) {
  const department = await this.prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true, code: true, name: true },
  });
  if (!department) throw new NotFoundException('Phòng ban không tồn tại.');

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Number(query.limit) || 20);
  const skip = (page - 1) * limit;

  // Filter employees of this department
  const userWhere: any = { departmentId };
  if (query.search?.trim()) {
    const s = query.search.trim();
    userWhere.OR = [
      { fullName: { contains: s, mode: 'insensitive' } },
      { username: { contains: s, mode: 'insensitive' } },
      { email: { contains: s, mode: 'insensitive' } },
    ];
  }

  const [employees, totalEmployees, allAttempts] = await Promise.all([
    this.prisma.user.findMany({
      where: userWhere,
      skip,
      take: limit,
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        position: true,
        status: true,
        attempts: {
          where: {
            status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED, AttemptStatus.EXPIRED] },
            ...(query.examId ? { examId: query.examId } : {}),
            ...(query.isPassed !== undefined ? { isPassed: query.isPassed } : {}),
          },
          include: { exam: { select: { id: true, name: true } } },
          orderBy: { submittedAt: 'desc' },
        },
      },
    }),
    this.prisma.user.count({ where: userWhere }),
    this.prisma.examAttempt.findMany({
      where: {
        user: { departmentId },
        status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED, AttemptStatus.EXPIRED] },
        ...(query.examId ? { examId: query.examId } : {}),
      },
      select: { score: true, isPassed: true },
    }),
  ]);

  const totalCompleted = allAttempts.length;
  const passedCount = allAttempts.filter((a) => a.isPassed).length;
  const sumScore = allAttempts.reduce((acc, a) => acc + (a.score || 0), 0);
  const avgScore = totalCompleted > 0 ? Math.round((sumScore / totalCompleted) * 100) / 100 : 0;
  const passRate = totalCompleted > 0 ? Math.round((passedCount / totalCompleted) * 1000) / 10 : 0;

  return {
    department,
    summary: {
      totalEmployees,
      totalAttempts: totalCompleted,
      passedCount,
      avgScore,
      passRate,
    },
    employees,
    meta: { page, limit, total: totalEmployees, totalPages: Math.ceil(totalEmployees / limit) },
  };
}
```

Add Excel export `exportMyDepartmentReport(departmentId: string, query: any)` formatting results with Saigonbank header and department name.

- [ ] **Step 2: Add Controller Endpoints in `reports.controller.ts`**

```typescript
@Get('my-department')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('reports', 'read')
async getMyDepartment(
  @CurrentUser() user: any,
  @Query('page') page?: string,
  @Query('limit') limit?: string,
  @Query('search') search?: string,
  @Query('examId') examId?: string,
) {
  if (!user.departmentId) {
    throw new BadRequestException('Tài khoản chưa được gán phòng ban trực thuộc.');
  }
  return this.reportsService.getMyDepartmentReport(user.departmentId, {
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20,
    search,
    examId,
  });
}

@Get('my-department/export')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('reports', 'export')
async exportMyDepartment(
  @CurrentUser() user: any,
  @Query('search') search: string,
  @Query('examId') examId: string,
  @Res() res: Response,
) {
  if (!user.departmentId) {
    throw new BadRequestException('Tài khoản chưa được gán phòng ban trực thuộc.');
  }
  const buffer = await this.reportsService.exportMyDepartmentReport(user.departmentId, { search, examId });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="Bao_Cao_Phong_Ban_${user.department?.code || 'SDTC'}.xlsx"`);
  res.send(buffer);
}
```

- [ ] **Step 3: Verify build & commit**

```powershell
cd C:\Users\MINHFAT\Desktop\TracNghiemNoiBo\backend
npm run build
git add backend/src/modules/reports
git commit -m "feat(reports): add my-department statistics and excel export for department managers"
```

---

### Task 8: Audit Log Enhancement (Client IP & System Actor Fixes)

**Files:**
- Create: `backend/src/common/utils/ip.util.ts`
- Modify: `backend/src/modules/audit-logs/audit-logs.service.ts`
- Modify: `backend/src/modules/departments/departments.controller.ts` & `departments.service.ts`
- Modify: `backend/src/modules/users/users.controller.ts` & `users.service.ts`
- Modify: `backend/src/modules/attempts/attempts.service.ts`
- Modify: `frontend/src/app/(admin)/admin/activity-logs/page.tsx`

**Interfaces:**
- Produces: `getRealClientIp(req: Request): string`
- Behavior: all audit log entries receive real client IP; system actions receive `action: 'SYSTEM_AUTO_SUBMIT'`, `ipAddress: 'SYSTEM'`.

- [ ] **Step 1: Create IP Extraction Helper**

Create `backend/src/common/utils/ip.util.ts`:
```typescript
import { Request } from 'express';

export function getRealClientIp(req: Request): string {
  if (!req) return '127.0.0.1';
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const ips = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
    const firstIp = ips.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  const xRealIp = req.headers['x-real-ip'];
  if (xRealIp) {
    return Array.isArray(xRealIp) ? xRealIp[0].trim() : xRealIp.trim();
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}
```

- [ ] **Step 2: Inject `userId` and `clientIp` into Controller Mutations**

In `departments.controller.ts`, `users.controller.ts`, `questions.controller.ts`, `exams.controller.ts`:
Pass `user.id` and `getRealClientIp(req)` to the service mutation methods so they are stored in `prisma.auditLog.create`.

- [ ] **Step 3: Fix Automated System Actions in `attempts.service.ts`**

When an attempt auto-expires or is finalized automatically by background timeout:
Set `action: 'SYSTEM_AUTO_SUBMIT'`, `ipAddress: 'SYSTEM'`, and log `details.reason = 'Đã hết giờ làm bài'`.

- [ ] **Step 4: Update UI in `activity-logs/page.tsx`**

Ensure `userId === null` with `ipAddress === 'SYSTEM'` renders "Hệ thống (Tự động)" with a badge, rather than "Vô danh".
Display client IP accurately.

- [ ] **Step 5: Verify build & commit**

```powershell
cd C:\Users\MINHFAT\Desktop\TracNghiemNoiBo\backend
npm run build
git add backend/src/common/utils/ip.util.ts backend/src/modules frontend/src/app/\(admin\)/admin/activity-logs
git commit -m "fix(audit-logs): capture accurate client IP, pass user IDs and identify system actions"
```

---

### Task 9: Frontend Auth Context, usePermissions Hook & PermissionGate

**Files:**
- Modify: `frontend/src/lib/auth-context.tsx`
- Create: `frontend/src/lib/use-permissions.ts`
- Create: `frontend/src/components/PermissionGate.tsx`
- Modify: `frontend/src/app/(auth)/login/page.tsx`

**Interfaces:**
- Produces: `usePermissions()`, `<PermissionGate resource action>`
- Updates: `User.role` includes `'DEPT_MANAGER'`, `User.permissions: string[]`

- [ ] **Step 1: Update `auth-context.tsx`**

Update `User` interface to include `'DEPT_MANAGER'` and `permissions?: string[]`:
```typescript
export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  position?: string | null;
  role: 'ADMIN' | 'DEPT_MANAGER' | 'EMPLOYEE';
  status: 'ACTIVE' | 'LOCKED' | 'REQUIRE_SETUP';
  departmentId?: string | null;
  department?: { id: string; code: string; name: string } | null;
  permissions?: string[];
}
```

- [ ] **Step 2: Create `usePermissions` hook**

Create `frontend/src/lib/use-permissions.ts`:
```typescript
'use client';

import { useAuth } from './auth-context';

export function usePermissions() {
  const { user } = useAuth();

  const can = (resource: string, action: string): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    if (user.role === 'DEPT_MANAGER') {
      const perms = user.permissions || [];
      return perms.includes(`${resource}:${action}`);
    }
    return false;
  };

  return { can, user };
}
```

- [ ] **Step 3: Create `PermissionGate` Component**

Create `frontend/src/components/PermissionGate.tsx`:
```tsx
'use client';

import React from 'react';
import { usePermissions } from '@/lib/use-permissions';

interface PermissionGateProps {
  resource: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ resource, action, children, fallback = null }: PermissionGateProps) {
  const { can } = usePermissions();
  if (can(resource, action)) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
}
```

- [ ] **Step 4: Update `login/page.tsx` Routing**

In `frontend/src/app/(auth)/login/page.tsx`, route `DEPT_MANAGER` to `/manager/dashboard`:
```typescript
let nextRoute = '/employee/dashboard';
if (user.role === 'ADMIN') {
  nextRoute = '/admin/dashboard';
} else if (user.role === 'DEPT_MANAGER') {
  nextRoute = '/manager/dashboard';
} else if (user.status === 'REQUIRE_SETUP') {
  nextRoute = '/employee/profile/setup';
}
```

- [ ] **Step 5: Verify frontend build & commit**

```powershell
cd C:\Users\MINHFAT\Desktop\TracNghiemNoiBo\frontend
npm run build
git add frontend/src/lib frontend/src/components/PermissionGate.tsx frontend/src/app/\(auth\)/login
git commit -m "feat(frontend): extend auth context for DEPT_MANAGER and add permission gate component"
```

---

### Task 10: Frontend Admin Permissions Management Page

**Files:**
- Create: `frontend/src/app/(admin)/admin/permissions/page.tsx`
- Modify: `frontend/src/app/(admin)/admin/layout.tsx` (add nav link with icon)

**Interfaces:**
- Connects to: `GET /permissions`, `GET /permissions/role/DEPT_MANAGER`, `PUT /permissions/role/DEPT_MANAGER`

- [ ] **Step 1: Create Admin Permissions Page**

Create `frontend/src/app/(admin)/admin/permissions/page.tsx`:
- Group permissions by resource: Câu hỏi (`questions`), Đề thi (`exams`), Báo cáo (`reports`).
- Render switches for each permission item.
- Provide "Chọn tất cả" and "Bỏ chọn tất cả" per group.
- Save button calls `PUT /permissions/role/DEPT_MANAGER`.
- Display alert: "Quyền hạn mới sẽ có hiệu lực ngay khi Quản lý phòng ban truy cập trang hoặc tải lại phiên."

- [ ] **Step 2: Add Permissions Navigation Link to Admin Layout**

In `frontend/src/app/(admin)/admin/layout.tsx`:
Add `{ href: '/admin/permissions', label: 'Phân Quyền Vai Trò', icon: ShieldCheck }` to `navItems`.

- [ ] **Step 3: Verify frontend build & commit**

```powershell
cd C:\Users\MINHFAT\Desktop\TracNghiemNoiBo\frontend
npm run build
git add frontend/src/app/\(admin\)/admin/permissions frontend/src/app/\(admin\)/admin/layout.tsx
git commit -m "feat(admin): add role permissions management page in admin portal"
```

---

### Task 11: Frontend Department Manager Portal (`/manager/*`)

**Files:**
- Create: `frontend/src/app/(manager)/manager/layout.tsx`
- Create: `frontend/src/app/(manager)/manager/dashboard/page.tsx`
- Create: `frontend/src/app/(manager)/manager/questions/page.tsx`
- Create: `frontend/src/app/(manager)/manager/questions/new/page.tsx`
- Create: `frontend/src/app/(manager)/manager/exams/page.tsx`
- Create: `frontend/src/app/(manager)/manager/reports/page.tsx`

**Interfaces:**
- Guard: verifies `user.role === 'DEPT_MANAGER'`, displays department badge
- Navigation items dynamically filtered based on `can(resource, 'read')`

- [ ] **Step 1: Create Manager Layout**

Create `frontend/src/app/(manager)/manager/layout.tsx`:
- Protects route: if `user.role !== 'DEPT_MANAGER'`, redirects to `/login` or `/employee/dashboard`.
- Header shows: `QUẢN LÝ PHÒNG BAN` badge + department name (`user.department?.name`).
- Sidebar lists:
  - Bảng điều khiển (`/manager/dashboard`)
  - Ngân hàng câu hỏi (`/manager/questions`) — only if `can('questions', 'read')`
  - Quản lý đề thi (`/manager/exams`) — only if `can('exams', 'read')`
  - Báo cáo phòng ban (`/manager/reports`) — only if `can('reports', 'read')`

- [ ] **Step 2: Create Manager Dashboard Page**

Create `frontend/src/app/(manager)/manager/dashboard/page.tsx`:
- Summary cards: Total questions in department, active exams in department, employees in department, pass rate.
- Quick actions: "Tạo câu hỏi mới" (wrapped in `<PermissionGate resource="questions" action="create">`), "Xem báo cáo".

- [ ] **Step 3: Create Manager Questions & Create Question Page**

Create `frontend/src/app/(manager)/manager/questions/page.tsx` & `new/page.tsx`:
- List only questions of manager's department.
- Lock department selection to manager's department (disabled/read-only).
- Auto-generate question code matching convention.

- [ ] **Step 4: Create Manager Exams Page**

Create `frontend/src/app/(manager)/manager/exams/page.tsx`:
- List exams allocated to manager's department.
- Actions (Tạo đề, Sửa, Xuất bản, Xóa) wrapped in `<PermissionGate>` components.

- [ ] **Step 5: Create Manager Department Reports Page**

Create `frontend/src/app/(manager)/manager/reports/page.tsx`:
- Calls `GET /reports/my-department`.
- Displays department employee ranking, scores, pass/fail status.
- Excel export button calling `GET /reports/my-department/export`.

- [ ] **Step 6: Verify frontend build & commit**

```powershell
cd C:\Users\MINHFAT\Desktop\TracNghiemNoiBo\frontend
npm run build
git add frontend/src/app/\(manager\)
git commit -m "feat(manager): create dedicated department manager portal with permission-gated navigation"
```

---

### Task 12: End-to-End Verification & Automated Test Suite

**Files:**
- Create: `backend/test/dept-manager-e2e.spec.ts`
- Run: Full backend & frontend test suites

**Interfaces:**
- Test full flow:
  1. Admin configures permissions for `DEPT_MANAGER`.
  2. Create test department & `DEPT_MANAGER` account.
  3. `DEPT_MANAGER` logs in, receives permissions in payload.
  4. `DEPT_MANAGER` creates question -> verified scoped to department.
  5. `DEPT_MANAGER` forbidden from accessing another department's question.
  6. Admin revokes `questions:delete` -> `DEPT_MANAGER` receives 403 on delete.
  7. Client IP and User ID accurately logged in `AuditLog`.

- [ ] **Step 1: Write E2E Integration Test Script**

Create `backend/test/dept-manager-e2e.spec.ts` covering the 7 verification checkpoints above.

- [ ] **Step 2: Run Backend Tests**

Run:
```powershell
cd C:\Users\MINHFAT\Desktop\TracNghiemNoiBo\backend
npm run test
```
Expected: All unit & integration tests pass.

- [ ] **Step 3: Run Production Build Verifications**

Run:
```powershell
cd C:\Users\MINHFAT\Desktop\TracNghiemNoiBo\backend
npm run build
cd C:\Users\MINHFAT\Desktop\TracNghiemNoiBo\frontend
npm run build
```
Expected: Both backend and frontend build with 0 errors.

- [ ] **Step 4: Commit test suite & final documentation**

```powershell
git add backend/test/dept-manager-e2e.spec.ts docs/superpowers/plans
git commit -m "test: add comprehensive e2e test suite for DEPT_MANAGER permissions and data isolation"
```
