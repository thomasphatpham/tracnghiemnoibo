# Hệ Thống Thi Trắc Nghiệm Trực Tuyến Nội Bộ (SDTC)

Hệ thống thi trắc nghiệm trực tuyến dành cho doanh nghiệp nội bộ với 3 phân hệ độc lập:
1. **Admin Portal**: Quản trị toàn hệ thống, phòng ban, phân quyền người dùng, ngân hàng câu hỏi tổng, kỳ thi công ty.
2. **Manager Portal**: Quản trị chuyên môn theo từng phòng ban, ngân hàng câu hỏi đơn vị, kỳ thi nội bộ phòng, thống kê nhân sự đơn vị.
3. **Employee Portal**: Dành cho nhân viên làm bài thi, khảo sát trắc nghiệm và tra cứu kết quả cá nhân.

---

## 1. Yêu Cầu Môi Trường (Prerequisites)
- **Node.js**: >= 20 (khuyến nghị v20.x hoặc v22.x)
- **npm** (đi kèm Node.js) hoặc **pnpm** / **yarn**
- **PostgreSQL**: 16+ (hoặc chạy trực tiếp qua Docker Compose)
- **Docker & Docker Compose** (tùy chọn nhưng khuyến nghị để dựng nhanh DB)

---

## 2. Cấu Trúc Thư Mục Dự Án
```text
TracNghiemNoiBo/
├── docker-compose.yml          # Container PostgreSQL 16 & Mailpit SMTP
├── backend/                    # NestJS API, Prisma ORM
│   ├── prisma/
│   │   ├── schema.prisma       # Mô hình dữ liệu & phân quyền
│   │   └── seed.ts             # Dữ liệu khởi tạo (Admin, Manager, Nhân viên, Đề thi, Câu hỏi)
│   ├── .env.example            # Mẫu biến môi trường Backend
│   └── src/
└── frontend/                   # Next.js 15 App Router, Tailwind CSS, Ant Design
    ├── .env.example            # Mẫu biến môi trường Frontend
    └── src/app/
```

---

## 3. Hướng Dẫn Cài Đặt & Khởi Chạy Từ Đầu (Khi vừa Clone về)

### Bước 1: Khởi động Database PostgreSQL

**Cách 1: Dùng Docker Compose (Nhanh nhất & Tự động hoàn toàn):**
Tại thư mục gốc dự án:
```bash
docker compose up -d
```
> Lệnh này sẽ tự động chạy:
> - **PostgreSQL 16**: Cổng `5432`, user: `postgres`, password: `postgrespassword`, database: `trac_nghiem`.
> - **Mailpit (Mock Email)**: Cổng SMTP `1025`, giao diện xem email gửi đi tại `http://localhost:8025`.

**Cách 2: Dùng PostgreSQL cài sẵn trên máy:**
Tạo cơ sở dữ liệu mới trong PostgreSQL:
```sql
CREATE DATABASE trac_nghiem;
```

---

### Bước 2: Cài Đặt & Khởi Tạo Dữ Liệu Backend (NestJS)

```bash
cd backend

# 1. Tạo file cấu hình môi trường từ mẫu
cp .env.example .env

# (Nếu dùng Windows PowerShell, gõ: Copy-Item .env.example .env)
```

> **Lưu ý:** Nếu bạn không dùng Docker mà dùng PostgreSQL riêng, hãy mở file `backend/.env` chỉnh lại `DATABASE_URL` cho đúng user/mật khẩu của bạn.

Tiếp tục chạy các lệnh:
```bash
# 2. Cài đặt các thư viện
npm install

# 3. Đồng bộ mô hình dữ liệu (Tạo tables trong PostgreSQL)
npx prisma db push

# 4. Nạp sẵn dữ liệu mẫu (Tài khoản mẫu, phòng ban, phân quyền, câu hỏi)
npx prisma db seed

# 5. Khởi động Backend server (chế độ phát triển)
npm run start:dev
```
Backend API sẽ lắng nghe tại: **`http://localhost:4000/api`**

---

### Bước 3: Cài Đặt & Chạy Giao Diện Frontend (Next.js)

Mở một cửa sổ Terminal mới:
```bash
cd frontend

# 1. Tạo file cấu hình môi trường Frontend từ mẫu
cp .env.example .env.local

# (Nếu dùng Windows PowerShell, gõ: Copy-Item .env.example .env.local)

# 2. Cài đặt thư viện giao diện
npm install

# 3. Khởi chạy Frontend server
npm run dev
```
Giao diện ứng dụng sẽ chạy tại: **`http://localhost:3000`**

---

## 4. Tài Khoản Đăng Nhập Mẫu (Sau khi chạy Seed)

Sau khi chạy lệnh `npx prisma db seed`, hệ thống đã có sẵn 3 phân quyền:

| Phân hệ / Vai trò | Tài khoản | Mật khẩu | Đơn vị trực thuộc / Ghi chú |
| :--- | :--- | :--- | :--- |
| **Quản Trị Viên (ADMIN)** | `admin` | `Admin@123456` | Toàn quyền quản trị hệ thống |
| **Quản Lý Phòng (DEPT_MANAGER)** | `truongphong1` | `User@123456` | Trưởng Ban Kỹ thuật Tin học (CNTT) |
| **Quản Lý Phòng (DEPT_MANAGER)** | `truongphong2` | `User@123456` | Trưởng Phòng Kế toán Tổng hợp |
| **Thí sinh / Nhân viên (EMPLOYEE)** | `nhanvien1` | `User@123456` | Ban Kỹ thuật Tin học (CNTT) |
| **Thí sinh / Nhân viên (EMPLOYEE)** | `nhanvien2` | `User@123456` | Phòng Kế toán Tổng hợp |

---

## 5. Các Lệnh Hữu Ích Khác

```bash
# Xem giao diện trực quan Database bằng Prisma Studio (tại thư mục backend):
npx prisma studio

# Chạy toàn bộ bộ test kiểm thử tự động (tại thư mục backend):
npm test

# Build kiểm tra sản phẩm trước khi deploy (Production Build):
cd backend && npm run build
cd ../frontend && npm run build
```
