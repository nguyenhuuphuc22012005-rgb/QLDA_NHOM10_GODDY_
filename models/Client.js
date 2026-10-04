/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-028: Xây dựng Model Client (Khách hàng Doanh nghiệp B2B)
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA)
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Client = sequelize.define('Client', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: 'Mã định danh khách hàng doanh nghiệp (Primary Key)'
    },
    companyName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: 'Tên doanh nghiệp / Khách hàng B2B'
    },
    taxCode: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false,
      comment: 'Mã số thuế doanh nghiệp (Unique)'
    },
    address: {
      type: DataTypes.STRING(255),
      comment: 'Địa chỉ trụ sở công ty'
    },
    contactPerson: {
      type: DataTypes.STRING(100),
      comment: 'Người đại diện liên hệ làm việc'
    },
    contactEmail: {
      type: DataTypes.STRING(100),
      comment: 'Email liên hệ công tác'
    },
    contactPhone: {
      type: DataTypes.STRING(20),
      comment: 'Số điện thoại liên hệ'
    },
    paymentTermDays: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      comment: 'Thời hạn thanh toán công nợ Net Days (15, 30, 45, 60 ngày)'
    },
    creditLimit: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 100000000.00,
      comment: 'Hạn mức công nợ tối đa (Mặc định 100.000.000 VNĐ)'
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'Active',
      comment: 'Trạng thái hợp tác: Active / Inactive'
    }
  }, {
    tableName: 'Clients',
    timestamps: true
  });

  return Client;
};
