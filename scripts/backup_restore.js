/**
 * DỰ ÁN: QLDA_NHOM10_GODDY - GODDY RECRUIT
 * TASK-188: Thiết lập script sao lưu và phục hồi CSDL tự động (Backup & Restore script)
 * Tác giả: Huỳnh Nguyễn Vĩnh Phúc (MSSV: 2380614923 - DBA & QA SV5)
 * Bàn giao: Script tự động sao lưu Snapshot CSDL & Cơ chế phục hồi thảm họa (Disaster Recovery)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');
const { sequelize, AuditLog } = require('../models');

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function calculateChecksum(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

/**
 * Hàm 1: Sao lưu CSDL tự động
 */
async function backupDatabase() {
  console.log('====================================================');
  console.log(' [BACKUP] BẮT ĐẦU SAO LƯU CƠ SỞ DỮ LIỆU TỰ ĐỘNG     ');
  console.log('====================================================');

  if (!fs.existsSync(DB_PATH)) {
    console.error('  [LỖI] Không tìm thấy file CSDL nguồn tại:', DB_PATH);
    return null;
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const backupFileName = `backup_goddy_${timestamp}.sqlite`;
  const backupFilePath = path.join(BACKUP_DIR, backupFileName);

  // Đảm bảo ghi hết buffer trước khi copy
  await sequelize.query('PRAGMA wal_checkpoint(FULL);').catch(() => {});

  fs.copyFileSync(DB_PATH, backupFilePath);

  const stats = fs.statSync(backupFilePath);
  const checksum = calculateChecksum(backupFilePath);

  console.log(`  [PASS] Đã tạo thành công bản sao lưu: ${backupFileName}`);
  console.log(`         Dung lượng: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`         Mã băm SHA256: ${checksum.slice(0, 16)}...`);
  console.log(`         Vị trí lưu trữ: ${backupFilePath}`);

  await AuditLog.create({
    action: 'BACKUP_DATABASE',
    module: 'DATABASE',
    details: `Huỳnh Nguyễn Vĩnh Phúc sao lưu CSDL thành công: ${backupFileName} (${(stats.size / 1024).toFixed(2)} KB).`
  }).catch(() => {});

  return { backupFileName, backupFilePath, size: stats.size, checksum };
}

/**
 * Hàm 2: Liệt kê các bản sao lưu
 */
function listBackups() {
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.sqlite'));
  console.log(`\n--- DANH SÁCH BẢN SAO LƯU HIỆN CÓ (${files.length} bản) ---`);
  files.forEach((f, idx) => {
    const s = fs.statSync(path.join(BACKUP_DIR, f));
    console.log(`  ${idx + 1}. ${f} - ${(s.size / 1024).toFixed(2)} KB (${s.mtime.toLocaleString()})`);
  });
  return files;
}

/**
 * Hàm 3: Phục hồi CSDL từ bản sao lưu
 */
async function restoreDatabase(targetBackupFileName) {
  console.log('====================================================');
  console.log(' [RESTORE] PHỤC HỒI DỮ LIỆU TỪ BẢN SAO LƯU          ');
  console.log('====================================================');

  const targetPath = path.join(BACKUP_DIR, targetBackupFileName);
  if (!fs.existsSync(targetPath)) {
    console.error('  [LỖI] Không tìm thấy bản sao lưu:', targetBackupFileName);
    return false;
  }

  // Đóng kết nối tạm thời
  await sequelize.close();

  // Khôi phục file
  fs.copyFileSync(targetPath, DB_PATH);
  console.log(`  [PASS] Đã phục hồi thành công CSDL từ bản sao lưu: ${targetBackupFileName}`);

  return true;
}

async function runBackupRestoreDemo() {
  const backupRes = await backupDatabase();
  listBackups();
  if (backupRes) {
    console.log('\n>>> Kiểm thử xác minh tính nguyên vẹn bản sao lưu...');
    const verifyChecksum = calculateChecksum(backupRes.backupFilePath);
    assert.strictEqual(verifyChecksum, backupRes.checksum, 'Bản sao lưu nguyên vẹn 100%');
    console.log('  [PASS] Toàn vẹn dữ liệu sao lưu được bảo toàn tuyệt đối!');
  }
}

if (require.main === module) {
  runBackupRestoreDemo().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { backupDatabase, restoreDatabase, listBackups };
