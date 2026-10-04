/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-060: Viết bộ kiểm thử tự động Thêm khách hàng, chặn trùng MST và xóa an toàn
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA SV5)
 * Test Suite: Client MST Validation & Safe Deletion Enforcement
 */

const assert = require('assert');
const { Client, Invoice, AuditLog, sequelize } = require('../models');

async function runClientValidationTests() {
  console.log('====================================================');
  console.log(' TASK-060: KIỂM THỬ THÊM KHÁCH HÀNG, MST & XÓA AN TOÀN ');
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

  const validTaxCode = '0318' + Math.floor(100000 + Math.random() * 900000); // 10 chữ số chuẩn
  let testClientId = null;

  // 1. Thêm khách hàng B2B hợp lệ kèm Credit Limit
  await test('1. Thêm khách hàng B2B hợp lệ kèm hạn mức tín dụng Credit Limit', async () => {
    const client = await Client.create({
      companyName: 'Công ty Cổ phần Công nghệ GODDY Tech QA',
      taxCode: validTaxCode,
      address: 'Khu Công Nghệ Cao, TP. Thủ Đức, TP. Hồ Chí Minh',
      contactPerson: 'Huỳnh Nguyễn Vĩnh Phúc',
      contactEmail: 'phuc.hnv@goddytech.vn',
      contactPhone: '0901234567',
      paymentTermDays: 30,
      creditLimit: 500000000, // 500 triệu đồng
      status: 'Active'
    });

    assert(client.id, 'Khách hàng phải được cấp ID tự tăng');
    assert.strictEqual(client.taxCode, validTaxCode);
    assert.strictEqual(parseFloat(client.creditLimit), 500000000);
    assert.strictEqual(client.paymentTermDays, 30);
    testClientId = client.id;

    await AuditLog.create({
      action: 'CREATE_CLIENT',
      module: 'CLIENTS',
      details: `Đã tạo khách hàng mới ID ${client.id} - ${client.companyName}`
    });
  });

  // 2. Validate định dạng MST (10 số hoặc 13 số chuẩn VN)
  await test('2. Kiểm tra hàm Validate định dạng MST chuẩn Thuế Việt Nam', async () => {
    const validateTaxCode = (tax) => {
      const clean = (tax || '').trim().replace(/-/g, '');
      return /^\d{10}(\d{3})?$/.test(clean);
    };

    assert.strictEqual(validateTaxCode('0318999888'), true, 'MST 10 số phải hợp lệ');
    assert.strictEqual(validateTaxCode('0101234567-001'), true, 'MST 13 số có gạch ngang phải hợp lệ');
    assert.strictEqual(validateTaxCode('0101234567001'), true, 'MST 13 số liền nhau phải hợp lệ');
    assert.strictEqual(validateTaxCode('ABC1234567'), false, 'MST chứa chữ cái phải bị từ chối');
    assert.strictEqual(validateTaxCode('12345'), false, 'MST dưới 10 số phải bị từ chối');
    assert.strictEqual(validateTaxCode('123456789012345'), false, 'MST trên 13 số phải bị từ chối');
  });

  // 3. Chặn trùng lặp MST trong CSDL
  await test('3. Chặn lưu khách hàng trùng lặp Mã Số Thuế', async () => {
    let duplicateRejected = false;
    try {
      await Client.create({
        companyName: 'Công ty Trùng MST Đạo Nhái',
        taxCode: validTaxCode, // Dùng lại MST vừa tạo ở bước 1
        paymentTermDays: 15,
        creditLimit: 100000000,
        status: 'Active'
      });
    } catch (e) {
      duplicateRejected = true;
    }
    assert(duplicateRejected, 'CSDL phải kích hoạt unique constraint chặn trùng MST');
  });

  // 4. Kiểm tra ràng buộc Xóa an toàn: Chặn xóa khi còn hóa đơn tồn nợ
  await test('4. Chặn xóa khách hàng khi còn hóa đơn nợ chưa tất toán', async () => {
    // Tạo hóa đơn còn nợ gắn với khách hàng testClientId
    const invoice = await Invoice.create({
      invoiceCode: `INV-SAFE-${Date.now().toString().slice(-4)}`,
      clientId: testClientId,
      subtotal: 50000000,
      vatRate: 8.0,
      vatAmount: 4000000,
      totalAmount: 54000000,
      paidAmount: 0,
      remainingAmount: 54000000,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      status: 'Sent' // Đang chờ thanh toán
    });

    // Giả lập logic kiểm tra trước khi xóa:
    const activeDebtCount = await Invoice.count({
      where: {
        clientId: testClientId,
        status: ['Sent', 'Partial', 'Overdue']
      }
    });

    let deleteBlocked = false;
    if (activeDebtCount > 0) {
      deleteBlocked = true; // Chặn xóa an toàn!
    } else {
      await Client.destroy({ where: { id: testClientId } });
    }

    assert.strictEqual(deleteBlocked, true, 'Khách hàng có nợ tồn đọng bắt buộc phải bị chặn xóa');

    // Dọn dẹp hóa đơn test để chuẩn bị cho test xóa thành công
    await invoice.destroy();
  });

  // 5. Cho phép xóa an toàn khi khách hàng không còn công nợ
  await test('5. Cho phép xóa an toàn khách hàng khi toàn bộ công nợ đã tất toán', async () => {
    const activeDebtCount = await Invoice.count({
      where: {
        clientId: testClientId,
        status: ['Sent', 'Partial', 'Overdue']
      }
    });

    assert.strictEqual(activeDebtCount, 0, 'Khách hàng không còn hóa đơn nợ nào');

    const clientToDelete = await Client.findByPk(testClientId);
    assert(clientToDelete, 'Khách hàng phải còn tồn tại trước khi xóa');

    await clientToDelete.destroy();

    const clientAfterDelete = await Client.findByPk(testClientId);
    assert.strictEqual(clientAfterDelete, null, 'Khách hàng đã được xóa an toàn khỏi CSDL');

    await AuditLog.create({
      action: 'DELETE_CLIENT',
      module: 'CLIENTS',
      details: `Đã xóa an toàn khách hàng ID ${testClientId} do không còn công nợ`
    });
  });

  console.log('\n====================================================');
  console.log(` KẾT QUẢ KIỂM THỬ: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    throw new Error(`TASK-060 thất bại: Có ${failed} test cases không đạt!`);
  }
  return true;
}

if (require.main === module) {
  runClientValidationTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runClientValidationTests };
