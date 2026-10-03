-- ==============================================================================
-- DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
-- TASK-026: Script DDL Cơ sở dữ liệu PostgreSQL / Supabase Cloud
-- Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA)
-- Hướng dẫn: Copy toàn bộ nội dung file này dán vào SQL Editor của Supabase và nhấn RUN.
-- ==============================================================================

-- 1. XÓA BẢNG CŨ (NẾU CẦN RESET)
DROP TABLE IF EXISTS "AuditLogs" CASCADE;
DROP TABLE IF EXISTS "Payments" CASCADE;
DROP TABLE IF EXISTS "Invoices" CASCADE;
DROP TABLE IF EXISTS "Placements" CASCADE;
DROP TABLE IF EXISTS "Candidates" CASCADE;
DROP TABLE IF EXISTS "Jobs" CASCADE;
DROP TABLE IF EXISTS "Users" CASCADE;
DROP TABLE IF EXISTS "Clients" CASCADE;

-- ==============================================================================
-- 2. TẠO CÁC BẢNG THỰC THỂ (8 TABLES)
-- ==============================================================================

-- BẢNG 1: KHÁCH HÀNG DOANH NGHIỆP B2B (CLIENTS)
CREATE TABLE IF NOT EXISTS "Clients" (
    "id" SERIAL PRIMARY KEY,
    "companyName" VARCHAR(200) NOT NULL,
    "taxCode" VARCHAR(50) NOT NULL UNIQUE,
    "address" VARCHAR(255),
    "contactPerson" VARCHAR(100),
    "contactEmail" VARCHAR(100),
    "contactPhone" VARCHAR(20),
    "paymentTermDays" INT DEFAULT 30, -- Net 15, Net 30, Net 45, Net 60
    "creditLimit" DECIMAL(15,2) DEFAULT 100000000.00, -- Hạn mức nợ tối đa (VND)
    "status" VARCHAR(50) DEFAULT 'Active',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- BẢNG 2: NGƯỜI DÙNG & TÀI KHOẢN HỆ THỐNG (USERS)
CREATE TABLE IF NOT EXISTS "Users" (
    "id" SERIAL PRIMARY KEY,
    "username" VARCHAR(50) NOT NULL UNIQUE,
    "email" VARCHAR(100) NOT NULL UNIQUE,
    "password" VARCHAR(255) NOT NULL,
    "fullName" VARCHAR(100) NOT NULL,
    "role" VARCHAR(20) DEFAULT 'recruiter', -- 'admin', 'accountant', 'recruiter', 'client'
    "clientId" INT REFERENCES "Clients"("id") ON DELETE SET NULL,
    "avatar" TEXT,
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- BẢNG 3: VỊ TRÍ TUYỂN DỤNG ĐẶT HÀNG (JOBS)
CREATE TABLE IF NOT EXISTS "Jobs" (
    "id" SERIAL PRIMARY KEY,
    "clientId" INT NOT NULL REFERENCES "Clients"("id") ON DELETE CASCADE,
    "title" VARCHAR(150) NOT NULL,
    "department" VARCHAR(100),
    "salaryRange" VARCHAR(100),
    "feeRatePercent" DOUBLE PRECISION DEFAULT 18.0,
    "status" VARCHAR(50) DEFAULT 'Opening', -- 'Opening', 'Closed'
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- BẢNG 4: ỨNG VIÊN (CANDIDATES)
CREATE TABLE IF NOT EXISTS "Candidates" (
    "id" SERIAL PRIMARY KEY,
    "fullName" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL UNIQUE,
    "phone" VARCHAR(20),
    "currentPosition" VARCHAR(100),
    "status" VARCHAR(50) DEFAULT 'Available', -- 'Available', 'Interviewing', 'Placed'
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- BẢNG 5: DEAL TUYỂN DỤNG ONBOARD & BẢO HÀNH (PLACEMENTS)
CREATE TABLE IF NOT EXISTS "Placements" (
    "id" SERIAL PRIMARY KEY,
    "jobId" INT NOT NULL REFERENCES "Jobs"("id"),
    "candidateId" INT NOT NULL REFERENCES "Candidates"("id"),
    "clientId" INT NOT NULL REFERENCES "Clients"("id"),
    "recruiterId" INT NOT NULL REFERENCES "Users"("id"),
    "officialSalary" NUMERIC(15,2) NOT NULL,
    "serviceFee" NUMERIC(15,2) NOT NULL,
    "onboardDate" DATE NOT NULL,
    "warrantyDays" INT DEFAULT 60,
    "warrantyEndDate" DATE,
    "status" VARCHAR(50) DEFAULT 'UnderWarranty', -- 'UnderWarranty', 'Passed', 'Failed'
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- BẢNG 6: HÓA ĐƠN VAT & QUẢN LÝ CÔNG NỢ (INVOICES)
CREATE TABLE IF NOT EXISTS "Invoices" (
    "id" SERIAL PRIMARY KEY,
    "invoiceCode" VARCHAR(50) NOT NULL UNIQUE,
    "clientId" INT NOT NULL REFERENCES "Clients"("id"),
    "placementId" INT REFERENCES "Placements"("id"),
    "subtotal" NUMERIC(15,2) NOT NULL,
    "vatRate" DOUBLE PRECISION DEFAULT 8.0,
    "vatAmount" NUMERIC(15,2) DEFAULT 0,
    "totalAmount" NUMERIC(15,2) NOT NULL,
    "paidAmount" NUMERIC(15,2) DEFAULT 0,
    "remainingAmount" NUMERIC(15,2) NOT NULL,
    "issueDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" VARCHAR(50) DEFAULT 'Sent', -- 'Draft', 'Sent', 'Partial', 'Paid', 'Overdue', 'Cancelled'
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- BẢNG 7: LỊCH SỬ THANH TOÁN THU HỒI NỢ (PAYMENTS)
CREATE TABLE IF NOT EXISTS "Payments" (
    "id" SERIAL PRIMARY KEY,
    "invoiceId" INT NOT NULL REFERENCES "Invoices"("id") ON DELETE CASCADE,
    "amount" NUMERIC(15,2) NOT NULL,
    "paymentDate" DATE NOT NULL,
    "paymentMethod" VARCHAR(50) DEFAULT 'BankTransfer',
    "referenceCode" VARCHAR(100),
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- BẢNG 8: NHẬT KÝ THAO TÁC HỆ THỐNG (AUDIT LOGS)
CREATE TABLE IF NOT EXISTS "AuditLogs" (
    "id" SERIAL PRIMARY KEY,
    "userId" INT REFERENCES "Users"("id") ON DELETE SET NULL,
    "action" VARCHAR(100) NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 3. TẠO INDEXES TĂNG TỐC ĐỘ TRUY VẤN
-- ==============================================================================
CREATE INDEX IF NOT EXISTS "idx_users_username" ON "Users"("username");
CREATE INDEX IF NOT EXISTS "idx_clients_taxcode" ON "Clients"("taxCode");
CREATE INDEX IF NOT EXISTS "idx_jobs_clientid" ON "Jobs"("clientId");
CREATE INDEX IF NOT EXISTS "idx_placements_clientid" ON "Placements"("clientId");
CREATE INDEX IF NOT EXISTS "idx_invoices_clientid" ON "Invoices"("clientId");
CREATE INDEX IF NOT EXISTS "idx_invoices_status" ON "Invoices"("status");
CREATE INDEX IF NOT EXISTS "idx_payments_invoiceid" ON "Payments"("invoiceId");

-- ==============================================================================
-- 4. DỮ LIỆU DOANH NGHIỆP MẪU (SEED ENTERPRISE DATA)
-- Mật khẩu mặc định cho các tài khoản là: 123456
-- Chuỗi băm bcrypt ($2a$10$w8k7E...): 123456
-- ==============================================================================

-- 4.1 Thêm Khách hàng B2B
INSERT INTO "Clients" ("id", "companyName", "taxCode", "address", "contactPerson", "contactEmail", "contactPhone", "paymentTermDays", "status")
VALUES
(1, 'Công ty Cổ phần FPT Software', '0101778163', 'Khu Công nghệ cao Hòa Lạc, Hà Nội', 'Trần Thu Hà', 'hr@fpt.com', '0901234567', 30, 'Active'),
(2, 'Công ty Cổ phần VNG Corporation', '0303885514', 'VNG Campus, Quận 7, TP. Hồ Chí Minh', 'Nguyễn Hoàng Long', 'talent@vng.com.vn', '0988776655', 30, 'Active'),
(3, 'Công ty TNHH Shopee Việt Nam', '0313339944', 'Saigon Centre, Quận 1, TP. Hồ Chí Minh', 'Lê Thùy Dương', 'recruitment@shopee.vn', '0912348899', 45, 'Active'),
(4, 'Tổng Công ty Giải pháp Doanh nghiệp Viettel', '0100109106', 'Số 1 Trần Hữu Dực, Cầu Giấy, Hà Nội', 'Phạm Quang Huy', 'contact@viettelsolutions.vn', '0977112233', 30, 'Active')
ON CONFLICT ("id") DO NOTHING;

-- 4.2 Thêm Tài khoản người dùng (Mật khẩu: 123456)
INSERT INTO "Users" ("id", "username", "email", "password", "fullName", "role", "clientId", "isActive")
VALUES
(1, 'admin', 'admin@goddy.vn', '$2a$10$cgl60p0/gKjG0Z.b1Otx1.YFm0Ww8LdNu13rGqV1V.e5RrvzQnfa6', 'Huỳnh Nguyễn Vĩnh Phúc (Admin)', 'admin', NULL, TRUE),
(2, 'ketoan', 'ketoan@goddy.vn', '$2a$10$cgl60p0/gKjG0Z.b1Otx1.YFm0Ww8LdNu13rGqV1V.e5RrvzQnfa6', 'Phạm Sơn (Kế toán trưởng)', 'accountant', NULL, TRUE),
(3, 'recruiter', 'recruiter@goddy.vn', '$2a$10$cgl60p0/gKjG0Z.b1Otx1.YFm0Ww8LdNu13rGqV1V.e5RrvzQnfa6', 'Nguyễn Văn Minh (Senior Recruiter)', 'recruiter', NULL, TRUE),
(4, 'fpt_client', 'hr@fpt.com', '$2a$10$cgl60p0/gKjG0Z.b1Otx1.YFm0Ww8LdNu13rGqV1V.e5RrvzQnfa6', 'Trần Thu Hà (FPT Software)', 'client', 1, TRUE),
(5, 'vng_client', 'talent@vng.com.vn', '$2a$10$cgl60p0/gKjG0Z.b1Otx1.YFm0Ww8LdNu13rGqV1V.e5RrvzQnfa6', 'Nguyễn Hoàng Long (VNG Corporation)', 'client', 2, TRUE),
(6, 'shopee_client', 'recruitment@shopee.vn', '$2a$10$cgl60p0/gKjG0Z.b1Otx1.YFm0Ww8LdNu13rGqV1V.e5RrvzQnfa6', 'Lê Thùy Dương (Shopee Việt Nam)', 'client', 3, TRUE)
ON CONFLICT ("id") DO NOTHING;

-- 4.3 Thêm Vị trí tuyển dụng (Jobs)
INSERT INTO "Jobs" ("id", "clientId", "title", "department", "salaryRange", "feeRatePercent", "status")
VALUES
(1, 1, 'Senior Java Backend Engineer', 'Khối Phần mềm Ô tô (Global)', '45,000,000 - 65,000,000 đ', 18.0, 'Opening'),
(2, 1, 'Solution Architect (Cloud AWS)', 'Bộ phận Chuyển đổi số', '70,000,000 - 90,000,000 đ', 20.0, 'Opening'),
(3, 2, 'Lead Game Unity Developer', 'ZaloPay & Game Studio', '50,000,000 - 75,000,000 đ', 18.0, 'Opening'),
(4, 2, 'Senior DevOps / SRE Specialist', 'Hạ tầng Điện toán đám mây', '55,000,000 - 70,000,000 đ', 18.0, 'Opening'),
(5, 3, 'Data Engineering Team Lead', 'Phân tích Dữ liệu Thương mại điện tử', '60,000,000 - 85,000,000 đ', 20.0, 'Opening'),
(6, 4, 'Cyber Security Specialist', 'Khối An ninh mạng Viettel', '40,000,000 - 60,000,000 đ', 18.0, 'Opening')
ON CONFLICT ("id") DO NOTHING;

-- 4.4 Thêm Ứng viên (Candidates)
INSERT INTO "Candidates" ("id", "fullName", "email", "phone", "currentPosition", "status")
VALUES
(1, 'Đặng Hoàng Nam', 'nam.dang@gmail.com', '0918112233', 'Java Tech Lead (7 năm KN)', 'Placed'),
(2, 'Vũ Phương Linh', 'linh.vu@outlook.com', '0933445566', 'AWS Cloud Architect', 'Placed'),
(3, 'Ngô Quốc Bảo', 'bao.ngo@gmail.com', '0944556677', 'Senior Unity Developer', 'Placed'),
(4, 'Phan Thanh Tùng', 'tung.phan@gmail.com', '0966778899', 'Senior DevOps Engineer', 'Placed'),
(5, 'Trương Mỹ Duyên', 'duyen.truong@gmail.com', '0977889900', 'Data Engineer Specialist', 'Placed'),
(6, 'Đoàn Nhật Quang', 'quang.doan@gmail.com', '0988990011', 'Senior Java Developer', 'Available')
ON CONFLICT ("id") DO NOTHING;

-- 4.5 Thêm Deal Tuyển dụng (Placements)
INSERT INTO "Placements" ("id", "jobId", "candidateId", "clientId", "recruiterId", "officialSalary", "serviceFee", "onboardDate", "warrantyDays", "warrantyEndDate", "status")
VALUES
(1, 1, 1, 1, 3, 50000000, 90000000, '2026-08-15', 60, '2026-10-14', 'UnderWarranty'),
(2, 2, 2, 1, 3, 80000000, 160000000, '2026-07-01', 60, '2026-08-30', 'Passed'),
(3, 3, 3, 2, 3, 60000000, 108000000, '2026-08-01', 60, '2026-09-30', 'UnderWarranty'),
(4, 4, 4, 2, 3, 55000000, 99000000, '2026-09-10', 60, '2026-11-09', 'UnderWarranty'),
(5, 5, 5, 3, 3, 70000000, 140000000, '2026-06-15', 60, '2026-08-14', 'Passed')
ON CONFLICT ("id") DO NOTHING;

-- 4.6 Thêm Hóa đơn VAT & Công nợ (Invoices)
INSERT INTO "Invoices" ("id", "invoiceCode", "clientId", "placementId", "subtotal", "vatRate", "vatAmount", "totalAmount", "paidAmount", "remainingAmount", "issueDate", "dueDate", "status")
VALUES
(1, 'INV-2026-001', 1, 1, 90000000, 8.0, 7200000, 97200000, 50000000, 47200000, '2026-08-20', '2026-09-19', 'Partial'),
(2, 'INV-2026-002', 1, 2, 160000000, 8.0, 12800000, 172800000, 172800000, 0, '2026-07-05', '2026-08-04', 'Paid'),
(3, 'INV-2026-003', 2, 3, 108000000, 8.0, 8640000, 116640000, 0, 116640000, '2026-08-05', '2026-09-04', 'Overdue'),
(4, 'INV-2026-004', 2, 4, 99000000, 8.0, 7920000, 106920000, 0, 106920000, '2026-09-12', '2026-10-12', 'Sent'),
(5, 'INV-2026-005', 3, 5, 140000000, 8.0, 11200000, 151200000, 151200000, 0, '2026-06-20', '2026-08-04', 'Paid')
ON CONFLICT ("id") DO NOTHING;

-- 4.7 Thêm Lịch sử thanh toán thu hồi nợ (Payments)
INSERT INTO "Payments" ("id", "invoiceId", "amount", "paymentDate", "paymentMethod", "referenceCode", "notes")
VALUES
(1, 1, 50000000, '2026-09-01', 'BankTransfer', 'VCB-20260901-0089', 'FPT Software thanh toán đợt 1 hợp đồng placement Đặng Hoàng Nam'),
(2, 2, 172800000, '2026-07-25', 'BankTransfer', 'TCB-20260725-1122', 'FPT Software tất toán 100% hóa đơn placement Vũ Phương Linh'),
(3, 5, 151200000, '2026-07-15', 'BankTransfer', 'MB-20260715-9988', 'Shopee thanh toán toàn bộ chi phí tuyển dụng Data Lead')
ON CONFLICT ("id") DO NOTHING;

-- 4.8 Thêm Nhật ký kiểm toán mẫu (AuditLogs)
INSERT INTO "AuditLogs" ("id", "userId", "action", "module", "details")
VALUES
(1, 1, 'INIT_DATABASE', 'System', 'Khởi tạo cơ sở dữ liệu mẫu PostgreSQL/Supabase thành công'),
(2, 3, 'CREATE_PLACEMENT', 'Recruitment', 'Ghi nhận deal thành công cho ứng viên Đặng Hoàng Nam tại FPT Software'),
(3, 2, 'CREATE_INVOICE', 'Invoice', 'Phát hành hóa đơn VAT INV-2026-001 trị giá 97,200,000 đ'),
(4, 2, 'RECORD_PAYMENT', 'Payment', 'Ghi nhận thu hồi 50,000,000 đ cho hóa đơn INV-2026-001')
ON CONFLICT ("id") DO NOTHING;

-- Tự động cập nhật sequence ID lớn nhất cho các bảng
SELECT setval(pg_get_serial_sequence('"Clients"', 'id'), coalesce(max("id"), 1)) FROM "Clients";
SELECT setval(pg_get_serial_sequence('"Users"', 'id'), coalesce(max("id"), 1)) FROM "Users";
SELECT setval(pg_get_serial_sequence('"Jobs"', 'id'), coalesce(max("id"), 1)) FROM "Jobs";
SELECT setval(pg_get_serial_sequence('"Candidates"', 'id'), coalesce(max("id"), 1)) FROM "Candidates";
SELECT setval(pg_get_serial_sequence('"Placements"', 'id'), coalesce(max("id"), 1)) FROM "Placements";
SELECT setval(pg_get_serial_sequence('"Invoices"', 'id'), coalesce(max("id"), 1)) FROM "Invoices";
SELECT setval(pg_get_serial_sequence('"Payments"', 'id'), coalesce(max("id"), 1)) FROM "Payments";
SELECT setval(pg_get_serial_sequence('"AuditLogs"', 'id'), coalesce(max("id"), 1)) FROM "AuditLogs";
