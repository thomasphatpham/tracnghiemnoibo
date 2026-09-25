'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import Pagination from '@/components/Pagination';
import {
  Building2,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  Users,
  HelpCircle,
  Loader2,
  AlertCircle,
  Trash2,
  Search,
  FileSpreadsheet,
} from 'lucide-react';

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editId, setEditId] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });
      if (search.trim()) params.append('search', search.trim());
      const res = await api.get(`/departments?${params.toString()}`);
      if (res.data?.data) {
        setDepartments(res.data.data);
        setTotal(res.data.total || 0);
      } else if (Array.isArray(res.data)) {
        setDepartments(res.data);
        setTotal(res.data.length);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [page, pageSize]);

  const openCreateModal = () => {
    setModalMode('create');
    setCode('');
    setName('');
    setErrorMessage('');
    setShowDeleteConfirm(false);
    setShowModal(true);
  };

  const openEditModal = (dep: any) => {
    setModalMode('edit');
    setEditId(dep.id);
    setCode(dep.code);
    setName(dep.name);
    setErrorMessage('');
    setShowDeleteConfirm(false);
    setShowModal(true);
  };

  const handleDeleteDepartment = async () => {
    setIsDeleting(true);
    setErrorMessage('');
    try {
      await api.delete(`/departments/${editId}`);
      setShowModal(false);
      setShowDeleteConfirm(false);
      await fetchDepartments();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể xóa phòng ban này. Vui lòng kiểm tra lại ràng buộc dữ liệu.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (depId: string) => {
    try {
      await api.patch(`/departments/${depId}/toggle-status`);
      await fetchDepartments();
    } catch (err) {
      alert('Không thể thay đổi trạng thái phòng ban.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || (modalMode === 'create' && !code.trim())) {
      setErrorMessage('Vui lòng điền đầy đủ mã và tên phòng ban.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (modalMode === 'create') {
        await api.post('/departments', {
          code: code.trim().toUpperCase(),
          name: name.trim(),
        });
      } else {
        await api.patch(`/departments/${editId}`, {
          name: name.trim(),
        });
      }
      setShowModal(false);
      await fetchDepartments();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#2e3e98]" />
            <span>Quản Lý Phòng Ban</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Thiết lập danh mục cơ cấu tổ chức và phân bổ chỉ tiêu ngân hàng đề thi
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm mã hoặc tên phòng ban..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#2e3e98]/30 focus:border-[#2e3e98] w-64 shadow-xs"
            />
          </div>

          <Link
            href="/admin/departments/import"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 text-[#2e3e98] hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import Excel</span>
          </Link>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#2e3e98] hover:bg-[#233075] text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Phòng Ban Mới</span>
          </button>
        </div>
      </div>

      {/* Departments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#2e3e98]" />
            <p className="text-xs text-slate-500">Đang tải danh sách phòng ban...</p>
          </div>
        ) : departments.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Chưa có phòng ban nào</p>
            <button
              onClick={openCreateModal}
              className="mt-3 text-xs text-[#2e3e98] font-semibold hover:underline"
            >
              + Tạo phòng ban đầu tiên
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Mã Phòng Ban</th>
                  <th className="py-3 px-4">Tên Đầy Đủ</th>
                  <th className="py-3 px-4 text-center">Nhân Sự Trực Thuộc</th>
                  <th className="py-3 px-4 text-center">Câu Hỏi Ngân Hàng</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map((d) => {
                  const isActive = d.status === 'ACTIVE';
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {d.code}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {d.name}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>{d._count?.users || 0}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                          <HelpCircle className="w-3 h-3 text-slate-400" />
                          <span>{d._count?.questions || 0}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isActive ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                            Hoạt Động
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-600">
                            Tạm Dừng
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(d)}
                          className="p-1.5 text-slate-500 hover:text-[#2e3e98] hover:bg-blue-50 rounded transition cursor-pointer"
                          title="Sửa tên phòng ban"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(d.id)}
                          className={`p-1.5 rounded transition cursor-pointer ${
                            isActive
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={isActive ? 'Tạm dừng phòng ban' : 'Kích hoạt lại'}
                        >
                          {isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalItems={total}
          pageSize={pageSize}
          pageSizeOptions={[5, 10, 20, 40]}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemName="phòng ban"
        />
      </div>

      {/* Modal Create / Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {modalMode === 'create' ? 'Thêm Phòng Ban Mới' : 'Cập Nhật Phòng Ban'}
            </h2>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Mã Phòng Ban (Code)
                </label>
                <input
                  type="text"
                  required
                  disabled={modalMode === 'edit'}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="VD: TECH, SALES, HR..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Tên Đầy Đủ Phòng Ban
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Phòng Công Nghệ Thông Tin..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Delete Confirmation Box */}
              {showDeleteConfirm && modalMode === 'edit' && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2.5 animate-in fade-in">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-800 font-medium leading-relaxed">
                      Bạn có chắc chắn muốn xóa phòng ban <strong>{name} ({code})</strong>?
                      Thao tác này sẽ xóa vĩnh viễn và không thể hoàn tác.
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold transition"
                    >
                      Không, giữ lại
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteDepartment}
                      disabled={isDeleting}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang xóa...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xác nhận xóa</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                <div>
                  {modalMode === 'edit' && !showDeleteConfirm && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-3 py-2 text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      title="Xóa vĩnh viễn phòng ban"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa phòng ban</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isDeleting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{modalMode === 'create' ? 'Tạo Phòng Ban' : 'Lưu Thay Đổi'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
