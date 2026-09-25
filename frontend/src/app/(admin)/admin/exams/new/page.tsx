'use client';

import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';

export default function CreateExamPage() {
  const router = useRouter();

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
  const [isZeroTolerance, setIsZeroTolerance] = useState(true); // Cấm tuyệt đối (maxTabSwitches = 0)
  const [maxTabSwitches, setMaxTabSwitches] = useState(0);
  const [autoSubmitOnViolate, setAutoSubmitOnViolate] = useState(true);
  const [showScoreAfterSubmit, setShowScoreAfterSubmit] = useState(true);
  const [showCorrectAnswersAfterSubmit, setShowCorrectAnswersAfterSubmit] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const now = new Date();
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    setOpenAt(now.toISOString().slice(0, 16));
    setCloseAt(nextWeek.toISOString().slice(0, 16));

    api.get('/departments?onlyActive=true').then((res) => {
      const deps = res.data || [];
      setDepartments(deps);
      if (deps.length > 0) {
        const equalPct = Math.floor(100 / deps.length);
        const remainder = 100 - equalPct * deps.length;
        const initial: { [id: string]: number } = {};
        deps.forEach((d: any, idx: number) => {
          initial[d.id] = equalPct + (idx === 0 ? remainder : 0);
        });
        setDeptPercentages(initial);
      }
    });

    api.get('/users?limit=100').then((res) => {
      setAllUsers(res.data.data || []);
    });
  }, []);

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

    try {
      const departmentRules = departments
        .filter((d) => (deptPercentages[d.id] || 0) > 0)
        .map((d) => ({
          departmentId: d.id,
          percentage: deptPercentages[d.id] || 0,
          allocatedCount: countMap[d.id] || 0,
        }));

      await api.post('/exams', {
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

      router.push('/admin/exams');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể tạo kỳ thi.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsLoading(false);
    }
  };

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
            <span>Tạo Kỳ Thi Trắc Nghiệm Mới</span>
          </h1>
          <p className="text-xs text-slate-500">
            Cấu hình thời gian, đối tượng thí sinh, phân bổ câu hỏi, chống gian lận và giới hạn số lượt thi
          </p>
        </div>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{errorMessage}</span>
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

          {/* 2. Candidate Scope & Target Selection */}
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
                  <div className="text-xs font-bold text-slate-900">Toàn Công Ty</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Tất cả nhân viên đều có thể thấy và làm bài thi</div>
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
                  <div className="text-xs font-bold text-slate-900">Theo Phòng Ban</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Chỉ định một hoặc nhiều phòng ban cụ thể</div>
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
                  <div className="text-xs font-bold text-slate-900">Chỉ Định Nhân Viên</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Tìm kiếm và chọn đích danh từng nhân viên</div>
                </div>
              </label>
            </div>

            {/* Department selection */}
            {candidateScope === 'DEPARTMENTS' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="text-xs font-bold text-slate-700">Chọn các phòng ban được phép tham gia thi:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {departments.map((d) => {
                    const isChecked = assignedDepartmentIds.includes(d.id);
                    return (
                      <label
                        key={d.id}
                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                          isChecked ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleDept(d.id)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{d.name} ({d.code})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Specific users selection */}
            {candidateScope === 'SPECIFIC_USERS' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-xs font-bold text-slate-700">Tìm kiếm & chỉ định nhân viên tham gia:</div>
                  <div className="relative w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Tìm theo họ tên, username..."
                      value={userSearchText}
                      onChange={(e) => setUserSearchText(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white border border-slate-200 rounded-lg">
                  {filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">Không tìm thấy nhân viên nào phù hợp</div>
                  ) : (
                    filteredUsers.map((u) => {
                      const isChecked = assignedUserIds.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className="flex items-center justify-between p-2.5 hover:bg-slate-50 cursor-pointer text-xs transition"
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleUser(u.id)}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                              <div className="font-semibold text-slate-800">{u.fullName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">@{u.username} • {u.email}</div>
                            </div>
                          </div>
                          {isChecked && (
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                              Đã chọn
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 3. Schedule, Timing & Attempts */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b pb-2">
              3. Lịch Thi, Thời Lượng & Giới Hạn Lượt Thi
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Thời Gian Mở Đề (Open At)
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
                  Thời Gian Đóng Đề (Close At)
                </label>
                <input
                  type="datetime-local"
                  required
                  value={closeAt}
                  onChange={(e) => setCloseAt(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Thời Lượng (Phút)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={300}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                  <span>Số Lượt Thi Tối Đa</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={10}
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 4. Scoring & Department Distribution */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                4. Tiêu Chuẩn Điểm & Phân Bổ Câu Hỏi Theo Phòng Ban
              </h2>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded ${
                  isPercentageValid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}
              >
                Tổng tỷ lệ: {totalPct}% / 100%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Tổng Số Câu Hỏi Trong Đề (N)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Số Câu Đúng Tối Thiểu Để ĐẠT (Passing Threshold)
                </label>
                <input
                  type="number"
                  min={1}
                  max={totalQuestions}
                  required
                  value={passingCorrectAnswers}
                  onChange={(e) => setPassingCorrectAnswers(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Department percentages table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Mã Phòng Ban</th>
                    <th className="py-2.5 px-3">Tên Phòng Ban</th>
                    <th className="py-2.5 px-3 text-center">Tỷ Lệ (%)</th>
                    <th className="py-2.5 px-3 text-right">Số Câu Phân Bổ (Largest Remainder)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departments.map((d) => (
                    <tr key={d.id}>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800">{d.code}</td>
                      <td className="py-2 px-3 text-slate-700">{d.name}</td>
                      <td className="py-2 px-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={deptPercentages[d.id] || 0}
                            onChange={(e) =>
                              setDeptPercentages({
                                ...deptPercentages,
                                [d.id]: Number(e.target.value),
                              })
                            }
                            className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-center text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-slate-400">%</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                        {countMap[d.id] || 0} câu
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Anti-Cheating & Tab Detection Controls */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-600" />
              <span>5. Quy Định Thi & Chống Gian Lận (Proctoring)</span>
            </h2>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">Giám Sát Rời Khỏi Tab / Màn Hình Làm Bài</div>
                  <div className="text-[11px] text-slate-500">Tự động phát hiện khi thí sinh mở tab khác hoặc chuyển ứng dụng</div>
                </div>
                <input
                  type="checkbox"
                  checked={tabDetectionEnabled}
                  onChange={(e) => setTabDetectionEnabled(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                />
              </div>

              {tabDetectionEnabled && (
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label
                      onClick={() => {
                        setIsZeroTolerance(true);
                        setMaxTabSwitches(0);
                      }}
                      className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition ${
                        isZeroTolerance
                          ? 'border-rose-400 bg-rose-50/60 ring-1 ring-rose-400'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tabPolicy"
                        checked={isZeroTolerance}
                        onChange={() => {
                          setIsZeroTolerance(true);
                          setMaxTabSwitches(0);
                        }}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-rose-800 flex items-center gap-1">
                          <ShieldX className="w-3.5 h-3.5 text-rose-600" />
                          <span>Cấm Tuyệt Đối (Zero Tolerance)</span>
                        </div>
                        <div className="text-[11px] text-rose-600 mt-0.5 font-medium">
                          Chuyển tab 1 lần là tự động nộp bài ngay & báo động Admin
                        </div>
                      </div>
                    </label>

                    <label
                      onClick={() => {
                        setIsZeroTolerance(false);
                        setMaxTabSwitches(3);
                      }}
                      className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition ${
                        !isZeroTolerance
                          ? 'border-blue-400 bg-blue-50/60 ring-1 ring-blue-400'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tabPolicy"
                        checked={!isZeroTolerance}
                        onChange={() => {
                          setIsZeroTolerance(false);
                          setMaxTabSwitches(3);
                        }}
                        className="mt-0.5 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-800">Cho Phép Cảnh Báo Có Giới Hạn</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Nhắc nhở trước khi tự động nộp bài (Ví dụ: 3 lần)
                        </div>
                      </div>
                    </label>
                  </div>

                  {!isZeroTolerance && (
                    <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 text-xs">
                      <span className="font-semibold text-slate-700">Số lần rời tab tối đa cho phép trước khi nộp bài:</span>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={maxTabSwitches}
                        onChange={(e) => setMaxTabSwitches(Number(e.target.value))}
                        className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-bold text-center focus:ring-2 focus:ring-blue-500 text-xs"
                      />
                      <span className="text-slate-400">lần</span>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={autoSubmitOnViolate}
                      onChange={(e) => setAutoSubmitOnViolate(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Tự động nộp bài (AUTO_SUBMITTED) ngay khi vượt quá giới hạn vi phạm</span>
                  </label>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-800">Xáo trộn thứ tự câu hỏi cho từng thí sinh</span>
              </label>

              <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-800">Xáo trộn thứ tự đáp án A/B/C/D</span>
              </label>

              <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showScoreAfterSubmit}
                  onChange={(e) => setShowScoreAfterSubmit(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-800">Hiển thị điểm số ngay sau khi nộp bài</span>
              </label>

              <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCorrectAnswersAfterSubmit}
                  onChange={(e) => setShowCorrectAnswersAfterSubmit(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-800">Xem đáp án đúng & giải thích sau nộp</span>
              </label>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Link
              href="/admin/exams"
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition"
            >
              Hủy Bỏ
            </Link>
            <button
              type="submit"
              disabled={isLoading || !isPercentageValid}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Tạo Kỳ Thi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
