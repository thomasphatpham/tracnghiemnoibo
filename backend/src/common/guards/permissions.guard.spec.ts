import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { Role } from '@prisma/client';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

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

  it('should throw ForbiddenException if user or role is missing', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx1 = createMockContext(null);
    expect(() => guard.canActivate(ctx1)).toThrow(ForbiddenException);

    const ctx2 = createMockContext({});
    expect(() => guard.canActivate(ctx2)).toThrow(ForbiddenException);
  });

  it('should check requiredRoles when specified', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === ROLES_KEY) return [Role.DEPT_MANAGER];
      return undefined;
    });

    const allowedCtx = createMockContext({ role: Role.DEPT_MANAGER });
    expect(guard.canActivate(allowedCtx)).toBe(true);

    const deniedCtx = createMockContext({ role: Role.EMPLOYEE });
    expect(() => guard.canActivate(deniedCtx)).toThrow(ForbiddenException);
  });

  it('should deny non-admin non-DEPT_MANAGER role when permission is required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSION_KEY) return 'questions:create';
      return undefined;
    });

    const ctx = createMockContext({ role: Role.EMPLOYEE, permissions: ['questions:create'] });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
