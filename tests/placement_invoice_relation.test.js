/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-090: Cấu hình quan hệ Placement 1 - 1 Invoice trong Sequelize ORM
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA SV5)
 * Test Suite: Quan hệ 1 - 1 giữa Placement và Invoice & Ràng buộc Foreign Key
 */

const assert = require('assert');
const { Placement, Invoice, Client, Job, Candidate, User, sequelize } = require('../models');

async function runPlacementInvoiceRelationTests() {
  console.log('====================================================');
  console.log(' TASK-090: KIỂM THỬ QUAN HỆ 1 - 1 PLACEMENT & INVOICE');
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

  let client, job, candidate, placement, invoice;

  // 1. Khởi tạo đối tượng Placement mẫu
  await test('1. Tạo bản ghi Deal Placement chuẩn bị kiểm thử quan hệ', async () => {
    client = await Client.findOne();
    job = await Job.findOne();
    candidate = await Candidate.findOne();

    placement = await Placement.create({
      jobId: job ? job.id : 1,
      candidateId: candidate ? candidate.id : 1,
      clientId: client ? client.id : 1,
      recruiterId: 1,
      officialSalary: 40000000,
      serviceFee: 86400000, // 40tr * 12 * 18%
      onboardDate: new Date().toISOString().split('T')[0],
      warrantyDays: 60,
      status: 'UnderWarranty'
    });

    assert(placement.id, 'Placement phải được tạo thành công');
  });

  // 2. Tạo Hóa đơn Invoice liên kết 1-1 với Placement
  await test('2. Khởi tạo Hóa đơn Invoice gắn foreign key placementId', async () => {
    const subtotal = parseFloat(placement.serviceFee);
    const vatRate = 8.0;
    const vatAmount = subtotal * (vatRate / 100);
    const totalAmount = subtotal + vatAmount;

    invoice = await Invoice.create({
      invoiceCode: `INV-REL-${Date.now().toString().slice(-4)}`,
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

    assert(invoice.id, 'Invoice phải được tạo thành công');
    assert.strictEqual(invoice.placementId, placement.id, 'Khóa ngoại placementId phải khớp với Placement.id');
  });

  // 3. Kiểm tra liên kết ngược Placement.hasOne(Invoice)
  await test('3. Kiểm tra Placement.findOne kèm include Invoice (Eager Loading)', async () => {
    const fetchedPlacement = await Placement.findByPk(placement.id, {
      include: [{ model: Invoice }]
    });

    assert(fetchedPlacement, 'Phải tìm thấy Placement');
    assert(fetchedPlacement.Invoice, 'Placement phải chứa thực thể liên kết Invoice 1-1');
    assert.strictEqual(fetchedPlacement.Invoice.id, invoice.id);
    assert.strictEqual(fetchedPlacement.Invoice.invoiceCode, invoice.invoiceCode);
  });

  // 4. Kiểm tra liên kết xuôi Invoice.belongsTo(Placement)
  await test('4. Kiểm tra Invoice.findOne kèm include Placement (Eager Loading)', async () => {
    const fetchedInvoice = await Invoice.findByPk(invoice.id, {
      include: [{ model: Placement }]
    });

    assert(fetchedInvoice, 'Phải tìm thấy Invoice');
    assert(fetchedInvoice.Placement, 'Invoice phải chứa thực thể liên kết Placement gốc');
    assert.strictEqual(fetchedInvoice.Placement.id, placement.id);
    assert.strictEqual(parseFloat(fetchedInvoice.Placement.serviceFee), parseFloat(placement.serviceFee));
  });

  // Dọn dẹp dữ liệu test
  await test('5. Dọn dẹp bản ghi kiểm thử an toàn', async () => {
    await invoice.destroy();
    await placement.destroy();
    console.log('    -> Đã dọn dẹp các bản ghi test sạch sẽ.');
  });

  console.log('\n====================================================');
  console.log(` KẾT QUẢ KIỂM THỬ: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    throw new Error(`TASK-090 thất bại: Có ${failed} test cases không đạt!`);
  }
  return true;
}

if (require.main === module) {
  runPlacementInvoiceRelationTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runPlacementInvoiceRelationTests };
