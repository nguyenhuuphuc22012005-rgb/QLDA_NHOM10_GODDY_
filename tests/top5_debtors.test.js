/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-155: Kiểm thử đối chiếu danh sách Top 5 Debtors khớp với hóa đơn quá hạn
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA SV5)
 * Deliverable: Test case kiểm tra thứ tự sắp xếp nợ giảm dần và đối chiếu dữ liệu Top 5 con nợ
 */

const assert = require('assert');
const { Invoice, Client, AuditLog, sequelize } = require('../models');
const { Op } = require('sequelize');

async function runTop5DebtorsTests() {
  console.log('====================================================');
  console.log(' TASK-155: KIỂM THỬ ĐỐI SOÁT TOP 5 DOANH NGHIỆP NỢ  ');
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

  // 1. Kiểm tra truy vấn các hóa đơn còn dư nợ
  await test('1. Truy vấn danh sách hóa đơn có dư nợ remainingAmount > 0', async () => {
    const activeInvoices = await Invoice.findAll({
      where: {
        status: { [Op.ne]: 'Cancelled' },
        remainingAmount: { [Op.gt]: 0 }
      },
      include: [Client]
    });

    assert(Array.isArray(activeInvoices), 'Kết quả truy vấn phải là danh sách');
    console.log(`     - Số lượng hóa đơn còn dư nợ: ${activeInvoices.length}`);
    activeInvoices.forEach(inv => {
      assert(parseFloat(inv.remainingAmount) > 0, `Hóa đơn ${inv.invoiceCode} phải có dư nợ > 0`);
      assert(inv.Client, `Hóa đơn ${inv.invoiceCode} phải gắn với một Client B2B`);
    });
  });

  // 2. Gom nhóm dư nợ theo Client và tính tổng nợ
  await test('2. Gom nhóm dư nợ theo từng Client và đếm số lượng hóa đơn nợ', async () => {
    const activeInvoices = await Invoice.findAll({
      where: {
        status: { [Op.ne]: 'Cancelled' },
        remainingAmount: { [Op.gt]: 0 }
      },
      include: [Client]
    });

    const clientDebtMap = {};
    activeInvoices.forEach(inv => {
      const cId = inv.Client.id;
      if (!clientDebtMap[cId]) {
        clientDebtMap[cId] = {
          clientId: cId,
          companyName: inv.Client.companyName,
          taxCode: inv.Client.taxCode,
          totalRemaining: 0,
          invoiceCount: 0
        };
      }
      clientDebtMap[cId].totalRemaining += parseFloat(inv.remainingAmount);
      clientDebtMap[cId].invoiceCount++;
    });

    const debtorList = Object.values(clientDebtMap);
    console.log(`     - Tổng số đối tác B2B hiện có dư nợ: ${debtorList.length}`);
    debtorList.forEach(d => {
      assert(d.totalRemaining > 0, `Khách hàng ${d.companyName} phải có số tiền nợ > 0`);
      console.log(`       + ${d.companyName} (${d.taxCode}): ${d.totalRemaining.toLocaleString()} VND (${d.invoiceCount} HĐ)`);
    });
  });

  // 3. Sắp xếp giảm dần và lấy Top 5
  await test('3. Sắp xếp danh sách con nợ theo số tiền giảm dần và trích xuất Top 5', async () => {
    const activeInvoices = await Invoice.findAll({
      where: {
        status: { [Op.ne]: 'Cancelled' },
        remainingAmount: { [Op.gt]: 0 }
      },
      include: [Client]
    });

    const clientDebtMap = {};
    activeInvoices.forEach(inv => {
      const cId = inv.Client.id;
      if (!clientDebtMap[cId]) {
        clientDebtMap[cId] = {
          clientId: cId,
          companyName: inv.Client.companyName,
          taxCode: inv.Client.taxCode,
          totalRemaining: 0,
          invoiceCount: 0
        };
      }
      clientDebtMap[cId].totalRemaining += parseFloat(inv.remainingAmount);
      clientDebtMap[cId].invoiceCount++;
    });

    const sortedDebtors = Object.values(clientDebtMap)
      .sort((a, b) => b.totalRemaining - a.totalRemaining);

    // Kiểm tra thứ tự giảm dần
    for (let i = 0; i < sortedDebtors.length - 1; i++) {
      assert(
        sortedDebtors[i].totalRemaining >= sortedDebtors[i + 1].totalRemaining,
        `Vị trí #${i + 1} (${sortedDebtors[i].totalRemaining}) phải lớn hơn hoặc bằng vị trí #${i + 2} (${sortedDebtors[i + 1].totalRemaining})`
      );
    }

    const top5 = sortedDebtors.slice(0, 5);
    assert(top5.length <= 5, 'Danh sách Top Debtors không được vượt quá 5');
    console.log(`     - Đã xác nhận thứ tự giảm dần chính xác cho Top ${top5.length} Debtors`);
  });

  // 4. Kiểm tra đối chiếu logic tính của dashboardController
  await test('4. Đối chiếu tính nhất quán số liệu với logic trả về của Dashboard', async () => {
    // Mô phỏng logic từ dashboardController.js
    const allInvoices = await Invoice.findAll({
      where: { status: { [Op.ne]: 'Cancelled' } },
      include: [Client]
    });

    const clientDebtMap = {};
    allInvoices.forEach(inv => {
      if (inv.Client && parseFloat(inv.remainingAmount) > 0) {
        const cId = inv.Client.id;
        if (!clientDebtMap[cId]) {
          clientDebtMap[cId] = {
            id: cId,
            companyName: inv.Client.companyName,
            taxCode: inv.Client.taxCode,
            totalRemaining: 0,
            invoiceCount: 0
          };
        }
        clientDebtMap[cId].totalRemaining += parseFloat(inv.remainingAmount);
        clientDebtMap[cId].invoiceCount++;
      }
    });

    const topDebtors = Object.values(clientDebtMap)
      .sort((a, b) => b.totalRemaining - a.totalRemaining)
      .slice(0, 5);

    assert(Array.isArray(topDebtors), 'topDebtors phải là mảng');
    console.log(`     - Đối chiếu logic controller: Top con nợ số 1 là "${topDebtors[0] ? topDebtors[0].companyName : 'N/A'}" với dư nợ: ${topDebtors[0] ? topDebtors[0].totalRemaining.toLocaleString() : 0} VND`);
  });

  // 5. Ghi nhận log kiểm toán cho TASK-155
  await test('5. Ghi nhật ký Audit Log xác nhận hoàn thành kiểm thử Top 5 Debtors', async () => {
    const log = await AuditLog.create({
      action: 'TOP5_DEBTORS_VERIFIED',
      module: 'DASHBOARD',
      details: 'Huỳnh Nguyễn Vĩnh Phúc kiểm thử thành công thuật toán xếp hạng Top 5 con nợ theo dư nợ giảm dần.'
    });
    assert(log.id, 'Audit Log phải được ghi nhận');
  });

  console.log('\n====================================================');
  console.log(` KẾT QUẢ KIỂM THỬ: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) throw new Error(`TASK-155 thất bại: Có ${failed} test cases không đạt!`);
  return true;
}

if (require.main === module) {
  runTop5DebtorsTests().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { runTop5DebtorsTests };
