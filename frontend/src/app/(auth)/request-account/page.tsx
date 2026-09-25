'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  UserPlus,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  HelpCircle,
  ShieldCheck,
  Lock,
} from 'lucide-react';

interface Department {
  id: string;
  code: string;
  name: string;
}

export default function RequestAccountPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isDeptLoading, setIsDeptLoading] = useState(true);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [position, setPosition] = useState('');
  const [reason, setReason] = useState('');

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    api
      .get('/account-requests/departments')
      .then((res) => {
        setDepartments(res.data || []);
        if (res.data && res.data.length > 0) {
          setDepartmentId(res.data[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to load departments', err);
      })
      .finally(() => {
        setIsDeptLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !email.trim() || !departmentId) {
      setErrorMsg('Vui lòng điền đầy đủ các thông tin bắt buộc (*).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.post('/account-requests', {
        fullName: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        departmentId,
        position: position.trim() || undefined,
        reason: reason.trim() || undefined,
      });

      setSuccessMsg(
        res.data?.message ||
          'Yêu cầu cấp tài khoản của bạn đã được gửi thành công đến Quản trị viên. Vui lòng chờ phê duyệt!',
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Gửi yêu cầu không thành công. Vui lòng kiểm tra lại thông tin hoặc thử lại sau.';
      setErrorMsg(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 text-slate-800">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200/90 p-8 sm:p-10 space-y-6 animate-scale-in">
        
        {/* Brand Header */}
        <div className="text-center space-y-2.5 pb-4 border-b border-slate-100">
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 bg-white rounded-2xl p-2 border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden">
              <Image
                src="/logo_saigonbank.jpg"
                alt="Saigonbank Logo"
                width={56}
                height={56}
                className="object-contain"
                priority
              />
            </div>
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
            NGÂN HÀNG TMCP SÀI GÒN CÔNG THƯƠNG (SAIGONBANK)
          </div>
          <h1 className="text-2xl font-extrabold text-[#2e3e98] tracking-tight">
            YÊU CẦU CẤP TÀI KHOẢN
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Biểu mẫu đăng ký dành cho Cán bộ / Nhân viên chưa có tài khoản
          </p>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-slate-900">
                Gửi Yêu Cầu Thành Công!
              </h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                {successMsg}
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/login"
                className="w-full sm:w-auto px-6 py-2.5 bg-[#2e3e98] hover:bg-[#233075] text-white rounded-xl text-sm font-semibold shadow-sm transition flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Đến trang đăng nhập</span>
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto px-5 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Về trang chủ</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Họ và tên */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Họ và tên cán bộ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm text-slate-900 placeholder-slate-400"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Mã NV / Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã nhân viên / Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ví dụ: nv0123"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm text-slate-900 placeholder-slate-400"
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* Email nội bộ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email nội bộ <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tennv@saigonbank.com.vn"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm text-slate-900 placeholder-slate-400"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            {/* Phòng ban & Vị trí */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phòng ban trực thuộc <span className="text-red-500">*</span>
                </label>
                {isDeptLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 py-2.5 px-3 border border-slate-200 rounded-lg">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang tải danh mục...</span>
                  </div>
                ) : (
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm text-slate-900 bg-white"
                    disabled={isSubmitting}
                    required
                  >
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chức vụ / Vị trí (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Ví dụ: Chuyên viên CNTT"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm text-slate-900 placeholder-slate-400"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Lý do / Ghi chú */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lý do xin cấp tài khoản (Tùy chọn)
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ghi chú thêm về đợt thi hoặc nhu cầu sử dụng..."
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm text-slate-900 placeholder-slate-400"
                disabled={isSubmitting}
              />
            </div>

            {/* Submit button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-[#2e3e98] hover:bg-[#233075] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-blue-950/20 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang gửi yêu cầu...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    <span>Gửi Yêu Cầu Cấp Tài Khoản</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Footer Navigation */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <Link
            href="/login"
            className="text-blue-700 hover:text-blue-900 font-semibold transition flex items-center gap-1"
          >
            <span>Đã có tài khoản? Đăng nhập ngay</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <Link
            href="/"
            className="text-slate-500 hover:text-slate-800 transition flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại trang chủ</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
