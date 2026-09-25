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

## 3. Cài Đặt & Khởi Chạy Nhanh

### Bước 1: Khởi động Database & Mailpit (SMTP)
**Cách A - Dùng Docker Compose:**
```bash
docker compose up -d
```
Cơ sở dữ liệu PostgreSQL sẽ chạy tại cổng `5432` và Webmail Mailpit tại `http://localhost:8025`.

**Cách B - Dùng PostgreSQL cục bộ (Port 5433):**
Cập nhật file `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/trac_nghiem?schema=public"
```

### Bước 2: Cài đặt và Chạy Backend (NestJS)
```bash
cd backend

# 1. Cài đặt thư viện
npm install

# 2. Sinh Prisma Client & Đồng bộ Database Schema
npm run prisma:generate
npm run prisma:push

# 3. Nạp dữ liệu mẫu ban đầu (Admin, Employee, Phòng ban, Câu hỏi)
npm run prisma:seed

# 4. Chạy Backend ở chế độ Development
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
