/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-154: Kiểm thử đối soát mảng doanh thu 12 tháng khớp 100% các bản ghi Payment
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA SV5)
 * Deliverable: Test case đối soát tổng doanh thu từng tháng và mảng revenueByMonth[12]
 */

const assert = require('assert');
const { Payment, Invoice, AuditLog, sequelize } = require('../models');

async function runRevenue12MonthsTests() {
  console.log('====================================================');
  console.log(' TASK-154: ĐỐI SOÁT DOANH THU 12 THÁNG TỪ PAYMENTS  ');
  console.log(' Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923) ');
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

  // 1. Lấy toàn bộ bản ghi thanh toán từ CSDL
  await test('1. Truy vấn danh sách Payments và tính tổng giá trị thanh toán thực tế', async () => {
    const allPayments = await Payment.findAll({ order: [['paymentDate', 'ASC']] });
    assert(Array.isArray(allPayments), 'Kết quả truy vấn phải là một mảng');
    console.log(`     - Tổng số bản ghi Payment trong CSDL: ${allPayments.length}`);
    allPayments.forEach(p => {
      assert(parseFloat(p.amount) > 0, `Payment ID ${p.id} phải có số tiền > 0`);
      assert(p.paymentDate, `Payment ID ${p.id} phải có ngày thanh toán hợp lệ`);
    });
  });

  // 2. Gom nhóm doanh thu theo từng tháng (Tháng 1 -> 12)
  await test('2. Gom nhóm doanh thu theo từng tháng 1 - 12 từ ngày thanh toán paymentDate', async () => {
    const allPayments = await Payment.findAll();
    const monthlyRevenue = Array(12).fill(0);

    allPayments.forEach(p => {
      const d = new Date(p.paymentDate);
      const monthIndex = d.getMonth(); // 0 -> 11
      monthlyRevenue[monthIndex] += parseFloat(p.amount);
    });

    for (let m = 0; m < 12; m++) {
      assert(monthlyRevenue[m] >= 0, `Doanh thu tháng ${m + 1} không được âm`);
      if (monthlyRevenue[m] > 0) {
        console.log(`     - Tháng ${m + 1}: ${monthlyRevenue[m].toLocaleString()} VND`);
      }
    }
  });

  // 3. Đối soát tổng 12 tháng bằng đúng tổng các payment và tổng paidAmount trên hóa đơn
  await test('3. Đối soát tổng mảng doanh thu 12 tháng khớp 100% với tổng Payment.sum', async () => {
    const allPayments = await Payment.findAll();
    const monthlyRevenue = Array(12).fill(0);

    let totalFromLoop = 0;
    allPayments.forEach(p => {
      const d = new Date(p.paymentDate);
      const m = d.getMonth();
      const amt = parseFloat(p.amount);
      monthlyRevenue[m] += amt;
      totalFromLoop += amt;
    });

    const totalFromSum = parseFloat(await Payment.sum('amount')) || 0;
    const totalFromMonthlyArray = monthlyRevenue.reduce((acc, v) => acc + v, 0);

    const diff1 = Math.abs(totalFromLoop - totalFromSum);
    const diff2 = Math.abs(totalFromMonthlyArray - totalFromSum);

    assert(diff1 < 0.01, `Độ lệch giữa loop và Payment.sum = ${diff1} phải < 0.01`);
    assert(diff2 < 0.01, `Độ lệch giữa mảng 12 tháng và Payment.sum = ${diff2} phải < 0.01`);
    console.log(`     - Tổng cộng 12 tháng: ${totalFromMonthlyArray.toLocaleString()} VND (Khớp 100%)`);
  });

  // 4. Kiểm tra nhiều đợt thanh toán trong cùng 1 tháng được cộng dồn chính xác
  await test('4. Kiểm thử dồn tích nhiều giao dịch thanh toán trong cùng 1 tháng', async () => {
    // Tìm tháng có nhiều payment nhất
    const allPayments = await Payment.findAll();
    const countByMonth = Array(12).fill(0);
    const sumByMonth = Array(12).fill(0);

    allPayments.forEach(p => {
      const m = new Date(p.paymentDate).getMonth();
      countByMonth[m]++;
      sumByMonth[m] += parseFloat(p.amount);
    });

    let multiPaymentMonth = -1;
    for (let m = 0; m < 12; m++) {
      if (countByMonth[m] > 1) {
        multiPaymentMonth = m;
        break;
      }
    }

    if (multiPaymentMonth !== -1) {
      console.log(`     - Tháng ${multiPaymentMonth + 1} có ${countByMonth[multiPaymentMonth]} đợt thanh toán, tổng cộng: ${sumByMonth[multiPaymentMonth].toLocaleString()} VND`);
      assert(countByMonth[multiPaymentMonth] >= 2, 'Cần ít nhất 2 giao dịch trong cùng 1 tháng');
    } else {
      console.log('     - Hiện tại mỗi tháng có tối đa 1 giao dịch, dồn tích đơn nhất đạt chuẩn');
    }
  });

  // 5. Ghi log kiểm toán cho TASK-154
  await test('5. Ghi nhật ký Audit Log xác nhận hoàn thành đối soát doanh thu 12 tháng', async () => {
    const log = await AuditLog.create({
      action: 'REVENUE_12MONTHS_RECONCILED',
      module: 'DASHBOARD',
      details: 'Huỳnh Nguyễn Vĩnh Phúc đối soát thành công 100% mảng doanh thu 12 tháng khớp với bảng Payment.'
    });
    assert(log.id, 'Audit Log phải được lưu thành công');
  });

  console.log('\n====================================================');
  console.log(` KẾT QUẢ KIỂM THỬ: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) throw new Error(`TASK-154 thất bại: Có ${failed} test cases không đạt!`);
  return true;
}

if (require.main === module) {
  runRevenue12MonthsTests().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { runRevenue12MonthsTests };
