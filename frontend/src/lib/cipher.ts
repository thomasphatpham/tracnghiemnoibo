/**
 * Tiện ích mã hóa/giải mã đơn giản phía client.
 * Dùng XOR + Base64 để che giấu dữ liệu nhạy cảm đã nhúng trong response chính.
 * Key phải khớp với key trên backend (ANSWER_CIPHER_KEY).
 */

const CIPHER_KEY = process.env.NEXT_PUBLIC_ANSWER_CIPHER_KEY ?? 'SB_SDTC_@2025#Secure';

/** Kết quả sau giải mã đáp án */
export interface DecipheredAnswer {
  position: number;
  correctKey: string;
}

/**
 * Giải mã chuỗi `_x` đã được backend nhúng vào response attempt.
 * @param encoded - Chuỗi Base64 XOR từ trường `_x`
 * @returns Mảng đáp án đúng theo vị trí câu hỏi
 */
export function decipherAnswers(encoded: string): DecipheredAnswer[] {
  const raw = atob(encoded);
  const keyBytes = Array.from(CIPHER_KEY).map((c) => c.charCodeAt(0));
  let decoded = '';
  for (let i = 0; i < raw.length; i++) {
    decoded += String.fromCharCode(
      raw.charCodeAt(i) ^ keyBytes[i % keyBytes.length],
    );
  }
  // Backend dùng key ngắn {p, k} để giảm kích thước payload
  const compact = JSON.parse(decoded) as Array<{ p: number; k: string }>;
  return compact.map((item) => ({ position: item.p, correctKey: item.k }));
}

