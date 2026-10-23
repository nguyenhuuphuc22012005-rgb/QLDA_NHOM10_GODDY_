/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-218: Xây dựng kịch bản kiểm thử tính năng cảnh báo khi khách hàng vượt hạn mức nợ Credit Limit
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA SV5)
 * Test Suite: Quản trị rủi ro tín dụng & Cảnh báo vượt hạn mức công nợ B2B
 */

const assert = require('assert');
const { Client, Invoice, AuditLog, sequelize } = require('../models');

/**
 * Hàm kiểm tra cảnh báo hạn mức nợ khách hàng
 */
async function checkClientCreditLimit(clientId, newAmount = 0) {
  const client = await Client.findByPk(clientId);
  if (!client) return { error: 'Không tìm thấy khách hàng' };

  const limit = parseFloat(client.creditLimit) || 0;

  // Tính tổng nợ hiện tại
  const currentDebt = await Invoice.sum('remainingAmount', {
    where: {
      clientId,
      status: ['Sent', 'Partial', 'Overdue']
    }
  }) || 0;

  const totalProjectedDebt = currentDebt + parseFloat(newAmount);
  const isExceeded = totalProjectedDebt > limit;
  const overAmount = isExceeded ? totalProjectedDebt - limit : 0;
  const utilizationPercent = limit > 0 ? ((totalProjectedDebt / limit) * 100).toFixed(1) : 0;

  return {
    clientId: client.id,
    companyName: client.companyName,
    creditLimit: limit,
    currentDebt,
    newAmount: parseFloat(newAmount),
    totalProjectedDebt,
    isExceeded,
    overAmount,
    utilizationPercent: parseFloat(utilizationPercent),
    alertLevel: isExceeded ? 'DANGER_RED' : (utilizationPercent >= 80 ? 'WARNING_YELLOW' : 'SAFE_GREEN')
  };
}

async function runCreditLimitGuardTests() {
  console.log('====================================================');
  console.log(' TASK-218: KIỂM THỬ CẢNH BÁO VƯỢT HẠN MỨC CREDIT LIMIT');
  console.log(' Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923)  ');
  console.log(' Tiêu chuẩn: Cảnh báo 3 cấp (An toàn, Cảnh giác, Vượt)');
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

  let testClient, inv1, inv2;

  // 1. Tạo khách hàng có hạn mức nợ 100 triệu
  await test('1. Tạo khách hàng thử nghiệm với Credit Limit = 100,000,000đ', async () => {
    testClient = await Client.create({
      companyName: 'Công ty TNHH Thử Nghiệm Tín Dụng QA',
      taxCode: '0319988' + Math.floor(100 + Math.random() * 900),
      paymentTermDays: 30,
      creditLimit: 100000000.00,
      status: 'Active'
    });

    assert(testClient.id);
    assert.strictEqual(parseFloat(testClient.creditLimit), 100000000.00);
  });

  // 2. Kiểm thử Trạng thái An toàn (SAFE_GREEN) khi nợ 50 triệu (50% hạn mức)
  await test('2. Khách hàng nợ 50 triệu (50% limit) -> Mức cảnh báo SAFE_GREEN', async () => {
    inv1 = await Invoice.create({
      invoiceCode: `INV-CR-1-${Date.now().toString().slice(-4)}`,
      clientId: testClient.id,
      subtotal: 46296296.30,
      vatRate: 8.0,
      vatAmount: 3703703.70,
      totalAmount: 50000000.00,
      paidAmount: 0,
      remainingAmount: 50000000.00,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      status: 'Sent'
    });

    const status = await checkClientCreditLimit(testClient.id, 0);
    assert.strictEqual(status.isExceeded, false);
    assert.strictEqual(status.alertLevel, 'SAFE_GREEN');
    assert.strictEqual(status.utilizationPercent, 50);
  });

  // 3. Kiểm thử Trạng thái Cảnh giác (WARNING_YELLOW) khi nợ đạt 85 triệu (85% hạn mức)
  await test('3. Dự kiến thêm deal 35 triệu (Tổng nợ 85% limit) -> Mức cảnh báo WARNING_YELLOW', async () => {
    const status = await checkClientCreditLimit(testClient.id, 35000000);
    assert.strictEqual(status.isExceeded, false);
    assert.strictEqual(status.alertLevel, 'WARNING_YELLOW');
    assert.strictEqual(status.utilizationPercent, 85);
  });

  // 4. Kiểm thử Kích hoạt Cảnh báo Vượt hạn mức (DANGER_RED) khi nợ 120 triệu (120% limit)
  await test('4. Dự kiến phát hành hóa đơn 70 triệu (Tổng nợ 120 triệu) -> Báo động DANGER_RED', async () => {
    const status = await checkClientCreditLimit(testClient.id, 70000000);
    assert.strictEqual(status.isExceeded, true, 'Hệ thống phải kích hoạt cờ vượt hạn mức nợ');
    assert.strictEqual(status.alertLevel, 'DANGER_RED');
    assert.strictEqual(status.overAmount, 20000000, 'Số tiền vượt hạn mức phải là 20 triệu đồng');
    assert.strictEqual(status.utilizationPercent, 120);

    // Ghi log cảnh báo rủi ro tín dụng
    await AuditLog.create({
      action: 'CREDIT_LIMIT_ALERT',
      module: 'CLIENTS',
      details: `CẢNH BÁO ĐỎ: Khách hàng ${testClient.companyName} vượt hạn mức tín dụng 20,000,000đ (Tỷ lệ: 120%).`
    });
  });

  // 5. Dọn dẹp
  await test('5. Dọn dẹp dữ liệu kiểm thử an toàn', async () => {
    await inv1.destroy();
    await testClient.destroy();
    console.log('     -> Dọn dẹp bản ghi kiểm thử an toàn.');
  });

  console.log('\n====================================================');
  console.log(` KẾT QUẢ KIỂM THỬ: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) throw new Error(`TASK-218 thất bại: Có ${failed} test cases không đạt!`);
  return true;
}

if (require.main === module) {
  runCreditLimitGuardTests().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { runCreditLimitGuardTests, checkClientCreditLimit };
