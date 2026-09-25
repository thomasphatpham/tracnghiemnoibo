'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ArrowLeft,
  Loader2,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  Calendar,
} from 'lucide-react';

interface QuestionResult {
  position: number;
  questionCode: string;
  content: string;
  options: { key: string; content: string }[];
  selectedOptionKey?: string | null;
  isCorrect: boolean;
  correctOptionKey?: string;
}

interface ExamResult {
  id: string;
  examId: string;
  examName: string;
  attemptNumber: number;
  status: string;
  startedAt: string;
  submittedAt: string;
  durationMinutes: number;
  score: number;
  totalQuestions: number;
  passingCorrectAnswers: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  isPassed: boolean;
  tabSwitchCount: number;
  showCorrectAnswers: boolean;
  questions: QuestionResult[];
}

export default function ExamResultPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params?.attemptId as string;

  const [result, setResult] = useState<ExamResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!attemptId) return;

    const fetchResult = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/attempts/${attemptId}/result`);
        setResult(res.data);
      } catch (err: any) {
        console.error('Failed to load result', err);
        setErrorMessage(err.response?.data?.message || 'Không thể tải kết quả bài thi.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchResult();
  }, [attemptId]);

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const calculateDuration = (startStr: string, endStr?: string) => {
    if (!endStr) return 'N/A';
    try {
      const diffSecs = Math.max(0, Math.floor((new Date(endStr).getTime() - new Date(startStr).getTime()) / 1000));
      const mins = Math.floor(diffSecs / 60);
      const secs = diffSecs % 60;
      return `${mins} phút ${secs} giây`;
    } catch {
      return 'N/A';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600 space-y-3">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-xs font-semibold">Đang tổng hợp điểm số và phân tích kết quả bài thi...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Không tìm thấy kết quả</h2>
        <p className="text-xs text-slate-500">{errorMessage || 'Lượt thi này chưa có kết quả hoặc không tồn tại.'}</p>
        <Link
          href="/employee/exams"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách kỳ thi</span>
        </Link>
      </div>
    );
  }

  const isPassed = result.isPassed;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top back button */}
      <div className="flex items-center justify-between">
        <Link
          href="/employee/exams"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về danh sách kỳ thi</span>
        </Link>
        <Link
          href="/employee/dashboard"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          Về Bảng điều khiển
        </Link>
      </div>

      {/* Main Score Hero Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div
          className={`p-8 text-center space-y-4 ${
            isPassed
              ? 'bg-gradient-to-b from-emerald-50/80 via-white to-white'
              : 'bg-gradient-to-b from-rose-50/80 via-white to-white'
          }`}
        >
          {/* Badge Icon */}
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-md ${
              isPassed
                ? 'bg-emerald-600 text-white shadow-emerald-200'
                : 'bg-rose-600 text-white shadow-rose-200'
            }`}
          >
            {isPassed ? <CheckCircle2 className="w-9 h-9" /> : <XCircle className="w-9 h-9" />}
          </div>

          <div>
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                isPassed
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}
            >
              {isPassed ? 'KẾT QUẢ: ĐẠT YÊU CẦU' : 'KẾT QUẢ: CHƯA ĐẠT'}
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
              {result.examName}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Lượt thi #{result.attemptNumber} • Nộp bài vào {formatDateTime(result.submittedAt)}
            </p>
          </div>

          {/* Big Score Display */}
          <div className="pt-2">
            <div className="inline-flex flex-col items-center p-6 bg-slate-50 rounded-2xl border border-slate-200 min-w-[200px]">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Điểm Số Của Bạn
              </span>
              <div
                className={`text-5xl font-black mt-1 ${
                  isPassed ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {result.score}
                <span className="text-2xl font-bold text-slate-400"> / 10</span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 mt-1">
                Yêu cầu tối thiểu: {result.passingCorrectAnswers} / {result.totalQuestions} câu đúng
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 sm:p-8 border-t border-slate-100 bg-slate-50/50">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Số câu đúng</span>
            <div className="text-xl font-bold text-emerald-600 flex items-center gap-1.5">
              <Check className="w-5 h-5" />
              <span>{result.correctCount} câu</span>
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Số câu sai</span>
            <div className="text-xl font-bold text-rose-600 flex items-center gap-1.5">
              <X className="w-5 h-5" />
              <span>{result.wrongCount} câu</span>
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Bỏ qua / Chưa làm</span>
            <div className="text-xl font-bold text-slate-600 flex items-center gap-1.5">
              <HelpCircle className="w-5 h-5 text-slate-400" />
              <span>{result.unansweredCount} câu</span>
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Thời gian làm bài</span>
            <div className="text-sm font-bold text-blue-700 flex items-center gap-1 pt-1">
              <Clock className="w-4 h-4 shrink-0" />
              <span>{calculateDuration(result.startedAt, result.submittedAt)}</span>
            </div>
          </div>
        </div>

        {/* Violations log if any */}
        {result.tabSwitchCount > 0 && (
          <div className="mx-6 sm:mx-8 mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Ghi nhận kỷ luật:</strong> Bạn đã rời khỏi màn hình hoặc chuyển tab {result.tabSwitchCount} lần trong suốt quá trình làm bài.
            </span>
          </div>
        )}
      </div>

      {/* Question Details Review Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            <span>Xem Lại Chi Tiết Bài Làm</span>
          </h3>
          <span className="text-xs text-slate-500">
            {result.showCorrectAnswers
              ? '✅ Hiển thị đáp án đúng & lời giải'
              : '🔒 Đề thi cài đặt không hiển thị đáp án đúng'}
          </span>
        </div>

        <div className="space-y-4">
          {result.questions.map((q) => {
            const isCorrect = q.isCorrect;
            const isUnanswered = !q.selectedOptionKey;

            return (
              <div
                key={q.position}
                className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs"
              >
                {/* Question Position & Result Indicator */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs">
                    Câu hỏi {q.position}
                  </span>

                  {isCorrect && (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <Check className="w-3.5 h-3.5" /> Đúng
                    </span>
                  )}
                  {!isCorrect && !isUnanswered && (
                    <span className="inline-flex items-center gap-1 text-rose-700 font-semibold text-xs bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                      <X className="w-3.5 h-3.5" /> Sai
                    </span>
                  )}
                  {isUnanswered && (
                    <span className="inline-flex items-center gap-1 text-slate-500 font-semibold text-xs bg-slate-100 px-2.5 py-0.5 rounded-full">
                      Chưa chọn đáp án
                    </span>
                  )}
                </div>

                {/* Content */}
                <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                  {q.content}
                </p>

                {/* Options List */}
                <div className="space-y-2 pt-1">
                  {q.options.map((opt) => {
                    const isSelected = q.selectedOptionKey === opt.key;
                    const isCorrectAnswer = result.showCorrectAnswers && q.correctOptionKey === opt.key;

                    let optionStyle = 'border-slate-200 bg-white text-slate-700';

                    if (isCorrectAnswer) {
                      optionStyle = 'border-emerald-500 bg-emerald-50/70 text-emerald-900 font-medium ring-1 ring-emerald-500';
                    } else if (isSelected && !isCorrect) {
                      optionStyle = 'border-rose-400 bg-rose-50/70 text-rose-900 font-medium';
                    } else if (isSelected && isCorrect) {
                      optionStyle = 'border-emerald-500 bg-emerald-50/70 text-emerald-900 font-medium';
                    }

                    return (
                      <div
                        key={opt.key}
                        className={`p-3 rounded-xl border flex items-start gap-3 text-xs transition ${optionStyle}`}
                      >
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                            isCorrectAnswer
                              ? 'bg-emerald-600 text-white'
                              : isSelected && !isCorrect
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {opt.key}
                        </span>
                        <div className="flex-1 pt-0.5 leading-normal">
                          <span>{opt.content}</span>
                          {isSelected && (
                            <span className="ml-2 font-bold text-[11px] underline">
                              (Đáp án của bạn)
                            </span>
                          )}
                          {isCorrectAnswer && (
                            <span className="ml-2 font-bold text-emerald-700 text-[11px]">
                              ✓ Đáp án chính xác
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
