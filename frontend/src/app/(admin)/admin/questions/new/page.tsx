'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  HelpCircle,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Building2,
  CheckCircle2,
} from 'lucide-react';

export default function CreateQuestionPage() {
  const router = useRouter();

  const [departments, setDepartments] = useState<any[]>([]);
  const [code, setCode] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [content, setContent] = useState('');
  const [explanation, setExplanation] = useState('');

  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctKey, setCorrectKey] = useState<'A' | 'B' | 'C' | 'D'>('A');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    api.get('/departments?onlyActive=true').then((res) => {
      setDepartments(res.data || []);
      if (res.data?.length > 0) setDepartmentId(res.data[0].id);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !departmentId || !content.trim()) {
      setErrorMessage('Vui lòng điền đầy đủ mã câu hỏi, phòng ban và nội dung.');
      return;
    }
    if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ cả 4 phương án A, B, C, D.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      await api.post('/questions', {
        code: code.trim().toUpperCase(),
        departmentId,
        content: content.trim(),
        explanation: explanation.trim() || undefined,
        options: [
          { key: 'A', content: optionA.trim(), isCorrect: correctKey === 'A' },
          { key: 'B', content: optionB.trim(), isCorrect: correctKey === 'B' },
          { key: 'C', content: optionC.trim(), isCorrect: correctKey === 'C' },
          { key: 'D', content: optionD.trim(), isCorrect: correctKey === 'D' },
        ],
      });

      router.push('/admin/questions');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể tạo câu hỏi.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/questions"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-emerald-600" />
            <span>Thêm Câu Hỏi Trắc Nghiệm Mới</span>
          </h1>
          <p className="text-xs text-slate-500">Soạn thảo nội dung câu hỏi và 4 phương án trả lời</p>
        </div>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Mã Câu Hỏi <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="VD: TECH-105"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phòng Ban Trực Thuộc <span className="text-rose-500">*</span>
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    [{d.code}] {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nội Dung Câu Hỏi <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung câu hỏi trắc nghiệm tại đây..."
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* 4 Options */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                4 Phương Án Trả Lời (Chọn 1 đáp án đúng) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Click vào radio để đánh dấu đáp án đúng
              </span>
            </div>

            {[
              { key: 'A', value: optionA, setter: setOptionA },
              { key: 'B', value: optionB, setter: setOptionB },
              { key: 'C', value: optionC, setter: setOptionC },
              { key: 'D', value: optionD, setter: setOptionD },
            ].map((opt) => (
              <div
                key={opt.key}
                className={`p-3 rounded-xl border flex items-center gap-3 transition ${
                  correctKey === opt.key
                    ? 'bg-emerald-50/70 border-emerald-400'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="correctOption"
                    checked={correctKey === opt.key}
                    onChange={() => setCorrectKey(opt.key as any)}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                      correctKey === opt.key
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {opt.key}
                  </span>
                </label>

                <input
                  type="text"
                  required
                  value={opt.value}
                  onChange={(e) => opt.setter(e.target.value)}
                  placeholder={`Nội dung phương án ${opt.key}...`}
                  className="flex-1 px-3 py-1.5 bg-transparent border-0 border-b border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />

                {correctKey === opt.key && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex-shrink-0">
                    ĐÁP ÁN ĐÚNG
                  </span>
                )}
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Giải Thích Đáp Án (Tùy chọn)
            </label>
            <input
              type="text"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Giải thích lý do vì sao đáp án trên là chính xác..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Link
              href="/admin/questions"
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition"
            >
              Hủy Bỏ
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>Lưu Câu Hỏi</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
