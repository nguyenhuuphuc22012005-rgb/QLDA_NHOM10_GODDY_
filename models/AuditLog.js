/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-171: Xây dựng Model AuditLog lưu vết lịch sử: userId, action, module, details, ip
 * Tác giả: Nhóm 10 GODDY Recruit
 * Bàn giao: File models/AuditLog.js chuẩn Sequelize ORM
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'Khóa chính nhật ký hệ thống'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID người dùng thực hiện hành động'
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Tên hành động nghiệp vụ (LOGIN, CREATE, UPDATE, DELETE, PAYMENT, REMIND)'
  },
  module: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Phân hệ phát sinh (Auth, Clients, Recruitment, Invoices, Debt, Dashboard)'
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Chi tiết thay đổi hoặc dữ liệu payload giao dịch'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'Địa chỉ IP của người dùng thực hiện thao tác'
  }
}, {
  tableName: 'AuditLogs',
  timestamps: true
});

module.exports = AuditLog;
