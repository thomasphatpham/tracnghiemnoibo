'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/use-permissions';
import { PermissionGate } from '@/components/PermissionGate';
import Pagination from '@/components/Pagination';
import { Modal, message } from 'antd';
import {
  HelpCircle,
  Search,
  Plus,
  Building2,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Download,
} from 'lucide-react';

const { confirm } = Modal;

export default function ManagerQuestionsPage() {
  const { user } = useAuth();
  const { can } = usePermissions();

  const [questions, setQuestions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const deptName = user?.department?.name || 'Phòng ban trực thuộc';
  const deptCode = user?.department?.code || 'ĐƠN VỊ';

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`/questions?${params.toString()}`);
      setQuestions(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Lỗi tải câu hỏi phòng ban', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [page, pageSize, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchQuestions();
  };

  const handleToggleStatus = async (id: string) => {
    setTogglingId(id);
    try {
      await api.patch(`/questions/${id}/toggle-status`);
      message.success('Đã cập nhật trạng thái câu hỏi.');
      await fetchQuestions();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể thay đổi trạng thái câu hỏi.';
      message.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = (id: string, code: string) => {
    confirm({
      title: 'Xác nhận xóa câu hỏi',
      content: `Bạn có chắc chắn muốn xóa câu hỏi [${code}]? Thao tác này không thể hoàn tác nếu câu hỏi chưa liên kết với bài làm nào.`,
      okText: 'Xóa câu hỏi',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await api.delete(`/questions/${id}`);
          message.success('Đã xóa câu hỏi thành công.');
          await fetchQuestions();
        } catch (err: any) {
          const msg = err.response?.data?.message || 'Không thể xóa câu hỏi này.';
          message.error(Array.isArray(msg) ? msg.join(', ') : msg);
        }
      },
    });
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/questions/import/template', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Mau_Import_Ngan_Hang_Cau_Hoi_${deptCode}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      message.error('Không thể tải file mẫu Excel.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-emerald-600" />
              <span>Ngân Hàng Câu Hỏi - {deptName}</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {deptCode}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tổng cộng: <strong className="text-emerald-600">{total}</strong> câu hỏi thuộc phạm vi quản lý của phòng ban
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tải tệp mẫu */}
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
            title="Tải tệp mẫu Excel có định dạng chuẩn của đơn vị"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Tải Tệp Mẫu</span>
          </button>

          {/* Import Excel */}
          <PermissionGate resource="questions" action="import">
            <Link
              href="/manager/questions/import"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Import Excel</span>
            </Link>
          </PermissionGate>

          {/* Thêm câu hỏi */}
          <PermissionGate resource="questions" action="create">
            <Link
              href="/manager/questions/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Câu Hỏi</span>
            </Link>
          </PermissionGate>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo mã câu hỏi hoặc nội dung..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Đang tắt</option>
          </select>

          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('');
              setPage(1);
              fetchQuestions();
            }}
            title="Làm mới bộ lọc"
            className="p-2 border border-slate-300 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Questions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <p className="text-xs text-slate-500">Đang tải danh sách câu hỏi...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-800">Không tìm thấy câu hỏi nào</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Chưa có câu hỏi nào trong ngân hàng dữ liệu của đơn vị hoặc không khớp với điều kiện tìm kiếm.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <PermissionGate resource="questions" action="import">
                <Link
                  href="/manager/questions/import"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold shadow-xs transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
                  <span>Import Excel</span>
                </Link>
              </PermissionGate>
              <PermissionGate resource="questions" action="create">
                <Link
                  href="/manager/questions/new"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-emerald-700 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo câu hỏi đầu tiên</span>
                </Link>
              </PermissionGate>
            </div>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="px-4 py-3 w-12 text-center">STT</th>
                    <th className="px-4 py-3 w-36">Mã Câu Hỏi</th>
                    <th className="px-4 py-3">Nội Dung Câu Hỏi</th>
                    <th className="px-4 py-3 w-28 text-center">Trạng Thái</th>
                    <th className="px-4 py-3 w-24 text-center">Chi Tiết</th>
                    <th className="px-4 py-3 w-36 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {questions.map((q, idx) => {
                    const isExpanded = expandedId === q.id;
                    const rowNumber = (page - 1) * pageSize + idx + 1;
                    return (
                      <React.Fragment key={q.id}>
                        <tr className="hover:bg-slate-50/70 transition">
                          <td className="px-4 py-3 text-center text-slate-500 font-medium">
                            {rowNumber}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">
                            {q.code}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-slate-900 font-medium line-clamp-2">{q.content}</p>
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {q.status === 'ACTIVE' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Hoạt động
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                <XCircle className="w-3 h-3 text-slate-400" />
                                Đang tắt
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : q.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                            >
                              <span>{isExpanded ? 'Ẩn' : 'Xem'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              {/* Sửa câu hỏi */}
                              <PermissionGate resource="questions" action="update">
                                <Link
                                  href={`/manager/questions/${q.id}/edit`}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                  title="Chỉnh sửa câu hỏi"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Link>
                              </PermissionGate>

                              {/* Bật / Tắt trạng thái */}
                              <PermissionGate resource="questions" action="update">
                                <button
                                  onClick={() => handleToggleStatus(q.id)}
                                  disabled={togglingId === q.id}
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer disabled:opacity-50 ${
                                    q.status === 'ACTIVE'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  }`}
                                  title={q.status === 'ACTIVE' ? 'Tạm ngưng câu hỏi này' : 'Kích hoạt câu hỏi này'}
                                >
                                  {togglingId === q.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin inline mr-0.5" />
                                  ) : null}
                                  <span>{q.status === 'ACTIVE' ? 'Tắt' : 'Bật'}</span>
                                </button>
                              </PermissionGate>

                              {/* Xóa câu hỏi */}
                              <PermissionGate resource="questions" action="delete">
                                <button
                                  onClick={() => handleDelete(q.id, q.code)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                  title="Xóa câu hỏi vĩnh viễn"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </PermissionGate>
                            </div>
                          </td>
                        </tr>

                        {/* Chi tiết 4 đáp án khi mở rộng */}
                        {isExpanded && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={6} className="px-8 py-4">
                              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                  Các Phương Án Trả Lời:
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {q.options?.map((opt: any) => (
                                    <div
                                      key={opt.id || opt.key}
                                      className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                                        opt.isCorrect
                                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                          : 'bg-slate-50/50 border-slate-200 text-slate-700'
                                      }`}
                                    >
                                      <span
                                        className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] flex-shrink-0 ${
                                          opt.isCorrect
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-200 text-slate-700'
                                        }`}
                                      >
                                        {opt.key}
                                      </span>
                                      <span className="flex-1 mt-0.5">{opt.content}</span>
                                      {opt.isCorrect && (
                                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                                          ĐÚNG
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                {q.explanation && (
                                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-600">
                                    <strong className="text-slate-800">Giải thích:</strong> {q.explanation}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={page}
              totalItems={total}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemName="câu hỏi"
            />
          </div>
        )}
      </div>
    </div>
  );
}
