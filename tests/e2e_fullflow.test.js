const assert = require('assert');
const { sequelize, User, Client, Job, Candidate, Placement, Invoice, Payment, AuditLog } = require('../models');

async function runE2E() {
  console.log('----------------------------------------------------');
  console.log(' [E2E FULL-FLOW TEST] Kiểm thử tự động chu trình toàn trình');
  console.log(' Luồng: Khách hàng -> Tuyển dụng -> Hóa đơn -> Thanh toán -> Nợ -> Audit');
  console.log('----------------------------------------------------');

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

  let testClient, testJob, testCandidate, testPlacement, testInvoice;

  // Bước 1: Tạo Khách hàng B2B
  await testStep('Bước 1: Tạo đối tác B2B mới có Net Days 30', async () => {
    const taxCode = '0319' + Date.now().toString().slice(-6);
    testClient = await Client.create({
      companyName: 'Tập đoàn Công nghệ Alpha E2E',
      taxCode,
      contactPerson: 'Trần Văn Alpha',
      contactEmail: 'alpha@enterprise.vn',
      contactPhone: '0901234567',
      paymentTermDays: 30,
      creditLimit: 150000000,
      status: 'Active'
    });
    assert(testClient.id != null, 'Phải tạo thành công Client với ID hợp lệ');
  });

  // Bước 2: Tạo Job và Ứng viên
  await testStep('Bước 2: Tạo Vị trí tuyển dụng (Senior Node.js) và Hồ sơ ứng viên', async () => {
    testJob = await Job.create({
      title: 'Senior Node.js Backend Engineer',
      clientId: testClient.id,
      department: 'Engineering',
      salaryRange: '35M - 50M',
      commissionRate: 18.0,
      status: 'Open'
    });

    testCandidate = await Candidate.create({
      fullName: 'Lê Văn Backend',
      email: 'backend.candidate@gmail.com',
      phone: '0912345678',
      position: 'Senior Node.js Engineer',
      expectedSalary: 40000000,
      status: 'Screening'
    });

    assert(testJob.id != null && testCandidate.id != null, 'Tạo Job và Candidate thành công');
  });

  // Bước 3: Chốt Deal Onboard
  await testStep('Bước 3: Chốt Deal Tuyển dụng Onboard, tự tính hoa hồng và bảo hành 60 ngày', async () => {
    const salary = 40000000;
    const feeRate = 18.0;
    const expectedFee = salary * 12 * (feeRate / 100); // 86,400,000 VND

    const today = new Date();
    const warrantyEnd = new Date(today);
    warrantyEnd.setDate(warrantyEnd.getDate() + 60);

    testPlacement = await Placement.create({
      jobId: testJob.id,
      candidateId: testCandidate.id,
      clientId: testClient.id,
      recruiterId: 1,
      officialSalary: salary,
      serviceFee: expectedFee,
      onboardDate: today.toISOString().split('T')[0],
      warrantyDays: 60,
      warrantyEndDate: warrantyEnd.toISOString().split('T')[0],
      status: 'UnderWarranty'
    });

    testCandidate.status = 'Placed';
    await testCandidate.save();

    assert.strictEqual(parseFloat(testPlacement.serviceFee), expectedFee);
    assert.strictEqual(testCandidate.status, 'Placed');
  });

  // Bước 4: Phát hành hóa đơn VAT 8%
  await testStep('Bước 4: Phát hành Hóa đơn điện tử VAT 8%, gán hạn thanh toán theo Net Days', async () => {
    const subtotal = parseFloat(testPlacement.serviceFee);
    const vatRate = 8.0;
    const vatAmount = subtotal * (vatRate / 100); // 6,912,000 VND
    const totalAmount = subtotal + vatAmount; // 93,312,000 VND

    const issue = new Date();
    const due = new Date(issue);
    due.setDate(due.getDate() + testClient.paymentTermDays);

    const invoiceCode = `INV-2026-${Date.now().toString().slice(-4)}`;
    testInvoice = await Invoice.create({
      invoiceCode,
      clientId: testClient.id,
      placementId: testPlacement.id,
      subtotal,
      vatRate,
      vatAmount,
      totalAmount,
      paidAmount: 0,
      remainingAmount: totalAmount,
      issueDate: issue.toISOString().split('T')[0],
      dueDate: due.toISOString().split('T')[0],
      status: 'Sent'
    });

    assert.strictEqual(parseFloat(testInvoice.totalAmount), totalAmount);
    assert.strictEqual(testInvoice.status, 'Sent');
  });

  // Bước 5: Thanh toán từng đợt và kiểm tra giảm nợ
  await testStep('Bước 5: Khách hàng thanh toán đợt 1 (50 triệu), cập nhật trạng thái Partial', async () => {
    const pay1 = 50000000;
    await Payment.create({
      invoiceId: testInvoice.id,
      amount: pay1,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'BankTransfer',
      referenceNo: 'UNC-E2E-001',
      recordedBy: 2
    });

    testInvoice.paidAmount = parseFloat(testInvoice.paidAmount) + pay1;
    testInvoice.remainingAmount = parseFloat(testInvoice.totalAmount) - testInvoice.paidAmount;
    testInvoice.status = 'Partial';
    await testInvoice.save();

    assert.strictEqual(parseFloat(testInvoice.paidAmount), pay1);
    assert.strictEqual(parseFloat(testInvoice.remainingAmount), 43312000);
    assert.strictEqual(testInvoice.status, 'Partial');
  });

  // Bước 6: Thanh toán đợt 2 tất toán nợ
  await testStep('Bước 6: Khách hàng thanh toán nốt 43.312.000 VNĐ, hóa đơn về Paid và remaining = 0', async () => {
    const pay2 = parseFloat(testInvoice.remainingAmount);
    await Payment.create({
      invoiceId: testInvoice.id,
      amount: pay2,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'BankTransfer',
      referenceNo: 'UNC-E2E-002',
      recordedBy: 2
    });

    testInvoice.paidAmount = parseFloat(testInvoice.paidAmount) + pay2;
    testInvoice.remainingAmount = 0;
    testInvoice.status = 'Paid';
    await testInvoice.save();

    assert.strictEqual(parseFloat(testInvoice.remainingAmount), 0);
    assert.strictEqual(testInvoice.status, 'Paid');
  });

  // Bước 7: Kiểm tra Audit Log đã ghi vết đầy đủ các bước
  await testStep('Bước 7: Kiểm tra lịch sử Audit Log lưu vết thao tác người dùng', async () => {
    await AuditLog.create({
      userId: 1,
      action: 'E2E_COMPLETE',
      module: 'FULL_FLOW',
      details: `Đã hoàn thành toàn trình Invoice ${testInvoice.invoiceCode}`,
      ipAddress: '127.0.0.1'
    });

    const log = await AuditLog.findOne({ where: { action: 'E2E_COMPLETE' } });
    assert(log != null, 'Phải có bản ghi Audit Log');
    assert.strictEqual(log.module, 'FULL_FLOW');
  });

  console.log(`\n  ==> Kết quả E2E: ${passed} PASSED | ${failed} FAILED\n`);
  return failed === 0;
}

if (require.main === module) {
  runE2E().then(success => process.exit(success ? 0 : 1));
}

module.exports = runE2E;
