'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import Pagination from '@/components/Pagination';
import {
  History,
  Search,
  RotateCcw,
  Calendar,
  Filter,
  Eye,
  X,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  User,
  Clock,
  LogIn,
  Layers,
  Award,
  Globe,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from 'lucide-react';

interface AuditLogItem {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: any;
  ipAddress: string | null;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    fullName: string;
    email: string;
    role: 'ADMIN' | 'EMPLOYEE';
    department?: {
      id: string;
      name: string;
      code: string;
    } | null;
  } | null;
}

const ACTION_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon?: React.ReactNode }
> = {
  LOGIN: {
    label: 'Đăng nhập',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  LOGOUT: {
    label: 'Đăng xuất',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  CHANGE_PASSWORD: {
    label: 'Đổi mật khẩu',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  CREATE_EXAM: {
    label: 'Tạo kỳ thi',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  UPDATE_EXAM: {
    label: 'Cập nhật kỳ thi',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  PUBLISH_EXAM: {
    label: 'Công bố kỳ thi',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  REVERT_EXAM_TO_DRAFT: {
    label: 'Về bản nháp',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  DELETE_EXAM: {
    label: 'Xóa kỳ thi',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  START_EXAM: {
    label: 'Bắt đầu làm bài',
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  SUBMIT_EXAM: {
    label: 'Nộp bài thi',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  AUTO_SUBMIT_EXAM: {
    label: 'Tự động nộp bài',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  TAB_SWITCH_VIOLATION: {
    label: 'Vi phạm chuyển tab',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  CREATE_USER: {
    label: 'Tạo người dùng',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  UPDATE_USER: {
    label: 'Cập nhật người dùng',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  LOCK_USER: {
    label: 'Khóa tài khoản',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  UNLOCK_USER: {
    label: 'Mở khóa tài khoản',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  DELETE_USER: {
    label: 'Xóa tài khoản',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  IMPORT_USERS: {
    label: 'Import người dùng',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  CREATE_DEPARTMENT: {
    label: 'Tạo phòng ban',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  UPDATE_DEPARTMENT: {
    label: 'Cập nhật phòng ban',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  DELETE_DEPARTMENT: {
    label: 'Xóa phòng ban',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  IMPORT_DEPARTMENTS: {
    label: 'Import phòng ban',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  CREATE_QUESTION: {
    label: 'Tạo câu hỏi',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  UPDATE_QUESTION: {
    label: 'Cập nhật câu hỏi',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  DELETE_QUESTION: {
    label: 'Xóa câu hỏi',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  IMPORT_QUESTIONS: {
    label: 'Import câu hỏi',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
};

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Stats
  const [stats, setStats] = useState({
    totalToday: 0,
    loginsToday: 0,
    adminActionsToday: 0,
    examTakesToday: 0,
  });
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchStats = async () => {
    try {
      setIsStatsLoading(true);
      const res = await api.get('/audit-logs/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Lỗi khi tải thống kê audit logs:', err);
    } finally {
      setIsStatsLoading(false);
    }
  };

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: any = {
        page,
        limit: pageSize,
      };

      if (search.trim()) params.search = search.trim();
      if (actionFilter !== 'ALL') params.action = actionFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/audit-logs', { params });
      setLogs(res.data?.data || []);
      setTotal(res.data?.meta?.total || 0);
    } catch (err) {
      console.error('Lỗi khi tải danh sách lịch sử hoạt động:', err);
      setLogs([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, actionFilter, startDate, endDate]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResetFilters = () => {
    setSearch('');
    setActionFilter('ALL');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '---';
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-[#2e3e98] rounded-xl border border-blue-100">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                Lịch Sử Hoạt Động Hệ Thống
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhật ký thao tác toàn diện của Quản trị viên và Thí sinh trên hệ thống khảo thí
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            fetchStats();
            fetchLogs();
          }}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#2e3e98] bg-blue-50 hover:bg-blue-100 border border-blue-200/60 rounded-xl transition-all shadow-sm"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Làm mới dữ liệu
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Hoạt Động Hôm Nay</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">
              {isStatsLoading ? '...' : stats.totalToday.toLocaleString('vi-VN')}
            </h3>
            <p className="text-[11px] text-blue-600 font-medium mt-0.5">Tổng số lượt ghi nhận</p>
          </div>
          <div className="p-3 bg-blue-50 text-[#2e3e98] rounded-xl border border-blue-100">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Logins Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Đăng Nhập Hôm Nay</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">
              {isStatsLoading ? '...' : stats.loginsToday.toLocaleString('vi-VN')}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Phiên đăng nhập thành công</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <LogIn className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Admin Actions Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Thao Tác Quản Trị</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">
              {isStatsLoading ? '...' : stats.adminActionsToday.toLocaleString('vi-VN')}
            </h3>
            <p className="text-[11px] text-indigo-600 font-medium mt-0.5">Tạo, sửa, xóa & import</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Exam Takes Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Lượt Thi Hôm Nay</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">
              {isStatsLoading ? '...' : stats.examTakesToday.toLocaleString('vi-VN')}
            </h3>
            <p className="text-[11px] text-purple-600 font-medium mt-0.5">Bắt đầu & nộp bài thi</p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-[#2e3e98]" />
            Bộ lọc & Tìm kiếm
          </div>
          {(search || actionFilter !== 'ALL' || startDate || endDate) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Xóa bộ lọc
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, username, email, IP..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2e3e98]/20 focus:border-[#2e3e98] transition-all"
            />
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2e3e98]/20 focus:border-[#2e3e98] transition-all font-medium text-slate-700"
            >
              <option value="ALL">-- Tất cả loại hành động --</option>
              <optgroup label="Xác thực & Bảo mật">
                <option value="LOGIN">Đăng nhập</option>
                <option value="LOGOUT">Đăng xuất</option>
                <option value="CHANGE_PASSWORD">Đổi mật khẩu</option>
              </optgroup>
              <optgroup label="Khảo thí & Thí sinh">
                <option value="START_EXAM">Bắt đầu làm bài thi</option>
                <option value="SUBMIT_EXAM">Nộp bài thi</option>
                <option value="AUTO_SUBMIT_EXAM">Tự động thu bài</option>
                <option value="TAB_SWITCH_VIOLATION">Cảnh báo vi phạm chuyển tab</option>
              </optgroup>
              <optgroup label="Quản lý Kỳ thi">
                <option value="CREATE_EXAM">Tạo kỳ thi</option>
                <option value="UPDATE_EXAM">Cập nhật kỳ thi</option>
                <option value="PUBLISH_EXAM">Công bố kỳ thi</option>
                <option value="REVERT_EXAM_TO_DRAFT">Chuyển về bản nháp</option>
                <option value="DELETE_EXAM">Xóa kỳ thi</option>
              </optgroup>
              <optgroup label="Người dùng & Phòng ban">
                <option value="CREATE_USER">Tạo người dùng</option>
                <option value="UPDATE_USER">Cập nhật người dùng</option>
                <option value="LOCK_USER">Khóa tài khoản</option>
                <option value="UNLOCK_USER">Mở khóa tài khoản</option>
                <option value="DELETE_USER">Xóa người dùng</option>
                <option value="IMPORT_USERS">Import người dùng</option>
                <option value="CREATE_DEPARTMENT">Tạo phòng ban</option>
                <option value="UPDATE_DEPARTMENT">Cập nhật phòng ban</option>
                <option value="DELETE_DEPARTMENT">Xóa phòng ban</option>
                <option value="IMPORT_DEPARTMENTS">Import phòng ban</option>
              </optgroup>
              <optgroup label="Ngân hàng Câu hỏi">
                <option value="CREATE_QUESTION">Tạo câu hỏi</option>
                <option value="UPDATE_QUESTION">Cập nhật câu hỏi</option>
                <option value="DELETE_QUESTION">Xóa câu hỏi</option>
                <option value="IMPORT_QUESTIONS">Import câu hỏi</option>
              </optgroup>
            </select>
          </div>

          {/* Start Date */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              title="Từ ngày"
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2e3e98]/20 focus:border-[#2e3e98] transition-all text-slate-700"
            />
          </div>

          {/* End Date */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              title="Đến ngày"
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2e3e98]/20 focus:border-[#2e3e98] transition-all text-slate-700"
            />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-sm">Danh Sách Nhật Ký Hoạt Động</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
              {total.toLocaleString('vi-VN')} bản ghi
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#141d44] text-slate-200 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Người thực hiện</th>
                <th className="py-3 px-4">Hành động</th>
                <th className="py-3 px-4">Đối tượng</th>
                <th className="py-3 px-4">Địa chỉ IP</th>
                <th className="py-3 px-4 text-center">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="inline-flex flex-col items-center gap-2">
                      <Loader2 className="w-7 h-7 text-[#2e3e98] animate-spin" />
                      <p className="text-xs text-slate-500 font-medium">Đang tải lịch sử hoạt động...</p>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <History className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                    <p className="text-sm font-semibold text-slate-600">Không tìm thấy hoạt động nào</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh khoảng thời gian lọc.
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((item) => {
                  const cfg = ACTION_CONFIG[item.action] || {
                    label: item.action,
                    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                  };

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors duration-150"
                    >
                      {/* Time */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {formatDate(item.createdAt)}
                      </td>

                      {/* User */}
                      <td className="py-3.5 px-4">
                        {item.user ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-50 text-[#2e3e98] border border-blue-100 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {item.user.fullName?.charAt(0) || 'U'}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-800 text-xs truncate flex items-center gap-1.5">
                                {item.user.fullName}
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                    item.user.role === 'ADMIN'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {item.user.role}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                @{item.user.username}
                                {item.user.department ? ` • ${item.user.department.name}` : ''}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Hệ thống / Vô danh</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${cfg.badgeClass}`}
                        >
                          {cfg.label}
                        </span>
                      </td>

                      {/* Entity */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-700 font-medium">
                          <span className="font-semibold text-slate-900">{item.entity}</span>
                          {item.entityId && (
                            <span className="ml-1 text-[11px] text-slate-400 font-mono">
                              #{item.entityId.slice(0, 8)}
                            </span>
                          )}
                        </div>
                        {item.details && (
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">
                            {typeof item.details === 'object'
                              ? Object.entries(item.details)
                                  .filter(([_, v]) => typeof v !== 'object')
                                  .slice(0, 2)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(' • ')
                              : String(item.details)}
                          </div>
                        )}
                      </td>

                      {/* IP */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Globe className="w-3 h-3 text-slate-400" />
                          {item.ipAddress || '127.0.0.1'}
                        </span>
                      </td>

                      {/* Action View */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedLog(item)}
                          className="p-1.5 text-slate-500 hover:text-[#2e3e98] hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                          title="Xem chi tiết hoạt động"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && total > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <Pagination
              currentPage={page}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={(p) => setPage(p)}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#141d44] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-blue-300" />
                <div>
                  <h3 className="font-bold text-sm">Chi Tiết Nhật Ký Hoạt Động</h3>
                  <p className="text-[11px] text-slate-300">ID: {selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-slate-400 font-medium">Thời gian:</span>
                  <p className="font-semibold text-slate-800 mt-0.5 font-mono">
                    {formatDate(selectedLog.createdAt)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Hành động:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {ACTION_CONFIG[selectedLog.action]?.label || selectedLog.action}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Người thực hiện:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {selectedLog.user ? (
                      <>
                        {selectedLog.user.fullName} (@{selectedLog.user.username})
                      </>
                    ) : (
                      'Hệ thống'
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Địa chỉ IP:</span>
                  <p className="font-semibold text-slate-800 mt-0.5 font-mono">
                    {selectedLog.ipAddress || '127.0.0.1'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Đối tượng liên quan:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {selectedLog.entity} {selectedLog.entityId ? `(#${selectedLog.entityId})` : ''}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Vai trò người thực hiện:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {selectedLog.user?.role || '---'}
                  </p>
                </div>
              </div>

              {/* JSON Payload Details */}
              <div>
                <h4 className="font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#2e3e98]" />
                  Dữ Liệu Chi Tiết (Payload JSON)
                </h4>
                <div className="bg-[#0f1738] text-emerald-400 font-mono text-[11px] p-4 rounded-xl overflow-x-auto border border-[#1e2a5c] shadow-inner max-h-60">
                  <pre>{JSON.stringify(selectedLog.details, null, 2)}</pre>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
