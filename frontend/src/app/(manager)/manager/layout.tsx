'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/use-permissions';
import {
  LayoutDashboard,
  HelpCircle,
  Award,
  BarChart3,
  Building2,
  LogOut,
  Loader2,
  ShieldCheck,
  User,
} from 'lucide-react';

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const { can } = usePermissions();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'DEPT_MANAGER') {
        if (user.role === 'ADMIN') {
          router.push('/admin/dashboard');
        } else {
          router.push('/employee/dashboard');
        }
      }
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== 'DEPT_MANAGER') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium text-slate-300">
            Đang xác thực quyền Quản lý phòng ban...
          </p>
        </div>
      </div>
    );
  }

  // Danh mục điều hướng được lọc linh hoạt theo can(resource, 'read')
  const allNavItems = [
    {
      href: '/manager/dashboard',
      label: 'Bảng Điều Khiển',
      icon: LayoutDashboard,
      alwaysVisible: true,
    },
    {
      href: '/manager/questions',
      label: 'Ngân Hàng Câu Hỏi',
      icon: HelpCircle,
      visible: can('questions', 'read'),
    },
    {
      href: '/manager/exams',
      label: 'Quản Lý Kỳ Thi',
      icon: Award,
      visible: can('exams', 'read'),
    },
    {
      href: '/manager/reports',
      label: 'Báo Cáo Phòng Ban',
      icon: BarChart3,
      visible: can('reports', 'read'),
    },
  ];

  const visibleNavItems = allNavItems.filter((item) => item.alwaysVisible || item.visible);

  const deptName = user.department?.name || 'Chưa phân bổ đơn vị';
  const deptCode = user.department?.code || 'N/A';

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-[#141d44] text-slate-300 flex flex-col flex-shrink-0 border-r border-[#1e2a5c] shadow-xl">
        {/* Branding Saigonbank */}
        <div className="h-16 flex items-center gap-3 px-5 bg-[#0f1738] border-b border-[#1e2a5c] backdrop-blur-sm">
          <div className="h-10 w-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-md shadow-blue-900/30 shrink-0">
            <img
              src="/logo_saigonbank.jpg"
              alt="Saigonbank"
              className="h-full w-full object-contain rounded"
            />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-white text-xs tracking-wide uppercase truncate">
              SAIGONBANK
            </div>
            <div className="text-[10px] text-blue-300 font-semibold tracking-wider uppercase truncate">
              Khảo Thí Nội Bộ
            </div>
          </div>
        </div>

        {/* Department Badge in Sidebar */}
        <div className="px-4 py-3 mx-3 mt-4 rounded-xl bg-[#0f1738]/80 border border-[#1e2a5c] flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/20 shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
              Đơn Vị Trực Thuộc
            </div>
            <div className="text-xs font-semibold text-white truncate" title={deptName}>
              [{deptCode}] {deptName}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-[#0066B1] text-white shadow-md shadow-blue-950/40 translate-x-1'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout in Sidebar */}
        <div className="p-4 border-t border-[#1e2a5c] bg-[#0f1738]/60">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 truncate min-w-0">
              <div className="w-8 h-8 rounded-full bg-amber-600 border border-amber-400/40 flex items-center justify-center text-white font-bold text-xs shrink-0">
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'M'}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-white truncate">{user.fullName}</div>
                <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Đăng xuất"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        {/* Top Navbar Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-8 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-100 animate-pulse"></div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Cổng Quản Lý Phòng Ban SAIGONBANK
            </span>
            <span className="text-slate-300 font-light hidden sm:inline">•</span>
            <span className="text-xs font-medium text-slate-500 hidden sm:inline truncate max-w-xs">
              {deptName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              QUẢN LÝ PHÒNG BAN
            </span>
            <span className="text-xs font-semibold text-slate-800 hidden md:inline">
              {user.fullName}
            </span>
            <button
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition cursor-pointer"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 overflow-y-auto p-8 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
