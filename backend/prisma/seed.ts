import { PrismaClient, Role, UserStatus, QuestionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Departments
  const departmentsData = [
    { code: 'TECH', name: 'Phòng Công Nghệ Thông Tin' },
    { code: 'SALES', name: 'Phòng Kinh Doanh & Tiếp Thị' },
    { code: 'HR', name: 'Phòng Nhân Sự & Đào Tạo' },
    { code: 'FIN', name: 'Phòng Tài Chính Kế Toán' },
  ];

  const departmentMap = new Map<string, string>();

  for (const dep of departmentsData) {
    const d = await prisma.department.upsert({
      where: { code: dep.code },
      update: { name: dep.name },
      create: { code: dep.code, name: dep.name },
    });
    departmentMap.set(dep.code, d.id);
    console.log(`  - Department ready: [${dep.code}] ${dep.name}`);
  }

  // 2. Seed Admin User
  const adminPasswordHash = await bcrypt.hash('Admin@123456', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      departmentId: departmentMap.get('TECH'),
    },
    create: {
      username: 'admin',
      email: 'admin@company.local',
      passwordHash: adminPasswordHash,
      fullName: 'Quản Trị Viên Hệ Thống',
      position: 'IT Administrator',
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      departmentId: departmentMap.get('TECH'),
    },
  });
  console.log(`  - Admin user ready: ${admin.username} (password: Admin@123456)`);

  // 3. Seed Employee User
  const empPasswordHash = await bcrypt.hash('User@123456', 10);
  const emp = await prisma.user.upsert({
    where: { username: 'nhanvien1' },
    update: {
      passwordHash: empPasswordHash,
      role: Role.EMPLOYEE,
      status: UserStatus.ACTIVE,
      departmentId: departmentMap.get('TECH'),
    },
    create: {
      username: 'nhanvien1',
      email: 'nhanvien1@company.local',
      passwordHash: empPasswordHash,
      fullName: 'Nguyễn Văn Nhân Viên',
      position: 'Kỹ sư phần mềm',
      role: Role.EMPLOYEE,
      status: UserStatus.ACTIVE,
      departmentId: departmentMap.get('TECH'),
    },
  });
  console.log(`  - Employee user ready: ${emp.username} (password: User@123456)`);

  // 4. Seed Questions
  const sampleQuestions = [
    // TECH Questions
    {
      code: 'TECH-001',
      departmentCode: 'TECH',
      content: 'Trong giao thức HTTP, mã trạng thái nào sau đây biểu thị yêu cầu thành công (Success)?',
      explanation: 'Mã 200 OK là chuẩn phản hồi thành công trong HTTP.',
      options: [
        { key: 'A', content: '200 OK', isCorrect: true },
        { key: 'B', content: '404 Not Found', isCorrect: false },
        { key: 'C', content: '500 Internal Server Error', isCorrect: false },
        { key: 'D', content: '301 Moved Permanently', isCorrect: false },
      ],
    },
    {
      code: 'TECH-002',
      departmentCode: 'TECH',
      content: 'NestJS sử dụng design pattern nào để quản lý các phụ thuộc giữa các class?',
      explanation: 'NestJS sử dụng Dependency Injection (DI) làm trọng tâm.',
      options: [
        { key: 'A', content: 'Dependency Injection', isCorrect: true },
        { key: 'B', content: 'Factory Pattern thuần', isCorrect: false },
        { key: 'C', content: 'Prototype Pattern', isCorrect: false },
        { key: 'D', content: 'Singleton Pattern không có DI', isCorrect: false },
      ],
    },
    {
      code: 'TECH-003',
      departmentCode: 'TECH',
      content: 'Trong PostgreSQL, câu lệnh nào được dùng để tạo một chỉ mục tối ưu tìm kiếm?',
      explanation: 'CREATE INDEX dùng để tạo index.',
      options: [
        { key: 'A', content: 'CREATE INDEX', isCorrect: true },
        { key: 'B', content: 'ADD KEY', isCorrect: false },
        { key: 'C', content: 'MAKE INDEX', isCorrect: false },
        { key: 'D', content: 'BUILD SEARCH', isCorrect: false },
      ],
    },
    // SALES Questions
    {
      code: 'SALES-001',
      departmentCode: 'SALES',
      content: 'Mô hình AIDA trong tiếp thị và bán hàng là viết tắt của chuỗi quy trình nào?',
      explanation: 'AIDA: Attention - Interest - Desire - Action.',
      options: [
        { key: 'A', content: 'Attention - Interest - Desire - Action', isCorrect: true },
        { key: 'B', content: 'Action - Interest - Demand - Awareness', isCorrect: false },
        { key: 'C', content: 'Attention - Insight - Decision - Action', isCorrect: false },
        { key: 'D', content: 'Attraction - Information - Desire - Agreement', isCorrect: false },
      ],
    },
    {
      code: 'SALES-002',
      departmentCode: 'SALES',
      content: 'Chỉ số KPI "Conversion Rate" trong bán hàng phản ánh điều gì?',
      explanation: 'Tỷ lệ chuyển đổi khách hàng tiềm năng thành người mua hàng.',
      options: [
        { key: 'A', content: 'Tỷ lệ khách hàng tiềm năng chuyển thành người mua', isCorrect: true },
        { key: 'B', content: 'Tổng số tiền bán được trong tháng', isCorrect: false },
        { key: 'C', content: 'Tỷ lệ đơn hàng bị hoàn trả', isCorrect: false },
        { key: 'D', content: 'Số lượng cuộc gọi tiếp cận khách', isCorrect: false },
      ],
    },
    // HR Questions
    {
      code: 'HR-001',
      departmentCode: 'HR',
      content: 'Thời gian thử việc tối đa đối với vị trí công việc có chức danh nghề nghiệp cần trình độ chuyên môn từ đại học trở lên theo Bộ luật Lao động Việt Nam là bao lâu?',
      explanation: 'Theo BLLĐ, không quá 60 ngày đối với công việc có chức danh nghề nghiệp cần trình độ chuyên môn, kỹ thuật từ cao đẳng trở lên.',
      options: [
        { key: 'A', content: '60 ngày', isCorrect: true },
        { key: 'B', content: '30 ngày', isCorrect: false },
        { key: 'C', content: '90 ngày', isCorrect: false },
        { key: 'D', content: '180 ngày', isCorrect: false },
      ],
    },
    {
      code: 'HR-002',
      departmentCode: 'HR',
      content: 'Quy trình Onboarding cho nhân sự mới nhằm mục đích chính là gì?',
      explanation: 'Onboarding giúp nhân sự hội nhập nhanh chóng với văn hóa và công việc của công ty.',
      options: [
        { key: 'A', content: 'Giúp nhân viên mới hòa nhập văn hóa và nắm bắt công việc nhanh chóng', isCorrect: true },
        { key: 'B', content: 'Thanh lý hợp đồng lao động', isCorrect: false },
        { key: 'C', content: 'Kiểm tra sức khỏe định kỳ', isCorrect: false },
        { key: 'D', content: 'Phát thưởng cuối năm', isCorrect: false },
      ],
    },
  ];

  for (const q of sampleQuestions) {
    const depId = departmentMap.get(q.departmentCode);
    if (!depId) continue;

    const question = await prisma.question.upsert({
      where: { code: q.code },
      update: {
        content: q.content,
        departmentId: depId,
        explanation: q.explanation,
        status: QuestionStatus.ACTIVE,
      },
      create: {
        code: q.code,
        content: q.content,
        departmentId: depId,
        explanation: q.explanation,
        status: QuestionStatus.ACTIVE,
      },
    });

    // Options
    for (const opt of q.options) {
      await prisma.questionOption.upsert({
        where: {
          questionId_key: {
            questionId: question.id,
            key: opt.key,
          },
        },
        update: {
          content: opt.content,
          isCorrect: opt.isCorrect,
        },
        create: {
          questionId: question.id,
          key: opt.key,
          content: opt.content,
          isCorrect: opt.isCorrect,
        },
      });
    }
    console.log(`  - Question ready: [${q.code}]`);
  }

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
