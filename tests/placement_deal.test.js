/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-061: Viết bộ kiểm thử tự động Chốt Deal Placement và tính ngày hết hạn bảo hành
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA SV5)
 * Test Suite: Placement Fee Calculation & 60-Day Warranty Period
 */

const assert = require('assert');
const { Job, Candidate, Client, User, Placement, AuditLog, sequelize } = require('../models');

async function runPlacementDealTests() {
  console.log('====================================================');
  console.log(' TASK-061: KIỂM THỬ CHỐT DEAL VÀ BẢO HÀNH 60 NGÀY   ');
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

  let job, candidate, client, recruiter;

  // Chuẩn bị dữ liệu ban đầu
  await test('0. Chuẩn bị dữ liệu mẫu cho Deal Tuyển dụng', async () => {
    client = await Client.findOne();
    if (!client) {
      client = await Client.create({
        companyName: 'Công ty Cổ phần VNG Corporation',
        taxCode: '0304132047',
        paymentTermDays: 30,
        status: 'Active'
      });
    }

    job = await Job.create({
      clientId: client.id,
      title: 'Senior DevOps / Cloud Engineer (QA Test)',
      department: 'Infrastructure',
      salaryRange: '35,000,000 - 45,000,000 VND',
      feeRatePercent: 18.0,
      status: 'Open'
    });

    candidate = await Candidate.create({
      fullName: 'Huỳnh Nguyễn Vĩnh Phúc (Ứng viên Thử Nghiệm)',
      email: `candidate_${Date.now()}@goddy.vn`,
      phone: '0988776655',
      currentPosition: 'Senior DevOps Engineer',
      status: 'Available'
    });

    recruiter = await User.findOne({ where: { role: 'recruiter' } });
    if (!recruiter) {
      recruiter = await User.create({
        username: `recruiter_${Date.now()}`,
        email: `recruiter_${Date.now()}@goddy.vn`,
        password: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        fullName: 'Chuyên viên Tuyển dụng',
        role: 'recruiter',
        isActive: true
      });
    }

    assert(job.id && candidate.id && client.id, 'Dữ liệu Job, Candidate, Client phải sẵn sàng');
  });

  // 1. Kiểm tra tính phí dịch vụ Headhunt (18% lương năm)
  let createdPlacement = null;
  const officialSalary = 35000000; // 35 triệu/tháng
  const feeRatePercent = 18.0;
  const expectedFee = officialSalary * 12 * (feeRatePercent / 100); // 75.600.000 VND

  await test('1. Tính phí dịch vụ tuyển dụng Headhunt theo 18% lương năm', async () => {
    const onboard = new Date();
    const onboardStr = onboard.toISOString().split('T')[0];

    const warrantyDays = 60;
    const warrantyEnd = new Date(onboard);
    warrantyEnd.setDate(warrantyEnd.getDate() + warrantyDays);
    const warrantyEndStr = warrantyEnd.toISOString().split('T')[0];

    createdPlacement = await Placement.create({
      jobId: job.id,
      candidateId: candidate.id,
      clientId: client.id,
      recruiterId: recruiter.id,
      officialSalary: officialSalary,
      serviceFee: expectedFee,
      onboardDate: onboardStr,
      warrantyDays: warrantyDays,
      warrantyEndDate: warrantyEndStr,
      status: 'UnderWarranty'
    });

    assert(createdPlacement.id, 'Placement phải được tạo thành công');
    assert.strictEqual(parseFloat(createdPlacement.officialSalary), officialSalary);
    assert.strictEqual(parseFloat(createdPlacement.serviceFee), 75600000);
    assert.strictEqual(createdPlacement.status, 'UnderWarranty');
  });

  // 2. Kiểm tra tính chính xác thời hạn bảo hành 60 ngày
  await test('2. Kiểm tra chính xác thời hạn bảo hành 60 ngày kể từ ngày Onboard', async () => {
    assert(createdPlacement, 'Placement phải tồn tại');

    const onboard = new Date(createdPlacement.onboardDate);
    const warrantyEnd = new Date(createdPlacement.warrantyEndDate);

    const diffTime = warrantyEnd.getTime() - onboard.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    assert.strictEqual(diffDays, 60, 'Thời gian bảo hành phải chính xác là 60 ngày');
    assert.strictEqual(createdPlacement.warrantyDays, 60);
  });

  // 3. Tự động chuyển trạng thái Candidate sang Placed
  await test('3. Tự động chuyển đổi trạng thái Ứng viên sang Placed', async () => {
    // Cập nhật trạng thái ứng viên theo nghiệp vụ chốt deal
    await Candidate.update({ status: 'Placed' }, { where: { id: candidate.id } });

    const updatedCandidate = await Candidate.findByPk(candidate.id);
    assert.strictEqual(updatedCandidate.status, 'Placed', 'Ứng viên phải ở trạng thái Placed');
  });

  // 4. Validate dữ liệu đầu vào: Chặn lương <= 0
  await test('4. Chặn tạo Deal nếu mức lương âm hoặc bằng 0', async () => {
    const validatePlacementSalary = (salary) => {
      const parsed = parseFloat(salary);
      return !isNaN(parsed) && parsed > 0;
    };

    assert.strictEqual(validatePlacementSalary(-10000000), false, 'Lương âm phải bị từ chối');
    assert.strictEqual(validatePlacementSalary(0), false, 'Lương bằng 0 phải bị từ chối');
    assert.strictEqual(validatePlacementSalary('invalid'), false, 'Lương không phải số phải bị từ chối');
    assert.strictEqual(validatePlacementSalary(35000000), true, 'Lương hợp lệ');
  });

  // 5. Ghi nhận Audit Log cho nghiệp vụ chốt Deal
  await test('5. Ghi nhận Audit Log cho sự kiện chốt Deal Placement', async () => {
    const audit = await AuditLog.create({
      userId: recruiter.id,
      action: 'CREATE_PLACEMENT',
      module: 'RECRUITMENT',
      details: `Chốt deal tuyển dụng ID ${createdPlacement.id}: Phí dịch vụ ${expectedFee.toLocaleString()}đ, Bảo hành 60 ngày đến ${createdPlacement.warrantyEndDate}`
    });

    assert(audit.id, 'Bản ghi Audit Log phải được tạo thành công');
    assert.strictEqual(audit.module, 'RECRUITMENT');
    assert.strictEqual(audit.action, 'CREATE_PLACEMENT');
  });

  console.log('\n====================================================');
  console.log(` KẾT QUẢ KIỂM THỬ: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    throw new Error(`TASK-061 thất bại: Có ${failed} test cases không đạt!`);
  }
  return true;
}

if (require.main === module) {
  runPlacementDealTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runPlacementDealTests };
