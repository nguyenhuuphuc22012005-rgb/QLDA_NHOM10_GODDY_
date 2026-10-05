/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-125: Tạo chỉ mục Database Indexes tối ưu tốc độ truy vấn cho dueDate và status
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA SV5)
 * Bàn giao: Migration script tự động tạo Composite Indexes cho Invoices & Payments
 */

const { sequelize, AuditLog } = require('../models');

async function migrateOptimizeIndexes() {
  console.log('====================================================');
  console.log(' TASK-125: TẠO DATABASE INDEXES TỐI ƯU TRUY VẤN NỢ  ');
  console.log(' Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923)  ');
  console.log(' Chỉ mục: Invoices (dueDate, status), Payments(invoiceId)');
  console.log('====================================================\n');

  try {
    const dialect = sequelize.getDialect();
    console.log(`[Database] Đang kết nối CSDL (Dialect: ${dialect})`);

    // Danh sách các chỉ mục tối ưu hiệu năng
    const indexQueries = [
      {
        name: 'idx_invoices_status_duedate',
        table: 'Invoices',
        sql: `CREATE INDEX IF NOT EXISTS idx_invoices_status_duedate ON Invoices (status, dueDate);`
      },
      {
        name: 'idx_invoices_due_date',
        table: 'Invoices',
        sql: `CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON Invoices (dueDate);`
      },
      {
        name: 'idx_invoices_client_id',
        table: 'Invoices',
        sql: `CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON Invoices (clientId);`
      },
      {
        name: 'idx_payments_invoice_id',
        table: 'Payments',
        sql: `CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON Payments (invoiceId);`
      },
      {
        name: 'idx_payments_payment_date',
        table: 'Payments',
        sql: `CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON Payments (paymentDate);`
      }
    ];

    console.log('>>> [1/3] Đang khởi tạo các chỉ mục Database Indexes...');
    for (const idx of indexQueries) {
      await sequelize.query(idx.sql);
      console.log(`  [PASS] Đã tạo thành công index: ${idx.name} trên bảng ${idx.table}`);
    }

    // 2. Kiểm tra hiệu năng bằng EXPLAIN QUERY PLAN (SQLite)
    console.log('\n>>> [2/3] Kiểm tra tối ưu EXPLAIN QUERY PLAN cho truy vấn nợ quá hạn...');
    try {
      const [explainPlan] = await sequelize.query(`
        EXPLAIN QUERY PLAN
        SELECT id, invoiceCode, remainingAmount, dueDate, status
        FROM Invoices
        WHERE status IN ('Sent', 'Partial', 'Overdue') AND dueDate < date('now');
      `);
      console.log('  [EXPLAIN PLAN Kết quả]:');
      console.log(explainPlan);
    } catch (e) {
      console.log('  (Explain query plan bỏ qua trên môi trường hiện tại)');
    }

    // 3. Ghi log kiểm toán
    await AuditLog.create({
      action: 'OPTIMIZE_DATABASE_INDEXES',
      module: 'DATABASE',
      details: 'Huỳnh Nguyễn Vĩnh Phúc đã tạo thành công 5 chỉ mục Indexes (idx_invoices_status_duedate, idx_payments_invoice_id,...) tối ưu hóa truy vấn nợ.'
    });

    console.log('\n====================================================');
    console.log('>>> TASK-125: TẠO CHỈ MỤC TỐI ƯU CSDL HOÀN TẤT 100%! <<<');
    console.log('====================================================\n');
    return true;
  } catch (err) {
    console.error('  [FAIL] Lỗi tạo chỉ mục:', err.message);
    return false;
  }
}

if (require.main === module) {
  migrateOptimizeIndexes()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { migrateOptimizeIndexes };
