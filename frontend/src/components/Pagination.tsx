'use client';

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemName?: string;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  pageSizeOptions = [5, 10, 20, 40],
  onPageChange,
  onPageSizeChange,
  itemName = 'mục',
  className = '',
}: PaginationProps) {
  const safePageSize = Math.max(1, Number(pageSize) || 10);
  const totalPages = Math.max(1, Math.ceil((totalItems || 0) / safePageSize));
  const safePage = Math.min(Math.max(1, Number(currentPage) || 1), totalPages);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * safePageSize + 1;
  const endItem = Math.min(safePage * safePageSize, totalItems);

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (safePage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (safePage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', safePage - 1, safePage, safePage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div
      className={`px-4 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 ${className}`}
    >
      {/* Page Size & Item Count Info */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Hiển thị</span>
          <select
            value={pageSize}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              onPageSizeChange(newSize);
              onPageChange(1);
            }}
            className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2e3e98]/30 focus:border-[#2e3e98] cursor-pointer transition"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span className="text-slate-500 font-medium">{itemName} / trang</span>
        </div>

        <div className="text-slate-400 hidden sm:inline-block">
          |
        </div>

        <div>
          <span>
            {totalItems > 0 ? (
              <>
                Hiển thị <strong className="font-semibold text-slate-800">{startItem}</strong> -{' '}
                <strong className="font-semibold text-slate-800">{endItem}</strong> trong tổng số{' '}
                <strong className="font-semibold text-slate-900">{totalItems}</strong> {itemName}
              </>
            ) : (
              <span>Không có {itemName} nào</span>
            )}
          </span>
        </div>
      </div>

      {/* Page Navigation */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safePage <= 1}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none text-slate-600 transition"
          title="Trang đầu"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none text-slate-600 transition"
          title="Trang trước"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1 px-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="px-1.5 py-1 text-slate-400 select-none">
                  …
                </span>
              );
            }
            const isCurrent = p === safePage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(Number(p))}
                className={`min-w-[30px] h-[30px] px-2 rounded-lg text-xs font-semibold transition ${
                  isCurrent
                    ? 'bg-[#2e3e98] text-white shadow-xs'
                    : 'border border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none text-slate-600 transition"
          title="Trang sau"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={safePage >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none text-slate-600 transition"
          title="Trang cuối"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
