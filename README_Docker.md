# Hướng Dẫn Khởi Chạy Dự Án Bằng Docker (Dành Cho Người Mới Clone)

Tài liệu này hướng dẫn chi tiết quy trình từng bước dành cho thành viên mới hoặc người clone code về máy tính cá nhân để khởi chạy toàn bộ hệ thống (Database PostgreSQL, Mailpit, Backend NestJS và Frontend Next.js) bằng **Docker**.

---

## 1. Yêu Cầu Chuẩn Bị (Prerequisites)

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:

- **Git**: [Tải Git](https://git-scm.com/)
- **Node.js**: Phiên bản 18+ hoặc 20+ LTS (khuyên dùng Node 20 hoặc 22) kèm `npm`
- **Docker Desktop**: [Tải Docker Desktop](https://www.docker.com/products/docker-desktop/) (Đảm bảo Docker Desktop đã được mở và hiển thị trạng thái **Engine running**)

---

## 2. Quy Trình Khởi Chạy 5 Bước

```mermaid
flowchart TD
    A["1. git clone & cd TracNghiemNoiBo"] --> B["2. Copy file .env (.env.example)"]
    B --> C["3. docker compose up -d (Postgres & Mailpit)"]
    C --> D["4. Backend: npm i, prisma push & seed, start:dev"]
    D --> E["5. Frontend: npm i, run dev"]
    E --> F["🚀 Hoàn tất: Truy cập http://localhost:3000"]
```

---

## 3. Hướng Dẫn Chi Tiết Từng Bước

### Bước 1: Clone dự án về máy

Mở Terminal (hoặc Git Bash / PowerShell) và chạy lệnh:

```bash
git clone https://github.com/thomasphatpham/tracnghiemnoibo.git
cd tracnghiemnoibo
```

---

### Bước 2: Tạo file cấu hình môi trường (`.env`)

Dự án đã chuẩn bị sẵn file cấu hình mẫu `.env.example` với các thông số mặc định khớp hoàn toàn với cấu hình Docker. Bạn chỉ cần sao chép sang file `.env`:

#### Dành cho Windows (PowerShell):
```powershell
Copy-Item .env.example .env
Copy-Item backend\.env.example backend\.env
```

#### Dành cho Linux / macOS (Bash / Zsh):
```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

> **Ghi chú**: Chuỗi kết nối Database mặc định trong `.env.example` đã được cấu hình sẵn cho Docker:
> `DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/trac_nghiem?schema=public"`

---

### Bước 3: Khởi động Database & Mailpit bằng Docker

Tại thư mục gốc của dự án (`tracnghiemnoibo`), chạy lệnh:

```bash
docker compose up -d
```

Lệnh trên sẽ tải và kích hoạt 2 containers chạy ngầm:
1. **trac-nghiem-postgres**: PostgreSQL 16 (Cổng `5432`)
2. **trac-nghiem-mailpit**: Giả lập máy chủ gửi mail SMTP (Cổng SMTP `1025`, Web UI `8025`)

Kiểm tra trạng thái container:
```bash
docker compose ps
```
Nếu thấy cả 2 containers đều ở trạng thái `Up` (hoặc `running`) là thành công.

---

### Bước 4: Cài đặt và thiết lập Backend (NestJS + Prisma)

Mở **Terminal thứ nhất** và thực hiện tuần tự:

```bash
# 1. Chuyển vào thư mục backend
cd backend

# 2. Cài đặt các thư viện phụ thuộc
npm install

# 3. Tạo Prisma Client từ schema
npm run prisma:generate

# 4. Tự động đẩy cấu trúc bảng vào PostgreSQL (không cần migration thủ công)
npm run prisma:push

# 5. Khởi tạo dữ liệu mẫu (Phòng ban, tài khoản Admin, Thí sinh, Ngân hàng câu hỏi)
npm run prisma:seed

# 6. Khởi động Backend server ở chế độ dev
npm run start:dev
```

Khi Terminal hiển thị dòng thông báo sau, Backend đã sẵn sàng nhận kết nối:
```
[NestApplication] Nest application successfully started +XXms
```
- API Base URL: `http://localhost:4000/api`

---

### Bước 5: Cài đặt và khởi chạy Frontend (Next.js)

Mở **Terminal thứ hai** (tại thư mục gốc của dự án) và thực hiện:

```bash
# 1. Chuyển vào thư mục frontend
cd frontend

# 2. Cài đặt các thư viện phụ thuộc
npm install

# 3. Khởi động máy chủ Next.js ở chế độ dev
npm run dev
```

Khi Terminal hiển thị:
```
- Ready in Xms
- Local: http://localhost:3000
```
Bạn đã có thể mở trình duyệt và truy cập hệ thống tại: **`http://localhost:3000`**

---

## 4. Danh Sách Đường Dẫn & Cổng Dịch Vụ

| Dịch vụ | Đường dẫn truy cập | Cổng (Port) | Mô tả |
| :--- | :--- | :--- | :--- |
| **Frontend Portal** | `http://localhost:3000` | `3000` | Giao diện đăng nhập, làm bài thi của thí sinh và trang quản trị Admin |
| **Backend API** | `http://localhost:4000/api` | `4000` | REST API (NestJS) |
| **Mailpit Web UI** | `http://localhost:8025` | `8025` | Hộp thư kiểm thử (xem các email gửi mã OTP, cấp lại mật khẩu mà không cần gửi mail thật) |
| **PostgreSQL Database** | `localhost:5432` | `5432` | Cơ sở dữ liệu PostgreSQL |

---

## 5. Tài Khoản Mặc Định Để Đăng Nhập Kiểm Thử

Sau khi chạy lệnh `npm run prisma:seed`, hệ thống đã có sẵn các tài khoản sau:

| Vai trò (Role) | Tên đăng nhập | Mật khẩu mặc định | Quyền hạn và phạm vi sử dụng |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin` | `Admin@123456` | Quản lý ngân hàng câu hỏi, tạo ca thi/kỳ thi, quản lý phòng ban, quản lý thí sinh, xem báo cáo thống kê, xuất kết quả Excel |
| **Nhân viên / Thí sinh** | `nhanvien1` | `User@123456` | Đăng nhập giao diện thí sinh, tham gia làm bài thi trắc nghiệm, xem lịch sử thi cá nhân |

---

## 6. Các Lệnh Tiện Ích Thường Dùng

### Quản lý Docker Containers:
- **Tạm dừng các containers**:
  ```bash
  docker compose stop
  ```
- **Bật lại containers đã dừng**:
  ```bash
  docker compose start
  ```
- **Tắt và dỡ bỏ containers (giữ nguyên dữ liệu database)**:
  ```bash
  docker compose down
  ```
- **Tắt và xoá sạch toàn bộ dữ liệu database để khởi tạo lại từ đầu**:
  ```bash
  docker compose down -v
  ```

### Quản lý Database & Prisma:
- **Mở giao diện quản trị cơ sở dữ liệu trực quan (Prisma Studio)**:
  ```bash
  cd backend
  npm run prisma:studio
  ```
  Sau đó mở trình duyệt truy cập: `http://localhost:5555` để xem và chỉnh sửa dữ liệu các bảng.
- **Nạp lại dữ liệu mẫu**:
  ```bash
  cd backend
  npm run prisma:seed
  ```

---

## 7. Xử Lý Sự Cố Thường Gặp (Troubleshooting)

### 1. Lỗi cổng `5432` đã bị chiếm dụng (`bind: address already in use`)
- **Nguyên nhân**: Máy tính của bạn đã cài sẵn dịch vụ PostgreSQL cục bộ đang chạy nền chiếm cổng 5432.
- **Cách khắc phục**:
  - *Cách 1*: Tắt service PostgreSQL cục bộ trên Windows (`services.msc` -> tìm `postgresql-x64-xx` -> bấm **Stop**).
  - *Cách 2*: Đổi cổng PostgreSQL trong file `docker-compose.yml` sang cổng khác (ví dụ `"5434:5432"`), sau đó sửa lại `DATABASE_URL` trong `.env` thành `localhost:5434`.

### 2. Lỗi `docker daemon is not running`
- **Nguyên nhân**: Phần mềm Docker Desktop chưa được bật.
- **Cách khắc phục**: Mở ứng dụng **Docker Desktop** trên máy và chờ 1-2 phút cho đến khi biểu tượng góc trái phía dưới chuyển sang màu xanh lá cây (**Engine running**).

### 3. Lỗi kết nối Database khi chạy `npm run prisma:push`
- **Nguyên nhân**: Container PostgreSQL chưa sẵn sàng hoặc sai thông tin trong `.env`.
- **Cách khắc phục**:
  - Kiểm tra xem container đã chạy chưa bằng lệnh: `docker compose ps`
  - Đảm bảo trong thư mục `backend/` có file `.env` chứa chuỗi `DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/trac_nghiem?schema=public"`
