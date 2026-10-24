/**
 * Module: Quản lý Công nợ & Báo cáo Tuổi nợ
 * Task 116: Bảng chi tiết công nợ và phân loại tuổi nợ.
 * Task 117: Modal thu tiền, hiển thị dư nợ và kiểm tra số tiền thanh toán.
 */

function getDebtOverdueDays(item) {
  if (
    item.overdueDays !== null &&
    item.overdueDays !== undefined &&
    item.overdueDays !== ''
  ) {
    const days = Number(item.overdueDays);
    if (Number.isFinite(days)) return Math.max(0, Math.floor(days));
  }

  if (!item.dueDate) return 0;

  const dueDate = new Date(item.dueDate);
  if (Number.isNaN(dueDate.getTime())) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  return Math.max(0, Math.floor((today - dueDate) / 86400000));
}

function getDebtAgingInfo(days) {
  if (days > 60) {
    return {
      label: 'Nợ quá hạn trên 60 ngày',
      color: '#dc3545',
      textColor: '#ffffff'
    };
  }

  if (days >= 31) {
    return {
      label: 'Nợ quá hạn 31–60 ngày',
      color: '#fd7e14',
      textColor: '#212529'
    };
  }

  if (days >= 1) {
    return {
      label: 'Nợ quá hạn 1–30 ngày',
      color: '#ffc107',
      textColor: '#212529'
    };
  }

  return {
    label: 'Trong hạn',
    color: '#198754',
    textColor: '#ffffff'
  };
}

