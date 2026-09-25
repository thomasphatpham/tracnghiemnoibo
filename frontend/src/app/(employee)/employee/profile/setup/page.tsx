'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  UserCheck,
  Building2,
  Briefcase,
  User,
  Mail,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export default function ProfileSetupPage() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [position, setPosition] = useState(user?.position || '');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingDeps, setIsFetchingDeps] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadDepartments() {
      try {
        const res = await api.get('/departments?onlyActive=true');
        setDepartments(res.data || []);
        if (res.data?.length > 0) {
          setDepartmentId(res.data[0].id);
        }
      } catch (err) {
        setErrorMessage('Không thể tải danh sách phòng ban.');
      } finally {
        setIsFetchingDeps(false);
      }
    }
    loadDepartments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage('Vui lòng nhập họ và tên của bạn.');
      return;
    }
    if (!departmentId) {
      setErrorMessage('Vui lòng chọn phòng ban trực thuộc.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      await api.patch('/me', {
        fullName: fullName.trim(),
        position: position.trim() || undefined,
        departmentId,
      });

      await refreshProfile();
      router.push('/employee/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể cập nhật hồ sơ.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-slate-100">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center mx-auto shadow-md shadow-blue-200">
            <UserCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Thiết Lập Hồ Sơ Ban Đầu
          </h1>
          <p className="text-xs text-slate-500">
            Chào mừng bạn đến với hệ thống! Vui lòng xác nhận thông tin cá nhân và chọn phòng ban để bắt đầu tham gia các kỳ thi.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Họ và Tên Nhân Viên
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                disabled={isLoading}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={user?.email || ''}
                disabled
                className="w-full pl-9 pr-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-sm text-slate-500 cursor-not-allowed"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Email được quản lý bởi công ty</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Vị Trí / Chức Danh Công Tác
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Briefcase className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="VD: Kỹ sư phần mềm, Chuyên viên kinh doanh..."
                disabled={isLoading}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Phòng Ban Trực Thuộc <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Building2 className="w-4 h-4" />
              </div>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={isLoading || isFetchingDeps}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition cursor-pointer"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    [{d.code}] {d.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-amber-600 mt-1">
              ⚠️ Lưu ý: Sau bước thiết lập này, bạn sẽ không thể tự thay đổi phòng ban mà chỉ có Quản trị viên mới có quyền điều chỉnh.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || isFetchingDeps}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-lg shadow-md shadow-blue-200 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang lưu hồ sơ...</span>
              </>
            ) : (
              <span>Hoàn Tất Thiết Lập & Vào Hệ Thống</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
