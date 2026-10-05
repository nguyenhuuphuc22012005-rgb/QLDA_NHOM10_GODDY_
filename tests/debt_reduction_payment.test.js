/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-123: Viết bộ kiểm thử tự động Thanh toán trừ dần nợ và chống trả vượt quá số nợ
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA SV5)
 * Test Suite: Thanh toán trừ dần dư nợ & Chống thanh toán vượt nợ (Overpayment Guard)
 */

const assert = require('assert');
const { Invoice, Payment, Client, AuditLog, sequelize } = require('../models');

/**
 * Hàm dịch vụ xử lý thanh toán hóa đơn
 */
async function processInvoicePayment({ invoiceId, payAmount, paymentMethod = 'BankTransfer', referenceNo = '' }) {
  const amount = parseFloat(payAmount);

  if (isNaN(amount) || amount <= 0) {
    return { success: false, statusCode: 400, message: 'Số tiền thanh toán phải lớn hơn 0!' };
  }

  const invoice = await Invoice.findByPk(invoiceId);
  if (!invoice) {
    return { success: false, statusCode: 404, message: 'Không tìm thấy hóa đơn!' };
  }

  const currentRemaining = parseFloat(invoice.remainingAmount);

  // Chặn thanh toán vượt quá số nợ còn lại
  if (amount > currentRemaining) {
    return {
      success: false,
      statusCode: 400,
      message: `Số tiền thanh toán (${amount.toLocaleString()}đ) vượt quá dư nợ còn lại (${currentRemaining.toLocaleString()}đ)!`,
      remainingAmount: currentRemaining
    };
  }

  // Thực hiện giao dịch thanh toán
  const payment = await Payment.create({
    invoiceId: invoice.id,
    amount,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod,
    referenceNo,
    notes: `Khách hàng thanh toán ${amount.toLocaleString()}đ`
  });

  const newPaid = parseFloat(invoice.paidAmount) + amount;
  const newRemaining = currentRemaining - amount;
  const newStatus = newRemaining === 0 ? 'Paid' : 'Partial';

  invoice.paidAmount = newPaid;
  invoice.remainingAmount = newRemaining;
  invoice.status = newStatus;
  await invoice.save();

  return {
    success: true,
    statusCode: 200,
    message: 'Ghi nhận thanh toán thành công!',
    payment,
    invoice: {
      id: invoice.id,
      paidAmount: newPaid,
      remainingAmount: newRemaining,
      status: newStatus
    }
  };
}

async function runDebtReductionPaymentTests() {
  console.log('====================================================');
  console.log(' TASK-123: KIỂM THỬ TRỪ DẦN NỢ & CHỐNG TRẢ VƯỢT NỢ   ');
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

  let testInvoice = null;

  // 1. Tạo hóa đơn 50,000,000 VND
  await test('1. Khởi tạo hóa đơn nợ 50,000,000 VND', async () => {
    const client = await Client.findOne();
    testInvoice = await Invoice.create({
      invoiceCode: `INV-DEBT-${Date.now().toString().slice(-4)}`,
      clientId: client ? client.id : 1,
      subtotal: 46296296.30,
      vatRate: 8.0,
      vatAmount: 3703703.70,
      totalAmount: 50000000.00,
      paidAmount: 0.00,
      remainingAmount: 50000000.00,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      status: 'Sent'
    });

    assert(testInvoice.id, 'Hóa đơn phải được tạo thành công');
    assert.strictEqual(parseFloat(testInvoice.remainingAmount), 50000000.00);
  });

  // 2. Chặn thanh toán số tiền âm hoặc bằng 0
  await test('2. Chặn thanh toán số tiền âm hoặc bằng 0', async () => {
    const resNegative = await processInvoicePayment({ invoiceId: testInvoice.id, payAmount: -5000000 });
    assert.strictEqual(resNegative.success, false);
    assert.strictEqual(resNegative.statusCode, 400);

    const resZero = await processInvoicePayment({ invoiceId: testInvoice.id, payAmount: 0 });
    assert.strictEqual(resZero.success, false);
    assert.strictEqual(resZero.statusCode, 400);
  });

  // 3. Thanh toán đợt 1 (trả 20 triệu) -> còn lại 30 triệu, status 'Partial'
  await test('3. Thanh toán đợt 1 (20 triệu) -> Dư nợ giảm còn 30 triệu, status Partial', async () => {
    const res = await processInvoicePayment({
      invoiceId: testInvoice.id,
      payAmount: 20000000,
      referenceNo: 'UNC-DOT1-20TR'
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.invoice.paidAmount, 20000000.00);
    assert.strictEqual(res.invoice.remainingAmount, 30000000.00);
    assert.strictEqual(res.invoice.status, 'Partial');
  });

  // 4. Chặn thanh toán vượt quá số nợ còn lại (Dư nợ còn 30tr, cố tình trả 35tr)
  await test('4. Chặn thanh toán vượt quá số nợ còn lại (Cố tình trả 35 triệu khi nợ chỉ còn 30 triệu)', async () => {
    const res = await processInvoicePayment({
      invoiceId: testInvoice.id,
      payAmount: 35000000,
      referenceNo: 'UNC-OVERPAY-FAIL'
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 400);
    assert(res.message.includes('vượt quá dư nợ còn lại'));
  });

  // 5. Thanh toán nốt số nợ còn lại (30 triệu) -> Dư nợ về 0, status 'Paid'
  await test('5. Thanh toán nốt 30 triệu còn lại -> Dư nợ về 0.00đ, status chuyển sang Paid', async () => {
    const res = await processInvoicePayment({
      invoiceId: testInvoice.id,
      payAmount: 30000000,
      referenceNo: 'UNC-DOT2-30TR-FULL'
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.invoice.paidAmount, 50000000.00);
    assert.strictEqual(res.invoice.remainingAmount, 0.00);
    assert.strictEqual(res.invoice.status, 'Paid');

    await AuditLog.create({
      action: 'COMPLETE_INVOICE_PAYMENT',
      module: 'PAYMENTS',
      details: `Hóa đơn ID ${testInvoice.id} đã hoàn tất thanh toán toàn bộ 50,000,000đ.`
    });
  });

  // 6. Dọn dẹp
  await test('6. Dọn dẹp dữ liệu kiểm thử', async () => {
    await Payment.destroy({ where: { invoiceId: testInvoice.id } });
    await testInvoice.destroy();
    console.log('     -> Dọn dẹp bản ghi kiểm thử an toàn.');
  });

  console.log('\n====================================================');
  console.log(` KẾT QUẢ KIỂM THỬ: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    throw new Error(`TASK-123 thất bại: Có ${failed} test cases không đạt!`);
  }
  return true;
}

if (require.main === module) {
  runDebtReductionPaymentTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runDebtReductionPaymentTests, processInvoicePayment };
