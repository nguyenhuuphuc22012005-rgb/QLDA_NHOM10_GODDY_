/**
 * Script Kiểm Tra Tính Toàn Vẹn CSDL Sau Demo (TASK-209)
 * Phụ trách: Huỳnh Nguyễn Vĩnh Phúc (Tester & Database Admin - SV5)
 * Kiểm tra: Khóa ngoại, tính khớp số dư công nợ, VAT và tài khoản
 */

const { sequelize, User, Client, Job, Candidate, Placement, Invoice, Payment, AuditLog } = require('../models');

async function checkDatabaseIntegrity() {
  console.log('===============================================================');
  console.log('     KIỂM TRA TÍNH TOÀN VẸN DỮ LIỆU CSDL (DATABASE INTEGRITY)   ');
  console.log('     Đồ Án Nhóm 10 - GODDY Recruit | Phụ trách: SV5 Vĩnh Phúc   ');
  console.log('===============================================================\n');

  let checksPassed = 0;
  let checksFailed = 0;

  function logCheck(name, success, message) {
    if (success) {
      console.log(`  [PASS] ${name}`);
      if (message) console.log(`         -> ${message}`);
      checksPassed++;
    } else {
      console.error(`  [FAIL] ${name}`);
      console.error(`         -> LỖI: ${message}`);
      checksFailed++;
    }
  }

  try {
    await sequelize.authenticate();
    logCheck('1. Kết nối CSDL', true, 'Kết nối SQLite/PostgreSQL hoạt động ổn định');

    // 1. Kiểm tra Người Dùng & Bảo Mật Mật Khẩu
    const users = await User.findAll();
    const plainPasswords = users.filter(u => !u.password.startsWith('$2a$') && !u.password.startsWith('$2b$'));
    logCheck('2. Toàn vẹn Mật khẩu User', plainPasswords.length === 0, 
      plainPasswords.length === 0 ? `100% (${users.length}/${users.length}) tài khoản đã được băm bcrypt` : `Có ${plainPasswords.length} user chưa hash mật khẩu!`);

    // 2. Kiểm tra Quan Hệ Khóa Ngoại Placement -> Job, Candidate, Client
    const placements = await Placement.findAll();
    let orphanPlacements = 0;
    for (const p of placements) {
      const client = await Client.findByPk(p.clientId);
      const job = await Job.findByPk(p.jobId);
      const candidate = await Candidate.findByPk(p.candidateId);
      if (!client || !job || !candidate) orphanPlacements++;
    }
    logCheck('3. Toàn vẹn Khóa ngoại Placement (Client, Job, Candidate)', orphanPlacements === 0,
      `Tất cả ${placements.length} deal placement đều có quan hệ hợp lệ`);

    // 3. Kiểm tra Toán Học Hóa Đơn (subtotal + vatAmount == totalAmount)
    const invoices = await Invoice.findAll();
    let invalidVATCount = 0;
    let balanceMismatchCount = 0;
    let negativeBalanceCount = 0;

    for (const inv of invoices) {
      const sub = parseFloat(inv.subtotal);
      const vat = parseFloat(inv.vatAmount);
      const tot = parseFloat(inv.totalAmount);
      const paid = parseFloat(inv.paidAmount);
      const rem = parseFloat(inv.remainingAmount);

      // Sai lệch thuế VAT > 1 VND
      if (Math.abs((sub + vat) - tot) > 1.0) invalidVATCount++;

      // Sai lệch số dư: Hóa đơn hoạt động thì total - paid == remaining; Hóa đơn Cancelled thì remaining == 0
      if (inv.status !== 'Cancelled') {
        if (Math.abs((tot - paid) - rem) > 1.0) balanceMismatchCount++;
      } else {
        if (rem !== 0) balanceMismatchCount++;
      }

      // Số dư âm
      if (rem < 0 || paid < 0) negativeBalanceCount++;
    }

    logCheck('4. Khớp toán học Thuế GTGT 8% (subtotal + VAT = Total)', invalidVATCount === 0,
      `100% (${invoices.length}/${invoices.length}) hóa đơn có tổng tiền khớp tuyệt đối`);

    logCheck('5. Khớp số dư công nợ (Total - Paid = Remaining)', balanceMismatchCount === 0,
      `100% hóa đơn khớp đúng công thức tài chính đối soát nợ`);

    logCheck('6. Không có dư nợ âm hoặc thanh toán thừa (Zero Overpayment)', negativeBalanceCount === 0,
      `Không phát hiện hóa đơn nào có remainingAmount < 0`);

    // 4. Kiểm tra Quan Hệ Khóa Ngoại Payment -> Invoice
    const payments = await Payment.findAll();
    let orphanPayments = 0;
    for (const pm of payments) {
      const inv = await Invoice.findByPk(pm.invoiceId);
      if (!inv) orphanPayments++;
    }
    logCheck('7. Toàn vẹn Khóa ngoại Payment -> Invoice', orphanPayments === 0,
      `Tất cả ${payments.length} phiếu thu/thanh toán đều gắn đúng mã hóa đơn`);

    // 5. Kiểm tra Nhật ký Audit Log
    const logsCount = await AuditLog.count();
    logCheck('8. Hệ thống lưu vết Audit Log', logsCount > 0,
      `Đã ghi nhận tổng cộng ${logsCount} sự kiện thao tác người dùng`);

    console.log('\n===============================================================');
    console.log(` KẾT QUẢ ĐỐI SOÁT TOÀN VẸN: ${checksPassed} ĐẠT | ${checksFailed} LỖI`);
    console.log('===============================================================');
    
    if (checksFailed === 0) {
      console.log('>>> CƠ SỞ DỮ LIỆU ĐẠT CHUẨN TOÀN VẸN 100% CHO BUỔI BẢO VỆ ĐỒ ÁN! <<<\n');
      process.exit(0);
    } else {
      console.error('>>> CẦN XỬ LÝ LỖI TOÀN VẸN TRƯỚC KHI BẢO VỆ <<<\n');
      process.exit(1);
    }
  } catch (err) {
    console.error('[Lỗi kiểm tra toàn vẹn]:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  checkDatabaseIntegrity();
}

module.exports = checkDatabaseIntegrity;
