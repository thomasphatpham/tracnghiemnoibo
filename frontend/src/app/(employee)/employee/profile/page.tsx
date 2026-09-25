'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import {
  User,
  Mail,
  Building2,
  Briefcase,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

export default function EmployeeProfilePage() {
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setErrorMessage('Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.');
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
    setSuccessMessage('');

    try {
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      setSuccessMessage(res.data?.message || 'Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể đổi mật khẩu.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <User className="w-6 h-6 text-blue-600" />
          <span>Hồ Sơ Cá Nhân & Bảo Mật</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Quản lý thông tin tài khoản nhân viên và đổi mật khẩu bảo vệ tài khoản
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Information Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-3 border-b pb-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="font-bold text-slate-900 text-base">{user?.fullName}</div>
              <div className="text-xs text-slate-400">@{user?.username}</div>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Email Doanh Nghiệp</span>
              <div className="font-semibold text-slate-800 flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{user?.email}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Phòng Ban Trực Thuộc</span>
              <div className="font-semibold text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span>
                  {user?.department
                    ? `[${user.department.code}] ${user.department.name}`
                    : 'Chưa cập nhật'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block italic">
                * Phòng ban được quản lý bởi Quản trị viên theo quy định công ty.
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Vị Trí / Chức Danh</span>
              <div className="font-semibold text-slate-800 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-400" />
                <span>{user?.position || 'Nhân viên'}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Vai Trò Hệ Thống</span>
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <Lock className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Đổi Mật Khẩu
            </h2>
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

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Mật Khẩu Hiện Tại
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Nhập mật khẩu đang dùng"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Mật Khẩu Mới
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Xác Nhận Mật Khẩu Mới
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Cập Nhật Mật Khẩu Mới</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
