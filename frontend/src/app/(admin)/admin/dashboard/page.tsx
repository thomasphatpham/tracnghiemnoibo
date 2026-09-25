'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Users,
  Building2,
  HelpCircle,
  Award,
  PlusCircle,
  FileSpreadsheet,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDepartments: 0,
    totalQuestions: 0,
    totalExams: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [usersRes, depRes, examsRes] = await Promise.all([
          api.get('/users?limit=1'),
          api.get('/departments'),
          api.get('/exams'),
        ]);

        let questionsCount = 0;
        let totalDeptCount = depRes.data?.length || 0;
        depRes.data?.forEach((d: any) => {
          questionsCount += d._count?.questions || 0;
        });

        const examsList = examsRes.data?.data || (Array.isArray(examsRes.data) ? examsRes.data : []);

        setStats({
          totalUsers: usersRes.data?.total || 0,
          totalDepartments: totalDeptCount,
          totalQuestions: questionsCount,
          totalExams: examsList.length || 0,
        });
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStats();
  }, []);

  const statCards = [
    {
      label: 'Tổng Người Dùng',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-[#2e3e98] text-white',
      link: '/admin/users',
    },
    {
      label: 'Phòng Ban Trực Thuộc',
      value: stats.totalDepartments,
      icon: Building2,
      color: 'bg-[#1e40af] text-white',
      link: '/admin/departments',
    },
    {
      label: 'Câu Hỏi Ngân Hàng',
      value: stats.totalQuestions,
      icon: HelpCircle,
      color: 'bg-emerald-600 text-white',
      link: '/admin/questions',
    },
    {
      label: 'Kỳ Thi Khảo Thí',
      value: stats.totalExams,
      icon: Award,
      color: 'bg-[#0284c7] text-white',
      link: '/admin/exams',
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Tổng Quan Quản Trị Hệ Thống
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Theo dõi dữ liệu nhân sự, danh mục phòng ban, đề thi và tiến độ khảo sát nội bộ SAIGONBANK
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={idx}
              href={card.link}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md card-interactive flex items-center justify-between group"
            >
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</span>
                <div className="text-2xl font-extrabold text-slate-900">
                  {isLoading ? '...' : card.value}
                </div>
              </div>
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-xs ${card.color} group-hover:scale-105 transition-transform`}
              >
                <Icon className="w-6 h-6" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <span>Thao Tác Nhanh Quản Trị</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/admin/users/new"
            className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition group"
          >
            <PlusCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-slate-800 group-hover:text-blue-600">
                Thêm Nhân Sự Mới
              </div>
              <div className="text-xs text-slate-500">Tạo tài khoản cán bộ nhân viên</div>
            </div>
          </Link>

          <Link
            href="/admin/questions/import"
            className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition group"
          >
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-slate-800 group-hover:text-emerald-600">
                Import Câu Hỏi Excel
              </div>
              <div className="text-xs text-slate-500">Tải tệp .xlsx ngân hàng câu hỏi</div>
            </div>
          </Link>

          <Link
            href="/admin/exams/new"
            className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 transition group"
          >
            <Award className="w-5 h-5 text-purple-600 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-slate-800 group-hover:text-purple-600">
                Tạo Kỳ Thi Mới
              </div>
              <div className="text-xs text-slate-500">Thiết lập phân bổ tỷ lệ phòng ban</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
