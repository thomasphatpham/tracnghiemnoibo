'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const sessionExpired = searchParams.get('error') === 'session_expired';
  const resetSuccess = searchParams.get('reset') === 'success';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password) {
      setErrorMessage('Vui lòng điền đầy đủ thông tin đăng nhập.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await api.post('/auth/login', {
        usernameOrEmail: usernameOrEmail.trim(),
        password,
      });

      const { accessToken, user } = res.data;
      login(accessToken, user);

      // Route according to role and setup status
      if (user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else if (user.status === 'REQUIRE_SETUP') {
        router.push('/employee/profile/setup');
      } else {
        router.push('/employee/dashboard');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại dịch vụ Backend.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickAccount = (userType: 'admin' | 'employee') => {
    if (userType === 'admin') {
      setUsernameOrEmail('admin');
      setPassword('Admin@123456');
    } else {
      setUsernameOrEmail('nhanvien1');
      setPassword('User@123456');
    }
    setErrorMessage('');
  };

  return (
    <div
      suppressHydrationWarning
      className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/90 p-8 space-y-6 animate-scale-in"
    >
      {/* Header with Saigonbank Logo */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-3">
          <div className="p-1 bg-white border border-slate-200 rounded-xl shadow-xs">
            <img
              src="/logo_saigonbank.jpg"
              alt="Saigonbank Logo"
              className="h-14 w-auto object-contain rounded-lg"
            />
          </div>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#2e3e98] tracking-tight uppercase">
          HỆ THỐNG THI TRẮC NGHIỆM NỘI BỘ
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Ngân hàng Thương mại Cổ phần Sài Gòn Công Thương (SAIGONBANK)
        </p>
      </div>

      {/* Alerts */}
      {sessionExpired && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Phiên đăng nhập đã hết hạn hoặc bị thu hồi bởi lượt đăng nhập mới.</span>
        </div>
      )}

      {resetSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4" suppressHydrationWarning>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Tài Khoản / Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              placeholder="admin hoặc nhanvien1@company.local"
              disabled={isLoading}
              suppressHydrationWarning
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Mật Khẩu
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Quên mật khẩu?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu..."
              disabled={isLoading}
              suppressHydrationWarning
              className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              suppressHydrationWarning
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          suppressHydrationWarning
          className="w-full py-2.5 px-4 bg-[#2e3e98] hover:bg-[#233075] active:bg-[#1a2459] text-white font-semibold text-sm rounded-lg shadow-md shadow-blue-900/20 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang kiểm tra đăng nhập...</span>
            </>
          ) : (
            <span>Đăng Nhập</span>
          )}
        </button>
      </form>

      {/* Link to Request Account */}
      <div className="pt-2 text-center border-t border-slate-100">
        <p className="text-xs text-slate-500">
          Chưa có tài khoản thi sát hạch?{' '}
          <Link
            href="/request-account"
            className="text-[#2e3e98] hover:underline font-bold"
          >
            Yêu cầu cấp tài khoản
          </Link>
        </p>
      </div>

      {/* Demo Quick Fill */}
      <div className="pt-1" suppressHydrationWarning>
        <p className="text-[11px] text-slate-400 text-center mb-2">Điền nhanh tài khoản mẫu thử nghiệm:</p>
        <div className="grid grid-cols-2 gap-2" suppressHydrationWarning>
          <button
            type="button"
            onClick={() => fillQuickAccount('admin')}
            suppressHydrationWarning
            className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            🔑 Quản Trị (admin)
          </button>
          <button
            type="button"
            onClick={() => fillQuickAccount('employee')}
            suppressHydrationWarning
            className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            👤 Nhân Viên (nhanvien1)
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-8 bg-white rounded-2xl shadow-xl">
            <Loader2 className="w-8 h-8 animate-spin text-[#2e3e98]" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
