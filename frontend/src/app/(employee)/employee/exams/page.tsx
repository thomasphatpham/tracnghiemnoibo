'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import Pagination from '@/components/Pagination';
import {
  Award,
  Clock,
  PlayCircle,
  Calendar,
  AlertCircle,
  Search,
  Loader2,
  CheckCircle2,
  Timer,
  ChevronRight,
  ShieldAlert,
  RotateCcw,
  Check,
  XCircle,
} from 'lucide-react';

export default function EmployeeExamsPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tabFilter, setTabFilter] = useState<'ALL' | 'OPEN' | 'UPCOMING'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchExams = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/exams?limit=50');
      // Backend đã tự động lọc ẩn các kỳ thi hết hạn (closeAt < now)
      setExams(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch employee exams', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const getExamTimeStatus = (openAtStr: string, closeAtStr: string) => {
    const now = new Date().getTime();
    const open = new Date(openAtStr).getTime();
    const close = new Date(closeAtStr).getTime();

    if (now < open) return 'UPCOMING';
    if (now > close) return 'CLOSED';
    return 'OPEN';
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Filter exams by tab & search (Chỉ hiển thị các kỳ thi chưa hết hạn: OPEN hoặc UPCOMING)
  const filteredExams = exams.filter((exam) => {
    const status = getExamTimeStatus(exam.openAt, exam.closeAt);
    if (status === 'CLOSED') return false; // Ẩn hoàn toàn kỳ thi đã hết hạn
    if (tabFilter !== 'ALL' && status !== tabFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        exam.name.toLowerCase().includes(q) ||
        (exam.description && exam.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const paginatedExams = filteredExams.slice((page - 1) * pageSize, page * pageSize);

  const activeCount = exams.filter((e) => getExamTimeStatus(e.openAt, e.closeAt) === 'OPEN').length;
  const upcomingCount = exams.filter((e) => getExamTimeStatus(e.openAt, e.closeAt) === 'UPCOMING').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="w-6 h-6 text-blue-600" />
            <span>Danh Sách Kỳ Thi Trắc Nghiệm</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi các kỳ thi hợp lệ đang mở và sắp diễn ra dành riêng cho bạn
          </p>
        </div>

        {/* Tab Filters (Đã loại bỏ tab Đã đóng) */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
          <button
            onClick={() => {
              setTabFilter('ALL');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              tabFilter === 'ALL'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            Tất cả ({filteredExams.length})
          </button>
          <button
            onClick={() => {
              setTabFilter('OPEN');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              tabFilter === 'OPEN'
                ? 'bg-white text-emerald-600 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            Đang mở ({activeCount})
          </button>
          <button
            onClick={() => {
              setTabFilter('UPCOMING');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              tabFilter === 'UPCOMING'
                ? 'bg-white text-amber-600 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            Sắp mở ({upcomingCount})
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Tìm kiếm kỳ thi theo tên hoặc mô tả..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs text-slate-800"
        />
      </div>

      {/* Exam Grid */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-xs font-medium text-slate-500">Đang tải danh sách kỳ thi...</p>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center space-y-3">
          <Award className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Hiện không có kỳ thi nào đang mở</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {search
              ? 'Không có kỳ thi nào phù hợp với từ khóa tìm kiếm của bạn.'
              : 'Hiện tại các kỳ thi đã kết thúc thời hạn làm bài hoặc chưa đến giờ mở. Bạn có thể kiểm tra kết quả tại mục Bảng điều khiển.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedExams.map((exam) => {
            const timeStatus = getExamTimeStatus(exam.openAt, exam.closeAt);
            const isOpen = timeStatus === 'OPEN';
            const isUpcoming = timeStatus === 'UPCOMING';
            const isOutOfAttempts = exam.isOutOfAttempts === true;
            const userAttemptsCount = exam.userAttemptsCount || 0;
            const maxAttempts = exam.maxAttempts || 1;

            return (
              <div
                key={exam.id}
                className={`bg-white rounded-2xl border transition flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                  isOutOfAttempts ? 'border-amber-200/80 bg-amber-50/10' : 'border-slate-200'
                }`}
              >
                <div className="p-5 space-y-4">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Mã: {exam.id.slice(0, 8).toUpperCase()}
                    </span>

                    {/* Hiển thị Trạng thái Lượt thi / Trạng thái Mở thi */}
                    {isOutOfAttempts ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <XCircle className="w-3 h-3 text-amber-600" />
                        <span>Hết Lượt Thi ({userAttemptsCount}/{maxAttempts})</span>
                      </span>
                    ) : isOpen ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Đang Mở Thi ({userAttemptsCount}/{maxAttempts} lượt)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3" />
                        Sắp Mở
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                      {exam.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 min-h-[32px]">
                      {exam.description || 'Kỳ thi sát hạch và kiểm tra năng lực nghiệp vụ định kỳ.'}
                    </p>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Timer className="w-4 h-4 text-blue-500 shrink-0" />
                      <span>{exam.durationMinutes} phút</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{exam.totalQuestions} câu hỏi</span>
                    </div>
                  </div>

                  {/* Schedule */}
                  <div className="space-y-1 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Mở đề:</span>
                      <span className="font-semibold text-slate-700">{formatDateTime(exam.openAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Hạn chót:</span>
                      <span className="font-semibold text-slate-700">{formatDateTime(exam.closeAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Button */}
                <div className="p-4 bg-slate-50/70 border-t border-slate-100">
                  {isOutOfAttempts ? (
                    <div className="space-y-1.5">
                      <button
                        disabled
                        className="w-full py-2.5 px-4 bg-amber-100/80 text-amber-800 rounded-xl text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5 border border-amber-200"
                      >
                        <XCircle className="w-4 h-4 text-amber-600" />
                        <span>Bạn Đã Hết Lượt Thi</span>
                      </button>
                      <Link
                        href="/employee/dashboard"
                        className="block text-center text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition"
                      >
                        Xem kết quả bài thi tại Dashboard →
                      </Link>
                    </div>
                  ) : isOpen ? (
                    <Link
                      href={`/employee/exams/${exam.id}`}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shadow-blue-200 cursor-pointer"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>Xem Quy Định & Vào Thi</span>
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2.5 px-4 bg-slate-200 text-slate-500 rounded-xl text-xs font-semibold cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      <Clock className="w-4 h-4" />
                      <span>Chưa Đến Giờ Thi</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && filteredExams.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <Pagination
            currentPage={page}
            totalItems={filteredExams.length}
            pageSize={pageSize}
            pageSizeOptions={[5, 10, 20, 40]}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemName="kỳ thi"
          />
        </div>
      )}
    </div>
  );
}
