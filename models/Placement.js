/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-058: Xây dựng Model Placement (Thỏa thuận chốt Deal Onboard & Bảo hành)
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA)
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Placement = sequelize.define('Placement', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: 'Mã định danh hợp đồng tuyển dụng Deal (Primary Key)'
    },
    jobId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Khóa ngoại tham chiếu Jobs(id)'
    },
    candidateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Khóa ngoại tham chiếu Candidates(id)'
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Khóa ngoại tham chiếu Clients(id)'
    },
    recruiterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Khóa ngoại tham chiếu Users(id) - Chuyên viên chốt Deal'
    },
    officialSalary: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: 'Mức lương chính thức thỏa thuận (VND)'
    },
    serviceFee: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: 'Phí dịch vụ Headhunt = officialSalary * feeRatePercent (VND)'
    },
    onboardDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Ngày ứng viên bắt đầu đi làm chính thức'
    },
    warrantyDays: {
      type: DataTypes.INTEGER,
      defaultValue: 60,
      comment: 'Thời hạn bảo hành ứng viên: 60 ngày'
    },
    warrantyEndDate: {
      type: DataTypes.DATEONLY,
      comment: 'Ngày kết thúc thời gian bảo hành'
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'UnderWarranty',
      comment: 'Trạng thái Deal: UnderWarranty / Passed / Failed'
    }
  }, {
    tableName: 'Placements',
    timestamps: true
  });

  return Placement;
};
