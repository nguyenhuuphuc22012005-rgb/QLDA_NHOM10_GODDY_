/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-091: Viết bộ kiểm thử tự động Tính thuế VAT 8% và Tổng tiền hóa đơn
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA SV5)
 * Test Suite: VAT 8% Mathematical Accuracy & Total Amount Verification
 */

const assert = require('assert');
const { Invoice, Client, Placement, AuditLog, sequelize } = require('../models');

async function runVatCalculationTests() {
  console.log('====================================================');
  console.log(' TASK-091: KIỂM THỬ CÔNG THỨC THUẾ VAT 8% & TỔNG TIỀN');
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

  // Hàm tính toán hóa đơn nghiệp vụ
  function calculateInvoiceMath(subtotal, vatRate = 8.0) {
    const sub = parseFloat(subtotal);
    const rate = parseFloat(vatRate);
    const vatAmount = Math.round(sub * (rate / 100));
    const totalAmount = sub + vatAmount;
    const paidAmount = 0;
    const remainingAmount = totalAmount;
    return { subtotal: sub, vatRate: rate, vatAmount, totalAmount, paidAmount, remainingAmount };
  }

  // 1. Kiểm thử công thức VAT 8% với mức phí tuyển dụng 54.000.000 VNĐ
  await test('1. Kiểm thử công thức VAT 8% với deal chuẩn (54,000,000 VND)', async () => {
    const result = calculateInvoiceMath(54000000, 8.0);
    assert.strictEqual(result.subtotal, 54000000);
    assert.strictEqual(result.vatRate, 8.0);
    assert.strictEqual(result.vatAmount, 4320000, 'Thuế VAT 8% của 54 triệu phải bằng đúng 4,320,000đ');
    assert.strictEqual(result.totalAmount, 58320000, 'Tổng tiền phải bằng đúng 58,320,000đ');
    assert.strictEqual(result.remainingAmount, 58320000);
  });

  // 2. Kiểm thử công thức VAT 8% với deal lớn (120,000,000 VND)
  await test('2. Kiểm thử công thức VAT 8% với deal Enterprise (120,000,000 VND)', async () => {
    const result = calculateInvoiceMath(120000000, 8.0);
    assert.strictEqual(result.vatAmount, 9600000, 'Thuế VAT 8% của 120 triệu phải bằng 9,600,000đ');
    assert.strictEqual(result.totalAmount, 129600000, 'Tổng tiền sau thuế phải bằng 129,600,000đ');
  });

  // 3. Kiểm thử với số lẻ làm tròn không lệch đồng nào
  await test('3. Kiểm thử xử lý số lẻ và làm tròn chính xác từng đồng', async () => {
    // Thử nghiệm với mức phí 73,456,789 VND
    const sub = 73456789;
    const result = calculateInvoiceMath(sub, 8.0);
    const expectedVat = Math.round(73456789 * 0.08); // 5876543
    assert.strictEqual(result.vatAmount, expectedVat);
    assert.strictEqual(result.totalAmount, sub + expectedVat);
  });

  // 4. Kiểm thử thuế suất tùy biến: 10% và 0% (Miễn thuế đối tác chế xuất)
  await test('4. Kiểm thử thuế suất tùy biến: 10% chuẩn và 0% ưu đãi', async () => {
    const vat10 = calculateInvoiceMath(100000000, 10.0);
    assert.strictEqual(vat10.vatAmount, 10000000);
    assert.strictEqual(vat10.totalAmount, 110000000);

    const vat0 = calculateInvoiceMath(100000000, 0.0);
    assert.strictEqual(vat0.vatAmount, 0);
    assert.strictEqual(vat0.totalAmount, 100000000);
  });

  // 5. Kiểm thử lưu bản ghi Invoice thực tế vào CSDL và kiểm tra số dư nợ
  await test('5. Tạo hóa đơn trong CSDL kiểm tra tính toàn vẹn toán học', async () => {
    const client = await Client.findOne();
    const subtotal = 75600000;
    const { vatAmount, totalAmount } = calculateInvoiceMath(subtotal, 8.0);

    const inv = await Invoice.create({
      invoiceCode: `INV-MATH-${Date.now().toString().slice(-4)}`,
      clientId: client ? client.id : 1,
      subtotal,
      vatRate: 8.0,
      vatAmount,
      totalAmount,
      paidAmount: 0,
      remainingAmount: totalAmount,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      status: 'Sent'
    });

    assert(inv.id, 'Hóa đơn phải được lưu thành công');
    assert.strictEqual(parseFloat(inv.subtotal), 75600000);
    assert.strictEqual(parseFloat(inv.vatAmount), 6048000);
    assert.strictEqual(parseFloat(inv.totalAmount), 81648000);
    assert.strictEqual(parseFloat(inv.remainingAmount), 81648000);

    // Ghi log kiểm toán
    await AuditLog.create({
      action: 'ISSUE_INVOICE',
      module: 'INVOICES',
      details: `Kiểm thử phát hành hóa đơn VAT 8% thành công: ${inv.invoiceCode} - Tổng tiền: ${inv.totalAmount}đ`
    });

    // Dọn dẹp
    await inv.destroy();
  });

  console.log('\n====================================================');
  console.log(` KẾT QUẢ KIỂM THỬ: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    throw new Error(`TASK-091 thất bại: Có ${failed} test cases không đạt!`);
  }
  return true;
}

if (require.main === module) {
  runVatCalculationTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runVatCalculationTests };
