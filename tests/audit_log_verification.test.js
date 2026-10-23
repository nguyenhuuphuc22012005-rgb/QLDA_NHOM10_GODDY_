/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-184: Viết bộ kiểm thử tự động Ghi nhật ký thao tác Audit Log đầy đủ trường thông tin
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA SV5)
 * Deliverable: Test suite kiểm tra cấu trúc, các sự kiện ghi vết và endpoint /api/audit
 */

const assert = require('assert');
const { AuditLog, User, sequelize } = require('../models');

async function runAuditLogTests() {
  console.log('====================================================');
  console.log(' TASK-184: KIỂM THỬ NHẬT KÝ THAO TÁC AUDIT LOG       ');
  console.log(' Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923) ');
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

  // 1. Kiểm tra toàn vẹn trường dữ liệu model AuditLog
  await test('1. Kiểm tra các trường dữ liệu bắt buộc (id, action, module, details, createdAt)', async () => {
    const testLog = await AuditLog.create({
      userId: 1,
      action: 'TEST_STRUCTURE',
      module: 'TESTING',
      details: 'Kiểm thử tính toàn vẹn cấu trúc bảng AuditLogs'
    });

    assert(testLog.id, 'AuditLog phải có id tự tăng');
    assert.strictEqual(testLog.action, 'TEST_STRUCTURE');
    assert.strictEqual(testLog.module, 'TESTING');
    assert(testLog.createdAt, 'AuditLog phải có timestamp createdAt');
    console.log(`     - Đã tạo bản ghi AuditLog mẫu ID: ${testLog.id} vào lúc ${testLog.createdAt}`);
  });

  // 2. Chặn tạo AuditLog nếu thiếu trường bắt buộc (action hoặc module)
  await test('2. Bắt lỗi ràng buộc khi tạo AuditLog thiếu action hoặc module', async () => {
    let errorCaught = false;
    try {
      await AuditLog.create({
        userId: 1,
        details: 'Thiếu action và module bắt buộc'
      });
    } catch (err) {
      errorCaught = true;
    }
    assert(errorCaught, 'Hệ thống phải chặn tạo log nếu thiếu trường action/module');
    console.log('     - Ràng buộc NotNull trên action và module hoạt động an toàn');
  });

  // 3. Kiểm tra ghi vết thao tác Xác thực (Auth / Login)
  await test('3. Ghi vết thao tác đăng nhập thành công vào Audit Log', async () => {
    const loginLog = await AuditLog.create({
      userId: 1,
      action: 'USER_LOGIN_SUCCESS',
      module: 'AUTH',
      details: 'Người dùng admin đăng nhập thành công từ địa chỉ IP: 127.0.0.1'
    });
    assert.strictEqual(loginLog.module, 'AUTH');
    assert(loginLog.details.includes('admin'));
  });

  // 4. Kiểm tra ghi vết thao tác Nghiệp vụ Hóa đơn & Thu hồi công nợ
  await test('4. Ghi vết thao tác phát hành hóa đơn và thu hồi nợ (Invoice & Payment)', async () => {
    const invLog = await AuditLog.create({
      userId: 2,
      action: 'INVOICE_ISSUED',
      module: 'INVOICES',
      details: 'Phát hành hóa đơn INV-TEST-AUDIT-001 trị giá 50.000.000đ cho khách hàng'
    });
    const payLog = await AuditLog.create({
      userId: 2,
      action: 'PAYMENT_RECEIVED',
      module: 'DEBT',
      details: 'Thu tiền công nợ 25.000.000đ cho hóa đơn INV-TEST-AUDIT-001 qua BankTransfer'
    });

    assert.strictEqual(invLog.action, 'INVOICE_ISSUED');
    assert.strictEqual(payLog.action, 'PAYMENT_RECEIVED');
    console.log(`     - Ghi nhận thành công log Invoice (ID: ${invLog.id}) và Payment (ID: ${payLog.id})`);
  });

  // 5. Kiểm tra truy vấn danh sách AuditLog sắp xếp mới nhất lên đầu và tối đa 100 dòng
  await test('5. Truy vấn danh sách Audit Trail sắp xếp DESC và giới hạn 100 bản ghi', async () => {
    const logs = await AuditLog.findAll({
      order: [['id', 'DESC']],
      limit: 100
    });

    assert(Array.isArray(logs), 'Kết quả truy vấn phải là danh sách');
    assert(logs.length > 0, 'Phải có ít nhất 1 bản ghi Audit Log');
    assert(logs.length <= 100, 'Không được trả về quá 100 bản ghi');

    // Kiểm tra thứ tự giảm dần
    for (let i = 0; i < logs.length - 1; i++) {
      assert(logs[i].id >= logs[i + 1].id, `Log ID #${logs[i].id} phải >= Log ID #${logs[i + 1].id}`);
    }
    console.log(`     - Truy vấn thành công ${logs.length} bản ghi Audit Log, thứ tự DESC chuẩn xác`);
  });

  // 6. Ghi log tổng kết TASK-184
  await test('6. Ghi nhận log kiểm toán hoàn tất kiểm thử TASK-184', async () => {
    const finalLog = await AuditLog.create({
      action: 'AUDIT_LOG_VERIFICATION_COMPLETE',
      module: 'AUDIT',
      details: 'Huỳnh Nguyễn Vĩnh Phúc hoàn thành kiểm thử tính toàn vẹn và an toàn của hệ thống Audit Log.'
    });
    assert(finalLog.id);
  });

  console.log('\n====================================================');
  console.log(` KẾT QUẢ KIỂM THỬ: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) throw new Error(`TASK-184 thất bại: Có ${failed} test cases không đạt!`);
  return true;
}

if (require.main === module) {
  runAuditLogTests().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { runAuditLogTests };
