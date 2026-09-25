'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Award,
  Clock,
  PlayCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  Calendar,
  Layers,
  FileQuestion,
} from 'lucide-react';

export default function EmployeeExamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [exam, setExam] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/exams/${id}`);
        setExam(res.data);
      } catch (err: any) {
        setErrorMessage(err.response?.data?.message || 'Không thể tải thông tin kỳ thi.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const handleStartExam = async () => {
    setIsStarting(true);
    setErrorMessage('');
    try {
      const res = await api.post(`/exams/${id}/start`);
      const attemptId = res.data?.id;
      if (attemptId) {
        router.push(`/employee/exam/${attemptId}`);
      } else {
        throw new Error('Không nhận được mã lượt thi.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể bắt đầu làm bài thi.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
      setIsStarting(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
        <p className="text-xs">Đang tải thông tin phòng thi...</p>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Không tìm thấy kỳ thi</h2>
        <p className="text-xs text-slate-500">{errorMessage || 'Kỳ thi không tồn tại hoặc đã bị xóa.'}</p>
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

  const now = new Date().getTime();
  const openTime = new Date(exam.openAt).getTime();
  const closeTime = new Date(exam.closeAt).getTime();
  const isUpcoming = now < openTime;
  const isClosed = now > closeTime;
  const isOpen = !isUpcoming && !isClosed;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Back button */}
      <Link
        href="/employee/exams"
        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại danh sách kỳ thi</span>
      </Link>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 sm:p-8 text-white space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-100 text-xs font-semibold">
            <Award className="w-3.5 h-3.5" />
            <span>Kỳ Thi Trực Tuyến Nội Bộ</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {exam.name}
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 max-w-2xl">
            {exam.description || 'Kỳ thi đánh giá năng lực nghiệp vụ nội bộ theo quy định công ty.'}
          </p>
        </div>

        {/* Error alert if any */}
        {errorMessage && (
          <div className="m-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Specs Grid */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[11px] font-medium text-slate-400">Thời lượng làm bài</span>
              <div className="flex items-center gap-1.5 text-base font-bold text-slate-800">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>{exam.durationMinutes} phút</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[11px] font-medium text-slate-400">Số lượng câu hỏi</span>
              <div className="flex items-center gap-1.5 text-base font-bold text-slate-800">
                <FileQuestion className="w-4 h-4 text-emerald-600" />
                <span>{exam.totalQuestions} câu</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[11px] font-medium text-slate-400">Yêu cầu để đạt</span>
              <div className="flex items-center gap-1.5 text-base font-bold text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-purple-600" />
                <span>≥ {exam.passingCorrectAnswers} câu</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[11px] font-medium text-slate-400">Số lượt thi tối đa</span>
              <div className="flex items-center gap-1.5 text-base font-bold text-slate-800">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>{exam.maxAttempts || 1} lượt</span>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-xs space-y-2 text-slate-700">
            <h4 className="font-bold text-blue-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Khung giờ diễn ra kỳ thi</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
              <div>
                <span className="font-semibold text-slate-700">Bắt đầu mở đề:</span>{' '}
                {formatDateTime(exam.openAt)}
              </div>
              <div>
                <span className="font-semibold text-slate-700">Đóng phòng thi:</span>{' '}
                {formatDateTime(exam.closeAt)}
              </div>
            </div>
          </div>

            {/* Rules & Anti-Cheating Warning */}
            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-xs space-y-2.5 text-amber-900">
              <h4 className="font-bold flex items-center gap-1.5 text-amber-800">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Quy định & Kỷ luật phòng thi trực tuyến</span>
              </h4>
              <ul className="list-disc list-inside space-y-1.5 text-amber-800/90 text-[11px] leading-relaxed">
                <li>
                  <strong>Tự động lưu bài:</strong> Hệ thống tự động ghi nhận đáp án của bạn ngay khi bấm chọn. Nếu gặp sự cố mạng, bài làm vẫn được lưu an toàn trên máy chủ.
                </li>
                {exam.tabDetectionEnabled && (
                  <li>
                    {exam.maxTabSwitches === 0 ? (
                      <span className="text-rose-700 font-bold">
                        CẤM TUYỆT ĐỐI CHUYỂN TAB (Zero Tolerance): Kỳ thi hoàn toàn nghiêm cấm hành vi chuyển tab hoặc rời ứng dụng. Rời màn hình dù chỉ 1 lần sẽ bị hệ thống TỰ ĐỘNG THU NỘP BÀI NGAY LẬP TỨC và phát cảnh báo tới Admin!
                      </span>
                    ) : (
                      <span>
                        <strong>Chống gian lận chuyển tab:</strong> Hệ thống giám sát rời màn hình hoặc chuyển tab. Nếu chuyển tab quá{' '}
                        <strong className="text-rose-700">{exam.maxTabSwitches} lần</strong>, bài thi sẽ bị{' '}
                        <strong className="text-rose-700">tự động thu nộp ngay lập tức</strong>.
                      </span>
                    )}
                  </li>
                )}
                <li>
                  <strong>Giới hạn số lượt thi:</strong> Mỗi thí sinh được phép tham gia tối đa{' '}
                  <strong className="text-purple-700">{exam.maxAttempts || 1} lượt thi</strong>. Sau khi nộp đủ số lượt quy định, hệ thống sẽ tự động khóa quyền làm bài.
                </li>
                <li>
                  <strong>Thời hạn làm bài:</strong> Đồng hồ đếm ngược do máy chủ tính toán chính xác. Khi hết giờ, bài thi sẽ tự động thu nộp.
                </li>
              </ul>
            </div>

          {/* Start Button */}
          <div className="pt-2">
            {exam.isOutOfAttempts ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2">
                <div className="text-sm font-bold text-amber-900">
                  Bạn Đã Sử Dụng Hết {exam.maxAttempts || 1} Lượt Thi Cho Kỳ Thi Này
                </div>
                <p className="text-xs text-amber-700">
                  Hệ thống đã ghi nhận các bài làm của bạn. Bạn không thể làm thêm lượt thi mới.
                </p>
                <div className="pt-1">
                  <Link
                    href="/employee/dashboard"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg text-xs font-semibold shadow-xs hover:bg-blue-50 transition"
                  >
                    <span>Quay về Bảng điều khiển xem kết quả</span>
                  </Link>
                </div>
              </div>
            ) : isOpen ? (
              <button
                onClick={handleStartExam}
                disabled={isStarting}
                className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-200 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Đang khởi tạo phòng thi...</span>
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-5 h-5" />
                    <span>Tôi Đã Hiểu Quy Định & Bắt Đầu Làm Bài</span>
                  </>
                )}
              </button>
            ) : isUpcoming ? (
              <div className="p-4 bg-slate-100 rounded-xl text-center text-xs font-semibold text-slate-500">
                Kỳ thi chưa đến thời gian mở đề. Vui lòng quay lại vào lúc {formatDateTime(exam.openAt)}.
              </div>
            ) : (
              <div className="p-4 bg-slate-100 rounded-xl text-center text-xs font-semibold text-slate-500">
                Kỳ thi đã kết thúc thời gian làm bài ({formatDateTime(exam.closeAt)}).
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
