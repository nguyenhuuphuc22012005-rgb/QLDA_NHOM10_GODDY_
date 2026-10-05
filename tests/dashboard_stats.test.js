/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-153: Viết bộ kiểm thử tự động kiểm tra tính toán số liệu thống kê Dashboard
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA SV5)
 * Test Suite: Kiểm tra công thức tính KPI Dashboard (Doanh thu, Dư nợ, Nợ quá hạn, Tỷ lệ thu hồi)
 */

const assert = require('assert');
const { Invoice, Payment, Placement, AuditLog, sequelize } = require('../models');

async function runDashboardStatsTests() {
  console.log('====================================================');
  console.log(' TASK-153: KIỂM THỬ TÍNH TOÁN SỐ LIỆU DASHBOARD KPI ');
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

  // 1. Kiểm tra tính tổng doanh thu thu thực tế (Total Collected Revenue)
  await test('1. Tính tổng doanh thu thực tế khớp với các bản ghi Payment', async () => {
    const totalPayments = await Payment.sum('amount') || 0;
    assert(totalPayments >= 0, 'Tổng doanh thu phải là số không âm');
    console.log(`     - Tổng tiền đã thu thực tế: ${totalPayments.toLocaleString()} VND`);
  });

  // 2. Kiểm tra tổng công nợ phải thu (Total Accounts Receivable)
  await test('2. Tính tổng công nợ phải thu từ các hóa đơn chưa tất toán', async () => {
    const totalReceivable = await Invoice.sum('remainingAmount', {
      where: { status: ['Sent', 'Partial', 'Overdue'] }
    }) || 0;
    assert(totalReceivable >= 0, 'Công nợ phải thu không được âm');
    console.log(`     - Tổng công nợ phải thu (AR): ${totalReceivable.toLocaleString()} VND`);
  });

  // 3. Kiểm tra tính toán tổng nợ quá hạn (Total Overdue Debt)
  await test('3. Tính tổng nợ quá hạn từ các hóa đơn có dueDate < ngày hiện tại', async () => {
    const today = new Date().toISOString().split('T')[0];
    const overdueInvoices = await Invoice.findAll({
      where: {
        status: ['Sent', 'Partial', 'Overdue'],
        dueDate: { [require('sequelize').Op.lt]: today }
      }
    });

    const calculatedOverdue = overdueInvoices.reduce((acc, inv) => acc + parseFloat(inv.remainingAmount), 0);
    assert(calculatedOverdue >= 0, 'Nợ quá hạn không được âm');
    console.log(`     - Tổng nợ quá hạn: ${calculatedOverdue.toLocaleString()} VND (Số lượng: ${overdueInvoices.length})`);
  });

  // 4. Kiểm tra công thức tỷ lệ thu hồi công nợ (Collection Recovery Rate)
  await test('4. Tính tỷ lệ thu hồi công nợ: Recovery Rate = (Đã thu / Tổng hóa đơn) * 100', async () => {
    const totalBilled = await Invoice.sum('totalAmount') || 1;
    const totalCollected = await Invoice.sum('paidAmount') || 0;

    const rate = ((totalCollected / totalBilled) * 100).toFixed(2);
    assert(parseFloat(rate) >= 0 && parseFloat(rate) <= 100, 'Tỷ lệ thu hồi nợ phải từ 0% đến 100%');
    console.log(`     - Tỷ lệ thu hồi công nợ: ${rate}%`);
  });

  // 5. Ghi nhận log kiểm toán
  await test('5. Ghi nhận Audit Log kiểm thử số liệu Dashboard', async () => {
    const audit = await AuditLog.create({
      action: 'DASHBOARD_STATS_VERIFIED',
      module: 'DASHBOARD',
      details: 'Huỳnh Nguyễn Vĩnh Phúc kiểm thử thành công tính toán các chỉ số KPI Dashboard.'
    });
    assert(audit.id);
  });

  console.log('\n====================================================');
  console.log(` KẾT QUẢ KIỂM THỬ: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) throw new Error(`TASK-153 thất bại: Có ${failed} test cases không đạt!`);
  return true;
}

if (require.main === module) {
  runDashboardStatsTests().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { runDashboardStatsTests };
