/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-122: Cấu hình quan hệ Invoice 1 - N Payment trong Sequelize ORM
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA SV5)
 * Test Suite: Cấu hình và kiểm chứng quan hệ 1 - N giữa Hóa đơn (Invoice) và Các đợt thanh toán (Payments)
 */

const assert = require('assert');
const { Invoice, Payment, Client, AuditLog, sequelize } = require('../models');

async function runInvoicePaymentRelationTests() {
  console.log('====================================================');
  console.log(' TASK-122: KIỂM THỬ QUAN HỆ 1 - N INVOICE & PAYMENT  ');
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

  let testClient, testInvoice, payment1, payment2;

  // 1. Tạo Hóa đơn mẫu cho kiểm thử
  await test('1. Khởi tạo Hóa đơn giá trị 100,000,000 VND', async () => {
    testClient = await Client.findOne();
    testInvoice = await Invoice.create({
      invoiceCode: `INV-REL1N-${Date.now().toString().slice(-4)}`,
      clientId: testClient ? testClient.id : 1,
      subtotal: 92592592.59,
      vatRate: 8.0,
      vatAmount: 7407407.41,
      totalAmount: 100000000.00,
      paidAmount: 0.00,
      remainingAmount: 100000000.00,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      status: 'Sent'
    });

    assert(testInvoice.id, 'Hóa đơn phải được tạo thành công');
  });

  // 2. Tạo 2 đợt thanh toán gắn với 1 Hóa đơn (Quan hệ 1 - N)
  await test('2. Khởi tạo 2 đợt thanh toán (Payment 1 & 2) liên kết cùng 1 Hóa đơn', async () => {
    // Đợt 1: Trả 40 triệu
    payment1 = await Payment.create({
      invoiceId: testInvoice.id,
      amount: 40000000.00,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'BankTransfer',
      referenceNo: `UNC-TEST-001-${Date.now().toString().slice(-4)}`,
      notes: 'Thanh toán đợt 1 - 40 triệu đồng'
    });

    // Đợt 2: Trả tiếp 60 triệu
    payment2 = await Payment.create({
      invoiceId: testInvoice.id,
      amount: 60000000.00,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'BankTransfer',
      referenceNo: `UNC-TEST-002-${Date.now().toString().slice(-4)}`,
      notes: 'Thanh toán đợt 2 - tất toán 60 triệu đồng'
    });

    assert(payment1.id && payment2.id, 'Cả 2 đợt thanh toán phải được tạo thành công');
    assert.strictEqual(payment1.invoiceId, testInvoice.id);
    assert.strictEqual(payment2.invoiceId, testInvoice.id);
  });

  // 3. Kiểm tra liên kết xuôi: Invoice.hasMany(Payment)
  await test('3. Kiểm tra truy vấn Invoice kèm include toàn bộ danh sách Payments', async () => {
    const fetchedInvoice = await Invoice.findByPk(testInvoice.id, {
      include: [{ model: Payment }]
    });

    assert(fetchedInvoice, 'Phải tìm thấy hóa đơn');
    assert(Array.isArray(fetchedInvoice.Payments), 'Thuộc tính Payments phải là một mảng');
    assert.strictEqual(fetchedInvoice.Payments.length, 2, 'Hóa đơn phải chứa chính xác 2 bản ghi thanh toán');

    const totalPaidCalculated = fetchedInvoice.Payments.reduce((acc, p) => acc + parseFloat(p.amount), 0);
    assert.strictEqual(totalPaidCalculated, 100000000.00, 'Tổng số tiền 2 đợt thanh toán phải bằng đúng 100 triệu');
  });

  // 4. Kiểm tra liên kết ngược: Payment.belongsTo(Invoice)
  await test('4. Kiểm tra truy vấn Payment kèm include thông tin Hóa đơn gốc', async () => {
    const fetchedPayment = await Payment.findByPk(payment1.id, {
      include: [{ model: Invoice }]
    });

    assert(fetchedPayment, 'Phải tìm thấy bản ghi thanh toán');
    assert(fetchedPayment.Invoice, 'Bản ghi thanh toán phải liên kết đúng Hóa đơn gốc');
    assert.strictEqual(fetchedPayment.Invoice.id, testInvoice.id);
    assert.strictEqual(fetchedPayment.Invoice.invoiceCode, testInvoice.invoiceCode);
  });

  // 5. Ghi nhận log kiểm toán cho quan hệ 1 - N
  await test('5. Ghi nhận Audit Log cho cấu hình quan hệ 1-N Invoice và Payment', async () => {
    const audit = await AuditLog.create({
      action: 'CONFIGURE_1N_INVOICE_PAYMENT',
      module: 'PAYMENTS',
      details: `Huỳnh Nguyễn Vĩnh Phúc xác lập quan hệ 1 - N giữa Invoice ${testInvoice.invoiceCode} và các đợt Payment.`
    });

    assert(audit.id, 'Bản ghi AuditLog phải được tạo');
  });

  // 6. Dọn dẹp
  await test('6. Dọn dẹp dữ liệu kiểm thử an toàn', async () => {
    await payment1.destroy();
    await payment2.destroy();
    await testInvoice.destroy();
    console.log('     -> Đã dọn dẹp các bản ghi test an toàn.');
  });

  console.log('\n====================================================');
  console.log(` KẾT QUẢ KIỂM THỬ: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    throw new Error(`TASK-122 thất bại: Có ${failed} test cases không đạt!`);
  }
  return true;
}

if (require.main === module) {
  runInvoicePaymentRelationTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runInvoicePaymentRelationTests };
