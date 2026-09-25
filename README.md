# Hệ Thống Thi Trắc Nghiệm Trực Tuyến Nội Bộ

Hệ thống thi trắc nghiệm trực tuyến dành cho doanh nghiệp nội bộ với hai phân hệ độc lập: **Employee Portal** và **Admin Portal**.

## 1. Yêu Cầu Môi Trường (Prerequisites)
- **Node.js**: >= 20 (khuyến nghị v22+)
- **npm** / **pnpm**
- **PostgreSQL**: 16+ hoặc chạy qua Docker
- **Docker & Docker Compose** (tùy chọn khi chạy container)

## 2. Cấu Trúc Thư Mục
```
TracNghiemNoiBo/
├── docker-compose.yml          # Container PostgreSQL 16 & Mailpit SMTP
├── .env.example                # Mẫu biến môi trường
├── .env                        # File cấu hình môi trường chạy
├── backend/                    # NestJS API, Prisma ORM
│   ├── prisma/
│   │   ├── schema.prisma       # 11 models dữ liệu & snapshot bất biến
│   │   └── seed.ts             # Dữ liệu khởi tạo (Admin, Employee, câu hỏi mẫu)
│   └── src/
└── frontend/                   # Next.js 15 App Router, Tailwind CSS
    └── src/app/
```

## 3. Cài Đặt & Khởi Chạy Nhanh Cho Người Mới Clone

> 💡 **Hướng dẫn chạy bằng Docker:** Xem chi tiết hướng dẫn đầy đủ từng bước từ lúc clone đến khi khởi chạy hoàn tất tại [README_Docker.md](README_Docker.md).


### Bước 1: Chuẩn bị file môi trường (.env)
Copy file mẫu cấu hình môi trường:
```bash
# Tại thư mục gốc:
cp .env.example .env

# Hoặc tại thư mục backend:
cp backend/.env.example backend/.env
```
> **Lưu ý:** Mở file `.env` kiểm tra lại chuỗi `DATABASE_URL` xem đúng thông tin User / Mật khẩu / Cổng PostgreSQL của bạn hay chưa (Mặc định: `postgresql://postgres:postgres@localhost:5432/trac_nghiem?schema=public`).

---

### Bước 2: Khởi động Database (Chọn 1 trong 2 cách)

**Cách A - Dùng Docker Compose (Nhanh nhất & Tự động):**
```bash
docker compose up -d
```
Hệ thống sẽ tự dựng PostgreSQL 16 (port 5432, user `postgres`, pass `postgrespassword`, db `trac_nghiem`) và Mailpit Webmail (`http://localhost:8025`).

**Cách B - Dùng PostgreSQL cài sẵn trên máy (Cổng 5432 hoặc 5433):**
Mở pgAdmin / Navicat / psql tạo 1 cơ sở dữ liệu mới tên là:
```sql
CREATE DATABASE trac_nghiem;
```
Sau đó đảm bảo `DATABASE_URL` trong file `.env` trỏ đúng vào database vừa tạo.

---

### Bước 3: Cài đặt và Khởi tạo Database tự động (Backend)
```bash
cd backend

# 1. Cài đặt các thư viện phụ thuộc
npm install

# 2. Sinh Prisma Client từ schema
npm run prisma:generate

# 3. Tự động tạo toàn bộ cấu trúc bảng (Tables) trong PostgreSQL
npm run prisma:push

# 4. Nạp sẵn dữ liệu mẫu (Phòng ban, Tài khoản Admin, Nhân viên, Câu hỏi mẫu)
npm run prisma:seed

# 5. Chạy Backend
npm run start:dev
```
Backend API sẽ hoạt động tại: `http://localhost:4000/api`

### Bước 3: Cài đặt và Chạy Frontend (Next.js)
```bash
cd ../frontend

# 1. Cài đặt thư viện
npm install

# 2. Chạy Frontend
npm run dev
```
Giao diện người dùng sẽ chạy tại: `http://localhost:3000`

## 4. Tài Khoản Đăng Nhập Mẫu
Sau khi chạy lệnh `prisma:seed`:
- **Tài khoản Quản Trị Viên (Admin Portal)**:
  - Tài khoản / Email: `admin` hoặc `admin@company.local`
  - Mật khẩu: `Admin@123456`
- **Tài khoản Nhân Viên (Employee Portal)**:
  - Tài khoản / Email: `nhanvien1` hoặc `nhanvien1@company.local`
  - Mật khẩu: `User@123456`

## 5. Build Kiểm Tra Sản Phẩm (Production Build)
```bash
# Build Backend
cd backend
npm run build

# Build Frontend
cd ../frontend
npm run build
```
