'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  UserCheck,
  ArrowLeft,
  User,
  Mail,
  Lock,
  Building2,
  Briefcase,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const userId = resolvedParams.id;
  const router = useRouter();

  const [departments, setDepartments] = useState<any[]>([]);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [position, setPosition] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [role, setRole] = useState<'EMPLOYEE' | 'ADMIN'>('EMPLOYEE');
  const [status, setStatus] = useState<'ACTIVE' | 'LOCKED' | 'REQUIRE_SETUP'>('ACTIVE');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteUser = async () => {
    setIsDeleting(true);
    setErrorMessage('');
    try {
      await api.delete(`/users/${userId}`);
      router.push('/admin/users');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể xóa tài khoản này.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [depRes, userRes] = await Promise.all([
          api.get('/departments'),
          api.get(`/users/${userId}`),
        ]);
        setDepartments(depRes.data || []);

        const u = userRes.data;
        setFullName(u.fullName || '');
        setUsername(u.username || '');
        setEmail(u.email || '');
        setPosition(u.position || '');
        setDepartmentId(u.departmentId || '');
        setRole(u.role || 'EMPLOYEE');
        setStatus(u.status || 'ACTIVE');
      } catch (err) {
        setErrorMessage('Không thể tải thông tin người dùng.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await api.patch(`/users/${userId}`, {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: newPassword ? newPassword.trim() : undefined,
        position: position.trim() || undefined,
        departmentId: departmentId || undefined,
        role,
        status,
      });

      setSuccessMessage('Cập nhật người dùng thành công!');
      setTimeout(() => {
        router.push('/admin/users');
      }, 1000);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs text-slate-500">Đang tải thông tin người dùng...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/users"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-blue-600" />
            <span>Chỉnh Sửa Người Dùng: @{username}</span>
          </h1>
          <p className="text-xs text-slate-500">Cập nhật thông tin phân quyền và phòng ban công tác</p>
        </div>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Họ và Tên
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tài Khoản
              </label>
              <input
                type="text"
                disabled
                value={username}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-500 font-mono cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Đặt Lại Mật Khẩu (Để trống nếu không đổi)
              </label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phòng Ban
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">-- Chưa phân bổ --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    [{d.code}] {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Vị Trí / Chức Vụ
              </label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Vai Trò (Role)
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-semibold"
              >
                <option value="EMPLOYEE">Nhân viên (EMPLOYEE)</option>
                <option value="ADMIN">Quản trị viên (ADMIN)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Trạng Thái
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                <option value="LOCKED">Đã khóa (LOCKED)</option>
                <option value="REQUIRE_SETUP">Yêu cầu hoàn tất hồ sơ (REQUIRE_SETUP)</option>
              </select>
            </div>
          </div>

          {/* Delete Confirmation Box */}
          {showDeleteConfirm && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs text-rose-900 font-bold">
                    Xác nhận xóa tài khoản [{fullName} - {username}]?
                  </p>
                  <p className="text-xs text-rose-700 leading-relaxed">
                    Tài khoản sẽ bị xóa vĩnh viễn khỏi hệ thống nếu chưa có lịch sử làm bài thi. Thao tác này không thể hoàn tác.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold transition"
                >
                  Không, giữ lại
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  disabled={isDeleting}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang xóa...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xác nhận xóa</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-100">
            <div>
              {!showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3.5 py-2 text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Xóa vĩnh viễn tài khoản"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xóa Tài Khoản</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/admin/users"
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Hủy
              </Link>
              <button
                type="submit"
                disabled={isSaving || isDeleting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Lưu Thay Đổi</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
