'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  ShieldCheck,
  Shield,
  HelpCircle,
  Award,
  BarChart3,
  CheckCheck,
  RotateCcw,
  Save,
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  Sliders,
  X,
  FileSpreadsheet,
} from 'lucide-react';

interface PermissionItem {
  id: string;
  resource: string;
  action: string;
  label: string;
  sortOrder: number;
}

interface ResourceGroupConfig {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const RESOURCE_CONFIG: Record<string, ResourceGroupConfig> = {
  questions: {
    title: 'Ngân Hàng Câu Hỏi',
    description: 'Quản lý ngân hàng câu hỏi trắc nghiệm thuộc thẩm quyền của phòng ban',
    icon: HelpCircle,
  },
  exams: {
    title: 'Quản Lý Kỳ Thi',
    description: 'Tạo lập, cấu hình, xuất bản và giám sát các kỳ thi nội bộ',
    icon: Award,
  },
  reports: {
    title: 'Báo Cáo & Thống Kê',
    description: 'Xem thống kê điểm số, tiến độ thi và trích xuất dữ liệu kết quả phòng ban',
    icon: BarChart3,
  },
};

export default function AdminPermissionsPage() {
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [initialSelectedIds, setInitialSelectedIds] = useState<Set<string>>(new Set());

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load permissions from API
  const fetchPermissionsData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [allPermsRes, rolePermsRes] = await Promise.all([
        api.get('/permissions'),
        api.get('/permissions/role/DEPT_MANAGER'),
      ]);

      const allPerms: PermissionItem[] = Array.isArray(allPermsRes.data)
        ? allPermsRes.data
        : allPermsRes.data?.data || [];

      const rolePerms: PermissionItem[] = Array.isArray(rolePermsRes.data)
        ? rolePermsRes.data
        : rolePermsRes.data?.data || [];

      setPermissions(allPerms);

      const activeIds = new Set<string>(rolePerms.map((p) => p.id));
      setSelectedIds(activeIds);
      setInitialSelectedIds(new Set(activeIds));
    } catch (err: any) {
      console.error('Lỗi tải danh sách quyền:', err);
      const msg =
        err.response?.data?.message ||
        'Không thể tải dữ liệu phân quyền. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissionsData();
  }, [fetchPermissionsData]);

  // Group permissions by resource
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, PermissionItem[]> = {};

    // Sort order defined by sortOrder field
    const sorted = [...permissions].sort((a, b) => a.sortOrder - b.sortOrder);

    for (const item of sorted) {
      if (!groups[item.resource]) {
        groups[item.resource] = [];
      }
      groups[item.resource].push(item);
    }
    return groups;
  }, [permissions]);

  // Determine if there are unsaved changes
  const isDirty = useMemo(() => {
    if (selectedIds.size !== initialSelectedIds.size) return true;
    for (const id of selectedIds) {
      if (!initialSelectedIds.has(id)) return true;
    }
    return false;
  }, [selectedIds, initialSelectedIds]);

  // Toggle single permission
  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Global select all / deselect all
  const handleSelectAllGlobal = () => {
    const allIds = new Set(permissions.map((p) => p.id));
    setSelectedIds(allIds);
  };

  const handleDeselectAllGlobal = () => {
    setSelectedIds(new Set());
  };

  // Reset to initial
  const handleReset = () => {
    setSelectedIds(new Set(initialSelectedIds));
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  // Group select all / deselect all
  const handleSelectGroup = (resource: string) => {
    const groupItems = groupedPermissions[resource] || [];
    setSelectedIds((prev) => {
      const next = new Set(prev);
      groupItems.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const handleDeselectGroup = (resource: string) => {
    const groupItems = groupedPermissions[resource] || [];
    setSelectedIds((prev) => {
      const next = new Set(prev);
      groupItems.forEach((p) => next.delete(p.id));
      return next;
    });
  };

  // Save changes
  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const permissionIds = Array.from(selectedIds);
      await api.put('/permissions/role/DEPT_MANAGER', {
        permissionIds,
      });

      setInitialSelectedIds(new Set(selectedIds));
      setSuccessMessage('Cập nhật phân quyền cho vai trò Quản lý phòng ban thành công!');

      // Auto dismiss success toast after 4s
      setTimeout(() => {
        setSuccessMessage((cur) => (cur ? null : cur));
      }, 4000);
    } catch (err: any) {
      console.error('Lỗi lưu phân quyền:', err);
      const msg =
        err.response?.data?.message ||
        'Đã có lỗi xảy ra khi lưu phân quyền. Vui lòng kiểm tra lại quyền truy cập.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0066B1] shrink-0 shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                Phân Quyền Vai Trò
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-[#0066B1] border border-blue-200">
                DEPT_MANAGER
              </span>
              {isDirty && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Chưa lưu thay đổi
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Cấu hình đặc quyền truy cập và thao tác dữ liệu dành cho{' '}
              <strong className="text-slate-700 font-semibold">Quản Lý Phòng Ban (DEPT_MANAGER)</strong>.
            </p>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleSelectAllGlobal}
            disabled={isLoading || isSaving}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
            title="Chọn tất cả quyền hạn trên toàn bộ hệ thống"
          >
            <CheckCheck className="w-3.5 h-3.5 text-[#0066B1]" />
            <span>Chọn tất cả</span>
          </button>

          <button
            type="button"
            onClick={handleDeselectAllGlobal}
            disabled={isLoading || isSaving}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
            title="Bỏ chọn tất cả quyền hạn"
          >
            <X className="w-3.5 h-3.5 text-slate-500" />
            <span>Bỏ chọn tất cả</span>
          </button>

          {isDirty && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading || isSaving}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
              title="Khôi phục trạng thái ban đầu"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Hoàn tác</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading || isSaving || !isDirty}
            className={`inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition cursor-pointer disabled:cursor-not-allowed ${
              !isDirty
                ? 'bg-slate-300 text-slate-500 opacity-60'
                : 'bg-[#0066B1] hover:bg-blue-700 shadow-blue-900/20 hover:shadow-md'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Lưu thay đổi</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200/90 text-blue-900 flex items-start gap-3 shadow-xs">
        <Info className="w-5 h-5 text-[#0066B1] shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <p className="font-semibold text-[#0066B1] mb-0.5">Lưu ý về hiệu lực phân quyền:</p>
          <p className="text-slate-700">
            Quyền hạn mới sẽ có hiệu lực ngay khi Quản lý phòng ban truy cập trang hoặc làm mới phiên.
            Tài khoản <strong className="text-slate-900 font-semibold">Quản Trị Viên (ADMIN)</strong> luôn
            có toàn quyền trên mọi tài nguyên, trong khi tài khoản{' '}
            <strong className="text-slate-900 font-semibold">Nhân Viên (EMPLOYEE)</strong> chỉ có quyền
            tham gia khảo thí theo phân công.
          </p>
        </div>
      </div>

      {/* Toast Feedback */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-3 shadow-xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-semibold">{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 rounded-lg hover:bg-emerald-100/50 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between gap-3 shadow-xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="text-xs font-semibold">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-700 hover:text-rose-900 p-1 rounded-lg hover:bg-rose-100/50 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 flex flex-col items-center justify-center gap-3 text-slate-500 shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin text-[#0066B1]" />
          <p className="text-xs font-medium">Đang tải danh mục phân quyền hệ thống...</p>
        </div>
      ) : permissions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-500 shadow-xs">
          <Shield className="w-10 h-10 mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-semibold text-slate-700">Chưa tìm thấy quyền hạn nào</p>
          <p className="text-xs text-slate-500 mt-1">
            Vui lòng kiểm tra lại quá trình khởi tạo dữ liệu mẫu (seed) trên hệ thống.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedPermissions).map(([resourceKey, items]) => {
            const config = RESOURCE_CONFIG[resourceKey] || {
              title: resourceKey.toUpperCase(),
              description: `Các đặc quyền thao tác tài nguyên ${resourceKey}`,
              icon: Shield,
            };
            const GroupIcon = config.icon;

            const selectedCountInGroup = items.filter((item) => selectedIds.has(item.id)).length;
            const isAllGroupSelected = selectedCountInGroup === items.length && items.length > 0;

            return (
              <div
                key={resourceKey}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all duration-200 hover:shadow-sm"
              >
                {/* Group Header */}
                <div className="px-6 py-4 bg-slate-50/60 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-[#0066B1] shrink-0">
                      <GroupIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-800">{config.title}</h2>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          {selectedCountInGroup} / {items.length} đã kích hoạt
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{config.description}</p>
                    </div>
                  </div>

                  {/* Group Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() =>
                        isAllGroupSelected
                          ? handleDeselectGroup(resourceKey)
                          : handleSelectGroup(resourceKey)
                      }
                      className="px-2.5 py-1 text-[11px] font-semibold text-[#0066B1] hover:text-blue-800 hover:bg-blue-50/80 rounded-lg transition border border-blue-200/60 cursor-pointer"
                    >
                      {isAllGroupSelected ? 'Bỏ chọn nhóm' : 'Chọn tất cả nhóm'}
                    </button>
                  </div>
                </div>

                {/* Group Items Grid */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((perm) => {
                    const isChecked = selectedIds.has(perm.id);
                    return (
                      <div
                        key={perm.id}
                        onClick={() => handleToggle(perm.id)}
                        className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 select-none ${
                          isChecked
                            ? 'bg-blue-50/50 border-blue-300/80 shadow-xs ring-1 ring-blue-400/20'
                            : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-semibold ${
                                isChecked ? 'text-blue-950 font-bold' : 'text-slate-700'
                              }`}
                            >
                              {perm.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200/80">
                              {perm.resource}:{perm.action}
                            </span>
                          </div>
                        </div>

                        {/* Modern Toggle Switch */}
                        <div className="shrink-0 flex items-center">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isChecked}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggle(perm.id);
                            }}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0066B1] focus:ring-offset-2 ${
                              isChecked ? 'bg-[#0066B1]' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                isChecked ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Sticky Save Bar for ease of access on mobile / long scrolls */}
      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 text-white px-6 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-4 border border-slate-700/60 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span className="text-xs font-semibold text-slate-200">
              Có thay đổi phân quyền chưa được lưu
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-[#0066B1] hover:bg-blue-600 text-white rounded-xl shadow-md transition cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu ngay</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
