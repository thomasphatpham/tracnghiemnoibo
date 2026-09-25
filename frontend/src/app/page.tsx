import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Phone,
  Mail,
  ShieldCheck,
  Cpu,
  Award,
  Users,
  UserPlus,
  HelpCircle,
  Sparkles,
  KeyRound,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-white rounded-lg p-1 border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden">
              <Image
                src="/logo_saigonbank.jpg"
                alt="Saigonbank Logo"
                width={44}
                height={44}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                NGÂN HÀNG TMCP SÀI GÒN CÔNG THƯƠNG (SAIGONBANK)
              </div>
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                TRUNG TÂM CHUYỂN ĐỔI SỐ — HỆ THỐNG THI TRẮC NGHIỆM NỘI BỘ
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2e3e98] hover:bg-[#24327d] text-white text-sm font-semibold shadow-sm transition"
            >
              <span>Vào Đăng Nhập</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex items-center justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start w-full">
          
          {/* LEFT COLUMN: GIỚI THIỆU TRUNG TÂM CĐS & HƯỚNG DẪN TRUY CẬP (7/12) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Block 1: Giới thiệu Trung tâm Chuyển đổi số */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>SAIGONBANK DIGITAL TRANSFORMATION CENTER</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                TRUNG TÂM CHUYỂN ĐỔI SỐ SAIGONBANK
              </h2>

              <p className="text-sm sm:text-base text-slate-700 leading-relaxed text-justify">
                Trung tâm Chuyển đổi số (TT CĐS) là đơn vị đầu mối chiến lược của{' '}
                <strong className="text-slate-900">SAIGONBANK</strong>, tiên phong nghiên cứu, phát triển và ứng dụng các giải pháp công nghệ hiện đại nhằm hiện đại hóa hoạt động ngân hàng, nâng cao năng suất lao động và số hóa toàn diện quy trình nghiệp vụ nội bộ.
              </p>

              <p className="text-sm sm:text-base text-slate-700 leading-relaxed text-justify">
                <strong className="text-blue-800">Hệ thống Thi Trắc Nghiệm Trực Tuyến Nội Bộ</strong> là một giải pháp công nghệ trọng điểm do TT CĐS thiết kế và vận hành nhằm phục vụ công tác kiểm tra nghiệp vụ định kỳ, sát hạch năng lực chuyên môn và đào tạo liên tục cho toàn thể cán bộ nhân viên với tiêu chí <em>minh bạch, chuẩn xác, an toàn và bảo mật cao</em>.
              </p>
            </div>

            {/* Block 2: 3 Giá trị cốt lõi */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
                  <Cpu className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 mb-1">Tự Động Hóa 100%</h4>
                <p className="text-[12px] text-slate-600 leading-relaxed">
                  Trộn đề độc lập, đếm giờ server và chấm điểm tự động tức thời.
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 mb-1">Khảo Thí Công Bằng</h4>
                <p className="text-[12px] text-slate-600 leading-relaxed">
                  Giám sát chống gian lận đa tầng, snapshot đề thi đóng băng bất biến.
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-2.5">
                  <Users className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 mb-1">Nâng Cao Năng Lực</h4>
                <p className="text-[12px] text-slate-600 leading-relaxed">
                  Đánh giá toàn diện kiến thức chuyên môn từng phòng ban, nghiệp vụ.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: CARD YÊU CẦU CẤP TÀI KHOẢN (5/12) */}
          <div className="lg:col-span-5 w-full">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 sm:p-9 space-y-6">
              
              {/* Card Header with Saigonbank Identity */}
              <div className="text-center space-y-3 pb-4 border-b border-slate-100">
                <div className="w-16 h-16 bg-white rounded-2xl p-2 mx-auto border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden">
                  <Image
                    src="/logo_saigonbank.jpg"
                    alt="Saigonbank Logo"
                    width={56}
                    height={56}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-[#2e3e98] tracking-tight uppercase">
                    CỔNG TRUY CẬP HỆ THỐNG
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Cổng dịch vụ khảo thí SAIGONBANK
                  </p>
                </div>
              </div>

              {/* Informative Guidance */}
              <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                <div className="p-3.5 bg-blue-50/80 border border-blue-100 rounded-xl text-xs text-blue-950 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-blue-800">
                    <UserPlus className="w-4 h-4 text-blue-700" />
                    <span>Chưa có tài khoản thi sát hạch?</span>
                  </div>
                  <p className="leading-relaxed">
                    Cán bộ nhân viên mới hoặc chưa được cấp tài khoản vui lòng bấm nút bên dưới để gửi yêu cầu. Quản trị viên sẽ kiểm tra và phê duyệt cấp tài khoản cho bạn.
                  </p>
                </div>

                <div className="space-y-2 text-xs text-slate-600 pt-1">
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                    <span>Yêu cầu được gửi trực tiếp đến Ban Quản trị phê duyệt.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                    <span>Thông tin phòng ban và chức danh được chuẩn hóa.</span>
                  </div>
                </div>
              </div>

              {/* PRIMARY ACTION BUTTON: YÊU CẦU CẤP TÀI KHOẢN (ĐIỀU HƯỚNG TỚI TRANG /request-account) */}
              <div className="pt-2 space-y-3">
                <Link
                  href="/request-account"
                  className="group flex items-center justify-between w-full py-4 px-6 rounded-xl bg-[#2e3e98] hover:bg-[#233075] text-white font-bold text-base shadow-lg shadow-blue-950/20 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <div className="flex items-center gap-3">
                    <UserPlus className="w-5 h-5 text-blue-200" />
                    <span>Yêu cầu cấp tài khoản</span>
                  </div>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>



      {/* Footer */}
      <footer className="border-t border-slate-200 py-4 bg-white text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            &copy; 2026 Ngân hàng TMCP Sài Gòn Công Thương (SAIGONBANK). Bản quyền thuộc về SAIGONBANK.
          </div>
          <div className="text-slate-400">
            Được phát triển & vận hành bởi Trung tâm Chuyển đổi số SAIGONBANK
          </div>
        </div>
      </footer>
    </div>
  );
}
