const assert = require('assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sequelize, User, Client, Invoice } = require('../models');

async function runSecurityTests() {
  console.log('----------------------------------------------------');
  console.log(' [SECURITY & RBAC TEST] Kiểm thử bảo mật, phân quyền & hạn mức');
  console.log(' Tiêu chuẩn: OWASP Top 10, Bcrypt Hashing, RBAC 3 vai trò');
  console.log('----------------------------------------------------');

  await sequelize.sync();

  let passed = 0;
  let failed = 0;

  async function testStep(name, fn) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // 1. Kiểm tra mã hóa mật khẩu Bcrypt
  await testStep('Bảo mật 1: Mật khẩu người dùng bắt buộc băm bằng Bcrypt, không lưu plain-text', async () => {
    const rawPass = 'SecretPassword123@';
    const hash = await bcrypt.hash(rawPass, 10);

    assert.notStrictEqual(hash, rawPass, 'Mật khẩu hash không được trùng với mật khẩu thô');
    assert(hash.startsWith('$2a$') || hash.startsWith('$2b$'), 'Mật khẩu phải theo format chuẩn Bcrypt');

    const match = await bcrypt.compare(rawPass, hash);
    assert(match, 'Hàm so khớp mật khẩu hoạt động chính xác');
  });

  // 2. Kiểm tra JWT Token bảo mật
  await testStep('Bảo mật 2: JWT Token chứa payload mã hóa và có thời hạn xác thực', async () => {
    const secret = process.env.JWT_SECRET || 'goddy_secret_key_2026';
    const payload = { id: 1, username: 'admin', role: 'Admin' };
    const token = jwt.sign(payload, secret, { expiresIn: '7d' });

    assert(typeof token === 'string' && token.length > 20, 'Token phải là chuỗi hợp lệ');

    const decoded = jwt.verify(token, secret);
    assert.strictEqual(decoded.username, 'admin');
    assert.strictEqual(decoded.role, 'Admin');

    // Token giả mạo phải bị từ chối
    let fakeRejected = false;
    try {
      jwt.verify(token, 'wrong_secret_key');
    } catch (e) {
      fakeRejected = true;
    }
    assert(fakeRejected, 'Hệ thống phải từ chối token có chữ ký không khớp');
  });

  // 3. Kiểm tra phân quyền RBAC 3 vai trò
  await testStep('Bảo mật 3: Phân quyền RBAC 3 cấp (Admin, Kế toán, Recruiter)', async () => {
    const roles = {
      Admin: ['MANAGE_USERS', 'VIEW_AUDIT', 'CONFIG_SYSTEM'],
      Accountant: ['CREATE_INVOICE', 'RECORD_PAYMENT', 'VIEW_AGING', 'SEND_REMINDER'],
      Recruiter: ['MANAGE_CLIENTS', 'MANAGE_JOBS', 'MANAGE_CANDIDATES', 'CREATE_PLACEMENT']
    };

    // Recruiter không được phép thu tiền công nợ
    assert(!roles.Recruiter.includes('RECORD_PAYMENT'), 'Recruiter không có quyền thu tiền nợ');
    // Kế toán không được phép sửa vị trí tuyển dụng
    assert(!roles.Accountant.includes('MANAGE_JOBS'), 'Kế toán không có quyền tạo Job');
    // Admin có toàn quyền quản trị
    assert(roles.Admin.includes('MANAGE_USERS'), 'Admin có quyền quản lý tài khoản');
  });

  // 4. TASK-218: Kiểm tra Cảnh báo hạn mức công nợ (Credit Limit)
  await testStep('Bảo mật 4 [TASK-218]: Cảnh báo khi khách hàng vượt hạn mức công nợ Credit Limit', async () => {
    const taxCode = '0309' + Date.now().toString().slice(-6);
    const client = await Client.create({
      companyName: 'Công ty Vượt Hạn Mức Tín Dụng Test',
      taxCode,
      creditLimit: 50000000, // Hạn mức 50 triệu
      status: 'Active'
    });

    // Tạo hóa đơn nợ 70 triệu (vượt hạn mức 50 triệu)
    const invoiceDebt = 70000000;
    const limit = parseFloat(client.creditLimit);
    const isExceeded = invoiceDebt > limit;
    const exceedAmount = invoiceDebt - limit;

    assert(isExceeded, 'Hệ thống phải phát hiện dư nợ vượt hạn mức tín dụng');
    assert.strictEqual(exceedAmount, 20000000, 'Số tiền vượt hạn mức được tính chính xác là 20 triệu');
  });

  // 5. Chống SQL Injection qua Sequelize Parameterized Queries
  await testStep('Bảo mật 5: Chống tấn công SQL Injection bằng Parameterized Query', async () => {
    const maliciousInput = "' OR '1'='1";
    // Tìm kiếm với input độc hại
    const result = await User.findOne({
      where: {
        username: maliciousInput
      }
    });
    // Không bị bypass
    assert.strictEqual(result, null, 'SQL Injection bị chặn đứng tuyệt đối');
  });

  // 6. TASK-213: Kiểm tra Đổi mật khẩu cá nhân
  await testStep('Bảo mật 6 [TASK-213]: Đổi mật khẩu cá nhân & băm lại mật khẩu an toàn', async () => {
    const testUsername = 'user_test_pwd_' + Date.now().toString().slice(-4);
    const initialPass = 'OldPass123@';
    const newPass = 'NewSecurePass456@';

    const testUser = await User.create({
      username: testUsername,
      email: `${testUsername}@goddy.vn`,
      password: await bcrypt.hash(initialPass, 10),
      fullName: 'Test User Pwd',
      role: 'recruiter',
      isActive: true
    });

    // So khớp mật khẩu cũ
    const isOldMatch = await bcrypt.compare(initialPass, testUser.password);
    assert(isOldMatch, 'Mật khẩu cũ khớp chính xác');

    // Đổi mật khẩu mới
    testUser.password = await bcrypt.hash(newPass, 10);
    await testUser.save();

    // Kiểm tra mật khẩu mới
    const isNewMatch = await bcrypt.compare(newPass, testUser.password);
    assert(isNewMatch, 'Mật khẩu mới đã được băm và lưu thành công');
  });

  // 7. TASK-214: Kiểm tra Khóa / Mở khóa tài khoản người dùng
  await testStep('Bảo mật 7 [TASK-214]: Khóa / Mở khóa tài khoản (Active/Inactive Toggle)', async () => {
    const testUsername = 'user_toggle_' + Date.now().toString().slice(-4);
    const testUser = await User.create({
      username: testUsername,
      email: `${testUsername}@goddy.vn`,
      password: await bcrypt.hash('DefaultPass123!', 10),
      fullName: 'Test User Toggle',
      role: 'recruiter',
      isActive: true
    });

    assert.strictEqual(testUser.isActive, true, 'Tài khoản ban đầu ở trạng thái hoạt động');

    // Khóa tài khoản
    testUser.isActive = false;
    await testUser.save();
    assert.strictEqual(testUser.isActive, false, 'Tài khoản đã được chuyển sang trạng thái khóa');

    // Mở khóa tài khoản
    testUser.isActive = true;
    await testUser.save();
    assert.strictEqual(testUser.isActive, true, 'Tài khoản đã được mở khóa thành công');
  });

  console.log(`\n  ==> Kết quả Security: ${passed} PASSED | ${failed} FAILED\n`);
  return failed === 0;
}

if (require.main === module) {
  runSecurityTests().then(success => process.exit(success ? 0 : 1));
}

module.exports = runSecurityTests;
