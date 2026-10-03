# PHÂN HỆ CƠ SỞ DỮ LIỆU & ĐẢM BẢO CHẤT LƯỢNG (DBA & QA/TESTING)
## Đề Tài: Phần Mềm Quản Lý Hóa Đơn / Công Nợ Tích Hợp Dashboard Dữ Liệu Cho Tuyển Dụng (GODDY Recruit)
* **Kho lưu trữ cá nhân (SV5):** [https://github.com/phuchh9999-sketch/QLDA_NHOM10_GODDY_SV5_](https://github.com/phuchh9999-sketch/QLDA_NHOM10_GODDY_SV5_)
* **Sinh viên thực hiện:** **Huỳnh Nguyễn Vĩnh Phúc**
* **MSSV:** `2380614923`
* **Vai trò dự án:** Database Administrator (DBA) & Quality Assurance Tester (SV5 - Nhóm 10)
* **Lớp:** 23DTHC3 - Khoa Công nghệ Thông tin - Trường ĐH Công nghệ TP.HCM (HUTECH)
* **Giảng viên hướng dẫn:** ThS. Lê Quốc Anh
* **Phạm vi hoàn thiện:** **Sprint 1 & Sprint 2 (Từ TASK-025 đến TASK-126: 24/24 Tasks hoàn tất 100%)**

---

## 📋 BẢNG TỔNG HỢP 24 TASK HOÀN THÀNH TỪ ĐẦU ĐẾN TASK-126

| STT | Mã Task | Tên Công Việc & Quy Ước Git Commit | Deliverables (Kết Quả Bàn Giao) | Trạng Thái |
|:---:|:-------:|:---|:---|:---:|
| **TUẦN 1** | **Sprint 1: Khởi Tạo CSDL & Kiểm Thử Nền Tảng (6 Tasks)** | | | |
| 1 | `TASK-025` | **Thiết kế Sơ đồ quan hệ thực thể ERD 8 bảng**<br>`ThietKeSoDoQuanHeERD_huynhnguyenvinhphuc` | File `ERD_QLDA_NHOM10_GODDY.drawio` chuẩn hóa 8 thực thể | ✅ Hoàn thành |
| 2 | `TASK-026` | **Viết script DDL PostgreSQL & SQL Server**<br>`VietScriptDDLPostgresSqlserver_huynhnguyenvinhphuc` | Script `database_supabase_postgres.sql` và `database_sqlserver.sql` | ✅ Hoàn thành |
| 3 | `TASK-027` | **Xây dựng Model User (Sequelize ORM)**<br>`ThietKeModelUser_huynhnguyenvinhphuc` | File `models/User.js` (username, email, password, role, isActive) | ✅ Hoàn thành |
| 4 | `TASK-028` | **Xây dựng Model Client (Khách hàng B2B)**<br>`ThietKeModelClient_huynhnguyenvinhphuc` | File `models/Client.js` (taxCode, paymentTermDays, creditLimit) | ✅ Hoàn thành |
| 5 | `TASK-029` | **Viết script nạp dữ liệu mẫu Enterprise**<br>`VietScriptNapDuLieuMauEnterprise_huynhnguyenvinhphuc` | Script `scripts/seed_enterprise_data.js` nạp FPT, VNG, Shopee, Viettel | ✅ Hoàn thành |
| 6 | `TASK-030` | **Viết Unit Test kiểm tra kết nối & đồng bộ CSDL**<br>`CaiDatTestingJestKiemTraDB_huynhnguyenvinhphuc` | Bộ kiểm thử `tests/unit.test.js` kiểm tra sync bảng CSDL | ✅ Hoàn thành |
| **TUẦN 2** | **Sprint 1: Xác Thực, Tuyển Dụng & Nghiệm Thu Sprint 1 (6 Tasks)** | | | |
| 7 | `TASK-057` | **Xây dựng Model Job và Model Candidate**<br>`ThietKeModelJobVaCandidate_huynhnguyenvinhphuc` | Files `models/Job.js` và `models/Candidate.js` | ✅ Hoàn thành |
| 8 | `TASK-058` | **Xây dựng Model Placement (Deal tuyển dụng)**<br>`ThietKeModelPlacement_huynhnguyenvinhphuc` | File `models/Placement.js` ghi nhận deal, hoa hồng và bảo hành | ✅ Hoàn thành |
| 9 | `TASK-059` | **Kiểm thử tự động Xác thực Đăng nhập & JWT Token**<br>`BoKiemThuTuDong_AuthJWT_huynhnguyenvinhphuc` | Bộ kiểm thử `tests/auth_jwt.test.js` xác thực API Auth | ✅ Hoàn thành |
| 10 | `TASK-060` | **Kiểm thử Validate Khách hàng B2B & Chặn trùng MST**<br>`BoKiemThuTuDong_ThemKhachHang_huynhnguyenvinhphuc` | Bộ kiểm thử `tests/client_validation.test.js` chặn trùng MST | ✅ Hoàn thành |
| 11 | `TASK-061` | **Kiểm thử Chốt Deal & Tính bảo hành 60 ngày**<br>`BoKiemThuTuDong_ChotDealPlacement_huynhnguyenvinhphuc` | Bộ kiểm thử `tests/placement_deal.test.js` tính phí & bảo hành | ✅ Hoàn thành |
| 12 | `TASK-062` | **Đo lường Code Coverage Sprint 1 đạt > 80%**<br>`DoLuongCodeCoverageSprint1_huynhnguyenvinhphuc` | File `docs/BAO_CAO_COVERAGE_SPRINT1.md` và `tests/coverage_sprint1_report.js` | ✅ Hoàn thành |
| **TUẦN 3** | **Sprint 2: Phát Hành Hóa Đơn & Thuế VAT 8% (6 Tasks)** | | | |
| 13 | `TASK-089` | **Xây dựng Model Invoice (Hóa đơn dịch vụ)**<br>`ThietKeModelInvoice_huynhnguyenvinhphuc` | File `models/Invoice.js` (subtotal, vatRate, vatAmount, totalAmount) | ✅ Hoàn thành |
| 14 | `TASK-090` | **Cấu hình quan hệ Placement 1 - 1 Invoice**<br>`ThietLapQuanHePlacementVaInvoice_huynhnguyenvinhphuc` | Bộ kiểm thử `tests/placement_invoice_relation.test.js` | ✅ Hoàn thành |
| 15 | `TASK-091` | **Kiểm thử tính toán Thuế VAT 8% & Tổng tiền**<br>`BoKiemThuTuDong_PhatHanhHoaDon_huynhnguyenvinhphuc` | Bộ kiểm thử `tests/vat_calculation.test.js` đối soát toán học VAT | ✅ Hoàn thành |
| 16 | `TASK-092` | **Kiểm thử Chặn phát hành trùng Hóa đơn trên 1 Deal**<br>`BoKiemThuTuDong_ChanTrungHoaDon_huynhnguyenvinhphuc` | Bộ kiểm thử `tests/duplicate_invoice_prevention.test.js` | ✅ Hoàn thành |
| 17 | `TASK-093` | **Seed dữ liệu 6 hóa đơn mẫu đa trạng thái**<br>`CapNhatSeedDataHoaDonMau_huynhnguyenvinhphuc` | Script `scripts/seed_invoices_data.js` (Paid, Partial, Sent, Overdue...) | ✅ Hoàn thành |
| 18 | `TASK-094` | **Đối soát toàn vẹn Placement.serviceFee và Invoice.subtotal**<br>`KiemTraToanVenDuLieuFeeVaSubtotal_huynhnguyenvinhphuc` | Bộ kiểm thử `tests/reconciliation_fee_subtotal.test.js` | ✅ Hoàn thành |
| **TUẦN 4** | **Sprint 2: Quản Lý Công Nợ, Tuổi Nợ Aging & Nghiệm Thu Sprint 2 (6 Tasks)** | | | |
| 19 | `TASK-121` | **Xây dựng Model Payment (Lịch sử thanh toán nợ)**<br>`ThietKeModelPayment_huynhnguyenvinhphuc` | File `models/Payment.js` (amount, paymentDate, referenceNo) | ✅ Hoàn thành |
| 20 | `TASK-122` | **Cấu hình quan hệ Invoice 1 - N Payment**<br>`ThietLapQuanHeInvoiceVaPayment_huynhnguyenvinhphuc` | Bộ kiểm thử `tests/invoice_payment_relation.test.js` | ✅ Hoàn thành |
| 21 | `TASK-123` | **Kiểm thử Thanh toán trừ dần nợ & Chống trả thừa**<br>`BoKiemThuTuDong_ThanhToanTruNo_huynhnguyenvinhphuc` | Bộ kiểm thử `tests/debt_reduction_payment.test.js` | ✅ Hoàn thành |
| 22 | `TASK-124` | **Kiểm thử Thuật toán phân loại Tuổi nợ Aging 3 xô**<br>`BoKiemThuTuDong_PhanTichTuoiNo_huynhnguyenvinhphuc` | Bộ kiểm thử `tests/aging_analysis.test.js` (1-30, 31-60, >60 ngày) | ✅ Hoàn thành |
| 23 | `TASK-125` | **Tạo chỉ mục Database Indexes tối ưu tốc độ truy vấn**<br>`TaoIndexToiUuTruyVanDueDate_huynhnguyenvinhphuc` | Script `scripts/migrate_optimize_indexes.js` đánh index dueDate/status | ✅ Hoàn thành |
| 24 | `TASK-126` | **Lập Báo cáo Nghiệm thu Kiểm thử Sprint 2**<br>`BaoCaoKiemThuSprint2_huynhnguyenvinhphuc` | File `docs/BAO_CAO_KIEM_THU_QA_SPRINT2.md` & `tests/sprint2_acceptance.test.js` | ✅ Hoàn thành |

---

## 🗄️ CẤU TRÚC THƯ MỤC PHÂN HỆ CSDL & KIỂM THỬ

```text
├── database_sqlserver.sql             # Script DDL SQL Server (TASK-026)
├── database_supabase_postgres.sql     # Script DDL PostgreSQL Supabase (TASK-026)
├── ERD_QLDA_NHOM10_GODDY.drawio       # Sơ đồ ERD 8 thực thể quan hệ (TASK-025)
├── README.md                          # Tài liệu báo cáo phân hệ SV5
├── config/
│   └── db.js                          # Kết nối Sequelize SQLite / Postgres
├── docs/
│   ├── BAO_CAO_COVERAGE_SPRINT1.md    # Báo cáo Code Coverage Sprint 1 (TASK-062)
│   └── BAO_CAO_KIEM_THU_QA_SPRINT2.md # Báo cáo Nghiệm thu Sprint 2 (TASK-126)
├── models/
│   ├── Candidate.js                   # Model Ứng viên (TASK-057)
│   ├── Client.js                      # Model Khách hàng B2B (TASK-028)
│   ├── Invoice.js                     # Model Hóa đơn (TASK-089)
│   ├── Job.js                         # Model Vị trí tuyển dụng (TASK-057)
│   ├── Payment.js                     # Model Thanh toán công nợ (TASK-121)
│   ├── Placement.js                   # Model Deal Onboard (TASK-058)
│   └── User.js                        # Model Người dùng & Phân quyền (TASK-027)
├── scripts/
│   ├── migrate_optimize_indexes.js    # Migration đánh chỉ mục CSDL (TASK-125)
│   ├── seed_enterprise_data.js        # Seed dữ liệu đối tác mẫu (TASK-029)
│   └── seed_invoices_data.js          # Seed 6 hóa đơn mẫu (TASK-093)
└── tests/
    ├── aging_analysis.test.js          # Kiểm thử phân loại tuổi nợ (TASK-124)
    ├── auth_jwt.test.js                # Kiểm thử xác thực JWT (TASK-059)
    ├── client_validation.test.js       # Kiểm thử xác thực Client MST (TASK-060)
    ├── coverage_sprint1_report.js      # Đo lường Coverage Sprint 1 (TASK-062)
    ├── debt_reduction_payment.test.js  # Kiểm thử thanh toán trừ nợ (TASK-123)
    ├── duplicate_invoice_prevention.test.js # Chặn trùng hóa đơn (TASK-092)
    ├── invoice_payment_relation.test.js# Kiểm thử quan hệ Invoice-Payment (TASK-122)
    ├── placement_deal.test.js          # Kiểm thử deal & bảo hành (TASK-061)
    ├── placement_invoice_relation.test.js # Quan hệ Placement-Invoice (TASK-090)
    ├── reconciliation_fee_subtotal.test.js # Đối soát Fee & Subtotal (TASK-094)
    ├── sprint2_acceptance.test.js      # Bộ test nghiệm thu Sprint 2 (TASK-126)
    ├── unit.test.js                    # Unit test đồng bộ CSDL (TASK-030)
    └── vat_calculation.test.js         # Kiểm thử tính thuế VAT 8% (TASK-091)
```

---

## 🧪 HƯỚNG DẪN THỰC THI KIỂM THỬ TRÊN MÁY TÍNH

1. **Khởi tạo cơ sở dữ liệu mẫu:**
   ```powershell
   node scripts/seed_enterprise_data.js
   node scripts/seed_invoices_data.js
   ```

2. **Chạy kiểm thử nghiệm thu Sprint 1 (Đạt 100% PASS):**
   ```powershell
   node tests/coverage_sprint1_report.js
   ```

3. **Chạy kiểm thử nghiệm thu Sprint 2 (Đạt 100% PASS):**
   ```powershell
   node tests/sprint2_acceptance.test.js
   ```

4. **Tối ưu hóa chỉ mục Database Indexes (TASK-125):**
   ```powershell
   node scripts/migrate_optimize_indexes.js
   ```

---
*Tài liệu được cập nhật và lưu trữ chính thức tại nhánh `member/sv5-database-qa` và `main` thuộc kho mã nguồn cá nhân: [QLDA_NHOM10_GODDY_SV5_](https://github.com/phuchh9999-sketch/QLDA_NHOM10_GODDY_SV5_).*
