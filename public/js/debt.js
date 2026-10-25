
/**
 * Module: Quản lý Công nợ & Báo cáo Tuổi nợ
 * Task 116: Bảng chi tiết công nợ và phân loại tuổi nợ.
 * Task 117: Modal thu tiền, hiển thị dư nợ và kiểm tra số tiền thanh toán.
 * Task 118: Nút nhắc nợ từng dòng và Toast thông báo.
 * TASK-150: Lọc công nợ từ Top 5 con nợ trên Dashboard.
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

/**
 * Task 118: Hiển thị Bootstrap Toast.
 * type: success, danger, warning, info
 */
function showDebtToast(message, type = 'success') {
  let container = document.getElementById('debtToastContainer');

  if (!container) {
    container = document.createElement('div');
    container.id = 'debtToastContainer';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '1090';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }

  if (typeof bootstrap === 'undefined' || !bootstrap.Toast) {
    console.warn('Bootstrap Toast chưa sẵn sàng:', message);
    alert(message);
    return;
  }

  const allowedTypes = ['success', 'danger', 'warning', 'info'];
  const toastType = allowedTypes.includes(type) ? type : 'info';

  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-bg-${toastType} border-0`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.setAttribute('aria-atomic', 'true');

  const content = document.createElement('div');
  content.className = 'd-flex';

  const body = document.createElement('div');
  body.className = 'toast-body';
  body.textContent = String(message || '');

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'btn-close btn-close-white me-2 m-auto';
  closeButton.setAttribute('data-bs-dismiss', 'toast');
  closeButton.setAttribute('aria-label', 'Đóng');

  content.appendChild(body);
  content.appendChild(closeButton);
  toast.appendChild(content);
  container.appendChild(toast);

  const toastInstance = bootstrap.Toast.getOrCreateInstance(toast, {
    autohide: true,
    delay: 3500
  });

  toast.addEventListener('hidden.bs.toast', () => {
    toastInstance.dispose();
    toast.remove();
  });

  toastInstance.show();
}

/**
 * TASK-150: Bộ lọc doanh nghiệp.
 * Ưu tiên mã số thuế, dự phòng bằng tên doanh nghiệp.
 */
function matchesTopDebtorFilter(item, selectedDebtor) {
  if (!selectedDebtor) return true;

  const client = item.Client || {};

  const selectedTax = String(selectedDebtor.taxCode || '').trim();
  const itemTax = String(client.taxCode || '').trim();

  if (selectedTax && itemTax) {
    return selectedTax === itemTax;
  }

  const selectedName = String(selectedDebtor.companyName || '')
    .trim()
    .toLocaleLowerCase('vi');

  const itemName = String(client.companyName || '')
    .trim()
    .toLocaleLowerCase('vi');

  return Boolean(selectedName) && selectedName === itemName;
}

/**
 * TASK-150: Hiển thị thông báo lọc và nút xóa bộ lọc.
 */
function renderTopDebtorFilterNotice(tbody, selectedDebtor) {
  let notice = document.getElementById('task150DebtFilterNotice');

  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'task150DebtFilterNotice';
    notice.className =
      'alert alert-info d-flex align-items-center justify-content-between gap-2 flex-wrap';

    const tableContainer = tbody.closest('.table-responsive');

    if (tableContainer && tableContainer.parentNode) {
      tableContainer.parentNode.insertBefore(notice, tableContainer);
    }
  }

  notice.replaceChildren();
  notice.style.display = selectedDebtor ? 'flex' : 'none';

  if (!selectedDebtor) return;

  const label = document.createElement('span');
  label.textContent =
    'Đang xem công nợ: ' + String(selectedDebtor.companyName || '-');

  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'btn btn-sm btn-outline-primary';
  resetButton.textContent = 'Xóa bộ lọc';
  resetButton.addEventListener('click', clearTopDebtorFilter);

  notice.append(label, resetButton);
}

/**
 * TASK-150: Xóa bộ lọc, tải lại toàn bộ công nợ.
 */
function clearTopDebtorFilter() {
  window.task150DebtorFilter = null;
  loadDebt();
}

// TASK-150: Chỉ hiển thị kết quả của lần tải mới nhất.
let debtLoadRequestId = 0;

async function loadDebt() {
  const tbody = document.getElementById('debtTableBody');
  const requestId = ++debtLoadRequestId;

  try {
    const res = await fetch('/api/debt/overview');

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    // Tránh yêu cầu cũ ghi đè dữ liệu của yêu cầu mới.
    if (requestId !== debtLoadRequestId) return;

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

    const debtList = Array.isArray(data.debtList)
      ? data.debtList
      : [];

    // TASK-150: Lấy bộ lọc do Dashboard truyền sang.
    const selectedDebtor = window.task150DebtorFilter || null;

    const filteredDebtList = selectedDebtor
      ? debtList.filter(item =>
          matchesTopDebtorFilter(item, selectedDebtor)
        )
      : debtList;

    renderTopDebtorFilterNotice(tbody, selectedDebtor);

    if (filteredDebtList.length === 0) {
      const message = selectedDebtor
        ? 'Không tìm thấy hóa đơn công nợ của doanh nghiệp này.'
        : 'Hiện không có công nợ cần thu.';

      const row = tbody.insertRow();
      const cell = row.insertCell();

      cell.colSpan = 7;
      cell.className = 'text-center text-muted py-4';
      cell.textContent = message;
      return;
    }

    filteredDebtList.forEach(item => {
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

      row.querySelector('[data-action="reminder"]').addEventListener('click', event => {
        sendDebtReminder(invoiceId, event.currentTarget, invoiceCode);
      });

      tbody.appendChild(row);
    });
  } catch (err) {
    if (requestId !== debtLoadRequestId) return;

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
    showDebtToast(
      'Số nợ còn lại không hợp lệ hoặc hóa đơn đã được thanh toán.',
      'warning'
    );
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
    showDebtToast(
      'Không tìm thấy hộp thoại thu tiền hoặc Bootstrap.',
      'danger'
    );
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
    showDebtToast(
      'Không tìm thấy ô nhập số tiền thanh toán.',
      'danger'
    );
    return;
  }

  const amount = Number(amountEl.value);
  const remaining = Number(amountEl.max);

  let errorMessage = '';

  if (!Number.isFinite(amount) || amount <= 0) {
    errorMessage = 'Số tiền thanh toán phải lớn hơn 0.';
  } else if (!Number.isFinite(remaining) || remaining <= 0) {
    errorMessage =
      'Số nợ còn lại không hợp lệ. Vui lòng mở lại hóa đơn.';
  } else if (amount > remaining) {
    errorMessage =
      'Số tiền thanh toán không được vượt quá số nợ còn lại.';
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

  if (submitButton?.disabled) return;

  const originalButtonHtml = submitButton?.innerHTML;

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.innerHTML =
      '<span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Đang xử lý...';
  }

  try {
    const res = await fetch('/api/debt/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      showDebtToast(
        data.message || 'Không thể ghi nhận thanh toán.',
        'danger'
      );
      return;
    }

    const modalEl = document.getElementById('modalRecordPayment');

    if (modalEl && typeof bootstrap !== 'undefined') {
      bootstrap.Modal.getInstance(modalEl)?.hide();
    }

    showDebtToast(
      data.message || 'Ghi nhận thanh toán thành công!',
      'success'
    );

    await loadDebt();
  } catch (err) {
    console.error('Lỗi ghi nhận thanh toán:', err);
    showDebtToast(
      'Lỗi kết nối máy chủ khi ghi nhận thanh toán.',
      'danger'
    );
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonHtml;
    }
  }
}

/**
 * Task 118: Gửi nhắc nợ với Toast và trạng thái đang xử lý.
 */
async function sendDebtReminder(invoiceId, button = null, invoiceCode = '') {
  if (button?.disabled) return;

  if (!invoiceId) {
    showDebtToast(
      'Không xác định được hóa đơn cần nhắc nợ.',
      'danger'
    );
    return;
  }

  const originalButtonHtml = button?.innerHTML;

  if (button) {
    button.disabled = true;
    button.innerHTML =
      '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Đang gửi...';
  }

  try {
    const res = await fetch('/api/debt/remind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.success === false) {
      showDebtToast(
        data.message ||
          `Không thể gửi nhắc nợ${invoiceCode ? ` cho ${invoiceCode}` : ''}.`,
        'danger'
      );
      return;
    }

    showDebtToast(
      data.message ||
        `Đã gửi lời nhắc nợ${invoiceCode ? ` cho ${invoiceCode}` : ''} thành công!`,
      'success'
    );
  } catch (err) {
    console.error('Lỗi gửi nhắc nợ:', err);
    showDebtToast(
      'Lỗi kết nối khi gửi nhắc nợ. Vui lòng thử lại.',
      'danger'
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = originalButtonHtml;
    }
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
      row.map(value =>
        `"${String(value ?? '').replace(/"/g, '""')}"`
      ).join(',')
    ).join('\r\n');

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'Bao_Cao_Tuoi_No_Aging_Report.csv';

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    showDebtToast(
      'Đã xuất báo cáo công nợ CSV thành công.',
      'success'
    );
  } catch (err) {
    console.error('Lỗi xuất CSV:', err);
    showDebtToast('Lỗi xuất CSV!', 'danger');
  }
}
