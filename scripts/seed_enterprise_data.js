/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-029: Viết script tự động nạp dữ liệu mẫu seed data doanh nghiệp công nghệ (FPT, VNG, Shopee, Viettel)
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA)
 */
const bcrypt = require('bcryptjs');
const { sequelize, User, Client, Job, Candidate, Placement, Invoice, Payment, AuditLog } = require('../models');

async function seedEnterpriseData() {
  console.log('====================================================');
  console.log(' TASK-029: TỰ ĐỘNG NẠP DỮ LIỆU DOANH NGHIỆP CÔNG NGHỆ ');
  console.log(' Đối tác B2B: FPT Software, VNG, Shopee, Viettel   ');
  console.log('====================================================');

  try {
    await sequelize.sync({ force: true });
    console.log('[Seed] Đồng bộ bảng CSDL thành công.');

    const hashPassword = await bcrypt.hash('123456', 10);

    // 1. Tạo Users quản trị & chuyên viên
    await User.bulkCreate([
      { username: 'admin', email: 'admin@goddy.vn', password: hashPassword, fullName: 'Huỳnh Nguyễn Vĩnh Phúc (Admin)', role: 'admin' },
      { username: 'ketoan', email: 'ketoan@goddy.vn', password: hashPassword, fullName: 'Phạm Sơn (Kế toán trưởng)', role: 'accountant' },
      { username: 'recruiter', email: 'recruiter@goddy.vn', password: hashPassword, fullName: 'Nguyễn Văn Minh (Recruiter Lead)', role: 'recruiter' }
    ]);
    console.log('  [PASS] 1. Khởi tạo 3 tài khoản Users phân quyền RBAC thành công.');

    // 2. Nạp Doanh nghiệp công nghệ đối tác B2B
    const clients = await Client.bulkCreate([
      {
        companyName: 'Công ty Cổ phần FPT Software',
        taxCode: '0101778163',
        address: 'Khu Công nghệ cao Hòa Lạc, Hà Nội',
        contactPerson: 'Trần Thu Hà',
        contactEmail: 'hr@fpt.com',
        contactPhone: '0901234567',
        paymentTermDays: 30,
        creditLimit: 150000000.00,
        status: 'Active'
      },
      {
        companyName: 'Công ty Cổ phần VNG Corporation',
        taxCode: '0303885514',
        address: 'VNG Campus, Quận 7, TP. Hồ Chí Minh',
        contactPerson: 'Nguyễn Hoàng Long',
        contactEmail: 'talent@vng.com.vn',
        contactPhone: '0988776655',
        paymentTermDays: 30,
        creditLimit: 200000000.00,
        status: 'Active'
      },
      {
        companyName: 'Công ty TNHH Shopee Việt Nam',
        taxCode: '0313365853',
        address: 'Tòa nhà Saigon Centre, Quận 1, TP. Hồ Chí Minh',
        contactPerson: 'Lê Mai Anh',
        contactEmail: 'recruitment@shopee.vn',
        contactPhone: '0912345678',
        paymentTermDays: 45,
        creditLimit: 300000000.00,
        status: 'Active'
      },
      {
        companyName: 'Tập đoàn Công nghiệp - Viễn thông Quân đội Viettel',
        taxCode: '0100109106',
        address: 'Số 1 Trần Hữu Dực, Nam Từ Liêm, Hà Nội',
        contactPerson: 'Vũ Quốc Cường',
        contactEmail: 'tuyendung@viettel.com.vn',
        contactPhone: '0978999888',
        paymentTermDays: 60,
        creditLimit: 500000000.00,
        status: 'Active'
      }
    ]);
    console.log(`  [PASS] 2. Nạp thành công ${clients.length} doanh nghiệp đối tác lớn (FPT, VNG, Shopee, Viettel).`);

    console.log('====================================================');
    console.log('>>> TASK-029: NẠP SEED DATA ENTERPRISE THÀNH CÔNG! <<<');
    console.log('====================================================');
    return true;
  } catch (err) {
    console.error('Lỗi nạp seed data:', err);
    return false;
  }
}

if (require.main === module) {
  seedEnterpriseData();
}

module.exports = { seedEnterpriseData };
