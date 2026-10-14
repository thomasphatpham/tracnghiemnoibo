'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/use-permissions';
import { PermissionGate } from '@/components/PermissionGate';
import Pagination from '@/components/Pagination';
import { Modal, message } from 'antd';
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
  RotateCcw,
  Building2,
  Edit2,
  X,
  Eye,
  ShieldAlert,
  ShieldCheck,
  Check,
} from 'lucide-react';

const { confirm } = Modal;

export default function ManagerExamsPage() {
  const { user } = useAuth();
  const { can } = usePermissions();

  const [exams, setExams] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // Modal Create/Edit Exam
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [openAt, setOpenAt] = useState('');
  const [closeAt, setCloseAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [passingCorrectAnswers, setPassingCorrectAnswers] = useState(12);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [tabDetectionEnabled, setTabDetectionEnabled] = useState(true);
  const [maxTabSwitches, setMaxTabSwitches] = useState(3);

  const deptId = user?.departmentId || user?.department?.id || '';
  const deptCode = user?.department?.code || 'ĐƠN VỊ';
  const deptName = user?.department?.name || 'Phòng ban trực thuộc';

  const fetchExams = async () => {
    setIsLoading(true);
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
      console.error('Lỗi tải danh sách kỳ thi phòng ban', err);
    } finally {
      setIsLoading(false);
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

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingExamId(null);
    setFormError('');

    const now = new Date();
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localNow = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
    const localNextWeek = new Date(nextWeek.getTime() - tzOffset).toISOString().slice(0, 16);

    setName('');
    setDescription('');
    setOpenAt(localNow);
    setCloseAt(localNextWeek);
    setDurationMinutes(30);
    setTotalQuestions(20);
    setPassingCorrectAnswers(12);
    setMaxAttempts(1);
    setTabDetectionEnabled(true);
    setMaxTabSwitches(3);

    setIsModalOpen(true);
  };

  const handleOpenEditModal = (exam: any) => {
    setIsEditing(true);
    setEditingExamId(exam.id);
    setFormError('');

    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const openLocal = exam.openAt
      ? new Date(new Date(exam.openAt).getTime() - tzOffset).toISOString().slice(0, 16)
      : '';
    const closeLocal = exam.closeAt
      ? new Date(new Date(exam.closeAt).getTime() - tzOffset).toISOString().slice(0, 16)
      : '';

    setName(exam.name || '');
    setDescription(exam.description || '');
    setOpenAt(openLocal);
    setCloseAt(closeLocal);
    setDurationMinutes(exam.durationMinutes || 30);
    setTotalQuestions(exam.totalQuestions || 20);
    setPassingCorrectAnswers(exam.passingCorrectAnswers || 12);
    setMaxAttempts(exam.maxAttempts || 1);
    setTabDetectionEnabled(exam.tabDetectionEnabled ?? true);
    setMaxTabSwitches(exam.maxTabSwitches ?? 3);

    setIsModalOpen(true);
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Vui lòng nhập tên kỳ thi.');
      return;
    }
    if (!deptId) {
      setFormError('Tài khoản của bạn chưa được liên kết với phòng ban.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      openAt: new Date(openAt).toISOString(),
      closeAt: new Date(closeAt).toISOString(),
      durationMinutes: Number(durationMinutes),
      totalQuestions: Number(totalQuestions),
      passingCorrectAnswers: Number(passingCorrectAnswers),
      maxAttempts: Number(maxAttempts),
      tabDetectionEnabled,
      maxTabSwitches: tabDetectionEnabled ? Number(maxTabSwitches) : 0,
      candidateScope: 'DEPARTMENTS',
      assignedDepartmentIds: [deptId],
      departmentRules: [
        {
          departmentId: deptId,
          percentage: 100,
          allocatedCount: Number(totalQuestions),
        },
      ],
    };

    try {
      if (isEditing && editingExamId) {
        await api.patch(`/exams/${editingExamId}`, payload);
        message.success('Cập nhật kỳ thi thành công.');
      } else {
        await api.post('/exams', payload);
        message.success('Tạo kỳ thi mới thành công.');
      }
      setIsModalOpen(false);
      await fetchExams();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể lưu kỳ thi.';
      setFormError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = (id: string, examName: string) => {
    confirm({
      title: 'Xác nhận công bố kỳ thi',
      content: `Bạn có chắc chắn muốn công bố kỳ thi "${examName}"? Thí sinh sẽ có thể xem và thực hiện bài thi khi đến giờ mở.`,
      okText: 'Công bố',
      okType: 'primary',
      cancelText: 'Hủy',
      onOk: async () => {
        setPublishingId(id);
        try {
          await api.patch(`/exams/${id}/publish`);
          message.success('Đã công bố kỳ thi thành công.');
          await fetchExams();
        } catch (err: any) {
          const msg = err.response?.data?.message || 'Không thể công bố kỳ thi.';
          message.error(Array.isArray(msg) ? msg.join(', ') : msg);
        } finally {
          setPublishingId(null);
        }
      },
    });
  };

  const handleDelete = (id: string, examName: string) => {
    confirm({
      title: 'Xác nhận xóa kỳ thi',
      content: `Bạn có chắc muốn xóa kỳ thi "${examName}"? Thao tác này không thể hoàn tác.`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await api.delete(`/exams/${id}`);
          message.success('Đã xóa kỳ thi thành công.');
          await fetchExams();
        } catch (err: any) {
          const msg = err.response?.data?.message || 'Không thể xóa kỳ thi.';
          message.error(Array.isArray(msg) ? msg.join(', ') : msg);
        }
      },
    });
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
              Quản Lý Kỳ Thi Khảo Thí - {deptName}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {deptCode}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 pl-10">
            Danh sách các kỳ thi có phân bổ câu hỏi thuộc đơn vị • Tổng cộng:{' '}
            <strong className="text-blue-600 font-semibold">{total}</strong> kỳ thi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <PermissionGate resource="exams" action="create">
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0066B1] hover:bg-[#00528e] active:bg-[#003e6d] text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Đề Thi Mới</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên kỳ thi trắc nghiệm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="PUBLISHED">Đã công bố</option>
            <option value="CLOSED">Đã đóng</option>
          </select>

          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('');
              setPage(1);
              fetchExams();
            }}
            title="Làm mới bộ lọc"
            className="p-2 border border-slate-300 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Exams Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-xs text-slate-500">Đang tải danh sách kỳ thi...</p>
          </div>
        ) : exams.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Award className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-800">Không tìm thấy kỳ thi nào</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Chưa có kỳ thi nào phân bổ câu hỏi cho đơn vị của bạn hoặc không khớp với bộ lọc tìm kiếm.
            </p>
            <PermissionGate resource="exams" action="create">
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0066B1] text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-[#00528e] transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo kỳ thi đầu tiên</span>
              </button>
            </PermissionGate>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="px-4 py-3 w-12 text-center">STT</th>
                    <th className="px-4 py-3">Tên Kỳ Thi</th>
                    <th className="px-4 py-3">Thời Gian Thi</th>
                    <th className="px-4 py-3">Thông Số Đề Thi</th>
                    <th className="px-4 py-3">Phân Bổ Đơn Vị</th>
                    <th className="px-4 py-3 text-center">Trạng Thái</th>
                    <th className="px-5 py-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {exams.map((exam, idx) => {
                    const rowNumber = (page - 1) * pageSize + idx + 1;
                    const isDraft = exam.status === 'DRAFT';
                    const isPublished = exam.status === 'PUBLISHED';
                    const isClosed = exam.status === 'CLOSED';

                    const myDeptRule = exam.departmentRules?.find(
                      (r: any) => r.departmentId === deptId,
                    );

                    return (
                      <tr key={exam.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-4 text-center text-slate-500 font-medium">
                          {rowNumber}
                        </td>

                        <td className="px-4 py-4 max-w-xs">
                          <div className="font-bold text-slate-900 text-sm">{exam.name}</div>
                          {exam.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {exam.description}
                            </p>
                          )}
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                            <span>Lượt làm bài: {exam._count?.attempts ?? 0}</span>
                          </div>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="space-y-1 text-[11px]">
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <Calendar className="w-3.5 h-3.5 text-blue-500" />
                              <span>Từ: {formatDateTime(exam.openAt)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>Đến: {formatDateTime(exam.closeAt)}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="space-y-1 text-[11px]">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                              <Clock className="w-3.5 h-3.5 text-blue-500" />
                              <span>{exam.durationMinutes} phút</span>
                              <span className="text-slate-300">•</span>
                              <span>{exam.totalQuestions} câu</span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Đạt từ: {exam.passingCorrectAnswers} câu đúng
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          {myDeptRule ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                              <Building2 className="w-3.5 h-3.5 text-blue-600" />
                              <span>
                                {myDeptRule.allocatedCount} câu ({myDeptRule.percentage}%)
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              {exam.departmentRules?.length || 0} phòng ban
                            </span>
                          )}
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

                        {/* Action buttons wrapped in PermissionGates */}
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Nút Sửa kỳ thi */}
                            <PermissionGate resource="exams" action="update">
                              <button
                                onClick={() => handleOpenEditModal(exam)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition cursor-pointer"
                                title="Chỉnh sửa thông số kỳ thi"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </PermissionGate>

                            {/* Nút Công bố (Xuất bản) */}
                            {isDraft && (
                              <PermissionGate resource="exams" action="publish">
                                <button
                                  onClick={() => handlePublish(exam.id, exam.name)}
                                  disabled={publishingId === exam.id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition disabled:opacity-50 cursor-pointer"
                                  title="Công bố đề thi cho thí sinh"
                                >
                                  {publishingId === exam.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Globe className="w-3.5 h-3.5" />
                                  )}
                                  <span>Công bố</span>
                                </button>
                              </PermissionGate>
                            )}

                            {/* Nút Xóa kỳ thi */}
                            {isDraft && (
                              <PermissionGate resource="exams" action="delete">
                                <button
                                  onClick={() => handleDelete(exam.id, exam.name)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition cursor-pointer"
                                  title="Xóa kỳ thi"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </PermissionGate>
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
      </div>

      {/* Modal Tạo/Sửa Kỳ Thi */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-blue-50/70 to-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-[#0066B1] text-white">
                  <Award className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isEditing ? 'Chỉnh Sửa Kỳ Thi Khảo Thí' : 'Tạo Kỳ Thi Trắc Nghiệm Mới'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Phòng ban trực thuộc: [{deptCode}] {deptName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveExam} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Tên Kỳ Thi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Kiểm tra kiến thức nghiệp vụ quý 4..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Mô Tả Kỳ Thi
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mục đích, đối tượng tham gia và yêu cầu đối với thí sinh..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Thời Gian Bắt Đầu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={openAt}
                    onChange={(e) => setOpenAt(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Thời Gian Kết Thúc <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={closeAt}
                    onChange={(e) => setCloseAt(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Thời Lượng (Phút)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={300}
                    required
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Tổng Số Câu Hỏi
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    required
                    value={totalQuestions}
                    onChange={(e) => setTotalQuestions(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Số Câu Đạt Tối Thiểu
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={totalQuestions}
                    required
                    value={passingCorrectAnswers}
                    onChange={(e) => setPassingCorrectAnswers(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Anti-cheat settings */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Giám Sát Rời Tab Trình Duyệt</span>
                  </label>
                  <input
                    type="checkbox"
                    checked={tabDetectionEnabled}
                    onChange={(e) => setTabDetectionEnabled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </div>

                {tabDetectionEnabled && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-600">Số lần rời tab tối đa cho phép:</span>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={maxTabSwitches}
                      onChange={(e) => setMaxTabSwitches(Number(e.target.value))}
                      className="w-20 px-2.5 py-1 bg-white border border-slate-300 rounded-md text-xs text-slate-900 font-bold text-center"
                    />
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#0066B1] hover:bg-[#00528e] text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>{isEditing ? 'Cập Nhật' : 'Tạo Kỳ Thi'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
