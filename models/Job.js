/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-057: Xây dựng Model Job (Vị trí tuyển dụng đặt hàng từ Doanh nghiệp B2B)
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA)
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Job = sequelize.define('Job', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: 'Mã định danh vị trí tuyển dụng (Primary Key)'
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Khóa ngoại tham chiếu Clients(id)'
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
      comment: 'Chức danh vị trí cần tuyển (Senior Dev, PM, BA)'
    },
    department: {
      type: DataTypes.STRING(100),
      comment: 'Phòng ban / Khối chuyên môn'
    },
    salaryRange: {
      type: DataTypes.STRING(100),
      comment: 'Khung mức lương dự kiến thỏa thuận'
    },
    feeRatePercent: {
      type: DataTypes.FLOAT,
      defaultValue: 15.0,
      comment: 'Tỷ lệ hoa hồng phí dịch vụ Headhunt (15% - 25%)'
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'Opening',
      comment: 'Trạng thái tuyển dụng: Opening / Closed'
    }
  }, {
    tableName: 'Jobs',
    timestamps: true
  });

  return Job;
};
