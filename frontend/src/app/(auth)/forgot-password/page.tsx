'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Mail,
  KeyRound,
  Lock,
  ArrowLeft,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<'REQUEST_OTP' | 'RESET_PASSWORD'>('REQUEST_OTP');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ email.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSuccessMessage(res.data.message || 'Mã OTP đã được gửi đến email của bạn.');
      setStep('RESET_PASSWORD');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.length !== 6) {
      setErrorMessage('Vui lòng nhập mã OTP 6 chữ số.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Xác nhận mật khẩu mới không khớp.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      await api.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword,
      });

      router.push('/login?reset=success');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể đặt lại mật khẩu.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/90 p-8 space-y-6 animate-scale-in">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#2e3e98] text-white rounded-xl flex items-center justify-center mx-auto shadow-md shadow-blue-900/20">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Khôi Phục Mật Khẩu
          </h1>
          <p className="text-xs text-slate-500">
            {step === 'REQUEST_OTP'
              ? 'Nhập email tài khoản của bạn để nhận mã OTP'
              : `Nhập mã OTP gửi tới ${email} và mật khẩu mới`}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {step === 'REQUEST_OTP' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Đăng Ký
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.local"
                  disabled={isLoading}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[#2e3e98] hover:bg-[#233075] active:bg-[#1a2459] text-white font-semibold text-sm rounded-lg shadow-md shadow-blue-900/20 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang gửi mã OTP...</span>
                </>
              ) : (
                <span>Gửi Mã Xác Thực OTP</span>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Mã OTP (6 chữ số)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  disabled={isLoading}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-center tracking-widest font-mono text-lg font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Mật Khẩu Mới
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  disabled={isLoading}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Xác Nhận Mật Khẩu Mới
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  disabled={isLoading}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[#2e3e98] hover:bg-[#233075] active:bg-[#1a2459] text-white font-semibold text-sm rounded-lg shadow-md shadow-blue-900/20 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <span>Xác Nhận & Đặt Lại Mật Khẩu</span>
              )}
            </button>
          </form>
        )}

        <div className="text-center pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Đăng nhập</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
