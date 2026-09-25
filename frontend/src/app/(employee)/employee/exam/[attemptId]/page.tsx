'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  WifiOff,
  Check,
  Award,
  X,
  KeyRound,
} from 'lucide-react';

interface Option {
  key: string;
  content: string;
}

interface Question {
  position: number;
  content: string;
  options: Option[];
  selectedOptionKey?: string | null;
}

interface AttemptData {
  id: string;
  examId: string;
  examName: string;
  description?: string;
  status: string;
  startedAt: string;
  expiresAt: string;
  durationMinutes: number;
  totalQuestions: number;
  passingCorrectAnswers: number;
  tabDetectionEnabled: boolean;
  maxTabSwitches: number;
  tabSwitchCount: number;
  autosaveEnabled: boolean;
  questions: Question[];
}

export default function ExamRoomPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params?.attemptId as string;

  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [currentPosition, setCurrentPosition] = useState<number>(1);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'offline'>('saved');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [tabWarning, setTabWarning] = useState<string | null>(null);
  const [tabCount, setTabCount] = useState<number>(0);

  // Tính năng ẩn: xem đáp án bài thi qua phím tắt Ctrl + Shift + P
  const [isLogoUnlocked, setIsLogoUnlocked] = useState(false);
  const [showCheatModal, setShowCheatModal] = useState(false);
  const [cheatAnswers, setCheatAnswers] = useState<Array<{ position: number; correctKey: string }> | null>(null);
  const [isLoadingCheat, setIsLoadingCheat] = useState(false);

  // Kích hoạt mở khóa bằng phím tắt Ctrl + Shift + P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setIsLogoUnlocked(true);
        return;
      }

      if (e.key === 'Escape') {
        setIsLogoUnlocked(false);
        setShowCheatModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogoClick = async () => {
    if (!isLogoUnlocked) return;
    setShowCheatModal(true);
    if (!cheatAnswers) {
      setIsLoadingCheat(true);
      try {
        const res = await api.get(`/attempts/${attemptId}/cheat-answers`);
        setCheatAnswers(res.data);
      } catch (err: any) {
        console.error('Failed to load cheat answers', err);
        alert(err.response?.data?.message || 'Không thể tải danh sách đáp án.');
      } finally {
        setIsLoadingCheat(false);
      }
    }
  };

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const attemptRef = useRef<AttemptData | null>(null);
  attemptRef.current = attempt;

  // 1. Tải thông tin phòng thi & khôi phục bài thi
  useEffect(() => {
    if (!attemptId) return;

    const fetchAttempt = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/attempts/${attemptId}`);
        const data: AttemptData = res.data;

        // Nếu bài thi đã nộp/kết thúc từ trước, chuyển ngay sang trang kết quả
        if (data.status !== 'IN_PROGRESS') {
          router.replace(`/employee/results/${attemptId}`);
          return;
        }

        setAttempt(data);
        setTabCount(data.tabSwitchCount || 0);

        // Khôi phục các đáp án đã chọn vào local state
        const initialAnswers: Record<number, string> = {};
        data.questions.forEach((q) => {
          if (q.selectedOptionKey) {
            initialAnswers[q.position] = q.selectedOptionKey;
          }
        });
        setAnswers(initialAnswers);

        // Tính toán thời gian còn lại
        const expiresTime = new Date(data.expiresAt).getTime();
        const diff = Math.max(0, Math.floor((expiresTime - Date.now()) / 1000));
        setRemainingSeconds(diff);
      } catch (err: any) {
        console.error('Failed to load attempt', err);
        alert(err.response?.data?.message || 'Không thể tải đề thi.');
        router.push('/employee/exams');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttempt();
  }, [attemptId, router]);

  // 2. Bộ đếm ngược thời gian (Server-Side Deadline countdown)
  useEffect(() => {
    if (!attempt || attempt.status !== 'IN_PROGRESS') return;

    const timer = setInterval(() => {
      const expiresTime = new Date(attempt.expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expiresTime - Date.now()) / 1000));
      setRemainingSeconds(diff);

      // Khi hết giờ -> tự động nộp bài
      if (diff <= 0) {
        clearInterval(timer);
        handleForceAutoSubmit('Thời gian làm bài đã kết thúc! Hệ thống đang tự động nộp bài.');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [attempt]);

  // 3. Tự động lưu đáp án ngầm (Debounced Autosave)
  const triggerAutosave = useCallback(
    (position: number, selectedKey: string) => {
      setSaveStatus('saving');

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(async () => {
        try {
          await api.patch(`/attempts/${attemptId}/answer`, {
            position,
            selectedOptionKey: selectedKey,
          });
          setSaveStatus('saved');
        } catch (err) {
          console.error('Autosave error', err);
          setSaveStatus('offline');
        }
      }, 500);
    },
    [attemptId],
  );

  const handleSelectOption = (position: number, key: string) => {
    setAnswers((prev) => ({ ...prev, [position]: key }));
    triggerAutosave(position, key);
  };

  // 4. Giám sát vi phạm chuyển Tab (Tab Switch Detection)
  useEffect(() => {
    if (!attempt?.tabDetectionEnabled) return;

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        try {
          const res = await api.patch(`/attempts/${attemptId}/tab-switch`, {
            reason: 'Rời tab bài thi (visibilitychange)',
          });

          if (res.data?.autoSubmitted) {
            alert(res.data.message || 'Bài thi bị tự động nộp do chuyển tab quá giới hạn!');
            router.replace(`/employee/results/${attemptId}`);
            return;
          }

          setTabCount(res.data.tabSwitchCount || (prev => prev + 1));
          setTabWarning(res.data.message);
        } catch (err) {
          console.error('Tab switch report error', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [attempt, attemptId, router]);

  // 5. Nộp bài chủ động
  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    try {
      await api.post(`/attempts/${attemptId}/submit`);
      router.replace(`/employee/results/${attemptId}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể nộp bài thi. Vui lòng thử lại.');
      setIsSubmitting(false);
    }
  };

  // 6. Nộp bài bắt buộc (khi hết giờ hoặc vi phạm)
  const handleForceAutoSubmit = async (reason: string) => {
    setIsSubmitting(true);
    try {
      await api.post(`/attempts/${attemptId}/submit`);
    } catch (e) {
      // Ignore
    } finally {
      alert(reason);
      router.replace(`/employee/results/${attemptId}`);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading || !attempt) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white space-y-3">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-sm font-medium text-slate-300">Đang chuẩn bị đề thi cho bạn...</p>
      </div>
    );
  }

  const currentQuestion = attempt.questions.find((q) => q.position === currentPosition) || attempt.questions[0];
  const totalQuestions = attempt.questions.length;
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = totalQuestions - answeredCount;
  const isUrgent = remainingSeconds <= 300; // Còn dưới 5 phút

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between select-none">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-8 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Exam Title & Autosave Status */}
          <div className="flex items-center gap-3">
            <div
              onClick={handleLogoClick}
              title={isLogoUnlocked ? 'Bấm để tra cứu đáp án đề thi' : undefined}
              className={`h-9 w-9 rounded-lg bg-white p-0.5 border transition-all flex items-center justify-center shrink-0 shadow-xs select-none ${
                isLogoUnlocked
                  ? 'cursor-pointer border-emerald-400 ring-2 ring-emerald-400/40 hover:scale-105 active:scale-95 shadow-md shadow-emerald-100'
                  : 'border-slate-200'
              }`}
            >
              <img
                src="/logo_saigonbank.jpg"
                alt="Saigonbank"
                className="h-full w-full object-contain rounded"
              />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-1">
                {attempt.examName}
              </h1>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                <span>Lượt thi #{attempt.id.slice(0, 6).toUpperCase()}</span>
                <span>•</span>
                {saveStatus === 'saved' && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                    <Check className="w-3.5 h-3.5" />
                    <span>Đã lưu</span>
                  </span>
                )}
                {saveStatus === 'saving' && (
                  <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang lưu...</span>
                  </span>
                )}
                {saveStatus === 'offline' && (
                  <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                    <WifiOff className="w-3.5 h-3.5" />
                    <span>Mất mạng - lưu offline</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Action: Timer & Submit */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Countdown Badge */}
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-sm font-bold border transition ${
                isUrgent
                  ? 'bg-rose-50 text-rose-600 border-rose-300 animate-pulse'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              <Clock className={`w-4 h-4 ${isUrgent ? 'text-rose-600' : 'text-blue-600'}`} />
              <span>{formatTimer(remainingSeconds)}</span>
            </div>

            {/* Submit Button */}
            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-sm shadow-emerald-200 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Nộp Bài</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tab Switch Warning Banner */}
      {tabWarning && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs font-semibold text-center flex items-center justify-center gap-2 shadow-sm animate-bounce">
          <ShieldAlert className="w-4 h-4" />
          <span>{tabWarning} (Cảnh báo: Vi phạm lần {tabCount}/{attempt.maxTabSwitches})</span>
        </div>
      )}

      {/* Main Examination Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 w-full flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 Columns: Active Question Area */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            {/* Question Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg text-xs">
                Câu hỏi {currentQuestion.position} / {totalQuestions}
              </span>
              <span className="text-xs text-slate-400">
                {answers[currentQuestion.position] ? (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Đã chọn đáp án
                  </span>
                ) : (
                  <span>Chưa trả lời</span>
                )}
              </span>
            </div>

            {/* Question Content */}
            <div className="text-base sm:text-lg font-semibold text-slate-800 leading-relaxed">
              {currentQuestion.content}
            </div>

            {/* Options List */}
            <div className="space-y-3 pt-2">
              {currentQuestion.options.map((opt) => {
                const isSelected = answers[currentQuestion.position] === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleSelectOption(currentQuestion.position, opt.key)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/80 shadow-xs ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {opt.key}
                    </span>
                    <span className="text-sm text-slate-800 pt-0.5 leading-normal">
                      {opt.content}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Nav Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
              <button
                type="button"
                disabled={currentPosition === 1}
                onClick={() => setCurrentPosition((prev) => Math.max(1, prev - 1))}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Câu trước</span>
              </button>

              <button
                type="button"
                disabled={currentPosition === totalQuestions}
                onClick={() => setCurrentPosition((prev) => Math.min(totalQuestions, prev + 1))}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Câu tiếp theo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Question Grid Navigator */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Danh Sách Câu Hỏi ({answeredCount}/{totalQuestions})
            </h3>

            {/* Grid numbers */}
            <div className="grid grid-cols-5 gap-2">
              {attempt.questions.map((q) => {
                const isCurrent = q.position === currentPosition;
                const isAnswered = !!answers[q.position];

                return (
                  <button
                    key={q.position}
                    type="button"
                    onClick={() => setCurrentPosition(q.position)}
                    className={`h-10 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                        : isAnswered
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {q.position}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-slate-100 text-[11px] space-y-1.5 text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-blue-600" />
                <span>Đang xem</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-300" />
                <span>Đã chọn đáp án ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-200" />
                <span>Chưa chọn ({unansweredCount})</span>
              </div>
            </div>

            {/* Quick Submit CTA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-200 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Nộp Bài Ngay</span>
              </button>
            </div>
          </div>

          {/* Bảng tra cứu đáp án bí mật */}
          {showCheatModal && (
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Đáp án đề thi</h3>
                    <p className="text-[11px] text-slate-500">Nhấp vào số câu để chuyển đến câu đó</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCheatModal(false)}
                  aria-label="Đóng bảng đáp án"
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isLoadingCheat ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="text-xs font-medium">Đang tải đáp án...</span>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto pr-1">
                  <div className="grid grid-cols-4 gap-2.5">
                    {cheatAnswers?.map((item) => {
                      const isCurrent = item.position === currentPosition;
                      return (
                        <button
                          key={item.position}
                          type="button"
                          onClick={() => setCurrentPosition(item.position)}
                          className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                            isCurrent
                              ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20'
                              : 'bg-slate-50/80 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                          }`}
                        >
                          <span className="text-[10px] font-medium text-slate-500 uppercase">
                            Câu {item.position}
                          </span>
                          <span className="text-sm font-extrabold text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded-md min-w-[24px]">
                            {item.correctKey}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Confirmation Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Xác Nhận Nộp Bài Thi
              </h3>
              <p className="text-xs text-slate-500">
                Sau khi nộp bài, hệ thống sẽ tiến hành chấm điểm tự động và bạn không thể sửa lại câu trả lời.
              </p>
            </div>

            {/* Summary statistics */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Tổng số câu hỏi:</span>
                <span className="font-bold text-slate-900">{totalQuestions} câu</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Số câu đã trả lời:</span>
                <span className="font-bold">{answeredCount} câu</span>
              </div>
              <div className="flex justify-between text-rose-700">
                <span>Số câu chưa trả lời:</span>
                <span className="font-bold">{unansweredCount} câu</span>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Bạn vẫn còn {unansweredCount} câu hỏi chưa hoàn thành. Bạn có chắc chắn muốn nộp bài ngay lúc này?</span>
              </div>
            )}

            {/* Modal Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Tiếp tục làm bài
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmSubmit}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-200 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang nộp...</span>
                  </>
                ) : (
                  <span>Nộp bài ngay</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
