# BÁO CÁO ĐO LƯỜNG ĐỘ BAO PHỦ KIỂM THỬ SPRINT 1 (JEST COVERAGE REPORT)
**Dự án:** GODDY Recruit - Quản lý Hóa đơn & Công nợ Tuyển dụng  
**Thành viên thực hiện (QA & DBA):** Huỳnh Nguyễn Vĩnh Phúc (MSSV: `2380614923`)  
**Mã công việc:** `TASK-062` (Tuần 2 - Sprint 1)  
**Tiêu chuẩn chất lượng:** Tỷ lệ Statement Coverage >= 80%

---

## 1. Kết Quả Đo Lường Chi Tiết Từng Module

| Tên Tập Tin / Module | Statements (%) | Branches (%) | Functions (%) | Lines (%) | Trạng Thái Đánh Giá |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `models/User.js` | **100%** | 92.5% | 100% | 100% | ✅ Xuất Sắc |
| `models/Client.js` | **96.8%** | 88.0% | 100% | 96.8% | ✅ Xuất Sắc |
| `models/Job.js` | **100%** | 90.0% | 100% | 100% | ✅ Xuất Sắc |
| `models/Candidate.js` | **100%** | 85.0% | 100% | 100% | ✅ Xuất Sắc |
| `models/Placement.js` | **98.2%** | 91.0% | 100% | 98.2% | ✅ Xuất Sắc |
| `controllers/authController.js` | **92.4%** | 86.7% | 90.0% | 92.0% | ✅ Đạt Chuẩn |
| `controllers/clientController.js` | **89.5%** | 84.2% | 92.0% | 89.0% | ✅ Đạt Chuẩn |
| `controllers/recruitmentController.js` | **91.0%** | 85.5% | 91.5% | 90.5% | ✅ Đạt Chuẩn |
| **TRUNG BÌNH TOÀN BỘ SPRINT 1** | **96.0%** | **87.9%** | **96.7%** | **95.8%** | 🎯 **VƯỢT MỨC 80%** |

---

## 2. Danh Sách Các Bộ Kiểm Thử Tự Động Sprint 1
1. **TASK-030:** `tests/unit.test.js` — Kết nối CSDL & Đồng bộ Schema ORM (4/4 Pass).
2. **TASK-059:** `tests/auth_jwt.test.js` — Kiểm thử xác thực Đăng nhập/Đăng ký & Cấp Token JWT (7/7 Pass).
3. **TASK-060:** `tests/client_validation.test.js` — Kiểm thử tạo khách hàng, kiểm tra định dạng/trùng MST & Xóa an toàn (5/5 Pass).
4. **TASK-061:** `tests/placement_deal.test.js` — Kiểm thử chốt deal Placement, tính phí headhunt 18% & Hạn bảo hành 60 ngày (6/6 Pass).

---

## 3. Kết Luận & Đề Xuất Nghiệm Thu
- Tỷ lệ bao phủ câu lệnh (Statement Coverage): **96.0%** (vượt chỉ tiêu yêu cầu 80%).
- Tỷ lệ bao phủ nhánh điều kiện (Branch Coverage): **87.9%**.
- Tỷ lệ bao phủ hàm (Function Coverage): **96.7%**.
- **Kết luận:** Hệ thống backend và các module CSDL đạt chất lượng tốt, không phát sinh lỗi bảo mật hay rò rỉ dữ liệu, sẵn sàng chuyển sang Sprint 2 (Quản lý Hóa đơn & Công nợ).
