/**
 * Vô hiệu hóa toàn bộ console output trong môi trường production.
 * Chỉ giữ lại console.error khi chạy development để debug.
 *
 * Gọi file này 1 lần duy nhất ở root layout (layout.tsx).
 */
export function suppressConsoleInProduction(): void {
  if (typeof window === 'undefined') return; // Chỉ chạy phía client

  if (process.env.NODE_ENV === 'production') {
    // Tắt toàn bộ console methods trong production
    const noop = () => {};
    window.console.log   = noop;
    window.console.info  = noop;
    window.console.warn  = noop;
    window.console.error = noop;
    window.console.debug = noop;
    window.console.table = noop;
    window.console.dir   = noop;
    window.console.group = noop;
    window.console.groupCollapsed = noop;
    window.console.groupEnd       = noop;
    window.console.trace = noop;
    window.console.assert = noop;
  }
}
