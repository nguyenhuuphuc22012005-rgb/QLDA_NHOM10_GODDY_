/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-089: Xây dựng Model Invoice (invoiceNo, totalAmount, paidAmount, remainingAmount, status)
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA SV5)
 * Bàn giao: File models/Invoice.js chuẩn trường dữ liệu ORM Sequelize
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'Khóa chính hóa đơn'
  },
  invoiceCode: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false,
    comment: 'Số hóa đơn (invoiceNo) định dạng INV-YYYY-XXXX'
  },
  clientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Khóa ngoại tham chiếu khách hàng B2B (Clients)'
  },
  placementId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    unique: true,
    comment: 'Khóa ngoại 1-1 với Deal tuyển dụng (Placements)'
  },
  subtotal: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Tiền dịch vụ trước thuế (từ phí hoa hồng tuyển dụng)'
  },
  vatRate: {
    type: DataTypes.FLOAT,
    defaultValue: 8.0,
    comment: 'Thuế suất VAT (%) - Mặc định 8% theo nghị định chính phủ'
  },
  vatAmount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Tiền thuế GTGT = subtotal * (vatRate / 100)'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Tổng tiền thanh toán sau thuế = subtotal + vatAmount'
  },
  paidAmount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Số tiền khách hàng đã thanh toán lũy kế'
  },
  remainingAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Dư nợ còn lại cần thu = totalAmount - paidAmount'
  },
  issueDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Ngày phát hành hóa đơn điện tử'
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Hạn thanh toán công nợ theo Net Days'
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'Sent',
    comment: 'Trạng thái hóa đơn: Draft, Sent, Partial, Paid, Overdue, Cancelled'
  }
}, {
  tableName: 'Invoices',
  timestamps: true
});

module.exports = Invoice;
