/**
 * Employee route group loading skeleton
 * Hiển thị khi chuyển trang trong khu vực /employee/*
 * Không ảnh hưởng logic — chỉ là UI placeholder trong lúc route chunk đang load
 */
export default function EmployeeLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 w-full animate-fade-in">
      {/* Welcome banner skeleton */}
      <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-blue-600/10 to-indigo-700/10 border border-blue-100 space-y-3">
        <div className="skeleton skeleton-text w-40" style={{ height: '14px' }} />
        <div className="skeleton skeleton-text-lg w-72" />
        <div className="skeleton skeleton-text w-full max-w-md" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="space-y-2">
              <div className="skeleton skeleton-text w-28" />
              <div className="skeleton h-8 w-12 rounded-lg" />
            </div>
            <div className="skeleton skeleton-circle w-11 h-11" />
          </div>
        ))}
      </div>

      {/* Table content skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="skeleton skeleton-text-lg w-56" />
            <div className="skeleton skeleton-text w-72" />
          </div>
          <div className="skeleton skeleton-text w-28" />
        </div>
        <div className="divide-y divide-slate-50">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 items-center px-6 py-4">
              <div className="flex-1 space-y-1.5">
                <div className="skeleton skeleton-text w-3/4" />
                <div className="skeleton skeleton-text w-1/2" style={{ height: '10px' }} />
              </div>
              <div className="skeleton skeleton-text w-20" />
              <div className="skeleton skeleton-text w-16" />
              <div className="skeleton h-7 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