function escapeDebtValue(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

async function loadDebt() {
  const tbody = document.getElementById('debtTableBody');

  try {
    const res = await fetch('/api/debt/overview');

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    if (data.summary) {
      const aging1to30 = document.getElementById('debtAging1to30');
      const aging31to60 = document.getElementById('debtAging31to60');
      const agingAbove60 = document.getElementById('debtAgingAbove60');

      if (aging1to30) {
        aging1to30.textContent = formatMoney(data.summary.aging0to30 ?? 0);
      }

      if (aging31to60) {
        aging31to60.textContent = formatMoney(data.summary.aging31to60 ?? 0);
      }

      if (agingAbove60) {
        agingAbove60.textContent = formatMoney(data.summary.agingAbove60 ?? 0);
      }
    }

    if (!tbody) return;

    tbody.innerHTML = '';

    const debtList = Array.isArray(data.debtList) ? data.debtList : [];

    if (debtList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted py-4">
            Hiện không có công nợ cần thu.
          </td>
        </tr>`;
      return;
    }

    debtList.forEach(item => {
      const days = getDebtOverdueDays(item);
      const aging = getDebtAgingInfo(days);
      const invoiceId = Number(item.id) || 0;
      const invoiceCode = String(item.invoiceCode ?? '');
      const amount = Number(item.remainingAmount) || 0;
      const clientName = item.Client?.companyName || '-';

      const row = document.createElement('tr');

      row.innerHTML = `
        <td><strong>${escapeDebtValue(invoiceCode || '-')}</strong></td>
        <td>${escapeDebtValue(clientName)}</td>
        <td class="fw-bold ${days > 0 ? 'text-danger' : 'text-success'}">
          ${formatMoney(amount)}
        </td>
        <td>${escapeDebtValue(item.dueDate || '-')}</td>
        <td>
          <span class="badge"
                style="background-color:${aging.color};color:${aging.textColor}">
            ${days > 0 ? `${days} ngày quá hạn` : 'Trong hạn'}
          </span>
        </td>
        <td><strong>${escapeDebtValue(item.agingCategory || aging.label)}</strong></td>
        <td>
          <div class="d-flex gap-1 flex-wrap">
            <button type="button" class="btn btn-sm btn-success" data-action="payment">
              <i class="fa-solid fa-hand-holding-dollar me-1"></i>Thu tiền
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger" data-action="reminder">
              <i class="fa-solid fa-bell me-1"></i>Nhắc nợ
            </button>
          </div>
        </td>`;

      row.querySelector('[data-action="payment"]').addEventListener('click', () => {
        openRecordPayment(invoiceId, invoiceCode, amount);
      });

      row.querySelector('[data-action="reminder"]').addEventListener('click', () => {
        sendDebtReminder(invoiceId);
      });

      tbody.appendChild(row);
    });
  } catch (err) {
    console.error('Lỗi tải báo cáo công nợ:', err);

    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-danger py-3">
            Không thể tải dữ liệu công nợ. Vui lòng thử lại.
          </td>
        </tr>`;
    }
  }
}

function openRecordPayment(invId, invCode, remaining) {
  const invIdEl = document.getElementById('payInvoiceId');
  const invCodeEl = document.getElementById('payInvoiceCode');
  const remTextEl = document.getElementById('payRemainingText');
  const amountEl = document.getElementById('payAmount');
  const errorEl = document.getElementById('payAmountError');

  const remainingAmount = Number(remaining);

  if (!Number.isFinite(remainingAmount) || remainingAmount <= 0) {
    alert('Số nợ còn lại không hợp lệ hoặc hóa đơn đã được thanh toán.');
    return;
  }

  if (invIdEl) invIdEl.value = invId;
  if (invCodeEl) invCodeEl.value = invCode;

  if (remTextEl) {
    remTextEl.value = formatMoney(remainingAmount);
  }

  if (amountEl) {
    amountEl.value = String(remainingAmount);
    amountEl.min = '1';
    amountEl.max = String(remainingAmount);
    amountEl.setCustomValidity('');
  }

  if (errorEl) errorEl.textContent = '';

  const modalEl = document.getElementById('modalRecordPayment');

  if (modalEl && typeof bootstrap !== 'undefined') {
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
  } else {
    alert('Không tìm thấy hộp thoại thu tiền hoặc Bootstrap.');
  }
}

async function submitRecordPayment(e) {
  if (e) e.preventDefault();

  const invIdEl = document.getElementById('payInvoiceId');
  const amountEl = document.getElementById('payAmount');
  const methodEl = document.getElementById('payMethod');
  const refEl = document.getElementById('payRefCode');
  const notesEl = document.getElementById('payNotes');
  const errorEl = document.getElementById('payAmountError');

  if (!amountEl) {
    alert('Không tìm thấy ô nhập số tiền thanh toán.');
    return;
  }

  const amount = Number(amountEl.value);
  const remaining = Number(amountEl.max);

  let errorMessage = '';

  if (!Number.isFinite(amount) || amount <= 0) {
    errorMessage = 'Số tiền thanh toán phải lớn hơn 0.';
  } else if (!Number.isFinite(remaining) || remaining <= 0) {
    errorMessage = 'Số nợ còn lại không hợp lệ. Vui lòng mở lại hóa đơn.';
  } else if (amount > remaining) {
    errorMessage = 'Số tiền thanh toán không được vượt quá số nợ còn lại.';
  }

  amountEl.setCustomValidity(errorMessage);

  if (errorEl) {
    errorEl.textContent = errorMessage;
  }

  if (errorMessage) {
    amountEl.reportValidity();
    return;
  }

  const body = {
    invoiceId: invIdEl?.value || null,
    amount,
    paymentMethod: methodEl?.value || 'BankTransfer',
    referenceCode: refEl?.value || '',
    notes: notesEl?.value || ''
  };

  const submitButton = document.querySelector(
    '#formRecordPayment button[type="submit"]'
  );

  if (submitButton) submitButton.disabled = true;

  try {
    const res = await fetch('/api/debt/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.message || 'Không thể ghi nhận thanh toán.');
      return;
    }

    const modalEl = document.getElementById('modalRecordPayment');

    if (modalEl && typeof bootstrap !== 'undefined') {
      bootstrap.Modal.getInstance(modalEl)?.hide();
    }

    alert('Ghi nhận thanh toán thành công!');
    await loadDebt();
  } catch (err) {
    console.error('Lỗi ghi nhận thanh toán:', err);
    alert('Lỗi kết nối máy chủ khi ghi nhận thanh toán.');
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

async function sendDebtReminder(invoiceId) {
  try {
    const res = await fetch('/api/debt/remind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || 'Lỗi gửi nhắc nợ!');
      return;
    }

    alert(data.message || 'Đã gửi lời nhắc nợ thành công!');
  } catch (err) {
    console.error('Lỗi gửi nhắc nợ:', err);
    alert('Lỗi kết nối khi gửi nhắc nợ!');
  }
}

async function exportDebtCSV() {
  try {
    const res = await fetch('/api/debt/overview');

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    const rows = [[
      'Mã hóa đơn',
      'Khách hàng',
      'Số tiền nợ',
      'Hạn trả',
      'Số ngày quá hạn',
      'Phân loại tuổi nợ'
    ]];

    (data.debtList || []).forEach(item => {
      const days = getDebtOverdueDays(item);

      rows.push([
        item.invoiceCode || '',
        item.Client?.companyName || '',
        item.remainingAmount ?? 0,
        item.dueDate || '',
        days,
        item.agingCategory || getDebtAgingInfo(days).label
      ]);
    });

    const csv = '\uFEFF' + rows.map(row =>
      row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')
    ).join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'Bao_Cao_Tuoi_No_Aging_Report.csv';

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Lỗi xuất CSV:', err);
    alert('Lỗi xuất CSV!');
  }
}