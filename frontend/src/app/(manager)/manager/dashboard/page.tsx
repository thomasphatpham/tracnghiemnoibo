'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/use-permissions';
import { PermissionGate } from '@/components/PermissionGate';
import {
  HelpCircle,
  Award,
  Users,
  TrendingUp,
  PlusCircle,
  FileSpreadsheet,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

export default function ManagerDashboardPage() {
  const { user } = useAuth();
  const { can } = usePermissions();

  const [stats, setStats] = useState({
    totalQuestions: 0,
    activeExams: 0,
    totalEmployees: 0,
    avgScore: 0,
    passRate: 0,
  });
  const [departmentInfo, setDepartmentInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        const promises: Promise<any>[] = [];

        // 1. Questions count (if can read questions)
        if (can('questions', 'read')) {
          promises.push(api.get('/questions?limit=1'));
        } else {
          promises.push(Promise.resolve({ data: { total: 0 } }));
        }

        // 2. Exams count (if can read exams)
        if (can('exams', 'read')) {
          promises.push(api.get('/exams?limit=100'));
        } else {
          promises.push(Promise.resolve({ data: { data: [] } }));
        }

        // 3. Department report & summary (if can read reports)
        if (can('reports', 'read')) {
          promises.push(api.get('/reports/my-department?limit=1'));
        } else {
          promises.push(Promise.resolve({ data: null }));
        }

        const [questionsRes, examsRes, reportRes] = await Promise.allSettled(promises);

        let totalQuestions = 0;
        if (questionsRes.status === 'fulfilled' && questionsRes.value?.data) {
          totalQuestions = questionsRes.value.data.total ?? 0;
        }

        let activeExams = 0;
        if (examsRes.status === 'fulfilled' && examsRes.value?.data) {
          const list = examsRes.value.data.data || (Array.isArray(examsRes.value.data) ? examsRes.value.data : []);
          activeExams = list.filter((e: any) => e.status === 'PUBLISHED').length;
        }

        let totalEmployees = 0;
        let avgScore = 0;
        let passRate = 0;
        if (reportRes.status === 'fulfilled' && reportRes.value?.data) {
          const summary = reportRes.value.data.summary;
          if (summary) {
            totalEmployees = summary.totalEmployees || 0;
            avgScore = summary.avgScore || 0;
            passRate = summary.passRate || 0;
          }
          if (reportRes.value.data.department) {
            setDepartmentInfo(reportRes.value.data.department);
          }
        }

        setStats({
          totalQuestions,
          activeExams,
          totalEmployees,
          avgScore,
          passRate,
        });
      } catch (err) {
        console.error('Lỗi tải dữ liệu dashboard phòng ban', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, [can]);

  const deptName = departmentInfo?.name || user?.department?.name || 'Chưa phân bổ';
  const deptCode = departmentInfo?.code || user?.department?.code || 'N/A';

  const statCards = [
    {
      label: 'Câu Hỏi Phòng Ban',
      value: stats.totalQuestions,
      unit: 'câu hỏi',
      icon: HelpCircle,
      color: 'bg-emerald-600 text-white',
      link: '/manager/questions',
      permission: can('questions', 'read'),
    },
    {
      label: 'Kỳ Thi Đang Mở',
      value: stats.activeExams,
      unit: 'kỳ thi',
      icon: Award,
      color: 'bg-[#0066B1] text-white',
      link: '/manager/exams',
      permission: can('exams', 'read'),
    },
    {
      label: 'Nhân Sự Đơn Vị',
      value: stats.totalEmployees,
      unit: 'nhân viên',
      icon: Users,
      color: 'bg-amber-600 text-white',
      link: '/manager/reports',
      permission: can('reports', 'read'),
    },
    {
      label: 'Tỷ Lệ Đạt TB',
      value: `${stats.passRate}%`,
      unit: `Điểm TB: ${stats.avgScore}`,
      icon: TrendingUp,
      color: 'bg-purple-600 text-white',
      link: '/manager/reports',
      permission: can('reports', 'read'),
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Banner Đơn Vị */}
      <div className="bg-gradient-to-r from-[#141d44] via-[#1c285e] to-[#0066B1] rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-semibold backdrop-blur-xs border border-white/15">
            <Building2 className="w-3.5 h-3.5 text-blue-300" />
            <span>Phòng Ban: [{deptCode}] {deptName}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Xin chào, {user?.fullName || 'Quản lý phòng ban'}!
          </h1>
          <p className="text-sm text-blue-100 max-w-2xl">
            Cổng quản lý khảo thí dành cho Trưởng đơn vị. Theo dõi ngân hàng câu hỏi nghiệp vụ, tiến độ thi và kết quả khảo sát của nhân sự thuộc phòng ban.
          </p>
        </div>
        <div className="absolute right-4 -bottom-6 opacity-10 pointer-events-none">
          <Building2 className="w-56 h-56 text-white" />
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          const CardContent = (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition flex items-center justify-between group">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {card.label}
                </span>
                <div className="text-2xl font-extrabold text-slate-900">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  ) : card.permission ? (
                    card.value
                  ) : (
                    '—'
                  )}
                </div>
                <span className="text-[11px] text-slate-400 block font-medium">
                  {card.unit}
                </span>
              </div>
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-xs ${card.color} group-hover:scale-105 transition-transform`}
              >
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );

          return card.permission ? (
            <Link key={idx} href={card.link}>
              {CardContent}
            </Link>
          ) : (
            <div key={idx} className="opacity-80">
              {CardContent}
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <span>Thao Tác Nhanh Quản Lý</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <PermissionGate resource="questions" action="create">
            <Link
              href="/manager/questions/new"
              className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition group"
            >
              <PlusCircle className="w-6 h-6 text-emerald-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
              <div>
                <div className="text-sm font-semibold text-slate-800 group-hover:text-emerald-700">
                  Tạo Câu Hỏi Mới
                </div>
                <div className="text-xs text-slate-500">Soạn thảo câu hỏi ngân hàng đơn vị</div>
              </div>
            </Link>
          </PermissionGate>

          <PermissionGate resource="exams" action="create">
            <Link
              href="/manager/exams"
              className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition group"
            >
              <Award className="w-6 h-6 text-blue-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
              <div>
                <div className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">
                  Tạo Đề Thi Mới
                </div>
                <div className="text-xs text-slate-500">Quản lý các kỳ thi thuộc đơn vị</div>
              </div>
            </Link>
          </PermissionGate>

          <PermissionGate resource="reports" action="read">
            <Link
              href="/manager/reports"
              className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 transition group"
            >
              <BarChart3 className="w-6 h-6 text-purple-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
              <div>
                <div className="text-sm font-semibold text-slate-800 group-hover:text-purple-700">
                  Xem Báo Cáo Phòng Ban
                </div>
                <div className="text-xs text-slate-500">Thống kê điểm số và tỷ lệ hoàn thành</div>
              </div>
            </Link>
          </PermissionGate>
        </div>
      </div>
    </div>
  );
}
