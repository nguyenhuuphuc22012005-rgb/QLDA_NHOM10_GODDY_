/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-093: Cập nhật seed data mẫu với các hóa đơn thực tế phát hành cho FPT, VNG, Shopee
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA SV5)
 * Bàn giao: Seed 6 hóa đơn với đầy đủ 6 trạng thái khác nhau (Paid, Partial, Sent, Overdue, Draft, Cancelled)
 */

const { sequelize, Client, Placement, Invoice, AuditLog } = require('../models');

async function seedInvoicesData() {
  console.log('====================================================');
  console.log(' TASK-093: SEED DỮ LIỆU 6 HÓA ĐƠN MẪU ĐA TRẠNG THÁI ');
  console.log(' Khách hàng: FPT Software, VNG, Shopee, Viettel     ');
  console.log(' Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923) ');
  console.log('====================================================\n');

  try {
    // 1. Lấy thông tin khách hàng
    const clients = await Client.findAll();
    if (clients.length === 0) {
      console.log('  [WARN] Chưa có khách hàng, vui lòng chạy seed_enterprise_data trước!');
      return false;
    }

    const fpt = clients.find(c => c.companyName.includes('FPT')) || clients[0];
    const vng = clients.find(c => c.companyName.includes('VNG')) || clients[1] || clients[0];
    const shopee = clients.find(c => c.companyName.includes('Shopee')) || clients[2] || clients[0];
    const viettel = clients.find(c => c.companyName.includes('Viettel')) || clients[3] || clients[0];

    // Ngày tham chiếu
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 45);
    const pastDueDateStr = pastDate.toISOString().split('T')[0];

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const futureDueDateStr = futureDate.toISOString().split('T')[0];

    // Xóa các hóa đơn cũ có mã INV-SEED- để tránh trùng lặp
    await Invoice.destroy({ where: { invoiceCode: { [require('sequelize').Op.like]: 'INV-SEED-%' } } });

    // 2. Danh sách 6 hóa đơn mẫu
    const invoiceList = [
      {
        invoiceCode: 'INV-SEED-2026-0001',
        clientId: fpt.id,
        placementId: null,
        subtotal: 64800000.00,
        vatRate: 8.0,
        vatAmount: 5184000.00,
        totalAmount: 69984000.00,
        paidAmount: 69984000.00,
        remainingAmount: 0.00,
        issueDate: pastDueDateStr,
        dueDate: pastDueDateStr,
        status: 'Paid'
      },
      {
        invoiceCode: 'INV-SEED-2026-0002',
        clientId: vng.id,
        placementId: null,
        subtotal: 75600000.00,
        vatRate: 8.0,
        vatAmount: 6048000.00,
        totalAmount: 81648000.00,
        paidAmount: 40000000.00,
        remainingAmount: 41648000.00,
        issueDate: pastDueDateStr,
        dueDate: futureDueDateStr,
        status: 'Partial'
      },
      {
        invoiceCode: 'INV-SEED-2026-0003',
        clientId: shopee.id,
        placementId: null,
        subtotal: 86400000.00,
        vatRate: 8.0,
        vatAmount: 6912000.00,
        totalAmount: 93312000.00,
        paidAmount: 0.00,
        remainingAmount: 93312000.00,
        issueDate: todayStr,
        dueDate: futureDueDateStr,
        status: 'Sent'
      },
      {
        invoiceCode: 'INV-SEED-2026-0004',
        clientId: viettel.id,
        placementId: null,
        subtotal: 54000000.00,
        vatRate: 8.0,
        vatAmount: 4320000.00,
        totalAmount: 58320000.00,
        paidAmount: 0.00,
        remainingAmount: 58320000.00,
        issueDate: pastDueDateStr,
        dueDate: pastDueDateStr, // Quá hạn
        status: 'Overdue'
      },
      {
        invoiceCode: 'INV-SEED-2026-0005',
        clientId: fpt.id,
        placementId: null,
        subtotal: 48000000.00,
        vatRate: 8.0,
        vatAmount: 3840000.00,
        totalAmount: 51840000.00,
        paidAmount: 0.00,
        remainingAmount: 51840000.00,
        issueDate: todayStr,
        dueDate: futureDueDateStr,
        status: 'Draft'
      },
      {
        invoiceCode: 'INV-SEED-2026-0006',
        clientId: vng.id,
        placementId: null,
        subtotal: 60000000.00,
        vatRate: 8.0,
        vatAmount: 4800000.00,
        totalAmount: 64800000.00,
        paidAmount: 0.00,
        remainingAmount: 0.00,
        issueDate: pastDueDateStr,
        dueDate: pastDueDateStr,
        status: 'Cancelled'
      }
    ];

    const createdInvoices = await Invoice.bulkCreate(invoiceList);
    console.log(`  [PASS] 1. Khởi tạo thành công ${createdInvoices.length}/6 hóa đơn mẫu.`);
    createdInvoices.forEach(inv => {
      console.log(`     - [${inv.invoiceCode}] Khách hàng ID: ${inv.clientId} | Tổng tiền: ${inv.totalAmount.toLocaleString()}đ | Trạng thái: ${inv.status}`);
    });

    // Tạo Payments tương ứng cho các hóa đơn đã thanh toán để đảm bảo toàn vẹn dữ liệu
    const { Payment } = require('../models');
    const invSeed1 = createdInvoices.find(i => i.invoiceCode === 'INV-SEED-2026-0001');
    const invSeed2 = createdInvoices.find(i => i.invoiceCode === 'INV-SEED-2026-0002');

    if (invSeed1) {
      await Payment.create({
        invoiceId: invSeed1.id,
        amount: 69984000.00,
        paymentDate: pastDueDateStr,
        paymentMethod: 'BankTransfer',
        referenceCode: 'UNC-SEED-FPT-001',
        notes: 'Thanh toán tất toán 100% hóa đơn INV-SEED-2026-0001'
      });
    }

    if (invSeed2) {
      await Payment.create({
        invoiceId: invSeed2.id,
        amount: 40000000.00,
        paymentDate: pastDueDateStr,
        paymentMethod: 'BankTransfer',
        referenceCode: 'UNC-SEED-VNG-002',
        notes: 'Thanh toán đợt 1 (Partial) hóa đơn INV-SEED-2026-0002'
      });
    }

    await AuditLog.create({
      action: 'SEED_INVOICES',
      module: 'INVOICES',
      details: `Huỳnh Nguyễn Vĩnh Phúc đã nạp 6 hóa đơn mẫu (Paid, Partial, Sent, Overdue, Draft, Cancelled) kèm các bản ghi thanh toán Payment đối soát tương ứng.`
    });

    console.log('\n====================================================');
    console.log('>>> TASK-093: NẠP DỮ LIỆU 6 HÓA ĐƠN MẪU HOÀN TẤT! <<<');
    console.log('====================================================\n');
    return true;
  } catch (err) {
    console.error('  [FAIL] Lỗi nạp hóa đơn mẫu:', err.message);
    return false;
  }
}

if (require.main === module) {
  seedInvoicesData().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { seedInvoicesData };
