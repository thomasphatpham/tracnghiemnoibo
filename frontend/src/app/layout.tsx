import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'Hệ Thống Thi Trắc Nghiệm Trực Tuyến Nội Bộ',
  description: 'Nền tảng khảo sát và thi trắc nghiệm đánh giá năng lực nội bộ doanh nghiệp',
};

// Tách viewport ra riêng theo Next.js 15 best practice
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0066B1',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Preload video intro — cache ngay khi tải trang */}
        <link
          rel="preload"
          href="/3D_logo_reveal_animation_1080p_20261001140330.mp4"
          as="video"
          type="video/mp4"
        />
        {/* Preload logo */}
        <link
          rel="preload"
          href="/logo_saigonbank.jpg"
          as="image"
          type="image/jpeg"
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col bg-slate-50 text-slate-900" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
