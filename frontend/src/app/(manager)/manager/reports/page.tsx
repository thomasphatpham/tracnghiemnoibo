"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usePermissions } from "@/lib/use-permissions";
import { PermissionGate } from "@/components/PermissionGate";
import Pagination from "@/components/Pagination";
import {
  BarChart3,
  FileSpreadsheet,
  Download,
  Users,
  Award,
  TrendingUp,
  AlertTriangle,
  Search,
  Loader2,
  Calendar,
  Building2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  ShieldAlert,
  UserCheck,
} from "lucide-react";

export default function ManagerReportsPage() {
  const { user } = useAuth();
  const { can } = usePermissions();

  const [reportData, setReportData] = useState<any>(null);
  const [examsList, setExamsList] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [examFilter, setExamFilter] = useState("");
  const [isPassedFilter, setIsPassedFilter] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Tải danh sách kỳ thi để làm bộ lọc
  useEffect(() => {
    if (user && can("exams", "read")) {
      api
        .get("/exams?limit=100")
        .then((res) => {
          const list =
            res.data?.data || (Array.isArray(res.data) ? res.data : []);
          setExamsList(list);
        })
        .catch(() => {});
    }
  }, [user, can]);

  // Tải báo cáo phòng ban
  const fetchDepartmentReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });
      if (search.trim()) params.append("search", search.trim());
      if (examFilter) params.append("examId", examFilter);
      if (isPassedFilter !== "") params.append("isPassed", isPassedFilter);

      const res = await api.get(`/reports/my-department?${params.toString()}`);
      setReportData(res.data);
    } catch (err) {
      console.error("Lỗi tải báo cáo phòng ban:", err);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, examFilter, isPassedFilter]);

  useEffect(() => {
    fetchDepartmentReport();
  }, [fetchDepartmentReport]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDepartmentReport();
  };

  const handleResetFilters = () => {
    setSearch("");
    setExamFilter("");
    setIsPassedFilter("");
    setPage(1);
  };

  // Xuất file Excel báo cáo kết quả thi của phòng ban
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (examFilter) params.examId = examFilter;
      if (isPassedFilter !== "") params.isPassed = isPassedFilter;

      const response = await api.get("/reports/my-department/export", {
        params,
        responseType: "blob",
      });

      const deptCode =
        reportData?.department?.code || user?.department?.code || "SDTC";
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Bao_Cao_Phong_Ban_${deptCode}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      alert("Không thể xuất tệp Excel báo cáo phòng ban.");
    } finally {
      setIsExporting(false);
    }
  };

  const dept = reportData?.department || user?.department;
  const summary = reportData?.summary || {
    totalEmployees: 0,
    totalAttempts: 0,
    passedCount: 0,
    avgScore: 0,
    passRate: 0,
  };
  const employees: any[] = reportData?.employees || [];
  const meta = reportData?.meta || { total: 0, page: 1, limit: 20 };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-[#0066B1]" />
              <span>Báo Cáo Kết Quả Đào Tạo & Khảo Thí</span>
            </h1>
            {dept?.code && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {dept.code}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Đơn vị:{" "}
            <strong className="text-slate-800">
              {dept?.name || "Phòng ban trực thuộc"}
            </strong>{" "}
            • Theo dõi phổ điểm, tỷ lệ đạt và xếp hạng kết quả thi của CBNV
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchDepartmentReport()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>Làm Mới</span>
          </button>

          <PermissionGate resource="reports" action="export">
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0066B1] hover:bg-[#00528e] text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              <span>Xuất Báo Cáo Excel (.xlsx)</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tổng Nhân Sự
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              ) : (
                summary.totalEmployees
              )}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block font-medium">
              Cán bộ nhân viên
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0066B1] flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tổng Lượt Thi
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              ) : (
                summary.totalAttempts
              )}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block font-medium">
              Lượt bài đã nộp
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Số Lượt Đạt
            </span>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              ) : (
                summary.passedCount
              )}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block font-medium">
              Vượt qua bài thi
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Điểm Trung Bình
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              ) : (
                `${summary.avgScore} / 10`
              )}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block font-medium">
              Thang điểm 10
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tỷ Lệ Đạt
            </span>
            <div className="text-2xl font-extrabold text-[#0066B1] mt-1">
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              ) : (
                `${summary.passRate}%`
              )}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block font-medium">
              Toàn phòng ban
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo họ tên, username, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          {/* Lọc theo kỳ thi */}
          <select
            value={examFilter}
            onChange={(e) => {
              setExamFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-xs"
          >
            <option value="">Tất cả kỳ thi</option>
            {examsList.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </select>

          {/* Lọc theo kết quả Đạt / Chưa đạt */}
          <select
            value={isPassedFilter}
            onChange={(e) => {
              setIsPassedFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">Tất cả kết quả</option>
            <option value="true">Đạt yêu cầu</option>
            <option value="false">Chưa đạt yêu cầu</option>
          </select>

          <button
            onClick={handleResetFilters}
            title="Làm mới bộ lọc"
            className="p-2 border border-slate-300 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Candidates & Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#0066B1]" />
            <p className="text-xs text-slate-500">
              Đang tải báo cáo kết quả thi phòng ban...
            </p>
          </div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-800">
              Không có dữ liệu nhân sự
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Không tìm thấy nhân viên nào trong phòng ban khớp với điều kiện
              lọc hiện tại.
            </p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="px-4 py-3 w-12 text-center">STT</th>
                    <th className="px-4 py-3">Cán Bộ Nhân Viên</th>
                    <th className="px-4 py-3">Chức Danh</th>
                    <th className="px-4 py-3">Kỳ Thi Tham Gia</th>
                    <th className="px-4 py-3 text-center">
                      Điểm Số (Thang 10)
                    </th>
                    <th className="px-4 py-3 text-center">Số Câu Đúng</th>
                    <th className="px-4 py-3 text-center">Kết Quả</th>
                    <th className="px-4 py-3 text-center">Rời Tab</th>
                    <th className="px-4 py-3 text-right">Thời Gian Nộp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp, empIdx) => {
                    const rowNumber = (page - 1) * pageSize + empIdx + 1;
                    const attempts = emp.attempts || [];

                    if (attempts.length === 0) {
                      return (
                        <tr
                          key={emp.id}
                          className="hover:bg-slate-50/70 transition"
                        >
                          <td className="px-4 py-3.5 text-center text-slate-500 font-medium">
                            {rowNumber}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900">
                              {emp.fullName}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              @{emp.username} • {emp.email}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">
                            {emp.position || "—"}
                          </td>
                          <td className="px-4 py-3.5 text-slate-400 italic">
                            Chưa có bài thi
                          </td>
                          <td className="px-4 py-3.5 text-center text-slate-400">
                            —
                          </td>
                          <td className="px-4 py-3.5 text-center text-slate-400">
                            —
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                              Chưa thi
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center text-slate-400">
                            0
                          </td>
                          <td className="px-4 py-3.5 text-right text-slate-400">
                            —
                          </td>
                        </tr>
                      );
                    }

                    return attempts.map((att: any, attIdx: number) => {
                      const isFirstAttempt = attIdx === 0;
                      return (
                        <tr
                          key={`${emp.id}-${att.id || attIdx}`}
                          className="hover:bg-slate-50/70 transition"
                        >
                          <td className="px-4 py-3.5 text-center text-slate-500 font-medium">
                            {isFirstAttempt ? rowNumber : ""}
                          </td>

                          <td className="px-4 py-3.5">
                            {isFirstAttempt ? (
                              <div>
                                <div className="font-bold text-slate-900">
                                  {emp.fullName}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  @{emp.username} • {emp.email}
                                </div>
                              </div>
                            ) : (
                              <div className="pl-4 text-[10px] text-slate-400 italic">
                                Lượt thi khác
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-slate-600">
                            {isFirstAttempt ? emp.position || "—" : ""}
                          </td>

                          <td className="px-4 py-3.5 font-medium text-slate-800">
                            {att.exam?.name || "—"}
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span
                              className={`font-mono font-bold text-sm ${
                                att.isPassed
                                  ? "text-emerald-600"
                                  : "text-rose-600"
                              }`}
                            >
                              {att.score ?? 0}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center font-mono text-slate-700">
                            {att.correctCount !== undefined &&
                            att.correctCount !== null &&
                            att.exam?.totalQuestions
                              ? `${att.correctCount}/${att.exam.totalQuestions}`
                              : "—"}
                          </td>

                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            {att.isPassed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                ĐẠT
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                CHƯA ĐẠT
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            {att.tabSwitchCount > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                <ShieldAlert className="w-3 h-3 text-rose-600" />
                                {att.tabSwitchCount} lần
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">0</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-right text-slate-600 whitespace-nowrap text-[11px]">
                            {att.submittedAt
                              ? new Date(att.submittedAt).toLocaleString(
                                  "vi-VN",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )
                              : "—"}
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={page}
              totalItems={meta.total}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 50, 100]}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemName="nhân viên"
            />
          </div>
        )}
      </div>
    </div>
  );
}
