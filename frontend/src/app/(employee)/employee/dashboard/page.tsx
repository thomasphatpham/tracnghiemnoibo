'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import Pagination from '@/components/Pagination';
import {
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  ArrowRight,
  AlertTriangle,
  Building,
  Loader2,
  Calendar,
  History,
  Check,
  X,
  UserX,
  FileText,
  RotateCcw,
} from 'lucide-react';

export default function EmployeeDashboardPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [openExams, setOpenExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const [historyRes, examsRes] = await Promise.all([
          api.get('/attempts/my-history'),
          api.get('/exams?limit=6'),
        ]);
        setHistory(historyRes.data || []);

        // Lọc các kỳ thi đang mở
        const now = new Date().getTime();
        const activeExams = (examsRes.data?.data || []).filter((e: any) => {
          const open = new Date(e.openAt).getTime();
          const close = new Date(e.closeAt).getTime();
          return now >= open && now <= close && e.status === 'PUBLISHED';
        });
        setOpenExams(activeExams);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '—';
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

  // Thống kê nhanh từ lịch sử
  const totalAttempted = history.length;
  const passedAttempts = history.filter((h) => h.isPassed).length;
  const passRate = totalAttempted > 0 ? Math.round((passedAttempts / totalAttempted) * 100) : 0;
  const averageScore = totalAttempted > 0
    ? (history.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalAttempted).toFixed(1)
    : '0';

  const paginatedHistory = history.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 w-full">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-100 text-xs font-semibold backdrop-blur-sm">
            <Building className="w-3.5 h-3.5" />
            <span>{user?.department?.name || 'Phòng ban chưa cập nhật'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Xin chào, {user?.fullName}!
          </h1>
          <p className="text-sm text-blue-100">
            Theo dõi tiến độ khảo thí, kết quả các đợt thi sát hạch nghiệp vụ và xem lại chi tiết bài làm của bạn.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500">Số Lượt Đã Thi</span>
            <div className="text-2xl font-black text-slate-800">
              {isLoading ? '...' : totalAttempted}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <History className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500">Số Lần Đạt Chuẩn</span>
            <div className="text-2xl font-black text-emerald-600">
              {isLoading ? '...' : passedAttempts}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500">Tỷ Lệ Đạt (Pass Rate)</span>
            <div className="text-2xl font-black text-indigo-600">
              {isLoading ? '...' : `${passRate}%`}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500">Điểm Trung Bình</span>
            <div className="text-2xl font-black text-blue-700">
              {isLoading ? '...' : `${averageScore}/10`}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
            AVG
          </div>
        </div>
      </div>

      {/* Thông Báo Nếu Có Kỳ Thi Đang Mở */}
      {openExams.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-white border border-blue-200 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20 shrink-0">
              <PlayCircle className="w-5 h-5" />
            </span>
            <div>
              <div className="text-sm font-bold text-slate-900">
                Bạn có {openExams.length} kỳ thi đang mở chờ làm bài!
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Hãy sắp xếp thời gian làm bài trước khi kỳ thi đóng lại.
              </p>
            </div>
          </div>
          <Link
            href="/employee/exams"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs shrink-0 cursor-pointer"
          >
            <span>Vào Thi Ngay</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Main Section: Lịch Sử Các Cuộc Thi Mà Bạn Đã Thi */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              <span>Lịch Sử Các Kỳ Thi Bạn Đã Tham Gia</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Danh sách chi tiết kết quả, điểm số và biên bản nộp bài của bạn
            </p>
          </div>

          <Link
            href="/employee/exams"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
          >
            <span>Danh sách kỳ thi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Bảng Dữ Liệu Lịch Sử */}
        {isLoading ? (
          <div className="p-16 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
            <p className="text-xs font-medium text-slate-500">Đang tải lịch sử bài thi...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center mx-auto border border-slate-200">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Chưa có lịch sử làm bài</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Bạn chưa tham gia bất kỳ kỳ thi nào. Hãy vào mục "Danh sách kỳ thi" để bắt đầu làm bài khi có kỳ thi mở nhé!
            </p>
            <div className="pt-2">
              <Link
                href="/employee/exams"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Xem Kỳ Thi Đang Mở</span>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Kỳ thi</th>
                  <th className="px-4 py-3.5 text-center">Thời gian nộp bài</th>
                  <th className="px-4 py-3.5 text-center">Số câu đúng</th>
                  <th className="px-4 py-3.5 text-center">Điểm số</th>
                  <th className="px-4 py-3.5 text-center">Kết quả</th>
                  <th className="px-4 py-3.5 text-center">Vi phạm tab</th>
                  <th className="px-5 py-3.5 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedHistory.map((item) => {
                  const isAutoSubmitted = item.status === 'AUTO_SUBMITTED';
                  const isPassed = item.isPassed;

                  return (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-5 py-4 font-medium text-slate-900 max-w-xs">
                        <div className="font-semibold text-slate-800 line-clamp-1">{item.examName}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Thời lượng: {item.durationMinutes} phút • Tổng: {item.totalQuestions} câu (Đạt: ≥{item.passingCorrectAnswers} câu)
                        </div>
                      </td>

                      <td className="px-4 py-4 text-center whitespace-nowrap text-[11px] text-slate-500">
                        {formatDateTime(item.submittedAt || item.startedAt)}
                      </td>

                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <span className="font-bold text-slate-800">{item.correctCount || 0}</span>
                        <span className="text-slate-400">/{item.totalQuestions} câu</span>
                      </td>

                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <span className="text-sm font-black text-blue-600">
                          {item.score !== null && item.score !== undefined ? `${item.score}` : '—'}
                        </span>
                        <span className="text-[10px] text-slate-400">/10</span>
                      </td>

                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        {isAutoSubmitted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <UserX className="w-3 h-3 text-rose-600" />
                            <span>Bị Thu Bài</span>
                          </span>
                        ) : isPassed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>ĐẠT CHUẨN</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <X className="w-3 h-3 text-slate-400" />
                            <span>CHƯA ĐẠT</span>
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        {item.tabSwitchCount > 0 ? (
                          <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded text-[11px] border border-rose-200/80">
                            {item.tabSwitchCount} lần
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">0 lần</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <Link
                          href={`/employee/results/${item.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80 transition cursor-pointer"
                        >
                          <span>Xem kết quả</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

            {/* Pagination */}
            <Pagination
              currentPage={page}
              totalItems={history.length}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 20, 40]}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemName="lượt thi"
            />
          </>
        )}
      </div>
    </div>
  );
}
