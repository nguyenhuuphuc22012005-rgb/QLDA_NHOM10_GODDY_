/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-027: Xây dựng Model User (Người dùng & Tài khoản hệ thống)
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA)
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: 'Mã định danh người dùng (Primary Key)'
    },
    username: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false,
      comment: 'Tên đăng nhập hệ thống (Unique)'
    },
    email: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: false,
      comment: 'Email tài khoản nhân viên / đối tác'
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Mật khẩu đã băm bằng Bcrypt 10 rounds'
    },
    fullName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Họ và tên đầy đủ'
    },
    role: {
      type: DataTypes.ENUM('admin', 'accountant', 'recruiter', 'client'),
      defaultValue: 'recruiter',
      comment: 'Phân quyền vai trò người dùng trong hệ thống'
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Khóa ngoại tham chiếu Clients(id) nếu role là client'
    },
    avatar: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Đường dẫn ảnh đại diện'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Trạng thái tài khoản: true (hoạt động) / false (đã khóa)'
    }
  }, {
    tableName: 'Users',
    timestamps: true
  });

  return User;
};
