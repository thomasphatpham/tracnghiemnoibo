'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/use-permissions';
import {
  HelpCircle,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Building2,
  Lock,
} from 'lucide-react';
import { Modal } from 'antd';

const { confirm } = Modal;

export default function ManagerEditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const questionId = resolvedParams.id;
  const router = useRouter();
  const { user } = useAuth();
  const { can } = usePermissions();

  const [code, setCode] = useState('');
  const [department, setDepartment] = useState<any>(null);
  const [content, setContent] = useState('');
  const [explanation, setExplanation] = useState('');

  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctKey, setCorrectKey] = useState<'A' | 'B' | 'C' | 'D'>('A');

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const qRes = await api.get(`/questions/${questionId}`);
        const q = qRes.data;

        setCode(q.code || '');
        setDepartment(q.department || user?.department);
        setContent(q.content || '');
        setExplanation(q.explanation || '');

        if (q.options && q.options.length >= 4) {
          const opts: any[] = q.options;
          const findOpt = (key: string) => opts.find((o: any) => o.key === key)?.content || '';
          setOptionA(findOpt('A'));
          setOptionB(findOpt('B'));
          setOptionC(findOpt('C'));
          setOptionD(findOpt('D'));
          const correct = opts.find((o: any) => o.isCorrect);
          if (correct) setCorrectKey(correct.key as any);
        }
      } catch (err: any) {
        setErrorMessage(err.response?.data?.message || 'Không thể tải thông tin câu hỏi.');
      } finally {
        setIsPageLoading(false);
      }
    }
    loadData();
  }, [questionId, user]);

  const handleDeleteQuestion = () => {
    confirm({
      title: 'Xác nhận xóa câu hỏi',
      content: `Bạn có chắc chắn muốn xóa vĩnh viễn câu hỏi [${code}]? Thao tác này không thể hoàn tác nếu chưa có thí sinh nào làm bài thi chứa câu hỏi này.`,
      okText: 'Xóa câu hỏi',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        setIsDeleting(true);
        setErrorMessage('');
        try {
          await api.delete(`/questions/${questionId}`);
          router.push('/manager/questions');
        } catch (err: any) {
          const msg = err.response?.data?.message || 'Không thể xóa câu hỏi này.';
          setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setErrorMessage('Vui lòng điền nội dung câu hỏi.');
      return;
    }
    if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ cả 4 phương án A, B, C, D.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await api.patch(`/questions/${questionId}`, {
        departmentId: user?.departmentId,
        content: content.trim(),
        explanation: explanation.trim() || undefined,
        options: [
          { key: 'A', content: optionA.trim(), isCorrect: correctKey === 'A' },
          { key: 'B', content: optionB.trim(), isCorrect: correctKey === 'B' },
          { key: 'C', content: optionC.trim(), isCorrect: correctKey === 'C' },
          { key: 'D', content: optionD.trim(), isCorrect: correctKey === 'D' },
        ],
      });

      setSuccessMessage('Cập nhật câu hỏi thành công!');
      setTimeout(() => {
        router.push('/manager/questions');
      }, 1000);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể cập nhật câu hỏi.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!can('questions', 'update')) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-800">Không có quyền truy cập</h2>
        <p className="text-xs text-slate-500">
          Bạn không có quyền chỉnh sửa câu hỏi trắc nghiệm (questions:update). Vui lòng liên hệ Quản trị viên để được cấp quyền.
        </p>
        <Link
          href="/manager/questions"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách câu hỏi</span>
        </Link>
      </div>
    );
  }

  if (isPageLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-xs text-slate-500">Đang tải thông tin câu hỏi...</p>
      </div>
    );
  }

  const deptCode = department?.code || user?.department?.code || 'ĐƠN VỊ';
  const deptName = department?.name || user?.department?.name || 'Phòng ban trực thuộc';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/manager/questions"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-emerald-600" />
            <span>Chỉnh Sửa Câu Hỏi Phòng Ban</span>
          </h1>
          <p className="text-xs text-slate-500">
            Chỉnh sửa nội dung, các phương án đáp án và phần giải thích chi tiết
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-700 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Question Code (Read-only) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <span>Mã Câu Hỏi</span>
              <span className="text-[10px] text-slate-400 font-normal">(Cố định duy nhất)</span>
            </label>
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 select-all">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>{code}</span>
            </div>
          </div>

          {/* Department (Locked to Manager's Department) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Đơn Vị Trực Thuộc</span>
              <span className="text-[10px] text-blue-500 font-normal">(Cố định theo phòng)</span>
            </label>
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-blue-50/60 border border-blue-200 rounded-lg text-xs font-semibold text-blue-900 truncate">
              <span className="px-1.5 py-0.5 rounded bg-blue-200 text-blue-800 text-[10px] font-bold">
                {deptCode}
              </span>
              <span className="truncate">{deptName}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Nội Dung Câu Hỏi <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            placeholder="Nhập nội dung câu hỏi..."
          />
        </div>

        {/* 4 Options */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700">
            Các Phương Án Trả Lời & Chọn Đáp Án Đúng <span className="text-rose-500">*</span>
          </label>

          {/* Option A */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer shrink-0">
              <input
                type="radio"
                name="correctOption"
                checked={correctKey === 'A'}
                onChange={() => setCorrectKey('A')}
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 border border-slate-300">
                A
              </span>
            </label>
            <input
              type="text"
              required
              value={optionA}
              onChange={(e) => setOptionA(e.target.value)}
              placeholder="Nội dung phương án A"
              className={`flex-1 px-3.5 py-2 border rounded-lg text-xs transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                correctKey === 'A'
                  ? 'border-emerald-500 bg-emerald-50/30'
                  : 'border-slate-300 bg-slate-50 focus:bg-white'
              }`}
            />
          </div>

          {/* Option B */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer shrink-0">
              <input
                type="radio"
                name="correctOption"
                checked={correctKey === 'B'}
                onChange={() => setCorrectKey('B')}
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 border border-slate-300">
                B
              </span>
            </label>
            <input
              type="text"
              required
              value={optionB}
              onChange={(e) => setOptionB(e.target.value)}
              placeholder="Nội dung phương án B"
              className={`flex-1 px-3.5 py-2 border rounded-lg text-xs transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                correctKey === 'B'
                  ? 'border-emerald-500 bg-emerald-50/30'
                  : 'border-slate-300 bg-slate-50 focus:bg-white'
              }`}
            />
          </div>

          {/* Option C */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer shrink-0">
              <input
                type="radio"
                name="correctOption"
                checked={correctKey === 'C'}
                onChange={() => setCorrectKey('C')}
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 border border-slate-300">
                C
              </span>
            </label>
            <input
              type="text"
              required
              value={optionC}
              onChange={(e) => setOptionC(e.target.value)}
              placeholder="Nội dung phương án C"
              className={`flex-1 px-3.5 py-2 border rounded-lg text-xs transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                correctKey === 'C'
                  ? 'border-emerald-500 bg-emerald-50/30'
                  : 'border-slate-300 bg-slate-50 focus:bg-white'
              }`}
            />
          </div>

          {/* Option D */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer shrink-0">
              <input
                type="radio"
                name="correctOption"
                checked={correctKey === 'D'}
                onChange={() => setCorrectKey('D')}
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 border border-slate-300">
                D
              </span>
            </label>
            <input
              type="text"
              required
              value={optionD}
              onChange={(e) => setOptionD(e.target.value)}
              placeholder="Nội dung phương án D"
              className={`flex-1 px-3.5 py-2 border rounded-lg text-xs transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                correctKey === 'D'
                  ? 'border-emerald-500 bg-emerald-50/30'
                  : 'border-slate-300 bg-slate-50 focus:bg-white'
              }`}
            />
          </div>
        </div>

        {/* Explanation */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span>Giải Thích Đáp Án</span>
            <span className="text-[10px] text-slate-400 font-normal">(Không bắt buộc)</span>
          </label>
          <textarea
            rows={3}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            placeholder="Nhập giải thích vì sao đáp án này đúng để thí sinh tham khảo sau khi thi..."
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          {can('questions', 'delete') ? (
            <button
              type="button"
              onClick={handleDeleteQuestion}
              disabled={isDeleting || isLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span>Xóa Câu Hỏi</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <Link
              href="/manager/questions"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
            >
              Hủy bỏ
            </Link>
            <button
              type="submit"
              disabled={isLoading || isDeleting}
              className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Lưu Thay Đổi</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
