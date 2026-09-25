'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import Pagination from '@/components/Pagination';
import {
  Award,
  Plus,
  Calendar,
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Globe,
  ShieldAlert,
  ShieldX,
  Users,
  RotateCcw,
  RefreshCw,
  Building2,
  UserX,
  Edit2,
  X,
  Filter,
  Eye,
  Check,
} from 'lucide-react';

export default function AdminExamsPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // Modal Giám Sát Vi Phạm của từng kỳ thi cụ thể (Hướng 2)
  const [selectedExamForViolations, setSelectedExamForViolations] = useState<any | null>(null);
  const [examViolationsData, setExamViolationsData] = useState<any | null>(null);
  const [isLoadingViolations, setIsLoadingViolations] = useState(false);
  const [violationSearch, setViolationSearch] = useState('');
  const [violationStatusFilter, setViolationStatusFilter] = useState('');

  const fetchExams = async () => {
    setIsLoading(true);
    setActionError('');
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`/exams?${params.toString()}`);
      setExams(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to load exams', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchViolationsForExam = async (examId: string, filterSearch = violationSearch, filterStatus = violationStatusFilter) => {
    setIsLoadingViolations(true);
    try {
      const params = new URLSearchParams();
      if (filterSearch.trim()) params.append('search', filterSearch.trim());
      if (filterStatus) params.append('status', filterStatus);

      const res = await api.get(`/exams/${examId}/violations?${params.toString()}`);
      setExamViolationsData(res.data);
    } catch (err) {
      console.error('Failed to load exam violations', err);
    } finally {
      setIsLoadingViolations(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [page, pageSize, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchExams();
  };

  const handleOpenViolationsModal = (exam: any) => {
    setSelectedExamForViolations(exam);
    setViolationSearch('');
    setViolationStatusFilter('');
    fetchViolationsForExam(exam.id, '', '');
  };

  const handleCloseViolationsModal = () => {
    setSelectedExamForViolations(null);
    setExamViolationsData(null);
  };

  const handleViolationSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedExamForViolations) {
      fetchViolationsForExam(selectedExamForViolations.id, violationSearch, violationStatusFilter);
    }
  };

  const handlePublish = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn công bố kỳ thi "${name}"? Thí sinh được phân công sẽ có thể thấy và bắt đầu làm bài khi đến giờ mở.`)) {
      return;
    }

    setPublishingId(id);
    setActionError('');
    try {
      await api.patch(`/exams/${id}/publish`);
      await fetchExams();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể công bố kỳ thi.';
      setActionError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setPublishingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa kỳ thi "${name}"? Thao tác này không thể hoàn tác.`)) {
      return;
    }

    try {
      await api.delete(`/exams/${id}`);
      await fetchExams();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể xóa kỳ thi.';
      alert(Array.isArray(msg) ? msg.join(', ') : msg);
    }
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Award className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Quản Lý Kỳ Thi Trắc Nghiệm
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 pl-10">
            Cấu hình đề thi, giám sát vi phạm theo từng kỳ và phân phối thí sinh • Tổng cộng: <strong className="text-blue-600 font-semibold">{total}</strong> kỳ thi
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/exams/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all hover:shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Kỳ Thi Mới</span>
          </Link>
        </div>
      </div>

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2.5 whitespace-pre-line shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="font-medium">{actionError}</div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên kỳ thi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/70 focus:bg-white transition text-slate-800"
          />
        </form>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Trạng thái:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Lọc theo trạng thái kỳ thi"
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700 font-medium cursor-pointer"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="DRAFT">Bản nháp (DRAFT)</option>
            <option value="PUBLISHED">Đã công bố (PUBLISHED)</option>
            <option value="CLOSED">Đã đóng (CLOSED)</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center text-slate-400 shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-xs font-medium text-slate-500">Đang tải danh sách kỳ thi...</p>
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-16 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-600">
            <Award className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Chưa có kỳ thi nào</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {search || statusFilter
              ? 'Không tìm thấy kỳ thi nào phù hợp với bộ lọc tìm kiếm.'
              : 'Bạn có thể bắt đầu tạo kỳ thi mới để cấu hình thời gian thi, đối tượng thí sinh, phân bổ câu hỏi và quy chế chống gian lận.'}
          </p>
          <div className="pt-2">
            <Link
              href="/admin/exams/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Kỳ Thi Mới</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Tên kỳ thi</th>
                  <th className="px-4 py-3.5">Đối tượng tham gia</th>
                  <th className="px-4 py-3.5">Thời gian thi</th>
                  <th className="px-4 py-3.5">Quy định & Lượt</th>
                  <th className="px-4 py-3.5">Phân bổ câu hỏi</th>
                  <th className="px-4 py-3.5 text-center">Trạng thái</th>
                  <th className="px-4 py-3.5 text-center">Giám sát vi phạm</th>
                  <th className="px-5 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exams.map((exam) => {
                  const isDraft = exam.status === 'DRAFT';
                  const isPublished = exam.status === 'PUBLISHED';
                  const isClosed = exam.status === 'CLOSED';
                  const violationCount = exam.violationCount || 0;

                  return (
                    <tr key={exam.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-5 py-4 font-medium text-slate-900 max-w-xs">
                        <div className="font-semibold text-slate-800 line-clamp-1">{exam.name}</div>
                        {exam.description && (
                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {exam.description}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                          <span className="font-medium text-blue-600">{exam._count?.attempts || 0}</span> lượt nộp bài
                        </div>
                      </td>

                      {/* Candidate Scope */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {exam.candidateScope === 'ALL' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                            <Users className="w-3 h-3 text-blue-600" />
                            <span>Toàn công ty</span>
                          </span>
                        )}
                        {exam.candidateScope === 'DEPARTMENTS' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                            <Building2 className="w-3 h-3 text-indigo-600" />
                            <span>{exam.assignedDepartments?.length || 0} Phòng ban</span>
                          </span>
                        )}
                        {exam.candidateScope === 'SPECIFIC_USERS' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            <Users className="w-3 h-3 text-emerald-600" />
                            <span>{exam.assignedUsers?.length || 0} Nhân viên</span>
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 text-[11px]">
                          <span className="flex items-center gap-1.5 text-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span className="font-semibold text-slate-500">Mở:</span> {formatDateTime(exam.openAt)}
                          </span>
                          <span className="flex items-center gap-1.5 text-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            <span className="font-semibold text-slate-500">Đóng:</span> {formatDateTime(exam.closeAt)}
                          </span>
                        </div>
                      </td>

                      {/* Proctoring & Attempts */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            <span>{exam.durationMinutes} phút</span>
                            <span className="text-slate-300">•</span>
                            <span>{exam.totalQuestions} câu</span>
                          </div>

                          <div className="flex items-center gap-1 text-[10px] text-slate-600">
                            <RotateCcw className="w-3 h-3 text-blue-600" />
                            <span>Tối đa: <strong className="text-blue-700">{exam.maxAttempts || 1}</strong> lượt thi</span>
                          </div>

                          {exam.tabDetectionEnabled && (
                            <div className="flex items-center gap-1 text-[10px]">
                              {exam.maxTabSwitches === 0 ? (
                                <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/80">
                                  <ShieldX className="w-3 h-3 text-rose-600" />
                                  <span>Cấm chuyển tab (0 lần)</span>
                                </span>
                              ) : (
                                <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
                                  Tab: Tối đa {exam.maxTabSwitches} lần
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {exam.departmentRules?.map((rule: any) => (
                            <span
                              key={rule.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              <span className="font-semibold text-slate-800">{rule.department?.code}:</span>
                              <span className="text-blue-700 font-bold">{rule.allocatedCount} câu</span>
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        {isDraft && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Bản nháp
                          </span>
                        )}
                        {isPublished && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Đã công bố
                          </span>
                        )}
                        {isClosed && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Đã đóng
                          </span>
                        )}
                      </td>

                      {/* Hướng 2: Nút Giám Sát Vi Phạm Riêng Từng Kỳ Thi */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        {violationCount > 0 ? (
                          <button
                            onClick={() => handleOpenViolationsModal(exam)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition shadow-xs cursor-pointer group"
                            title="Xem chi tiết các thí sinh vi phạm ở kỳ thi này"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600 group-hover:scale-110 transition-transform" />
                            <span>{violationCount} vi phạm</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenViolationsModal(exam)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer"
                            title="Kiểm tra biên bản giám sát"
                          >
                            <Eye className="w-3 h-3" />
                            <span>0 vi phạm</span>
                          </button>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Nút Sửa */}
                          <Link
                            href={`/admin/exams/${exam.id}/edit`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200/60 hover:border-blue-200 transition cursor-pointer"
                            title="Chỉnh sửa kỳ thi"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>

                          {isDraft && (
                            <>
                              <button
                                onClick={() => handlePublish(exam.id, exam.name)}
                                disabled={publishingId === exam.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition disabled:opacity-50 cursor-pointer"
                                title="Công bố kỳ thi cho thí sinh"
                              >
                                {publishingId === exam.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Globe className="w-3.5 h-3.5" />
                                )}
                                <span>Công bố</span>
                              </button>

                              <button
                                onClick={() => handleDelete(exam.id, exam.name)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/60 hover:border-rose-200 transition cursor-pointer"
                                title="Xóa kỳ thi"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
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
            totalItems={total}
            pageSize={pageSize}
            pageSizeOptions={[5, 10, 20, 40]}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemName="kỳ thi"
          />
        </div>
      )}

      {/* Modal Giám Sát Vi Phạm Riêng Cho Từng Kỳ Thi (Hướng 2) */}
      {selectedExamForViolations && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-blue-50/70 via-white to-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/30">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Biên Bản Giám Sát & Vi Phạm Phòng Thi
                    </h3>
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">
                      Kỳ thi: {selectedExamForViolations.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Quy định: {selectedExamForViolations.maxTabSwitches === 0 ? 'Cấm tuyệt đối (0 lần chuyển tab)' : `Tối đa ${selectedExamForViolations.maxTabSwitches} lần chuyển tab`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchViolationsForExam(selectedExamForViolations.id)}
                  disabled={isLoadingViolations}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
                  title="Làm mới danh sách"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingViolations ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
                  <span>Cập nhật</span>
                </button>
                <button
                  onClick={handleCloseViolationsModal}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  title="Đóng cửa sổ"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar trong Modal */}
            {examViolationsData?.summary && (
              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border-b border-slate-200 text-center">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
                  <div className="text-[11px] font-medium text-slate-500 uppercase">Thí sinh vi phạm</div>
                  <div className="text-lg font-bold text-slate-800 mt-0.5">
                    {examViolationsData.summary.totalViolators}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
                  <div className="text-[11px] font-medium text-rose-600 uppercase">Bị cưỡng chế thu bài</div>
                  <div className="text-lg font-bold text-rose-700 mt-0.5">
                    {examViolationsData.summary.autoSubmittedCount}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
                  <div className="text-[11px] font-medium text-blue-600 uppercase">Tổng số lần chuyển tab</div>
                  <div className="text-lg font-bold text-blue-700 mt-0.5">
                    {examViolationsData.summary.totalSwitches}
                  </div>
                </div>
              </div>
            )}

            {/* Search and Filters trong Modal */}
            <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
              <form onSubmit={handleViolationSearchSubmit} className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo tên thí sinh, username, email..."
                  value={violationSearch}
                  onChange={(e) => setViolationSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition"
                />
              </form>

              <select
                value={violationStatusFilter}
                onChange={(e) => {
                  setViolationStatusFilter(e.target.value);
                  fetchViolationsForExam(selectedExamForViolations.id, violationSearch, e.target.value);
                }}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700 font-medium cursor-pointer w-full sm:w-auto"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="AUTO_SUBMITTED">Bị thu bài tự động (AUTO_SUBMITTED)</option>
                <option value="SUBMITTED">Đã nộp bài bình thường</option>
                <option value="IN_PROGRESS">Đang làm bài</option>
              </select>
            </div>

            {/* Body: Danh sách Thí sinh dạng Bảng rõ ràng */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {isLoadingViolations ? (
                <div className="p-12 text-center text-slate-400">
                  <Loader2 className="w-7 h-7 animate-spin mx-auto text-blue-600 mb-2" />
                  <p className="text-xs">Đang tải dữ liệu biên bản...</p>
                </div>
              ) : !examViolationsData?.violations || examViolationsData.violations.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">Không có vi phạm nào</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Kỳ thi này tuân thủ quy chế 100% hoặc không có thí sinh nào khớp với bộ lọc tìm kiếm.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Thí sinh</th>
                        <th className="px-4 py-3">Phòng ban</th>
                        <th className="px-3 py-3 text-center">Số lần chuyển tab</th>
                        <th className="px-4 py-3 text-center">Trạng thái bài làm</th>
                        <th className="px-4 py-3 text-right">Vi phạm gần nhất</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {examViolationsData.violations.map((v: any) => {
                        const isAutoSubmitted = v.status === 'AUTO_SUBMITTED';
                        return (
                          <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3.5">
                              <div className="font-semibold text-slate-900">{v.user?.fullName}</div>
                              <div className="text-[11px] text-slate-400 font-mono">@{v.user?.username} • {v.user?.email}</div>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                <span>{v.user?.department?.name || 'N/A'}</span>
                              </span>
                            </td>
                            <td className="px-3 py-3.5 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                isAutoSubmitted || v.tabSwitchCount >= 3
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {v.tabSwitchCount} lần
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              {isAutoSubmitted ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <UserX className="w-3 h-3 text-rose-600" />
                                  <span>Bị Thu Bài</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                  {v.status}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right text-[11px] text-slate-500">
                              {formatDateTime(v.updatedAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-white flex justify-end">
              <button
                onClick={handleCloseViolationsModal}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
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
