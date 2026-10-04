/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-057: Xây dựng Model Candidate (Hồ sơ ứng viên tuyển dụng)
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA)
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Candidate = sequelize.define('Candidate', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: 'Mã định danh hồ sơ ứng viên (Primary Key)'
    },
    fullName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Họ và tên ứng viên'
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Email liên hệ ứng viên'
    },
    phone: {
      type: DataTypes.STRING(20),
      comment: 'Số điện thoại ứng viên'
    },
    currentPosition: {
      type: DataTypes.STRING(100),
      comment: 'Chức danh / Vị trí chuyên môn hiện tại'
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'Available',
      comment: 'Trạng thái: Available / Placed / Inactive'
    }
  }, {
    tableName: 'Candidates',
    timestamps: true
  });

  return Candidate;
};
