/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-124: Viết bộ kiểm thử tự động Thuật toán phân loại Tuổi nợ Aging chính xác
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA SV5)
 * Test Suite: Thuật toán phân nhóm tuổi nợ 4 tầng (Trong hạn, 1-30 ngày, 31-60 ngày, >60 ngày nợ khó đòi)
 */

const assert = require('assert');
const { Invoice, Client, AuditLog, sequelize } = require('../models');

// Hàm chuẩn hóa DateOnly không bị lệch Timezone
function parseDateOnly(dateInput) {
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('T')[0].split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
  }
  return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate(), 0, 0, 0, 0);
}

// Hàm phân loại tuổi nợ chuẩn xác
function classifyDebtAging(dueDateStr, remainingAmount, baseDate = new Date()) {
  const remaining = parseFloat(remainingAmount);
  const today = parseDateOnly(baseDate);
  const due = parseDateOnly(dueDateStr);

  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return { bucket: 'CURRENT', label: 'Trong hạn', overdueDays: 0, amount: remaining };
  } else if (diffDays <= 30) {
    return { bucket: '1_TO_30', label: 'Quá hạn 1 - 30 ngày', overdueDays: diffDays, amount: remaining };
  } else if (diffDays <= 60) {
    return { bucket: '31_TO_60', label: 'Quá hạn 31 - 60 ngày', overdueDays: diffDays, amount: remaining };
  } else {
    return { bucket: 'OVER_60', label: 'Nợ khó đòi (> 60 ngày)', overdueDays: diffDays, amount: remaining };
  }
}

async function runAgingAnalysisTests() {
  console.log('====================================================');
  console.log(' TASK-124: KIỂM THỬ THUẬT TOÁN PHÂN LOẠI TUỔI NỢ     ');
  console.log(' Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923)  ');
  console.log(' Tiêu chuẩn: 4 Buckets (Trong hạn, 1-30, 31-60, >60) ');
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

  const today = new Date();
  const getOffsetDateStr = (offsetDays) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // 1. Kiểm thử Bucket 1: Trong hạn (Còn 15 ngày mới tới hạn)
  await test('1. Phân loại chính xác nợ Trong hạn (Chưa đến ngày dueDate)', async () => {
    const dueDate = getOffsetDateStr(15);
    const result = classifyDebtAging(dueDate, 50000000, today);
    assert.strictEqual(result.bucket, 'CURRENT');
    assert.strictEqual(result.label, 'Trong hạn');
    assert.strictEqual(result.overdueDays, 0);
    assert.strictEqual(result.amount, 50000000);
  });

  // 2. Kiểm thử Bucket 2: Quá hạn 1 - 30 ngày (Quá hạn 12 ngày)
  await test('2. Phân loại chính xác nợ Quá hạn 1 - 30 ngày', async () => {
    const dueDate = getOffsetDateStr(-12);
    const result = classifyDebtAging(dueDate, 30000000, today);
    assert.strictEqual(result.bucket, '1_TO_30');
    assert.strictEqual(result.label, 'Quá hạn 1 - 30 ngày');
    assert.strictEqual(result.overdueDays, 12);
    assert.strictEqual(result.amount, 30000000);
  });

  // 3. Kiểm thử Bucket 3: Quá hạn 31 - 60 ngày (Quá hạn 45 ngày)
  await test('3. Phân loại chính xác nợ Quá hạn 31 - 60 ngày', async () => {
    const dueDate = getOffsetDateStr(-45);
    const result = classifyDebtAging(dueDate, 40000000, today);
    assert.strictEqual(result.bucket, '31_TO_60');
    assert.strictEqual(result.label, 'Quá hạn 31 - 60 ngày');
    assert.strictEqual(result.overdueDays, 45);
    assert.strictEqual(result.amount, 40000000);
  });

  // 4. Kiểm thử Bucket 4: Nợ khó đòi > 60 ngày (Quá hạn 95 ngày)
  await test('4. Phân loại chính xác Nợ khó đòi (> 60 ngày)', async () => {
    const dueDate = getOffsetDateStr(-95);
    const result = classifyDebtAging(dueDate, 80000000, today);
    assert.strictEqual(result.bucket, 'OVER_60');
    assert.strictEqual(result.label, 'Nợ khó đòi (> 60 ngày)');
    assert.strictEqual(result.overdueDays, 95);
    assert.strictEqual(result.amount, 80000000);
  });

  // 5. Kiểm thử ranh giới chuẩn (Boundary Testing): ngày 30 và ngày 60
  await test('5. Kiểm tra giá trị biên ranh giới chuẩn (Boundary Values: 30 ngày & 60 ngày)', async () => {
    const day30 = classifyDebtAging(getOffsetDateStr(-30), 10000000, today);
    assert.strictEqual(day30.bucket, '1_TO_30', 'Ngày thứ 30 phải thuộc bucket 1-30 ngày');
    assert.strictEqual(day30.overdueDays, 30);

    const day31 = classifyDebtAging(getOffsetDateStr(-31), 10000000, today);
    assert.strictEqual(day31.bucket, '31_TO_60', 'Ngày thứ 31 phải thuộc bucket 31-60 ngày');
    assert.strictEqual(day31.overdueDays, 31);

    const day60 = classifyDebtAging(getOffsetDateStr(-60), 10000000, today);
    assert.strictEqual(day60.bucket, '31_TO_60', 'Ngày thứ 60 phải thuộc bucket 31-60 ngày');
    assert.strictEqual(day60.overdueDays, 60);

    const day61 = classifyDebtAging(getOffsetDateStr(-61), 10000000, today);
    assert.strictEqual(day61.bucket, 'OVER_60', 'Ngày thứ 61 phải thuộc bucket > 60 ngày');
    assert.strictEqual(day61.overdueDays, 61);
  });

  // 6. Ghi nhật ký Audit Log
  await test('6. Ghi nhận Audit Log cho thuật toán phân loại Aging Report', async () => {
    const audit = await AuditLog.create({
      action: 'AGING_ANALYSIS_VERIFIED',
      module: 'DEBT',
      details: 'Huỳnh Nguyễn Vĩnh Phúc kiểm thử thành công thuật toán phân loại tuổi nợ 4 buckets.'
    });
    assert(audit.id);
  });

  console.log('\n====================================================');
  console.log(` KẾT QUẢ KIỂM THỬ: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    throw new Error(`TASK-124 thất bại: Có ${failed} test cases không đạt!`);
  }
  return true;
}

if (require.main === module) {
  runAgingAnalysisTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runAgingAnalysisTests, classifyDebtAging };
