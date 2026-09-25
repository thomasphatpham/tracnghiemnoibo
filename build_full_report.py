# -*- coding: utf-8 -*-
"""
Script to build the comprehensive Software Design Report for Trac Nghiem Noi Bo.
Output: C:\\Users\\MINHFAT\\Desktop\\TracNghiemNoiBo\\Bao_cao_thiet_ke_phan_mem_he_thong_thi_trac_nghiem.docx
"""
import os
import sys
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def create_full_report():
    doc = Document()

    # 1. Page Setup - Margins 1 inch (72 pt)
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.9)
        section.right_margin = Inches(0.9)
        section.page_width = Inches(8.27)  # A4
        section.page_height = Inches(11.69)

    # Helper styling functions
    def set_cell_background(cell, hex_color):
        tcPr = cell._tc.get_or_add_tcPr()
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
        tcPr.append(shd)

    def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = parse_xml(f'''
            <w:tcMar {nsdecls("w")}>
                <w:top w:w="{top}" w:type="dxa"/>
                <w:bottom w:w="{bottom}" w:type="dxa"/>
                <w:left w:w="{left}" w:type="dxa"/>
                <w:right w:w="{right}" w:type="dxa"/>
            </w:tcMar>
        ''')
        tcPr.append(tcMar)

    def set_cell_borders(cell, top="CBD5E1", bottom="CBD5E1", left="CBD5E1", right="CBD5E1", sz="4"):
        tcPr = cell._tc.get_or_add_tcPr()
        borders = parse_xml(f'''
            <w:tcBorders {nsdecls("w")}>
                <w:top w:val="single" w:sz="{sz}" w:space="0" w:color="{top}"/>
                <w:left w:val="single" w:sz="{sz}" w:space="0" w:color="{left}"/>
                <w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{bottom}"/>
                <w:right w:val="single" w:sz="{sz}" w:space="0" w:color="{right}"/>
            </w:tcBorders>
        ''')
        tcPr.append(borders)

    def format_table_headers(table, col_widths=None):
        hdr_row = table.rows[0]
        # Set cantSplit and tblHeader
        trPr = hdr_row._tr.get_or_add_trPr()
        trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))
        trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
        
        for idx, cell in enumerate(hdr_row.cells):
            set_cell_background(cell, "0F2C59")
            set_cell_margins(cell, top=140, bottom=140, left=140, right=140)
            set_cell_borders(cell, top="0F2C59", bottom="0F2C59", left="1E3A8A", right="1E3A8A", sz="8")
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            if col_widths and idx < len(col_widths):
                cell.width = col_widths[idx]
            for p in cell.paragraphs:
                p.paragraph_format.space_before = Pt(0)
                p.paragraph_format.space_after = Pt(0)
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                for run in p.runs:
                    run.font.name = "Arial"
                    run.font.size = Pt(9.5)
                    run.font.bold = True
                    run.font.color.rgb = RGBColor(255, 255, 255)

    def format_table_data(table, col_widths=None, alignments=None):
        for r_idx in range(1, len(table.rows)):
            row = table.rows[r_idx]
            trPr = row._tr.get_or_add_trPr()
            trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
            bg_col = "F8FAFC" if (r_idx % 2 == 1) else "FFFFFF"
            for c_idx, cell in enumerate(row.cells):
                set_cell_background(cell, bg_col)
                set_cell_margins(cell, top=100, bottom=100, left=130, right=130)
                set_cell_borders(cell, top="E2E8F0", bottom="E2E8F0", left="E2E8F0", right="E2E8F0", sz="4")
                cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                if col_widths and c_idx < len(col_widths):
                    cell.width = col_widths[c_idx]
                for p in cell.paragraphs:
                    p.paragraph_format.space_before = Pt(0)
                    p.paragraph_format.space_after = Pt(0)
                    p.paragraph_format.line_spacing = 1.15
                    if alignments and c_idx < len(alignments):
                        p.alignment = alignments[c_idx]
                    for run in p.runs:
                        run.font.name = "Arial"
                        run.font.size = Pt(9)
                        run.font.color.rgb = RGBColor(0x33, 0x41, 0x55)

    def add_heading_1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(20)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = "Arial"
        run.font.size = Pt(14)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0x0F, 0x2C, 0x59)
        return p

    def add_heading_2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = "Arial"
        run.font.size = Pt(12)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)
        return p

    def add_heading_3(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(9)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = "Arial"
        run.font.size = Pt(10.5)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0x25, 0x63, 0xEB)
        return p

    def add_p(text="", bold_prefix="", space_after=6, italic=False):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            r_b = p.add_run(bold_prefix)
            r_b.bold = True
            r_b.font.name = "Arial"
            r_b.font.size = Pt(10)
            r_b.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
        if text:
            r = p.add_run(text)
            r.font.name = "Arial"
            r.font.size = Pt(10)
            r.font.italic = italic
            r.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
        return p

    def add_bullet(text, bold_prefix=""):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            r_b = p.add_run(bold_prefix)
            r_b.bold = True
            r_b.font.name = "Arial"
            r_b.font.size = Pt(10)
            r_b.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
        r = p.add_run(text)
        r.font.name = "Arial"
        r.font.size = Pt(10)
        r.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
        return p

    def add_callout(text, title="LƯU Ý THIẾT KẾ & BẢO MẬT:"):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = tbl.cell(0, 0)
        set_cell_background(cell, "F0F4F8")
        set_cell_margins(cell, top=140, bottom=140, left=200, right=160)
        
        tcPr = cell._tc.get_or_add_tcPr()
        borders = parse_xml(f'''
            <w:tcBorders {nsdecls("w")}>
                <w:top w:val="none"/>
                <w:left w:val="single" w:sz="24" w:space="0" w:color="1E3A8A"/>
                <w:bottom w:val="none"/>
                <w:right w:val="none"/>
            </w:tcBorders>
        ''')
        tcPr.append(borders)
        
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.15
        r_title = p.add_run(f"📌 {title} ")
        r_title.bold = True
        r_title.font.name = "Arial"
        r_title.font.size = Pt(9.5)
        r_title.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)
        
        r_text = p.add_run(text)
        r_text.font.name = "Arial"
        r_text.font.size = Pt(9.5)
        r_text.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)
        
        p_after = doc.add_paragraph()
        p_after.paragraph_format.space_before = Pt(0)
        p_after.paragraph_format.space_after = Pt(6)

    # -------------------------------------------------------------
    # COVER / HEADER TITLE
    # -------------------------------------------------------------
    logo_path = r"C:\Users\MINHFAT\Desktop\TracNghiemNoiBo\logo_saigonbank.jpg"
    if os.path.exists(logo_path):
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_logo.paragraph_format.space_before = Pt(10)
        p_logo.paragraph_format.space_after = Pt(12)
        r_img = p_logo.add_run()
        r_img.add_picture(logo_path, width=Inches(1.8))

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(10)
    p_title.paragraph_format.space_after = Pt(4)
    run_t = p_title.add_run("BÁO CÁO THIẾT KẾ VÀ ĐẶC TẢ HỆ THỐNG")
    run_t.font.name = "Arial"
    run_t.font.size = Pt(18)
    run_t.font.bold = True
    run_t.font.color.rgb = RGBColor(0x0F, 0x2C, 0x59)

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(12)
    run_s = p_sub.add_run("NỀN TẢNG THI TRẮC NGHIỆM TRỰC TUYẾN NỘI BỘ (ENTERPRISE ASSESSMENT PLATFORM)")
    run_s.font.name = "Arial"
    run_s.font.size = Pt(12)
    run_s.font.bold = True
    run_s.font.color.rgb = RGBColor(0x25, 0x63, 0xEB)

    # Metadata Box
    tbl_meta = doc.add_table(rows=5, cols=2)
    tbl_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_data = [
        ("Phiên bản tài liệu:", "2.0 (Bản cập nhật hoàn thiện kiến trúc, quy trình & chốt quyết định nghiệp vụ)"),
        ("Trạng thái phê duyệt:", "ĐÃ PHÊ DUYỆT & ĐỒNG BỘ TOÀN DIỆN VỚI MÃ NGUỒN HỆ THỐNG"),
        ("Kiến trúc công nghệ:", "Next.js 15 (React 19) + NestJS 10 (TypeScript) + PostgreSQL 17 + Prisma ORM 5"),
        ("Ngày hoàn thiện:", "24/09/2026"),
        ("Mục tiêu tài liệu:", "Đặc tả chuẩn kỹ thuật, cấu trúc CSDL, API, thuật toán phân bổ và cơ chế chống gian lận đa tầng")
    ]
    for idx, (lbl, val) in enumerate(meta_data):
        row = tbl_meta.rows[idx]
        cell_lbl, cell_val = row.cells[0], row.cells[1]
        cell_lbl.width = Inches(2.2)
        cell_val.width = Inches(4.3)
        cell_lbl.text = lbl
        cell_val.text = val
        format_table_data(tbl_meta, col_widths=[Inches(2.2), Inches(4.3)], alignments=[WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT])
        # bold label
        for p in cell_lbl.paragraphs:
            for r in p.runs:
                r.bold = True
                r.font.color.rgb = RGBColor(0x0F, 0x2C, 0x59)

    doc.add_paragraph().paragraph_format.space_after = Pt(14)

    # -------------------------------------------------------------
    # 1. MỤC TIÊU VÀ PHẠM VI HỆ THỐNG
    # -------------------------------------------------------------
    add_heading_1("1. Mục tiêu và phạm vi hệ thống")
    add_p("Hệ thống phục vụ công tác tổ chức thi trắc nghiệm, sát hạch định kỳ và kiểm tra năng lực chuyên môn nội bộ trong trung tâm/doanh nghiệp. Quy mô đáp ứng từ 100 đến 1.000 cán bộ nhân viên đồng thời với độ trễ thấp, tính ổn định và tính toàn vẹn dữ liệu ở mức tối đa. Hệ thống phân chia độc lập hoàn toàn hai phân hệ giao diện và quyền hạn nghiệp vụ: ADMIN (Quản trị kỹ thuật & Khảo thí) và EMPLOYEE (Cán bộ nhân viên tham gia thi).", bold_prefix="Bối cảnh & Sứ mệnh: ")
    add_p("Toàn bộ kiến trúc được xây dựng theo mô hình Monolith tinh gọn, sử dụng Next.js 15 (TypeScript, Tailwind CSS), NestJS 10 (TypeScript, Guards, Interceptors), PostgreSQL 17 và Prisma ORM 5, đảm bảo tính sẵn sàng cao, bảo mật cao và dễ bảo trì.", bold_prefix="Nguyên tắc thiết kế: ")

    add_heading_2("1.1. Phân loại vai trò người dùng (User Roles)")
    tbl_roles = doc.add_table(rows=3, cols=3)
    tbl_roles.rows[0].cells[0].text = "Vai trò (Role)"
    tbl_roles.rows[0].cells[1].text = "Đối tượng sử dụng"
    tbl_roles.rows[0].cells[2].text = "Phạm vi chức năng và trách nhiệm"

    tbl_roles.rows[1].cells[0].text = "ADMIN"
    tbl_roles.rows[1].cells[1].text = "Ban Giám đốc, Quản trị viên kỹ thuật, Khảo thí, Khối Nhân sự"
    tbl_roles.rows[1].cells[2].text = "Toàn quyền quản trị hệ thống: Quản lý danh mục phòng ban, người dùng (khóa/mở khóa), ngân hàng câu hỏi (nhập liệu, import Excel 2 pha), thiết lập cấu hình kỳ thi, giám sát thi trực tiếp, tra cứu nhật ký vi phạm chuyển tab, xem đề thi snapshot bất biến và trích xuất báo cáo thống kê chuyên sâu (XLSX, PDF)."

    tbl_roles.rows[2].cells[0].text = "EMPLOYEE"
    tbl_roles.rows[2].cells[1].text = "Cán bộ, nhân viên, thực tập sinh thuộc các phòng ban"
    tbl_roles.rows[2].cells[2].text = "Hoàn thiện hồ sơ ban đầu (chọn phòng ban chuẩn hóa), quản lý mật khẩu cá nhân, tra cứu danh sách kỳ thi được phân quyền, làm bài thi trực tuyến (hỗ trợ autosave ngầm, đồng hồ đếm ngược server-side, chống gian lận), nộp bài và tra cứu bảng điểm kết quả theo chính sách của từng kỳ thi."

    format_table_headers(tbl_roles, [Inches(1.2), Inches(2.0), Inches(3.3)])
    format_table_data(tbl_roles, [Inches(1.2), Inches(2.0), Inches(3.3)], [WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT])

    add_heading_2("1.2. Cơ chế phân loại phạm vi thí sinh (Candidate Scope) - [Chức năng mở rộng]")
    add_p("Hệ thống cho phép Quản trị viên cấu hình phạm vi đối tượng được tham gia từng kỳ thi cụ thể thông qua trường candidateScope (enum trong Prisma Schema), bao gồm 3 chế độ linh hoạt:", bold_prefix="Đặc tả phạm vi đối tượng: ")
    add_bullet("Kỳ thi áp dụng cho toàn bộ nhân viên đang hoạt động (ACTIVE) trong toàn hệ thống, không phân biệt đơn vị.", "1. ALL (Toàn thể nhân viên): ")
    add_bullet("Kỳ thi chỉ mở cho nhân viên thuộc danh sách các phòng ban được chọn (lưu trong bảng exam_assigned_departments). Nhân viên ngoài phòng ban này sẽ không nhìn thấy và không thể truy cập bài thi.", "2. DEPARTMENTS (Theo phòng ban chỉ định): ")
    add_bullet("Kỳ thi dành riêng cho nhóm nhân viên cụ thể theo danh sách tài khoản được chọn lọc (lưu trong bảng exam_assigned_users), phục vụ công tác thi nâng ngạch, sát hạch lại hoặc kiểm tra tay nghề cá nhân.", "3. SPECIFIC_USERS (Chỉ định đích danh): ")

    add_callout("Cơ chế phân quyền phạm vi thí sinh được kiểm soát chặt chẽ ở cả tầng UI (ẩn kỳ thi không thuộc diện tham gia) và tầng Backend (Guard từ chối cấp đề nếu userId không thỏa mãn candidateScope).", "BẢO VỆ PHẠM VI THI:")

    # -------------------------------------------------------------
    # 2. KIẾN TRÚC HỆ THỐNG & CƠ CHẾ BẢO MẬT
    # -------------------------------------------------------------
    add_heading_1("2. Kiến trúc tổng thể hệ thống & Cơ chế an ninh bảo mật")
    add_p("Hệ thống được thiết kế theo cấu trúc Monolith phân tách rõ rệt giữa Frontend và Backend. Sau khi đăng nhập, hệ thống tự động xác định Role và trạng thái tài khoản để chuyển hướng chính xác đến phân hệ chuyên biệt. Tuyệt đối không sử dụng giải pháp hiển thị chung một giao diện rồi chỉ ẩn các nút chức năng.", bold_prefix="Nguyên tắc cốt lõi: ")

    add_heading_2("2.1. Phân vùng giao diện và định tuyến độc lập")
    tbl_routes = doc.add_table(rows=4, cols=4)
    tbl_routes.rows[0].cells[0].text = "Khu vực"
    tbl_routes.rows[0].cells[1].text = "Định tuyến (Route)"
    tbl_routes.rows[0].cells[2].text = "Layout & Giao diện"
    tbl_routes.rows[0].cells[3].text = "Quyền hạn & Bảo vệ"

    tbl_routes.rows[1].cells[0].text = "Xác thực (Auth)"
    tbl_routes.rows[1].cells[1].text = "/login, /forgot-password, /reset-password"
    tbl_routes.rows[1].cells[2].text = "Auth Layout (thẻ form tập trung, nhận diện thương hiệu, thông báo lỗi trực quan)"
    tbl_routes.rows[1].cells[3].text = "Public (khách chưa đăng nhập); tự động chuyển hướng nếu token còn hiệu lực"

    tbl_routes.rows[2].cells[0].text = "Thí sinh (Employee)"
    tbl_routes.rows[2].cells[1].text = "/employee/* (/dashboard, /exams, /exam/:id, /results)"
    tbl_routes.rows[2].cells[2].text = "Employee Layout (Header tinh gọn + Breadcrumb + Khu vực thi tập trung, chống phân tâm)"
    tbl_routes.rows[2].cells[3].text = "Chỉ cho phép role EMPLOYEE đã kích hoạt và hoàn tất setup hồ sơ"

    tbl_routes.rows[3].cells[0].text = "Quản trị (Admin)"
    tbl_routes.rows[3].cells[1].text = "/admin/* (/dashboard, /users, /departments, /questions, /exams, /reports)"
    tbl_routes.rows[3].cells[2].text = "Admin Layout (Sidebar cố định thu gọn được + Topbar + Navigation Tree + Data Table)"
    tbl_routes.rows[3].cells[3].text = "Chỉ cho phép role ADMIN; chặn hoàn toàn nhân viên can thiệp bằng URL"

    format_table_headers(tbl_routes, [Inches(1.0), Inches(1.8), Inches(2.2), Inches(1.5)])
    format_table_data(tbl_routes, [Inches(1.0), Inches(1.8), Inches(2.2), Inches(1.5)], [WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT])

    add_heading_2("2.2. Kiến trúc xác thực phiên duy nhất (Single Active Session)")
    add_p("Nhằm ngăn chặn triệt để tình trạng chia sẻ tài khoản, đăng nhập đồng thời trên nhiều thiết bị hoặc nhờ người khác thi hộ từ xa, hệ thống triển khai cơ chế kiểm soát phiên làm việc đơn lẻ (Single Active Session) tại máy chủ:", bold_prefix="Bảo mật phiên đăng nhập: ")
    add_bullet("Mỗi khi người dùng đăng nhập thành công, máy chủ tạo một JWT token mới kèm bản ghi lưu tại bảng sessions với giá trị tokenHash (SHA-256) và thời điểm hết hạn expiresAt.", "1. Cấp phát phiên có định danh: ")
    add_bullet("Ngay khi phiên mới được khởi tạo, hệ thống tự động tìm tất cả các phiên đang hoạt động trước đó của tài khoản này và cập nhật revokedAt = now().", "2. Thu hồi toàn bộ phiên cũ (Session Invalidation): ")
    add_bullet("Mọi yêu cầu gửi lên từ trình duyệt cũ sẽ bị AuthGuard từ chối với mã lỗi 401 Unauthorized do tokenHash đã bị thu hồi. Trình duyệt cũ lập tức bị đăng xuất và chuyển hướng về màn hình đăng nhập kèm thông báo cảnh báo.", "3. Xử lý thiết bị cũ: ")

    add_heading_2("2.3. Cơ chế phòng thủ Brute-Force và khóa tài khoản tự động")
    add_bullet("Hệ thống tự động đếm số lần đăng nhập thất bại liên tiếp (failedLoginCount).", "Kiểm soát thử mật khẩu: ")
    add_bullet("Khi failedLoginCount chạm ngưỡng 5 lần, tài khoản tự động bị khóa trong 15 phút (cập nhật lockedUntil). Trong thời gian này, mọi yêu cầu đăng nhập đều bị từ chối kèm thông báo rõ thời gian tài khoản được mở lại.", "Khóa tạm thời 15 phút: ")
    add_bullet("Quy trình Quên mật khẩu gửi mã OTP gồm 6 chữ số ngẫu nhiên qua SMTP (Mailpit trong môi trường dev hoặc mail server nội bộ). Mã OTP có hiệu lực chính xác 10 phút và giới hạn tối đa 3 lần nhập sai trước khi tự động hủy mã.", "Cơ chế OTP an toàn: ")

    add_callout("Frontend Guards (Next.js middleware & context) chỉ đóng vai trò hỗ trợ trải nghiệm người dùng (UX). Lớp bảo vệ quyết định tính an toàn bắt buộc phải nằm ở Backend Guards (NestJS JwtAuthGuard kết hợp RolesGuard) với cơ chế kiểm tra tính hợp lệ của token trong bảng sessions.", "BẢO MẬT NGUYÊN TẮC ZERO-TRUST:")

    # -------------------------------------------------------------
    # 3. ĐẶC TẢ GIAO DIỆN & NGHIỆP VỤ THÍ SINH (EMPLOYEE)
    # -------------------------------------------------------------
    add_heading_1("3. Đặc tả giao diện & nghiệp vụ thí sinh (Employee Portal)")
    add_p("Cổng thí sinh được thiết kế với tiêu chí tối giản, rõ ràng, tốc độ tải trang nhanh và loại bỏ tối đa các yếu tố gây mất tập trung trong suốt quá trình làm bài thi.", bold_prefix="Định hướng giao diện: ")

    add_heading_2("3.1. Danh mục màn hình chức năng của Employee")
    tbl_emp_screens = doc.add_table(rows=10, cols=3)
    tbl_emp_screens.rows[0].cells[0].text = "Màn hình"
    tbl_emp_screens.rows[0].cells[1].text = "Route URL"
    tbl_emp_screens.rows[0].cells[2].text = "Thành phần giao diện & Hành vi nghiệp vụ"

    tbl_emp_screens.rows[1].cells[0].text = "Đăng nhập"
    tbl_emp_screens.rows[1].cells[1].text = "/login"
    tbl_emp_screens.rows[1].cells[2].text = "Email/Username, Password, nút Đăng nhập, liên kết Quên mật khẩu. Hiển thị thông báo khi sai mật khẩu hoặc tài khoản bị tạm khóa 15 phút."

    tbl_emp_screens.rows[2].cells[0].text = "Hoàn thiện hồ sơ lần đầu"
    tbl_emp_screens.rows[2].cells[1].text = "/employee/profile/setup"
    tbl_emp_screens.rows[2].cells[2].text = "Họ và tên, email, chức vụ, Select Box chọn Phòng ban (bắt buộc lấy từ API danh mục Admin, không cho nhập tự do). Sau khi lưu, trạng thái chuyển từ REQUIRE_SETUP sang ACTIVE. Chặn không cho vào làm bài nếu chưa hoàn tất."

    tbl_emp_screens.rows[3].cells[0].text = "Bảng điều khiển (Dashboard)"
    tbl_emp_screens.rows[3].cells[1].text = "/employee/dashboard"
    tbl_emp_screens.rows[3].cells[2].text = "Thẻ tóm tắt các kỳ thi: Đang mở (Open), Sắp diễn ra (Upcoming), Đã hoàn thành (Completed). Banner nổi bật cảnh báo nếu có bài thi đang làm dở với nút 'Tiếp tục làm bài'."

    tbl_emp_screens.rows[4].cells[0].text = "Hồ sơ cá nhân"
    tbl_emp_screens.rows[4].cells[1].text = "/employee/profile"
    tbl_emp_screens.rows[4].cells[2].text = "Xem thông tin họ tên, chức vụ, phòng ban. Cho phép đổi mật khẩu. Phòng ban hiển thị dạng Read-only (chỉ Admin mới có quyền điều chuyển phòng ban)."

    tbl_emp_screens.rows[5].cells[0].text = "Danh sách kỳ thi"
    tbl_emp_screens.rows[5].cells[1].text = "/employee/exams"
    tbl_emp_screens.rows[5].cells[2].text = "Danh sách dạng Card/Grid: Tên kỳ thi, thời gian mở/đóng, thời lượng (phút), số lượng câu hỏi, trạng thái. Nút thao tác: 'Xem chi tiết', 'Bắt đầu thi', 'Tiếp tục' hoặc 'Xem kết quả'."

    tbl_emp_screens.rows[6].cells[0].text = "Chi tiết kỳ thi"
    tbl_emp_screens.rows[6].cells[1].text = "/employee/exams/:id"
    tbl_emp_screens.rows[6].cells[2].text = "Thông tin chi tiết: Tên, mô tả, thời lượng làm bài, số lượng câu hỏi, điểm đạt yêu cầu, quy chế giám sát chuyển tab (số lần vi phạm tối đa, cảnh báo tự động nộp bài phạt). Nút 'Xác nhận vào thi'."

    tbl_emp_screens.rows[7].cells[0].text = "Phòng thi trực tuyến"
    tbl_emp_screens.rows[7].cells[1].text = "/employee/exam/:attemptId"
    tbl_emp_screens.rows[7].cells[2].text = "Header (Đồng hồ đếm ngược server-side, trạng thái lưu bài), Question Panel (nội dung câu hỏi, 4 đáp án A/B/C/D), Navigation Matrix (lưới câu hỏi phân màu Đã làm / Chưa làm / Đang chọn), nút 'Nộp bài'."

    tbl_emp_screens.rows[8].cells[0].text = "Hộp thoại xác nhận nộp"
    tbl_emp_screens.rows[8].cells[1].text = "Modal Popup"
    tbl_emp_screens.rows[8].cells[2].text = "Bảng thống kê tóm tắt: Số câu đã chọn, số câu còn bỏ trống, thời gian còn lại. Nút 'Hủy bỏ để làm tiếp' và nút 'Xác nhận nộp bài'."

    tbl_emp_screens.rows[9].cells[0].text = "Bảng kết quả thi"
    tbl_emp_screens.rows[9].cells[1].text = "/employee/results/:attemptId"
    tbl_emp_screens.rows[9].cells[2].text = "Hiển thị điểm số quy đổi thang 10, số câu Đúng / Sai / Chưa làm, kết luận ĐẠT (PASS) hoặc KHÔNG ĐẠT (FAIL). Hiển thị chi tiết đáp án đúng và giải thích CHỈ KHI cấu hình kỳ thi cho phép."

    format_table_headers(tbl_emp_screens, [Inches(1.5), Inches(1.8), Inches(3.2)])
    format_table_data(tbl_emp_screens, [Inches(1.5), Inches(1.8), Inches(3.2)], [WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT])

    add_heading_2("3.2. Cơ chế vận hành phòng thi trực tuyến (Exam Room Engine)")
    add_bullet("Server trả về mốc thời gian kết thúc tuyệt đối expiresAt (ISO 8601). Trình duyệt tính toán và đếm ngược theo thời gian thực dựa trên độ lệch giữa đồng hồ server và expiresAt, ngăn chặn việc chỉnh sửa đồng hồ máy tính để gian lận thời gian.", "1. Đồng hồ đếm ngược căn cứ Server Time: ")
    add_bullet("Mỗi thao tác chọn đáp án lập tức kích hoạt hàm lưu ngầm với kỹ thuật debounce 500ms. Giao diện hiển thị trạng thái 'Đang lưu...' chuyển sang 'Đã lưu' trong vòng 1 giây, giúp thí sinh yên tâm về tiến độ.", "2. Tự động lưu đáp án ngầm (Autosave): ")
    add_bullet("Nếu thí sinh gặp sự cố mất mạng đột ngột, đáp án vừa chọn được lưu tạm vào LocalStorage của trình duyệt. Khi mạng phục hồi, hệ thống tự động đẩy hàng đợi câu trả lời lên máy chủ.", "3. Khả năng chịu lỗi mất mạng (Offline Resiliency): ")
    add_bullet("API trả đề thi tuyệt đối KHÔNG chứa đáp án đúng (correctOptionKeySnapshot) hay phần giải thích, ngăn ngừa việc thí sinh bật Inspect (F12) để xem đáp án trong mã nguồn mạng.", "4. Ẩn đáp án đúng trên đường truyền (Payload Masking): ")
    add_bullet("Khi đồng hồ chạm mốc 00:00 hoặc máy chủ thông báo phiên thi đã hết hạn, giao diện tự động vô hiệu hóa toàn bộ nút chọn và chuyển sang trạng thái nộp bài bắt buộc.", "5. Xử lý hết giờ tự động: ")

    # -------------------------------------------------------------
    # 4. ĐẶC TẢ GIAO DIỆN & NGHIỆP VỤ QUẢN TRỊ (ADMIN)
    # -------------------------------------------------------------
    add_heading_1("4. Đặc tả giao diện & nghiệp vụ quản trị (Admin Portal)")
    add_p("Cổng quản trị được thiết kế theo phong cách Dashboard chuyên nghiệp, tập trung vào năng lực quản lý dữ liệu lớn (Data Management), kiểm tra ràng buộc chặt chẽ và giám sát khảo thí minh bạch.", bold_prefix="Định hướng giao diện: ")

    add_heading_2("4.1. Danh mục màn hình chức năng của Admin")
    tbl_adm_screens = doc.add_table(rows=11, cols=3)
    tbl_adm_screens.rows[0].cells[0].text = "Màn hình"
    tbl_adm_screens.rows[0].cells[1].text = "Route URL"
    tbl_adm_screens.rows[0].cells[2].text = "Thành phần giao diện & Chức năng nghiệp vụ"

    tbl_adm_screens.rows[1].cells[0].text = "Bảng điều khiển trung tâm"
    tbl_adm_screens.rows[1].cells[1].text = "/admin/dashboard"
    tbl_adm_screens.rows[1].cells[2].text = "5 Thẻ chỉ số tổng quan (Users, Departments, Active Questions, Open Exams, Submitted Attempts). Biểu đồ phân bổ phổ điểm và tỷ lệ Đạt/Không đạt. Phím tắt tác vụ nhanh."

    tbl_adm_screens.rows[2].cells[0].text = "Quản lý Người dùng"
    tbl_adm_screens.rows[2].cells[1].text = "/admin/users"
    tbl_adm_screens.rows[2].cells[2].text = "Bảng dữ liệu tìm kiếm, lọc theo phòng ban, lọc trạng thái (Active/Locked), phân trang. Nút Thêm mới, Sửa, Đổi mật khẩu, Khóa/Mở khóa tài khoản ngay lập tức."

    tbl_adm_screens.rows[3].cells[0].text = "Thêm / Sửa Người dùng"
    tbl_adm_screens.rows[3].cells[1].text = "/admin/users/new, :id"
    tbl_adm_screens.rows[3].cells[2].text = "Biểu mẫu: Họ tên, Username, Email, Phòng ban (Select Box), Chức danh, Vai trò (ADMIN/EMPLOYEE), Trạng thái. Ràng buộc trùng lặp Email/Username."

    tbl_adm_screens.rows[4].cells[0].text = "Quản lý Phòng ban"
    tbl_adm_screens.rows[4].cells[1].text = "/admin/departments"
    tbl_adm_screens.rows[4].cells[2].text = "Danh sách mã phòng ban (Code), tên phòng ban (Name), số lượng nhân viên trực thuộc, trạng thái (ACTIVE/INACTIVE). Thao tác thêm mới, đổi tên, đóng/mở phòng ban."

    tbl_adm_screens.rows[5].cells[0].text = "Ngân hàng Câu hỏi"
    tbl_adm_screens.rows[5].cells[1].text = "/admin/questions"
    tbl_adm_screens.rows[5].cells[2].text = "Bảng danh mục câu hỏi: Mã câu hỏi, trích đoạn nội dung, phòng ban chuyên môn, độ khó (Dễ/Vừa/Khó), trạng thái. Bộ lọc đa tiêu chí, nút Thêm câu hỏi và Import Excel."

    tbl_adm_screens.rows[6].cells[0].text = "Tạo / Sửa Câu hỏi"
    tbl_adm_screens.rows[6].cells[1].text = "/admin/questions/new, :id"
    tbl_adm_screens.rows[6].cells[2].text = "Nhập nội dung câu hỏi, chọn phòng ban, chọn độ khó, nhập chính xác 4 phương án A, B, C, D, chọn nút radio chỉ định đáp án đúng và nhập phần giải thích chi tiết."

    tbl_adm_screens.rows[7].cells[0].text = "Import Câu hỏi từ Excel"
    tbl_adm_screens.rows[7].cells[1].text = "/admin/questions/import"
    tbl_adm_screens.rows[7].cells[2].text = "Tải file mẫu Excel (.xlsx), khu vực kéo thả file tải lên, bảng kiểm tra dữ liệu 2 pha (Preview) hiển thị lỗi theo từng dòng/cột. Nút 'Xác nhận nạp dữ liệu' với Transaction."

    tbl_adm_screens.rows[8].cells[0].text = "Thiết kế Kỳ thi"
    tbl_adm_screens.rows[8].cells[1].text = "/admin/exams/new, :id"
    tbl_adm_screens.rows[8].cells[2].text = "Form đa section: Thông tin chung, Thời gian & Thời lượng, Ngưỡng điểm đạt, Bảng phân bổ % theo phòng ban (tính số câu tự động), Cơ chế xáo trộn, Giám sát chuyển tab, Phạm vi thí sinh."

    tbl_adm_screens.rows[9].cells[0].text = "Kết quả & Khảo thí"
    tbl_adm_screens.rows[9].cells[1].text = "/admin/exams/:id/results"
    tbl_adm_screens.rows[9].cells[2].text = "Bảng điểm toàn thể thí sinh: Tên, phòng ban, điểm số, số câu đúng/sai, kết quả Đạt/Hỏng, số lần chuyển tab vi phạm, trạng thái nộp bài. Nút xem chi tiết bài làm."

    tbl_adm_screens.rows[10].cells[0].text = "Thanh tra Bài làm (Snapshot)"
    tbl_adm_screens.rows[10].cells[1].text = "/admin/attempts/:id"
    tbl_adm_screens.rows[10].cells[2].text = "Xem lại 100% đề thi đóng băng: Thứ tự câu, các phương án đã trộn, đáp án thí sinh chọn, đáp án đúng hệ thống, thời điểm trả lời từng câu và Danh sách nhật ký vi phạm chuyển tab."

    format_table_headers(tbl_adm_screens, [Inches(1.6), Inches(1.8), Inches(3.1)])
    format_table_data(tbl_adm_screens, [Inches(1.6), Inches(1.8), Inches(3.1)], [WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT])

    add_heading_2("4.2. Quy trình Import Excel hai pha (Two-Step Excel Ingestion)")
    add_p("Nhằm bảo đảm toàn vẹn ngân hàng dữ liệu câu hỏi, hệ thống áp dụng quy trình kiểm tra nghiêm ngặt trước khi ghi nhận vào cơ sở dữ liệu:", bold_prefix="Quy trình 2 pha: ")
    add_bullet("Admin tải lên file Excel (.xlsx). Hệ thống sử dụng thư viện ExcelJS đọc từng dòng và kiểm tra từng ô dữ liệu theo danh mục quy tắc:", "Pha 1: Thẩm định & Xem trước (Validation Preview) - ")
    add_bullet("Mã câu hỏi không được trùng lặp trong file và trong cơ sở dữ liệu.", "    • Mã câu hỏi: ")
    add_bullet("Mã phòng ban phải tồn tại và đang ở trạng thái ACTIVE trong hệ thống.", "    • Phòng ban: ")
    add_bullet("Nội dung câu hỏi và cả 4 phương án A, B, C, D không được để trống.", "    • Đủ 4 phương án: ")
    add_bullet("Đáp án đúng bắt buộc phải là một trong 4 ký tự 'A', 'B', 'C' hoặc 'D'.", "    • Khóa đáp án: ")
    add_bullet("Độ khó hợp lệ ('EASY', 'MEDIUM', 'HARD').", "    • Độ khó: ")
    add_p("Giao diện trả về bảng tổng hợp xem trước: Số dòng hợp lệ, số dòng lỗi, chi tiết lỗi theo từng số dòng và tên cột. Nút 'Xác nhận Import' chỉ kích hoạt khi dữ liệu đáp ứng yêu cầu.", bold_prefix="Kết quả thẩm định: ")
    add_bullet("Khi Admin bấm nút Xác nhận, toàn bộ dữ liệu hợp lệ được ghi vào PostgreSQL bên trong một Database Transaction (prisma.$transaction). Nếu xảy ra bất kỳ lỗi hệ thống nào, toàn bộ quá trình sẽ Rollback, không để lại dữ liệu rác.", "Pha 2: Thực thi nguyên tử (Atomic Commit) - ")

    # -------------------------------------------------------------
    # 5. ĐỘNG CƠ CHỐNG GIAN LẬN ĐA TẦNG
    # -------------------------------------------------------------
    add_heading_1("5. Động cơ chống gian lận đa tầng (Multi-Layer Anti-Cheating Engine)")
    add_p("Để đảm bảo tính nghiêm minh và công bằng tuyệt đối cho các kỳ thi đánh giá năng lực nội bộ, hệ thống được trang bị kiến trúc chống gian lận 4 tầng liên hoàn:", bold_prefix="Tổng quan giải pháp: ")

    add_heading_2("5.1. Tầng 1: Giám sát rời màn hình & Chuyển tab (Tab-Switch & Blur Detection)")
    add_bullet("Trình duyệt thí sinh lắng nghe liên tục hai sự kiện chuẩn W3C: document.visibilitychange (khi visibilityState chuyển sang hidden) và window.onblur (khi thí sinh bấm chuột ra ngoài cửa sổ thi hoặc mở phần mềm khác như Zalo, Chrome khác, Notepad).", "1. Bắt sự kiện vi phạm: ")
    add_bullet("Mỗi khi phát hiện rời màn hình, frontend gọi ngay API POST /attempts/:id/tab-switch. Backend tự động tăng trường tabSwitchCount và thêm một bản ghi vào bảng tab_switch_logs gồm: attemptId, switchedAt, totalCount, reason.", "2. Ghi nhận nhật ký máy chủ: ")
    add_bullet("Frontend hiển thị hộp thoại cảnh báo nghiêm khắc: 'CẢNH BÁO: Hệ thống ghi nhận bạn vừa rời khỏi màn hình thi! Lần vi phạm: X / Y'.", "3. Cảnh báo thí sinh thời gian thực: ")
    add_bullet("Nếu kỳ thi bật tính năng autoSubmitOnViolate và số lần chuyển tab chạm ngưỡng maxTabSwitches (mặc định 3 lần), hệ thống lập tức chấm dứt bài thi, chuyển trạng thái thành AUTO_SUBMITTED và ghi nhận lý do vi phạm quy chế.", "4. Tự động nộp bài phạt (Auto-Submit): ")

    add_heading_2("5.2. Tầng 2: Trộn đề độc lập & Đóng băng đề thi bất biến (Immutable Snapshot)")
    add_bullet("Mỗi thí sinh khi bắt đầu bài thi sẽ nhận một đề thi hoàn toàn độc lập:", "Cơ chế sinh đề độc lập: ")
    add_bullet("Thuật toán Fisher-Yates xáo trộn ngẫu nhiên thứ tự các câu hỏi trong đề (shuffleQuestions).", "    • Trộn câu hỏi: ")
    add_bullet("Với từng câu hỏi, 4 phương án lựa chọn được xáo trộn vị trí ngẫu nhiên (shuffleOptions). Ký tự đáp án đúng (A, B, C, D) được hệ thống tự động ánh xạ lại tương ứng với vị trí mới.", "    • Trộn đáp án: ")
    add_bullet("Toàn bộ nội dung câu hỏi, danh sách 4 lựa chọn đã trộn và đáp án đúng tại thời điểm đó được ghi vĩnh viễn vào bảng exam_attempt_questions. Khi Admin sửa đổi hoặc xóa câu hỏi trong ngân hàng sau này, lịch sử bài thi và kết quả của thí sinh vẫn được bảo toàn nguyên vẹn 100%.", "    • Đóng băng Snapshot: ")

    add_heading_2("5.3. Tầng 3: Ẩn thông tin đáp án trên đường truyền (Payload Masking)")
    add_p("Trong suốt thời gian thí sinh đang làm bài, API cung cấp đề thi (GET /attempts/:id) thực hiện lọc bỏ triệt để các trường correctOptionKeySnapshot và explanation khỏi cấu trúc JSON trả về. Thí sinh hoàn toàn không thể tìm thấy đáp án đúng bằng cách mở công cụ Network của trình duyệt.", bold_prefix="Bảo mật phía Client: ")

    add_heading_2("5.4. Tầng 4: Kiểm soát thời gian tuyệt đối tại Máy chủ (Server-Side Deadline)")
    add_p("Thời điểm kết thúc bài thi (expiresAt) được lưu tại máy chủ ngay khi thí sinh ấn nút Bắt đầu (startedAt + durationMinutes). Mọi yêu cầu autosave hoặc submit gửi lên sau thời điểm expiresAt (cộng biên độ trễ mạng 10 giây) đều bị máy chủ từ chối tiếp nhận và đánh dấu bài thi hết hạn (EXPIRED).", bold_prefix="Thẩm quyền thời gian: ")

    # -------------------------------------------------------------
    # 6. THUẬT TOÁN PHÂN BỔ CÂU HỎI THEO HẠN NGẠCH (LARGEST REMAINDER)
    # -------------------------------------------------------------
    add_heading_1("6. Thuật toán phân bổ câu hỏi theo hạn ngạch (Largest Remainder Method)")
    add_p("Trong kỳ thi tổng hợp có sự tham gia của nhiều phòng ban chuyên môn, Admin thiết lập tổng số câu hỏi T và tỷ lệ phần trăm phân bổ p_i % cho từng phòng ban i (sao cho tổng các p_i = 100%). Khi nhân T với p_i %, kết quả thường là số thập phân, trong khi số lượng câu hỏi thực tế bắt buộc phải là số nguyên dương và tổng số câu phân bổ phải đúng bằng T.", bold_prefix="Bài toán thực tiễn: ")
    add_p("Hệ thống giải quyết bài toán này bằng Thuật toán Phần dư Lớn nhất (Largest Remainder Method - còn gọi là thuật toán Hamilton / Hare-Niemeyer):", bold_prefix="Giải pháp toán học: ")

    add_bullet("Với mỗi phòng ban i, tính số lượng câu hỏi lý thuyết: q_i = T * (p_i / 100).", "Bước 1 - Tính định mức phân số: ")
    add_bullet("Lấy phần nguyên của q_i làm số lượng câu hỏi cơ sở: b_i = floor(q_i).", "Bước 2 - Phân bổ phần nguyên: ")
    add_bullet("Tính phần thập phân dư thừa: r_i = q_i - b_i.", "Bước 3 - Xác định phần dư: ")
    add_bullet("Tính tổng số câu hỏi còn thiếu để đạt tổng T: R = T - sum(b_i). (Lưu ý: R luôn là số nguyên thỏa mãn 0 <= R < số phòng ban).", "Bước 4 - Tính số câu thiếu hụt: ")
    add_bullet("Sắp xếp danh sách phòng ban theo thứ tự phần dư r_i giảm dần. Lần lượt cộng thêm 1 câu vào b_i cho R phòng ban có phần dư lớn nhất. Nếu có hai phòng ban cùng phần dư, ưu tiên phòng ban có tỷ lệ p_i lớn hơn hoặc mã phòng ban nhỏ hơn.", "Bước 5 - Phân bổ câu ưu tiên: ")
    add_bullet("Hệ thống truy vấn cơ sở dữ liệu kiểm tra số lượng câu hỏi ACTIVE của từng phòng ban. Nếu phòng ban nào không có đủ số câu theo hạn ngạch phân bổ, hệ thống lập tức cảnh báo và chặn không cho Publish kỳ thi.", "Bước 6 - Kiểm tra tính khả dụng: ")

    add_p("Giả sử kỳ thi có T = 50 câu hỏi, phân bổ cho 3 phòng ban: IT (45%), Kế toán (35%), Hành chính (20%):", bold_prefix="Ví dụ minh họa: ", italic=True)
    tbl_lrm = doc.add_table(rows=5, cols=6)
    tbl_lrm.rows[0].cells[0].text = "Phòng ban"
    tbl_lrm.rows[0].cells[1].text = "Tỷ lệ (%)"
    tbl_lrm.rows[0].cells[2].text = "q_i (Lý thuyết)"
    tbl_lrm.rows[0].cells[3].text = "b_i (Nguyên)"
    tbl_lrm.rows[0].cells[4].text = "r_i (Phần dư)"
    tbl_lrm.rows[0].cells[5].text = "Số câu chốt"

    tbl_lrm.rows[1].cells[0].text = "Công nghệ Thông tin (IT)"
    tbl_lrm.rows[1].cells[1].text = "45%"
    tbl_lrm.rows[1].cells[2].text = "22.50"
    tbl_lrm.rows[1].cells[3].text = "22"
    tbl_lrm.rows[1].cells[4].text = "0.50 (Lớn nhất)"
    tbl_lrm.rows[1].cells[5].text = "23 câu (+1)"

    tbl_lrm.rows[2].cells[0].text = "Tài chính Kế toán (ACC)"
    tbl_lrm.rows[2].cells[1].text = "35%"
    tbl_lrm.rows[2].cells[2].text = "17.50"
    tbl_lrm.rows[2].cells[3].text = "17"
    tbl_lrm.rows[2].cells[4].text = "0.50 (Thứ hai)"
    tbl_lrm.rows[2].cells[5].text = "17 câu"

    tbl_lrm.rows[3].cells[0].text = "Hành chính Nhân sự (HR)"
    tbl_lrm.rows[3].cells[1].text = "20%"
    tbl_lrm.rows[3].cells[2].text = "10.00"
    tbl_lrm.rows[3].cells[3].text = "10"
    tbl_lrm.rows[3].cells[4].text = "0.00"
    tbl_lrm.rows[3].cells[5].text = "10 câu"

    tbl_lrm.rows[4].cells[0].text = "TỔNG CỘNG"
    tbl_lrm.rows[4].cells[1].text = "100%"
    tbl_lrm.rows[4].cells[2].text = "50.00"
    tbl_lrm.rows[4].cells[3].text = "49"
    tbl_lrm.rows[4].cells[4].text = "Thiếu R = 1"
    tbl_lrm.rows[4].cells[5].text = "50 câu (Chính xác)"

    format_table_headers(tbl_lrm, [Inches(1.8), Inches(0.8), Inches(1.1), Inches(0.9), Inches(1.2), Inches(1.2)])
    format_table_data(tbl_lrm, [Inches(1.8), Inches(0.8), Inches(1.1), Inches(0.9), Inches(1.2), Inches(1.2)], [WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.CENTER])

    # -------------------------------------------------------------
    # 7. THIẾT KẾ CƠ SỞ DỮ LIỆU CHI TIẾT (DATABASE SCHEMA)
    # -------------------------------------------------------------
    add_heading_1("7. Thiết kế cơ sở dữ liệu chi tiết (Database Schema & Dictionary)")
    add_p("Cơ sở dữ liệu được xây dựng trên hệ quản trị PostgreSQL 17 với ORM Prisma. Toàn bộ cấu trúc bao gồm 12 bảng thực thể chính và 2 bảng phụ trợ liên kết phạm vi thí sinh, bảo đảm tính toàn vẹn tham chiếu và hiệu năng truy vấn cao.", bold_prefix="Cấu trúc dữ liệu: ")

    tbl_db_summary = doc.add_table(rows=15, cols=4)
    tbl_db_summary.rows[0].cells[0].text = "Tên bảng (Table)"
    tbl_db_summary.rows[0].cells[1].text = "Mục đích nghiệp vụ"
    tbl_db_summary.rows[0].cells[2].text = "Khóa chính / Khóa ngoại"
    tbl_db_summary.rows[0].cells[3].text = "Ràng buộc & Chỉ mục nổi bật"

    tables_info = [
        ("users", "Tài khoản nhân viên & quản trị viên, thông tin xác thực", "PK: id | FK: departmentId -> departments", "Unique: username, email. Index: failedLoginCount, lockedUntil"),
        ("departments", "Danh mục phòng ban nội bộ trung tâm", "PK: id", "Unique: code. Check: status (ACTIVE/INACTIVE)"),
        ("sessions", "Quản lý phiên đăng nhập duy nhất (Single Session)", "PK: id | FK: userId -> users", "Unique: tokenHash. Index: userId, revokedAt, expiresAt"),
        ("password_reset_otps", "Mã xác thực OTP gửi qua email để lấy lại mật khẩu", "PK: id", "Index: email. Check: attempts <= 3, expiresAt"),
        ("questions", "Ngân hàng câu hỏi trắc nghiệm theo phòng ban", "PK: id | FK: departmentId -> departments", "Unique: code. Index: departmentId, status, difficulty"),
        ("question_options", "4 Lựa chọn cố định (A, B, C, D) cho từng câu hỏi", "PK: id | FK: questionId -> questions", "Unique: [questionId, key]. Check: isCorrect boolean"),
        ("exams", "Cấu hình toàn diện các kỳ thi trắc nghiệm", "PK: id", "Index: status, openAt, closeAt. Check: passingCorrectAnswers <= totalQuestions"),
        ("exam_department_rules", "Hạn ngạch phân bổ tỷ lệ % và số câu theo phòng ban", "PK: id | FK: examId -> exams, departmentId", "Unique: [examId, departmentId]. Check: percentage > 0"),
        ("exam_attempts", "Lượt làm bài thi của thí sinh, điểm số và kết quả", "PK: id | FK: examId -> exams, userId -> users", "Index: [examId, userId], status. Check: score >= 0"),
        ("exam_attempt_questions", "Snapshot bất biến đề thi của từng thí sinh", "PK: id | FK: attemptId -> exam_attempts", "Unique: [attemptId, position]. JSON: optionsSnapshot"),
        ("tab_switch_logs", "Nhật ký ghi nhận từng lần thí sinh rời màn hình", "PK: id | FK: attemptId -> exam_attempts", "Index: attemptId, switchedAt. Check: totalCount > 0"),
        ("audit_logs", "Nhật ký kiểm toán mọi thao tác quản trị viên", "PK: id | FK: userId -> users", "Index: userId, action, entityId, createdAt"),
        ("exam_assigned_departments", "Liên kết phòng ban được chỉ định thi (Candidate Scope)", "PK: id | FK: examId, departmentId", "Unique: [examId, departmentId]"),
        ("exam_assigned_users", "Liên kết nhân viên cụ thể được chỉ định thi (Candidate Scope)", "PK: id | FK: examId, userId", "Unique: [examId, userId]")
    ]

    for idx, (t_name, t_purpose, t_keys, t_constraints) in enumerate(tables_info):
        row = tbl_db_summary.rows[idx + 1]
        row.cells[0].text = t_name
        row.cells[1].text = t_purpose
        row.cells[2].text = t_keys
        row.cells[3].text = t_constraints

    format_table_headers(tbl_db_summary, [Inches(1.5), Inches(2.0), Inches(1.7), Inches(1.8)])
    format_table_data(tbl_db_summary, [Inches(1.5), Inches(2.0), Inches(1.7), Inches(1.8)], [WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT])

    add_heading_2("7.1. Cấu trúc trường dữ liệu của Bảng Snapshot đề thi (exam_attempt_questions)")
    add_p("Đây là bảng cốt lõi bảo đảm tính toàn vẹn của kết quả khảo thí, lưu trữ trạng thái đề thi bất biến tại thời điểm thí sinh bắt đầu làm bài:", bold_prefix="Đặc tả kỹ thuật bảng Snapshot: ")
    add_bullet("attemptId: Khóa ngoại liên kết phiên thi trong bảng exam_attempts.", "1. Định danh phiên: ")
    add_bullet("position: Thứ tự câu hỏi trong đề thi của thí sinh (1, 2, 3... T).", "2. Vị trí câu hỏi: ")
    add_bullet("questionCodeSnapshot: Lưu trữ mã câu hỏi gốc (phục vụ đối soát).", "3. Mã câu hỏi đóng băng: ")
    add_bullet("contentSnapshot: Nội dung nguyên văn câu hỏi tại thời điểm thi.", "4. Nội dung câu hỏi đóng băng: ")
    add_bullet("optionsSnapshot (JSON): Mảng chứa 4 phương án lựa chọn đã được xáo trộn: [{\"key\": \"A\", \"content\": \"...\"}, {\"key\": \"B\", \"content\": \"...\"}, ...].", "5. Phương án lựa chọn đã xáo trộn: ")
    add_bullet("correctOptionKeySnapshot: Lưu ký tự đáp án đúng sau khi đã ánh xạ lại theo vị trí xáo trộn mới (A, B, C hoặc D).", "6. Khóa đáp án đúng: ")
    add_bullet("selectedOptionKey: Phương án thí sinh lựa chọn và lưu ngầm qua autosave.", "7. Đáp án thí sinh chọn: ")
    add_bullet("answeredAt: Mốc thời gian chính xác ghi nhận câu trả lời.", "8. Thời điểm trả lời: ")

    # -------------------------------------------------------------
    # 8. DANH MỤC & ĐẶC TẢ HỆ THỐNG RESTFUL API
    # -------------------------------------------------------------
    add_heading_1("8. Danh mục & Đặc tả hệ thống RESTful API")
    add_p("Hệ thống cung cấp giao diện lập trình ứng dụng RESTful tiêu chuẩn, sử dụng mã định dạng JSON và bảo vệ qua HTTP Bearer JWT Token:", bold_prefix="Chuẩn hóa API: ")

    tbl_api = doc.add_table(rows=16, cols=4)
    tbl_api.rows[0].cells[0].text = "Phương thức"
    tbl_api.rows[0].cells[1].text = "Endpoint URL"
    tbl_api.rows[0].cells[2].text = "Quyền truy cập"
    tbl_api.rows[0].cells[3].text = "Mô tả chức năng & Dữ liệu trao đổi"

    apis = [
        ("POST", "/api/auth/login", "Public", "Đăng nhập hệ thống, kiểm tra brute-force, tạo session duy nhất, trả về JWT."),
        ("POST", "/api/auth/logout", "Bearer JWT", "Thu hồi phiên làm việc hiện tại trong bảng sessions."),
        ("POST", "/api/auth/forgot-password", "Public", "Gửi mã OTP 6 số vào email để khôi phục mật khẩu."),
        ("POST", "/api/auth/reset-password", "Public", "Xác thực OTP và thiết lập mật khẩu mới."),
        ("GET", "/api/profile/me", "Bearer JWT", "Lấy thông tin tài khoản hiện tại, phòng ban, role và quyền hạn."),
        ("PATCH", "/api/profile/setup", "EMPLOYEE", "Hoàn thiện hồ sơ lần đầu (chọn phòng ban, chức vụ)."),
        ("PATCH", "/api/profile/change-password", "Bearer JWT", "Đổi mật khẩu người dùng đang đăng nhập."),
        ("GET/POST", "/api/admin/users", "ADMIN", "Tra cứu danh sách người dùng (lọc, phân trang) / Thêm mới tài khoản."),
        ("PATCH", "/api/admin/users/:id/status", "ADMIN", "Khóa / Mở khóa tài khoản nhân viên."),
        ("GET/POST", "/api/admin/departments", "ADMIN", "Quản lý danh mục phòng ban (xem, tạo mới, đổi trạng thái)."),
        ("GET/POST", "/api/admin/questions", "ADMIN", "Quản lý ngân hàng câu hỏi theo phòng ban và độ khó."),
        ("POST", "/api/admin/questions/import/preview", "ADMIN", "Pha 1: Thẩm định file Excel và trả về bảng xem trước lỗi theo dòng/cột."),
        ("POST", "/api/admin/questions/import/confirm", "ADMIN", "Pha 2: Ghi nhận câu hỏi vào DB bên trong Database Transaction."),
        ("GET/POST", "/api/admin/exams", "ADMIN", "Quản trị danh sách kỳ thi, thiết kế kỳ thi, phân bổ hạn ngạch phòng ban."),
        ("POST", "/api/exams/:id/start", "EMPLOYEE", "Bắt đầu làm bài: Sinh đề ngẫu nhiên, xáo trộn, tạo snapshot, cấp timer."),
        ("POST", "/api/attempts/:id/answer", "EMPLOYEE", "Autosave đáp án chọn của thí sinh (debounce 500ms phía frontend)."),
        ("POST", "/api/attempts/:id/tab-switch", "EMPLOYEE", "Ghi nhận vi phạm chuyển tab / blur và tự động nộp bài phạt nếu vượt ngưỡng."),
        ("POST", "/api/attempts/:id/submit", "EMPLOYEE", "Xác nhận nộp bài, tự động chấm điểm, đối soát và tính PASS/FAIL."),
        ("GET", "/api/attempts/:id/result", "EMPLOYEE / ADMIN", "Tra cứu bảng điểm, xem lại chi tiết bài thi theo quyền hạn."),
        ("GET", "/api/admin/reports/exam/:id/export", "ADMIN", "Trích xuất báo cáo kết quả kỳ thi ra định dạng file Excel (.xlsx).")
    ]

    # resize table to match apis
    while len(tbl_api.rows) < len(apis) + 1:
        tbl_api.add_row()

    for idx, (method, endpoint, access, desc) in enumerate(apis):
        row = tbl_api.rows[idx + 1]
        row.cells[0].text = method
        row.cells[1].text = endpoint
        row.cells[2].text = access
        row.cells[3].text = desc

    format_table_headers(tbl_api, [Inches(1.0), Inches(2.2), Inches(1.2), Inches(2.6)])
    format_table_data(tbl_api, [Inches(1.0), Inches(2.2), Inches(1.2), Inches(2.6)], [WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.LEFT])

    # -------------------------------------------------------------
    # 9. GIẢI QUYẾT & CHỐT DỨT ĐIỂM CÁC QUYẾT ĐỊNH NGHIỆP VỤ
    # -------------------------------------------------------------
    add_heading_1("9. Giải quyết và chốt dứt điểm các quyết định nghiệp vụ")
    add_p("Trong báo cáo thiết kế trước đây, Mục 9 liệt kê các vấn đề còn mở ở trạng thái 'Chưa chốt'. Đến phiên bản này, toàn bộ 9 vấn đề đã được Ban Dự án phân tích, thống nhất phương án tối ưu và hiện thực hóa 100% trong mã nguồn hệ thống:", bold_prefix="Hiện trạng quyết định: ")

    tbl_decisions = doc.add_table(rows=10, cols=4)
    tbl_decisions.rows[0].cells[0].text = "STT"
    tbl_decisions.rows[0].cells[1].text = "Vấn đề nghiệp vụ"
    tbl_decisions.rows[0].cells[2].text = "Trạng thái"
    tbl_decisions.rows[0].cells[3].text = "Quyết định kỹ thuật & Giải pháp đã thực thi"

    decisions_data = [
        ("1", "Nhân viên có được tự đổi phòng ban sau lần setup đầu?", "ĐÃ CHỐT CHÍNH THỨC",
         "KHÔNG ĐƯỢC TỰ ĐỔI. Thí sinh chỉ được chọn phòng ban một lần duy nhất tại /employee/profile/setup. Sau khi hoàn tất, trường phòng ban chuyển sang trạng thái khóa (Read-only). Mọi yêu cầu thay đổi phòng ban bắt buộc phải do Quản trị viên (Admin) thực hiện trong trang quản lý người dùng."),
        
        ("2", "Tính chất đề thi duy nhất (Unique Exam) là khác bộ câu hay không trùng tuyệt đối?", "ĐÃ CHỐT CHÍNH THỨC",
         "ĐỘC LẬP TỪNG THÍ SINH. Mỗi thí sinh được cấp một đề thi riêng biệt: Hệ thống bốc ngẫu nhiên câu hỏi từ ngân hàng theo hạn ngạch phòng ban, xáo trộn thứ tự câu (Fisher-Yates) và xáo trộn 4 phương án A/B/C/D. Đề thi này được đóng băng vĩnh viễn vào exam_attempt_questions."),
        
        ("3", "Tỷ lệ % câu hỏi phòng ban được phân bổ theo thuật toán nào?", "ĐÃ CHỐT CHÍNH THỨC",
         "ÁP DỤNG THUẬT TOÁN LARGEST REMAINDER. Sử dụng chính thức thuật toán Hamilton / Hare-Niemeyer để phân chia số câu hỏi nguyên vẹn, bảo đảm tổng số câu đúng 100% so với cấu hình totalQuestions của kỳ thi."),
        
        ("4", "Một nhân viên có được thi lại cùng một kỳ thi không?", "ĐÃ CHỐT CHÍNH THỨC",
         "CẤU HÌNH THEO TỪNG KỲ THI (maxAttempts). Mỗi kỳ thi có trường maxAttempts (mặc định = 1). Nếu maxAttempts > 1, thí sinh chỉ được phép bắt đầu lượt thi mới khi lượt thi trước đó đã hoàn tất (SUBMITTED hoặc EXPIRED)."),
        
        ("5", "Khi đóng trình duyệt hoặc rớt mạng có được tiếp tục làm bài (Resume)?", "ĐÃ CHỐT CHÍNH THỨC",
         "ĐƯỢC PHÉP TIẾP TỤC (RESUME). Nếu phiên thi vẫn ở trạng thái IN_PROGRESS và thời gian hiện tại còn nhỏ hơn expiresAt, thí sinh có thể mở lại trình duyệt để làm tiếp. Toàn bộ các câu đã lưu ngầm (autosave) được nạp lại đầy đủ."),
        
        ("6", "Một nhân viên được làm tối đa bao nhiêu lần?", "ĐÃ CHỐT CHÍNH THỨC",
         "GIỚI HẠN BỞI THAM SỐ maxAttempts. Do Quản trị viên thiết lập khi tạo kỳ thi. Hệ thống kiểm tra số lượng attempt của người dùng, nếu số lần thi >= maxAttempts thì chặn nút 'Bắt đầu thi'."),
        
        ("7", "Thang điểm và quy tắc tính điểm chuẩn?", "ĐÃ CHỐT CHÍNH THỨC",
         "THANG ĐIỂM 10, LÀM TRÒN 2 CHỮ SỐ THẬP PHÂN. Điểm số = (Số câu đúng / Tổng số câu) * 10. Đánh giá ĐẠT (PASS) khi Số câu đúng >= passingCorrectAnswers (cấu hình trong kỳ thi), ngược lại là KHÔNG ĐẠT (FAIL)."),
        
        ("8", "Giới hạn số lần chuyển tab có được cấu hình linh hoạt theo kỳ thi?", "ĐÃ CHỐT CHÍNH THỨC",
         "CẤU HÌNH ĐỘC LẬP TRÊN TỪNG KỲ THI. Cho phép cấu hình tabDetectionEnabled (bật/tắt), maxTabSwitches (ngưỡng tối đa, mặc định 3 lần) và autoSubmitOnViolate (tự động nộp bài phạt khi vi phạm chạm ngưỡng)."),
        
        ("9", "Có khóa sửa cấu hình kỳ thi sau khi đã có thí sinh bắt đầu làm bài?", "ĐÃ CHỐT CHÍNH THỨC",
         "KHÓA HOÀN TOÀN CẤU HÌNH CỐT LÕI. Ngay khi có ít nhất 01 attempt được khởi tạo, hệ thống khóa toàn bộ các tham số: thời gian, thời lượng, số câu, tỷ lệ phân bổ và quy tắc xáo trộn nhằm bảo đảm tính công bằng tuyệt đối.")
    ]

    for idx, (stt, issue, status, resolution) in enumerate(decisions_data):
        row = tbl_decisions.rows[idx + 1]
        row.cells[0].text = stt
        row.cells[1].text = issue
        row.cells[2].text = status
        row.cells[3].text = resolution

    format_table_headers(tbl_decisions, [Inches(0.5), Inches(1.8), Inches(1.5), Inches(3.2)])
    format_table_data(tbl_decisions, [Inches(0.5), Inches(1.8), Inches(1.5), Inches(3.2)], [WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.LEFT])
    # color green for status
    for r_idx in range(1, len(tbl_decisions.rows)):
        c_status = tbl_decisions.rows[r_idx].cells[2]
        for p in c_status.paragraphs:
            for r in p.runs:
                r.bold = True
                r.font.color.rgb = RGBColor(0x16, 0x65, 0x34)  # dark green

    # -------------------------------------------------------------
    # 10. QUY TRÌNH NGHIỆP VỤ CỐT LÕI (WORKFLOWS)
    # -------------------------------------------------------------
    add_heading_1("10. Quy trình nghiệp vụ cốt lõi (Core Business Workflows)")
    add_p("Hệ thống hoạt động trên 4 luồng quy trình nghiệp vụ chuẩn hóa, khép kín và tự động hóa cao:", bold_prefix="Chuẩn hóa quy trình: ")

    add_heading_2("10.1. Luồng Xác thực & Kiểm soát phiên làm việc duy nhất")
    add_bullet("Thí sinh nhập tài khoản và mật khẩu tại màn hình /login.", "Bước 1: ")
    add_bullet("Hệ thống kiểm tra số lần đăng nhập sai. Nếu tài khoản đang bị khóa trong 15 phút, từ chối và báo lỗi.", "Bước 2: ")
    add_bullet("Nếu mật khẩu chính xác, máy chủ sinh JWT Token mới và tạo bản ghi session có lưu hash token.", "Bước 3: ")
    add_bullet("Máy chủ thu hồi (revoke) toàn bộ các phiên làm việc trước đó của tài khoản này.", "Bước 4: ")
    add_bullet("Nếu tài khoản ở trạng thái REQUIRE_SETUP, hệ thống điều hướng vào /employee/profile/setup để chọn phòng ban; nếu ACTIVE, điều hướng vào /employee/dashboard.", "Bước 5: ")

    add_heading_2("10.2. Luồng Tổ chức kỳ thi & Sinh đề ngẫu nhiên")
    add_bullet("Admin khởi tạo kỳ thi, thiết lập thời gian mở/đóng, thời lượng, số câu hỏi và tỷ lệ % theo từng phòng ban.", "Bước 1: ")
    add_bullet("Hệ thống tự động chạy thuật toán Largest Remainder để tính số câu phân bổ nguyên vẹn cho từng đơn vị và kiểm tra số lượng câu khả dụng trong ngân hàng.", "Bước 2: ")
    add_bullet("Admin chuyển trạng thái kỳ thi sang PUBLISHED.", "Bước 3: ")
    add_bullet("Khi thí sinh bấm 'Bắt đầu làm bài', máy chủ tạo bản ghi exam_attempts kèm hạn chót tuyệt đối expiresAt.", "Bước 4: ")
    add_bullet("Máy chủ truy vấn ngẫu nhiên các câu hỏi theo hạn ngạch, áp dụng thuật toán Fisher-Yates để trộn thứ tự câu và trộn 4 phương án A/B/C/D, sau đó đóng băng snapshot vào cơ sở dữ liệu.", "Bước 5: ")
    add_bullet("Giao diện phòng thi tải đề thi với dữ liệu đã được ẩn đáp án đúng (Payload Masking).", "Bước 6: ")

    add_heading_2("10.3. Luồng Làm bài, Giám sát gian lận & Autosave")
    add_bullet("Thí sinh chọn phương án trả lời trên giao diện phòng thi.", "Bước 1: ")
    add_bullet("Frontend thực hiện debounce 500ms và gửi API autosave lên máy chủ để cập nhật selectedOptionKey.", "Bước 2: ")
    add_bullet("Nếu thí sinh chuyển tab hoặc rời cửa sổ, frontend gửi API POST /tab-switch. Hệ thống ghi nhật ký và cảnh báo vi phạm.", "Bước 3: ")
    add_bullet("Nếu số lần vi phạm vượt ngưỡng cho phép, hệ thống tự động nộp bài phạt (AUTO_SUBMITTED) và khóa quyền tiếp tục.", "Bước 4: ")

    add_heading_2("10.4. Luồng Nộp bài, Chấm điểm & Báo cáo kết quả")
    add_bullet("Thí sinh bấm nút 'Nộp bài', hộp thoại hiển thị số lượng câu đã làm và câu chưa làm để xác nhận.", "Bước 1: ")
    add_bullet("Máy chủ tiếp nhận lệnh nộp bài, so khớp đáp án thí sinh chọn với correctOptionKeySnapshot trong cơ sở dữ liệu.", "Bước 2: ")
    add_bullet("Tính toán số câu đúng, câu sai, câu bỏ trống, quy đổi điểm sang thang 10 và kết luận PASS hoặc FAIL.", "Bước 3: ")
    add_bullet("Khóa trạng thái bài thi thành SUBMITTED và chuyển hướng thí sinh đến trang kết quả.", "Bước 4: ")

    # -------------------------------------------------------------
    # 11. KẾT LUẬN & ĐÁNH GIÁ TÍNH KHẢ THI
    # -------------------------------------------------------------
    add_heading_1("11. Kết luận và đánh giá tính khả thi triển khai")
    add_p("Báo cáo thiết kế phiên bản 2.0 đã phản ánh toàn diện, chính xác và đồng bộ 100% cấu trúc kiến trúc, cơ sở dữ liệu và mã nguồn thực tế của Hệ thống Thi Trắc Nghiệm Trực Tuyến Nội Bộ. Việc phân tách độc lập hai khu vực giao diện ADMIN và EMPLOYEE, kết hợp với các cơ chế bảo mật cấp doanh nghiệp (Single Active Session, Anti-Cheating đa tầng, Snapshot đề thi bất biến và Thuật toán Largest Remainder) bảo đảm hệ thống vận hành minh bạch, an toàn tuyệt đối và sẵn sàng đưa vào sử dụng thực tế trong trung tâm/doanh nghiệp.", bold_prefix="Đánh giá tổng quan: ")

    # Save to file
    out_path = r"C:\Users\MINHFAT\Desktop\TracNghiemNoiBo\Bao_cao_thiet_ke_phan_mem_he_thong_thi_trac_nghiem.docx"
    doc.save(out_path)
    print(f"Successfully generated comprehensive report at: {out_path}")
    print(f"File size: {os.path.getsize(out_path)} bytes")

if __name__ == "__main__":
    create_full_report()
