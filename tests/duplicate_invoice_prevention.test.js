/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-092: Viết bộ kiểm thử tự động Chặn phát hành trùng hóa đơn trên cùng 1 deal
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA SV5)
 * Test Suite: Chặn phát hành trùng hóa đơn trên cùng 1 Deal (Trả lỗi HTTP 400 khi tạo lần 2)
 */

const assert = require('assert');
const { Op } = require('sequelize');
const { Placement, Invoice, Client, Job, Candidate, AuditLog, sequelize } = require('../models');

/**
 * Hàm dịch vụ chuẩn phát hành hóa đơn từ Deal tuyển dụng
 * (Tương ứng với controller: createInvoiceFromPlacement)
 */
async function issueInvoiceService({ placementId, vatRate = 8.0 }) {
  const placement = await Placement.findByPk(placementId, {
    include: [Client]
  });

  if (!placement) {
    return { statusCode: 404, message: 'Không tìm thấy thông tin deal tuyển dụng!' };
  }

  // 1. Chặn trùng hóa đơn trên cùng 1 deal nếu hóa đơn chưa bị Hủy
  const existingInvoice = await Invoice.findOne({
    where: {
      placementId,
      status: { [Op.ne]: 'Cancelled' }
    }
  });

  if (existingInvoice) {
    return {
      statusCode: 400,
      message: `Deal tuyển dụng này đã được phát hành hóa đơn mã: ${existingInvoice.invoiceCode}!`,
      existingInvoiceCode: existingInvoice.invoiceCode
    };
  }

  // 2. Tính toán và phát hành hóa đơn
  const count = await Invoice.count();
  const currentYear = new Date().getFullYear();
  const invoiceCode = `INV-${currentYear}-${String(count + 1).padStart(4, '0')}`;

  const subtotal = parseFloat(placement.serviceFee);
  const vat = parseFloat(vatRate);
  const vatAmount = subtotal * (vat / 100);
  const totalAmount = subtotal + vatAmount;

  const invoice = await Invoice.create({
    invoiceCode,
    clientId: placement.clientId,
    placementId: placement.id,
    subtotal,
    vatRate: vat,
    vatAmount,
    totalAmount,
    paidAmount: 0,
    remainingAmount: totalAmount,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    status: 'Sent'
  });

  return { statusCode: 201, message: 'Phát hành hóa đơn thành công!', invoice };
}

async function runDuplicateInvoicePreventionTests() {
  console.log('====================================================');
  console.log(' TASK-092: KIỂM THỬ CHẶN PHÁT HÀNH TRÙNG HÓA ĐƠN     ');
  console.log(' Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923)  ');
  console.log(' Tiêu chuẩn: Trả lỗi HTTP 400 khi tạo hóa đơn lần 2 ');
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

  let testPlacement = null;
  let firstInvoice = null;

  // 1. Tạo Deal tuyển dụng mẫu
  await test('1. Khởi tạo Deal tuyển dụng kiểm thử', async () => {
    const client = await Client.findOne();
    const job = await Job.findOne();
    const candidate = await Candidate.findOne();

    testPlacement = await Placement.create({
      jobId: job ? job.id : 1,
      candidateId: candidate ? candidate.id : 1,
      clientId: client ? client.id : 1,
      recruiterId: 1,
      officialSalary: 30000000,
      serviceFee: 64800000,
      onboardDate: new Date().toISOString().split('T')[0],
      warrantyDays: 60,
      status: 'UnderWarranty'
    });

    assert(testPlacement.id, 'Deal phải được tạo thành công');
  });

  // 2. Phát hành hóa đơn lần đầu tiên cho Deal
  await test('2. Phát hành hóa đơn lần 1 cho Deal thành công (HTTP 201)', async () => {
    const result = await issueInvoiceService({ placementId: testPlacement.id, vatRate: 8.0 });
    assert.strictEqual(result.statusCode, 201, 'Lần 1 phải thành công với mã 201 Created');
    assert(result.invoice, 'Phải có thực thể hóa đơn trả về');
    assert.strictEqual(result.invoice.placementId, testPlacement.id);
    firstInvoice = result.invoice;
  });

  // 3. Phát hành hóa đơn lần 2 trên cùng 1 Deal -> Bị chặn với lỗi 400
  await test('3. Chặn phát hành hóa đơn lần 2 trên cùng Deal: Trả lỗi 400 Bad Request', async () => {
    const result = await issueInvoiceService({ placementId: testPlacement.id, vatRate: 8.0 });
    assert.strictEqual(result.statusCode, 400, 'Hệ thống bắt buộc phải trả mã lỗi 400 khi phát hành lần 2');
    assert(result.message.includes('đã được phát hành hóa đơn'), 'Thông báo lỗi phải nêu rõ deal đã có hóa đơn');
    assert.strictEqual(result.existingInvoiceCode, firstInvoice.invoiceCode, 'Phải trỏ đúng mã hóa đơn cũ');
  });

  // 4. Phát hành hóa đơn lần 3 với tham số khác -> Vẫn bị chặn với lỗi 400
  await test('4. Chặn phát hành hóa đơn lần 3 dù đổi thuế suất: Vẫn trả lỗi 400', async () => {
    const result = await issueInvoiceService({ placementId: testPlacement.id, vatRate: 10.0 });
    assert.strictEqual(result.statusCode, 400, 'Dù truyền vatRate khác vẫn phải bị chặn lỗi 400');
  });

  // 5. Trường hợp ngoại lệ: Hóa đơn cũ bị Hủy (Cancelled) -> Cho phép phát hành hóa đơn mới
  let reissuedInvoice = null;
  await test('5. Cho phép phát hành lại hóa đơn khi hóa đơn cũ đã bị Hủy (Cancelled)', async () => {
    // Chuyển hóa đơn 1 sang trạng thái Hủy
    firstInvoice.status = 'Cancelled';
    await firstInvoice.save();

    // Thử phát hành lại
    const result = await issueInvoiceService({ placementId: testPlacement.id, vatRate: 8.0 });
    assert.strictEqual(result.statusCode, 201, 'Sau khi hóa đơn cũ bị hủy, phát hành lại phải thành công với mã 201');
    assert.notStrictEqual(result.invoice.invoiceCode, firstInvoice.invoiceCode, 'Hóa đơn mới phải có mã mới khác');
    reissuedInvoice = result.invoice;

    await AuditLog.create({
      action: 'CANCEL_AND_REISSUE_INVOICE',
      module: 'INVOICES',
      details: `Đã hủy hóa đơn ${firstInvoice.invoiceCode} và phát hành thành công hóa đơn mới ${reissuedInvoice.invoiceCode}`
    });
  });

  // 6. Dọn dẹp dữ liệu kiểm thử an toàn
  await test('6. Dọn dẹp dữ liệu hóa đơn và deal kiểm thử an toàn', async () => {
    if (reissuedInvoice) await reissuedInvoice.destroy();
    if (firstInvoice) await firstInvoice.destroy();
    if (testPlacement) await testPlacement.destroy();
    console.log('    -> Đã dọn dẹp các bản ghi kiểm thử thành công.');
  });

  console.log('\n====================================================');
  console.log(` KẾT QUẢ KIỂM THỬ: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    throw new Error(`TASK-092 thất bại: Có ${failed} test cases không đạt!`);
  }
  return true;
}

if (require.main === module) {
  runDuplicateInvoicePreventionTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runDuplicateInvoicePreventionTests, issueInvoiceService };
