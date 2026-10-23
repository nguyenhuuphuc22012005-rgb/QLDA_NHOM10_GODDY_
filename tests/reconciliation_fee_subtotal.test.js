/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-094: Kiểm tra tính toàn vẹn dữ liệu giữa Placement.fee và Invoice.subtotal
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA SV5)
 * Test Suite: Đối soát dữ liệu khớp 100% giữa Phí hoa hồng tuyển dụng và Doanh thu trước thuế
 */

const assert = require('assert');
const { Placement, Invoice, Client, Job, Candidate, AuditLog, sequelize } = require('../models');

async function runReconciliationFeeSubtotalTests() {
  console.log('====================================================');
  console.log(' TASK-094: ĐỐI SOÁT TOÀN VẸN PLACEMENT.FEE & SUBTOTAL');
  console.log(' Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923)  ');
  console.log(' Tiêu chuẩn: Độ lệch cho phép = 0.00đ (Khớp 100%)    ');
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

  let client, job, candidate, placement, invoice;

  // 1. Chuẩn bị dữ liệu Deal Placement và Invoice khớp chuẩn
  await test('1. Tạo cặp dữ liệu Deal Tuyển dụng và Hóa đơn chuẩn số liệu', async () => {
    client = await Client.findOne();
    job = await Job.findOne();
    candidate = await Candidate.findOne();

    const salary = 32000000;
    const feeRate = 18.0;
    const expectedFee = salary * 12 * (feeRate / 100); // 69,120,000đ

    placement = await Placement.create({
      jobId: job ? job.id : 1,
      candidateId: candidate ? candidate.id : 1,
      clientId: client ? client.id : 1,
      recruiterId: 1,
      officialSalary: salary,
      serviceFee: expectedFee,
      onboardDate: new Date().toISOString().split('T')[0],
      warrantyDays: 60,
      status: 'UnderWarranty'
    });

    const subtotal = parseFloat(placement.serviceFee);
    const vatRate = 8.0;
    const vatAmount = subtotal * (vatRate / 100);
    const totalAmount = subtotal + vatAmount;

    invoice = await Invoice.create({
      invoiceCode: `INV-RECON-${Date.now().toString().slice(-4)}`,
      clientId: placement.clientId,
      placementId: placement.id,
      subtotal,
      vatRate,
      vatAmount,
      totalAmount,
      paidAmount: 0,
      remainingAmount: totalAmount,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      status: 'Sent'
    });

    assert(placement.id && invoice.id, 'Cặp bản ghi phải được tạo thành công');
  });

  // 2. Đối soát dữ liệu giữa Placement.serviceFee và Invoice.subtotal
  await test('2. Đối soát khớp 100% giữa Placement.serviceFee và Invoice.subtotal', async () => {
    const fetchedInvoice = await Invoice.findByPk(invoice.id, {
      include: [{ model: Placement }]
    });

    assert(fetchedInvoice, 'Hóa đơn phải tồn tại');
    assert(fetchedInvoice.Placement, 'Hóa đơn phải liên kết với Placement');

    const fee = parseFloat(fetchedInvoice.Placement.serviceFee);
    const sub = parseFloat(fetchedInvoice.subtotal);
    const difference = Math.abs(fee - sub);

    console.log(`     - Placement.serviceFee : ${fee.toLocaleString()} VND`);
    console.log(`     - Invoice.subtotal     : ${sub.toLocaleString()} VND`);
    console.log(`     - Chênh lệch           : ${difference} VND`);

    assert.strictEqual(difference, 0, 'Phí dịch vụ và Doanh thu trước thuế phải trùng khớp 100%');
  });

  // 3. Kiểm tra thuật toán phát hiện sai lệch (Audit Anomaly Detection)
  await test('3. Thuật toán phát hiện và cảnh báo nếu có sai lệch số tiền', async () => {
    // Giả lập hàm kiểm tra đối soát tự động của DBA/QA
    const auditReconciliation = (pFee, iSubtotal) => {
      const diff = Math.abs(parseFloat(pFee) - parseFloat(iSubtotal));
      if (diff > 0.01) {
        return { isMatch: false, discrepancy: diff, alert: 'CẢNH BÁO: Dữ liệu lệch giữa Deal và Hóa đơn!' };
      }
      return { isMatch: true, discrepancy: 0, alert: 'KHỚP 100%' };
    };

    // Trường hợp khớp chuẩn
    const normalCheck = auditReconciliation(69120000, 69120000);
    assert.strictEqual(normalCheck.isMatch, true);

    // Trường hợp giả lập bị can thiệp sai lệch 500,000đ
    const tamperedCheck = auditReconciliation(69120000, 68620000);
    assert.strictEqual(tamperedCheck.isMatch, false);
    assert.strictEqual(tamperedCheck.discrepancy, 500000);
  });

  // 4. Đối soát quét toàn bộ các hóa đơn gắn với Deal trong CSDL
  await test('4. Quét kiểm tra toàn bộ các cặp Placement - Invoice trong toàn hệ thống', async () => {
    const allLinked = await Invoice.findAll({
      where: { placementId: { [require('sequelize').Op.ne]: null } },
      include: [Placement]
    });

    let verifiedCount = 0;
    for (const inv of allLinked) {
      if (inv.Placement) {
        const fee = parseFloat(inv.Placement.serviceFee);
        const sub = parseFloat(inv.subtotal);
        assert.strictEqual(Math.abs(fee - sub), 0, `Hóa đơn ${inv.invoiceCode} bị lệch số tiền với Deal ${inv.Placement.id}`);
        verifiedCount++;
      }
    }

    console.log(`     -> Đã xác thực thành công ${verifiedCount} cặp bản ghi trong CSDL.`);
  });

  // 5. Ghi nhật ký Audit Log đối soát thành công
  await test('5. Ghi nhận Audit Log cho chu trình đối soát tài chính', async () => {
    const audit = await AuditLog.create({
      action: 'RECONCILE_FEE_SUBTOTAL',
      module: 'INVOICES',
      details: `Huỳnh Nguyễn Vĩnh Phúc hoàn thành đối soát tài chính: Placement.serviceFee khớp 100% Invoice.subtotal.`
    });

    assert(audit.id, 'Phải tạo thành công bản ghi AuditLog');
  });

  // Dọn dẹp
  await test('6. Dọn dẹp dữ liệu kiểm thử an toàn', async () => {
    await invoice.destroy();
    await placement.destroy();
    console.log('     -> Dọn dẹp bản ghi test an toàn.');
  });

  console.log('\n====================================================');
  console.log(` KẾT QUẢ KIỂM THỬ: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    throw new Error(`TASK-094 thất bại: Có ${failed} test cases không đạt!`);
  }
  return true;
}

if (require.main === module) {
  runReconciliationFeeSubtotalTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runReconciliationFeeSubtotalTests };
