'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import Pagination from '@/components/Pagination';
import {
  HelpCircle,
  Search,
  Plus,
  FileSpreadsheet,
  Building2,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Edit2,
} from 'lucide-react';

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });
      if (search) params.append('search', search);
      if (deptFilter) params.append('departmentId', deptFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`/questions?${params.toString()}`);
      setQuestions(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    api.get('/departments').then((res) => setDepartments(res.data || []));
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [page, pageSize, deptFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchQuestions();
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await api.patch(`/questions/${id}/toggle-status`);
      await fetchQuestions();
    } catch (err) {
      alert('Không thể thay đổi trạng thái câu hỏi.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-emerald-600" />
            <span>Ngân Hàng Câu Hỏi Trắc Nghiệm</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tổng số: {total} câu hỏi trong ngân hàng dữ liệu
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/questions/import"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import Excel</span>
          </Link>
          <Link
            href="/admin/questions/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Câu Hỏi</span>
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo nội dung, mã câu hỏi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </form>

        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="">Tất cả phòng ban</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                [{d.code}] {d.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Đang tắt</option>
          </select>
        </div>
      </div>

      {/* Questions Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <p className="text-xs text-slate-500">Đang tải câu hỏi...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="py-16 text-center">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Chưa có câu hỏi nào</p>
            <p className="text-xs text-slate-400 mt-1">
              Bạn có thể tạo câu hỏi mới hoặc dùng tính năng Import Excel
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {questions.map((q) => {
              const isExpanded = expandedId === q.id;
              const isActive = q.status === 'ACTIVE';

              return (
                <div key={q.id} className="p-4 hover:bg-slate-50/60 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {q.code}
                        </span> */}
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-blue-50 px-2 py-0.5 rounded text-blue-700">
                          <Building2 className="w-3 h-3" />
                          <span>{q.department?.code}</span>
                        </span>
                        {!isActive && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-600">
                            Đã tắt
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm font-medium text-slate-900 leading-snug">
                        {q.content}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : q.id)}
                        className="px-2 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded text-xs inline-flex items-center gap-1 transition cursor-pointer"
                      >
                        <span>{isExpanded ? 'Ẩn đáp án' : 'Xem đáp án'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      <Link
                        href={`/admin/questions/${q.id}/edit`}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Sửa câu hỏi"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>

                      <button
                        onClick={() => handleToggleStatus(q.id)}
                        className={`p-1.5 rounded transition cursor-pointer ${
                          isActive
                            ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={isActive ? 'Tắt câu hỏi' : 'Kích hoạt câu hỏi'}
                      >
                        {isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Options */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {q.options?.map((opt: any) => (
                        <div
                          key={opt.key}
                          className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                            opt.isCorrect
                              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${
                              opt.isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {opt.key}
                          </span>
                          <span>{opt.content}</span>
                          {opt.isCorrect && (
                            <span className="ml-auto text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.2 rounded">
                              Đáp án đúng
                            </span>
                          )}
                        </div>
                      ))}

                      {q.explanation && (
                        <div className="sm:col-span-2 mt-1 p-2 bg-slate-50 rounded text-slate-500 text-xs italic">
                          💡 Giải thích: {q.explanation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
          itemName="câu hỏi"
        />
      </div>
    </div>
  );
}
