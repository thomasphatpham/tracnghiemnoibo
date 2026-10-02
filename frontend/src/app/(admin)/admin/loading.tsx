/**
 * Admin route group loading skeleton
 * Hiển thị khi chuyển trang trong khu vực /admin/*
 * Không ảnh hưởng logic — chỉ là UI placeholder trong lúc route chunk đang load
 */
export default function AdminLoading() {
  return (
    <div className="flex-1 p-8 space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="skeleton skeleton-text-lg w-64" />
        <div className="skeleton skeleton-text w-96" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="skeleton skeleton-text w-28" />
              <div className="skeleton h-8 w-16 rounded-lg" />
            </div>
            <div className="skeleton skeleton-circle w-12 h-12 ml-4" />
          </div>
        ))}
      </div>

      {/* Content block skeleton */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="skeleton skeleton-text-lg w-48" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 items-center py-3 border-b border-slate-50 last:border-0">
              <div className="skeleton skeleton-circle w-8 h-8 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton skeleton-text w-full max-w-xs" />
                <div className="skeleton skeleton-text w-1/3" style={{ height: '10px' }} />
              </div>
              <div className="skeleton skeleton-text w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
