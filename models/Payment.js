/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-121: Xây dựng Model Payment (amount, paymentDate, paymentMethod, referenceNo)
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA SV5)
 * Bàn giao: File models/Payment.js chuẩn Sequelize ORM
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'Khóa chính thanh toán'
  },
  invoiceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Khóa ngoại tham chiếu Hóa đơn (Invoices.id)'
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      min: 0.01
    },
    comment: 'Số tiền thanh toán thực tế (VND)'
  },
  paymentDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Ngày thực hiện giao dịch thanh toán'
  },
  paymentMethod: {
    type: DataTypes.STRING(50),
    defaultValue: 'BankTransfer',
    comment: 'Phương thức thanh toán: BankTransfer, Cash, CreditCard'
  },
  referenceNo: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Mã tham chiếu ngân hàng / Số ủy nhiệm chi (UNC)'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Ghi chú nghiệp vụ thanh toán thu nợ'
  }
}, {
  tableName: 'Payments',
  timestamps: true
});

module.exports = Payment;
