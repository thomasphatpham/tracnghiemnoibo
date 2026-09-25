'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Pagination from '@/components/Pagination';
import {
  BarChart3,
  FileSpreadsheet,
  Download,
  Users,
  Award,
  TrendingUp,
  AlertTriangle,
  Search,
  Eye,
  X,
  Loader2,
  Calendar,
  Building2,
  CheckCircle2,
  XCircle,
  FileText,
  RotateCcw,
} from 'lucide-react';

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState<'exams' | 'departments'>('exams');

  // KPI Summary
  const [summary, setSummary] = useState<any>({
    totalExams: 0,
    totalAttempts: 0,
    completedAttempts: 0,
    averageScore: 0,
    overallPassRate: 0,
    totalViolations: 0,
  });
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);

  // Tab 1: Exams Report
  const [exams, setExams] = useState<any[]>([]);
  const [totalExamsCount, setTotalExamsCount] = useState(0);
  const [examPage, setExamPage] = useState(1);
  const [examPageSize, setExamPageSize] = useState(10);
  const [examSearch, setExamSearch] = useState('');
  const [isExamsLoading, setIsExamsLoading] = useState(true);

  // Tab 2: Departments Report
  const [departments, setDepartments] = useState<any[]>([]);
  const [isDeptsLoading, setIsDeptsLoading] = useState(true);

  // Candidate Details Modal
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateStatusFilter, setCandidateStatusFilter] = useState('ALL');
  const [isCandidatesLoading, setIsCandidatesLoading] = useState(false);
  const [isExportingExam, setIsExportingExam] = useState(false);
  const [isExportingOverview, setIsExportingOverview] = useState(false);

  // Fetch Summary
  const fetchSummary = async () => {
    setIsSummaryLoading(true);
    try {
      const res = await api.get('/reports/summary');
      setSummary(res.data);
    } catch (err) {
      console.error('Lỗi tải dữ liệu tổng quan:', err);
    } finally {
      setIsSummaryLoading(false);
    }
  };

  // Fetch Exams Report
  const fetchExams = async () => {
    setIsExamsLoading(true);
    try {
      const params = new URLSearchParams({
        page: examPage.toString(),
        limit: examPageSize.toString(),
      });
      if (examSearch) params.append('search', examSearch);

      const res = await api.get(`/reports/exams?${params.toString()}`);
      setExams(res.data.data || []);
      setTotalExamsCount(res.data.total || 0);
    } catch (err) {
      console.error('Lỗi tải báo cáo kỳ thi:', err);
    } finally {
      setIsExamsLoading(false);
    }
  };

  // Fetch Departments Report
  const fetchDepartments = async () => {
    setIsDeptsLoading(true);
    try {
      const res = await api.get('/reports/departments');
      setDepartments(res.data || []);
    } catch (err) {
      console.error('Lỗi tải báo cáo phòng ban:', err);
    } finally {
      setIsDeptsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    if (activeTab === 'exams') {
      fetchExams();
    } else {
      fetchDepartments();
    }
  }, [activeTab, examPage, examPageSize]);

  const handleExamSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setExamPage(1);
    fetchExams();
  };

  // Open Candidate Details Modal
  const openExamDetails = async (exam: any) => {
    setSelectedExam(exam);
    setCandidateSearch('');
    setCandidateStatusFilter('ALL');
    setIsCandidatesLoading(true);

    try {
      const res = await api.get(`/reports/exams/${exam.id}/candidates`);
      setCandidates(res.data.candidates || []);
    } catch (err) {
      alert('Không thể tải danh sách thí sinh của kỳ thi này.');
    } finally {
      setIsCandidatesLoading(false);
    }
  };

  // Filter candidates locally in modal
  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      !candidateSearch ||
      c.fullName.toLowerCase().includes(candidateSearch.toLowerCase()) ||
      c.username.toLowerCase().includes(candidateSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(candidateSearch.toLowerCase()) ||
      c.departmentName.toLowerCase().includes(candidateSearch.toLowerCase());

    const matchesStatus =
      candidateStatusFilter === 'ALL'
        ? true
        : candidateStatusFilter === 'PASSED'
        ? c.isPassed
        : candidateStatusFilter === 'FAILED'
        ? !c.isPassed
        : candidateStatusFilter === 'VIOLATED'
        ? c.tabSwitchCount > 0 || c.status === 'AUTO_SUBMITTED'
        : true;

    return matchesSearch && matchesStatus;
  });

  // Export Overview Excel
  const handleExportOverview = async () => {
    setIsExportingOverview(true);
    try {
      const response = await api.get('/reports/export/overview', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Bao_Cao_Tong_Hop_Ket_Qua_Cac_Ky_Thi.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      alert('Không thể xuất tệp Excel báo cáo tổng hợp.');
    } finally {
      setIsExportingOverview(false);
    }
  };

  // Export Specific Exam Excel
  const handleExportExam = async (examId: string, examName: string) => {
    setIsExportingExam(true);
    try {
      const response = await api.get(`/reports/export/exam/${examId}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Ket_Qua_${examName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      alert('Không thể xuất tệp Excel kết quả kỳ thi.');
    } finally {
      setIsExportingExam(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#2e3e98]" />
            <span>Báo Cáo & Thống Kê Kết Quả Thi</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tổng hợp phổ điểm, tỷ lệ hoàn thành, phân tích chất lượng theo phòng ban và xuất dữ liệu báo cáo
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              fetchSummary();
              if (activeTab === 'exams') fetchExams();
              else fetchDepartments();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
            title="Làm mới số liệu"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>Làm Mới</span>
          </button>

          <button
            onClick={handleExportOverview}
            disabled={isExportingOverview}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#2e3e98] hover:bg-[#233075] text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50"
          >
            {isExportingOverview ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            <span>Xuất Báo Cáo Tổng Hợp (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Exams */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Tổng Số Kỳ Thi</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {isSummaryLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : summary.totalExams}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Kỳ thi đã tạo trên hệ thống</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#2e3e98] flex items-center justify-center font-bold">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Total Completed Attempts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Lượt Thi Đã Nộp</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {isSummaryLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              ) : (
                `${summary.completedAttempts} / ${summary.totalAttempts}`
              )}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Lượt thi đã hoàn tất chấm điểm</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Average Score */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Điểm Số Trung Bình</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {isSummaryLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              ) : (
                `${summary.averageScore} / 10`
              )}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Toàn bộ thí sinh tham gia</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
        </div>

        {/* Overall Pass Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Tỷ Lệ Đạt Toàn Hệ Thống</span>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              {isSummaryLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              ) : (
                `${summary.overallPassRate}%`
              )}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {summary.totalViolations > 0 ? `${summary.totalViolations} ca rời tab cảnh báo` : 'Không có vi phạm'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('exams')}
          className={`flex items-center gap-2 py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer ${
            activeTab === 'exams'
              ? 'border-[#2e3e98] text-[#2e3e98] bg-blue-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Thống Kê Theo Kỳ Thi ({totalExamsCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('departments')}
          className={`flex items-center gap-2 py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer ${
            activeTab === 'departments'
              ? 'border-[#2e3e98] text-[#2e3e98] bg-blue-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Hiệu Suất Theo Phòng Ban</span>
        </button>
      </div>

      {/* TAB 1: EXAMS REPORT */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <form onSubmit={handleExamSearchSubmit} className="relative w-full max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên kỳ thi..."
                value={examSearch}
                onChange={(e) => setExamSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2e3e98]/30 focus:border-[#2e3e98]"
              />
            </form>
            <span className="text-xs text-slate-400">
              Tổng số: <strong>{totalExamsCount}</strong> kỳ thi
            </span>
          </div>

          {/* Exams Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {isExamsLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-7 h-7 animate-spin text-[#2e3e98]" />
                <p className="text-xs text-slate-500">Đang tổng hợp số liệu kỳ thi...</p>
              </div>
            ) : exams.length === 0 ? (
              <div className="py-16 text-center">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Chưa có dữ liệu kỳ thi</p>
                <p className="text-xs text-slate-400 mt-1">Khi các kỳ thi được tổ chức, dữ liệu sẽ hiển thị tại đây.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Tên Kỳ Thi</th>
                      <th className="py-3 px-3 text-center">Thời Gian Diễn Ra</th>
                      <th className="py-3 px-3 text-center">Số Lượt Nộp</th>
                      <th className="py-3 px-3 text-center">Điểm TB</th>
                      <th className="py-3 px-3 text-center">Cao / Thấp</th>
                      <th className="py-3 px-3 text-center">Tỷ Lệ Đạt</th>
                      <th className="py-3 px-3 text-center">Rời Tab</th>
                      <th className="py-3 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {exams.map((ex) => (
                      <tr key={ex.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 leading-snug">{ex.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {ex.durationMinutes} phút • {ex.totalQuestions} câu • Đạt: {ex.passingCorrectAnswers} câu đúng
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center text-slate-600 whitespace-nowrap">
                          <div className="text-[11px]">{new Date(ex.openAt).toLocaleDateString('vi-VN')}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(ex.closeAt).toLocaleDateString('vi-VN')}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center font-bold text-slate-800">
                          {ex.completedCount}{' '}
                          <span className="text-[10px] text-slate-400 font-normal">/ {ex.totalAttempts}</span>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                            {ex.avgScore}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center text-[11px] text-slate-600 whitespace-nowrap">
                          <span className="text-emerald-700 font-bold">{ex.maxScore}</span>
                          <span className="text-slate-300 mx-1">/</span>
                          <span className="text-rose-700 font-bold">{ex.minScore}</span>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                ex.passRate >= 70
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ex.passRate >= 50
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {ex.passRate}% ({ex.passedCount}/{ex.completedCount})
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          {ex.violationCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{ex.violationCount}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openExamDetails(ex)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#2e3e98] rounded-md text-xs font-semibold transition cursor-pointer"
                              title="Xem danh sách thí sinh đã thi"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Chi Tiết</span>
                            </button>

                            <button
                              onClick={() => handleExportExam(ex.id, ex.name)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition cursor-pointer"
                              title="Xuất file Excel của kỳ thi này"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-500" />
                              <span>Excel</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            <Pagination
              currentPage={examPage}
              totalItems={totalExamsCount}
              pageSize={examPageSize}
              pageSizeOptions={[5, 10, 20, 40]}
              onPageChange={setExamPage}
              onPageSizeChange={setExamPageSize}
              itemName="kỳ thi"
            />
          </div>
        </div>
      )}

      {/* TAB 2: DEPARTMENTS REPORT */}
      {activeTab === 'departments' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isDeptsLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-[#2e3e98]" />
              <p className="text-xs text-slate-500">Đang tổng hợp dữ liệu phòng ban...</p>
            </div>
          ) : departments.length === 0 ? (
            <div className="py-16 text-center">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Chưa có dữ liệu phòng ban</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Mã</th>
                    <th className="py-3 px-4">Tên Phòng Ban</th>
                    <th className="py-3 px-3 text-center">Tổng Nhân Sự</th>
                    <th className="py-3 px-3 text-center">Lượt Thi Hoàn Thành</th>
                    <th className="py-3 px-3 text-center">Số Lượt Đạt</th>
                    <th className="py-3 px-3 text-center">Điểm TB</th>
                    <th className="py-3 px-4 text-center">Tỷ Lệ Đạt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departments.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-[#2e3e98]">{d.code}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{d.name}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700">{d.totalUsers}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800">{d.completedAttempts}</td>
                      <td className="py-3 px-3 text-center text-emerald-700 font-bold">{d.passedCount}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded">
                          {d.avgScore}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-[#2e3e98] h-2 rounded-full"
                              style={{ width: `${Math.min(100, d.passRate)}%` }}
                            />
                          </div>
                          <span className="font-bold text-xs text-slate-800 w-10 text-right">{d.passRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CANDIDATE DETAILS MODAL */}
      {selectedExam && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50/70">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-[#2e3e98]">
                    KỲ THI
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 leading-tight">{selectedExam.name}</h2>
                </div>
                <p className="text-xs text-slate-500">
                  Thời lượng: {selectedExam.durationMinutes} phút • Tổng: {selectedExam.totalQuestions} câu • Điểm đạt:{' '}
                  {selectedExam.passingCorrectAnswers} câu đúng • Đã nộp: {candidates.length} bài
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportExam(selectedExam.id, selectedExam.name)}
                  disabled={isExportingExam}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isExportingExam ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  )}
                  <span>Tải Excel Kỳ Thi</span>
                </button>

                <button
                  onClick={() => setSelectedExam(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Filters */}
            <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo họ tên, tài khoản, phòng ban..."
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2e3e98]/30"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                {[
                  { key: 'ALL', label: 'Tất Cả' },
                  { key: 'PASSED', label: 'Đạt' },
                  { key: 'FAILED', label: 'Chưa Đạt' },
                  { key: 'VIOLATED', label: 'Có Vi Phạm' },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setCandidateStatusFilter(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      candidateStatusFilter === f.key
                        ? 'bg-[#2e3e98] text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Candidate Table */}
            <div className="overflow-y-auto flex-1 p-4">
              {isCandidatesLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-7 h-7 animate-spin text-[#2e3e98]" />
                  <p className="text-xs text-slate-500">Đang tải danh sách thí sinh...</p>
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="py-16 text-center">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-slate-600">Không tìm thấy thí sinh nào phù hợp bộ lọc</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3 text-center">Hạng</th>
                        <th className="py-2.5 px-4">Thí Sinh</th>
                        <th className="py-2.5 px-3">Phòng Ban</th>
                        <th className="py-2.5 px-3 text-center">Điểm Số</th>
                        <th className="py-2.5 px-3 text-center">Số Câu Đúng</th>
                        <th className="py-2.5 px-3 text-center">Kết Quả</th>
                        <th className="py-2.5 px-3 text-center">Rời Tab</th>
                        <th className="py-2.5 px-4 text-right">Nộp Bài</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCandidates.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-center font-bold text-slate-500">
                            #{c.rank}
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="font-bold text-slate-900">{c.fullName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {c.username} • {c.email}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-blue-700">
                            [{c.departmentCode}] {c.departmentName}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-sm text-slate-900">
                            {c.score}
                          </td>
                          <td className="py-2.5 px-3 text-center font-medium text-slate-700">
                            {c.correctCount} / {c.totalQuestions}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                c.isPassed
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {c.isPassed ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>ĐẠT</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  <span>CHƯA ĐẠT</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {c.tabSwitchCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertTriangle className="w-3 h-3" />
                                <span>{c.tabSwitchCount} lần</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right text-[11px] text-slate-500 whitespace-nowrap">
                            {c.submittedAt ? new Date(c.submittedAt).toLocaleTimeString('vi-VN') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Hiển thị <strong>{filteredCandidates.length}</strong> / {candidates.length} thí sinh
              </span>
              <button
                onClick={() => setSelectedExam(null)}
                className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Đóng Cửa Sổ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
