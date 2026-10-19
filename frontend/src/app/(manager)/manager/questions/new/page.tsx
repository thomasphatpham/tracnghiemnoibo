"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usePermissions } from "@/lib/use-permissions";
import {
  HelpCircle,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Building2,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Lock,
} from "lucide-react";

/**
 * Sinh mã câu hỏi tự động theo định dạng: [MÃ PHÒNG BAN]-Q[6 KÝ TỰ HEX]
 */
function generateQuestionCode(depCode: string = "Q"): string {
  const bytes = new Uint8Array(3);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 3; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  const randHex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  const prefix = depCode ? depCode.trim().toUpperCase() : "Q";
  return `${prefix}-Q${randHex}`;
}

export default function ManagerCreateQuestionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { can } = usePermissions();

  const deptId = user?.departmentId || user?.department?.id || "";
  const deptCode = user?.department?.code || "Q";
  const deptName = user?.department?.name || "Phòng ban trực thuộc";

  const [code, setCode] = useState("");
  const [content, setContent] = useState("");
  const [explanation, setExplanation] = useState("");

  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctKey, setCorrectKey] = useState<"A" | "B" | "C" | "D">("A");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // Tự sinh mã câu hỏi ban đầu dựa theo mã phòng ban của quản lý
    if (deptCode) {
      setCode(generateQuestionCode(deptCode));
    }
  }, [deptCode]);

  const handleRegenerateCode = () => {
    setCode(generateQuestionCode(deptCode));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptId) {
      setErrorMessage(
        "Tài khoản của bạn chưa được liên kết với phòng ban cụ thể.",
      );
      return;
    }
    if (!content.trim()) {
      setErrorMessage("Vui lòng nhập nội dung câu hỏi.");
      return;
    }
    if (
      !optionA.trim() ||
      !optionB.trim() ||
      !optionC.trim() ||
      !optionD.trim()
    ) {
      setErrorMessage("Vui lòng nhập đầy đủ cả 4 phương án A, B, C, D.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    const submitCode =
      code.trim().toUpperCase() || generateQuestionCode(deptCode);

    try {
      await api.post("/questions", {
        code: submitCode,
        departmentId: deptId,
        content: content.trim(),
        explanation: explanation.trim() || undefined,
        options: [
          { key: "A", content: optionA.trim(), isCorrect: correctKey === "A" },
          { key: "B", content: optionB.trim(), isCorrect: correctKey === "B" },
          { key: "C", content: optionC.trim(), isCorrect: correctKey === "C" },
          { key: "D", content: optionD.trim(), isCorrect: correctKey === "D" },
        ],
      });

      router.push("/manager/questions");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Không thể tạo câu hỏi mới.";
      setErrorMessage(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!can("questions", "create")) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-800">
          Không có quyền truy cập
        </h2>
        <p className="text-xs text-slate-500">
          Bạn không có quyền tạo câu hỏi trắc nghiệm (questions:create). Vui
          lòng liên hệ Quản trị viên hệ thống để được cấp quyền.
        </p>
        <Link
          href="/manager/questions"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại ngân hàng câu hỏi</span>
        </Link>
      </div>
    );
  }

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
            <span>Thêm Câu Hỏi Mới Cho Phòng Ban</span>
          </h1>
          <p className="text-xs text-slate-500">
            Soạn thảo câu hỏi trắc nghiệm trực thuộc {deptName}
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mã câu hỏi tự sinh */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Mã Câu Hỏi</span>
                  <span className="text-rose-500">*</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md normal-case">
                    <Sparkles className="w-2.5 h-2.5" />
                    Tự động tạo
                  </span>
                </label>
                <button
                  type="button"
                  onClick={handleRegenerateCode}
                  title="Tạo mã ngẫu nhiên mới"
                  className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Đổi mã</span>
                </button>
              </div>
              <input
                type="text"
                required
                disabled
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="VD: CNTT-QA1B2C3"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Quy chuẩn:{" "}
                <span className="font-mono font-semibold text-slate-600">
                  [{deptCode}]-Q[HEX]
                </span>
              </p>
            </div>

            {/* Phòng ban trực thuộc: Khóa cứng theo user.departmentId (read-only/disabled với badge) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phòng Ban Trực Thuộc (Cố định)
              </label>
              <div className="flex items-center justify-between px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-800 cursor-not-allowed">
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="font-bold text-slate-900">[{deptCode}]</span>
                  <span className="truncate">{deptName}</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded shrink-0">
                  <Lock className="w-2.5 h-2.5" />
                  Đã khóa
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Câu hỏi tự động liên kết với phòng ban của bạn
              </p>
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
              placeholder="Nhập nội dung câu hỏi khảo thí tại đây..."
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* 4 Phương án trả lời */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                4 Phương Án Trả Lời (Chọn 1 đáp án đúng){" "}
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Click vào nút radio để chọn đáp án đúng
              </span>
            </div>

            {[
              { key: "A", value: optionA, setter: setOptionA },
              { key: "B", value: optionB, setter: setOptionB },
              { key: "C", value: optionC, setter: setOptionC },
              { key: "D", value: optionD, setter: setOptionD },
            ].map((opt) => (
              <div
                key={opt.key}
                className={`p-3 rounded-xl border flex items-center gap-3 transition ${
                  correctKey === opt.key
                    ? "bg-emerald-50/70 border-emerald-400"
                    : "bg-white border-slate-200 hover:border-slate-300"
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
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-700"
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
              placeholder="Giải thích thêm căn cứ hoặc lý do chọn đáp án này..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Link
              href="/manager/questions"
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
