'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  Users,
  Building2,
  HelpCircle,
  Award,
  BarChart3,
  LogOut,
  ShieldCheck,
  Loader2,
  History,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'ADMIN') {
        router.push('/employee/dashboard');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium text-slate-300">Đang xác thực quyền Quản trị viên...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: '/admin/dashboard', label: 'Bảng Điều Khiển', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Quản Lý Người Dùng', icon: Users },
    { href: '/admin/departments', label: 'Quản Lý Phòng Ban', icon: Building2 },
    { href: '/admin/questions', label: 'Ngân Hàng Câu Hỏi', icon: HelpCircle },
    { href: '/admin/exams', label: 'Quản Lý Kỳ Thi', icon: Award },
    { href: '/admin/reports', label: 'Báo Cáo & Kết Quả', icon: BarChart3 },
    { href: '/admin/activity-logs', label: 'Lịch Sử Hoạt Động', icon: History },
  ];

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-[#141d44] text-slate-300 flex flex-col flex-shrink-0 border-r border-[#1e2a5c] shadow-xl">
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

        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-[#2e3e98] text-white shadow-md shadow-blue-950/40 translate-x-1'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-[#1e2a5c] bg-[#0f1738]/60">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 truncate min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#2e3e98] border border-blue-400/40 flex items-center justify-center text-white font-bold text-xs shrink-0">
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'A'}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-8 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#2e3e98] ring-4 ring-blue-100 animate-pulse"></div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Hệ Thống Quản Trị Khảo Thí SAIGONBANK
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-[#2e3e98] border border-blue-200/80">
              QUẢN TRỊ VIÊN
            </span>
            <span className="text-xs font-semibold text-slate-800">{user.fullName}</span>
          </div>
        </header>

        {/* Page Body with smooth animation */}
        <main className="flex-1 overflow-y-auto p-8 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
