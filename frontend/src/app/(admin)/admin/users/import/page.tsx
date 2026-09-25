'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
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
  Users,
} from 'lucide-react';

export default function UserExcelImportPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/users/import/template', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Mau_Import_Danh_Sach_Nguoi_Dung.xlsx');
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

      const res = await api.post('/users/import/validate', formData, {
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
      const res = await api.post('/users/import/confirm', {
        validRows: validationResult.validRows,
      });

      setSuccessMessage(res.data.message || 'Import người dùng thành công!');
      setTimeout(() => {
        router.push('/admin/users');
      }, 1500);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi lưu tài khoản vào cơ sở dữ liệu.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/users"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-[#2e3e98]" />
              <span>Import Danh Sách Nhân Sự Từ Excel</span>
            </h1>
            <p className="text-xs text-slate-500">Tải lên danh sách tài khoản theo định dạng chuẩn .xlsx</p>
          </div>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer border border-slate-300"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Tải Tệp Mẫu (.xlsx)</span>
        </button>
      </div>

      {/* Upload Zone */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="border-2 border-dashed border-slate-300 hover:border-[#2e3e98] rounded-xl p-8 text-center bg-slate-50/50 transition">
          <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Chọn tệp Excel (.xlsx) từ máy tính</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Hỗ trợ định dạng Microsoft Excel 2007 trở lên (.xlsx)
          </p>

          <input
            type="file"
            accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFileChange}
            id="user-excel-file-input"
            className="hidden"
          />

          <label
            htmlFor="user-excel-file-input"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#2e3e98] hover:bg-[#233075] text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{file ? file.name : 'Duyệt Chọn Tệp...'}</span>
          </label>
        </div>

        {file && !validationResult && (
          <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-slate-800 font-medium truncate">
              <FileCheck className="w-4 h-4 text-[#2e3e98] flex-shrink-0" />
              <span className="truncate">{file.name}</span>
              <span className="text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>

            <button
              onClick={handleValidateFile}
              disabled={isValidating}
              className="px-4 py-1.5 bg-[#2e3e98] hover:bg-[#233075] text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isValidating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isValidating ? 'Đang kiểm tra...' : 'Kiểm Tra Tệp Dữ Liệu'}</span>
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {/* Validation Results & Preview */}
      {validationResult && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Tổng số dòng đọc được</span>
                <div className="text-xl font-bold text-slate-900">{validationResult.totalRows}</div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#2e3e98] flex items-center justify-center font-bold">
                {validationResult.totalRows}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-600 font-medium">Nhân sự hợp lệ</span>
                <div className="text-xl font-bold text-emerald-700">{validationResult.validCount}</div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-rose-600 font-medium">Dòng bị lỗi / Cần sửa</span>
                <div className="text-xl font-bold text-rose-700">{validationResult.errorCount}</div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Error Table if any */}
          {validationResult.errorCount > 0 && (
            <div className="bg-white rounded-xl border border-rose-200 shadow-sm overflow-hidden">
              <div className="p-3 bg-rose-50 border-b border-rose-200 font-bold text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Chi Tiết Lỗi Cần Khắc Phục ({validationResult.errorCount} lỗi)</span>
              </div>
              <div className="overflow-x-auto max-h-60">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase sticky top-0">
                    <tr>
                      <th className="py-2.5 px-4">Dòng</th>
                      <th className="py-2.5 px-4">Tài Khoản / Mã</th>
                      <th className="py-2.5 px-4">Cột / Trường</th>
                      <th className="py-2.5 px-4">Nội Dung Lỗi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {validationResult.errors.map((err: any, idx: number) => (
                      <tr key={idx} className="hover:bg-rose-50/40">
                        <td className="py-2 px-4 font-mono font-bold text-rose-700">{err.row}</td>
                        <td className="py-2 px-4 font-mono text-slate-600">{err.code || '—'}</td>
                        <td className="py-2 px-4 font-semibold text-slate-700">{err.field}</td>
                        <td className="py-2 px-4 text-rose-600">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Valid Users Preview */}
          {validationResult.validCount > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Xem Trước {validationResult.validCount} Nhân Sự Sẵn Sàng Nhập
                </h3>

                <button
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  className="px-5 py-2 bg-[#2e3e98] hover:bg-[#233075] active:bg-[#1a255c] text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isImporting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Xác Nhận Import {validationResult.validCount} Tài Khoản</span>
                </button>
              </div>

              <div className="overflow-x-auto max-h-80 border border-slate-100 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase sticky top-0">
                    <tr>
                      <th className="py-2.5 px-4">Tên Đăng Nhập</th>
                      <th className="py-2.5 px-4">Họ Và Tên</th>
                      <th className="py-2.5 px-4">Email</th>
                      <th className="py-2.5 px-4">Phòng Ban</th>
                      <th className="py-2.5 px-4">Chức Vụ</th>
                      <th className="py-2.5 px-4 text-center">Vai Trò</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {validationResult.validRows.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-mono font-bold text-[#2e3e98]">{r.username}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">{r.fullName}</td>
                        <td className="py-2.5 px-4 text-slate-600">{r.email}</td>
                        <td className="py-2.5 px-4 font-semibold text-blue-600">
                          {r.departmentCode || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">{r.position || '—'}</td>
                        <td className="py-2.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.role === 'ADMIN'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {r.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
