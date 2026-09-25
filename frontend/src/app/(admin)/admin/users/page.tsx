'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import Pagination from '@/components/Pagination';
import {
  Users,
  Search,
  Plus,
  Lock,
  Unlock,
  Building2,
  Shield,
  User as UserIcon,
  Loader2,
  Edit,
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';

export default function AdminUsersPage() {
  // Active Tab: 'users' | 'requests'
  const [activeTab, setActiveTab] = useState<'users' | 'requests'>('users');

  // Users State
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Account Requests State
  const [requests, setRequests] = useState<any[]>([]);
  const [reqTotal, setReqTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [reqPage, setReqPage] = useState(1);
  const [reqPageSize, setReqPageSize] = useState(10);
  const [reqStatusFilter, setReqStatusFilter] = useState<string>('PENDING');
  const [reqSearch, setReqSearch] = useState('');
  const [isReqLoading, setIsReqLoading] = useState(false);

  // Modals for Request Actions
  const [approveTarget, setApproveTarget] = useState<any | null>(null);
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);

  // Fetch Users
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (deptFilter) params.append('departmentId', deptFilter);

      const res = await api.get(`/users?${params.toString()}`);
      setUsers(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Account Requests
  const fetchRequests = async () => {
    setIsReqLoading(true);
    try {
      const params = new URLSearchParams({
        page: reqPage.toString(),
        limit: reqPageSize.toString(),
      });
      if (reqStatusFilter) params.append('status', reqStatusFilter);
      if (reqSearch) params.append('search', reqSearch);

      const res = await api.get(`/account-requests?${params.toString()}`);
      setRequests(res.data.data || []);
      setReqTotal(res.data.total || 0);
      setPendingCount(res.data.pendingCount || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsReqLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    api.get('/departments').then((res) => setDepartments(res.data || []));
    // Fetch pending count initially for badge
    api.get('/account-requests?limit=1').then((res) => {
      setPendingCount(res.data?.pendingCount || 0);
    });
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else {
      fetchRequests();
    }
  }, [page, pageSize, roleFilter, statusFilter, deptFilter, activeTab, reqPage, reqPageSize, reqStatusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleReqSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReqPage(1);
    fetchRequests();
  };

  const handleToggleLock = async (userId: string) => {
    setActionLoadingId(userId);
    try {
      await api.patch(`/users/${userId}/lock`);
      await fetchUsers();
    } catch (err) {
      alert('Không thể cập nhật trạng thái khóa tài khoản.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Approve Request
  const handleConfirmApprove = async () => {
    if (!approveTarget) return;
    setActionProcessing(true);
    try {
      await api.patch(`/account-requests/${approveTarget.id}/approve`);
      setApproveTarget(null);
      await fetchRequests();
      // Also refresh users in background
      fetchUsers();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Không thể phê duyệt yêu cầu.');
    } finally {
      setActionProcessing(false);
    }
  };

  // Handle Reject Request
  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    setActionProcessing(true);
    try {
      await api.patch(`/account-requests/${rejectTarget.id}/reject`, {
        rejectionReason: rejectionReason.trim() || undefined,
      });
      setRejectTarget(null);
      setRejectionReason('');
      await fetchRequests();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Không thể từ chối yêu cầu.');
    } finally {
      setActionProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span>Quản Lý Người Dùng & Yêu Cầu Cấp Tài Khoản</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Hệ thống quản lý tài khoản nhân sự và tiếp nhận yêu cầu đăng ký mới
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/users/import"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import Excel</span>
          </Link>
          <Link
            href="/admin/users/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Nhân Sự Mới</span>
          </Link>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'users'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Danh Sách Người Dùng</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700">
            {total}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'requests'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Yêu Cầu Chờ Duyệt</span>
          {pendingCount > 0 ? (
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-rose-500 text-white font-bold animate-pulse">
              {pendingCount}
            </span>
          ) : (
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
              0
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: USERS LIST */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3 items-center justify-between">
            <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên, email, tài khoản..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </form>

            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
              <select
                value={deptFilter}
                onChange={(e) => {
                  setDeptFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">Tất cả phòng ban</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    [{d.code}] {d.name}
                  </option>
                ))}
              </select>

              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">Tất cả vai trò</option>
                <option value="ADMIN">Quản trị viên (ADMIN)</option>
                <option value="EMPLOYEE">Nhân viên (EMPLOYEE)</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="LOCKED">Đã khóa</option>
                <option value="REQUIRE_SETUP">Chờ thiết lập</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-xs text-slate-500">Đang tải danh sách người dùng...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Không tìm thấy người dùng nào</p>
                <p className="text-xs text-slate-400 mt-1">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Họ và Tên / Email</th>
                      <th className="py-3 px-4">Tài Khoản</th>
                      <th className="py-3 px-4">Phòng Ban</th>
                      <th className="py-3 px-4">Vai Trò</th>
                      <th className="py-3 px-4">Trạng Thái</th>
                      <th className="py-3 px-4 text-center">Lần Thi</th>
                      <th className="py-3 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {users.map((u) => {
                      const isLocked =
                        u.status === 'LOCKED' ||
                        (u.lockedUntil && new Date(u.lockedUntil) > new Date());

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{u.fullName}</div>
                            <div className="text-slate-400 text-[11px]">{u.email}</div>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-700">
                            {u.username}
                          </td>
                          <td className="py-3 px-4">
                            {u.department ? (
                              <div className="flex items-center gap-1.5 text-slate-700">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                <span>{u.department.name}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Chưa phân bổ</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {u.role === 'ADMIN' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <Shield className="w-3 h-3" />
                                <span>Quản trị</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                <UserIcon className="w-3 h-3" />
                                <span>Nhân viên</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {isLocked ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                <Lock className="w-3 h-3" />
                                <span>Đã khóa</span>
                              </span>
                            ) : u.status === 'REQUIRE_SETUP' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3" />
                                <span>Chờ thiết lập</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle className="w-3 h-3" />
                                <span>Hoạt động</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-medium text-slate-700">
                            {u._count?.attempts ?? 0}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                href={`/admin/users/${u.id}`}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Chỉnh sửa thông tin"
                              >
                                <Edit className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => handleToggleLock(u.id)}
                                disabled={actionLoadingId === u.id}
                                className={`p-1.5 rounded-lg transition ${
                                  isLocked
                                    ? 'text-rose-600 hover:bg-rose-50'
                                    : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                }`}
                                title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                              >
                                {actionLoadingId === u.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                ) : isLocked ? (
                                  <Unlock className="w-4 h-4" />
                                ) : (
                                  <Lock className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            <Pagination
              currentPage={page}
              totalItems={total}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 20, 40]}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemName="tài khoản"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ACCOUNT REQUESTS MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Requests Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3 items-center justify-between">
            <form onSubmit={handleReqSearchSubmit} className="relative w-full lg:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên, email, username..."
                value={reqSearch}
                onChange={(e) => setReqSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </form>

            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
              <select
                value={reqStatusFilter}
                onChange={(e) => {
                  setReqStatusFilter(e.target.value);
                  setReqPage(1);
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="PENDING">Chờ phê duyệt</option>
                <option value="APPROVED">Đã phê duyệt</option>
                <option value="REJECTED">Đã từ chối</option>
              </select>
            </div>
          </div>

          {/* Requests Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {isReqLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-xs text-slate-500">Đang tải danh sách yêu cầu cấp tài khoản...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="py-16 text-center">
                <UserPlus className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  Không có yêu cầu cấp tài khoản nào
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Khi nhân viên gửi biểu mẫu yêu cầu từ trang chủ, thông tin sẽ hiển thị ở đây
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Thời Gian Gửi</th>
                      <th className="py-3 px-4">Họ và Tên / Email</th>
                      <th className="py-3 px-4">Tài Khoản Yêu Cầu</th>
                      <th className="py-3 px-4">Phòng Ban / Vị Trí</th>
                      <th className="py-3 px-4">Lý Do / Ghi Chú</th>
                      <th className="py-3 px-4">Trạng Thái</th>
                      <th className="py-3 px-4 text-right">Xử Lý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {requests.map((r) => {
                      const isPending = r.status === 'PENDING';
                      const isApproved = r.status === 'APPROVED';
                      const isRejected = r.status === 'REJECTED';

                      return (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                            {new Date(r.createdAt).toLocaleString('vi-VN')}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{r.fullName}</div>
                            <div className="text-slate-400 text-[11px]">{r.email}</div>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-800">
                            {r.username}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800">
                              {r.department ? r.department.name : 'N/A'}
                            </div>
                            {r.position && (
                              <div className="text-[11px] text-slate-400">{r.position}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-slate-600" title={r.reason}>
                            {r.reason || <span className="text-slate-300 italic">Không có</span>}
                            {isRejected && r.rejectionReason && (
                              <div className="text-[11px] text-rose-600 mt-0.5">
                                Lý do từ chối: {r.rejectionReason}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {isPending && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>Chờ phê duyệt</span>
                              </span>
                            )}
                            {isApproved && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Đã phê duyệt</span>
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Đã từ chối</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setApproveTarget(r)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs transition"
                                  title="Duyệt và cấp tài khoản"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Duyệt</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectTarget(r);
                                    setRejectionReason('');
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold shadow-xs transition"
                                  title="Từ chối yêu cầu"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Từ chối</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Đã xử lý</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination for requests */}
            <Pagination
              currentPage={reqPage}
              totalItems={reqTotal}
              pageSize={reqPageSize}
              pageSizeOptions={[5, 10, 20, 40]}
              onPageChange={setReqPage}
              onPageSizeChange={setReqPageSize}
              itemName="yêu cầu"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRM APPROVE */}
      {/* ========================================================================= */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Phê Duyệt & Cấp Tài Khoản
                </h3>
                <p className="text-xs text-slate-500">
                  Xác nhận cấp quyền truy cập hệ thống thi trắc nghiệm
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-1.5 text-slate-700">
              <div>
                Họ và tên: <strong className="text-slate-900">{approveTarget.fullName}</strong>
              </div>
              <div>
                Tên đăng nhập: <strong className="text-blue-700 font-mono">{approveTarget.username}</strong>
              </div>
              <div>
                Email nội bộ: <strong className="text-slate-900">{approveTarget.email}</strong>
              </div>
              <div>
                Phòng ban: <strong className="text-slate-900">{approveTarget.department?.name}</strong>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
              💡 <strong>Lưu ý:</strong> Tài khoản sẽ được kích hoạt với vai trò{' '}
              <strong>Nhân viên (EMPLOYEE)</strong> và mật khẩu mặc định là{' '}
              <strong className="underline">User@123456</strong>.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setApproveTarget(null)}
                disabled={actionProcessing}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={actionProcessing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
              >
                {actionProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang tạo tài khoản...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Xác nhận Duyệt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRM REJECT */}
      {/* ========================================================================= */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Từ Chối Yêu Cầu Cấp Tài Khoản
                </h3>
                <p className="text-xs text-slate-500">
                  Hủy yêu cầu cấp tài khoản của {rejectTarget.fullName}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lý do từ chối (Tùy chọn)
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ví dụ: Thông tin mã nhân viên không hợp lệ hoặc email không thuộc Saigonbank..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                disabled={actionProcessing}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionProcessing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
              >
                {actionProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Xác nhận Từ Chối</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
