'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/use-permissions';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  FileCheck,
  Building2,
  AlertCircle,
} from 'lucide-react';

export default function ManagerExcelImportPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { can } = usePermissions();

  const [file, setFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const deptCode = user?.department?.code || 'ĐƠN VỊ';
  const deptName = user?.department?.name || 'Phòng ban trực thuộc';

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/questions/import/template', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Mau_Import_Ngan_Hang_Cau_Hoi_${deptCode}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      alert('Không thể tải file mẫu Excel.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setValidationResult(null);
      setErrorMessage('');
      setSuccessMessage('');
    }
  };

  const handleValidateFile = async () => {
    if (!file) {
      setErrorMessage('Vui lòng chọn tệp tin Excel (.xlsx).');
      return;
    }

    setIsValidating(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/questions/import/validate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setValidationResult(res.data);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể thẩm định tệp tin Excel.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!validationResult || validationResult.validCount === 0) return;

    setIsImporting(true);
    setErrorMessage('');

    try {
      const res = await api.post('/questions/import/confirm', {
        validRows: validationResult.validRows,
      });

      setSuccessMessage(res.data.message || 'Import câu hỏi thành công!');
      setTimeout(() => {
        router.push('/manager/questions');
      }, 1500);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi lưu câu hỏi vào cơ sở dữ liệu.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsImporting(false);
    }
  };

  if (!can('questions', 'import')) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-800">Không có quyền truy cập</h2>
        <p className="text-xs text-slate-500">
          Bạn không có quyền import câu hỏi từ Excel (questions:import). Vui lòng liên hệ Quản trị viên để được cấp quyền.
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
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/manager/questions"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                <span>Import Câu Hỏi Phòng Ban Từ Excel</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {deptCode}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Mã câu hỏi tự động sinh • Áp dụng cho: <strong>{deptName}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer border border-slate-300"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Tải Tệp Mẫu Excel (.xlsx)</span>
        </button>
      </div>

      {/* Notice Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-blue-900">
        <Building2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <p className="font-semibold text-blue-950">Quy tắc import dành cho Quản lý phòng ban:</p>
          <p className="text-blue-800">
            • Bạn <strong className="font-semibold">không cần phải nhập mã câu hỏi</strong>, hệ thống sẽ tự động tạo mã duy nhất theo phòng ban <strong>[{deptCode}]</strong>.
          </p>
          <p className="text-blue-800">
            • Tất cả câu hỏi trong file mẫu tải về đã được liên kết với mã phòng ban <strong>{deptCode}</strong> của đơn vị bạn.
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-8 text-center transition cursor-pointer relative bg-slate-50/50 hover:bg-emerald-50/20">
          <input
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center gap-2">
            <UploadCloud className="w-10 h-10 text-emerald-600" />
            <div className="text-sm font-semibold text-slate-800">
              {file ? file.name : 'Nhấp hoặc kéo thả tệp tin Excel (.xlsx) vào đây'}
            </div>
            <p className="text-xs text-slate-400">
              Hỗ trợ định dạng Microsoft Excel 2007+ (.xlsx) dung lượng tối đa 10MB
            </p>
          </div>
        </div>

        {file && !validationResult && (
          <div className="flex items-center justify-end">
            <button
              onClick={handleValidateFile}
              disabled={isValidating}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang thẩm định dữ liệu...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>Thẩm Định Dữ Liệu Excel</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Error & Success Alerts */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 text-xs">
          <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-700 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Validation Results Display */}
      {validationResult && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Tổng số dòng đọc được</div>
                <div className="text-xl font-bold text-slate-800">
                  {validationResult.totalRows}
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-emerald-600 font-medium">Câu hỏi hợp lệ</div>
                <div className="text-xl font-bold text-emerald-700">
                  {validationResult.validCount}
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-rose-600 font-medium">Dòng dữ liệu lỗi</div>
                <div className="text-xl font-bold text-rose-700">
                  {validationResult.errorCount}
                </div>
              </div>
            </div>
          </div>

          {/* Errors List */}
          {validationResult.errorCount > 0 && (
            <div className="bg-white rounded-xl border border-rose-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-rose-50/60 border-b border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Chi Tiết Các Dòng Lỗi Cần Khắc Phục</span>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="px-4 py-2 w-20 text-center">Dòng</th>
                      <th className="px-4 py-2 w-32">Mã Tham Chiếu</th>
                      <th className="px-4 py-2 w-32">Cột Bị Lỗi</th>
                      <th className="px-4 py-2">Mô Tả Lỗi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {validationResult.errors.map((err: any, idx: number) => (
                      <tr key={idx} className="hover:bg-rose-50/30">
                        <td className="px-4 py-2 text-center font-bold text-slate-700">
                          {err.row}
                        </td>
                        <td className="px-4 py-2 font-mono text-slate-600">{err.code}</td>
                        <td className="px-4 py-2 font-medium text-rose-600">{err.field}</td>
                        <td className="px-4 py-2 text-slate-700">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Confirm Button */}
          {validationResult.validCount > 0 && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="text-xs text-slate-600">
                Sẵn sàng import <strong>{validationResult.validCount}</strong> câu hỏi hợp lệ vào ngân hàng dữ liệu của phòng ban.
              </div>
              <button
                onClick={handleConfirmImport}
                disabled={isImporting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang lưu câu hỏi...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Xác Nhận Import ({validationResult.validCount} câu hỏi)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
