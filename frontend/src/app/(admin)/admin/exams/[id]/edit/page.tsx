'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Award,
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Loader2,
  Percent,
  Users,
  UserCheck,
  Building2,
  Search,
  ShieldX,
  RotateCcw,
  Lock,
  Trash2,
} from 'lucide-react';

export default function EditExamPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const examId = resolvedParams.id;
  const router = useRouter();

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [examStatus, setExamStatus] = useState<string>('DRAFT');

  const [departments, setDepartments] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [openAt, setOpenAt] = useState('');
  const [closeAt, setCloseAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [passingCorrectAnswers, setPassingCorrectAnswers] = useState(12);

  // Distribution
  const [deptPercentages, setDeptPercentages] = useState<{ [deptId: string]: number }>({});

  // Candidate Scope
  const [candidateScope, setCandidateScope] = useState<'ALL' | 'DEPARTMENTS' | 'SPECIFIC_USERS'>('ALL');
  const [assignedDepartmentIds, setAssignedDepartmentIds] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [userSearchText, setUserSearchText] = useState('');

  // Attempts limit
  const [maxAttempts, setMaxAttempts] = useState(1);

  // Anti-Cheating & Options
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const [tabDetectionEnabled, setTabDetectionEnabled] = useState(true);
  const [isZeroTolerance, setIsZeroTolerance] = useState(true);
  const [maxTabSwitches, setMaxTabSwitches] = useState(0);
  const [autoSubmitOnViolate, setAutoSubmitOnViolate] = useState(true);
  const [showScoreAfterSubmit, setShowScoreAfterSubmit] = useState(true);
  const [showCorrectAnswersAfterSubmit, setShowCorrectAnswersAfterSubmit] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReverting, setIsReverting] = useState(false);

  const handleRevertToDraft = async () => {
    if (
      !confirm(
        'Bạn có chắc chắn muốn chuyển kỳ thi này về Bản Nháp?\n\nKỳ thi sẽ tạm thời ẩn khỏi nhân viên/thí sinh để bạn có thể chỉnh sửa cấu hình đề thi. Sau khi hoàn tất, bạn có thể bấm "Công bố" lại bất cứ lúc nào.'
      )
    ) {
      return;
    }

    setIsReverting(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await api.patch(`/exams/${examId}/revert-to-draft`);
      setExamStatus('DRAFT');
      setSuccessMessage('Đã chuyển kỳ thi về trạng thái Bản Nháp thành công! Bạn có thể tự do chỉnh sửa và lưu cấu hình ngay bây giờ.');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể chuyển kỳ thi về bản nháp.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsReverting(false);
    }
  };

  const handleDeleteExam = async () => {
    setIsDeleting(true);
    setErrorMessage('');
    try {
      await api.delete(`/exams/${examId}`);
      router.push('/admin/exams');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể xóa kỳ thi này.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    async function loadAll() {
      try {
        const [depRes, usersRes, examRes] = await Promise.all([
          api.get('/departments?onlyActive=true'),
          api.get('/users?limit=200'),
          api.get(`/exams/${examId}`),
        ]);

        const deps = depRes.data || [];
        setDepartments(deps);
        setAllUsers(usersRes.data.data || []);

        const exam = examRes.data;
        setExamStatus(exam.status || 'DRAFT');
        setName(exam.name || '');
        setDescription(exam.description || '');
        setDurationMinutes(exam.durationMinutes || 30);
        setTotalQuestions(exam.totalQuestions || 20);
        setPassingCorrectAnswers(exam.passingCorrectAnswers || 12);
        setMaxAttempts(exam.maxAttempts || 1);
        setShuffleQuestions(exam.shuffleQuestions ?? true);
        setShuffleOptions(exam.shuffleOptions ?? true);
        setAutosaveEnabled(exam.autosaveEnabled ?? true);
        setTabDetectionEnabled(exam.tabDetectionEnabled ?? true);
        setAutoSubmitOnViolate(exam.autoSubmitOnViolate ?? true);
        setShowScoreAfterSubmit(exam.showScoreAfterSubmit ?? true);
        setShowCorrectAnswersAfterSubmit(exam.showCorrectAnswersAfterSubmit ?? false);

        const tabs = exam.maxTabSwitches ?? 0;
        setMaxTabSwitches(tabs);
        setIsZeroTolerance(tabs === 0);

        setCandidateScope(exam.candidateScope || 'ALL');
        setAssignedDepartmentIds((exam.assignedDepartments || []).map((d: any) => d.departmentId));
        setAssignedUserIds((exam.assignedUsers || []).map((u: any) => u.userId));

        // Load time fields
        if (exam.openAt) {
          setOpenAt(new Date(exam.openAt).toISOString().slice(0, 16));
        }
        if (exam.closeAt) {
          setCloseAt(new Date(exam.closeAt).toISOString().slice(0, 16));
        }

        // Build dept percentages from departmentRules
        const rulesMap: { [id: string]: number } = {};
        if (exam.departmentRules && exam.departmentRules.length > 0) {
          exam.departmentRules.forEach((r: any) => {
            rulesMap[r.departmentId] = r.percentage || 0;
          });
          // Fill missing depts with 0
          deps.forEach((d: any) => {
            if (rulesMap[d.id] === undefined) rulesMap[d.id] = 0;
          });
        } else {
          // Equal distribution
          const equalPct = deps.length > 0 ? Math.floor(100 / deps.length) : 0;
          const remainder = deps.length > 0 ? 100 - equalPct * deps.length : 0;
          deps.forEach((d: any, idx: number) => {
            rulesMap[d.id] = equalPct + (idx === 0 ? remainder : 0);
          });
        }
        setDeptPercentages(rulesMap);
      } catch (err) {
        setErrorMessage('Không thể tải thông tin kỳ thi.');
      } finally {
        setIsPageLoading(false);
      }
    }
    loadAll();
  }, [examId]);

  // Calculate Largest Remainder Allocation
  const calculateAllocation = () => {
    const rawItems = departments.map((d) => {
      const pct = deptPercentages[d.id] || 0;
      const raw = (totalQuestions * pct) / 100;
      const floor = Math.floor(raw);
      const rem = raw - floor;
      return { id: d.id, code: d.code, name: d.name, pct, floor, rem, count: floor };
    });

    const currentTotalFloor = rawItems.reduce((sum, item) => sum + item.floor, 0);
    let remainingToDistribute = totalQuestions - currentTotalFloor;

    const sorted = [...rawItems].sort((a, b) => {
      if (b.rem !== a.rem) return b.rem - a.rem;
      return a.code.localeCompare(b.code);
    });

    for (let i = 0; i < remainingToDistribute && i < sorted.length; i++) {
      sorted[i].count += 1;
    }

    const countMap: { [id: string]: number } = {};
    sorted.forEach((item) => {
      countMap[item.id] = item.count;
    });

    const totalPct = departments.reduce((sum, d) => sum + (deptPercentages[d.id] || 0), 0);
    return { countMap, totalPct };
  };

  const { countMap, totalPct } = calculateAllocation();
  const isPercentageValid = totalPct === 100;

  const handleToggleDept = (deptId: string) => {
    setAssignedDepartmentIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  const handleToggleUser = (userId: string) => {
    setAssignedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const filteredUsers = allUsers.filter((u) => {
    const matchText = `${u.fullName} ${u.username} ${u.email}`.toLowerCase();
    return matchText.includes(userSearchText.toLowerCase());
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Vui lòng nhập tên kỳ thi.');
      return;
    }
    if (!isPercentageValid) {
      setErrorMessage('Tổng tỷ lệ phân bổ các phòng ban phải chính xác bằng 100%.');
      return;
    }
    if (passingCorrectAnswers > totalQuestions) {
      setErrorMessage('Số câu đúng để đạt không thể lớn hơn tổng số câu hỏi.');
      return;
    }
    if (candidateScope === 'DEPARTMENTS' && assignedDepartmentIds.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất một phòng ban được chỉ định tham gia kỳ thi.');
      return;
    }
    if (candidateScope === 'SPECIFIC_USERS' && assignedUserIds.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất một nhân viên được chỉ định tham gia kỳ thi.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const departmentRules = departments
        .filter((d) => (deptPercentages[d.id] || 0) > 0)
        .map((d) => ({
          departmentId: d.id,
          percentage: deptPercentages[d.id] || 0,
          allocatedCount: countMap[d.id] || 0,
        }));

      await api.patch(`/exams/${examId}`, {
        name: name.trim(),
        description: description.trim() || undefined,
        openAt: new Date(openAt).toISOString(),
        closeAt: new Date(closeAt).toISOString(),
        durationMinutes: Number(durationMinutes),
        totalQuestions: Number(totalQuestions),
        passingCorrectAnswers: Number(passingCorrectAnswers),
        departmentRules,
        candidateScope,
        assignedDepartmentIds: candidateScope === 'DEPARTMENTS' ? assignedDepartmentIds : undefined,
        assignedUserIds: candidateScope === 'SPECIFIC_USERS' ? assignedUserIds : undefined,
        maxAttempts: Number(maxAttempts) || 1,
        shuffleQuestions,
        shuffleOptions,
        autosaveEnabled,
        tabDetectionEnabled,
        maxTabSwitches: isZeroTolerance ? 0 : Number(maxTabSwitches),
        autoSubmitOnViolate,
        showScoreAfterSubmit,
        showCorrectAnswersAfterSubmit,
      });

      setSuccessMessage('Cập nhật kỳ thi thành công!');
      setTimeout(() => {
        router.push('/admin/exams');
      }, 1000);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể cập nhật kỳ thi.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (isPageLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs text-slate-500">Đang tải thông tin kỳ thi...</p>
      </div>
    );
  }

  const isLocked = examStatus !== 'DRAFT';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/exams"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="w-6 h-6 text-blue-600" />
            <span>Chỉnh Sửa Kỳ Thi</span>
          </h1>
          <p className="text-xs text-slate-500">
            Cập nhật cấu hình, đối tượng thí sinh, phân bổ câu hỏi và chống gian lận
          </p>
        </div>
      </div>

      {/* Lock Warning */}
      {isLocked && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-amber-800 text-xs shadow-xs">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
            <div>
              <p className="font-bold text-sm">Kỳ thi đang ở trạng thái {examStatus} (Đã công bố)</p>
              <p className="mt-0.5 text-amber-700 leading-relaxed">
                Để chỉnh sửa đề thi, cơ cấu câu hỏi hoặc thời gian thi, bạn cần chuyển kỳ thi về trạng thái <strong>Bản Nháp</strong>. Sau khi chuyển, bạn có thể chỉnh sửa tự do và bấm Công bố lại.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRevertToDraft}
            disabled={isReverting}
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isReverting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            <span>Chuyển Về Bản Nháp</span>
          </button>
        </div>
      )}

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. General Info */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b pb-2">
              1. Thông Tin Chung
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tên Kỳ Thi <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Kỳ Thi Đánh Giá Nghiệp Vụ Định Kỳ Quý 3"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Mô Tả / Hướng Dẫn Thí Sinh
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Lưu ý về quy chế thi, nội dung kiến thức trọng tâm..."
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 2. Candidate Scope */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>2. Đối Tượng Tham Gia Kỳ Thi</span>
              </h2>
              <span className="text-[11px] font-medium text-slate-500">
                {candidateScope === 'ALL' && 'Áp dụng: Toàn bộ nhân viên công ty'}
                {candidateScope === 'DEPARTMENTS' && `Đã chọn: ${assignedDepartmentIds.length} phòng ban`}
                {candidateScope === 'SPECIFIC_USERS' && `Đã chọn: ${assignedUserIds.length} nhân viên`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                onClick={() => setCandidateScope('ALL')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  candidateScope === 'ALL'
                    ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="candidateScope"
                  checked={candidateScope === 'ALL'}
                  onChange={() => setCandidateScope('ALL')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900">🌐 Toàn Bộ</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Mọi nhân viên đều có thể tham gia kỳ thi này</p>
                </div>
              </label>

              <label
                onClick={() => setCandidateScope('DEPARTMENTS')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  candidateScope === 'DEPARTMENTS'
                    ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="candidateScope"
                  checked={candidateScope === 'DEPARTMENTS'}
                  onChange={() => setCandidateScope('DEPARTMENTS')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900">🏢 Theo Phòng Ban</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Chỉ nhân viên thuộc phòng ban được chọn</p>
                </div>
              </label>

              <label
                onClick={() => setCandidateScope('SPECIFIC_USERS')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  candidateScope === 'SPECIFIC_USERS'
                    ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="candidateScope"
                  checked={candidateScope === 'SPECIFIC_USERS'}
                  onChange={() => setCandidateScope('SPECIFIC_USERS')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900">👤 Nhân Viên Cụ Thể</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Chỉ định đích danh từng nhân viên tham gia</p>
                </div>
              </label>
            </div>

            {/* Dept selector */}
            {candidateScope === 'DEPARTMENTS' && (
              <div className="pt-1 space-y-2">
                <p className="text-xs font-semibold text-slate-700">Chọn phòng ban được tham gia:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {departments.map((d) => {
                    const checked = assignedDepartmentIds.includes(d.id);
                    return (
                      <label
                        key={d.id}
                        onClick={() => handleToggleDept(d.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs transition ${
                          checked
                            ? 'border-blue-500 bg-blue-50 text-blue-900 font-semibold'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleDept(d.id)}
                          className="text-blue-600"
                        />
                        <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>[{d.code}] {d.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* User picker */}
            {candidateScope === 'SPECIFIC_USERS' && (
              <div className="pt-1 space-y-3">
                <div className="flex items-center gap-2 justify-between">
                  <p className="text-xs font-semibold text-slate-700">Tìm kiếm và chọn nhân viên:</p>
                  {assignedUserIds.length > 0 && (
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                      <UserCheck className="w-3 h-3 inline-block mr-1" />
                      {assignedUserIds.length} nhân viên đã chọn
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={userSearchText}
                    onChange={(e) => setUserSearchText(e.target.value)}
                    placeholder="Tìm theo tên, username, email..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {filteredUsers.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">Không tìm thấy nhân viên nào</p>
                  )}
                  {filteredUsers.map((u) => {
                    const checked = assignedUserIds.includes(u.id);
                    return (
                      <label
                        key={u.id}
                        onClick={() => handleToggleUser(u.id)}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer text-xs transition ${
                          checked
                            ? 'border-blue-500 bg-blue-50 font-semibold text-blue-900'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleUser(u.id)}
                          className="text-blue-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{u.fullName}</p>
                          <p className="text-[11px] text-slate-500 truncate">@{u.username} · {u.department?.code || 'N/A'}</p>
                        </div>
                        {checked && <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. Schedule & Duration */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b pb-2">
              3. Lịch Thi & Thông Số
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Thời Gian Mở Thi
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
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Thời Gian Đóng Thi
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Thời Gian Làm Bài (phút)
                </label>
                <input
                  type="number"
                  min={5}
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
                  Câu Đúng Để Đạt
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
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5" /> Số Lượt Thi Tối Đa
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  required
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 4. Department Distribution */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                4. Phân Bổ Câu Hỏi Theo Phòng Ban
              </h2>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                  isPercentageValid
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                <Percent className="w-3 h-3" />
                {totalPct}% / 100%
              </span>
            </div>

            {departments.length === 0 ? (
              <p className="text-xs text-slate-400">Chưa có phòng ban nào được kích hoạt.</p>
            ) : (
              <div className="space-y-3">
                {departments.map((d) => {
                  const pct = deptPercentages[d.id] || 0;
                  const count = countMap[d.id] || 0;
                  return (
                    <div key={d.id} className="flex items-center gap-4">
                      <div className="w-28 flex-shrink-0">
                        <p className="text-xs font-mono font-bold text-slate-800">[{d.code}]</p>
                        <p className="text-[11px] text-slate-500 truncate">{d.name}</p>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={pct}
                        onChange={(e) =>
                          setDeptPercentages((prev) => ({
                            ...prev,
                            [d.id]: Number(e.target.value),
                          }))
                        }
                        className="flex-1 accent-blue-600"
                      />
                      <div className="w-28 flex items-center gap-2 flex-shrink-0">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={pct}
                          onChange={(e) =>
                            setDeptPercentages((prev) => ({
                              ...prev,
                              [d.id]: Math.min(100, Math.max(0, Number(e.target.value))),
                            }))
                          }
                          className="w-14 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-center text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <span className="text-xs text-slate-400">%</span>
                      </div>
                      <div className="w-20 text-right flex-shrink-0">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                          {count} câu
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. Anti-Cheating */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              5. Chống Gian Lận & Cài Đặt Nâng Cao
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: '🔀 Trộn thứ tự câu hỏi', value: shuffleQuestions, setter: setShuffleQuestions },
                { label: '🔀 Trộn thứ tự đáp án', value: shuffleOptions, setter: setShuffleOptions },
                { label: '💾 Tự động lưu câu trả lời', value: autosaveEnabled, setter: setAutosaveEnabled },
                { label: '📊 Hiển thị điểm sau khi nộp', value: showScoreAfterSubmit, setter: setShowScoreAfterSubmit },
                {
                  label: '✅ Hiển thị đáp án đúng sau khi nộp',
                  value: showCorrectAnswersAfterSubmit,
                  setter: setShowCorrectAnswersAfterSubmit,
                },
              ].map((item) => (
                <label
                  key={item.label}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition"
                >
                  <input
                    type="checkbox"
                    checked={item.value}
                    onChange={(e) => item.setter(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-slate-800">{item.label}</span>
                </label>
              ))}
            </div>

            {/* Tab Detection */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tabDetectionEnabled}
                  onChange={(e) => setTabDetectionEnabled(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                />
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Bật tính năng phát hiện chuyển tab / rời màn hình
                </span>
              </label>

              {tabDetectionEnabled && (
                <div className="ml-7 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSubmitOnViolate}
                      onChange={(e) => setAutoSubmitOnViolate(e.target.checked)}
                      className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                    />
                    <span className="text-xs text-slate-700">Tự động nộp bài khi vi phạm</span>
                  </label>

                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-2">Chính sách chuyển tab:</p>
                    <div className="space-y-2">
                      <label className="flex items-start gap-3 p-3 rounded-lg border border-rose-300 bg-rose-50 cursor-pointer">
                        <input
                          type="radio"
                          name="tabPolicy"
                          checked={isZeroTolerance}
                          onChange={() => setIsZeroTolerance(true)}
                          className="mt-0.5 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <p className="text-xs font-bold text-rose-800 flex items-center gap-1">
                            <ShieldX className="w-3.5 h-3.5" /> Cấm tuyệt đối (0 lần)
                          </p>
                          <p className="text-[11px] text-rose-600 mt-0.5">
                            Chuyển tab 1 lần → Tự động nộp bài và ghi nhận vi phạm
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50">
                        <input
                          type="radio"
                          name="tabPolicy"
                          checked={!isZeroTolerance}
                          onChange={() => setIsZeroTolerance(false)}
                          className="mt-0.5 text-slate-600 focus:ring-slate-500"
                        />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-slate-700">Cho phép tối đa N lần:</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={isZeroTolerance ? 3 : maxTabSwitches}
                              disabled={isZeroTolerance}
                              onChange={(e) => setMaxTabSwitches(Number(e.target.value))}
                              className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-40"
                            />
                            <span className="text-xs text-slate-500">lần chuyển tab</span>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Delete Confirmation Box */}
          {showDeleteConfirm && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs text-rose-900 font-bold">
                    Xác nhận xóa vĩnh viễn kỳ thi &quot;{name}&quot;?
                  </p>
                  <p className="text-xs text-rose-700 leading-relaxed">
                    Kỳ thi sẽ bị xóa hoàn toàn khỏi hệ thống nếu chưa có thí sinh làm bài. Thao tác này không thể hoàn tác.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold transition"
                >
                  Không, giữ lại
                </button>
                <button
                  type="button"
                  onClick={handleDeleteExam}
                  disabled={isDeleting}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang xóa...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xác nhận xóa</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-100">
            <div>
              {!showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3.5 py-2 text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Xóa vĩnh viễn kỳ thi"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xóa Kỳ Thi</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/admin/exams"
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Hủy
              </Link>
              {isLocked ? (
                <button
                  type="button"
                  onClick={handleRevertToDraft}
                  disabled={isReverting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  title="Chuyển kỳ thi về bản nháp để cho phép lưu chỉnh sửa"
                >
                  {isReverting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5" />
                  )}
                  <span>Chuyển Về Bản Nháp Để Lưu</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading || !isPercentageValid || isDeleting}
                  className="px-5 py-2 bg-[#2e3e98] hover:bg-[#233075] text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Lưu Thay Đổi</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
