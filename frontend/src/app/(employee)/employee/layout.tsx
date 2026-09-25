'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  LogOut,
  Loader2,
} from 'lucide-react';

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.status === 'REQUIRE_SETUP' && pathname !== '/employee/profile/setup') {
        router.push('/employee/profile/setup');
      }
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-700">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium">Đang tải cổng nhân viên...</p>
        </div>
      </div>
    );
  }

  // During exam execution (/employee/exam/[attemptId]), minimize distractions per Section 10
  const isTakingExam = pathname.includes('/employee/exam/');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Employee Top Header */}
      {!isTakingExam && (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/employee/dashboard" className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white p-1 border border-slate-200 flex items-center justify-center shadow-sm shrink-0">
                  <img
                    src="/logo_saigonbank.jpg"
                    alt="Saigonbank"
                    className="h-full w-full object-contain rounded"
                  />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm tracking-wide uppercase">SAIGONBANK</div>
                  <div className="text-[10px] text-blue-600 font-semibold tracking-wider uppercase">
                    Cổng kiểm tra Nội bộ
                  </div>
                </div>
              </Link>

              {user.status !== 'REQUIRE_SETUP' && (
                <nav className="hidden md:flex items-center gap-1.5">
                  <Link
                    href="/employee/dashboard"
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                      pathname === '/employee/dashboard'
                        ? 'text-[#2e3e98] bg-blue-50 border border-blue-200/60 shadow-xs'
                        : 'text-slate-600 hover:text-[#2e3e98] hover:bg-slate-100'
                    }`}
                  >
                    Bảng Điều Khiển
                  </Link>
                  <Link
                    href="/employee/exams"
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                      pathname.startsWith('/employee/exams')
                        ? 'text-[#2e3e98] bg-blue-50 border border-blue-200/60 shadow-xs'
                        : 'text-slate-600 hover:text-[#2e3e98] hover:bg-slate-100'
                    }`}
                  >
                    Kỳ Thi Của Tôi
                  </Link>
                  <Link
                    href="/employee/profile"
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                      pathname === '/employee/profile'
                        ? 'text-[#2e3e98] bg-blue-50 border border-blue-200/60 shadow-xs'
                        : 'text-slate-600 hover:text-[#2e3e98] hover:bg-slate-100'
                    }`}
                  >
                    Hồ Sơ Cá Nhân
                  </Link>
                </nav>
              )}
            </div>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 text-right hidden sm:flex">
                <div className="w-8 h-8 rounded-full bg-[#2e3e98] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">{user.fullName}</div>
                  <div className="text-[10px] text-slate-500">
                    {user.department?.name || 'Chưa thiết lập phòng ban'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => logout()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-600 text-xs font-medium transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng Xuất</span>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Employee Body with smooth fade in */}
      <main className="flex-1 flex flex-col animate-fade-in">{children}</main>
    </div>
  );
}
