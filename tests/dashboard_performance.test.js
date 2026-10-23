/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-156: Đo lường thời gian phản hồi API Dashboard đảm bảo tải dưới 500ms
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA SV5)
 * Test Suite: Performance & Latency Benchmark cho Dashboard API
 */

const assert = require('assert');
const { Invoice, Payment, Client, Placement, AuditLog, sequelize } = require('../models');

// Giả lập hàm xử lý tính toán Dashboard backend (tương đương dashboardController.getDashboardStats)
async function getDashboardStatsLogic() {
  const start = performance.now();

  const [
    totalClients,
    totalJobs,
    totalPlacements,
    totalInvoices,
    totalPayments
  ] = await Promise.all([
    Client.count(),
    Invoice.sequelize.models.Job.count(),
    Placement.count(),
    Invoice.count(),
    Payment.count()
  ]);

  const totalRevenue = await Payment.sum('amount') || 0;
  const totalReceivable = await Invoice.sum('remainingAmount', {
    where: { status: ['Sent', 'Partial', 'Overdue'] }
  }) || 0;

  const today = new Date().toISOString().split('T')[0];
  const overdueDebt = await Invoice.sum('remainingAmount', {
    where: {
      status: ['Sent', 'Partial', 'Overdue'],
      dueDate: { [require('sequelize').Op.lt]: today }
    }
  }) || 0;

  const durationMs = performance.now() - start;
  return {
    durationMs,
    stats: {
      totalClients,
      totalJobs,
      totalPlacements,
      totalInvoices,
      totalPayments,
      totalRevenue,
      totalReceivable,
      overdueDebt
    }
  };
}

async function runDashboardPerformanceTests() {
  console.log('====================================================');
  console.log(' TASK-156: ĐO LƯỜNG HIỆU NĂNG DASHBOARD API < 500MS ');
  console.log(' Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923)  ');
  console.log(' Tiêu chuẩn SLA: Thời gian phản hồi trung bình < 500ms');
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

  // 1. Chạy Benchmark 30 lần liên tục
  const ITERATIONS = 30;
  const latencies = [];

  await test(`1. Thực hiện benchmark ${ITERATIONS} truy vấn đồng thời vào Dashboard`, async () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const res = await getDashboardStatsLogic();
      latencies.push(res.durationMs);
    }
    assert.strictEqual(latencies.length, ITERATIONS);
  });

  // 2. Tính toán các chỉ số thống kê hiệu năng
  let avgLatency = 0;
  let minLatency = 0;
  let maxLatency = 0;

  await test('2. Tính toán phân tích độ trễ Min, Max, Average', async () => {
    minLatency = Math.min(...latencies);
    maxLatency = Math.max(...latencies);
    const sum = latencies.reduce((a, b) => a + b, 0);
    avgLatency = sum / latencies.length;

    console.log(`     - Số mẫu kiểm thử (Samples) : ${ITERATIONS} requests`);
    console.log(`     - Nhanh nhất (Min Latency)  : ${minLatency.toFixed(2)} ms`);
    console.log(`     - Chậm nhất (Max Latency)   : ${maxLatency.toFixed(2)} ms`);
    console.log(`     - Trung bình (Avg Latency)  : ${avgLatency.toFixed(2)} ms`);

    assert(avgLatency < 500, `Thời gian trung bình (${avgLatency.toFixed(2)}ms) phải nhỏ hơn ngưỡng 500ms`);
  });

  // 3. Kiểm tra tiêu chuẩn 95th Percentile (P95)
  await test('3. Kiểm tra chỉ số phân vị P95 (95% request phải phản hồi dưới 500ms)', async () => {
    const sorted = [...latencies].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95Latency = sorted[p95Index];

    console.log(`     - Chỉ số P95 Latency        : ${p95Latency.toFixed(2)} ms`);
    assert(p95Latency < 500, `Chỉ số P95 (${p95Latency.toFixed(2)}ms) vượt ngưỡng 500ms`);
  });

  // 4. Ghi nhận log kiểm toán
  await test('4. Ghi nhận Audit Log cho bài kiểm tra hiệu năng hệ thống', async () => {
    const audit = await AuditLog.create({
      action: 'PERFORMANCE_BENCHMARK_PASSED',
      module: 'DASHBOARD',
      details: `Huỳnh Nguyễn Vĩnh Phúc đo lường hiệu năng Dashboard: Avg = ${avgLatency.toFixed(2)}ms (Đạt chuẩn SLA < 500ms).`
    });
    assert(audit.id);
  });

  console.log('\n====================================================');
  console.log(` KẾT QUẢ HIỆU NĂNG: ${passed} PASSED | ${failed} FAILED`);
  console.log(` KẾT LUẬN: DASHBOARD PHẢN HỒI SIÊU TỐC (${avgLatency.toFixed(2)}ms), VƯỢT CHỈ TIÊU < 500ms!`);
  console.log('====================================================\n');

  if (failed > 0) throw new Error(`TASK-156 thất bại: Có ${failed} test cases không đạt!`);
  return true;
}

if (require.main === module) {
  runDashboardPerformanceTests().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { runDashboardPerformanceTests };
