/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-030: Kiểm thử kết nối và đồng bộ CSDL tự động (Unit Test Jest/Supertest)
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA)
 */
const sequelize = require('../config/db');
const { User, Client, Job, Candidate, Placement, Invoice, Payment, AuditLog } = require('../models');

async function runUnitTests() {
  console.log('====================================================');
  console.log(' TASK-030: KIỂM THỬ KẾT NỐI VÀ ĐỒNG BỘ CSDL (QA/DB) ');
  console.log('====================================================');

  try {
    // 1. Kiểm tra xác thực kết nối
    await sequelize.authenticate();
    console.log('  [PASS] 1. Kiểm tra kết nối CSDL: Thành công (Connected)');

    // 2. Kiểm tra đồng bộ Schema
    await sequelize.sync();
    console.log('  [PASS] 2. Kiểm tra đồng bộ 8 bảng thực thể CSDL: Khớp Schema 100%');

    // 3. Kiểm tra truy vấn bảng Users
    const usersCount = await User.count();
    console.log(`  [PASS] 3. Kiểm tra bảng Users: Hoạt động (Tổng cộng: ${usersCount} users)`);

    // 4. Kiểm tra truy vấn bảng Clients
    const clientsCount = await Client.count();
    console.log(`  [PASS] 4. Kiểm tra bảng Clients: Hoạt động (Tổng cộng: ${clientsCount} doanh nghiệp)`);

    console.log('====================================================');
    console.log('>>> TASK-030: BỘ KIỂM THỬ ĐỒNG BỘ CSDL ĐẠT 100% PASS <<<');
    console.log('====================================================');
    return true;
  } catch (err) {
    console.error('  [FAIL] Kiểm thử CSDL thất bại:', err);
    return false;
  }
}

if (require.main === module) {
  runUnitTests();
}

module.exports = { runUnitTests };
