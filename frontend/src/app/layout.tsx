import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'Hệ Thống Thi Trắc Nghiệm Trực Tuyến Nội Bộ',
  description: 'Nền tảng khảo sát và thi trắc nghiệm đánh giá năng lực nội bộ doanh nghiệp',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="antialiased min-h-screen flex flex-col bg-slate-50 text-slate-900" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
