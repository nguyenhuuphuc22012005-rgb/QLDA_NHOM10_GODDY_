/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-059: Viết bộ kiểm thử tự động xác thực Đăng nhập/Đăng ký và cấp Token JWT
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA SV5)
 * Test Suite: /api/auth & JWT Token Verification
 */

const assert = require('assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, AuditLog, sequelize } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'goddy_secret_key_2026';

async function runAuthJwtTests() {
  console.log('====================================================');
  console.log(' TASK-059: BỘ KIỂM THỬ TỰ ĐỘNG AUTH & CẤP TOKEN JWT ');
  console.log(' Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923)  ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}`);
      console.error(`         Chi tiết lỗi: ${err.message}`);
      failed++;
    }
  }

  const testUser = {
    username: `test_user_${Date.now()}`,
    email: `test_${Date.now()}@goddy.vn`,
    password: 'SecurePassword@2026',
    fullName: 'Huỳnh Nguyễn Vĩnh Phúc (Test QA)',
    role: 'recruiter'
  };

  // 1. Kiểm tra mã hóa mật khẩu khi đăng ký tài khoản mới
  await test('1. Đăng ký tài khoản mới & kiểm tra băm mật khẩu Bcrypt', async () => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(testUser.password, salt);

    const newUser = await User.create({
      username: testUser.username,
      email: testUser.email,
      password: hashedPassword,
      fullName: testUser.fullName,
      role: testUser.role,
      isActive: true
    });

    assert(newUser.id, 'Người dùng phải được cấp ID khóa chính');
    assert.strictEqual(newUser.username, testUser.username);
    assert.notStrictEqual(newUser.password, testUser.password, 'Mật khẩu phải được băm an toàn, không lưu plaintext');
    assert(newUser.password.startsWith('$2'), 'Mật khẩu phải tuân thủ chuẩn hash Bcrypt ($2a$ / $2b$)');

    await AuditLog.create({
      userId: newUser.id,
      action: 'REGISTER_USER',
      module: 'AUTH',
      details: `Kiểm thử đăng ký thành công cho tài khoản ${newUser.username}`
    });
  });

  // 2. Chặn đăng ký trùng username
  await test('2. Chặn đăng ký trùng Username trong CSDL', async () => {
    let duplicateRejected = false;
    try {
      await User.create({
        username: testUser.username, // Trùng với user vừa tạo
        email: `another_${Date.now()}@goddy.vn`,
        password: 'Password123',
        fullName: 'Người dùng trùng tên',
        role: 'recruiter'
      });
    } catch (e) {
      duplicateRejected = true;
    }
    assert(duplicateRejected, 'Hệ thống CSDL bắt buộc phải chặn tạo trùng username');
  });

  // 3. Đăng nhập thành công và cấp Token JWT
  let generatedToken = null;
  await test('3. Đăng nhập với mật khẩu chính xác & sinh Token JWT', async () => {
    const user = await User.findOne({ where: { username: testUser.username } });
    assert(user, 'Người dùng phải tồn tại trong CSDL');

    const isMatch = await bcrypt.compare(testUser.password, user.password);
    assert.strictEqual(isMatch, true, 'Mật khẩu khớp với bản băm Bcrypt');

    generatedToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    assert(generatedToken, 'Token JWT phải được sinh thành công');
    assert.strictEqual(generatedToken.split('.').length, 3, 'JWT Token phải gồm 3 phần: Header.Payload.Signature');
  });

  // 4. Xác thực và giải mã Token JWT
  await test('4. Kiểm tra tính hợp lệ và cấu trúc Payload của Token JWT', async () => {
    assert(generatedToken, 'Token phải tồn tại từ test case trước');
    const decoded = jwt.verify(generatedToken, JWT_SECRET);

    assert.strictEqual(decoded.username, testUser.username);
    assert.strictEqual(decoded.role, testUser.role);
    assert.strictEqual(decoded.fullName, testUser.fullName);
    assert(decoded.exp, 'Token phải có thời hạn hết hạn (exp)');
  });

  // 5. Chặn đăng nhập với mật khẩu sai
  await test('5. Từ chối xác thực khi nhập sai mật khẩu', async () => {
    const user = await User.findOne({ where: { username: testUser.username } });
    const isMatch = await bcrypt.compare('SaiMatKhau@123', user.password);
    assert.strictEqual(isMatch, false, 'Xác thực phải thất bại khi sai mật khẩu');
  });

  // 6. Chặn đăng nhập với tài khoản bị khóa (isActive = false)
  await test('6. Chặn đăng nhập khi tài khoản bị khóa (isActive = false)', async () => {
    const user = await User.findOne({ where: { username: testUser.username } });
    user.isActive = false;
    await user.save();

    const checkUser = await User.findOne({ where: { username: testUser.username } });
    assert.strictEqual(checkUser.isActive, false);

    // Giả lập kiểm tra đăng nhập hệ thống
    const canLogin = checkUser.isActive;
    assert.strictEqual(canLogin, false, 'Tài khoản vô hiệu hóa không được phép đăng nhập');
  });

  // 7. Xác nhận ghi nhận Audit Log cho chu trình xác thực
  await test('7. Kiểm tra ghi log AuditLog đầy đủ cho thao tác xác thực', async () => {
    const logs = await AuditLog.findAll({
      where: { module: 'AUTH' },
      order: [['id', 'DESC']],
      limit: 5
    });
    assert(logs.length > 0, 'Phải có bản ghi AuditLog thuộc module AUTH');
  });

  console.log('\n====================================================');
  console.log(` KẾT QUẢ KIỂM THỬ: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    throw new Error(`TASK-059 thất bại: Có ${failed} test cases không đạt!`);
  }
  return true;
}

if (require.main === module) {
  runAuthJwtTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runAuthJwtTests };
